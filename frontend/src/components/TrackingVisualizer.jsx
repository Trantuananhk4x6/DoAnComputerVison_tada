import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, Slider, Paper, useTheme, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { PeopleOutline, Pets } from '@mui/icons-material';
import { motion } from 'framer-motion';

const TrackingVisualizer = ({ tracks, totalFrames }) => {
  const canvasRef = useRef(null);
  const [frame, setFrame] = useState(0);
  const [filter, setFilter] = useState('all'); // 'all', 'person', 'animal'
  const theme = useTheme();
  
  const handleFilterChange = (event, newFilter) => {
    if (newFilter !== null) {
      setFilter(newFilter);
    }
  };
  
  useEffect(() => {
    if (!canvasRef.current || !tracks || Object.keys(tracks).length === 0 || !totalFrames) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw background
    ctx.fillStyle = theme.palette.mode === 'dark' ? '#333' : '#f5f5f5';
    ctx.fillRect(0, 0, width, height);
    
    // Draw timeline markers
    const numMarkers = 10;
    ctx.strokeStyle = theme.palette.mode === 'dark' ? '#666' : '#ccc';
    ctx.fillStyle = theme.palette.mode === 'dark' ? '#aaa' : '#888';
    ctx.textAlign = 'center';
    ctx.font = '10px Arial';
    
    for (let i = 0; i <= numMarkers; i++) {
      const x = (width * i) / numMarkers;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      
      // Add frame number label
      const frameNum = Math.floor((totalFrames * i) / numMarkers);
      ctx.fillText(frameNum, x, height - 5);
    }
    
    // Draw current frame marker
    const currentX = (frame / totalFrames) * width;
    ctx.strokeStyle = theme.palette.primary.main;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(currentX, 0);
    ctx.lineTo(currentX, height);
    ctx.stroke();
    
    // Map frame index to x position
    const frameToX = (frameNum) => (frameNum / totalFrames) * width;
    
    // Draw tracks
    Object.entries(tracks).forEach(([trackId, trackData], index) => {
      // Get track info
      const className = trackData.class?.toLowerCase() || '';
      const isAnimal = className.includes('animal') || 
                       className.includes('dog') || 
                       className.includes('cat');
      const isPerson = className.includes('person');
      
      // Apply filter
      if (filter === 'person' && !isPerson) return;
      if (filter === 'animal' && !isAnimal) return;
      
      // Determine color
      let color;
      if (isAnimal) {
        color = theme.palette.success.main; // Green for animals
      } else if (isPerson) {
        color = theme.palette.error.main; // Red for people
      } else {
        color = theme.palette.info.main; // Blue for other objects
      }
      
      // Draw track line
      const startX = frameToX(trackData.first_frame);
      const endX = frameToX(trackData.last_frame);
      const y = 20 + (index % 15) * 15; // Space tracks vertically
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
      
      // Highlight if track is active at current frame
      if (frame >= trackData.first_frame && frame <= trackData.last_frame) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(frameToX(frame), y, 5, 0, 2 * Math.PI);
        ctx.fill();
      }
      
      // Draw track ID
      ctx.font = '10px Arial';
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.fillText(`ID:${trackId} (${trackData.class})`, startX + 2, y - 5);
    });
    
  }, [tracks, totalFrames, frame, filter, theme]);
  
  const handleSliderChange = (event, newValue) => {
    setFrame(newValue);
  };
  
  return (
    <Paper 
      elevation={0} 
      sx={{ 
        p: 3, 
        mb: 4,
        borderRadius: 2,
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
        border: '1px solid',
        borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, justifyContent: 'space-between' }}>
        <Typography variant="h6" component="h3">
          Visualization of Tracking
        </Typography>
        
        <ToggleButtonGroup
          value={filter}
          exclusive
          onChange={handleFilterChange}
          size="small"
        >
          <ToggleButton value="all">
            All
          </ToggleButton>
          <ToggleButton value="person">
            <PeopleOutline sx={{ mr: 0.5 }} /> People
          </ToggleButton>
          <ToggleButton value="animal">
            <Pets sx={{ mr: 0.5 }} /> Animals
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
      
      <Box sx={{ position: 'relative', mb: 3 }}>
        <canvas 
          ref={canvasRef}
          width={800}
          height={300}
          style={{ width: '100%', height: 'auto', borderRadius: 4 }}
        />
      </Box>
      
      <Box sx={{ px: 2 }}>
        <Typography id="frame-slider" gutterBottom>
          Frame: {frame} / {totalFrames}
        </Typography>
        <Slider
          value={frame}
          onChange={handleSliderChange}
          aria-labelledby="frame-slider"
          valueLabelDisplay="auto"
          min={0}
          max={totalFrames || 100}
          sx={{ color: theme.palette.primary.main }}
        />
      </Box>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Legend: <span style={{ color: theme.palette.error.main }}>● People</span> | 
          <span style={{ color: theme.palette.success.main }}> ● Animals</span> |
          <span style={{ color: theme.palette.info.main }}> ● Other</span>
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Total tracks: {tracks ? Object.keys(tracks).length : 0}
        </Typography>
      </Box>
    </Paper>
  );
};

export default TrackingVisualizer;