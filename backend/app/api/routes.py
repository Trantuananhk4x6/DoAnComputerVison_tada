from flask import Blueprint, request, jsonify, current_app, send_file
import os
import time
import uuid
from werkzeug.utils import secure_filename
import cv2
import numpy as np
import base64
import logging

from app import socketio, db
from app.models.detection import AnimalDetection

# Thiết lập logging
logger = logging.getLogger(__name__)

# Định nghĩa Blueprint - phải được định nghĩa ở đầu file
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

# Store active camera streams
active_streams = {}


@api_bp.route('/upload', methods=['POST'])
def upload_video():
    """Upload a video file for processing"""
    try:
        logger.info(f"Upload request received")
        
        if 'video' not in request.files:
            logger.warning("No video file in request")
            return jsonify({'error': 'No video file provided'}), 400
        
        video_file = request.files['video']
        if video_file.filename == '':
            logger.warning("Empty filename")
            return jsonify({'error': 'No video file selected'}), 400
        
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
        
        logger.info(f"Saving uploaded video to {video_path}")
        video_file.save(video_path)
        
        # Create output path
        output_filename = f"processed_{unique_id}_{original_filename}"
        output_path = os.path.join(processed_dir, output_filename)
        
        # Kiểm tra video sau khi upload
        try:
            probe_cap = cv2.VideoCapture(video_path)
            if not probe_cap.isOpened():
                logger.warning(f"Uploaded video cannot be opened with OpenCV: {video_path}")
            else:
                frame_count = int(probe_cap.get(cv2.CAP_PROP_FRAME_COUNT))
                width = int(probe_cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                height = int(probe_cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                fps = probe_cap.get(cv2.CAP_PROP_FPS)
                logger.info(f"Uploaded video: {width}x{height}, {fps}fps, {frame_count} frames")
            probe_cap.release()
        except Exception as e:
            logger.warning(f"Error probing video: {str(e)}")
            
        # Start processing in background
        session_id = unique_id
        socketio.start_background_task(
            process_video_task, 
            session_id=session_id,
            video_path=video_path, 
            output_path=output_path,
            original_filename=original_filename
        )
        
        logger.info(f"Video processing started for session {session_id}")
        return jsonify({
            'message': 'Video upload successful, processing started',
            'session_id': session_id,
            'original_video': filename,
            'processed_video': output_filename
        }), 202
        
    except Exception as e:
        logger.error(f"Error in upload_video: {str(e)}", exc_info=True)
        return jsonify({'error': f'Error uploading video: {str(e)}'}), 500

def process_video_task(session_id, video_path, output_path, original_filename):
    """Background task to process a video"""
    try:
        # Emit processing started event
        logger.info(f"Starting processing video {session_id}")
        socketio.emit('processing_status', {
            'session_id': session_id,
            'status': 'started',
            'progress': 0
        })
        
        # Define progress callback
        def progress_callback(progress):
            socketio.emit('processing_status', {
                'session_id': session_id,
                'status': 'processing',
                'progress': progress
            })
        
        # Process the video - sửa để sử dụng XVID trên Windows
        logger.info(f"Processing video {video_path}")
        
        # Xử lý video với codec phù hợp cho từng hệ điều hành
        if os.name == 'nt':  # Nếu là Windows
            # Đổi output_path tạm thời sang .avi
            temp_output_path = output_path.replace('.mp4', '.avi')
            detections = detector.process_video_windows(video_path, temp_output_path, output_path, progress_callback)
        else:
            detections = detector.process_video(video_path, output_path, progress_callback)
        
        # Create thumbnail
        cap = cv2.VideoCapture(output_path)
        ret, frame = cap.read()
        
        # Nếu không thể đọc frame từ output_path, thử đọc từ video gốc
        if not ret:
            logger.warning(f"Cannot read frame from processed video, trying original")
            cap.release()
            cap = cv2.VideoCapture(video_path)
            ret, frame = cap.read()
        
        cap.release()
        
        thumbnail_filename = f"thumbnail_{session_id}.jpg"
        thumbnail_path = os.path.join(
            os.path.dirname(output_path), 
            thumbnail_filename
        )
        
        if ret:
            cv2.imwrite(thumbnail_path, frame)
            logger.info(f"Thumbnail created: {thumbnail_path}")
        else:
            logger.error("Could not create thumbnail - no frames could be read")
        
        # Emit processing complete event
        processed_video_url = f'/api/video/processed/{os.path.basename(output_path)}'
        thumbnail_url = f'/api/thumbnail/{thumbnail_filename}'
        detections_count = len(detections) if detections else 0
        
        logger.info(f"Video processing completed. URL: {processed_video_url}")
        
        # Create event data
        processing_complete_data = {
            'session_id': session_id,
            'status': 'completed',
            'processed_video_url': processed_video_url,
            'thumbnail_url': thumbnail_url,
            'original_filename': original_filename,
            'detections_count': detections_count,
            'videoId': session_id,  # For frontend compatibility
            'filename': original_filename,
            'detections': detections_count
        }
        
        # Emit events
        socketio.emit('processing_status', processing_complete_data)
        socketio.emit('processing_complete', processing_complete_data)
        
        # Save to database
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
                logger.info(f"Added {len(detections)} detections to database")
        except Exception as e:
            logger.error(f"Database update failed: {str(e)}", exc_info=True)
            socketio.emit('processing_status', {
                'session_id': session_id,
                'status': 'warning',
                'message': f'Video processed successfully but database update failed: {str(e)}'
            })
        
    except Exception as e:
        logger.error(f"Error in process_video_task: {str(e)}", exc_info=True)
        socketio.emit('processing_status', {
            'session_id': session_id,
            'status': 'error',
            'error': str(e)
        })

@api_bp.route('/video/processed/<filename>')
def get_processed_video(filename):
    """Serve a processed video file"""
    video_path = os.path.join(current_app.config['UPLOAD_FOLDER'], 'processed', filename)
    logger.info(f"Serving processed video from {video_path}")
    if os.path.exists(video_path):
        return send_file(video_path)
    logger.error(f"Video file not found: {video_path}")
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

@api_bp.route('/download/<video_id>')
def download_video(video_id):
    """Download processed video file"""
    try:
        # Find file with pattern 'processed_<video_id>_*'
        processed_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], 'processed')
        for filename in os.listdir(processed_dir):
            if filename.startswith(f"processed_{video_id}_"):
                video_path = os.path.join(processed_dir, filename)
                return send_file(video_path, as_attachment=True, download_name=filename)
        
        return jsonify({'error': 'Video not found'}), 404
    except Exception as e:
        logger.error(f"Error in download_video: {str(e)}", exc_info=True)
        return jsonify({'error': f'Error downloading video: {str(e)}'}), 500

@api_bp.route('/detections')
def get_detections():
    """Get all animal detections from the database"""
    try:
        # Kiểm tra xem bảng có tồn tại không
        from app.models.detection import AnimalDetection
        from sqlalchemy import inspect
        
        inspector = inspect(db.engine)
        if not inspector.has_table('animal_detection'):
            # Tạo bảng nếu nó không tồn tại
            with db.engine.connect() as connection:
                db.create_all()
                logger.info("Created table 'animal_detection' as it was not found")
            
            # Trả về kết quả rỗng
            return jsonify({
                'detections': [],
                'total': 0,
                'pages': 0,
                'current_page': 1,
                'message': 'Database initialized, no records yet'
            })
        
        # Nếu bảng tồn tại, thực hiện truy vấn
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
        logger.error(f"Error fetching detections: {str(e)}", exc_info=True)
        
        # Trả về phản hồi lỗi thân thiện với người dùng
        return jsonify({
            'error': f'Error fetching detections: {str(e)}',
            'detections': [],
            'total': 0,
            'pages': 0,
            'current_page': 1
        }), 500
@api_bp.route('/health')
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'ok'}), 200

# Camera handling with Socket.IO
@socketio.on('start_camera')
def handle_start_camera(data):
    """Start camera stream for a particular client"""
    client_id = request.sid
    camera_id = data.get('camera_id', 0)  # Default to camera 0
    
    logger.info(f"Starting camera stream for client {client_id}, camera {camera_id}")
    
    # Notify client that connection is being established
    socketio.emit('camera_status', {
        'status': 'connecting',
        'message': f'Connecting to camera {camera_id}'
    }, room=client_id)
    
    # Start streaming in background thread
    socketio.start_background_task(
        stream_camera, 
        client_id=client_id,
        camera_id=camera_id
    )

def stream_camera(client_id, camera_id):
    """Stream from camera with object detection"""
    try:
        logger.info(f"Opening camera {camera_id} for client {client_id}")
        
        # Thử nhiều phương thức truy cập camera khác nhau
        cap = None
        error_msg = ""
        
        # Phương thức 1: OpenCV thông thường
        try:
            cap = cv2.VideoCapture(int(camera_id))
            if cap.isOpened():
                ret, test_frame = cap.read()
                if not ret:
                    cap.release()
                    cap = None
                    error_msg = "Could not read initial frame"
            else:
                error_msg = "Could not open camera with default method"
        except Exception as e:
            error_msg = f"Error accessing camera: {str(e)}"
        
        # Phương thức 2: Nếu là Windows, thử với DirectShow
        if cap is None and os.name == 'nt':
            try:
                cap = cv2.VideoCapture(int(camera_id), cv2.CAP_DSHOW)
                if cap.isOpened():
                    ret, test_frame = cap.read()
                    if not ret:
                        cap.release()
                        cap = None
                        error_msg = "Could not read initial frame with DirectShow"
                else:
                    error_msg = "Could not open camera with DirectShow"
            except Exception as e:
                error_msg = f"Error accessing camera with DirectShow: {str(e)}"
        
        # Nếu vẫn không thể mở camera
        if cap is None or not cap.isOpened():
            logger.error(f"Failed to open camera {camera_id}: {error_msg}")
            socketio.emit('camera_error', {
                'error': f'Cannot open camera {camera_id}. {error_msg}'
            }, room=client_id)
            return
            
        logger.info(f"Successfully opened camera {camera_id}")
        
        # Thiết lập thuộc tính camera
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        cap.set(cv2.CAP_PROP_FPS, 30)
        
        # Notify client that camera is connected
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
                # Đọc frame với timeout
                start_time = time.time()
                ret, frame = cap.read()
                
                # Nếu đã cố gắng đọc frame quá 2 giây mà không thành công
                if time.time() - start_time > 2:
                    logger.warning(f"Frame read timeout for camera {camera_id}")
                    error_count += 1
                    continue
                
                if not ret:
                    error_count += 1
                    logger.warning(f"Could not read frame from camera {camera_id}, error count: {error_count}")
                    if error_count >= 5:
                        logger.error(f"Too many errors reading from camera {camera_id}")
                        socketio.emit('camera_error', {
                            'error': 'Cannot read frames from camera'
                        }, room=client_id)
                        break
                    time.sleep(0.1)
                    continue
                
                error_count = 0  # Reset error counter
                
                # Process frame with detection (every 3 frames to reduce CPU load)
                frame_count += 1
                if frame_count % 3 == 0 and detector is not None:
                    try:
                        processed_frame = detector.process_frame(frame, is_streaming=True)
                    except Exception as e:
                        logger.error(f"Error processing frame: {str(e)}")
                        processed_frame = frame
                else:
                    processed_frame = frame
                
                # Resize frame to reduce bandwidth
                height, width = processed_frame.shape[:2]
                scale = 0.75  # Reduce to 75% of original size
                processed_frame = cv2.resize(processed_frame, (int(width*scale), int(height*scale)))
                
                # Compress and encode frame
                _, buffer = cv2.imencode('.jpg', processed_frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
                jpg_as_text = base64.b64encode(buffer).decode('utf-8')
                
                # Send frame to client
                socketio.emit('camera_frame', {
                    'image': jpg_as_text
                }, room=client_id)
                
                # Pause briefly
                time.sleep(0.033)  # ~30 fps
            
            except Exception as e:
                logger.error(f"Error in stream_camera: {str(e)}", exc_info=True)
                error_count += 1
                if error_count >= 5:
                    socketio.emit('camera_error', {
                        'error': f'Stream error: {str(e)}'
                    }, room=client_id)
                    break
                time.sleep(0.1)
    
    except Exception as e:
        logger.error(f"Exception in stream_camera: {str(e)}", exc_info=True)
        socketio.emit('camera_error', {
            'error': f'Camera error: {str(e)}'
        }, room=client_id)
    
    finally:
        # Clean up resources
        if client_id in active_streams:
            if active_streams[client_id].get('cap'):
                try:
                    active_streams[client_id]['cap'].release()
                    logger.info(f"Released camera {camera_id} for client {client_id}")
                except Exception as e:
                    logger.error(f"Error releasing camera: {str(e)}")
            del active_streams[client_id]

@socketio.on('stop_camera')
def handle_stop_camera():
    """Stop camera stream for a client"""
    client_id = request.sid
    if client_id in active_streams:
        active_streams[client_id]['active'] = False
        logger.info(f"Stopped camera stream for client {client_id}")

@socketio.on('disconnect')
def handle_disconnect():
    """Clean up when client disconnects"""
    client_id = request.sid
    if client_id in active_streams:
        active_streams[client_id]['active'] = False
        logger.info(f"Client {client_id} disconnected, cleaning up resources")

@api_bp.route('/processed-videos')
def get_processed_videos():
    """Return a list of all processed videos"""
    try:
        processed_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], 'processed')
        videos = []
        
        # Lấy tất cả các file trong thư mục processed
        if os.path.exists(processed_dir):
            for filename in os.listdir(processed_dir):
                # Chỉ lấy các file video mp4 bắt đầu với "processed_"
                if filename.startswith('processed_') and filename.endswith('.mp4'):
                    # Tạo đường dẫn đầy đủ đến file
                    file_path = os.path.join(processed_dir, filename)
                    
                    # Lấy thông tin file
                    file_info = {
                        'filename': filename,
                        'url': f'/api/video/processed/{filename}',
                        'size': os.path.getsize(file_path),
                        'created': os.path.getctime(file_path),
                        'thumbnail': f'/api/thumbnail/thumbnail_{filename.split("_")[1].split(".")[0]}.jpg'
                    }
                    
                    # Thêm vào danh sách
                    videos.append(file_info)
        
        # Sắp xếp theo thời gian tạo mới nhất
        videos.sort(key=lambda x: x['created'], reverse=True)
        
        return jsonify({
            'videos': videos,
            'count': len(videos)
        })
    except Exception as e:
        logger.error(f"Error fetching processed videos: {str(e)}")
        return jsonify({'error': str(e), 'videos': []}), 500

@api_bp.route('/available-cameras')
def list_available_cameras():
    """List all available camera devices"""
    try:
        available_cameras = []
        # Kiểm tra 5 camera đầu tiên
        for i in range(5):
            cap = cv2.VideoCapture(i)
            if cap.isOpened():
                ret, frame = cap.read()
                if ret:
                    available_cameras.append({
                        'id': i,
                        'name': f'Camera {i}',
                        'width': int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
                        'height': int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                    })
                cap.release()
        
        return jsonify({
            'cameras': available_cameras,
            'count': len(available_cameras)
        })
    except Exception as e:
        logger.error(f"Error listing cameras: {str(e)}")
        return jsonify({'error': str(e), 'cameras': []}), 500