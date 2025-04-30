from flask import Blueprint, jsonify, current_app
import os
import logging
from datetime import datetime, timedelta
from sqlalchemy import func, desc

from app.models.detection import AnimalDetection, ProcessedVideo, TrackingHistory
from app import db

# Thiết lập logging
logger = logging.getLogger(__name__)

# Định nghĩa Blueprint
dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/dashboard')

@dashboard_bp.route('/stats', methods=['GET'])
def get_dashboard_stats():
    try:
        # Count processed videos
        total_videos = ProcessedVideo.query.count()
        
        # Count videos processed in the last 7 days
        week_ago = datetime.utcnow() - timedelta(days=7)
        recent_videos = ProcessedVideo.query.filter(ProcessedVideo.processed_at >= week_ago).count()
        
        # Get total detections
        total_detections = AnimalDetection.query.count()
        
        # Count people and animals
        total_people = db.session.query(func.sum(ProcessedVideo.person_count)).scalar() or 0
        total_animals = db.session.query(func.sum(ProcessedVideo.animal_count)).scalar() or 0
        
        # Calculate storage usage
        upload_folder = current_app.config['UPLOAD_FOLDER']
        storage_usage = 0
        for root, dirs, files in os.walk(upload_folder):
            for file in files:
                file_path = os.path.join(root, file)
                storage_usage += os.path.getsize(file_path)
        
        # Get most recent videos
        recent_videos_list = ProcessedVideo.query.order_by(ProcessedVideo.processed_at.desc()).limit(5).all()
        recent_videos_formatted = []
        
        for video in recent_videos_list:
            if video.processed_at:  # Only include fully processed videos
                thumbnail_path = os.path.join(
                    current_app.config['UPLOAD_FOLDER'],
                    'thumbnails',
                    f"thumbnail_{video.video_id}.jpg"
                )
                
                recent_videos_formatted.append({
                    'id': video.video_id,
                    'name': video.filename,
                    'processed_at': video.processed_at.isoformat(),
                    'person_count': video.person_count,
                    'animal_count': video.animal_count,
                    'thumbnail': f'/api/videos/thumbnail/{video.video_id}' if os.path.exists(thumbnail_path) else None
                })
        
        # Get detection statistics by class
        detection_stats = db.session.query(
            AnimalDetection.class_name,
            func.count(AnimalDetection.id).label('count')
        ).group_by(AnimalDetection.class_name).all()
        
        detection_by_class = {item.class_name: item.count for item in detection_stats}
        
        # Get processing history for chart
        history_query = TrackingHistory.query.order_by(TrackingHistory.timestamp.desc()).limit(10)
        history_data = []
        
        for item in history_query:
            video = ProcessedVideo.query.filter_by(video_id=item.video_id).first()
            history_data.append({
                'date': item.timestamp.strftime('%Y-%m-%d'),
                'video_name': video.filename if video else 'Unknown',
                'person_count': item.person_count,
                'animal_count': item.animal_count
            })
        
        # Reverse for chronological order
        history_data.reverse()
        
        return jsonify({
            'storage': {
                'used_bytes': storage_usage,
                'used_formatted': format_size(storage_usage)
            },
            'videos': {
                'total': total_videos,
                'recent_week': recent_videos,
                'recent_list': recent_videos_formatted
            },
            'detections': {
                'total': total_detections,
                'people': int(total_people),
                'animals': int(total_animals),
                'by_class': detection_by_class
            },
            'history': history_data
        })
    except Exception as e:
        logger.error(f"Error getting dashboard stats: {str(e)}")
        return jsonify({
            'error': f'Error retrieving dashboard stats: {str(e)}'
        }), 500

def format_size(size_bytes):
    """Format size in bytes to a human-readable format"""
    if size_bytes == 0:
        return "0B"
    
    size_name = ("B", "KB", "MB", "GB", "TB", "PB")
    i = 0
    while size_bytes >= 1024 and i < len(size_name) - 1:
        size_bytes /= 1024
        i += 1
    
    return f"{size_bytes:.2f} {size_name[i]}"