from datetime import datetime
from app import db

class AnimalDetection(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    video_source = db.Column(db.String(255), nullable=False)
    video_id = db.Column(db.String(50), nullable=False)
    class_name = db.Column(db.String(50), nullable=False)
    confidence = db.Column(db.Float, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    frame_number = db.Column(db.Integer, nullable=True)
    x1 = db.Column(db.Integer, nullable=True)
    y1 = db.Column(db.Integer, nullable=True)
    x2 = db.Column(db.Integer, nullable=True)
    y2 = db.Column(db.Integer, nullable=True)
    track_id = db.Column(db.Integer, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'video_source': self.video_source,
            'video_id': self.video_id,
            'class_name': self.class_name,
            'confidence': self.confidence,
            'timestamp': self.timestamp.isoformat(),
            'frame_number': self.frame_number,
            'box': [self.x1, self.y1, self.x2, self.y2] if self.x1 is not None else None,
            'track_id': self.track_id
        }

class ProcessedVideo(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    video_id = db.Column(db.String(50), nullable=False, unique=True)
    filename = db.Column(db.String(255), nullable=False)
    original_filename = db.Column(db.String(255), nullable=False) 
    processed_filename = db.Column(db.String(255), nullable=False)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    processed_at = db.Column(db.DateTime, nullable=True)
    filesize = db.Column(db.Integer, nullable=True)
    duration = db.Column(db.Float, nullable=True)
    person_count = db.Column(db.Integer, default=0)
    animal_count = db.Column(db.Integer, default=0)
    total_frames = db.Column(db.Integer, nullable=True)
    fps = db.Column(db.Float, nullable=True)
    resolution = db.Column(db.String(20), nullable=True)
    has_tracking_data = db.Column(db.Boolean, default=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'video_id': self.video_id,
            'filename': self.filename,
            'original_filename': self.original_filename,
            'processed_filename': self.processed_filename,
            'uploaded_at': self.uploaded_at.isoformat(),
            'processed_at': self.processed_at.isoformat() if self.processed_at else None,
            'filesize': self.filesize,
            'duration': self.duration,
            'person_count': self.person_count,
            'animal_count': self.animal_count,
            'total_frames': self.total_frames,
            'fps': self.fps,
            'resolution': self.resolution,
            'has_tracking_data': self.has_tracking_data
        }

class TrackedObject(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    video_id = db.Column(db.String(50), nullable=False)
    track_id = db.Column(db.Integer, nullable=False)
    class_name = db.Column(db.String(50), nullable=False)
    first_frame = db.Column(db.Integer, nullable=False)
    last_frame = db.Column(db.Integer, nullable=False)
    avg_confidence = db.Column(db.Float, nullable=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'video_id': self.video_id,
            'track_id': self.track_id,
            'class_name': self.class_name,
            'first_frame': self.first_frame,
            'last_frame': self.last_frame,
            'avg_confidence': self.avg_confidence,
            'duration_frames': self.last_frame - self.first_frame + 1
        }

class TrackingHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    video_id = db.Column(db.String(50), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    person_count = db.Column(db.Integer, default=0)
    animal_count = db.Column(db.Integer, default=0)
    total_objects = db.Column(db.Integer, default=0)
    total_frames = db.Column(db.Integer, nullable=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'video_id': self.video_id,
            'timestamp': self.timestamp.isoformat(),
            'person_count': self.person_count,
            'animal_count': self.animal_count,
            'total_objects': self.total_objects,
            'total_frames': self.total_frames
        }