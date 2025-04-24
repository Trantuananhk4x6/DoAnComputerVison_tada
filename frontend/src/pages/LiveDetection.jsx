import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Typography, Paper, Select, MenuItem, FormControl, InputLabel, Switch, FormControlLabel, Alert } from '@mui/material';
import io from 'socket.io-client';

const LiveDetection = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [cameraId, setCameraId] = useState(0);
  const [autoReconnect, setAutoReconnect] = useState(true);
  const [error, setError] = useState(null);
  const [availableCameras, setAvailableCameras] = useState([]);
  const [status, setStatus] = useState('disconnected');
  const [reconnecting, setReconnecting] = useState(false);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const socketRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  
  // Lấy danh sách camera khả dụng khi component load
  useEffect(() => {
    fetch('/api/available-cameras')
      .then(response => response.json())
      .then(data => {
        if (data.cameras && data.cameras.length > 0) {
          setAvailableCameras(data.cameras);
        } else {
          console.log('No cameras found');
        }
      })
      .catch(err => {
        console.error('Error fetching cameras:', err);
      });
  }, []);

  // Khởi tạo Socket.IO
  useEffect(() => {
    socketRef.current = io();
    
    // Xử lý nhận frame
    socketRef.current.on('camera_frame', (data) => {
      const ctx = canvasRef.current.getContext('2d');
      const img = new Image();
      img.onload = () => {
        canvasRef.current.width = img.width;
        canvasRef.current.height = img.height;
        ctx.drawImage(img, 0, 0);
      };
      img.src = 'data:image/jpeg;base64,' + data.image;
      setStatus('streaming');
      setError(null);
    });
    
    // Xử lý trạng thái camera
    socketRef.current.on('camera_status', (data) => {
      console.log('Camera status:', data);
      setStatus(data.status);
      
      if (data.status === 'connected') {
        setError(null);
        setReconnecting(false);
      }
    });
    
    // Xử lý lỗi camera
    socketRef.current.on('camera_error', (data) => {
      console.error('Camera error:', data.error);
      setError(data.error);
      setStatus('error');
      
      // Auto reconnect logic
      if (autoReconnect && !reconnecting) {
        setReconnecting(true);
        console.log('Attempting to reconnect...');
        
        // Clear any existing reconnect timer
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
        }
        
        // Try to reconnect after 3 seconds
        reconnectTimerRef.current = setTimeout(() => {
          if (isStreaming) {
            console.log('Auto-reconnecting...');
            stopCamera();
            setTimeout(() => {
              startCamera();
            }, 1000);
          }
        }, 3000);
      }
    });
    
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [autoReconnect, isStreaming]);
  
  // Bắt đầu stream camera
  const startCamera = () => {
    if (!socketRef.current) return;
    
    setIsStreaming(true);
    setStatus('connecting');
    setError(null);
    
    console.log(`Starting camera with ID: ${cameraId}`);
    socketRef.current.emit('start_camera', { camera_id: cameraId });
  };
  
  // Dừng stream camera
  const stopCamera = () => {
    if (!socketRef.current) return;
    
    socketRef.current.emit('stop_camera');
    setIsStreaming(false);
    setStatus('disconnected');
    
    // Clear canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };
  
  // Handle camera change
  const handleCameraChange = (event) => {
    setCameraId(event.target.value);
    
    // Restart camera if already streaming
    if (isStreaming) {
      stopCamera();
      setTimeout(() => {
        startCamera();
      }, 500);
    }
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Live Detection
      </Typography>
      <Typography variant="body1" paragraph>
        Real-time detection of animals and people using your camera.
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {reconnecting && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Attempting to reconnect to camera...
        </Alert>
      )}
      
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" gutterBottom>
            Camera Feed
          </Typography>
          <Paper 
            sx={{ 
              p: 1, 
              bgcolor: 'black', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              height: 480, 
              position: 'relative' 
            }}
          >
            <canvas 
              ref={canvasRef} 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '100%', 
                display: status === 'streaming' ? 'block' : 'none' 
              }} 
            />
            
            {status !== 'streaming' && (
              <Box sx={{ 
                position: 'absolute', 
                top: '50%', 
                left: '50%', 
                transform: 'translate(-50%, -50%)', 
                color: 'white', 
                textAlign: 'center' 
              }}>
                {status === 'connecting' ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Box sx={{ 
                      width: 40, 
                      height: 40, 
                      borderRadius: '50%', 
                      border: '3px solid',
                      borderColor: 'primary.main',
                      borderTopColor: 'transparent',
                      animation: 'spin 1s linear infinite',
                      '@keyframes spin': {
                        '0%': { transform: 'rotate(0deg)' },
                        '100%': { transform: 'rotate(360deg)' }
                      }
                    }} />
                    <Typography sx={{ mt: 2 }}>Connecting to camera...</Typography>
                  </Box>
                ) : status === 'error' ? (
                  <Typography color="error">Camera error. Please check settings and try again.</Typography>
                ) : (
                  <Typography>Camera disconnected. Click "Start Camera" to begin.</Typography>
                )}
              </Box>
            )}
            
            <Button 
              variant="contained" 
              color={isStreaming ? "error" : "primary"}
              onClick={isStreaming ? stopCamera : startCamera}
              sx={{ position: 'absolute', bottom: 16, right: 16 }}
            >
              {isStreaming ? 'Stop Camera' : 'Start Camera'}
            </Button>
          </Paper>
        </Box>
        
        <Box sx={{ width: { xs: '100%', md: 300 } }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h5" gutterBottom>
              Settings & Statistics
            </Typography>
            
            <Typography variant="subtitle2" gutterBottom>
              Camera Settings
            </Typography>
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="camera-source-label">Camera Source</InputLabel>
              <Select
                labelId="camera-source-label"
                id="camera-source"
                value={cameraId}
                label="Camera Source"
                onChange={handleCameraChange}
                disabled={isStreaming}
              >
                {availableCameras.length > 0 ? (
                  availableCameras.map(camera => (
                    <MenuItem key={camera.id} value={camera.id}>
                      {camera.name} ({camera.width}x{camera.height})
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem value={0}>Camera 1</MenuItem>
                )}
              </Select>
            </FormControl>
            
            <FormControlLabel
              control={
                <Switch
                  checked={autoReconnect}
                  onChange={(e) => setAutoReconnect(e.target.checked)}
                  color="primary"
                />
              }
              label="Auto reconnect on failure"
              sx={{ mb: 2 }}
            />
            
            <Typography variant="subtitle2" gutterBottom sx={{ mt: 3 }}>
              Detection Statistics
            </Typography>
            
            <Typography variant="body2" color="text.secondary">
              Status: {status.charAt(0).toUpperCase() + status.slice(1)}
            </Typography>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

export default LiveDetection;