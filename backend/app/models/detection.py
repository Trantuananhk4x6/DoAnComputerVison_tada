from datetime import datetime
from app.extensions import db  # Import từ app.extensions thay vì app

class AnimalDetection(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    confidence = db.Column(db.Float, nullable=False)
    class_name = db.Column(db.String(50), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    video_source = db.Column(db.String(255))
    
    def __repr__(self):
        return f"<Detection {self.id} - {self.class_name} ({self.confidence:.2f})>"