import os

class Config:
    # Base directory of the project
    BASE_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
    
    # Flask configuration
    SECRET_KEY = 'dev_key_for_testing_only'
    
    # Database configuration - SQLite
    SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(BASE_DIR, 'animal_detection.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Upload folder
    UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
    
    # YOLOv8 settings
    CONFIDENCE_THRESHOLD = 0.35
    IOU_THRESHOLD = 0.45