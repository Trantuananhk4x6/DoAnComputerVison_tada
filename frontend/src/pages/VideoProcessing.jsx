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
    fetchFilesystemVideos();
  }, []);

  // Fetch videos from database
  const fetchProcessedVideos = async () => {
    try {
      setRefreshing(true);
      setError(null);
      
      // API endpoint
      const response = await axios.get('/api/videos/processed');
      console.log('API response from database:', response.data);
      
      setProcessedVideos(response.data || []);
      setRefreshing(false);
    } catch (error) {
      console.error('Error fetching processed videos:', error);
      setError(`Không thể tải danh sách video từ cơ sở dữ liệu: ${error.message}`);
      setProcessedVideos([]);
      setRefreshing(false);
    }
  };

  // Fetch videos directly from filesystem
  const fetchFilesystemVideos = async () => {
    try {
      const response = await axios.get('/api/videos/filesystem');
      console.log('API response from filesystem:', response.data);
      
      setFilesystemVideos(response.data || []);
    } catch (error) {
      console.error('Error fetching filesystem videos:', error);
      setSnackbar({
        open: true,
        message: 'Không thể tải danh sách video từ hệ thống file',
        severity: 'error',
      });
      setFilesystemVideos([]);
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
    setError(null);

    const formData = new FormData();
    formData.append('video', selectedFile);

    try {
      console.log('Sending upload request to /api/videos/upload');
      
      // Upload video
      const uploadResponse = await axios.post('/api/videos/upload', formData, {
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
      
      // Process video
      setIsUploading(false);
      setIsProcessing(true);
      
      const videoId = uploadResponse.data.videoId;
      const processResponse = await axios.post(`/api/videos/process/${videoId}`);
      
      console.log('Process response:', processResponse.data);
      
      // Reset states
      setSelectedFile(null);
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      setSnackbar({
        open: true,
        message: 'Video xử lý thành công',
        severity: 'success',
      });
      
      // Refresh both video lists
      fetchProcessedVideos();
      fetchFilesystemVideos();
      
    } catch (error) {
      console.error('Error uploading or processing video:', error);
      setIsUploading(false);
      setIsProcessing(false);
      
      const errorMessage = error.response?.data?.error || error.message;
      setError(`Lỗi khi tải lên hoặc xử lý video: ${errorMessage}`);
      
      setSnackbar({
        open: true,
        message: `Lỗi: ${errorMessage}`,
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
      if (videoToDelete.isFilesystemOnly) {
        // Delete video from filesystem only
        await axios.delete(`/api/videos/filesystem/${videoToDelete.filename}`);
      } else {
        // Delete video from database and filesystem
        await axios.delete(`/api/videos/${videoToDelete.id}`);
      }
      
      setSnackbar({
        open: true,
        message: 'Đã xóa video thành công',
        severity: 'success',
      });
      
      // Close dialog and clear video to delete
      setOpenDeleteDialog(false);
      setVideoToDelete(null);
      
      // If the deleted video is currently being viewed, close the viewer
      if (viewingVideo && (
        (viewingVideo.id && videoToDelete.id && viewingVideo.id === videoToDelete.id) || 
        (viewingVideo.filename && videoToDelete.filename && viewingVideo.filename === videoToDelete.filename)
      )) {
        setViewingVideo(null);
      }
      
      // Refresh the lists of videos
      fetchProcessedVideos();
      fetchFilesystemVideos();
      
    } catch (error) {
      console.error('Error deleting video:', error);
      setSnackbar({
        open: true,
        message: `Lỗi khi xóa video: ${error.message}`,
        severity: 'error',
      });
    }
  };

  const handleImportVideo = async (filesystemVideo) => {
    try {
      setIsProcessing(true);
      
      await axios.post('/api/videos/import', { 
        filename: filesystemVideo.filename,
        filepath: filesystemVideo.filepath
      });
      
      setIsProcessing(false);
      setSnackbar({
        open: true,
        message: 'Đã import video vào cơ sở dữ liệu thành công',
        severity: 'success',
      });
      
      // If video was being viewed, close viewer
      if (viewingVideo && viewingVideo.filename === filesystemVideo.filename) {
        setViewingVideo(null);
      }
      
      // Refresh both lists
      fetchProcessedVideos();
      fetchFilesystemVideos();
      
    } catch (error) {
      console.error('Error importing video:', error);
      setIsProcessing(false);
      setSnackbar({
        open: true,
        message: `Lỗi khi import video: ${error.message}`,
        severity: 'error',
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleRefresh = () => {
    fetchProcessedVideos();
    fetchFilesystemVideos();
  };

  const getVideoThumbnail = (video) => {
    if (video.isFilesystemOnly) {
      return `/api/videos/filesystem/thumbnail/${video.filename}`;
    }
    return `/api/videos/thumbnail/${video.id}`;
  };

  const getVideoStreamUrl = (video) => {
    if (video.isFilesystemOnly) {
      return `/api/videos/filesystem/stream/${video.filename}`;
    }
    return `/api/videos/stream/${video.id}`;
  };

  // Check if a filesystem video is already in the database
  const isVideoInDatabase = (filename) => {
    return processedVideos.some(dbVideo => 
      dbVideo.processed_file_path && dbVideo.processed_file_path.includes(filename)
    );
  };

  // Filter out filesystem videos that are already in the database
  const uniqueFilesystemVideos = filesystemVideos.filter(
    fsVideo => !isVideoInDatabase(fsVideo.filename)
  );

  // Determine if we should show the "no videos" message
  const noVideosAvailable = processedVideos.length === 0 && uniqueFilesystemVideos.length === 0;
  
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
    if (bytes === 0) return '0 Bytes';
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

      {/* Error display if needed */}
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
        PaperProps={{
          elevation: 5,
          sx: { borderRadius: 2 }
        }}
      >
        {viewingVideo && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" component="h2" noWrap sx={{ maxWidth: '90%' }}>
                {viewingVideo.name || viewingVideo.filename}
              </Typography>
              <IconButton onClick={handleCloseViewer} size="small">
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <Box sx={{ position: 'relative', width: '100%', mb: 2 }}>
                <video
                  controls
                  width="100%"
                  autoPlay
                  src={getVideoStreamUrl(viewingVideo)}
                  style={{ borderRadius: '4px' }}
                />
              </Box>
              <Grid container spacing={2}>
                {!viewingVideo.isFilesystemOnly && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', bgcolor: '#f5f5f5' }}>
                        <PeopleIcon color="primary" sx={{ mr: 1 }} />
                        <Typography variant="subtitle1">
                          <strong>Số người:</strong> {viewingVideo.person_count || 0}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', bgcolor: '#f5f5f5' }}>
                        <PetsIcon color="secondary" sx={{ mr: 1 }} />
                        <Typography variant="subtitle1">
                          <strong>Số động vật:</strong> {viewingVideo.animal_count || 0}
                        </Typography>
                      </Paper>
                    </Grid>
                  </>
                )}
                <Grid item xs={12}>
                  <Box sx={{ mt: 1 }}>
                    {viewingVideo.isFilesystemOnly ? (
                      <>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Vị trí:</strong> {viewingVideo.filepath}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Kích thước:</strong> {formatFileSize(viewingVideo.size)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Ngày tạo:</strong> {formatDate(viewingVideo.created)}
                        </Typography>
                        <Typography variant="body2" color="primary" sx={{ mt: 1 }}>
                          File này chỉ tồn tại trong hệ thống file và chưa được phân tích. Sử dụng chức năng "Import" để phân tích và thêm vào cơ sở dữ liệu.
                        </Typography>
                      </>
                    ) : (
                      <>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Xử lý lúc:</strong> {formatDate(viewingVideo.processed_at)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Tên gốc:</strong> {viewingVideo.name}
                        </Typography>
                      </>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button
                variant="outlined"
                onClick={handleCloseViewer}
              >
                Đóng
              </Button>
              {viewingVideo.isFilesystemOnly && (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<ImportIcon />}
                  onClick={() => {
                    handleCloseViewer();
                    handleImportVideo(viewingVideo);
                  }}
                >
                  Import
                </Button>
              )}
              <Button
                variant="contained"
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
      ) : noVideosAvailable ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
          <Typography variant="body1" color="text.secondary">
            Chưa có video nào được xử lý. Hãy tải lên video để bắt đầu.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {/* Database Videos */}
          {processedVideos.map((video) => (
            <Grid item xs={12} sm={6} md={4} key={`db-${video.id}`}>
              <StyledVideoCard>
                <ThumbnailContainer
                  image={getVideoThumbnail(video)}
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
                  <Typography variant="subtitle1" component="h3" gutterBottom noWrap sx={{ fontWeight: 'medium' }}>
                    {video.name}
                  </Typography>
                  
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
                    Xử lý: {formatDate(video.processed_at)}
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

          {/* Filesystem-only Videos */}
          {uniqueFilesystemVideos.map((video) => (
            <Grid item xs={12} sm={6} md={4} key={`fs-${video.filename}`}>
              <StyledVideoCard sx={{ border: '1px dashed #ccc' }}>
                <ThumbnailContainer
                  image={getVideoThumbnail(video)}
                  title={video.filename}
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
                    <Tooltip title="Video chỉ tồn tại trong hệ thống file">
                      <FolderIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                    </Tooltip>
                    <Typography variant="subtitle1" component="h3" noWrap sx={{ fontWeight: 'medium' }}>
                      {video.filename}
                    </Typography>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary">
                    <strong>Kích thước:</strong> {formatFileSize(video.size)}
                  </Typography>
                  
                  <Typography variant="caption" color="info.main" display="block" sx={{ mt: 1 }}>
                    *Tìm thấy trong thư mục processed (chưa có trong cơ sở dữ liệu)
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
                    color="primary"
                    startIcon={<ImportIcon />}
                    onClick={() => handleImportVideo(video)}
                  >
                    Import
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
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Xác nhận xóa
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Bạn có chắc chắn muốn xóa "{videoToDelete?.name || videoToDelete?.filename}"? Hành động này không thể hoàn tác.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)} color="primary">
            Hủy
          </Button>
          <Button onClick={handleDeleteVideo} color="error" variant="contained" autoFocus>
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