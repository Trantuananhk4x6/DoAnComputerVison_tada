"""Instance-specific configuration settings"""
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Secret key for sessions
SECRET_KEY = os.getenv('SECRET_KEY', 'dev_key_change_me_in_production')

# Database configuration
SQLALCHEMY_DATABASE_URI = os.getenv(
    'DATABASE_URL', 
    "mssql+pyodbc://sa:123456789@localhost/AnimalDetectionDB?driver=ODBC+Driver+17+for+SQL+Server"
)
SQLALCHEMY_TRACK_MODIFICATIONS = False

# File upload settings
UPLOAD_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'app', 'uploads'))
MAX_CONTENT_LENGTH = 500 * 1024 * 1024  # 500 MB max upload size

# Model configuration
MODEL_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'model', 'best.pt'))
CONFIDENCE_THRESHOLD = 0.5  # Minimum confidence for detections

# SocketIO settings
SOCKETIO_ASYNC_MODE = 'eventlet'
CORS_ORIGINS = '*'