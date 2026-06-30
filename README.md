# Virtual Study Platform 

A high-performance, full-stack collaborative single-page application (SPA) featuring isolated real-time whiteboards, low-latency video conferencing, and automated task analytics built for remote study groups.

## 🔗 Live Demo
* **Deployment Url:** https://virtualplatform.onrender.com

## 🛠️ Tech Stack
* **Backend:** Python, Flask, Flask-SocketIO (WebSockets), SQLAlchemy ORM
* **Frontend:** JavaScript (ES6+), HTML5 Canvas, CSS3
* **Database & Infrastructure:** PostgreSQL (Production), SQLite (Local Dev), Agora.io RTC SDK, Git
* **Security:** Cryptographic password hashing (Werkzeug), Flask-Login, Python-Dotenv

## ✨ Key Features
* **Real-Time Synchronized Whiteboard:** Engineered with HTML5 Canvas and WebSockets, utilizing room-scoped state separation to completely eliminate multi-user drawing collisions.
* **Low-Latency Video Conferencing:** Integrated the Agora.io RTC SDK into a dynamic, fluid grid layout optimized to scale seamlessly with live participant updates.
* **Data Persistence & Analytics:** Built an environment-aware database layer that automatically switches contexts between local SQLite and live cloud PostgreSQL, complete with an analytics engine aggregating high-priority tasks.
* **Decoupled Architecture:** Enforces strict security boundaries by keeping session keys and environment configurations fully isolated from version history.

## 🚀 Quick Start

```bash
# Clone the repository
git clone [https://github.com/thisaditii/virtual_platform.git](https://github.com/thisaditii/virtual_platform.git)
cd virtual_platform

# Install pristine dependencies
pip install -r requirements.txt

# Configure hidden local environment variables
# Copy template from .env.example and populate your keys:
# SECRET_KEY=your_token
# DATABASE_URL=sqlite:///users.db
cp .env.example .env

# Run the local development server
python app.py
