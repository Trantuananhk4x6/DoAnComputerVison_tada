import os
from app import create_app

# Tạo app từ cấu hình phù hợp với môi trường
app = create_app()

if __name__ == '__main__':
    print("Starting application server...")
    app.run(host='0.0.0.0', port=5000, debug=False)