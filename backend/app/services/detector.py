import cv2
import numpy as np
import os
import time
import logging
from ultralytics import YOLO
from deep_sort_realtime.deepsort_tracker import DeepSort
import subprocess

# Thiết lập logging
logger = logging.getLogger(__name__)

class ObjectDetector:
    def __init__(self):
        """Khởi tạo detector với mô hình YOLOv8 và DeepSORT tracker"""
        # Đường dẫn đến model
        model_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 
                                 'model', 'best.pt')
        
        try:
            # Tải model YOLOv8
            logger.info(f"Loading YOLOv8 model from: {model_path}")
            self.model = YOLO(model_path)
            logger.info(f"Model loaded successfully: {model_path}")
            
            # Khởi tạo DeepSORT tracker
            self.tracker = DeepSort(max_age=30, 
                                   n_init=3, 
                                   nn_budget=100,
                                   embedder_gpu=False,
                                   embedder_model_name='mobilenetv2_x1_0')
            logger.info("DeepSORT tracker initialized")
            
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}", exc_info=True)
            self.model = None
            self.tracker = None

    def process_frame(self, frame, frame_idx=0):
        """Xử lý một frame và trả về kết quả phát hiện và tracking"""
        if self.model is None or self.tracker is None:
            return frame, [], []  # Trả về frame gốc nếu model không tồn tại
        
        try:
            # Thực hiện phát hiện đối tượng với YOLOv8
            results = self.model(frame, verbose=False)
            result = results[0]  # Lấy kết quả đầu tiên
            
            # Tạo danh sách detections cho DeepSORT
            detections = []
            detection_results = []
            
            # Xử lý các bounding boxes
            if len(result.boxes) > 0:
                for box in result.boxes:
                    # Lấy tọa độ bounding box
                    x1, y1, x2, y2 = map(float, box.xyxy[0])
                    x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)
                    
                    # Lấy độ tin cậy
                    conf = float(box.conf[0])
                    
                    # Lấy class ID và tên
                    cls_id = int(box.cls[0])
                    cls_name = self.model.names[cls_id]
                    
                    # Thêm vào danh sách detections cho DeepSORT
                    detections.append(([x1, y1, x2, y2], conf, cls_name))
                    
                    # Lưu kết quả detection
                    detection_results.append({
                        'frame': frame_idx,
                        'class': cls_name,
                        'confidence': conf,
                        'box': [x1, y1, x2, y2]
                    })
            
            # Cập nhật tracker với các detections mới
            tracks = self.tracker.update_tracks(detections, frame=frame)
            track_results = []
            
            # Vẽ các bounding boxes và track IDs lên frame
            for track in tracks:
                if not track.is_confirmed():
                    continue
                
                track_id = track.track_id
                ltrb = track.to_ltrb()
                x1, y1, x2, y2 = map(int, ltrb)
                
                # Lấy class name từ track
                class_name = track.get_det_class()
                if not class_name:
                    continue  # Skip tracks without class information
                
                # Màu dựa vào loại đối tượng
                if 'person' in class_name.lower():
                    color = (0, 0, 255)  # Red for people
                elif any(animal in class_name.lower() for animal in ['animal', 'dog', 'cat']):
                    color = (0, 255, 0)  # Green for animals
                else:
                    color = (255, 0, 0)  # Blue for other objects
                
                # Vẽ bounding box
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                
                # Thêm text với ID
                label = f"{class_name}: {track_id}"
                cv2.putText(frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
                
                # Lưu thông tin track
                track_results.append({
                    'track_id': track_id,
                    'class': class_name,
                    'frame': frame_idx,
                    'box': [x1, y1, x2, y2]
                })
            
            return frame, detection_results, track_results
            
        except Exception as e:
            logger.error(f"Error in process_frame: {str(e)}", exc_info=True)
            return frame, [], []

    def process_video(self, input_path, output_path, progress_callback=None):
        """Xử lý video và trả về kết quả phát hiện và tracking"""
        if self.model is None or self.tracker is None:
            logger.error("No model loaded for video processing")
            return {
                'detections': [],
                'tracks': {},
                'person_count': 0,
                'animal_count': 0,
                'error': 'Model not loaded'
            }
            
        try:
            cap = cv2.VideoCapture(input_path)
            if not cap.isOpened():
                logger.error(f"Error opening video file: {input_path}")
                return {
                    'detections': [],
                    'tracks': {},
                    'person_count': 0,
                    'animal_count': 0,
                    'error': 'Could not open video file'
                }
                
            # Lấy thông tin video
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            
            # Kiểm tra và đặt FPS mặc định nếu giá trị không hợp lệ
            if fps <= 0 or np.isnan(fps):
                logger.warning("Invalid FPS detected, setting to default 30fps")
                fps = 30
            
            # Chọn codec phù hợp
            if os.name == 'nt':  # Windows
                fourcc = cv2.VideoWriter_fourcc(*'XVID')
                temp_output_path = output_path.replace('.mp4', '.avi')
                out = cv2.VideoWriter(temp_output_path, fourcc, fps, (width, height))
            else:  # Linux/Mac
                fourcc = cv2.VideoWriter_fourcc(*'mp4v')
                out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
            
            if not out.isOpened():
                logger.error(f"Failed to create VideoWriter for: {output_path}")
                return {
                    'detections': [],
                    'tracks': {},
                    'person_count': 0,
                    'animal_count': 0,
                    'error': 'Failed to create output video'
                }
            
            frame_count = 0
            all_detections = []
            all_tracks = {}
            person_tracks = set()
            animal_tracks = set()
            
            # Xử lý từng frame
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break
                    
                # In frame count mỗi 100 frame
                if frame_count % 100 == 0:
                    logger.info(f"Processing frame {frame_count}/{total_frames}")
                
                # Xử lý frame
                try:
                    processed_frame, detections, tracks = self.process_frame(frame, frame_count)
                    
                    # Lưu các detections
                    all_detections.extend(detections)
                    
                    # Lưu và cập nhật các tracks
                    for track in tracks:
                        track_id = track['track_id']
                        class_name = track['class'].lower()
                        
                        # Lưu ID của track theo loại
                        if 'person' in class_name:
                            person_tracks.add(track_id)
                        elif any(animal in class_name for animal in ['animal', 'dog', 'cat']):
                            animal_tracks.add(track_id)
                        
                        # Lưu hoặc cập nhật thông tin track
                        if track_id not in all_tracks:
                            all_tracks[track_id] = {
                                'class': track['class'],
                                'first_frame': frame_count,
                                'last_frame': frame_count,
                                'positions': [{'frame': frame_count, 'box': track['box']}]
                            }
                        else:
                            all_tracks[track_id]['last_frame'] = frame_count
                            all_tracks[track_id]['positions'].append({
                                'frame': frame_count, 
                                'box': track['box']
                            })
                    
                    # Lưu frame đã xử lý
                    out.write(processed_frame)
                    
                except Exception as e:
                    logger.error(f"Error processing frame {frame_count}: {str(e)}")
                    # Ghi lại frame gốc nếu có lỗi
                    try:
                        out.write(frame)
                    except:
                        pass
                
                # Cập nhật tiến trình
                frame_count += 1
                if progress_callback and total_frames > 0:
                    progress = int((frame_count / total_frames) * 100)
                    progress_callback(progress)
            
            # Giải phóng resources
            cap.release()
            out.release()
            
            # Nếu là Windows, chuyển đổi từ AVI sang MP4
            if os.name == 'nt' and os.path.exists(temp_output_path):
                try:
                    # Thử chuyển đổi với FFmpeg
                    logger.info(f"Converting {temp_output_path} to {output_path} using FFmpeg")
                    ffmpeg_cmd = [
                        'ffmpeg', '-y', '-i', temp_output_path, 
                        '-c:v', 'libx264', '-preset', 'fast', 
                        '-crf', '22', '-pix_fmt', 'yuv420p', output_path
                    ]
                    
                    subprocess.run(ffmpeg_cmd, check=True, 
                                  stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                    
                    # Xóa file AVI nếu chuyển đổi thành công
                    if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                        os.remove(temp_output_path)
                        logger.info(f"Conversion successful, deleted AVI file")
                    else:
                        logger.warning(f"MP4 conversion failed, using AVI file")
                        os.rename(temp_output_path, output_path)
                except Exception as e:
                    logger.error(f"Error converting video: {str(e)}")
                    if os.path.exists(temp_output_path):
                        os.rename(temp_output_path, output_path)
                    
            # Số lượng người và động vật dựa trên số track duy nhất
            person_count = len(person_tracks)
            animal_count = len(animal_tracks)
            
            logger.info(f"Video processing completed: {person_count} people, {animal_count} animals, {len(all_tracks)} total tracks")
            
            return {
                'detections': all_detections,
                'tracks': all_tracks,
                'person_count': person_count,
                'animal_count': animal_count,
                'total_tracks': len(all_tracks),
                'total_frames': frame_count,
                'resolution': f"{width}x{height}",
                'fps': fps,
                'duration': frame_count / fps if fps > 0 else 0
            }
            
        except Exception as e:
            logger.error(f"Error processing video: {str(e)}", exc_info=True)
            return {
                'detections': [],
                'tracks': {},
                'person_count': 0,
                'animal_count': 0,
                'error': str(e)
            }