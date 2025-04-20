import React, { useState, useEffect } from 'react';
import { Grid, Paper, Typography, Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, IconButton, Chip, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import FilterListIcon from '@mui/icons-material/FilterList';
import PetsIcon from '@mui/icons-material/Pets';
import axios from 'axios';
import { API_URL } from '../config';
import { toast } from 'react-toastify';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  borderRadius: theme.spacing(2),
  overflow: 'hidden',
}));

const AnimationBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: 200,
  backgroundColor: theme.palette.grey[100],
  borderRadius: theme.spacing(1),
  marginBottom: theme.spacing(3),
  overflow: 'hidden',
  position: 'relative',
}));

// Create animated animal icons for decoration
const AnimatedIcon = styled(Box)(({ theme, index }) => ({
  position: 'absolute',
  animation: `move ${2 + index * 0.5}s infinite linear`,
  opacity: 0.7,
  '@keyframes move': {
    '0%': {
      transform: `translateX(-50px) translateY(${index * 20}px)`,
    },
    '100%': {
      transform: `translateX(calc(100% + 50px)) translateY(${index * 20}px)`,
    },
  },
}));

export default function DetectionHistory() {
  const [detections, setDetections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchDetections();
  }, [page, rowsPerPage]);

  const fetchDetections = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/detections`);
      setDetections(response.data);
      setTotalCount(response.data.length);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching detection history:', error);
      toast.error('Failed to fetch detection history');
      setLoading(false);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <Grid container spacing={3}>
      {/* Header */}
      <Grid item xs={12}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#3f51b5' }}>
          Detection History
        </Typography>
        <Typography variant="body1" gutterBottom sx={{ color: 'text.secondary' }}>
          View a history of all animal detections recorded by the system.
        </Typography>
      </Grid>

      {/* Animation Box */}
      <Grid item xs={12}>
        <AnimationBox>
          {[...Array(5)].map((_, index) => (
            <AnimatedIcon key={index} index={index}>
              <PetsIcon sx={{ fontSize: 40, color: '#ff9800' }} />
            </AnimatedIcon>
          ))}
          <Typography variant="h5" sx={{ color: 'text.secondary', fontWeight: 'medium' }}>
            Animal Detection Records
          </Typography>
        </AnimationBox>
      </Grid>

      {/* Detection Table */}
      <Grid item xs={12}>
        <StyledPaper>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h6">Detection Records</Typography>
            <Button 
              startIcon={<RefreshIcon />} 
              variant="outlined" 
              onClick={fetchDetections}
              disabled={loading}
            >
              Refresh
            </Button>
          </Box>

          <TableContainer component={Paper} elevation={0}>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Class</TableCell>
                  <TableCell>Confidence</TableCell>
                  <TableCell>Source</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                        <CircularProgress size={30} />
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : detections.length > 0 ? (
                  detections
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((detection) => (
                      <TableRow
                        key={detection.id}
                        sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                      >
                        <TableCell component="th" scope="row">
                          {detection.id}
                        </TableCell>
                        <TableCell>{formatDate(detection.timestamp)}</TableCell>
                        <TableCell>
                          <Chip 
                            icon={<PetsIcon />} 
                            label={detection.class_name}
                            color="warning"
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{`${(detection.confidence * 100).toFixed(1)}%`}</TableCell>
                        <TableCell>{detection.video_source}</TableCell>
                      </TableRow>
                    ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No detection records found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={totalCount}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </StyledPaper>
      </Grid>

      {/* Statistics Summary */}
      <Grid item xs={12} md={6}>
        <StyledPaper>
          <Typography variant="h6" gutterBottom>
            Detection Statistics
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Box sx={{ p: 2, bgcolor: '#e3f2fd', borderRadius: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Total Detections
                </Typography>
                <Typography variant="h3" sx={{ mt: 1, color: '#1976d2' }}>
                  {totalCount}
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={6}>
              <Box sx={{ p: 2, bgcolor: '#fff3e0', borderRadius: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Animal Classes
                </Typography>
                <Typography variant="h3" sx={{ mt: 1, color: '#ff9800' }}>
                  1
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12}>
              <Box sx={{ p: 2, bgcolor: '#f1f8e9', borderRadius: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Latest Detection
                </Typography>
                <Typography variant="h6" sx={{ mt: 1, color: '#558b2f' }}>
                  {detections.length > 0 ? formatDate(detections[0].timestamp) : 'No detections'}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </StyledPaper>
      </Grid>

      {/* Information */}
      <Grid item xs={12} md={6}>
        <StyledPaper>
          <Typography variant="h6" gutterBottom>
            About Detection History
          </Typography>
          
          <Typography variant="body2" paragraph>
            This page displays all animal detections recorded by the system. Each detection event includes:
          </Typography>
          
          <Box component="ul" sx={{ pl: 4 }}>
            <Box component="li">
              <Typography variant="body2">
                <strong>Timestamp:</strong> The exact time when the animal was detected
              </Typography>
            </Box>
            <Box component="li">
              <Typography variant="body2">
                <strong>Class:</strong> The type of animal detected (as classified by the model)
              </Typography>
            </Box>
            <Box component="li">
              <Typography variant="body2">
                <strong>Confidence:</strong> The model's confidence level in the detection
              </Typography>
            </Box>
            <Box component="li">
              <Typography variant="body2">
                <strong>Source:</strong> Whether the detection came from a video file or live camera
              </Typography>
            </Box>
          </Box>
          
          <Typography variant="body2" sx={{ mt: 2 }}>
            Detections are automatically saved to the database when an animal is identified in either uploaded videos or live camera feed.
          </Typography>
        </StyledPaper>
      </Grid>
    </Grid>
  );
}