from flask_socketio import SocketIO, emit
import logging

logger = logging.getLogger(__name__)
socketio = SocketIO()

def init_socketio(app):
    """Initialize Socket.IO with the Flask app"""
    try:
        socketio.init_app(app, cors_allowed_origins="*")
        logger.info("Socket.IO initialized successfully")
        
        # Register socket event handlers
        @socketio.on('connect')
        def handle_connect():
            logger.info('Client connected')
            emit('server_response', {'data': 'Connected'})
            
        @socketio.on('disconnect')
        def handle_disconnect():
            logger.info('Client disconnected')
        
        # Handle video processing progress updates
        @socketio.on('processing_progress')
        def handle_processing_progress(data):
            # Broadcast progress to all clients
            emit('processing_progress', data, broadcast=True)
    
    except Exception as e:
        logger.error(f"Error initializing Socket.IO: {str(e)}")