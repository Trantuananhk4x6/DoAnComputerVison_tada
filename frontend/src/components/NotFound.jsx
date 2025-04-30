import React from 'react';
import { motion } from 'framer-motion';
import { Typography, Box, Button, Container, Paper } from '@mui/material';
import { Link } from 'react-router-dom';
import { Home as HomeIcon } from '@mui/icons-material';

const NotFound = () => {
  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Paper 
        elevation={0}
        sx={{ 
          p: 5, 
          borderRadius: 4, 
          textAlign: 'center',
          border: '1px dashed rgba(0,0,0,0.12)'
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Typography variant="h1" component="h1" sx={{ fontSize: '6rem', fontWeight: 'bold', mb: 2 }}>
            404
          </Typography>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Typography variant="h4" gutterBottom>
            Trang không tồn tại
          </Typography>
          
          <Typography variant="body1" color="text.secondary" paragraph sx={{ maxWidth: 500, mx: 'auto', mb: 4 }}>
            Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển sang địa chỉ khác.
          </Typography>
          
          <Button 
            component={Link} 
            to="/"
            variant="contained" 
            startIcon={<HomeIcon />}
            size="large"
          >
            Quay về trang chủ
          </Button>
        </motion.div>
      </Paper>
    </Container>
  );
};

export default NotFound;