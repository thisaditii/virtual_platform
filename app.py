import os
from flask import Flask, render_template, url_for, request, jsonify, redirect, session
from flask_socketio import SocketIO, join_room, leave_room, emit
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash

basedir = os.path.abspath(os.path.dirname(__file__))
app = Flask(__name__)
app.config['SECRET_KEY'] = 'your_super_secret_key'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'users.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = '/'

socketio = SocketIO(app, async_mode='eventlet')

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

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

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    socketio.run(app, debug=True)