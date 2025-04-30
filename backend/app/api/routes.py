from flask import Blueprint, request, jsonify, current_app, send_file
import os
import time
import uuid
from werkzeug.utils import secure_filename
import cv2
import numpy as np
import logging
import sqlite3
from datetime import datetime
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
    os.makedirs(os.path.join(upload_folder, 'videos'), exist_ok=True)
    os.makedirs(os.path.join(upload_folder, 'processed'), exist_ok=True)
    os.makedirs(os.path.join(upload_folder, 'thumbnails'), exist_ok=True)

# Tạo thumbnail từ video
def generate_thumbnail(video_path, thumbnail_path):
    try:
        cap = cv2.VideoCapture(video_path)
        ret, frame = cap.read()
        
        if ret:
            # Lấy frame đầu tiên làm thumbnail
            cv2.imwrite(thumbnail_path, frame)
            return True
        return False
    except Exception as e:
        logger.error(f"Error generating thumbnail: {str(e)}")
        return False
    finally:
        if cap:
            cap.release()

# Khởi tạo database
def init_db():
    try:
        conn = sqlite3.connect(current_app.config['DATABASE'])
        cursor = conn.cursor()
        
        # Tạo bảng videos nếu chưa tồn tại
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS videos (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                file_path TEXT,
                processed_file_path TEXT,
                upload_date TEXT NOT NULL,
                processed_at TEXT,
                status TEXT NOT NULL,
                person_count INTEGER DEFAULT 0,
                animal_count INTEGER DEFAULT 0,
                thumbnail_path TEXT
            )
        ''')
        
        # Tạo bảng detection_history nếu chưa tồn tại
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS detection_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                video_id TEXT NOT NULL,
                detection_type TEXT NOT NULL,
                count INTEGER NOT NULL DEFAULT 0,
                detection_time TEXT NOT NULL
            )
        ''')
        
        conn.commit()
        conn.close()
    except Exception as e:
        logger.error(f"Error initializing database: {str(e)}")

# Upload video API
@api_bp.route('/videos/upload', methods=['POST'])
def upload_video():
    try:
        ensure_directories_exist()
        init_db()
        
        if 'video' not in request.files:
            return jsonify({'error': 'No video file in request'}), 400
        
        file = request.files['video']
        
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
        
        # Tạo ID duy nhất cho video
        video_id = str(uuid.uuid4())
        
        # Lưu file gốc vào thư mục uploads/videos
        original_filename = secure_filename(file.filename)
        upload_path = os.path.join(current_app.config['UPLOAD_FOLDER'], 'videos', f"{video_id}_{original_filename}")
        file.save(upload_path)
        
        # Lưu thông tin vào database
        conn = sqlite3.connect(current_app.config['DATABASE'])
        cursor = conn.cursor()
        
        cursor.execute(
            'INSERT INTO videos (id, name, file_path, upload_date, status) VALUES (?, ?, ?, ?, ?)',
            (video_id, original_filename, upload_path, datetime.now().isoformat(), 'uploaded')
        )
        
        conn.commit()
        conn.close()
        
        logger.info(f"Video uploaded successfully: {upload_path}")
        return jsonify({'videoId': video_id, 'message': 'Video uploaded successfully'}), 201
        
    except Exception as e:
        logger.error(f"Error uploading video: {str(e)}")
        return jsonify({'error': f'Error uploading video: {str(e)}'}), 500

# Process video API
@api_bp.route('/videos/process/<video_id>', methods=['POST'])
def process_video(video_id):
    try:
        # Lấy thông tin video từ database
        conn = sqlite3.connect(current_app.config['DATABASE'])
        cursor = conn.cursor()
        
        cursor.execute('SELECT file_path, name FROM videos WHERE id = ?', (video_id,))
        result = cursor.fetchone()
        
        if not result:
            conn.close()
            return jsonify({'error': 'Video not found'}), 404
        
        file_path, name = result
        
        # Cập nhật trạng thái
        cursor.execute('UPDATE videos SET status = ? WHERE id = ?', ('processing', video_id))
        conn.commit()
        
        # Đường dẫn cho video đã xử lý
        processed_folder = os.path.join(current_app.config['UPLOAD_FOLDER'], 'processed')
        processed_path = os.path.join(processed_folder, f"processed_{video_id}_{name}")
        thumbnail_path = os.path.join(current_app.config['UPLOAD_FOLDER'], 'thumbnails', f"{video_id}.jpg")
        
        # Xử lý video
        if detector:
            logger.info(f"Processing video: {file_path} -> {processed_path}")
            
            # Xử lý video
            results = detector.process_video(file_path, processed_path)
            
            person_count = results.get('person_count', 0)
            animal_count = results.get('animal_count', 0)
            
            # Tạo thumbnail
            generate_thumbnail(processed_path, thumbnail_path)
            
            # Cập nhật database
            cursor.execute(
                '''UPDATE videos SET 
                   processed_file_path = ?, 
                   status = ?, 
                   processed_at = ?, 
                   person_count = ?, 
                   animal_count = ?, 
                   thumbnail_path = ? 
                   WHERE id = ?''',
                (processed_path, 'completed', datetime.now().isoformat(), 
                 person_count, animal_count, thumbnail_path, video_id)
            )
            
            # Lưu vào detection history
            cursor.execute(
                'INSERT INTO detection_history (video_id, detection_type, count, detection_time) VALUES (?, ?, ?, ?)',
                (video_id, 'person', person_count, datetime.now().isoformat())
            )
            cursor.execute(
                'INSERT INTO detection_history (video_id, detection_type, count, detection_time) VALUES (?, ?, ?, ?)',
                (video_id, 'animal', animal_count, datetime.now().isoformat())
            )
            
            conn.commit()
            conn.close()
            
            logger.info(f"Video processed successfully: {processed_path}")
            return jsonify({
                'videoId': video_id,
                'message': 'Video processed successfully',
                'person_count': person_count,
                'animal_count': animal_count
            })
        else:
            # Nếu không có detector, dùng mô phỏng
            import random
            person_count = random.randint(1, 10)
            animal_count = random.randint(0, 5)
            
            # Sao chép file vào đường dẫn processed
            import shutil
            shutil.copy(file_path, processed_path)
            
            # Tạo thumbnail
            generate_thumbnail(processed_path, thumbnail_path)
            
            # Cập nhật database
            cursor.execute(
                '''UPDATE videos SET 
                   processed_file_path = ?, 
                   status = ?, 
                   processed_at = ?, 
                   person_count = ?, 
                   animal_count = ?, 
                   thumbnail_path = ? 
                   WHERE id = ?''',
                (processed_path, 'completed', datetime.now().isoformat(), 
                 person_count, animal_count, thumbnail_path, video_id)
            )
            
            # Lưu vào detection history
            cursor.execute(
                'INSERT INTO detection_history (video_id, detection_type, count, detection_time) VALUES (?, ?, ?, ?)',
                (video_id, 'person', person_count, datetime.now().isoformat())
            )
            cursor.execute(
                'INSERT INTO detection_history (video_id, detection_type, count, detection_time) VALUES (?, ?, ?, ?)',
                (video_id, 'animal', animal_count, datetime.now().isoformat())
            )
            
            conn.commit()
            conn.close()
            
            logger.warning(f"Video processed with MOCK detection (no detector available): {processed_path}")
            return jsonify({
                'videoId': video_id,
                'message': 'Video processed successfully (simulation mode)',
                'person_count': person_count,
                'animal_count': animal_count
            })
        
    except Exception as e:
        logger.error(f"Error processing video: {str(e)}")
        
        try:
            # Cập nhật trạng thái lỗi
            conn = sqlite3.connect(current_app.config['DATABASE'])
            cursor = conn.cursor()
            cursor.execute('UPDATE videos SET status = ? WHERE id = ?', ('error', video_id))
            conn.commit()
            conn.close()
        except:
            pass
            
        return jsonify({'error': f'Error processing video: {str(e)}'}), 500

# Get processed videos API
@api_bp.route('/videos/processed', methods=['GET'])
def get_processed_videos():
    try:
        ensure_directories_exist()
        init_db()
        
        conn = sqlite3.connect(current_app.config['DATABASE'])
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, name, processed_file_path, upload_date, processed_at, 
                   person_count, animal_count, thumbnail_path 
            FROM videos 
            WHERE status = 'completed' 
            ORDER BY processed_at DESC
        ''')
        
        videos = [dict(row) for row in cursor.fetchall()]
        conn.close()
        
        return jsonify(videos)
    except Exception as e:
        logger.error(f"Error retrieving processed videos: {str(e)}")
        return jsonify([])

# Stream video API
@api_bp.route('/videos/stream/<video_id>', methods=['GET'])
def stream_video(video_id):
    try:
        conn = sqlite3.connect(current_app.config['DATABASE'])
        cursor = conn.cursor()
        
        cursor.execute('SELECT processed_file_path FROM videos WHERE id = ? AND status = ?', (video_id, 'completed'))
        result = cursor.fetchone()
        
        conn.close()
        
        if not result or not result[0]:
            return jsonify({'error': 'Processed video not found'}), 404
        
        video_path = result[0]
        
        if not os.path.exists(video_path):
            return jsonify({'error': 'Video file not found'}), 404
        
        return send_file(video_path)
        
    except Exception as e:
        logger.error(f"Error streaming video: {str(e)}")
        return jsonify({'error': f'Error streaming video: {str(e)}'}), 500

# Get thumbnail API
@api_bp.route('/videos/thumbnail/<video_id>', methods=['GET'])
def get_thumbnail(video_id):
    try:
        conn = sqlite3.connect(current_app.config['DATABASE'])
        cursor = conn.cursor()
        
        cursor.execute('SELECT thumbnail_path FROM videos WHERE id = ?', (video_id,))
        result = cursor.fetchone()
        
        conn.close()
        
        if not result or not result[0] or not os.path.exists(result[0]):
            # Kiểm tra trong thư mục thumbnails
            thumbnail_path = os.path.join(current_app.config['UPLOAD_FOLDER'], 'thumbnails', f"{video_id}.jpg")
            
            if os.path.exists(thumbnail_path):
                return send_file(thumbnail_path)
                
            # Trả về placeholder
            placeholder_path = os.path.join(current_app.root_path, 'static', 'video-placeholder.jpg')
            
            if os.path.exists(placeholder_path):
                return send_file(placeholder_path)
            
            return jsonify({'error': 'Thumbnail not found'}), 404
        
        return send_file(result[0])
        
    except Exception as e:
        logger.error(f"Error retrieving thumbnail: {str(e)}")
        return jsonify({'error': f'Error retrieving thumbnail: {str(e)}'}), 500

# Delete video API
@api_bp.route('/videos/<video_id>', methods=['DELETE'])
def delete_video(video_id):
    try:
        conn = sqlite3.connect(current_app.config['DATABASE'])
        cursor = conn.cursor()
        
        # Lấy đường dẫn file trước khi xóa
        cursor.execute('SELECT file_path, processed_file_path, thumbnail_path FROM videos WHERE id = ?', (video_id,))
        result = cursor.fetchone()
        
        if not result:
            conn.close()
            return jsonify({'error': 'Video not found'}), 404
        
        file_path, processed_path, thumbnail_path = result
        
        # Xóa các file nếu tồn tại
        for path in [file_path, processed_path, thumbnail_path]:
            if path and os.path.exists(path):
                try:
                    os.remove(path)
                except Exception as e:
                    logger.error(f"Error deleting file {path}: {str(e)}")
        
        # Xóa khỏi database
        cursor.execute('DELETE FROM videos WHERE id = ?', (video_id,))
        cursor.execute('DELETE FROM detection_history WHERE video_id = ?', (video_id,))
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Video deleted successfully'})
        
    except Exception as e:
        logger.error(f"Error deleting video: {str(e)}")
        return jsonify({'error': f'Error deleting video: {str(e)}'}), 500

# Get filesystem videos API
@api_bp.route('/videos/filesystem', methods=['GET'])
def get_filesystem_videos():
    try:
        processed_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], 'processed')
        os.makedirs(processed_dir, exist_ok=True)
        
        # Lấy danh sách video trong database
        conn = sqlite3.connect(current_app.config['DATABASE'])
        cursor = conn.cursor()
        cursor.execute('SELECT processed_file_path FROM videos WHERE processed_file_path IS NOT NULL')
        db_video_paths = [row[0] for row in cursor.fetchall() if row[0]]
        conn.close()
        
        # Tìm các video trong filesystem không có trong database
        videos = []
        for filename in os.listdir(processed_dir):
            if filename.startswith('processed_'):
                file_path = os.path.join(processed_dir, filename)
                
                if os.path.isfile(file_path) and file_path not in db_video_paths:
                    video_id = filename.split('_')[1] if len(filename.split('_')) > 1 else None
                    stats = os.stat(file_path)
                    
                    videos.append({
                        'filename': filename,
                        'filepath': file_path,
                        'size': stats.st_size,
                        'created': datetime.fromtimestamp(stats.st_ctime).isoformat(),
                        'isFilesystemOnly': True,
                        'video_id': video_id
                    })
        
        return jsonify(videos)
        
    except Exception as e:
        logger.error(f"Error getting filesystem videos: {str(e)}")
        return jsonify([])

# Stream filesystem video
@api_bp.route('/videos/filesystem/stream/<filename>', methods=['GET'])
def stream_filesystem_video(filename):
    try:
        processed_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], 'processed')
        file_path = os.path.join(processed_dir, filename)
        
        if not os.path.exists(file_path):
            return jsonify({'error': 'Video file not found'}), 404
        
        return send_file(file_path)
        
    except Exception as e:
        logger.error(f"Error streaming filesystem video: {str(e)}")
        return jsonify({'error': f'Error streaming video: {str(e)}'}), 500

# Get filesystem video thumbnail
@api_bp.route('/videos/filesystem/thumbnail/<filename>', methods=['GET'])
def get_filesystem_thumbnail(filename):
    try:
        processed_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], 'processed')
        file_path = os.path.join(processed_dir, filename)
        
        if not os.path.exists(file_path):
            return jsonify({'error': 'Video file not found'}), 404
            
        # Kiểm tra thumbnail dựa vào video_id
        video_id = filename.split('_')[1] if len(filename.split('_')) > 1 else None
        
        if video_id:
            thumbnail_path = os.path.join(current_app.config['UPLOAD_FOLDER'], 'thumbnails', f"{video_id}.jpg")
            
            # Nếu thumbnail không tồn tại, tạo mới
            if not os.path.exists(thumbnail_path):
                generate_thumbnail(file_path, thumbnail_path)
                
            if os.path.exists(thumbnail_path):
                return send_file(thumbnail_path)
        
        # Nếu không có thumbnail, trả về placeholder
        placeholder_path = os.path.join(current_app.root_path, 'static', 'video-placeholder.jpg')
        
        if os.path.exists(placeholder_path):
            return send_file(placeholder_path)
            
        return jsonify({'error': 'Thumbnail not found'}), 404
        
    except Exception as e:
        logger.error(f"Error getting filesystem thumbnail: {str(e)}")
        return jsonify({'error': f'Error getting thumbnail: {str(e)}'}), 500

# Delete filesystem video
@api_bp.route('/videos/filesystem/<filename>', methods=['DELETE'])
def delete_filesystem_video(filename):
    try:
        processed_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], 'processed')
        file_path = os.path.join(processed_dir, filename)
        
        if not os.path.exists(file_path):
            return jsonify({'error': 'Video file not found'}), 404
        
        # Xóa file
        os.remove(file_path)
        
        # Xóa thumbnail nếu có
        video_id = filename.split('_')[1] if len(filename.split('_')) > 1 else None
        
        if video_id:
            thumbnail_path = os.path.join(current_app.config['UPLOAD_FOLDER'], 'thumbnails', f"{video_id}.jpg")
            if os.path.exists(thumbnail_path):
                os.remove(thumbnail_path)
        
        return jsonify({'message': 'Video deleted successfully'})
        
    except Exception as e:
        logger.error(f"Error deleting filesystem video: {str(e)}")
        return jsonify({'error': f'Error deleting video: {str(e)}'}), 500

# Import filesystem video to database
@api_bp.route('/videos/import', methods=['POST'])
def import_video():
    try:
        data = request.get_json()
        
        if not data or 'filename' not in data or 'filepath' not in data:
            return jsonify({'error': 'Invalid request data'}), 400
            
        filename = data['filename']
        filepath = data['filepath']
        
        if not os.path.exists(filepath):
            return jsonify({'error': f'File not found: {filepath}'}), 404
            
        # Tạo video_id từ filename hoặc tạo mới
        parts = filename.split('_')
        video_id = parts[1] if len(parts) > 1 else str(uuid.uuid4())
        
        # Phân tích video để đếm người và động vật
        if detector:
            results = detector.analyze_video(filepath)
            person_count = results.get('person_count', 0)
            animal_count = results.get('animal_count', 0)
        else:
            # Mô phỏng nếu không có detector
            import random
            person_count = random.randint(1, 10)
            animal_count = random.randint(0, 5)
            
        # Tạo thumbnail
        thumbnail_path = os.path.join(current_app.config['UPLOAD_FOLDER'], 'thumbnails', f"{video_id}.jpg")
        generate_thumbnail(filepath, thumbnail_path)
        
        # Lưu vào database
        conn = sqlite3.connect(current_app.config['DATABASE'])
        cursor = conn.cursor()
        
        # Kiểm tra video đã tồn tại chưa
        cursor.execute('SELECT id FROM videos WHERE id = ?', (video_id,))
        existing = cursor.fetchone()
        
        if existing:
            # Cập nhật video hiện có
            cursor.execute(
                '''UPDATE videos SET 
                   processed_file_path = ?, 
                   status = ?, 
                   processed_at = ?, 
                   person_count = ?, 
                   animal_count = ?, 
                   thumbnail_path = ? 
                   WHERE id = ?''',
                (filepath, 'completed', datetime.now().isoformat(), 
                 person_count, animal_count, thumbnail_path, video_id)
            )
        else:
            # Thêm video mới
            cursor.execute(
                '''INSERT INTO videos 
                   (id, name, processed_file_path, upload_date, processed_at, 
                    status, person_count, animal_count, thumbnail_path) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                (video_id, filename, filepath, datetime.now().isoformat(), 
                 datetime.now().isoformat(), 'completed', person_count, 
                 animal_count, thumbnail_path)
            )
        
        # Lưu vào detection history
        cursor.execute(
            'INSERT INTO detection_history (video_id, detection_type, count, detection_time) VALUES (?, ?, ?, ?)',
            (video_id, 'person', person_count, datetime.now().isoformat())
        )
        cursor.execute(
            'INSERT INTO detection_history (video_id, detection_type, count, detection_time) VALUES (?, ?, ?, ?)',
            (video_id, 'animal', animal_count, datetime.now().isoformat())
        )
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'message': 'Video imported successfully',
            'videoId': video_id,
            'person_count': person_count,
            'animal_count': animal_count
        })
        
    except Exception as e:
        logger.error(f"Error importing video: {str(e)}")
        return jsonify({'error': f'Error importing video: {str(e)}'}), 500

# Khởi tạo database khi khởi động
@api_bp.before_app_first_request
def before_first_request():
    ensure_directories_exist()
    init_db()