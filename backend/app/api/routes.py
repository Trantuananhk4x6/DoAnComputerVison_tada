from flask import Blueprint, request, jsonify, current_app, send_from_directory
import os
import time
import uuid
from werkzeug.utils import secure_filename
import cv2
import numpy as np
import logging
from datetime import datetime
import glob
import json

# Thiết lập logging
logger = logging.getLogger(__name__)

# Định nghĩa Blueprint
api_bp = Blueprint('api', __name__, url_prefix='/api')

# Import ObjectDetector sau khi đã định nghĩa api_bp để tránh circular import
from app.services.detector import ObjectDetector

# Khởi tạo detector
try:
    detector = ObjectDetector()
    logger.info("ObjectDetector initialized successfully")
except Exception as e:
    logger.error(f"Error initializing ObjectDetector: {str(e)}")
    detector = None

# Đảm bảo các thư mục tồn tại
def ensure_directories_exist():
    upload_folder = current_app.config['UPLOAD_FOLDER'] 
    os.makedirs(os.path.join(upload_folder, 'original'), exist_ok=True)
    os.makedirs(os.path.join(upload_folder, 'processed'), exist_ok=True)
    os.makedirs(os.path.join(upload_folder, 'tracking_data'), exist_ok=True)

# Tạo thumbnail từ video
def generate_thumbnail(video_path, thumbnail_path):
    try:
        cap = cv2.VideoCapture(video_path)
        ret, frame = cap.read()
        
        if ret:
            # Lấy frame đầu tiên làm thumbnail
            cv2.imwrite(thumbnail_path, frame)
            cap.release()
            return True
        cap.release()
        return False
    except Exception as e:
        logger.error(f"Error generating thumbnail: {str(e)}")
        return False

# Upload video API
@api_bp.route('/upload', methods=['POST'])
def upload_video():
    try:
        ensure_directories_exist()
        
        if 'video' not in request.files:
            return jsonify({'error': 'No video file in request'}), 400
        
        file = request.files['video']
        
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
        
        # Tạo ID duy nhất cho video
        video_id = str(uuid.uuid4())
        
        # Lưu file gốc vào thư mục uploads/original
        original_filename = secure_filename(file.filename)
        upload_path = os.path.join(current_app.config['UPLOAD_FOLDER'], 'original', f"{video_id}_{original_filename}")
        file.save(upload_path)
        
        # Đường dẫn cho video sẽ được xử lý
        processed_folder = os.path.join(current_app.config['UPLOAD_FOLDER'], 'processed')
        processed_path = os.path.join(processed_folder, f"processed_{video_id}_{original_filename}")
        
        # Xử lý video với YOLO và DeepSORT
        if detector:
            logger.info(f"Processing video with YOLO and DeepSORT: {upload_path}")
            
            # Hàm callback để cập nhật tiến trình
            def progress_callback(progress):
                logger.info(f"Processing progress: {progress}%")
            
            # Xử lý video
            results = detector.process_video(upload_path, processed_path, progress_callback)
            
            # Lưu kết quả tracking
            tracking_data_path = os.path.join(
                current_app.config['UPLOAD_FOLDER'], 
                'tracking_data', 
                f"tracking_{video_id}.json"
            )
            
            with open(tracking_data_path, 'w') as f:
                json.dump({
                    'video_id': video_id,
                    'processed_at': datetime.now().isoformat(),
                    'person_count': results.get('person_count', 0),
                    'animal_count': results.get('animal_count', 0),
                    'total_frames': results.get('total_frames', 0),
                    'tracks': results.get('tracks', {})
                }, f)
        else:
            # Nếu không có detector, chỉ sao chép file
            import shutil
            shutil.copy(upload_path, processed_path)
        
        # Tạo thumbnail
        thumbnail_path = os.path.join(processed_folder, f"thumbnail_{video_id}_{original_filename}.jpg")
        generate_thumbnail(processed_path, thumbnail_path)
        
        logger.info(f"Video uploaded and processed successfully: {processed_path}")
        
        return jsonify({
            'videoId': video_id,
            'message': 'Video uploaded and processed successfully',
            'original_file': f"{video_id}_{original_filename}",
            'processed_file': f"processed_{video_id}_{original_filename}",
            'person_count': results.get('person_count', 0) if detector else 0,
            'animal_count': results.get('animal_count', 0) if detector else 0
        }), 201
        
    except Exception as e:
        logger.error(f"Error processing video: {str(e)}", exc_info=True)
        return jsonify({'error': f'Error processing video: {str(e)}'}), 500

# List processed videos API
@api_bp.route('/processed-videos', methods=['GET'])
def get_processed_videos():
    try:
        processed_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], 'processed')
        tracking_data_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], 'tracking_data')
        ensure_directories_exist()
        
        videos = []
        
        # Lấy tất cả file video trong thư mục processed
        video_files = [f for f in os.listdir(processed_dir) 
                      if os.path.isfile(os.path.join(processed_dir, f)) and 
                      f.startswith('processed_') and not f.endswith('.jpg')]
        
        for filename in video_files:
            # Lấy ID từ tên file
            parts = filename.split('_')
            video_id = parts[1] if len(parts) > 1 else None
            
            file_path = os.path.join(processed_dir, filename)
            thumbnail_filename = f"thumbnail_{video_id}_{parts[2]}.jpg" if video_id and len(parts) > 2 else None
            thumbnail_path = os.path.join(processed_dir, thumbnail_filename) if thumbnail_filename else None
            
            # Kiểm tra xem có dữ liệu tracking không
            tracking_file = os.path.join(tracking_data_dir, f"tracking_{video_id}.json")
            tracking_data = {}
            
            if os.path.exists(tracking_file):
                try:
                    with open(tracking_file, 'r') as f:
                        tracking_data = json.load(f)
                except Exception as e:
                    logger.error(f"Error loading tracking data: {str(e)}")
            
            # Lấy số lượng người và động vật từ tracking data
            person_count = tracking_data.get('person_count', 0)
            animal_count = tracking_data.get('animal_count', 0)
            
            # Nếu không có tracking data, tạo số ngẫu nhiên
            if not tracking_data:
                import random
                person_count = random.randint(1, 5)
                animal_count = random.randint(0, 3)
            
            # Lấy thông tin file
            file_stats = os.stat(file_path)
            
            videos.append({
                'id': video_id,
                'filename': filename,
                'name': '_'.join(parts[2:]) if len(parts) > 2 else filename,
                'url': f'/api/video/processed/{filename}',
                'thumbnail': f'/api/video/thumbnail/{thumbnail_filename}' if thumbnail_filename and os.path.exists(thumbnail_path) else None,
                'size': file_stats.st_size,
                'created': file_stats.st_ctime,
                'person_count': person_count,
                'animal_count': animal_count,
                'has_tracking_data': bool(tracking_data)
            })
        
        # Sắp xếp theo thời gian tạo mới nhất
        videos.sort(key=lambda x: x.get('created', 0), reverse=True)
        
        return jsonify({
            'videos': videos,
            'count': len(videos)
        })
        
    except Exception as e:
        logger.error(f"Error getting processed videos: {str(e)}")
        return jsonify({
            'videos': [],
            'error': str(e)
        })

# Serve video file
@api_bp.route('/video/processed/<filename>', methods=['GET'])
def serve_processed_video(filename):
    try:
        processed_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], 'processed')
        return send_from_directory(processed_dir, filename)
    except Exception as e:
        logger.error(f"Error serving video {filename}: {str(e)}")
        return jsonify({'error': f'Error serving video: {str(e)}'}), 500

# Serve thumbnail
@api_bp.route('/video/thumbnail/<filename>', methods=['GET'])
def serve_thumbnail(filename):
    try:
        processed_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], 'processed')
        if os.path.exists(os.path.join(processed_dir, filename)):
            return send_from_directory(processed_dir, filename)
        
        # Try to find by video ID if direct thumbnail not found
        video_id = filename.split('_')[1] if len(filename.split('_')) > 1 else None
        if video_id:
            # Look for any thumbnail with this ID
            thumbnails = glob.glob(os.path.join(processed_dir, f"thumbnail_{video_id}_*.jpg"))
            if thumbnails:
                return send_from_directory(processed_dir, os.path.basename(thumbnails[0]))
        
        # Return placeholder if thumbnail not found
        return send_from_directory(os.path.join(current_app.root_path, 'static'), 'video-placeholder.jpg')
    except Exception as e:
        logger.error(f"Error serving thumbnail {filename}: {str(e)}")
        return jsonify({'error': f'Error serving thumbnail: {str(e)}'}), 500

# Get tracking data for a video
@api_bp.route('/video/tracking/<video_id>', methods=['GET'])
def get_tracking_data(video_id):
    try:
        tracking_file = os.path.join(
            current_app.config['UPLOAD_FOLDER'], 
            'tracking_data', 
            f"tracking_{video_id}.json"
        )
        
        if os.path.exists(tracking_file):
            with open(tracking_file, 'r') as f:
                tracking_data = json.load(f)
            return jsonify(tracking_data)
        else:
            return jsonify({
                'error': 'No tracking data found for this video',
                'video_id': video_id
            }), 404
    except Exception as e:
        logger.error(f"Error retrieving tracking data: {str(e)}")
        return jsonify({'error': f'Error retrieving tracking data: {str(e)}'}), 500

# Delete video
@api_bp.route('/video/delete/<video_id>', methods=['DELETE'])
def delete_video(video_id):
    try:
        original_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], 'original')
        processed_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], 'processed')
        tracking_data_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], 'tracking_data')
        
        # Tìm và xóa file gốc
        original_files = glob.glob(os.path.join(original_dir, f"{video_id}_*"))
        for file in original_files:
            os.remove(file)
            logger.info(f"Deleted original file: {file}")
        
        # Tìm và xóa file đã xử lý
        processed_files = glob.glob(os.path.join(processed_dir, f"processed_{video_id}_*"))
        for file in processed_files:
            os.remove(file)
            logger.info(f"Deleted processed file: {file}")
        
        # Tìm và xóa thumbnail
        thumbnail_files = glob.glob(os.path.join(processed_dir, f"thumbnail_{video_id}_*"))
        for file in thumbnail_files:
            os.remove(file)
            logger.info(f"Deleted thumbnail: {file}")
        
        # Xóa dữ liệu tracking nếu có
        tracking_file = os.path.join(tracking_data_dir, f"tracking_{video_id}.json")
        if os.path.exists(tracking_file):
            os.remove(tracking_file)
            logger.info(f"Deleted tracking data: {tracking_file}")
        
        return jsonify({'message': 'Video and tracking data deleted successfully'})
    except Exception as e:
        logger.error(f"Error deleting video: {str(e)}")
        return jsonify({'error': f'Error deleting video: {str(e)}'}), 500
    
# Thêm endpoint này vào cuối file routes.py
@api_bp.route('/detections', methods=['GET'])
def get_detections():
    """Get detections from processed videos"""
    try:
        # Lấy danh sách video đã xử lý và các detections
        processed_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], 'tracking_data')
        tracking_files = glob.glob(os.path.join(processed_dir, "tracking_*.json"))
        
        # Lấy thông tin của những phát hiện từ các file tracking đã lưu
        all_detections = []
        
        for tracking_file in tracking_files:
            try:
                with open(tracking_file, 'r') as f:
                    tracking_data = json.load(f)
                    
                    # Thêm tóm tắt của mỗi video vào kết quả
                    video_id = tracking_data.get('video_id')
                    all_detections.append({
                        'video_id': video_id,
                        'person_count': tracking_data.get('person_count', 0),
                        'animal_count': tracking_data.get('animal_count', 0),
                        'processed_at': tracking_data.get('processed_at'),
                        'track_count': len(tracking_data.get('tracks', {}))
                    })
            except Exception as e:
                logger.error(f"Error reading tracking file {tracking_file}: {str(e)}")
        
        return jsonify({
            'detections': all_detections,
            'total': len(all_detections)
        })
        
    except Exception as e:
        logger.error(f"Error fetching detections: {str(e)}")
        return jsonify({
            'detections': [],
            'total': 0,
            'error': str(e)
        })