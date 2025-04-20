import cv2
import numpy as np
import os
from ultralytics import YOLO
from datetime import datetime
import time
from flask import current_app
from app import socketio
from app.models.detection import AnimalDetection
from app import db
from app.utils.model_loader import load_model

class ObjectDetector:
    def __init__(self, model_path=None):
        """Initialize the object detector"""
        if model_path is None:
            # Use model path from app config if available
            try:
                model_path = current_app.config.get('MODEL_PATH', r'D:\DoAn_computerVision\backend\model\best.pt')
            except RuntimeError:
                # If not in app context
                model_path = os.getenv('MODEL_PATH', r'D:\DoAn_computerVision\backend\model\best.pt')
        
        self.model = load_model(model_path)
        
        # Get confidence threshold from config or use default
        try:
            self.conf_threshold = current_app.config.get('CONFIDENCE_THRESHOLD', 0.5)
        except RuntimeError:
            self.conf_threshold = float(os.getenv('CONFIDENCE_THRESHOLD', '0.5'))
        
        self.animal_classes = ['animal']  # Your model specifically detects "animal" as a class
        self.last_notification_time = {}  # To avoid flooding notifications
    
    def process_frame(self, frame, video_source, is_streaming=False):
        """Process a single frame and return the annotated frame with detections"""
        if frame is None:
            return None
        
        # Perform inference with confidence threshold
        results = self.model(frame, conf=self.conf_threshold)
        result = results[0]
        
        # Process and annotate detections
        annotated_frame = frame.copy()
        
        for det in result.boxes.data.tolist():
            x1, y1, x2, y2, conf, cls = det
            x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)
            
            class_id = int(cls)
            class_name = result.names[class_id]
            
            # Format confidence for display
            confidence = round(conf * 100, 1)
            
            # Choose color based on class (animal vs person)
            if class_name.lower() in self.animal_classes:
                color = (0, 255, 0)  # Green for animals
                self._handle_animal_detection(class_name, confidence, video_source)
            else:
                color = (0, 0, 255)  # Red for people
            
            # Draw bounding box
            cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)
            
            # Add label with confidence
            label = f"{class_name}: {confidence}%"
            cv2.putText(annotated_frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
        
        return annotated_frame
    
    def _handle_animal_detection(self, class_name, confidence, video_source):
        """Handle detected animals - save to DB and send websocket notification"""
        current_time = time.time()
        
        # Avoid flooding notifications and DB - only notify once every 10 seconds for same source
        if video_source not in self.last_notification_time or \
           current_time - self.last_notification_time[video_source] > 10:
            
            # Create a database entry
            detection = AnimalDetection(
                confidence=confidence/100.0,  # Store as decimal (0-1)
                class_name=class_name,
                video_source=video_source
            )
            db.session.add(detection)
            db.session.commit()
            
            # Send websocket notification
            detection_data = detection.to_dict()
            socketio.emit('animal_detected', detection_data)
            
            # Update last notification time
            self.last_notification_time[video_source] = current_time
    
    def process_video(self, video_path, output_path=None, progress_callback=None):
        """Process a video file, saving the output if path is provided"""
        cap = cv2.VideoCapture(video_path)
        
        if not cap.isOpened():
            raise ValueError(f"Could not open video at {video_path}")
        
        # Get video properties
        frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        # If output path is provided, create a VideoWriter
        out = None
        if output_path:
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            out = cv2.VideoWriter(output_path, fourcc, fps, (frame_width, frame_height))
        
        frame_count = 0
        processed_frames = []
        
        try:
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Process the frame
                processed = self.process_frame(frame, f"video:{video_path}")
                
                # Save frame if we're writing to file
                if out:
                    out.write(processed)
                
                # Store the processed frame or encode for streaming
                _, buffer = cv2.imencode('.jpg', processed)
                processed_frames.append(buffer.tobytes())
                
                # Update progress
                frame_count += 1
                progress = (frame_count / total_frames) * 100
                if progress_callback:
                    progress_callback(progress)
        
        finally:
            cap.release()
            if out:
                out.release()
        
        return processed_frames