"""Script to initialize the database"""
from app import create_app, db
from app.utils.database import initialize_database, setup_mssql_db
from app.models.detection import AnimalDetection
if __name__ == '__main__':
    # Setup SQL Server database
    setup_mssql_db()
    
    # Initialize application
    app = create_app()
    
    # Initialize database tables
    initialize_database(app, db)