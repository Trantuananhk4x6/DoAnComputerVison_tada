-- Thêm bảng object_tracking nếu chưa có
CREATE TABLE IF NOT EXISTS object_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    object_type TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 1,
    source TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tạo index để truy vấn nhanh
CREATE INDEX IF NOT EXISTS idx_object_tracking_source ON object_tracking(source);
CREATE INDEX IF NOT EXISTS idx_object_tracking_type ON object_tracking(object_type);