import os
import sys
import torch
import logging

# Thiết lập logging
logger = logging.getLogger(__name__)

def load_model(model_path):
    """
    Tải mô hình YOLO từ đường dẫn.
    Không sử dụng socketio trong hàm này để tránh lỗi circular dependency.
    """
    try:
        if not os.path.exists(model_path):
            logger.error(f"Model not found at path: {model_path}")
            return None

        # Tải model bằng torch.hub hoặc method phù hợp
        model = torch.hub.load('ultralytics/yolov5', 'custom', path=model_path)
        model.conf = 0.35  # Ngưỡng confidence
        model.iou = 0.45   # Ngưỡng IoU
        
        logger.info(f"Model loaded successfully: {model_path}")
        return model
        
    except Exception as e:
        error_message = f"Error loading model: {str(e)}"
        logger.error(error_message)
        return None