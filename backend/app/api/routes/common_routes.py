from flask import jsonify, current_app
import os
from app.api.routes import api_bp
from app.models.detection import ProcessedVideo, AnimalDetection, TrackedObject, TrackingHistory
from app import db

# Đảm bảo các thư mục tồn tại
def ensure_directories_exist():
    upload_folder = current_app.config['UPLOAD_FOLDER'] 
    os.makedirs(os.path.join(upload_folder, 'original'), exist_ok=True)
    os.makedirs(os.path.join(upload_folder, 'processed'), exist_ok=True)
    os.makedirs(os.path.join(upload_folder, 'thumbnails'), exist_ok=True)
    os.makedirs(os.path.join(upload_folder, 'tracking_data'), exist_ok=True)

# API endpoint để lấy status của server
@api_bp.route('/status', methods=['GET'])
def get_status():
    try:
        # Đảm bảo thư mục tồn tại
        ensure_directories_exist()
        
        # Kiểm tra kết nối database
        db.session.execute("SELECT 1")
        
        # Lấy thông tin về số video đã xử lý
        video_count = ProcessedVideo.query.count()
        detection_count = AnimalDetection.query.count()
        
        return jsonify({
            'status': 'online',
            'message': 'Server is operational',
            'database': 'connected',
            'statistics': {
                'processed_videos': video_count,
                'total_detections': detection_count
            }
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Server error: {str(e)}',
            'database': 'disconnected' 
        }), 500

# Endpoint fallback để tương thích với các yêu cầu cũ
@api_bp.route('/detections', methods=['GET'])
def get_detections_fallback():
    from app.api.routes.tracking_routes import get_detection_history
    return get_detection_history()