import os
from datetime import timedelta

class Config:
    """Base config for Flask application"""
    
    # Basic configuration
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-key-should-be-changed')
    DEBUG = os.environ.get('FLASK_DEBUG', 'False') == 'True'
    
    # Lấy thư mục hiện tại của file config.py
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    
    # Tạo thư mục instance nếu không tồn tại
    INSTANCE_PATH = os.path.join(os.path.dirname(BASE_DIR), 'instance')
    os.makedirs(INSTANCE_PATH, exist_ok=True)
    
    # Database configuration - Đổi đường dẫn để dễ truy cập
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL', 
        f'sqlite:///{os.path.join(BASE_DIR, "database.db")}'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Upload configuration - Để đảm bảo đường dẫn là chính xác
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
    # Tạo thư mục uploads nếu chưa tồn tại
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    MAX_CONTENT_LENGTH = 100 * 1024 * 1024  # 100MB limit for uploads
    
    # Session configuration
    PERMANENT_SESSION_LIFETIME = timedelta(days=7)
    
    # API configuration
    API_TITLE = 'Video Processing API'
    API_VERSION = 'v1'

class DevelopmentConfig(Config):
    DEBUG = True
    
class ProductionConfig(Config):
    DEBUG = False
    
    # In production, make sure to set a strong secret key
    SECRET_KEY = os.environ.get('SECRET_KEY')
    
    # Production database
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')

class TestingConfig(Config):
    TESTING = True
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'