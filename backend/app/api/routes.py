from flask import Blueprint, request, jsonify, current_app, send_file
import os
import time
import uuid
from werkzeug.utils import secure_filename
import cv2
import numpy as np
from app.services.detector import ObjectDetector
from app import socketio
from app.models.detection import AnimalDetection
from app import db
import base64

api_bp = Blueprint('api', __name__, url_prefix='/api')
detector = ObjectDetector()

# Store active camera streams
active_streams = {}

@api_bp.route('/upload', methods=['POST'])
def upload_video():
    if 'video' not in request.files:
        return jsonify({'error': 'No video file provided'}), 400
    
    video_file = request.files['video']
    if video_file.filename == '':
        return jsonify({'error': 'No video file selected'}), 400
    
    try:
        # Create directories if they don't exist
        upload_folder = current_app.config['UPLOAD_FOLDER']
        original_dir = os.path.join(upload_folder, 'original')
        processed_dir = os.path.join(upload_folder, 'processed')
        
        os.makedirs(original_dir, exist_ok=True)
        os.makedirs(processed_dir, exist_ok=True)
        
        # Create a unique filename to avoid collisions
        original_filename = secure_filename(video_file.filename)
        unique_id = str(uuid.uuid4())
        filename = f"{unique_id}_{original_filename}"
        video_path = os.path.join(original_dir, filename)
        
        # Save the uploaded video - FIX HERE: changed asave to save
        video_file.save(video_path)
        
        # Create output path
        output_filename = f"processed_{unique_id}_{original_filename}"
        output_path = os.path.join(processed_dir, output_filename)
        
        # Process the video (this will emit progress via websocket)
        session_id = unique_id
        socketio.start_background_task(
            process_video_task, 
            session_id=session_id,
            video_path=video_path, 
            output_path=output_path,
            original_filename=original_filename
        )
        
        return jsonify({
            'message': 'Video upload successful, processing started',
            'session_id': session_id,
            'original_video': filename,
            'processed_video': output_filename
        }), 202
    except Exception as e:
        return jsonify({'error': f'Error uploading video: {str(e)}'}), 500

def process_video_task(session_id, video_path, output_path, original_filename):
    """Background task to process a video"""
    try:
        # Update client that processing has started
        socketio.emit('processing_status', {
            'session_id': session_id,
            'status': 'started',
            'progress': 0
        })
        
        # Process the video and get frames
        def progress_callback(progress):
            socketio.emit('processing_status', {
                'session_id': session_id,
                'status': 'processing',
                'progress': progress
            })
        
        # Xử lý video và lấy kết quả phát hiện
        detections = detector.process_video(video_path, output_path, progress_callback)
        
        # Lấy thumbnail của video
        cap = cv2.VideoCapture(output_path)
        ret, frame = cap.read()
        cap.release()
        
        thumbnail_filename = f"thumbnail_{session_id}.jpg"
        thumbnail_path = os.path.join(
            os.path.dirname(output_path), 
            thumbnail_filename
        )
        
        if ret:
            cv2.imwrite(thumbnail_path, frame)
        
        # Notify client that processing is complete
        socketio.emit('processing_status', {
            'session_id': session_id,
            'status': 'completed',
            'processed_video_url': f'/api/video/processed/{os.path.basename(output_path)}',
            'thumbnail_url': f'/api/thumbnail/{thumbnail_filename}',
            'original_filename': original_filename,
            'detections_count': len(detections) if detections else 0
        })
        
        # Thêm vào database
        try:
            with current_app.app_context():
                for detection in detections:
                    db_detection = AnimalDetection(
                        class_name=detection['class'],
                        confidence=detection['confidence'],
                        video_source=os.path.basename(output_path)
                    )
                    db.session.add(db_detection)
                db.session.commit()
        except Exception as e:
            socketio.emit('processing_status', {
                'session_id': session_id,
                'status': 'warning',
                'message': f'Video processed successfully but database update failed: {str(e)}'
            })
        
    except Exception as e:
        socketio.emit('processing_status', {
            'session_id': session_id,
            'status': 'error',
            'error': str(e)
        })

@api_bp.route('/video/processed/<filename>')
def get_processed_video(filename):
    """Serve a processed video file"""
    video_path = os.path.join(current_app.config['UPLOAD_FOLDER'], 'processed', filename)
    if os.path.exists(video_path):
        return send_file(video_path)
    return jsonify({'error': 'Video not found'}), 404

@api_bp.route('/video/original/<filename>')
def get_original_video(filename):
    """Serve an original video file"""
    video_path = os.path.join(current_app.config['UPLOAD_FOLDER'], 'original', filename)
    if os.path.exists(video_path):
        return send_file(video_path)
    return jsonify({'error': 'Video not found'}), 404

@api_bp.route('/thumbnail/<filename>')
def get_thumbnail(filename):
    """Serve a video thumbnail"""
    thumbnail_path = os.path.join(current_app.config['UPLOAD_FOLDER'], 'processed', filename)
    if os.path.exists(thumbnail_path):
        return send_file(thumbnail_path)
    return jsonify({'error': 'Thumbnail not found'}), 404

@api_bp.route('/detections')
def get_detections():
    """Get all animal detections from the database"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        pagination = AnimalDetection.query.order_by(AnimalDetection.timestamp.desc()).paginate(
            page=page, per_page=per_page
        )
        
        return jsonify({
            'detections': [detection.to_dict() for detection in pagination.items],
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page
        })
    except Exception as e:
        return jsonify({'error': f'Error fetching detections: {str(e)}'}), 500

@api_bp.route('/health')
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'ok'}), 200

@socketio.on('start_camera')
def handle_start_camera(data):
    """Start camera stream for a particular client"""
    client_id = request.sid
    camera_id = data.get('camera_id', 0)  # Default to camera 0
    
    # Log khi có request mới
    print(f"Starting camera stream for client {client_id}, camera {camera_id}")
    
    # Gửi thông báo nhận request
    socketio.emit('camera_status', {
        'status': 'connecting',
        'message': f'Connecting to camera {camera_id}'
    }, to=client_id)
    
    # Start the camera in a background thread
    socketio.start_background_task(
        stream_camera, 
        client_id=client_id,
        camera_id=camera_id
    )

def stream_camera(client_id, camera_id):
    """Stream from camera with object detection"""
    try:
        print(f"Opening camera {camera_id} for client {client_id}")
        
        # Thử mở camera với backend
        cap = cv2.VideoCapture(camera_id)
        if not cap.isOpened():
            print(f"Failed to open camera {camera_id}")
            socketio.emit('camera_error', {
                'error': f'Cannot open camera {camera_id}. Please check if camera is connected.'
            }, room=client_id)
            return
            
        print(f"Successfully opened camera {camera_id}")
        
        # Thông báo camera đã mở thành công
        socketio.emit('camera_status', {
            'status': 'connected',
            'message': f'Connected to camera {camera_id}'
        }, room=client_id)
        
        # Store in active streams
        active_streams[client_id] = {
            'cap': cap,
            'active': True
        }
        
        frame_count = 0
        error_count = 0
        
        while active_streams.get(client_id, {}).get('active', False):
            try:
                ret, frame = cap.read()
                if not ret:
                    error_count += 1
                    if error_count >= 5:  # Nếu lỗi 5 lần liên tiếp thì thông báo
                        print(f"Too many errors reading from camera {camera_id}")
                        socketio.emit('camera_error', {
                            'error': 'Cannot read frames from camera'
                        }, room=client_id)
                        break
                    continue
                
                error_count = 0  # Reset error count nếu đọc frame thành công
                
                # Chỉ xử lý phát hiện đối tượng mỗi 5 frames để giảm tải CPU
                frame_count += 1
                if frame_count % 5 == 0:
                    processed_frame = detector.process_frame(frame, f"camera:{camera_id}", is_streaming=True)
                else:
                    processed_frame = frame
                
                # Giảm kích thước frame để giảm tải mạng
                width = int(processed_frame.shape[1] * 0.8)  # Giảm còn 80% kích thước
                height = int(processed_frame.shape[0] * 0.8)
                processed_frame = cv2.resize(processed_frame, (width, height))
                
                # Chuyển đổi sang JPEG và encode base64
                _, buffer = cv2.imencode('.jpg', processed_frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
                jpg_as_text = base64.b64encode(buffer).decode('utf-8')
                
                # Gửi frame đến client
                socketio.emit('camera_frame', {
                    'image': jpg_as_text
                }, room=client_id)
                
                # Tạm dừng một chút để tránh quá tải
                time.sleep(0.033)  # ~30 FPS
            
            except Exception as e:
                print(f"Error in stream_camera: {str(e)}")
                error_count += 1
                if error_count >= 5:
                    socketio.emit('camera_error', {
                        'error': f'Stream error: {str(e)}'
                    }, room=client_id)
                    break
                time.sleep(0.1)  # Tạm dừng khi có lỗi
    
    except Exception as e:
        print(f"Exception in stream_camera: {str(e)}")
        socketio.emit('camera_error', {
            'error': f'Camera error: {str(e)}'
        }, room=client_id)
    
    finally:
        # Cleanup resources
        if client_id in active_streams:
            if active_streams[client_id].get('cap'):
                active_streams[client_id]['cap'].release()
                print(f"Released camera {camera_id} for client {client_id}")
            del active_streams[client_id]
            
@socketio.on('stop_camera')
def handle_stop_camera():
    """Stop camera stream for a client"""
    client_id = request.sid
    if client_id in active_streams:
        active_streams[client_id]['active'] = False

@socketio.on('disconnect')
def handle_disconnect():
    """Clean up when client disconnects"""
    client_id = request.sid
    if client_id in active_streams:
        active_streams[client_id]['active'] = False