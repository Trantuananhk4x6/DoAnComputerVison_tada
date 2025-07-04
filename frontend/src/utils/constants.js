// API endpoints for the application
export const API_ENDPOINTS = {
    // Video endpoints
    UPLOAD_VIDEO: '/api/videos/upload',
    PROCESSED_VIDEOS: '/api/videos/processed',
    STREAM_VIDEO: (videoId) => `/api/videos/stream/${videoId}`,
    THUMBNAIL: (videoId) => `/api/videos/thumbnail/${videoId}`,
    DELETE_VIDEO: '/api/videos/delete',
    
    // Tracking endpoints
    TRACKING_VIDEO: '/api/tracking/video',
    TRACKING_HISTORY: '/api/tracking/history',
    TRACKING_STATS: '/api/tracking/stats',
    TRACKING_DETECTIONS: '/api/tracking/detections',
    
    // Dashboard
    DASHBOARD_STATS: '/api/dashboard/stats',
    
    // Status
    SERVER_STATUS: '/api/status'
  };