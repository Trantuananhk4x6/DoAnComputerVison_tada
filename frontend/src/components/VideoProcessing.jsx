import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
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
  Typography,
  Tabs,
  Tab,
  Snackbar,
  useTheme,
  useMediaQuery,
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
  Dashboard as DashboardIcon,
} from '@mui/icons-material';

import TrackingVisualizer from './TrackingVisualizer';
import TrackingDataTable from './TrackingDataTable';
import { API_ENDPOINTS } from '../utils/constants';
import { formatFileSize, formatDate } from '../utils/formatters';

// Custom styled components
const VisuallyHiddenInput = ({ id, onChange, accept }) => (
  <input
    id={id}
    type="file"
    onChange={onChange}
    accept={accept}
    style={{
      clip: 'rect(0 0 0 0)',
      clipPath: 'inset(50%)',
      height: 1,
      overflow: 'hidden',
      position: 'absolute',
      bottom: 0,
      left: 0,
      whiteSpace: 'nowrap',
      width: 1,
    }}
  />
);

const VideoProcessing = () => {
  // Theme setup for responsive design
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  // State variables
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [processedVideos, setProcessedVideos] = useState([]);
  const [viewingVideo, setViewingVideo] = useState(null);
  const [trackingData, setTrackingData] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState(null);
  const [alertMessage, setAlertMessage] = useState(null);
  const [alertType, setAlertType] = useState('info');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingTracking, setLoadingTracking] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const fileInputRef = useRef(null);

  // Animation variants
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        type: 'spring',
        stiffness: 100,
        damping: 15 
      }
    },
    hover: {
      y: -10,
      boxShadow: '0px 10px 20px rgba(0,0,0,0.2)',
      transition: { 
        type: 'spring',
        stiffness: 400,
        damping: 10 
      }
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  // Fetch videos on component mount
  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      setIsLoading(true);
      
      const response = await axios.get(API_ENDPOINTS.PROCESSED_VIDEOS);
      console.log('API response:', response.data);
      
      if (response.data && Array.isArray(response.data.videos)) {
        setProcessedVideos(response.data.videos);
      } else {
        setProcessedVideos([]);
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
      showAlert(`Lỗi tải danh sách video: ${error.response?.data?.error || error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTrackingData = async (videoId) => {
    try {
      setLoadingTracking(true);
      
      const response = await axios.get(`${API_ENDPOINTS.TRACKING_VIDEO}/${videoId}`);
      setTrackingData(response.data);
    } catch (error) {
      console.error('Error fetching tracking data:', error);
      showAlert(`Không thể tải dữ liệu tracking: ${error.response?.data?.error || error.message}`, 'warning');
      setTrackingData(null);
    } finally {
      setLoadingTracking(false);
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Check file size (100MB limit)
      if (file.size > 100 * 1024 * 1024) {
        showAlert('File quá lớn. Giới hạn 100MB', 'error');
        event.target.value = '';
        return;
      }
      
      // Check file type
      if (!file.type.startsWith('video/')) {
        showAlert('Vui lòng chọn file video', 'error');
        event.target.value = '';
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      showAlert('Vui lòng chọn file video', 'warning');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('video', selectedFile);

    try {
      const uploadResponse = await axios.post(API_ENDPOINTS.UPLOAD_VIDEO, formData, {
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
      
      // Reset state
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      showAlert(
        `Video đã được tải lên và xử lý thành công! Đã phát hiện ${uploadResponse.data.person_count || 0} người và ${uploadResponse.data.animal_count || 0} động vật.`,
        'success'
      );
      
      // Refresh video list
      fetchVideos();
      
    } catch (error) {
      console.error('Upload error:', error);
      showAlert(`Lỗi khi tải lên: ${error.response?.data?.error || error.message}`, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteVideo = async (video) => {
    try {
      // Lấy ID từ video
      const videoId = video.id || video.video_id;
      
      if (!videoId) {
        showAlert('Không thể xác định ID của video', 'error');
        return;
      }
      
      await axios.delete(`${API_ENDPOINTS.DELETE_VIDEO}/${videoId}`);
      
      showAlert('Video đã được xóa thành công', 'success');
      
      // Nếu đang xem video này thì đóng dialog
      if (viewingVideo && (viewingVideo.id === video.id)) {
        setViewingVideo(null);
        setTrackingData(null);
      }
      
      // Refresh video list
      fetchVideos();
      
    } catch (error) {
      console.error('Delete error:', error);
      showAlert(`Lỗi khi xóa video: ${error.response?.data?.error || error.message}`, 'error');
    } finally {
      setOpenDeleteDialog(false);
      setVideoToDelete(null);
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

  const confirmDelete = (video) => {
    setVideoToDelete(video);
    setOpenDeleteDialog(true);
  };

  
const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Display alert message
  const showAlert = (message, type = 'info') => {
    setAlertMessage(message);
    setAlertType(type);
    
    // Auto hide after 6 seconds
    setTimeout(() => {
      setAlertMessage(null);
    }, 6000);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Typography variant="h4" component="h1" gutterBottom>
          Xử Lý Video
        </Typography>
      </motion.div>

      {/* Upload section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <Paper 
          elevation={3} 
          sx={{ 
            p: 3, 
            mb: 4, 
            borderRadius: 2,
            backgroundColor: theme.palette.background.paper,
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
          }}
        >
          <Typography variant="h6" component="h2" gutterBottom>
            Upload Video Mới
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Button
                component="label"
                variant="contained"
                startIcon={<CloudUploadIcon />}
                fullWidth
                size="large"
                sx={{ 
                  py: 1.5,
                  background: isUploading ? theme.palette.grey[400] : theme.palette.primary.main,
                  transition: 'all 0.3s ease',
                  '&:hover': { 
                    transform: isUploading ? 'none' : 'translateY(-2px)',
                    boxShadow: isUploading ? 'none' : '0 6px 12px rgba(0,0,0,0.2)'
                  }
                }}
                disabled={isUploading}
                htmlFor="upload-video"
              >
                CHỌN VIDEO
              </Button>
              <VisuallyHiddenInput
                id="upload-video"
                onChange={handleFileChange}
                accept="video/*"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button
                variant="contained"
                color="secondary"
                fullWidth
                size="large"
                sx={{ 
                  py: 1.5,
                  background: !selectedFile || isUploading ? theme.palette.grey[400] : theme.palette.secondary.main,
                  transition: 'all 0.3s ease',
                  '&:hover': { 
                    transform: !selectedFile || isUploading ? 'none' : 'translateY(-2px)',
                    boxShadow: !selectedFile || isUploading ? 'none' : '0 6px 12px rgba(0,0,0,0.2)'
                  }
                }}
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
              >
                {isUploading 
                  ? <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CircularProgress size={20} sx={{ mr: 1, color: 'white' }} />
                      ĐANG TẢI LÊN... {uploadProgress}%
                    </Box>
                  : 'XỬ LÝ VIDEO VỚI YOLO + TRACKING'}
              </Button>
            </Grid>

            {selectedFile && (
              <Grid item xs={12}>
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Paper sx={{ p: 2, bgcolor: 'rgba(0, 0, 0, 0.03)', borderRadius: 1 }}>
                    <Typography variant="body2">
                      <strong>Đã chọn:</strong> {selectedFile.name}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Kích thước:</strong> {formatFileSize(selectedFile.size)}
                    </Typography>
                  </Paper>
                </motion.div>
              </Grid>
            )}

            {isUploading && (
              <Grid item xs={12}>
                <Box sx={{ width: '100%', mt: 1 }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ duration: 0.3 }}
                  >
                    <LinearProgress 
                      variant="determinate" 
                      value={uploadProgress} 
                      color="secondary"
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </motion.div>
                </Box>
              </Grid>
            )}
          </Grid>
        </Paper>
      </motion.div>

      {/* Alert message */}
      <AnimatePresence>
        {alertMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Alert 
              severity={alertType} 
              sx={{ 
                mb: 3,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                borderRadius: 2
              }}
              onClose={() => setAlertMessage(null)}
            >
              {alertMessage}
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Processed videos section */}
      <Box 
        sx={{ 
          mb: 3, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}
      >
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Typography variant="h5" component="h2" sx={{ display: 'flex', alignItems: 'center' }}>
            <TimelineIcon sx={{ mr: 1 }} />
            Video Đã Xử Lý
          </Typography>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Button
            startIcon={<RefreshIcon />}
            onClick={fetchVideos}
            disabled={isLoading}
            sx={{ transition: 'all 0.3s ease' }}
            color="primary"
            variant="outlined"
          >
            LÀM MỚI
          </Button>
        </motion.div>
      </Box>

      {/* Videos grid */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
          <CircularProgress size={60} thickness={4} color="secondary" />
          <Typography variant="h6" sx={{ ml: 2 }}>Đang tải...</Typography>
        </Box>
      ) : processedVideos.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Paper sx={{ 
            p: 6, 
            textAlign: 'center', 
            borderRadius: 2,
            backgroundColor: 'rgba(0, 0, 0, 0.02)',
            border: '2px dashed rgba(0, 0, 0, 0.1)'
          }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Chưa có video nào được xử lý
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Hãy tải lên video để bắt đầu phân tích với YOLOv8 và DeepSORT tracking
            </Typography>
          </Paper>
        </motion.div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <Grid container spacing={3}>
            {processedVideos.map((video, index) => (
              <Grid item xs={12} sm={6} md={4} key={video.id || index}>
                <motion.div
                  variants={cardVariants}
                  whileHover="hover"
                >
                  <Card sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    borderRadius: 2,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}>
                    <CardMedia
                      component="div"
                      sx={{
                        height: 200,
                        position: 'relative',
                        backgroundColor: '#eee',
                        overflow: 'hidden'
                      }}
                      image={video.thumbnail || '/static/video-placeholder.jpg'}
                    >
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          bottom: 0,
                          left: 0,
                          right: 0,
                          bgcolor: 'rgba(0,0,0,0.3)',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          opacity: 0,
                          transition: 'opacity 0.3s ease',
                          '&:hover': {
                            opacity: 1,
                            cursor: 'pointer',
                          }
                        }}
                        onClick={() => handleViewVideo(video)}
                      >
                        <IconButton
                          sx={{
                            bgcolor: 'rgba(255,255,255,0.9)',
                            '&:hover': { 
                              bgcolor: 'rgba(255,255,255,1)',
                              transform: 'scale(1.1)'
                            },
                            transition: 'all 0.3s ease',
                          }}
                          size="large"
                        >
                          <PlayArrowIcon fontSize="large" />
                        </IconButton>
                      </Box>
                      
                      {/* Duration badge if available */}
                      {video.duration && (
                        <Box
                          sx={{
                            position: 'absolute',
                            bottom: 8,
                            right: 8,
                            bgcolor: 'rgba(0,0,0,0.7)',
                            color: 'white',
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            fontSize: '0.8rem'
                          }}
                        >
                          {formatDuration(video.duration)}
                        </Box>
                      )}
                      
                      {/* Resolution badge if available */}
                      {video.resolution && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            bgcolor: 'rgba(0,0,0,0.7)',
                            color: 'white',
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            fontSize: '0.75rem'
                          }}
                        >
                          {video.resolution}
                        </Box>
                      )}
                    </CardMedia>
                    <CardContent sx={{ flexGrow: 1, p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Typography 
                          variant="h6" 
                          component="h3" 
                          noWrap 
                          sx={{ 
                            flexGrow: 1, 
                            fontWeight: 500,
                            fontSize: '1.1rem'
                          }}
                        >
                          {video.name || video.filename}
                        </Typography>
                        {video.has_tracking_data && (
                          <TimelineIcon 
                            color="primary" 
                            fontSize="small" 
                            sx={{ ml: 1 }}
                            titleAccess="Contains tracking data"
                          />
                        )}
                      </Box>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                          <PeopleIcon fontSize="small" sx={{ mr: 0.5 }} />
                          {video.person_count || 0} người
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                          <PetsIcon fontSize="small" sx={{ mr: 0.5 }} />
                          {video.animal_count || 0} động vật
                        </Typography>
                      </Box>
                      
                      <Typography variant="caption" color="text.secondary" display="block">
                        {formatDate(video.processed_at || video.created)}
                      </Typography>
                    </CardContent>
                    <Divider />
                    <Box sx={{ p: 1, display: 'flex', justifyContent: 'space-between' }}>
                      <Button
                        size="small"
                        startIcon={<PlayArrowIcon />}
                        onClick={() => handleViewVideo(video)}
                        sx={{ 
                          transition: 'all 0.2s ease',
                          '&:hover': { transform: 'translateY(-2px)' }
                        }}
                      >
                        Xem
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => confirmDelete(video)}
                        sx={{ 
                          transition: 'all 0.2s ease',
                          '&:hover': { transform: 'translateY(-2px)' }
                        }}
                      >
                        Xóa
                      </Button>
                    </Box>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </motion.div>
      )}

      {/* Video viewer dialog */}
      <Dialog
        open={!!viewingVideo}
        onClose={() => setViewingVideo(null)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          elevation: 24,
          sx: { borderRadius: 2, overflow: 'hidden' }
        }}
        TransitionProps={{
          component: motion.div,
          initial: { opacity: 0, y: 50, scale: 0.9 },
          animate: { opacity: 1, y: 0, scale: 1 },
          exit: { opacity: 0, scale: 0.9 },
          transition: { duration: 0.3 }
        }}
      >
        {viewingVideo && (
          <>
            <DialogTitle sx={{ 
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.9)' : 'rgba(0,0,0,0.05)',
              borderBottom: `1px solid ${theme.palette.divider}` 
            }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6" sx={{ mr: 2 }} noWrap>
                  {viewingVideo.name || viewingVideo.filename}
                </Typography>
                <IconButton onClick={() => setViewingVideo(null)} size="small">
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent sx={{ px: { xs: 1, sm: 3 }, pt: 3, pb: { xs: 1, sm: 2 } }}>
              <Box sx={{ mb: 2 }}>
                <Tabs 
                  value={tabValue} 
                  onChange={handleTabChange}
                  indicatorColor="primary"
                  textColor="primary"
                  variant={isMobile ? "fullWidth" : "standard"}
                  sx={{ 
                    borderBottom: 1, 
                    borderColor: 'divider',
                    mb: 2
                  }}
                >
                  <Tab 
                    label="Video" 
                    icon={<PlayArrowIcon />} 
                    iconPosition="start"
                  />
                  {viewingVideo.has_tracking_data && (
                    <Tab 
                      label="Tracking Data" 
                      icon={<TimelineIcon />}
                      iconPosition="start"
                    />
                  )}
                </Tabs>
              </Box>
              
              {tabValue === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <Box sx={{ position: 'relative', width: '100%', mb: 3 }}>
                    <video
                      controls
                      width="100%"
                      autoPlay
                      src={viewingVideo.url}
                      style={{ borderRadius: '8px', maxHeight: '70vh' }}
                    />
                  </Box>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Paper sx={{ 
                        p: 2, 
                        bgcolor: 'rgba(25, 118, 210, 0.08)',
                        borderRadius: 2,
                        border: '1px solid rgba(25, 118, 210, 0.2)'
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <PeopleIcon color="primary" sx={{ mr: 1, fontSize: 28 }} />
                          <Typography variant="h6">
                            <strong>{viewingVideo.person_count || 0}</strong> người được phát hiện
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Paper sx={{ 
                        p: 2, 
                        bgcolor: 'rgba(156, 39, 176, 0.08)',
                        borderRadius: 2,
                        border: '1px solid rgba(156, 39, 176, 0.2)'
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <PetsIcon color="secondary" sx={{ mr: 1, fontSize: 28 }} />
                          <Typography variant="h6">
                            <strong>{viewingVideo.animal_count || 0}</strong> động vật được phát hiện
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid>
                  </Grid>
                  
                  <Box sx={{ mt: 3 }}>
                    <Grid container spacing={2}>
                      {viewingVideo.resolution && (
                        <Grid item xs={6} sm={3}>
                          <Typography variant="body2" color="text.secondary">
                            <strong>Độ phân giải:</strong> {viewingVideo.resolution}
                          </Typography>
                        </Grid>
                      )}
                      {viewingVideo.duration && (
                        <Grid item xs={6} sm={3}>
                          <Typography variant="body2" color="text.secondary">
                            <strong>Thời lượng:</strong> {formatDuration(viewingVideo.duration)}
                          </Typography>
                        </Grid>
                      )}
                      {viewingVideo.size && (
                        <Grid item xs={6} sm={3}>
                          <Typography variant="body2" color="text.secondary">
                            <strong>Kích thước:</strong> {formatFileSize(viewingVideo.size)}
                          </Typography>
                        </Grid>
                      )}
                      <Grid item xs={6} sm={3}>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Thời gian xử lý:</strong> {formatDate(viewingVideo.processed_at || viewingVideo.created)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                </motion.div>
              )}
              
              {tabValue === 1 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  {loadingTracking ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : trackingData ? (
                    <>
                      <Box sx={{ mb: 4 }}>
                        <Paper sx={{ p: 3, borderRadius: 2, bgcolor: 'rgba(0,0,0,0.02)' }}>
                          <Typography variant="h6" gutterBottom>
                            Thông tin Tracking
                          </Typography>
                          <Grid container spacing={3}>
                            <Grid item xs={12} sm={6} md={3}>
                              <Box sx={{ textAlign: 'center', p: 1 }}>
                                <Typography color="text.secondary" variant="subtitle2">
                                  Tổng số người:
                                </Typography>
                                <Typography variant="h4" color="primary" sx={{ fontWeight: 'bold' }}>
                                  {trackingData.person_count || 0}
                                </Typography>
                              </Box>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                              <Box sx={{ textAlign: 'center', p: 1 }}>
                                <Typography color="text.secondary" variant="subtitle2">
                                  Tổng số động vật:
                                </Typography>
                                <Typography variant="h4" color="secondary" sx={{ fontWeight: 'bold' }}>
                                  {trackingData.animal_count || 0}
                                </Typography>
                              </Box>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                              <Box sx={{ textAlign: 'center', p: 1 }}>
                                <Typography color="text.secondary" variant="subtitle2">
                                  Số track:
                                </Typography>
                                <Typography variant="h4" color="info.main" sx={{ fontWeight: 'bold' }}>
                                  {trackingData.tracks ? Object.keys(trackingData.tracks).length : 0}
                                </Typography>
                              </Box>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                              <Box sx={{ textAlign: 'center', p: 1 }}>
                                <Typography color="text.secondary" variant="subtitle2">
                                  Tổng số frame:
                                </Typography>
                                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                                  {trackingData.total_frames || '-'}
                                </Typography>
                              </Box>
                            </Grid>
                          </Grid>
                        </Paper>
                      </Box>
                      
                      <TrackingVisualizer 
                        tracks={trackingData.tracks} 
                        totalFrames={trackingData.total_frames}
                      />
                      
                      <TrackingDataTable 
                        tracks={trackingData.tracks}
                        totalFrames={trackingData.total_frames}
                      />
                    </>
                  ) : (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      Không có dữ liệu tracking cho video này. Video cần được upload và xử lý với YOLOv8 + DeepSORT.
                    </Alert>
                  )}
                </motion.div>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
              <Button 
                onClick={() => setViewingVideo(null)}
                variant="outlined"
              >
                Đóng
              </Button>
              <Button 
                color="error" 
                variant="contained"
                startIcon={<DeleteIcon />}
                onClick={() => {
                  setViewingVideo(null);
                  confirmDelete(viewingVideo);
                }}
                sx={{ 
                  transition: 'all 0.2s ease',
                  '&:hover': { transform: 'translateY(-2px)' }
                }}
              >
                Xóa Video
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle>Xác nhận xóa</DialogTitle>
        <DialogContent>
          <Typography>
            Bạn có chắc chắn muốn xóa video "{videoToDelete?.name || videoToDelete?.filename}"?
            <br />
            <strong>Lưu ý:</strong> Hành động này sẽ xóa video và tất cả dữ liệu tracking liên quan.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setOpenDeleteDialog(false)}
            variant="outlined"
          >
            Hủy
          </Button>
          <Button 
            onClick={() => handleDeleteVideo(videoToDelete)} 
            color="error" 
            variant="contained"
            startIcon={<DeleteIcon />}
          >
            Xóa
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar notifications */}
      <Snackbar
        open={!!alertMessage}
        autoHideDuration={6000}
        onClose={() => setAlertMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ mb: 2 }}
      >
        <Alert
          onClose={() => setAlertMessage(null)}
          severity={alertType}
          variant="filled"
          elevation={6}
          sx={{ width: '100%' }}
        >
          {alertMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

// Helper function to format duration
function formatDuration(seconds) {
  if (!seconds) return '--:--';
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default VideoProcessing;