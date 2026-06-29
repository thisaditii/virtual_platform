import os
from flask import Flask, render_template, url_for, request, jsonify, redirect, session
from flask_socketio import SocketIO, join_room, leave_room, emit
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash

basedir = os.path.abspath(os.path.dirname(__file__))
app = Flask(__name__)
app.config['SECRET_KEY'] = 'your_super_secret_key'

db_url = os.environ.get('DATABASE_URL', 'sqlite:///' + os.path.join(basedir, 'users.db'))

if db_url and db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

app.config['SQLALCHEMY_DATABASE_URI'] = db_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = '/'

# Configured to threading mode for optimal Gunicorn web layer compatibility
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# ==========================================
# DATABASE MODELS
# ==========================================
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    # Relationship to automatically query user tasks
    todos = db.relationship('TodoItem', backref='user', lazy=True, cascade="all, delete-orphan")
    # UPDATED: Added relationship relationship cascade for persistent canvas snapshots
    snapshots = db.relationship('WhiteboardSnapshot', backref='user', lazy=True, cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class TodoItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    task = db.Column(db.String(200), nullable=False)
    completed = db.Column(db.Boolean, default=False)
    priority = db.Column(db.String(20), default='Medium', nullable=False)  # FIXED: Added priority tracking column
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

# UPDATED: Whiteboard Snapshot persistence tracking model setup
class WhiteboardSnapshot(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    image_data = db.Column(db.Text, nullable=False)  # Stores serialized base64 string stream vectors
    room_id = db.Column(db.String(100), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

# CRITICAL FIX: Running drop_all once dynamically cleans out conflicting column parameters on Render
with app.app_context():
    db.create_all()

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# ==========================================
# AUTHENTICATION ENDPOINTS
# ==========================================
@app.route('/api/signup', methods=['POST'])
def signup_api():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'message': 'Username and password are required.'}), 400

    if len(password) < 8:
        return jsonify({'message': 'Password must be at least 8 characters long.'}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'message': 'Username already exists.'}), 409

    new_user = User(username=username)
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({'message': 'User created successfully.'}), 201

@app.route('/api/login', methods=['POST'])
def login_api():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    user = User.query.filter_by(username=username).first()
    if user and user.check_password(password):
        login_user(user)
        return jsonify({'message': 'Login successful.'}), 200
    else:
        return jsonify({'message': 'Invalid username or password.'}), 401

@app.route('/api/logout')
@login_required
def logout_api():
    logout_user()
    return jsonify({'message': 'Logged out successfully.'}), 200

@app.route('/api/check_login_status')
def check_login_status():
    return jsonify({'logged_in': current_user.is_authenticated}), 200

# ==========================================
# TO-DO API PERSISTENCE BACKEND ENDPOINTS
# ==========================================
@app.route('/api/todos', methods=['GET', 'POST'])
@login_required
def manage_todos():
    if request.method == 'GET':
        user_todos = TodoItem.query.filter_by(user_id=current_user.id).all()
        # FIXED: Returning priority properties alongside standard structural payloads
        return jsonify([{'id': t.id, 'task': t.task, 'completed': t.completed, 'priority': t.priority} for t in user_todos]), 200
        
    elif request.method == 'POST':
        data = request.get_json() or {}
        task_text = data.get('task')
        task_priority = data.get('priority', 'Medium')  # FIXED: Capture priority argument defaulting to Medium
        
        if not task_text:
            return jsonify({'message': 'Task contents cannot be blank'}), 400
        
        new_todo = TodoItem(task=task_text, priority=task_priority, user_id=current_user.id)
        db.session.add(new_todo)
        db.session.commit()
        return jsonify({'id': new_todo.id, 'task': new_todo.task, 'completed': new_todo.completed, 'priority': new_todo.priority}), 201

@app.route('/api/todos/<int:todo_id>', methods=['PUT', 'DELETE'])
@login_required
def alter_todo(todo_id):
    todo = TodoItem.query.filter_by(id=todo_id, user_id=current_user.id).first_or_404()
    
    if request.method == 'PUT':
        data = request.get_json() or {}
        todo.completed = data.get('completed', todo.completed)
        db.session.commit()
        return jsonify({'id': todo.id, 'task': todo.task, 'completed': todo.completed, 'priority': todo.priority}), 200
        
    elif request.method == 'DELETE':
        db.session.delete(todo)
        db.session.commit()
        return jsonify({'message': 'Task removed successfully.'}), 200

# FIXED: Added aggregated metric endpoints to drive the Home Screen UI dashboard metrics
@app.route('/api/todos/analytics', methods=['GET'])
@login_required
def get_todo_analytics():
    high_priority_count = TodoItem.query.filter_by(
        user_id=current_user.id, 
        completed=False, 
        priority='High'
    ).count()
    
    total_pending = TodoItem.query.filter_by(user_id=current_user.id, completed=False).count()
    
    return jsonify({
        'high_priority_pending': high_priority_count,
        'total_pending': total_pending
    }), 200

# ==========================================
# WHITEBOARD PERSISTENCE ENDPOINTS
# ==========================================
@app.route('/api/whiteboard/save', methods=['POST'])
@login_required
def save_whiteboard():
    data = request.get_json() or {}
    image_data = data.get('image_data')
    room_id = data.get('room_id', 'global')

    if not image_data:
        return jsonify({'message': 'No snapshot vector data provided'}), 400

    snapshot = WhiteboardSnapshot.query.filter_by(user_id=current_user.id, room_id=room_id).first()
    
    if snapshot:
        snapshot.image_data = image_data
    else:
        snapshot = WhiteboardSnapshot(image_data=image_data, room_id=room_id, user_id=current_user.id)
        db.session.add(snapshot)
        
    db.session.commit()
    return jsonify({'message': 'Canvas state saved successfully!'}), 200

@app.route('/api/whiteboard/load', methods=['GET'])
@login_required
def load_whiteboard_state():
    room_id = request.args.get('room_id', 'global')
    snapshot = WhiteboardSnapshot.query.filter_by(user_id=current_user.id, room_id=room_id).first()
    
    if snapshot:
        return jsonify({'image_data': snapshot.image_data}), 200
    return jsonify({'image_data': None}), 200

# ==========================================
# VIEWS & TEMPLATES
# ==========================================
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/components/timer.html')
@login_required
def get_timer():
    return render_template('components/timer.html')

@app.route('/components/todo.html')
@login_required
def get_todo():
    return "<div id='root'></div>"

@app.route('/components/videocall.html')
@login_required
def get_videocall():
    return render_template('components/videocall.html')

@app.route('/components/whiteboard.html')
@login_required
def get_whiteboard():
    return render_template('components/whiteboard.html')

@app.route('/whiteboard/<room_id>')
@login_required
def whiteboard(room_id):
    return render_template('components/whiteboard.html', room_id=room_id)

# ==========================================
# SOCKETS & GLOBAL ERROR HANDLING
# ==========================================
@socketio.on('join_whiteboard')
def on_join(data):
    if not current_user.is_authenticated:
        return
    room = data['room']
    join_room(room)

@socketio.on('drawing')
def handle_drawing(data):
    if not current_user.is_authenticated:
        return
    room = data['room']
    emit('drawing', data, room=room, include_self=False)

@socketio.on('clear_whiteboard')
def handle_clear(data):
    if not current_user.is_authenticated:
        return
    room = data['room']
    emit('clear_whiteboard', {}, room=room)

@socketio.on('leave_whiteboard')
def on_leave(data):
    if not current_user.is_authenticated:
        return
    room = data['room']
    leave_room(room)

@app.errorhandler(404)
def page_not_found(e):
    app.line_warning = f"404 Error encountered: {e}"
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_server_error(e):
    app.logger.error(f"500 Internal Server Error: {e}")
    return render_template('500.html'), 500

if __name__ == '__main__':
    socketio.run(app, debug=True)