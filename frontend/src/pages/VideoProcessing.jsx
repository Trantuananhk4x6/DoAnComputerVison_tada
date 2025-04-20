import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Container,
  Grid,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Card,
  CardContent,
  CardMedia,
  Divider
} from '@mui/material';
import { styled } from '@mui/material/styles';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import axios from 'axios';
import { toast } from 'react-toastify';

// Styled component cho phần upload
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

const VideoProcessing = ({ socket }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processedVideos, setProcessedVideos] = useState([]);
  const [processing, setProcessing] = useState(false);

  // Xử lý khi chọn file
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Kiểm tra định dạng file
      if (!file.type.startsWith('video/')) {
        toast.error('Vui lòng chọn file video!');
        return;
      }
      setSelectedFile(file);
      toast.info(`File đã chọn: ${file.name}`);
    }
  };

  // Xử lý khi upload file
  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Vui lòng chọn file video trước!');
      return;
    }

    const formData = new FormData();
    formData.append('video', selectedFile);

    setUploading(true);
    setUploadProgress(0);

    try {
      const response = await axios.post('http://localhost:5000/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        }
      });

      setUploading(false);
      toast.success('Video đã được tải lên thành công!');

      // Khi upload thành công, báo hiệu đang xử lý
      setProcessing(true);

      // Lắng nghe kết quả xử lý từ server qua Socket.IO
      socket.on('processing_complete', (data) => {
        setProcessing(false);
        setProcessedVideos(prevVideos => [data, ...prevVideos]);
        toast.success('Video đã được xử lý thành công!');
      });

      socket.on('processing_error', (error) => {
        setProcessing(false);
        toast.error(`Lỗi khi xử lý video: ${error.message}`);
      });

    } catch (error) {
      setUploading(false);
      console.error('Upload error:', error);
      toast.error(`Lỗi khi tải lên: ${error.response?.data?.message || error.message}`);
    }
  };

  // Xử lý khi download video đã xử lý
  const handleDownload = (videoId) => {
    window.open(`http://localhost:5000/api/download/${videoId}`, '_blank');
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Xử lý video
      </Typography>

      <Grid container spacing={3}>
        {/* Khu vực Upload Video */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Box sx={{ 
              width: '100%', 
              height: 200, 
              border: '2px dashed #1976d2',
              borderRadius: 2,
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'center', 
              alignItems: 'center',
              mb: 2
            }}>
              <CloudUploadIcon fontSize="large" color="primary" />
              <Typography variant="h6" sx={{ mt: 1 }}>
                {selectedFile ? `File đã chọn: ${selectedFile.name}` : 'Chọn video để tải lên'}
              </Typography>
              <Button
                component="label"
                variant="contained"
                startIcon={<CloudUploadIcon />}
                sx={{ mt: 2 }}
                disabled={uploading}
              >
                Chọn Video
                <VisuallyHiddenInput type="file" accept="video/*" onChange={handleFileChange} />
              </Button>
            </Box>

            {selectedFile && (
              <Box sx={{ width: '100%', mt: 2 }}>
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={handleUpload}
                  disabled={uploading || !selectedFile}
                  fullWidth
                >
                  {uploading ? `Đang tải lên (${uploadProgress}%)` : 'Tải lên & Xử lý'}
                </Button>
                
                {uploading && (
                  <LinearProgress 
                    variant="determinate" 
                    value={uploadProgress} 
                    sx={{ mt: 1, height: 10, borderRadius: 2 }} 
                  />
                )}
              </Box>
            )}

            {processing && (
              <Box sx={{ width: '100%', mt: 2 }}>
                <Typography variant="body1">
                  Đang xử lý video, vui lòng đợi...
                </Typography>
                <LinearProgress sx={{ mt: 1, height: 10, borderRadius: 2 }} />
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Danh sách Video đã xử lý */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              <VideoLibraryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Video đã xử lý
            </Typography>
            
            <Divider sx={{ my: 2 }} />
            
            {processedVideos.length > 0 ? (
              <Grid container spacing={2}>
                {processedVideos.map((video, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Card>
                      <CardMedia
                        component="video"
                        height="194"
                        image={`http://localhost:5000/api/thumbnails/${video.id || video.videoId}`}
                        controls
                      />
                      <CardContent>
                        <Typography variant="h6" noWrap>
                          {video.originalName || video.filename}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Phát hiện: {video.detections || 0} đối tượng
                        </Typography>
                        <Button 
                          variant="contained" 
                          color="primary" 
                          size="small" 
                          sx={{ mt: 1 }}
                          onClick={() => handleDownload(video.id || video.videoId)}
                        >
                          Tải xuống video
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Box sx={{ 
                p: 3, 
                textAlign: 'center', 
                backgroundColor: '#f5f5f5',
                borderRadius: 2
              }}>
                <Typography variant="body1" color="textSecondary">
                  Chưa có video nào được xử lý
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default VideoProcessing;