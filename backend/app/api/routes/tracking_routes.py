from flask import Blueprint, jsonify, request, current_app
import os
import json
import logging
from datetime import datetime

from app.models.detection import AnimalDetection, TrackedObject, TrackingHistory, ProcessedVideo
from app import db

# Thiết lập logging
logger = logging.getLogger(__name__)

# Định nghĩa Blueprint
tracking_bp = Blueprint('tracking', __name__, url_prefix='/tracking')

@tracking_bp.route('/history', methods=['GET'])
def get_tracking_history():
    try:
        # Get tracking history records, ordered by timestamp
        history = TrackingHistory.query.order_by(TrackingHistory.timestamp.desc()).all()
        
        # Format response
        formatted_history = [item.to_dict() for item in history]
        
        # Add video names to the history items
        for item in formatted_history:
            video = ProcessedVideo.query.filter_by(video_id=item['video_id']).first()
            if video:
                item['video_name'] = video.filename
            else:
                item['video_name'] = "Unknown"
        
        return jsonify({
            'history': formatted_history,
            'count': len(formatted_history)
        })
    except Exception as e:
        logger.error(f"Error getting tracking history: {str(e)}")
        return jsonify({
            'history': [],
            'error': str(e)
        }), 500

@tracking_bp.route('/video/<video_id>', methods=['GET'])
def get_video_tracking(video_id):
    try:
        # Try to get tracking data from JSON file
        tracking_path = os.path.join(
            current_app.config['UPLOAD_FOLDER'],
            'tracking_data',
            f"tracking_{video_id}.json"
        )
        
        if os.path.exists(tracking_path):
            with open(tracking_path, 'r') as f:
                tracking_data = json.load(f)
                
            # Get video info
            video = ProcessedVideo.query.filter_by(video_id=video_id).first()
            if video:
                tracking_data['video_info'] = {
                    'name': video.filename,
                    'duration': video.duration,
                    'resolution': video.resolution,
                    'fps': video.fps,
                    'uploaded_at': video.uploaded_at.isoformat(),
                    'processed_at': video.processed_at.isoformat() if video.processed_at else None
                }
                
            return jsonify(tracking_data)
        
        # If no JSON file, try to get data from database
        video = ProcessedVideo.query.filter_by(video_id=video_id).first()
        if not video:
            return jsonify({'error': 'Video not found'}), 404
            
        # Get tracked objects
        tracked_objects = TrackedObject.query.filter_by(video_id=video_id).all()
        
        # Format tracks
        tracks = {}
        for tracked_obj in tracked_objects:
            tracks[str(tracked_obj.track_id)] = {
                'class': tracked_obj.class_name,
                'first_frame': tracked_obj.first_frame,
                'last_frame': tracked_obj.last_frame,
                'avg_confidence': tracked_obj.avg_confidence
            }
            
        # Create response
        result = {
            'video_id': video_id,
            'processed_at': video.processed_at.isoformat() if video.processed_at else None,
            'person_count': video.person_count,
            'animal_count': video.animal_count,
            'total_frames': video.total_frames,
            'tracks': tracks,
            'video_info': {
                'name': video.filename,
                'duration': video.duration,
                'resolution': video.resolution,
                'fps': video.fps,
                'uploaded_at': video.uploaded_at.isoformat(),
                'processed_at': video.processed_at.isoformat() if video.processed_at else None
            }
        }
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error getting video tracking data: {str(e)}")
        return jsonify({
            'error': f'Error retrieving tracking data: {str(e)}'
        }), 500

@tracking_bp.route('/detections/<video_id>', methods=['GET'])
def get_video_detections(video_id):
    try:
        # Check if video exists
        video = ProcessedVideo.query.filter_by(video_id=video_id).first()
        if not video:
            return jsonify({'error': 'Video not found'}), 404
            
        # Get query parameters for pagination
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 100, type=int)
        
        # Get detections
        query = AnimalDetection.query.filter_by(video_id=video_id).order_by(AnimalDetection.frame_number)
        
        # Get total count
        total_count = query.count()
        
        # Paginate results
        paginated_results = query.paginate(page=page, per_page=per_page, error_out=False)
        
        # Format detections
        detections = [detection.to_dict() for detection in paginated_results.items]
        
        return jsonify({
            'detections': detections,
            'page': page,
            'per_page': per_page,
            'total': total_count,
            'pages': paginated_results.pages,
            'video_id': video_id
        })
    except Exception as e:
        logger.error(f"Error getting video detections: {str(e)}")
        return jsonify({
            'error': f'Error retrieving detections: {str(e)}'
        }), 500

@tracking_bp.route('/stats', methods=['GET'])
def get_tracking_stats():
    try:
        # Get all tracking history
        history = TrackingHistory.query.all()
        
        # Calculate statistics
        total_people = sum(h.person_count for h in history)
        total_animals = sum(h.animal_count for h in history)
        total_videos = ProcessedVideo.query.count()
        
        # Get historical data for charts (last 10 videos)
        recent_history = TrackingHistory.query.order_by(TrackingHistory.timestamp.desc()).limit(10).all()
        
        chart_data = []
        for item in reversed(recent_history):  # Reverse to show chronologically
            video = ProcessedVideo.query.filter_by(video_id=item.video_id).first()
            chart_data.append({
                'timestamp': item.timestamp.isoformat(),
                'video_id': item.video_id,
                'video_name': video.filename if video else "Unknown",
                'person_count': item.person_count,
                'animal_count': item.animal_count
            })
        
        return jsonify({
            'total_videos_processed': total_videos,
            'total_people_tracked': total_people,
            'total_animals_tracked': total_animals,
            'chart_data': chart_data
        })
    except Exception as e:
        logger.error(f"Error getting tracking stats: {str(e)}")
        return jsonify({
            'error': f'Error retrieving tracking stats: {str(e)}'
        }), 500

@tracking_bp.route('/detection-history', methods=['GET'])
def get_detection_history():
    try:
        # Get all videos with detections
        videos = ProcessedVideo.query.filter(ProcessedVideo.has_tracking_data == True).all()
        
        # Format result
        result = []
        for video in videos:
            result.append({
                'video_id': video.video_id,
                'video_name': video.filename,
                'person_count': video.person_count,
                'animal_count': video.animal_count,
                'processed_at': video.processed_at.isoformat() if video.processed_at else None,
                'duration': video.duration,
                'resolution': video.resolution,
                'total_frames': video.total_frames
            })
            
        return jsonify({
            'detections': result,
            'count': len(result)
        })
    except Exception as e:
        logger.error(f"Error getting detection history: {str(e)}")
        return jsonify({
            'detections': [],
            'error': str(e)
        }), 500