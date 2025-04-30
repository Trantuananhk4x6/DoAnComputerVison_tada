from app import db
from datetime import datetime
import json

class AnimalDetection(db.Model):
    """Model for storing animal detections"""
    __tablename__ = 'animal_detection'
    
    id = db.Column(db.Integer, primary_key=True)
    class_name = db.Column(db.String(50), nullable=False)
    confidence = db.Column(db.Float, nullable=False)
    video_source = db.Column(db.String(255), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'class_name': self.class_name,
            'confidence': self.confidence,
            'video_source': self.video_source,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }

class ObjectTracking(db.Model):
    """Model for storing object tracking data"""
    __tablename__ = 'object_tracking'
    
    id = db.Column(db.Integer, primary_key=True)
    object_type = db.Column(db.String(50), nullable=False)
    count = db.Column(db.Integer, default=1)
    source = db.Column(db.String(255), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'object_type': self.object_type,
            'count': self.count,
            'source': self.source,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }

# Functions for the VideoProcessing component
def save_detection(video_id, detection_type, count, detection_time=None):
    """Save a detection to the database"""
    try:
        if detection_time is None:
            detection_time = datetime.utcnow()
        
        # Create database connection
        conn = db.engine.connect()
        
        # Insert into detection_history
        query = """
        INSERT INTO detection_history (video_id, detection_type, count, detection_time) 
        VALUES (:video_id, :detection_type, :count, :detection_time)
        """
        conn.execute(query, {
            'video_id': video_id,
            'detection_type': detection_type,
            'count': count,
            'detection_time': detection_time
        })
        
        conn.close()
        return True
    except Exception as e:
        print(f"Error saving detection: {str(e)}")
        return False

def get_processed_videos():
    """Get all processed videos from the database"""
    try:
        # Create database connection
        conn = db.engine.connect()
        
        # Query videos
        query = """
        SELECT id, name, processed_file_path, upload_date, processed_at, person_count, animal_count, thumbnail_path 
        FROM videos 
        WHERE status = 'completed' 
        ORDER BY processed_at DESC
        """
        result = conn.execute(query)
        
        videos = []
        for row in result:
            videos.append({
                'id': row[0],
                'name': row[1],
                'processed_file_path': row[2],
                'upload_date': row[3],
                'processed_at': row[4],
                'person_count': row[5],
                'animal_count': row[6],
                'thumbnail_path': row[7]
            })
        
        conn.close()
        return videos
    except Exception as e:
        print(f"Error getting processed videos: {str(e)}")
        return []

def delete_video(video_id):
    """Delete a video and related data from the database"""
    try:
        # Create database connection
        conn = db.engine.connect()
        
        # Get file paths
        query = """
        SELECT file_path, processed_file_path, thumbnail_path FROM videos WHERE id = :video_id
        """
        result = conn.execute(query, {'video_id': video_id}).first()
        
        if not result:
            conn.close()
            return False, "Video not found"
        
        file_path, processed_path, thumbnail_path = result
        
        # Delete from database
        conn.execute("DELETE FROM detection_history WHERE video_id = :video_id", {'video_id': video_id})
        conn.execute("DELETE FROM tracking_data WHERE video_id = :video_id", {'video_id': video_id})
        conn.execute("DELETE FROM videos WHERE id = :video_id", {'video_id': video_id})
        
        conn.close()
        
        # Return paths for file deletion
        return True, {
            'file_path': file_path,
            'processed_path': processed_path,
            'thumbnail_path': thumbnail_path
        }
    except Exception as e:
        print(f"Error deleting video: {str(e)}")
        return False, str(e)

def get_video_by_id(video_id):
    """Get video details by ID"""
    try:
        # Create database connection
        conn = db.engine.connect()
        
        # Query video
        query = """
        SELECT id, name, processed_file_path, upload_date, processed_at, person_count, animal_count, thumbnail_path 
        FROM videos 
        WHERE id = :video_id
        """
        result = conn.execute(query, {'video_id': video_id}).first()
        
        conn.close()
        
        if not result:
            return None
        
        return {
            'id': result[0],
            'name': result[1],
            'processed_file_path': result[2],
            'upload_date': result[3],
            'processed_at': result[4],
            'person_count': result[5],
            'animal_count': result[6],
            'thumbnail_path': result[7]
        }
    except Exception as e:
        print(f"Error getting video: {str(e)}")
        return None