from app import db
from datetime import datetime

class AnimalDetection(db.Model):
    """Model cho các phát hiện động vật trong video"""
    __tablename__ = 'animal_detection'  # Chỉ định rõ tên bảng
    
    id = db.Column(db.Integer, primary_key=True)
    class_name = db.Column(db.String(100), nullable=False)
    confidence = db.Column(db.Float, nullable=False)
    video_source = db.Column(db.String(200), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        """Convert model to dictionary"""
        return {
            'id': self.id,
            'class_name': self.class_name,
            'confidence': self.confidence,
            'video_source': self.video_source,
            'timestamp': self.timestamp.isoformat()
        }