#!/bin/bash

# This script initializes the database

echo "Setting up the database..."

# Run the database initialization script
python app/init_db.py

echo "Database setup completed!"