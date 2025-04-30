import os
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from .extensions import db

# Thiết lập logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_app():
    """Create and configure the Flask application"""
    
    # Tạo đối tượng Flask
    app = Flask(__name__, static_url_path='/static', static_folder='static')
    
    # Load configuration từ Config class
    app.config.from_object('app.config.Config')
    
    # Log config database để debug
    logger.info(f"SQLite Database URI: {app.config['SQLALCHEMY_DATABASE_URI']}")
    logger.info(f"Database file location: {app.config['SQLALCHEMY_DATABASE_URI'].replace('sqlite:///', '')}")
    
    # Kiểm tra quyền ghi vào thư mục chứa database
    db_dir = os.path.dirname(app.config['SQLALCHEMY_DATABASE_URI'].replace('sqlite:///', ''))
    if not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)
        logger.info(f"Created database directory: {db_dir}")
    
    # Kiểm tra quyền ghi
    try:
        test_file = os.path.join(db_dir, 'test_write.txt')
        with open(test_file, 'w') as f:
            f.write('test')
        os.remove(test_file)
        logger.info(f"Directory is writable: {db_dir}")
    except Exception as e:
        logger.error(f"Directory is NOT writable: {db_dir}. Error: {e}")
    
    # Đảm bảo thư mục uploads tồn tại
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(os.path.join(app.config['UPLOAD_FOLDER'], 'original'), exist_ok=True)
    os.makedirs(os.path.join(app.config['UPLOAD_FOLDER'], 'processed'), exist_ok=True)
    os.makedirs(os.path.join(app.config['UPLOAD_FOLDER'], 'thumbnails'), exist_ok=True)
    os.makedirs(os.path.join(app.config['UPLOAD_FOLDER'], 'tracking_data'), exist_ok=True)
    
    # Khởi tạo extensions
    db.init_app(app)
    
    # Tạo các bảng database với context của app
    with app.app_context():
        try:
            # Chỉ tạo bảng sau khi app đã được khởi tạo đúng cách
            db.create_all()
            logger.info("Database tables created successfully!")
        except Exception as e:
            logger.error(f"Error creating database tables: {str(e)}")
    
    # Kích hoạt CORS
    CORS(app)
    
    # Đăng ký blueprint
    from app.api import api_bp
    app.register_blueprint(api_bp)
    
    # Xử lý lỗi 404
    @app.errorhandler(404)
    def not_found(error):
        # Lọc ra lỗi socket.io để tránh spam log
        if "/socket.io/" in request.path:
            return "", 404
        return jsonify({'error': 'Route not found'}), 404
    
    # Xử lý lỗi 500
    @app.errorhandler(500)
    def server_error(error):
        logger.error(f"Server error: {error}")
        return jsonify({'error': 'Internal server error'}), 500
    
    # Route test đơn giản
    @app.route('/test', methods=['GET'])
    def test_route():
        return jsonify({'message': 'API is working!'})
    
    return app