from flask import Blueprint, request, jsonify, current_app, send_file
import os
import time
import uuid
from werkzeug.utils import secure_filename

# Định nghĩa api_bp - PHẢI CÓ DÒNG NÀY
api_bp = Blueprint('api', __name__, url_prefix='/api')

# Route đơn giản để test
@api_bp.route('/test')
def test():
    return jsonify({'message': 'API is working!'})

# Thêm các route khác sau khi test thành công