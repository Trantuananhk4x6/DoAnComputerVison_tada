import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Container,
  Grid,
  LinearProgress,
  Card,
  CardContent,
  CardMedia,
  Alert,
  IconButton,
  Tooltip,
  Zoom,
  Fade
} from '@mui/material';
import { styled, alpha } from '@mui/material/styles';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import PetsIcon from '@mui/icons-material/Pets';
import EmojiNatureIcon from '@mui/icons-material/EmojiNature';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { toast } from 'react-toastify';

const AnimatedUploadIcon = styled(UploadFileIcon)(({ theme }) => ({
  fontSize: 80,
  color: theme.palette.primary.main,
  animation: 'float 3s ease-in-out infinite',
  '@keyframes float': {
    '0%': { transform: 'translateY(0px)' },
    '50%': { transform: 'translateY(-10px)' },
    '100%': { transform: 'translateY(0px)' }
  }
}));
// Gradient Background
const GradientPaper = styled(Paper)(({ theme }) => ({
  background: `linear-gradient(120deg, ${theme.palette.primary.light}15, ${theme.palette.secondary.light}15)`,
  borderRadius: '16px',
  boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
  backdropFilter: 'blur(4px)',
  border: '1px solid rgba(255, 255, 255, 0.18)'
}));

// Custom Upload Button
const UploadButton = styled(Button)(({ theme }) => ({
  background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
  borderRadius: 30,
  border: 0,
  color: 'white',
  height: 48,
  padding: '0 30px',
  boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
  transition: 'all 0.3s',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 10px 4px rgba(33, 203, 243, .3)',
  }
}));

// Hidden Input
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

// Animated Video Card
const AnimatedVideoCard = styled(Card)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  borderRadius: 16,
  overflow: 'hidden',
  transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  boxShadow: '0 10px 20px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.06)',
  '&:hover': {
    transform: 'translateY(-8px) scale(1.01)',
    boxShadow: '0 15px 30px rgba(0,0,0,0.18), 0 10px 10px rgba(0,0,0,0.10)',
    '& .MuiCardMedia-root': {
      transform: 'scale(1.05)'
    }
  }
}));

// Animated Progress
const AnimatedLinearProgress = styled(LinearProgress)(({ theme }) => ({
  height: 10,
  borderRadius: 5,
  background: `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.2)} 0%, ${alpha(theme.palette.secondary.main, 0.2)} 100%)`,
  '& .MuiLinearProgress-bar': {
    background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
    borderRadius: 5
  }
}));

// API Base URL
const API_BASE_URL = 'http://localhost:5000';



const VideoProcessing = ({ socket }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processedVideos, setProcessedVideos] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hoveredCard, setHoveredCard] = useState(null);

  // Lọc videos để chỉ giữ lại các video bắt đầu bằng "processed_daf"
  const filterProcessedVideos = useCallback((videos) => {
    return videos.filter(video => 
      video.filename.startsWith('processed_daf') || 
      video.filename.startsWith('processed_')
    );
  }, []);

  // Fetch danh sách video đã xử lý khi component mount
  useEffect(() => {
    const fetchProcessedVideos = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/processed-videos`);
        if (!response.ok) {
          throw new Error('Không thể tải danh sách video');
        }
        const data = await response.json();
        console.log('Fetched processed videos:', data);
        
        if (data.videos && data.videos.length > 0) {
          const formattedVideos = data.videos.map(video => ({
            videoId: video.filename.split('_')[1] || video.filename,
            filename: video.filename,
            processedUrl: `${API_BASE_URL}${video.url}`,
            thumbnailUrl: video.thumbnail ? `${API_BASE_URL}${video.thumbnail}` : null,
            detections: 0,
            date: new Date(video.created * 1000).toISOString()
          }));
          
          setProcessedVideos(filterProcessedVideos(formattedVideos));
        }
      } catch (error) {
        console.error('Error fetching processed videos:', error);
        setError('Không thể tải danh sách video đã xử lý');
        toast.error('Không thể tải danh sách video đã xử lý');
      } finally {
        setLoading(false);
      }
    };

    fetchProcessedVideos();
  },  [filterProcessedVideos]);

  // Xử lý WebSocket events
  useEffect(() => {
    if (!socket) return;

    // Xử lý trạng thái xử lý video
    const handleProcessingStatus = (data) => {
      console.log('Processing status received:', data);

      if (data.status === 'started' || data.status === 'processing') {
        setProcessing(true);
        setProcessingProgress(data.progress || 0);
      } else if (data.status === 'completed') {
        console.log('Video processing completed with URL:', data.processed_video_url);
        setProcessing(false);
        setProcessingProgress(100);

        // Thêm video mới vào danh sách
        setProcessedVideos(prevVideos => {
          // Kiểm tra nếu video đã tồn tại (tránh duplicate)
          const exists = prevVideos.some(v => v.videoId === data.session_id);
          if (exists) return prevVideos;
          
          const newVideo = {
            videoId: data.session_id,
            filename: `processed_${data.session_id}_${data.original_filename}`,
            processedUrl: `${API_BASE_URL}${data.processed_video_url}`,
            thumbnailUrl: data.thumbnail_url ? `${API_BASE_URL}${data.thumbnail_url}` : null,
            detections: data.detections_count || 0,
            date: new Date().toISOString()
          };
          
          return filterProcessedVideos([newVideo, ...prevVideos]);
        });

        toast.success('Video đã được xử lý thành công! 🎉', {
          icon: '🎬',
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      } else if (data.status === 'error') {
        setProcessing(false);
        setError(`Lỗi xử lý video: ${data.error}`);
        toast.error(`Lỗi xử lý video: ${data.error}`, {
          icon: '❌'
        });
      }
    };

    // Lắng nghe các sự kiện từ WebSocket
    socket.on('processing_status', handleProcessingStatus);
    socket.on('processing_complete', handleProcessingStatus);

    return () => {
      socket.off('processing_status', handleProcessingStatus);
      socket.off('processing_complete', handleProcessingStatus);
    };
  }, [socket, filterProcessedVideos]);

  // Xử lý khi chọn file
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Kiểm tra định dạng file
      if (!file.type.startsWith('video/')) {
        toast.error('Vui lòng chọn file video! 🎬', {
          icon: '🚫'
        });
        return;
      }
      setSelectedFile(file);
      setError(null);
      toast.info(`File đã chọn: ${file.name}`, {
        icon: '📁'
      });
    }
  };

  // Xử lý khi upload file
  const handleUpload = useCallback(async () => {
    if (!selectedFile) {
      toast.error('Vui lòng chọn file video trước!', {
        icon: '⚠️'
      });
      return;
    }

    setError(null);
    const formData = new FormData();
    formData.append('video', selectedFile);

    setUploading(true);
    setUploadProgress(0);

    try {
      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      console.log('Upload response:', data);

      setUploading(false);
      toast.success('Video đã được tải lên thành công! ⬆️', {
        icon: '📤'
      });

      // Chuyển sang trạng thái đang xử lý
      setProcessing(true);
      setProcessingProgress(0);
    } catch (error) {
      console.error('Upload error:', error);
      setUploading(false);
      setProcessing(false);
      setError(`Lỗi khi tải lên: ${error.message}`);
      toast.error(`Lỗi khi tải lên: ${error.message}`, {
        icon: '❌'
      });
    }
  }, [selectedFile]);

  // Xử lý khi download video đã xử lý
  const handleDownload = (videoId) => {
    const downloadUrl = `${API_BASE_URL}/api/download/${videoId}`;
    console.log('Downloading from URL:', downloadUrl);
    window.open(downloadUrl, '_blank');
    toast.info('Đang tải xuống video...', {
      icon: '⬇️'
    });
  };

  // Xử lý phát video trong cửa sổ mới
  const handlePlay = (url) => {
    window.open(url, '_blank');
    toast.info('Đang mở video trong tab mới...', {
      icon: '▶️'
    });
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    return (bytes / 1073741824).toFixed(1) + ' GB';
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        mb: 3,
        borderBottom: '2px solid',
        borderImage: 'linear-gradient(to right, #3f51b5, #f50057) 1',
        pb: 1
      }}>
        <EmojiNatureIcon sx={{ 
          fontSize: 40, 
          mr: 2,
          background: 'linear-gradient(45deg, #3f51b5 30%, #f50057 90%)',
          borderRadius: '50%',
          padding: 1,
          color: 'white'
        }} />
        <Typography variant="h4" fontWeight="bold" sx={{ 
          background: 'linear-gradient(45deg, #3f51b5 30%, #f50057 90%)',
          backgroundClip: 'text',
          textFillColor: 'transparent',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Xử lý video phát hiện động vật
        </Typography>
      </Box>

      {error && (
        <Zoom in={!!error}>
          <Alert 
            severity="error" 
            sx={{ 
              mb: 3, 
              borderRadius: 2,
              animation: 'pulse 2s infinite',
              '@keyframes pulse': {
                '0%': { boxShadow: '0 0 0 0 rgba(244, 67, 54, 0.4)' },
                '70%': { boxShadow: '0 0 0 10px rgba(244, 67, 54, 0)' },
                '100%': { boxShadow: '0 0 0 0 rgba(244, 67, 54, 0)' }
              }
            }}
          >
            {error}
          </Alert>
        </Zoom>
      )}

      <Grid container spacing={3}>
        {/* Khu vực Upload Video */}
        <Grid item xs={12}>
          <GradientPaper sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden' }}>
            <Box sx={{ 
              width: '100%', 
              minHeight: 250, 
              border: '3px dashed',
              borderColor: theme => theme.palette.primary.main,
              borderRadius: 4,
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'center', 
              alignItems: 'center',
              mb: 3,
              position: 'relative',
              background: 'rgba(255, 255, 255, 0.7)',
              overflow: 'hidden',
              transition: 'all 0.3s ease'
            }}>
              {selectedFile ? (
                <Fade in={!!selectedFile}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <Box sx={{
                      width: 100,
                      height: 100,
                      borderRadius: '50%',
                      backgroundColor: 'rgba(25, 118, 210, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px',
                      boxShadow: '0 0 0 8px rgba(25, 118, 210, 0.05)'
                    }}>
                      <VideoLibraryIcon sx={{ fontSize: 50, color: 'primary.main' }} />
                    </Box>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      {selectedFile.name}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Kích thước: {formatFileSize(selectedFile.size)}
                    </Typography>
                  </Box>
                </Fade>
              ) : (
                <Box sx={{ textAlign: 'center', p: 2, position: 'relative', zIndex: 2 }}>
                  <AnimatedUploadIcon sx={{ mb: 2 }} />
                  <Typography variant="h6" fontWeight="bold" sx={{ mt: 2 }}>
                    Kéo thả video vào đây hoặc click để chọn
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                    Hỗ trợ các định dạng: MP4, AVI, MOV, MKV
                  </Typography>
                </Box>
              )}

              <Button
                component="label"
                variant="contained"
                sx={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer'
                }}
              >
                <VisuallyHiddenInput type="file" accept="video/*" onChange={handleFileChange} />
              </Button>
            </Box>

            {selectedFile && (
              <Box sx={{ width: '100%', mt: 2 }}>
                <UploadButton 
                  variant="contained" 
                  endIcon={<CloudUploadIcon />}
                  onClick={handleUpload}
                  disabled={uploading || !selectedFile || processing}
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  {uploading ? `Đang tải lên...` : 'Tải lên & Xử lý video'}
                </UploadButton>
                
                {uploading && (
                  <Box sx={{ mt: 1, position: 'relative' }}>
                    <AnimatedLinearProgress 
                      variant={uploadProgress > 0 ? "determinate" : "indeterminate"}
                      value={uploadProgress} 
                    />
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        position: 'absolute', 
                        top: '50%', 
                        left: '50%', 
                        transform: 'translate(-50%, -50%)' 
                      }}
                    >
                      Đang tải lên... {uploadProgress}%
                    </Typography>
                  </Box>
                )}
              </Box>
            )}

            {processing && (
              <Fade in={processing}>
                <Box sx={{ width: '100%', mt: 3, p: 2, bgcolor: 'background.paper', borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <PetsIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6" fontWeight="medium" color="primary.main">
                      Đang phát hiện động vật...
                    </Typography>
                  </Box>
                  <AnimatedLinearProgress 
                    variant={processingProgress > 0 ? "determinate" : "indeterminate"}
                    value={processingProgress}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Xử lý AI
                    </Typography>
                    {processingProgress > 0 && (
                      <Typography variant="body2" fontWeight="bold" color={
                        processingProgress < 30 ? 'error.main' : 
                        processingProgress < 70 ? 'warning.main' : 
                        'success.main'
                      }>
                        {processingProgress}%
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Fade>
            )}
          </GradientPaper>
        </Grid>

        {/* Danh sách Video đã xử lý */}
        <Grid item xs={12}>
          <GradientPaper sx={{ p: 3 }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              mb: 2,
              pb: 1,
              borderBottom: '1px solid',
              borderImage: 'linear-gradient(to right, rgba(63, 81, 181, 0.3), rgba(245, 0, 87, 0.3)) 1'
            }}>
              <VideoLibraryIcon sx={{ 
                mr: 1, 
                color: 'primary.main',
                animation: 'pulse 2s infinite',
                '@keyframes pulse': {
                  '0%': { opacity: 0.6 },
                  '50%': { opacity: 1 },
                  '100%': { opacity: 0.6 }
                }
              }} />
              <Typography variant="h5" fontWeight="bold" color="primary.main">
                Video đã xử lý
              </Typography>
              
              <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                  {processedVideos.length} video
                </Typography>
              </Box>
            </Box>
            
            {loading ? (
              <Box sx={{ 
                width: '100%', 
                textAlign: 'center', 
                py: 5,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center' 
              }}>
                <AnimatedLinearProgress sx={{ width: '50%', mb: 3 }} />
                <Typography sx={{ mt: 2, fontWeight: 'medium' }}>
                  Đang tải danh sách video...
                </Typography>
              </Box>
            ) : processedVideos.length > 0 ? (
              <Grid container spacing={3}>
                {processedVideos.map((video, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Zoom in={true} style={{ transitionDelay: `${index * 100}ms` }}>
                      <AnimatedVideoCard
                        onMouseEnter={() => setHoveredCard(index)}
                        onMouseLeave={() => setHoveredCard(null)}
                      >
                        {/* Video player/thumbnail */}
                        <Box sx={{ 
                          position: 'relative', 
                          paddingTop: '56.25%', 
                          backgroundColor: '#000',
                          overflow: 'hidden'
                        }}>
                          {video.thumbnailUrl ? (
                            <CardMedia
                              component="img"
                              sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                transition: 'transform 0.6s ease',
                                filter: hoveredCard === index ? 'brightness(0.7)' : 'brightness(0.85)'
                              }}
                              image={video.thumbnailUrl}
                              alt={video.filename}
                            />
                          ) : (
                            <Box sx={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              backgroundColor: 'grey.900',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <VideoLibraryIcon sx={{ fontSize: 60, color: 'grey.500' }} />
                            </Box>
                          )}
                          
                          {/* Play button overlay */}
                          <Box 
                            sx={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: 'transparent',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                              '&:hover': {
                                backgroundColor: 'rgba(0,0,0,0.3)'
                              }
                            }}
                            onClick={() => handlePlay(video.processedUrl)}
                          >
                            <Box sx={{
                              width: 60,
                              height: 60,
                              borderRadius: '50%',
                              backgroundColor: 'rgba(255,255,255,0.8)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.3s ease',
                              transform: hoveredCard === index ? 'scale(1.2)' : 'scale(1)',
                              boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
                              '&:hover': {
                                backgroundColor: 'white',
                                boxShadow: '0 6px 15px rgba(0,0,0,0.3)'
                              }
                            }}>
                              <PlayArrowIcon sx={{ fontSize: 30, color: '#f50057' }} />
                            </Box>
                          </Box>

                          {/* Detection badge */}
                          {video.detections > 0 && (
                            <Box sx={{
                              position: 'absolute',
                              top: 10,
                              right: 10,
                              backgroundColor: 'rgba(76, 175, 80, 0.9)',
                              color: 'white',
                              borderRadius: 10,
                              padding: '2px 8px',
                              display: 'flex',
                              alignItems: 'center',
                              fontSize: 14,
                              fontWeight: 'bold'
                            }}>
                              <PetsIcon sx={{ fontSize: 16, mr: 0.5 }} />
                              {video.detections}
                            </Box>
                          )}
                        </Box>

                        <CardContent sx={{ 
                          position: 'relative',
                          background: 'linear-gradient(to bottom, #f8f9fa, #e9ecef)',
                          borderTop: '1px solid rgba(0,0,0,0.05)'
                        }}>
                          <Typography variant="h6" fontWeight="medium" noWrap title={video.filename} sx={{ mb: 1 }}>
                            {video.filename.split('_').slice(2).join('_') || video.filename}
                          </Typography>
                          
                          <Box sx={{ display: 'flex', flexDirection: 'column', mb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ mr: 1, minWidth: 65 }}>
                                Ngày tạo:
                              </Typography>
                              <Typography variant="body2" fontWeight="medium">
                                {formatDate(video.date)}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography variant="caption" color="text.secondary" sx={{ mr: 1, minWidth: 65 }}>
                                Phát hiện:
                              </Typography>
                              <Typography variant="body2" fontWeight="medium" color={
                                video.detections > 0 ? 'success.main' : 'text.primary'
                              }>
                                {video.detections} động vật
                              </Typography>
                            </Box>
                          </Box>
                          
                          <Box sx={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            pt: 1,
                            borderTop: '1px dashed rgba(0,0,0,0.1)'
                          }}>
                            <Button 
                              variant="contained" 
                              color="primary" 
                              size="small" 
                              startIcon={<PlayArrowIcon />}
                              onClick={() => handlePlay(video.processedUrl)}
                              sx={{
                                borderRadius: 20,
                                textTransform: 'none',
                                boxShadow: 'none',
                                '&:hover': { boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }
                              }}
                            >
                              Xem video
                            </Button>
                            <Box>
                              <Tooltip title="Tải xuống video" arrow>
                                <IconButton 
                                  size="small"
                                  color="primary"
                                  onClick={() => handleDownload(video.videoId)}
                                  sx={{ 
                                    ml: 1, 
                                    '&:hover': { 
                                      backgroundColor: 'rgba(25, 118, 210, 0.1)',
                                      transform: 'translateY(-2px)'
                                    }
                                  }}
                                >
                                  <DownloadIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Xóa video" arrow>
                                <IconButton 
                                  size="small"
                                  color="error"
                                  sx={{ 
                                    ml: 0.5, 
                                    '&:hover': { 
                                      backgroundColor: 'rgba(244, 67, 54, 0.1)',
                                      transform: 'translateY(-2px)'
                                    }
                                  }}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </Box>
                        </CardContent>
                      </AnimatedVideoCard>
                    </Zoom>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Box sx={{ 
                p: 5, 
                textAlign: 'center', 
                backgroundColor: 'rgba(0, 0, 0, 0.02)',
                borderRadius: 4,
                border: '1px dashed rgba(0, 0, 0, 0.1)'
              }}>
                <AnimatedUploadIcon sx={{ fontSize: 120, mb: 2 }} />
                <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
                  Chưa có video nào được xử lý
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
                  Hãy tải lên video để bắt đầu phát hiện động vật
                </Typography>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<CloudUploadIcon />}
                  onClick={() => document.querySelector('input[type="file"]')?.click()}
                >
                  Tải lên video
                </Button>
              </Box>
            )}
          </GradientPaper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default VideoProcessing;