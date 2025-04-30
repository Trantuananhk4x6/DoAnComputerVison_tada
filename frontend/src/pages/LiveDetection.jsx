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
  DialogContentText,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Snackbar,
  Typography,
  Tooltip,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayArrowIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  PeopleOutline as PeopleIcon,
  Pets as PetsIcon,
  Folder as FolderIcon,
  GetApp as ImportIcon,
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

const VideoProcessing = () => {
  // State variables
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedVideos, setProcessedVideos] = useState([]);
  const [filesystemVideos, setFilesystemVideos] = useState([]);
  const [viewingVideo, setViewingVideo] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info',
  });
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Fetch processed videos on component mount
  useEffect(() => {
    fetchProcessedVideos();
  }, []);

  // Fetch videos from database
  const fetchProcessedVideos = async () => {
    try {
      setRefreshing(true);
      setError(null);
      
      // Gọi API lấy danh sách video đã xử lý
      const response = await axios.get('/api/processed-videos');
      console.log("Processed videos:", response.data);
      
      if (response.data && response.data.videos) {
        setProcessedVideos(response.data.videos);
      } else {
        setProcessedVideos([]);
      }
      setRefreshing(false);
    } catch (error) {
      console.error('Error fetching processed videos:', error);
      setError(`Không thể tải danh sách video. ${error.response?.data?.error || error.message}`);
      setProcessedVideos([]);
      setRefreshing(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Kiểm tra kích thước file (giới hạn 100MB)
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
    setError(null);

    const formData = new FormData();
    formData.append('video', selectedFile);

    try {
      console.log('Uploading video...');
      
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
      
      // Reset states after successful upload
      setIsUploading(false);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      setSnackbar({
        open: true,
        message: 'Video tải lên thành công và đang được xử lý',
        severity: 'success',
      });
      
      // Cho người dùng thấy là đang xử lý
      setIsProcessing(true);
      
      // Đợi 5 giây, sau đó làm mới danh sách video
      setTimeout(() => {
        fetchProcessedVideos();
        setIsProcessing(false);
      }, 5000);
      
    } catch (error) {
      console.error('Error uploading video:', error);
      setIsUploading(false);
      setIsProcessing(false);
      
      const errorMessage = error.response?.data?.error || error.message;
      setError(`Lỗi khi tải lên video: ${errorMessage}`);
      
      setSnackbar({
        open: true,
        message: `Lỗi khi tải lên video: ${errorMessage}`,
        severity: 'error',
      });
    }
  };

  const handleViewVideo = (video) => {
    setViewingVideo(video);
  };

  const handleCloseViewer = () => {
    setViewingVideo(null);
  };

  const confirmDelete = (video) => {
    setVideoToDelete(video);
    setOpenDeleteDialog(true);
  };

  const handleDeleteVideo = async () => {
    if (!videoToDelete) return;
    
    try {
      // Trích xuất video_id từ filename nếu là video từ filesystem
      const videoId = videoToDelete.filename ? 
        videoToDelete.filename.split('_')[1]?.split('.')[0] : videoToDelete.id;
      
      await axios.delete(`/api/video/delete/${videoId}`);
      
      setSnackbar({
        open: true,
        message: 'Đã xóa video thành công',
        severity: 'success',
      });
      
      // Đóng dialog và xóa video cần xóa
      setOpenDeleteDialog(false);
      setVideoToDelete(null);
      
      // Nếu video đang xem đúng là video đã xóa thì đóng lại
      if (viewingVideo && viewingVideo.id === videoToDelete.id) {
        setViewingVideo(null);
      }
      
      // Làm mới danh sách video
      fetchProcessedVideos();
      
    } catch (error) {
      console.error('Error deleting video:', error);
      setSnackbar({
        open: true,
        message: `Lỗi khi xóa video: ${error.response?.data?.error || error.message}`,
        severity: 'error',
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleRefresh = () => {
    fetchProcessedVideos();
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (e) {
      return dateString;
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
              {isUploading ? `ĐANG TẢI LÊN... ${uploadProgress}%` : isProcessing ? 'ĐANG XỬ LÝ...' : 'XỬ LÝ VIDEO'}
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
          
          {isProcessing && (
            <Grid item xs={12} sx={{ textAlign: 'center', py: 2 }}>
              <CircularProgress size={40} thickness={4} />
              <Typography variant="body2" sx={{ mt: 1 }}>
                Đang phân tích video với mô hình YOLO...
              </Typography>
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* Error message */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Video viewer dialog */}
      <Dialog
        open={!!viewingVideo}
        onClose={handleCloseViewer}
        maxWidth="md"
        fullWidth
      >
        {viewingVideo && (
          <>
            <DialogTitle>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">{viewingVideo.filename || viewingVideo.name}</Typography>
                <IconButton onClick={handleCloseViewer} size="small">
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Box sx={{ position: 'relative', width: '100%', mb: 2 }}>
                <video
                  controls
                  width="100%"
                  autoPlay
                  src={viewingVideo.url}
                  style={{ borderRadius: '4px' }}
                />
              </Box>
              
              {viewingVideo.person_count !== undefined && (
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
                      <PeopleIcon color="primary" sx={{ mr: 1 }} />
                      <Typography><strong>Số người:</strong> {viewingVideo.person_count}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
                      <PetsIcon color="secondary" sx={{ mr: 1 }} />
                      <Typography><strong>Số động vật:</strong> {viewingVideo.animal_count}</Typography>
                    </Paper>
                  </Grid>
                </Grid>
              )}
              
              <Typography variant="body2" color="text.secondary">
                <strong>Ngày tạo:</strong> {formatDate(viewingVideo.created || viewingVideo.upload_date)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Kích thước:</strong> {formatFileSize(viewingVideo.size)}
              </Typography>
              {viewingVideo.processed_at && (
                <Typography variant="body2" color="text.secondary">
                  <strong>Xử lý lúc:</strong> {formatDate(viewingVideo.processed_at)}
                </Typography>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseViewer}>
                Đóng
              </Button>
              <Button 
                color="error" 
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
                  title={video.filename}
                >
                  <PlayOverlay onClick={() => handleViewVideo({
                    ...video,
                    url: video.url || `/api/video/processed/${video.filename}`
                  })}>
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
                  <Typography variant="subtitle1" component="h3" gutterBottom noWrap>
                    {video.filename}
                  </Typography>
                  
                  {video.person_count !== undefined && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        <PeopleIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                        {video.person_count} người
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <PetsIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                        {video.animal_count} động vật
                      </Typography>
                    </Box>
                  )}
                  
                  <Typography variant="caption" color="text.secondary" display="block">
                    {formatDate(video.created)}
                  </Typography>
                </CardContent>
                <Divider />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1 }}>
                  <Button
                    size="small"
                    startIcon={<PlayArrowIcon />}
                    onClick={() => handleViewVideo({
                      ...video,
                      url: video.url || `/api/video/processed/${video.filename}`
                    })}
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
          <DialogContentText>
            Bạn có chắc chắn muốn xóa video này? Hành động này không thể hoàn tác.
          </DialogContentText>
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