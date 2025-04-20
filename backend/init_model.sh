#!/bin/bash

# This script downloads or sets up the YOLOv8 model

echo "Setting up the YOLOv8 model..."

# Create model directory if it doesn't exist
mkdir -p model

# Check if model exists
if [ -f "model/best.pt" ]; then
    echo "YOLOv8 model already exists"
else
    echo "YOLOv8 model not found"
    echo "Please place your pre-trained YOLOv8 model file (best.pt) in the model/ directory"

    # Optionally, if you want to download a default YOLOv8 model
    # pip install ultralytics
    # python -c "from ultralytics import YOLO; YOLO('yolov8n.pt').save('model/best.pt')"
fi

echo "Model setup completed!"