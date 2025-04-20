"""Utility for loading the YOLOv8 model"""
import os
from ultralytics import YOLO
from app import socketio

def load_model(model_path=None):
    """Load the YOLOv8 model from the specified path"""
    try:
        # Use default path if none provided
        if model_path is None:
            from flask import current_app
            model_path = current_app.config.get('MODEL_PATH', 'model/best.pt')
        
        # Check if model file exists
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found at {model_path}")
        
        # Load the model
        model = YOLO(model_path)
        print(f"Model loaded successfully: {model_path}")
        
        # Emit loading status to clients
        socketio.emit('model_status', {'status': 'loaded', 'message': 'Model loaded successfully'})
        
        return model
    
    except Exception as e:
        error_message = f"Error loading model: {str(e)}"
        print(error_message)
        
        # Emit error to clients
        socketio.emit('model_status', {'status': 'error', 'message': error_message})
        
        # Reraise the exception
        raise