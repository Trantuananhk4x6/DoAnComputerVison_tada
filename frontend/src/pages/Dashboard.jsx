import React, { useState, useEffect } from 'react';
import { Grid, Paper, Typography, Box, Card, CardContent, CardMedia } from '@mui/material';
import { styled } from '@mui/material/styles';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import PetsIcon from '@mui/icons-material/Pets';
import PersonIcon from '@mui/icons-material/Person';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { Line } from 'react-chartjs-2';
import axios from 'axios';
import { API_URL } from '../config';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  borderRadius: theme.spacing(2),
  overflow: 'hidden',
  transition: 'transform 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-5px)',
  },
}));

const StatBox = styled(Box)(({ theme, bgcolor }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(3),
  borderRadius: theme.spacing(2),
  backgroundColor: bgcolor,
  color: 'white',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  height: '100%',
}));

const StatIcon = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: '50%',
  backgroundColor: 'rgba(255, 255, 255, 0.2)',
  marginRight: theme.spacing(2),
}));

const FeatureCard = styled(Card)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  borderRadius: theme.spacing(2),
  overflow: 'hidden',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  transition: 'transform 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-5px)',
  },
}));

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalDetections: 0,
    animalDetections: 0,
    personDetections: 0,
    lastDetectionTime: 'No detections yet',
  });
  
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [
      {
        label: 'Animal Detections',
        data: [],
        borderColor: '#ff9800',
        backgroundColor: 'rgba(255, 152, 0, 0.5)',
        fill: true,
      }
    ],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${API_URL}/detections`);
        const detections = response.data;
        
        // Calculate statistics
        const animalCount = detections.length;
        let lastDetectionTime = 'No detections yet';
        
        if (detections.length > 0) {
          lastDetectionTime = new Date(detections[0].timestamp).toLocaleString();
        }
        
        setStats({
          totalDetections: animalCount + 0, // Would add person count here if tracked
          animalDetections: animalCount,
          personDetections: 0, // Placeholder, not currently tracked in DB
          lastDetectionTime,
        });
        
        // Generate chart data - group by hour
        const hourlyData = {};
        const now = new Date();
        // Initialize with empty data for past 24 hours
        for (let i = 23; i >= 0; i--) {
          const hourDate = new Date(now);
          hourDate.setHours(now.getHours() - i);
          const hourKey = hourDate.toISOString().substring(0, 13); // YYYY-MM-DDTHH
          hourlyData[hourKey] = 0;
        }
        
        // Fill in actual detection counts
        detections.forEach(detection => {
          const date = new Date(detection.timestamp);
          if (now.getTime() - date.getTime() <= 24 * 60 * 60 * 1000) { // Within last 24 hours
            const hourKey = date.toISOString().substring(0, 13); // YYYY-MM-DDTHH
            if (hourlyData[hourKey] !== undefined) {
              hourlyData[hourKey]++;
            }
          }
        });
        
        // Format chart data
        const labels = Object.keys(hourlyData).map(hour => {
          return hour.substring(11, 13) + ':00'; // Extract HH from ISO string
        });
        
        const data = Object.values(hourlyData);
        
        setChartData({
          labels,
          datasets: [
            {
              label: 'Animal Detections',
              data,
              borderColor: '#ff9800',
              backgroundColor: 'rgba(255, 152, 0, 0.5)',
              fill: true,
            }
          ],
        });
        
      } catch (error) {
        console.error('Error fetching detection data:', error);
      }
    };
    
    fetchData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchData, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <Grid container spacing={3}>
      {/* Header */}
      <Grid item xs={12}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#3f51b5' }}>
          Detection System Dashboard
        </Typography>
        <Typography variant="body1" gutterBottom sx={{ color: 'text.secondary' }}>
          Monitor animal and person detection statistics and system performance.
        </Typography>
      </Grid>
      
      {/* Stats */}
      <Grid item xs={12} md={3}>
        <StatBox bgcolor="#3f51b5">
          <StatIcon>
            <VideoLibraryIcon fontSize="large" />
          </StatIcon>
          <Box>
            <Typography variant="h4">{stats.totalDetections}</Typography>
            <Typography variant="body2">Total Detections</Typography>
          </Box>
        </StatBox>
      </Grid>
      
      <Grid item xs={12} md={3}>
        <StatBox bgcolor="#ff9800">
          <StatIcon>
            <PetsIcon fontSize="large" />
          </StatIcon>
          <Box>
            <Typography variant="h4">{stats.animalDetections}</Typography>
            <Typography variant="body2">Animal Detections</Typography>
          </Box>
        </StatBox>
      </Grid>
      
      <Grid item xs={12} md={3}>
        <StatBox bgcolor="#f50057">
          <StatIcon>
            <PersonIcon fontSize="large" />
          </StatIcon>
          <Box>
            <Typography variant="h4">{stats.personDetections}</Typography>
            <Typography variant="body2">Person Detections</Typography>
          </Box>
        </StatBox>
      </Grid>
      
      <Grid item xs={12} md={3}>
        <StatBox bgcolor="#4caf50">
          <StatIcon>
            <AccessTimeIcon fontSize="large" />
          </StatIcon>
          <Box>
            <Typography variant="h6" noWrap sx={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {stats.lastDetectionTime}
            </Typography>
            <Typography variant="body2">Last Detection</Typography>
          </Box>
        </StatBox>
      </Grid>
      
      {/* Chart */}
      <Grid item xs={12}>
        <StyledPaper>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'medium' }}>
            Detections Over Last 24 Hours
          </Typography>
          <Box sx={{ height: 300 }}>
            <Line 
              data={chartData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top',
                  },
                  title: {
                    display: false,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      precision: 0
                    }
                  }
                }
              }}
            />
          </Box>
        </StyledPaper>
      </Grid>
      
      {/* Feature Cards */}
      <Grid item xs={12} md={4}>
        <FeatureCard>
          <CardMedia
            component="img"
            height="140"
            image="https://images.unsplash.com/photo-1516035069371-29a1b244cc32?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
            alt="Video Processing"
          />
          <CardContent>
            <Typography gutterBottom variant="h5" component="div">
              Video Processing
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Upload pre-recorded videos for animal and person detection. Process footage and get detailed analysis.
            </Typography>
          </CardContent>
        </FeatureCard>
      </Grid>
      
      <Grid item xs={12} md={4}>
        <FeatureCard>
          <CardMedia
            component="img"
            height="140"
            image="https://images.unsplash.com/photo-1520853504280-249895a87765?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
            alt="Live Detection"
          />
          <CardContent>
            <Typography gutterBottom variant="h5" component="div">
              Live Detection
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Connect to webcam or security cameras for real-time detection and alerts when animals or people are identified.
            </Typography>
          </CardContent>
        </FeatureCard>
      </Grid>
      
      <Grid item xs={12} md={4}>
        <FeatureCard>
          <CardMedia
            component="img"
            height="140"
            image="https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
            alt="Detection History"
          />
          <CardContent>
            <Typography gutterBottom variant="h5" component="div">
              Detection History
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Browse historical detection events with timestamps, confidence scores, and screenshots for comprehensive monitoring.
            </Typography>
          </CardContent>
        </FeatureCard>
      </Grid>
    </Grid>
  );
}