import logging

logger = logging.getLogger(__name__)

def initialize_database(app, db):
    """Initialize the database with required tables"""
    with app.app_context():
        try:
            db.create_all()
            logger.info("Database initialized successfully")
        except Exception as e:
            logger.error(f"Error initializing database: {str(e)}", exc_info=True)