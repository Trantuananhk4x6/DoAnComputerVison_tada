import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Divider,
  Card,
  CardContent,
  CardMedia,
  Button,
  CircularProgress,
  useTheme,
  Alert
} from '@mui/material';
import {
  PeopleOutline,
  Pets,
  Storage,
  Movie,
  Timeline,
  InsertChart,
  PlayArrow
} from '@mui/icons-material';
import axios from 'axios';
import { API_ENDPOINTS } from '../utils/constants';
import { formatFileSize, formatDate } from '../utils/formatters';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement,
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { 
      type: 'spring',
      stiffness: 100,
      damping: 15 
    }
  }
};

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const theme = useTheme();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get(API_ENDPOINTS.DASHBOARD_STATS);
        console.log('Dashboard stats:', response.data);
        
        setStats(response.data);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(`Failed to load dashboard data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  // Prepare chart data
  const prepareDetectionChart = () => {
    if (!stats?.detections?.by_class) return null;
    
    const data = {
      labels: Object.keys(stats.detections.by_class),
      datasets: [
        {
          label: 'Detection count',
          data: Object.values(stats.detections.by_class),
          backgroundColor: Object.keys(stats.detections.by_class).map(className => {
            const lowerClass = className.toLowerCase();
            if (lowerClass.includes('person')) return theme.palette.error.main;
            if (lowerClass.includes('animal') || lowerClass.includes('dog') || lowerClass.includes('cat')) {
              return theme.palette.success.main;
            }
            return theme.palette.info.main;
          }),
          borderWidth: 1
        }
      ]
    };
    
    return data;
  };
  
  const prepareHistoryChart = () => {
    if (!stats?.history || stats.history.length === 0) return null;
    
    return {
      labels: stats.history.map(item => item.date),
      datasets: [
        {
          label: 'Người',
          data: stats.history.map(item => item.person_count),
          borderColor: theme.palette.error.main,
          backgroundColor: `${theme.palette.error.main}80`,
          tension: 0.4
        },
        {
          label: 'Động vật',
          data: stats.history.map(item => item.animal_count),
          borderColor: theme.palette.success.main,
          backgroundColor: `${theme.palette.success.main}80`,
          tension: 0.4
        }
      ]
    };
  };
  
  const preparePieChart = () => {
    if (!stats) return null;
    
    return {
      labels: ['Người', 'Động vật'],
      datasets: [
        {
          data: [stats.detections.people || 0, stats.detections.animals || 0],
          backgroundColor: [theme.palette.error.main, theme.palette.success.main],
          borderColor: [theme.palette.error.dark, theme.palette.success.dark],
          borderWidth: 1
        }
      ]
    };
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
          <InsertChart sx={{ mr: 2 }} />
          Dashboard
        </Typography>
      </motion.div>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress size={60} thickness={4} />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Stats overview */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <motion.div variants={itemVariants}>
                <Paper 
                  elevation={0} 
                  sx={{ 
                    p: 3, 
                    height: '100%',
                    borderRadius: 2,
                    bgcolor: `${theme.palette.primary.main}10`,
                    border: `1px solid ${theme.palette.primary.main}40`,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <Box sx={{ display: 'flex', mb: 2, alignItems: 'center' }}>
                    <Box
                      sx={{
                        p: 1.5,
                        backgroundColor: `${theme.palette.primary.main}20`,
                        borderRadius: 2,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        mr: 2
                      }}
                    >
                      <Movie sx={{ color: theme.palette.primary.main, fontSize: 30 }} />
                    </Box>
                    <Typography color="text.secondary" variant="subtitle2">
                      Video Đã Xử Lý
                    </Typography>
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {stats.videos.total || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {stats.videos.recent_week || 0} video trong tuần qua
                  </Typography>
                </Paper>
              </motion.div>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <motion.div variants={itemVariants}>
                <Paper 
                  elevation={0} 
                  sx={{ 
                    p: 3, 
                    height: '100%',
                    borderRadius: 2,
                    bgcolor: `${theme.palette.error.main}10`,
                    border: `1px solid ${theme.palette.error.main}40`,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <Box sx={{ display: 'flex', mb: 2, alignItems: 'center' }}>
                    <Box
                      sx={{
                        p: 1.5,
                        backgroundColor: `${theme.palette.error.main}20`,
                        borderRadius: 2,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        mr: 2
                      }}
                    >
                      <PeopleOutline sx={{ color: theme.palette.error.main, fontSize: 30 }} />
                    </Box>
                    <Typography color="text.secondary" variant="subtitle2">
                      Người Đã Phát Hiện
                    </Typography>
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {stats.detections.people || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Qua {stats.videos.total || 0} video đã xử lý
                  </Typography>
                </Paper>
              </motion.div>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <motion.div variants={itemVariants}>
                <Paper 
                  elevation={0} 
                  sx={{ 
                    p: 3, 
                    height: '100%',
                    borderRadius: 2,
                    bgcolor: `${theme.palette.success.main}10`,
                    border: `1px solid ${theme.palette.success.main}40`,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <Box sx={{ display: 'flex', mb: 2, alignItems: 'center' }}>
                    <Box
                      sx={{
                        p: 1.5,
                        backgroundColor: `${theme.palette.success.main}20`,
                        borderRadius: 2,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        mr: 2
                      }}
                    >
                      <Pets sx={{ color: theme.palette.success.main, fontSize: 30 }} />
                    </Box>
                    <Typography color="text.secondary" variant="subtitle2">
                      Động Vật Đã Phát Hiện
                    </Typography>
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {stats.detections.animals || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Qua {stats.videos.total || 0} video đã xử lý
                  </Typography>
                </Paper>
              </motion.div>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <motion.div variants={itemVariants}>
                <Paper 
                  elevation={0} 
                  sx={{ 
                    p: 3, 
                    height: '100%',
                    borderRadius: 2,
                    bgcolor: `${theme.palette.warning.main}10`,
                    border: `1px solid ${theme.palette.warning.main}40`,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <Box sx={{ display: 'flex', mb: 2, alignItems: 'center' }}>
                    <Box
                      sx={{
                        p: 1.5,
                        backgroundColor: `${theme.palette.warning.main}20`,
                        borderRadius: 2,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        mr: 2
                      }}
                    >
                      <Storage sx={{ color: theme.palette.warning.main, fontSize: 30 }} />
                    </Box>
                    <Typography color="text.secondary" variant="subtitle2">
                      Dung Lượng Lưu Trữ
                    </Typography>
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {stats.storage.used_formatted}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Đã sử dụng cho {stats.videos.total || 0} video
                  </Typography>
                </Paper>
              </motion.div>
            </Grid>
          </Grid>

          <Grid container spacing={4}>
            {/* Chart section */}
            <Grid item xs={12} md={8}>
              <motion.div variants={itemVariants}>
                <Paper 
                  elevation={0} 
                  sx={{ 
                    p: 3, 
                    borderRadius: 2, 
                    height: '100%',
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                    border: '1px solid',
                    borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Timeline sx={{ mr: 1.5, color: theme.palette.primary.main }} />
                    <Typography variant="h6">Phân tích theo thời gian</Typography>
                  </Box>
                  
                  {stats?.history?.length > 0 ? (
                    <Box sx={{ height: 300 }}>
                      <Line
                        data={prepareHistoryChart()}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          scales: {
                            y: {
                              beginAtZero: true,
                              title: {
                                display: true,
                                text: 'Số lượng phát hiện'
                              }
                            }
                          },
                          plugins: {
                            legend: {
                              position: 'top',
                            },
                            title: {
                              display: false,
                            },
                          },
                        }}
                      />
                    </Box>
                  ) : (
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'center', 
                      alignItems: 'center', 
                      height: 300,
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                      borderRadius: 2
                    }}>
                      <Typography color="text.secondary">
                        Chưa có đủ dữ liệu để hiển thị biểu đồ
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </motion.div>
            </Grid>
            
            {/* Pie chart */}
            <Grid item xs={12} md={4}>
              <motion.div variants={itemVariants}>
                <Paper 
                  elevation={0} 
                  sx={{ 
                    p: 3, 
                    borderRadius: 2, 
                    height: '100%',
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                    border: '1px solid',
                    borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <PieChart sx={{ mr: 1.5, color: theme.palette.primary.main }} />
                    <Typography variant="h6">Phân bố phát hiện</Typography>
                  </Box>
                  
                  <Box sx={{ height: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    {preparePieChart() ? (
                      <Pie
                        data={preparePieChart()}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'bottom',
                            }
                          }
                        }}
                      />
                    ) : (
                      <Typography color="text.secondary">
                        Không có dữ liệu
                      </Typography>
                    )}
                  </Box>
                </Paper>
              </motion.div>
            </Grid>
            
            {/* Recent videos */}
            <Grid item xs={12}>
              <motion.div variants={itemVariants}>
                <Paper 
                  elevation={0} 
                  sx={{ 
                    p: 3, 
                    borderRadius: 2,
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                    border: '1px solid',
                    borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Movie sx={{ mr: 1.5, color: theme.palette.primary.main }} />
                    <Typography variant="h6">Videos gần đây</Typography>
                  </Box>
                  
                  <Grid container spacing={3}>
                    {stats?.videos?.recent_list?.length > 0 ? (
                      stats.videos.recent_list.map((video, index) => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                          <Card sx={{ 
                            overflow: 'hidden', 
                            borderRadius: 2,
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              boxShadow: '0px 6px 12px rgba(0,0,0,0.15)',
                              transform: 'translateY(-4px)'
                            }
                          }}>
                            <CardMedia
                              component="img"
                              height="160"
                              image={video.thumbnail || '/static/video-placeholder.jpg'}
                              alt={video.name}
                              sx={{ objectFit: 'cover' }}
                            />
                            <CardContent sx={{ pb: 1 }}>
                              <Typography variant="subtitle1" noWrap gutterBottom>
                                {video.name}
                              </Typography>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                                  <PeopleOutline fontSize="small" sx={{ mr: 0.5 }} />
                                  {video.person_count}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                                  <Pets fontSize="small" sx={{ mr: 0.5 }} />
                                  {video.animal_count}
                                </Typography>
                              </Box>
                              <Typography variant="caption" color="text.secondary" display="block">
                                {formatDate(video.processed_at)}
                              </Typography>
                            </CardContent>
                            <Box sx={{ p: 1 }}>
                              <Button 
                                size="small" 
                                startIcon={<PlayArrow />}
                                fullWidth 
                                variant="text"
                                color="primary"
                                onClick={() => { /* Navigate to video view */ }}
                              >
                                Xem video
                              </Button>
                            </Box>
                          </Card>
                        </Grid>
                      ))
                    ) : (
                      <Grid item xs={12}>
                        <Box sx={{ 
                          p: 4, 
                          textAlign: 'center', 
                          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                          borderRadius: 2
                        }}>
                          <Typography color="text.secondary">
                            Chưa có video nào được xử lý
                          </Typography>
                        </Box>
                      </Grid>
                    )}
                  </Grid>
                </Paper>
              </motion.div>
            </Grid>
            
            {/* Detection stats */}
            <Grid item xs={12}>
              <motion.div variants={itemVariants}>
                <Paper 
                  elevation={0} 
                  sx={{ 
                    p: 3, 
                    borderRadius: 2,
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                    border: '1px solid',
                    borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <InsertChart sx={{ mr: 1.5, color: theme.palette.primary.main }} />
                    <Typography variant="h6">Phân loại đối tượng phát hiện</Typography>
                  </Box>
                  
                  <Box sx={{ height: 300 }}>
                    {prepareDetectionChart() ? (
                      <Bar
                        data={prepareDetectionChart()}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          scales: {
                            y: {
                              beginAtZero: true,
                              title: {
                                display: true,
                                text: 'Số lượng'
                              }
                            },
                            x: {
                              title: {
                                display: true,
                                text: 'Loại đối tượng'
                              }
                            }
                          },
                          plugins: {
                            legend: {
                              display: false
                            },
                          },
                        }}
                      />
                    ) : (
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        height: '100%',
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                        borderRadius: 2
                      }}>
                        <Typography color="text.secondary">
                          Không có dữ liệu phát hiện để hiển thị
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Paper>
              </motion.div>
            </Grid>
          </Grid>
        </motion.div>
      )}
    </Container>
  );
};

function PieChart(props) {
  return <InsertChart {...props} />;
}

export default Dashboard;