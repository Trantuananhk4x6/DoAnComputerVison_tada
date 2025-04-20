
import React, { useState, useEffect, useRef } from 'react';
import { Grid, Paper, Typography, Button, Box, CircularProgress, Switch, FormControlLabel, Select, MenuItem, FormControl, InputLabel, Divider } from '@mui/material';
import { styled } from '@mui/material/styles';
import VideocamIcon from '@mui/icons-material/Videocam';
import StopIcon from '@mui/icons-material/Stop';
import SettingsIcon from '@mui/icons-material/Settings';
import { toast } from 'react-toastify';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  borderRadius: theme.spacing(2),
  overflow: 'hidden',
}));

const VideoDisplay = styled(Box)(({ theme }) => ({
  width: '100%',
  height: '100%',
  backgroundColor: theme.palette.grey[900],
  borderRadius: theme.spacing(1),
  overflow: 'hidden',
  position: 'relative',
  minHeight: 400,
}));

const CameraImage = styled('img')(({ theme }) => ({
  width: '100%',
  height: '100%',
  objectFit: 'contain',
}));

const StatBox = styled(Box)(({ theme, bgcolor }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(2),
  borderRadius: theme.spacing(1),
  backgroundColor: bgcolor,
  color: 'white',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  margin: theme.spacing(1, 0),
}));

const StatValue = styled(Typography)(({ theme }) => ({
  fontWeight: 'bold',
  marginLeft: 'auto',
}));

export default function LiveDetection({ socket }) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [detectionStats, setDetectionStats] = useState({
    animals: 0,
    people: 0,
    lastDetection: null
  });
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(0);
  const [autoReconnect, setAutoReconnect] = useState(true);
  const frameRef = useRef(null);
  const connectionRetryCount = useRef(0);

  useEffect(() => {
    // Get available cameras
    const getCameras = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setAvailableCameras(videoDevices);
      } catch (err) {
        console.error('Error enumerating devices:', err);
        toast.error('Could not access camera devices');
      }
    };
    
    getCameras();

    return () => {
      // Stop streaming if component unmounts
      if (isStreaming) {
        stopCamera();
      }
    };
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('camera_frame', (data) => {
        if (frameRef.current) {
          frameRef.current.src = `data:image/jpeg;base64,${data.image}`;
          
          // Update detection stats based on the frame (this is a simplistic approach)
          // In a real app, you'd get this data from the WebSocket as well
          const now = new Date();
          setDetectionStats(prev => ({
            ...prev,
            lastDetection: now.toLocaleTimeString()
          }));
        }
      });

      socket.on('camera_error', (data) => {
        toast.error(`Camera error: ${data.error}`);
        setIsStreaming(false);
        setIsConnecting(false);
        
        // Try to reconnect if auto reconnect is enabled
        if (autoReconnect && connectionRetryCount.current < 3) {
          connectionRetryCount.current += 1;
          toast.info('Attempting to reconnect to camera...');
          setTimeout(() => {
            startCamera();
          }, 2000);
        }
      });

      socket.on('animal_detected', (data) => {
        setDetectionStats(prev => ({
          ...prev,
          animals: prev.animals + 1,
          lastDetection: new Date().toLocaleTimeString()
        }));
      });

      return () => {
        socket.off('camera_frame');
        socket.off('camera_error');
        socket.off('animal_detected');
      };
    }
  }, [socket, autoReconnect]);

  const startCamera = () => {
    setIsConnecting(true);
    
    // Emit event to start camera stream
    socket.emit('start_camera', { camera_id: selectedCamera });
    
    // Set timeout to prevent UI hanging if connection fails
    setTimeout(() => {
      if (isConnecting) {
        setIsConnecting(false);
        toast.error('Connection to camera timed out');
      }
    }, 10000);
    
    setIsStreaming(true);
    connectionRetryCount.current = 0;
  };

  const stopCamera = () => {
    socket.emit('stop_camera');
    setIsStreaming(false);
    setIsConnecting(false);
  };

  return (
    <Grid container spacing={3}>
      {/* Header */}
      <Grid item xs={12}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#3f51b5' }}>
          Live Detection
        </Typography>
        <Typography variant="body1" gutterBottom sx={{ color: 'text.secondary' }}>
          Real-time detection of animals and people using your camera.
        </Typography>
      </Grid>

      {/* Video Feed */}
      <Grid item xs={12} md={8}>
        <StyledPaper sx={{ height: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Camera Feed</Typography>
            <Box>
              {!isStreaming ? (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<VideocamIcon />}
                  onClick={startCamera}
                  disabled={isConnecting}
                  sx={{ borderRadius: 2 }}
                >
                  {isConnecting ? 'Connecting...' : 'Start Camera'}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<StopIcon />}
                  onClick={stopCamera}
                  sx={{ borderRadius: 2 }}
                >
                  Stop Camera
                </Button>
              )}
            </Box>
          </Box>
          
          <VideoDisplay>
            {isConnecting ? (
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100%' 
              }}>
                <CircularProgress />
              </Box>
            ) : isStreaming ? (
              <CameraImage ref={frameRef} alt="Live camera feed" />
            ) : (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column',
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100%',
                color: 'white'
              }}>
                <VideocamIcon sx={{ fontSize: 60, mb: 2, opacity: 0.7 }} />
                <Typography variant="body1" sx={{ opacity: 0.7 }}>
                  Click "Start Camera" to begin detection
                </Typography>
              </Box>
            )}
          </VideoDisplay>
        </StyledPaper>
      </Grid>
      
      {/* Controls and Stats */}
      <Grid item xs={12} md={4}>
        <StyledPaper sx={{ height: '100%' }}>
          <Typography variant="h6" gutterBottom>
            Settings & Statistics
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Camera Settings
            </Typography>
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="camera-select-label">Camera Source</InputLabel>
              <Select
                labelId="camera-select-label"
                value={selectedCamera}
                label="Camera Source"
                onChange={(e) => setSelectedCamera(e.target.value)}
                disabled={isStreaming}
              >
                {availableCameras.length > 0 ? (
                  availableCameras.map((camera, index) => (
                    <MenuItem key={camera.deviceId} value={index}>
                      {camera.label || `Camera ${index + 1}`}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem value={0}>Default Camera</MenuItem>
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
            />
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="subtitle2" gutterBottom>
            Detection Statistics
          </Typography>
          
          <StatBox bgcolor="#ff9800">
            <Typography variant="body1">Animals Detected</Typography>
            <StatValue variant="h6">{detectionStats.animals}</StatValue>
          </StatBox>
          
          <StatBox bgcolor="#f50057">
            <Typography variant="body1">People Detected</Typography>
            <StatValue variant="h6">{detectionStats.people}</StatValue>
          </StatBox>
          
          <StatBox bgcolor="#3f51b5">
            <Typography variant="body1">Last Detection</Typography>
            <StatValue variant="body2">
              {detectionStats.lastDetection || 'None'}
            </StatValue>
          </StatBox>
          
          <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(0, 0, 0, 0.05)', borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Note:</strong> Animal detections are automatically saved to the database and will appear in the Detection History page.
            </Typography>
          </Box>
        </StyledPaper>
      </Grid>
    </Grid>
  );
}