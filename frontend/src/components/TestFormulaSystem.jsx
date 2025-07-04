import React, { useState } from 'react';
import { Container, Typography, Box } from '@mui/material';
import TrackingDataTable from './TrackingDataTable';

const TestFormulaSystem = () => {
  // Sample tracking data for testing
  const [tracks] = useState({
    '001': {
      class: 'person',
      first_frame: 10,
      last_frame: 50,
      confidence: 0.95
    },
    '002': {
      class: 'car',
      first_frame: 20,
      last_frame: 80,
      confidence: 0.87
    },
    '003': {
      class: 'person',
      first_frame: 5,
      last_frame: 120,
      confidence: 0.92
    }
  });

  const totalFrames = 150;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Formula System Test
      </Typography>
      
      <Box sx={{ mb: 4 }}>
        <Typography variant="body1" paragraph>
          This page demonstrates the new formula system for adding custom columns to the tracking data table.
        </Typography>
        
        <Typography variant="body2" color="text.secondary">
          Try adding a custom column with formulas like:
        </Typography>
        <Box component="ul" sx={{ mt: 1 }}>
          <Box component="li">
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
              =SUM([Start Frame]:[End Frame])
            </Typography>
          </Box>
          <Box component="li">
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
              =IF([Duration] > 100, "Long", "Short")
            </Typography>
          </Box>
          <Box component="li">
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
              =[End Frame] - [Start Frame]
            </Typography>
          </Box>
        </Box>
      </Box>

      <TrackingDataTable tracks={tracks} totalFrames={totalFrames} />
    </Container>
  );
};

export default TestFormulaSystem;