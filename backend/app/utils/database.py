"""Database utility functions for initializing the database"""
import pyodbc
import time
from sqlalchemy import text

def wait_for_db(db, max_retries=10, retry_interval=5):
    """Wait for the database to be available"""
    for attempt in range(max_retries):
        try:
            # Try to execute a simple query
            with db.engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            print("Database connection established successfully")
            return True
        except Exception as e:
            print(f"Attempt {attempt+1}/{max_retries}: Database not ready yet. Error: {e}")
            if attempt < max_retries - 1:
                print(f"Retrying in {retry_interval} seconds...")
                time.sleep(retry_interval)
    
    print("Failed to connect to database after maximum retries")
    return False

def initialize_database(app, db):
    """Initialize the database with required tables"""
    with app.app_context():
        # Wait for database to be available
        if not wait_for_db(db):
            print("Could not initialize database")
            return False
        
        try:
            # Create tables
            db.create_all()
            
            # Additional initialization can be done here
            
            print("Database initialized successfully")
            return True
        except Exception as e:
            print(f"Error initializing database: {e}")
            return False

def setup_mssql_db():
    """Setup the SQL Server database connection"""
    try:
        conn = pyodbc.connect(
            "DRIVER={ODBC Driver 17 for SQL Server};"
            "SERVER=localhost;"
            "DATABASE=master;"
            "UID=sa;"
            "PWD=123456789"
        )
        
        cursor = conn.cursor()
        
        # Check if the database exists
        cursor.execute("SELECT name FROM sys.databases WHERE name = 'AnimalDetectionDB'")
        result = cursor.fetchone()
        
        if not result:
            # Create the database if it doesn't exist
            cursor.execute("CREATE DATABASE AnimalDetectionDB")
            print("Database 'AnimalDetectionDB' created successfully")
        else:
            print("Database 'AnimalDetectionDB' already exists")
        
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Error setting up MSSQL database: {e}")
        return False