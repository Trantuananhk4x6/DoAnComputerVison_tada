import cv2
import numpy as np
import os
import time
import logging
from ultralytics import YOLO
import subprocess

# Thiết lập logging
logger = logging.getLogger(__name__)

class ObjectDetector:
    def __init__(self):
        """Khởi tạo detector với mô hình YOLOv8"""
        # Đường dẫn đến model
        model_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 
                                 'model', 'best.pt')
        
        try:
            # Tải model
            logger.info(f"Loading YOLOv8 model from: {model_path}")
            self.model = YOLO(model_path)
            logger.info(f"Model loaded successfully: {model_path}")
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            self.model = None

    def process_frame(self, frame, source=None, is_streaming=True):
        """Xử lý một frame và trả về kết quả phát hiện"""
        if self.model is None:
            return frame  # Trả về frame gốc nếu model không tồn tại
        
        try:
            # Thực hiện phát hiện đối tượng với YOLOv8
            results = self.model(frame, verbose=False)
            
            # YOLOv8 trả về list of Results objects
            result = results[0]  # Lấy kết quả đầu tiên
            
            # Vẽ các bounding boxes lên frame
            if len(result.boxes) > 0:
                for box in result.boxes:
                    # Lấy tọa độ bounding box
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    
                    # Lấy độ tin cậy
                    conf = float(box.conf[0])
                    
                    # Lấy class ID và tên
                    cls_id = int(box.cls[0])
                    cls_name = self.model.names[cls_id]
                    
                    # Màu dựa vào loại đối tượng
                    if 'animal' in cls_name.lower() or 'dog' in cls_name.lower() or 'cat' in cls_name.lower():
                        color = (0, 255, 0)  # Xanh lá cho động vật
                    else:
                        color = (0, 0, 255)  # Đỏ cho người hoặc đối tượng khác
                    
                    # Vẽ bounding box
                    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                    
                    # Thêm text
                    label = f"{cls_name}: {conf:.2f}"
                    cv2.putText(frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
            
            return frame
            
        except Exception as e:
            logger.error(f"Error in process_frame: {str(e)}")
            return frame

    def analyze_video(self, video_path, sample_frames=10):
        """Phân tích video để đếm người và động vật"""
        if self.model is None:
            logger.error("No model loaded for video analysis")
            return {'person_count': 0, 'animal_count': 0}
            
        try:
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                logger.error(f"Error opening video file: {video_path}")
                return {'person_count': 0, 'animal_count': 0}
                
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            frame_step = max(1, total_frames // sample_frames)
            
            person_count = 0
            animal_count = 0
            
            for i in range(0, total_frames, frame_step):
                cap.set(cv2.CAP_PROP_POS_FRAMES, i)
                ret, frame = cap.read()
                if not ret:
                    break
                    
                # Phát hiện đối tượng
                results = self.model(frame, verbose=False)
                result = results[0]  # Lấy kết quả đầu tiên
                
                # Đếm đối tượng
                for box in result.boxes:
                    cls_id = int(box.cls[0])
                    cls_name = self.model.names[cls_id]
                    
                    if cls_name.lower() == 'person':
                        person_count += 1
                    elif 'animal' in cls_name.lower() or 'dog' in cls_name.lower() or 'cat' in cls_name.lower():
                        animal_count += 1
            
            cap.release()
            
            return {
                'person_count': person_count,
                'animal_count': animal_count
            }
            
        except Exception as e:
            logger.error(f"Error analyzing video: {str(e)}", exc_info=True)
            return {'person_count': 0, 'animal_count': 0}

    def process_video(self, input_path, output_path, progress_callback=None):
        """Xử lý video và trả về kết quả phát hiện"""
        if self.model is None:
            logger.error("No model loaded for video processing")
            return []
            
        try:
            cap = cv2.VideoCapture(input_path)
            if not cap.isOpened():
                logger.error(f"Error opening video file: {input_path}")
                return []
                
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
                return []
            
            frame_count = 0
            all_detections = []
            person_count = 0
            animal_count = 0
            
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
                    # Thực hiện phát hiện đối tượng với YOLOv8
                    results = self.model(frame, verbose=False)
                    result = results[0]  # Lấy kết quả đầu tiên
                    
                    # Vẽ các bounding boxes lên frame
                    if len(result.boxes) > 0:
                        for box in result.boxes:
                            # Lấy tọa độ bounding box
                            x1, y1, x2, y2 = map(int, box.xyxy[0])
                            
                            # Lấy độ tin cậy
                            conf = float(box.conf[0])
                            
                            # Lấy class ID và tên
                            cls_id = int(box.cls[0])
                            cls_name = self.model.names[cls_id]
                            
                            # Đếm người và động vật
                            if cls_name.lower() == 'person':
                                person_count += 1
                            elif 'animal' in cls_name.lower() or 'dog' in cls_name.lower() or 'cat' in cls_name.lower():
                                animal_count += 1
                            
                            # Màu dựa vào loại đối tượng
                            if 'animal' in cls_name.lower() or 'dog' in cls_name.lower() or 'cat' in cls_name.lower():
                                color = (0, 255, 0)  # Xanh lá cho động vật
                            else:
                                color = (0, 0, 255)  # Đỏ cho người hoặc đối tượng khác
                            
                            # Vẽ bounding box
                            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                            
                            # Thêm text
                            label = f"{cls_name}: {conf:.2f}"
                            cv2.putText(frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
                            
                            # Thêm vào list phát hiện
                            all_detections.append({
                                'frame': frame_count,
                                'class': cls_name,
                                'confidence': conf,
                                'box': [x1, y1, x2, y2]
                            })
                    
                    # Lưu frame đã xử lý
                    out.write(frame)
                    
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
            if os.name == 'nt':
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
                    
            logger.info(f"Video processing completed, detected: {person_count} people, {animal_count} animals")
            
            return {
                'all_detections': all_detections,
                'person_count': person_count,
                'animal_count': animal_count
            }
            
        except Exception as e:
            logger.error(f"Error processing video: {str(e)}", exc_info=True)
            return {
                'all_detections': [],
                'person_count': 0,
                'animal_count': 0
            }