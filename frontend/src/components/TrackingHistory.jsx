import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Container,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  useTheme,
  Button,
  Tooltip
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Timeline as TimelineIcon,
  Visibility as ViewIcon,
  PeopleOutline as PeopleIcon,
  Pets as PetsIcon,
  MoreVert as MoreIcon
} from '@mui/icons-material';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { API_ENDPOINTS } from '../utils/constants';
import { formatDate } from '../utils/formatters';

const TrackingHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const theme = useTheme();

  useEffect(() => {
    fetchTrackingHistory();
  }, []);

  const fetchTrackingHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(API_ENDPOINTS.TRACKING_HISTORY);
      
      if (response.data && Array.isArray(response.data.history)) {
        setHistory(response.data.history);
      } else {
        setHistory([]);
        setError('Invalid data format received from server');
      }
    } catch (err) {
      console.error('Error fetching tracking history:', err);
      setError(`Failed to load tracking history: ${err.message}`);
      setHistory([]);
    } finally {
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

  const handleSearch = (event) => {
    setSearchTerm(event.target.value.toLowerCase());
    setPage(0);
  };

  // Filter by search term
  const filteredHistory = history.filter(item => 
    item.video_name?.toLowerCase().includes(searchTerm) || 
    item.video_id?.toLowerCase().includes(searchTerm) ||
    item.timestamp?.toLowerCase().includes(searchTerm)
  );

  // Apply pagination
  const displayedHistory = filteredHistory
    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
          <TimelineIcon sx={{ mr: 2 }} />
          Lịch Sử Tracking
        </Typography>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <Paper 
          elevation={0} 
          sx={{ 
            p: 3, 
            borderRadius: 2,
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
            border: '1px solid',
            borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            mb: 2
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">Danh sách lịch sử phân tích video</Typography>
            <Box sx={{ display: 'flex' }}>
              <TextField
                placeholder="Tìm kiếm..."
                variant="outlined"
                size="small"
                value={searchTerm}
                onChange={handleSearch}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                  sx: { borderRadius: 2, mr: 1 }
                }}
              />
              <Button
                startIcon={<RefreshIcon />}
                variant="outlined"
                onClick={fetchTrackingHistory}
                disabled={loading}
              >
                Làm mới
              </Button>
            </Box>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer sx={{ borderRadius: 1, overflow: 'hidden' }}>
                <Table sx={{ minWidth: 650 }} aria-label="tracking history table">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)' }}>
                      <TableCell>Video</TableCell>
                      <TableCell align="center">Người</TableCell>
                      <TableCell align="center">Động vật</TableCell>
                      <TableCell align="center">Tổng đối tượng</TableCell>
                      <TableCell align="center">Tổng frames</TableCell>
                      <TableCell>Thời gian</TableCell>
                      <TableCell align="center">Hành động</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {displayedHistory.length > 0 ? (
                      displayedHistory.map((item, index) => (
                        <TableRow
                          key={index}
                          sx={{ 
                            '&:hover': { 
                              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)'
                            } 
                          }}
                        >
                          <TableCell component="th" scope="row">
                            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                {item.video_name || 'Unknown'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                ID: {item.video_id}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              icon={<PeopleIcon fontSize="small" />}
                              label={item.person_count}
                              size="small"
                              sx={{ 
                                bgcolor: `${theme.palette.error.main}10`,
                                color: theme.palette.error.main,
                                borderColor: theme.palette.error.main,
                                '& .MuiChip-icon': { color: theme.palette.error.main }
                              }}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              icon={<PetsIcon fontSize="small" />}
                              label={item.animal_count}
                              size="small"
                              sx={{ 
                                bgcolor: `${theme.palette.success.main}10`,
                                color: theme.palette.success.main,
                                borderColor: theme.palette.success.main,
                                '& .MuiChip-icon': { color: theme.palette.success.main }
                              }}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2" fontWeight="medium">
                              {item.total_objects}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2">
                              {item.total_frames}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {formatDate(item.timestamp)}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Box>
                              <Tooltip title="View tracking details">
                                <IconButton 
                                  component={Link}
                                  to={`/tracking-details/${item.video_id}`}
                                  size="small"
                                  color="primary"
                                >
                                  <ViewIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                          {searchTerm ? 'Không tìm thấy kết quả phù hợp' : 'Không có dữ liệu lịch sử tracking'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              
              <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={filteredHistory.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="Hiển thị:"
              />
            </>
          )}
        </Paper>
      </motion.div>
    </Container>
  );
};

export default TrackingHistory;