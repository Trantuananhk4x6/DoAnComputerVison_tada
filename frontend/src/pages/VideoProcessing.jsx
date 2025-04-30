import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { styled } from '@mui/material/styles';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Snackbar,
  Typography,
  Tooltip,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayArrowIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  PeopleOutline as PeopleIcon,
  Pets as PetsIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';

// Styled components
const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

const StyledVideoCard = styled(Card)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[8],
  },
}));

const ThumbnailContainer = styled(CardMedia)({
  height: 180,
  position: 'relative',
  backgroundColor: '#f0f0f0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const PlayOverlay = styled(Box)({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(0,0,0,0.2)',
  opacity: 0,
  transition: 'opacity 0.2s ease',
  '&:hover': {
    opacity: 1,
    cursor: 'pointer',
  },
});

// Simple tracking visualization component
const TrackingVisualizer = ({ tracks, totalFrames }) => {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    if (!canvasRef.current || !tracks || Object.keys(tracks).length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw timeline
    ctx.fillStyle = '#eee';
    ctx.fillRect(0, 0, width, height);
    
    // Map frame index to x position
    const frameToX = (frame) => (frame / totalFrames) * width;
    
    // Draw tracks
    Object.entries(tracks).forEach(([trackId, trackData], index) => {
      // Get track info
      const isAnimal = trackData.class && (
        'animal' in trackData.class.toLowerCase() || 
        'dog' in trackData.class.toLowerCase() || 
        'cat' in trackData.class.toLowerCase()
      );
      
      // Determine color (red for people, green for animals)
      ctx.strokeStyle = isAnimal ? 'green' : 'red';
      ctx.lineWidth = 3;
      
      // Draw track line
      const startX = frameToX(trackData.first_frame);
      const endX = frameToX(trackData.last_frame);
      const y = 20 + (index % 10) * 15; // Space tracks vertically
      
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
      
      // Draw track ID
      ctx.font = '10px Arial';
      ctx.fillStyle = isAnimal ? 'green' : 'red';
      ctx.fillText(`ID:${trackId} (${trackData.class})`, startX, y - 5);
    });
    
  }, [tracks, totalFrames]);
  
  return (
    <Box sx={{ width: '100%', mt: 2 }}>
      <Typography variant="subtitle1" gutterBottom>
        Visualization of Tracks Over Time
      </Typography>
      <Paper sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
        <canvas 
          ref={canvasRef}
          width={800}
          height={200}
          style={{ width: '100%', height: 'auto' }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
          <Typography variant="caption">Start</Typography>
          <Typography variant="caption">End</Typography>
        </Box>
      </Paper>
    </Box>
  );
};

const VideoProcessing = () => {
  // State variables
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedVideos, setProcessedVideos] = useState([]);
  const [viewingVideo, setViewingVideo] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info',
  });
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [trackingData, setTrackingData] = useState(null);
  const [loadingTracking, setLoadingTracking] = useState(false);
  const [detections, setDetections] = useState([]);
  const fileInputRef = useRef(null);

  // Fetch processed videos on component mount
  useEffect(() => {
    fetchProcessedVideos();
    fetchDetections();
  }, []);

  // Fetch videos from API
  const fetchProcessedVideos = async () => {
    try {
      setRefreshing(true);
      setErrorMessage(null);
      
      const response = await axios.get('/api/processed-videos');
      console.log("API response:", response.data);
      
      if (response.data && Array.isArray(response.data.videos)) {
        setProcessedVideos(response.data.videos);
      } else {
        setProcessedVideos([]);
      }
      setRefreshing(false);
    } catch (error) {
      console.error('Error fetching processed videos:', error);
      setErrorMessage(
        `Lỗi tải danh sách video: ${error.response?.data?.error || error.message}`
      );
      setProcessedVideos([]);
      setRefreshing(false);
    }
  };

  // Fetch all detections
  const fetchDetections = async () => {
    try {
      const response = await axios.get('/api/detections');
      if (response.data && Array.isArray(response.data.detections)) {
        setDetections(response.data.detections);
      }
    } catch (error) {
      console.error('Error fetching detections:', error);
    }
  };

  // Fetch tracking data for a video
  const fetchTrackingData = async (videoId) => {
    if (!videoId) return;
    
    try {
      setLoadingTracking(true);
      const response = await axios.get(`/api/video/tracking/${videoId}`);
      setTrackingData(response.data);
      setLoadingTracking(false);
    } catch (error) {
      console.error('Error fetching tracking data:', error);
      setTrackingData(null);
      setLoadingTracking(false);
      setSnackbar({
        open: true,
        message: `Không thể tải dữ liệu tracking: ${error.response?.data?.error || error.message}`,
        severity: 'warning',
      });
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Check file size (limit to 100MB)
      if (file.size > 100 * 1024 * 1024) {
        setSnackbar({
          open: true,
          message: 'File quá lớn. Kích thước tối đa là 100MB',
          severity: 'error',
        });
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setSnackbar({
        open: true,
        message: 'Vui lòng chọn file video trước',
        severity: 'warning',
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append('video', selectedFile);

    try {
      // Upload video
      const uploadResponse = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        },
      });

      console.log('Upload response:', uploadResponse.data);
      
      setIsUploading(false);
      setSnackbar({
        open: true,
        message: `Video tải lên thành công. Phát hiện ${uploadResponse.data.person_count || 0} người và ${uploadResponse.data.animal_count || 0} động vật.`,
        severity: 'success',
      });
      
      // Reset selected file
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Refresh the processed videos list
      setTimeout(() => {
        fetchProcessedVideos();
        fetchDetections();
      }, 1000);
      
    } catch (error) {
      console.error('Error uploading video:', error);
      setIsUploading(false);
      
      setErrorMessage(`Lỗi tải lên: ${error.response?.data?.error || error.message}`);
      
      setSnackbar({
        open: true,
        message: `Lỗi tải lên video: ${error.response?.data?.error || error.message}`,
        severity: 'error',
      });
    }
  };

  const handleViewVideo = (video) => {
    setViewingVideo(video);
    setTabValue(0);
    if (video.id && video.has_tracking_data) {
      fetchTrackingData(video.id);
    } else {
      setTrackingData(null);
    }
  };

  const handleCloseViewer = () => {
    setViewingVideo(null);
    setTrackingData(null);
  };

  const confirmDelete = (video) => {
    setVideoToDelete(video);
    setOpenDeleteDialog(true);
  };

  const handleDeleteVideo = async () => {
    if (!videoToDelete) return;
    
    try {
      await axios.delete(`/api/video/delete/${videoToDelete.id}`);
      
      setSnackbar({
        open: true,
        message: 'Đã xóa video thành công',
        severity: 'success',
      });
      
      // Close dialog and clear video to delete
      setOpenDeleteDialog(false);
      setVideoToDelete(null);
      
      // If the deleted video is currently being viewed, close the viewer
      if (viewingVideo && viewingVideo.id === videoToDelete.id) {
        setViewingVideo(null);
      }
      
      // Refresh the list of videos
      fetchProcessedVideos();
      fetchDetections();
      
    } catch (error) {
      console.error('Error deleting video:', error);
      setSnackbar({
        open: true,
        message: `Lỗi khi xóa video: ${error.response?.data?.error || error.message}`,
        severity: 'error',
      });
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleRefresh = () => {
    fetchProcessedVideos();
    fetchDetections();
  };
  
  // Format date for display
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    try {
      // Try to parse as Unix timestamp first
      if (typeof timestamp === 'number') {
        return new Date(timestamp * 1000).toLocaleString();
      }
      // Try to parse as ISO string
      return new Date(timestamp).toLocaleString();
    } catch (e) {
      return 'Unknown';
    }
  };
  
  // Format file size in KB, MB, etc.
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Xử Lý Video
      </Typography>

      {/* Upload section */}
      <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          Upload Video Mới
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6}>
            <Button
              component="label"
              variant="contained"
              startIcon={<CloudUploadIcon />}
              fullWidth
              size="large"
              sx={{ py: 1.5 }}
              color="primary"
              disabled={isUploading || isProcessing}
            >
              CHỌN VIDEO
              <VisuallyHiddenInput
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                ref={fileInputRef}
              />
            </Button>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Button
              variant="contained"
              color="secondary"
              fullWidth
              size="large"
              sx={{ py: 1.5 }}
              onClick={handleUpload}
              disabled={!selectedFile || isUploading || isProcessing}
            >
              {isUploading ? `ĐANG TẢI LÊN... ${uploadProgress}%` : 'XỬ LÝ VIDEO VỚI YOLO + TRACKING'}
            </Button>
          </Grid>
          
          {selectedFile && (
            <Grid item xs={12}>
              <Paper sx={{ p: 2, backgroundColor: '#f9f9f9', borderRadius: 1 }}>
                <Typography variant="body2">
                  <strong>Đã chọn:</strong> {selectedFile.name}
                </Typography>
                <Typography variant="body2">
                  <strong>Kích thước:</strong> {formatFileSize(selectedFile.size)}
                </Typography>
              </Paper>
            </Grid>
          )}
          
          {isUploading && (
            <Grid item xs={12}>
              <Box sx={{ width: '100%', mt: 1 }}>
                <LinearProgress variant="determinate" value={uploadProgress} />
              </Box>
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* Error message if exists */}
      {errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      )}

      {/* Video viewer dialog */}
      <Dialog
        open={!!viewingVideo}
        onClose={handleCloseViewer}
        maxWidth="lg"
        fullWidth
      >
        {viewingVideo && (
          <>
            <DialogTitle>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">{viewingVideo.name || viewingVideo.filename}</Typography>
                <IconButton onClick={handleCloseViewer} size="small">
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 2 }}>
                <Tab label="Video" />
                {viewingVideo.has_tracking_data && <Tab label="Tracking Data" />}
              </Tabs>
              
              {tabValue === 0 && (
                <>
                  <video
                    controls
                    width="100%"
                    autoPlay
                    src={viewingVideo.url}
                    style={{ borderRadius: '4px' }}
                  />
                  
                  <Box sx={{ mt: 2 }}>
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Grid item xs={6}>
                        <Paper sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
                          <PeopleIcon color="primary" sx={{ mr: 1 }} />
                          <Typography><strong>Số người:</strong> {viewingVideo.person_count || 0}</Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={6}>
                        <Paper sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
                          <PetsIcon color="secondary" sx={{ mr: 1 }} />
                          <Typography><strong>Số động vật:</strong> {viewingVideo.animal_count || 0}</Typography>
                        </Paper>
                      </Grid>
                    </Grid>
                    
                    <Typography variant="body2" color="text.secondary">
                      <strong>Kích thước:</strong> {formatFileSize(viewingVideo.size)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Ngày tạo:</strong> {formatDate(viewingVideo.created)}
                    </Typography>
                  </Box>
                </>
              )}
              
              {tabValue === 1 && (
                <Box sx={{ mt: 2 }}>
                  {loadingTracking ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : trackingData ? (
                    <>
                      <Box sx={{ mb: 3 }}>
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                              <Typography variant="subtitle1" gutterBottom>Thông tin Tracking</Typography>
                              <Typography variant="body2">
                                <strong>Tổng số object tracks:</strong> {Object.keys(trackingData.tracks || {}).length}
                              </Typography>
                              <Typography variant="body2">
                                <strong>Số người (unique):</strong> {trackingData.person_count || 0}
                              </Typography>
                              <Typography variant="body2">
                                <strong>Số động vật (unique):</strong> {trackingData.animal_count || 0}
                              </Typography>
                              <Typography variant="body2">
                                <strong>Tổng số frames:</strong> {trackingData.total_frames || 0}
                              </Typography>
                            </Paper>
                          </Grid>
                        </Grid>
                      </Box>
                      
                      <TrackingVisualizer 
                        tracks={trackingData.tracks} 
                        totalFrames={trackingData.total_frames} 
                      />
                      
                      <Paper sx={{ mt: 3 }}>
                        <TableContainer>
                          <Typography variant="subtitle1" sx={{ p: 2 }}>Chi tiết Object Tracking</Typography>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Track ID</TableCell>
                                <TableCell>Loại</TableCell>
                                <TableCell>Frame bắt đầu</TableCell>
                                <TableCell>Frame kết thúc</TableCell>
                                <TableCell>Thời gian xuất hiện</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {trackingData.tracks && Object.entries(trackingData.tracks).map(([trackId, data]) => (
                                <TableRow key={trackId}>
                                  <TableCell>{trackId}</TableCell>
                                  <TableCell>{data.class}</TableCell>
                                  <TableCell>{data.first_frame}</TableCell>
                                  <TableCell>{data.last_frame}</TableCell>
                                  <TableCell>{data.last_frame - data.first_frame + 1} frames</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Paper>
                    </>
                  ) : (
                    <Alert severity="info">
                      Không có dữ liệu tracking cho video này. Video cần được upload và xử lý với YOLOv8 + DeepSORT.
                    </Alert>
                  )}
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseViewer}>
                Đóng
              </Button>
              <Button 
                color="error" 
                variant="contained"
                startIcon={<DeleteIcon />}
                onClick={() => {
                  handleCloseViewer();
                  confirmDelete(viewingVideo);
                }}
              >
                Xóa Video
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Processed videos section */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" component="h2">
          Video Đã Xử Lý
        </Typography>
        <Button
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          disabled={refreshing}
        >
          LÀM MỚI
        </Button>
      </Box>

      {refreshing ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : processedVideos.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
          <Typography variant="body1" color="text.secondary">
            Chưa có video nào được xử lý. Hãy tải lên video để bắt đầu.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {processedVideos.map((video, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <StyledVideoCard>
                <ThumbnailContainer
                  image={video.thumbnail || '/static/video-placeholder.jpg'}
                  title={video.name}
                >
                  <PlayOverlay onClick={() => handleViewVideo(video)}>
                    <IconButton
                      size="large"
                      sx={{
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        '&:hover': { backgroundColor: 'rgba(255, 255, 255, 1)' },
                      }}
                    >
                      <PlayArrowIcon fontSize="large" />
                    </IconButton>
                  </PlayOverlay>
                </ThumbnailContainer>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle1" component="h3" noWrap sx={{ flexGrow: 1, fontWeight: 'medium' }}>
                      {video.name}
                    </Typography>
                    {video.has_tracking_data && (
                      <Tooltip title="Video has tracking data">
                        <TimelineIcon color="primary" fontSize="small" />
                      </Tooltip>
                    )}
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      <PeopleIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                      {video.person_count || 0} người
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <PetsIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                      {video.animal_count || 0} động vật
                    </Typography>
                  </Box>
                  
                  <Typography variant="caption" color="text.secondary" display="block">
                    {formatDate(video.created)}
                  </Typography>
                </CardContent>
                <Divider />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1 }}>
                  <Button
                    size="small"
                    startIcon={<PlayArrowIcon />}
                    onClick={() => handleViewVideo(video)}
                  >
                    Xem
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => confirmDelete(video)}
                  >
                    Xóa
                  </Button>
                </Box>
              </StyledVideoCard>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Delete confirmation dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
      >
        <DialogTitle>Xác nhận xóa</DialogTitle>
        <DialogContent>
          <Typography>
            Bạn có chắc chắn muốn xóa video "{videoToDelete?.name || videoToDelete?.filename}"? Hành động này không thể hoàn tác.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>
            Hủy
          </Button>
          <Button onClick={handleDeleteVideo} color="error" variant="contained">
            Xóa
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default VideoProcessing;