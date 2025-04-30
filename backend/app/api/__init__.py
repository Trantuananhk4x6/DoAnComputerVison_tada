from flask import Blueprint

# Định nghĩa Blueprint chính
api_bp = Blueprint('api', __name__, url_prefix='/api')

# Import các route modules
from app.api.routes import *