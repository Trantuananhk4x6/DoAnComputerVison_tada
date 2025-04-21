Animal & Person Detection System
Overview
Animal & Person Detection System is a comprehensive application for real-time detection and tracking of animals and people using computer vision technology. This system provides video processing capabilities, live camera detection, and maintains a historical record of all detections.

Features
📹 Video Processing
Upload videos for offline processing
Detect animals and people in uploaded videos
Download processed videos with detection highlights
View detection statistics and results
🎥 Live Detection
Real-time detection using connected cameras
Support for multiple camera sources
Live statistics of detected objects
Automatic reconnection on camera failure
📊 Detection History
View history of all detections
Filter and search detection records
View detection timestamps and confidence levels
Access to detection videos and thumbnails
Technology Stack
Frontend
React.js
Material-UI
Socket.IO Client
React Router
Backend
Flask
OpenCV
SQLite/SQLAlchemy
Socket.IO
YOLOv5/YOLOv8 for object detection
Installation and Setup
Prerequisites
Node.js (v14 or higher)
Python (v3.8 or higher)
Pip
Git
Backend Setup
bash
# Clone the repository
git clone <repository-url>
cd <project-directory>

# Create and activate virtual environment
python -m venv .venv
# For Windows
.venv\Scripts\activate
# For Linux/Mac
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set up the database
flask db init
flask db migrate
flask db upgrade

# Start the backend server
python run.py
Frontend Setup
bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm start
Usage
Video Processing
Navigate to the "Video Processing" page
Click "Choose Video" to select a video file
Click "Upload & Process" to start processing
Wait for processing to complete
View and download the processed video with detections
Live Detection
Navigate to the "Live Detection" page
Select your camera source from the dropdown
Click "Start Camera" to begin detection
View real-time detection statistics
Click "Stop Camera" when finished
Viewing Detection History
Navigate to the "Detection History" page
Browse through past detections
Use filters to find specific detection types or dates
Click on entries to view detailed information and video clips
Project Structure
Code
project/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── api/
│   │   ├── models/
│   │   └── services/
│   ├── instance/
│   ├── migrations/
│   └── run.py
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── App.js
│   ├── package.json
│   └── README.md
├── .gitignore
├── requirements.txt
└── README.md
Configuration
Backend Configuration
Edit the .env file or environment variables:

Code
FLASK_APP=app
FLASK_ENV=development
DATABASE_URI=sqlite:///app.db
UPLOAD_FOLDER=uploads
Frontend Configuration
Edit the .env file in the frontend directory:

Code
REACT_APP_API_URL=http://localhost:5000
Troubleshooting
Camera Issues
Ensure your camera is not being used by another application
Check browser permissions for camera access
Try a different camera source if available
Restart the application if camera stops working
Video Processing Issues
Check that uploaded video is in a supported format (MP4, AVI, MOV)
Ensure video file size is within limits
Check server logs for processing errors
License
This project is licensed under the MIT License - see the LICENSE file for details.

Acknowledgments
YOLOv5/YOLOv8 for object detection models
OpenCV for computer vision capabilities
React and Material-UI for the frontend interface
