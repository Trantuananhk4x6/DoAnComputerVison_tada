from flask import Blueprint

# Định nghĩa Blueprint chính
api_bp = Blueprint('api', __name__, url_prefix='/api')

# Import các route modules
from app.api.routes import video_routes, tracking_routes, dashboard_routes

# Đăng ký các Blueprints con
api_bp.register_blueprint(video_routes.video_bp)
api_bp.register_blueprint(tracking_routes.tracking_bp)
api_bp.register_blueprint(dashboard_routes.dashboard_bp)

# Import và đăng ký các route chung
from app.api.routes.common_routes import *