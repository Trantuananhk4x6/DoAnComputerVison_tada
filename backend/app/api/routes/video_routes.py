from flask import Blueprint, request, jsonify, current_app, send_file, send_from_directory
import os
import time
import uuid
import glob
from werkzeug.utils import secure_filename
import cv2
import numpy as np
import logging
import json
from datetime import datetime

from app.models.detection import ProcessedVideo, AnimalDetection, TrackedObject, TrackingHistory
from app import db
from app.services.detector import ObjectDetector

# Thiết lập logging
logger = logging.getLogger(__name__)

# Định nghĩa Blueprint
video_bp = Blueprint('video', __name__, url_prefix='/videos')

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
    os.makedirs(os.path.join(upload_folder, 'thumbnails'), exist_ok=True)
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

# API endpoint để upload video
@video_bp.route('/upload', methods=['POST'])
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
        
        # Tạo record trong database
        new_video = ProcessedVideo(
            video_id=video_id,
            filename=original_filename,
            original_filename=f"{video_id}_{original_filename}",
            processed_filename=f"processed_{video_id}_{original_filename}",
            filesize=os.path.getsize(upload_path)
        )
        
        db.session.add(new_video)
        db.session.commit()
        
        # Start video processing in another thread
        # In a real application, this would be a background task
        # For simplicity, we'll process synchronously here
        if detector:
            logger.info(f"Starting to process video: {upload_path}")
            
            # Xử lý video
            results = detector.process_video(upload_path, processed_path)
            
            if 'error' in results:
                logger.error(f"Error during video processing: {results['error']}")
                return jsonify({'error': f"Video processing error: {results['error']}"}), 500
            
            # Lưu tracking data
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
                
            # Generate thumbnail
            thumbnail_path = os.path.join(
                current_app.config['UPLOAD_FOLDER'],
                'thumbnails',
                f"thumbnail_{video_id}.jpg"
            )
            generate_thumbnail(processed_path, thumbnail_path)
            
            # Update database record
            video_record = ProcessedVideo.query.filter_by(video_id=video_id).first()
            if video_record:
                video_record.processed_at = datetime.now()
                video_record.person_count = results.get('person_count', 0)
                video_record.animal_count = results.get('animal_count', 0)
                video_record.total_frames = results.get('total_frames', 0)
                video_record.fps = results.get('fps', 0)
                video_record.resolution = results.get('resolution', '')
                video_record.has_tracking_data = True
                
                # Calculate duration
                cap = cv2.VideoCapture(processed_path)
                if cap.isOpened():
                    fps = cap.get(cv2.CAP_PROP_FPS)
                    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                    video_record.duration = frame_count / fps if fps > 0 else 0
                    cap.release()
                
                db.session.commit()
            
            # Save detection history
            tracking_history = TrackingHistory(
                video_id=video_id,
                person_count=results.get('person_count', 0),
                animal_count=results.get('animal_count', 0),
                total_objects=len(results.get('tracks', {})),
                total_frames=results.get('total_frames', 0)
            )
            db.session.add(tracking_history)
            
            # Save tracked objects
            for track_id, track_data in results.get('tracks', {}).items():
                tracked_object = TrackedObject(
                    video_id=video_id,
                    track_id=int(track_id),
                    class_name=track_data.get('class', 'unknown'),
                    first_frame=track_data.get('first_frame', 0),
                    last_frame=track_data.get('last_frame', 0),
                    avg_confidence=0.0  # Calculate from detections if available
                )
                db.session.add(tracked_object)
            
            # Save detections to database
            for detection in results.get('detections', []):
                if isinstance(detection, dict):
                    db_detection = AnimalDetection(
                        video_id=video_id,
                        video_source=f"processed_{video_id}_{original_filename}",
                        class_name=detection.get('class', 'unknown'),
                        confidence=detection.get('confidence', 0.0),
                        frame_number=detection.get('frame', 0),
                        x1=detection.get('box', [0, 0, 0, 0])[0],
                        y1=detection.get('box', [0, 0, 0, 0])[1],
                        x2=detection.get('box', [0, 0, 0, 0])[2],
                        y2=detection.get('box', [0, 0, 0, 0])[3]
                    )
                    db.session.add(db_detection)
            
            db.session.commit()
            
            logger.info(f"Video processing completed: {processed_path}")
            
            return jsonify({
                'videoId': video_id,
                'message': 'Video uploaded and processed successfully',
                'person_count': results.get('person_count', 0),
                'animal_count': results.get('animal_count', 0),
                'processed_file': f"processed_{video_id}_{original_filename}"
            })
        else:
            logger.warning("No detector available, returning without processing")
            # For simplicity, copy the file as processed
            import shutil
            shutil.copy(upload_path, processed_path)
            
            return jsonify({
                'warning': 'Video uploaded but processing not available',
                'videoId': video_id
            })
    except Exception as e:
        logger.error(f"Error in upload_video: {str(e)}", exc_info=True)
        return jsonify({'error': f'Error processing video: {str(e)}'}), 500

# API endpoint để lấy danh sách video đã xử lý
@video_bp.route('/processed', methods=['GET'])
def get_processed_videos():
    try:
        ensure_directories_exist()
        
        # Lấy danh sách video đã xử lý từ database
        videos = ProcessedVideo.query.order_by(ProcessedVideo.processed_at.desc() if ProcessedVideo.processed_at 
                                               else ProcessedVideo.uploaded_at.desc()).all()
        
        # Format kết quả
        formatted_videos = []
        for video in videos:
            # Check if processed file exists
            processed_path = os.path.join(
                current_app.config['UPLOAD_FOLDER'], 
                'processed', 
                video.processed_filename
            )
            
            # Check if thumbnail exists
            thumbnail_path = os.path.join(
                current_app.config['UPLOAD_FOLDER'],
                'thumbnails',
                f"thumbnail_{video.video_id}.jpg"
            )
            
            if os.path.exists(processed_path):
                formatted_videos.append({
                    'id': video.video_id,
                    'filename': video.processed_filename,
                    'name': video.filename,
                    'url': f'/api/videos/stream/{video.video_id}',
                    'thumbnail': f'/api/videos/thumbnail/{video.video_id}' if os.path.exists(thumbnail_path) else None,
                    'size': video.filesize,
                    'created': video.processed_at.timestamp() if video.processed_at else video.uploaded_at.timestamp(),
                    'uploaded_at': video.uploaded_at.isoformat(),
                    'processed_at': video.processed_at.isoformat() if video.processed_at else None,
                    'person_count': video.person_count,
                    'animal_count': video.animal_count,
                    'duration': video.duration,
                    'resolution': video.resolution,
                    'has_tracking_data': video.has_tracking_data
                })
        
        return jsonify({
            'videos': formatted_videos,
            'count': len(formatted_videos)
        })
    except Exception as e:
        logger.error(f"Error getting processed videos: {str(e)}")
        return jsonify({
            'videos': [],
            'error': str(e)
        })

# API endpoint để stream một video
@video_bp.route('/stream/<video_id>', methods=['GET'])
def stream_video(video_id):
    try:
        # Lấy thông tin video từ database
        video = ProcessedVideo.query.filter_by(video_id=video_id).first()
        
        if not video:
            return jsonify({'error': 'Video not found'}), 404
            
        processed_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], 'processed')
        video_path = os.path.join(processed_dir, video.processed_filename)
        
        if not os.path.exists(video_path):
            return jsonify({'error': 'Video file not found'}), 404
            
        return send_file(video_path)
    except Exception as e:
        logger.error(f"Error streaming video: {str(e)}")
        return jsonify({'error': f'Error streaming video: {str(e)}'}), 500

# API endpoint để lấy thumbnail
@video_bp.route('/thumbnail/<video_id>', methods=['GET'])
def serve_thumbnail(video_id):
    try:
        thumbnail_path = os.path.join(
            current_app.config['UPLOAD_FOLDER'],
            'thumbnails',
            f"thumbnail_{video_id}.jpg"
        )
        
        if os.path.exists(thumbnail_path):
            return send_file(thumbnail_path)
            
        # Nếu không có thumbnail, tìm video và tạo thumbnail
        video = ProcessedVideo.query.filter_by(video_id=video_id).first()
        
        if video:
            video_path = os.path.join(
                current_app.config['UPLOAD_FOLDER'],
                'processed',
                video.processed_filename
            )
            
            if os.path.exists(video_path):
                generate_thumbnail(video_path, thumbnail_path)
                if os.path.exists(thumbnail_path):
                    return send_file(thumbnail_path)
        
        # Trả về placeholder nếu không tìm thấy
        placeholder_path = os.path.join(current_app.root_path, 'static', 'video-placeholder.jpg')
        if os.path.exists(placeholder_path):
            return send_file(placeholder_path)
            
        return jsonify({'error': 'Thumbnail not found'}), 404
    except Exception as e:
        logger.error(f"Error serving thumbnail: {str(e)}")
        return jsonify({'error': f'Error serving thumbnail: {str(e)}'}), 500

# API endpoint để xóa video
@video_bp.route('/delete/<video_id>', methods=['DELETE'])
def delete_video(video_id):
    try:
        # Tìm video trong database
        video = ProcessedVideo.query.filter_by(video_id=video_id).first()
        
        if not video:
            return jsonify({'error': 'Video not found'}), 404
            
        # Đường dẫn đến các file
        original_path = os.path.join(
            current_app.config['UPLOAD_FOLDER'],
            'original',
            video.original_filename
        )
        
        processed_path = os.path.join(
            current_app.config['UPLOAD_FOLDER'],
            'processed',
            video.processed_filename
        )
        
        thumbnail_path = os.path.join(
            current_app.config['UPLOAD_FOLDER'],
            'thumbnails',
            f"thumbnail_{video.video_id}.jpg"
        )
        
        tracking_path = os.path.join(
            current_app.config['UPLOAD_FOLDER'],
            'tracking_data',
            f"tracking_{video.video_id}.json"
        )
        
        # Xóa các file nếu tồn tại
        for path in [original_path, processed_path, thumbnail_path, tracking_path]:
            if path and os.path.exists(path):
                os.remove(path)
        
        # Xóa dữ liệu tracking từ database
        TrackedObject.query.filter_by(video_id=video_id).delete()
        TrackingHistory.query.filter_by(video_id=video_id).delete()
        AnimalDetection.query.filter_by(video_id=video_id).delete()
        
        # Xóa record video
        db.session.delete(video)
        db.session.commit()
        
        return jsonify({'message': 'Video and related data deleted successfully'})
    except Exception as e:
        logger.error(f"Error deleting video: {str(e)}")
        return jsonify({'error': f'Error deleting video: {str(e)}'}), 500

# Root level endpoint for upload
@video_bp.route('/upload', methods=['POST'])
def root_upload():
    return upload_video()

# Root level endpoints for backward compatibility
@video_bp.route('/', methods=['GET'])
def get_videos_root():
    return get_processed_videos()