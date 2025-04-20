from flask import Flask
from flask_socketio import SocketIO
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import os

# Initialize extensions
db = SQLAlchemy()
socketio = SocketIO()

def create_app():
    app = Flask(__name__)
    
    # Configure the app
    app.config['SECRET_KEY'] = 'dev_key'
    # Sử dụng driver SQL Server đã kiểm tra
    app.config['SQLALCHEMY_DATABASE_URI'] = "mssql+pyodbc://sa:123456789@PCTONY\\SQLEXPRESS/AnimalDetectionDB?driver={SQL Server}&TrustServerCertificate=yes"
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(__file__), 'uploads')
    
    # Create upload directory if it doesn't exist
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # Initialize extensions with app
    CORS(app)
    db.init_app(app)
    socketio.init_app(app, cors_allowed_origins="*")
    
    # Import ở đây để tránh circular import
    from app.models.detection import AnimalDetection
    
    # Đơn giản hóa để kiểm tra lỗi trước
    try:
        from app.api.routes import api_bp
        app.register_blueprint(api_bp)
        print("Đã đăng ký blueprint thành công!")
    except Exception as e:
        print(f"Lỗi khi đăng ký blueprint: {e}")
    
    # Create database tables
    with app.app_context():
        try:
            db.create_all()
            print("Đã tạo bảng dữ liệu thành công!")
        except Exception as e:
            print(f"Lỗi khi tạo bảng: {e}")
    
    return app