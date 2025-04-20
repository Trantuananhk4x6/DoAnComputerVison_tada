from app import create_app, socketio
from app.utils.database import initialize_database, setup_mssql_db
from app import db
import os

app = create_app()

if __name__ == '__main__':
    # Check if we need to initialize DB
    if os.environ.get('INIT_DB', 'false').lower() == 'true':
        setup_mssql_db()
        with app.app_context():
            initialize_database(app, db)
    
    # Determine host and port
    host = os.environ.get('HOST', '0.0.0.0')
    port = int(os.environ.get('PORT', '5000'))
    
    # Run the app
    print(f"Starting application on {host}:{port}")
    socketio.run(app, host=host, port=port, debug=True)