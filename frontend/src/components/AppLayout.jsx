import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
  useMediaQuery,
  Tooltip,
  Avatar,
  Button,
  Menu,
  MenuItem,
  CircularProgress
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Movie as MovieIcon,
  Timeline as TimelineIcon,
  Settings as SettingsIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  ChevronLeft as ChevronLeftIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { API_ENDPOINTS } from '../utils/constants';

const drawerWidth = 240;

const menuVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.2 } }
};

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
};

const AppLayout = ({ toggleTheme, mode }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  const navigate = useNavigate();
  
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);
  const [serverStatus, setServerStatus] = useState('loading'); // 'loading', 'online', 'offline'
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  
  useEffect(() => {
    // Close drawer on mobile when location changes
    if (isMobile) {
      setDrawerOpen(false);
    }
  }, [location, isMobile]);
  
  useEffect(() => {
    // Check server status
    const checkStatus = async () => {
      try {
        const response = await axios.get(API_ENDPOINTS.SERVER_STATUS);
        setServerStatus(response.data?.status === 'online' ? 'online' : 'offline');
      } catch (error) {
        console.error('Server status check failed:', error);
        setServerStatus('offline');
      }
    };
    
    checkStatus();
    
    // Check status every 30 seconds
    const statusInterval = setInterval(checkStatus, 30000);
    
    return () => {
      clearInterval(statusInterval);
    };
  }, []);
  
  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };
  
  const handleUserMenuOpen = (event) => {
    setUserMenuAnchor(event.currentTarget);
  };
  
  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };
  
  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Xử Lý Video', icon: <MovieIcon />, path: '/video-processing' },
    { text: 'Lịch Sử Tracking', icon: <TimelineIcon />, path: '/tracking-history' },
  ];
  
  return (
    <Box sx={{ display: 'flex' }}>
      {/* App Bar */}
      <AppBar 
        position="fixed" 
        sx={{ 
          zIndex: theme.zIndex.drawer + 1,
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          transition: 'width 0.25s ease',
          width: { md: drawerOpen ? `calc(100% - ${drawerWidth}px)` : '100%' }
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            {drawerOpen && !isMobile ? <ChevronLeftIcon /> : <MenuIcon />}
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Object Detection & Tracking
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {/* Server Status indicator */}
            <Box sx={{ mr: 2, display: 'flex', alignItems: 'center' }}>
              {serverStatus === 'loading' ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    bgcolor: serverStatus === 'online' ? 'success.main' : 'error.main',
                    mr: 1
                  }}
                />
              )}
              <Typography variant="caption" color="inherit">
                {serverStatus === 'loading' ? 'Đang kiểm tra...' : 
                  serverStatus === 'online' ? 'Server online' : 'Server offline'}
              </Typography>
            </Box>
            
            {/* Theme toggle */}
            <Tooltip title={`Chuyển sang chế độ ${mode === 'dark' ? 'sáng' : 'tối'}`}>
              <IconButton color="inherit" onClick={toggleTheme} sx={{ mr: 1 }}>
                {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>
            
            {/* User menu */}
            <Button 
              color="inherit" 
              onClick={handleUserMenuOpen}
              startIcon={
                <Avatar 
                  sx={{ width: 28, height: 28 }}
                  alt="User"
                  src="/static/user-avatar.png"
                />
              }
            >
              Admin
            </Button>
            <Menu
              anchorEl={userMenuAnchor}
              open={Boolean(userMenuAnchor)}
              onClose={handleUserMenuClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem onClick={handleUserMenuClose}>Hồ sơ</MenuItem>
              <MenuItem onClick={handleUserMenuClose}>Cài đặt</MenuItem>
              <Divider />
              <MenuItem onClick={handleUserMenuClose}>Đăng xuất</MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
      
      {/* Drawer */}
      <Drawer
        variant={isMobile ? "temporary" : "persistent"}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.default : theme.palette.primary.dark,
            color: theme.palette.mode === 'dark' ? theme.palette.text.primary : theme.palette.primary.contrastText,
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <List component="nav" sx={{ pt: 2 }}>
            <AnimatePresence>
              {menuItems.map((item) => (
                <motion.div
                  key={item.text}
                  variants={menuVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                >
                  <ListItem 
                    button
                    component={Link}
                    to={item.path}
                    selected={location.pathname === item.path}
                    sx={{
                      mb: 0.5,
                      mx: 1,
                      borderRadius: 2,
                      '&.Mui-selected': {
                        backgroundColor: theme.palette.mode === 'dark' 
                          ? 'rgba(255, 255, 255, 0.15)' 
                          : 'rgba(255, 255, 255, 0.25)',
                        '&:hover': {
                          backgroundColor: theme.palette.mode === 'dark' 
                            ? 'rgba(255, 255, 255, 0.25)' 
                            : 'rgba(255, 255, 255, 0.35)',
                        }
                      },
                      '&:hover': {
                        backgroundColor: theme.palette.mode === 'dark' 
                          ? 'rgba(255, 255, 255, 0.1)' 
                          : 'rgba(255, 255, 255, 0.15)',
                      }
                    }}
                  >
                    <ListItemIcon 
                      sx={{ 
                        minWidth: 40,
                        color: theme.palette.mode === 'dark' 
                          ? (location.pathname === item.path ? theme.palette.primary.main : 'inherit')
                          : 'white'
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText primary={item.text} />
                  </ListItem>
                </motion.div>
              ))}
            </AnimatePresence>
          </List>
          
          <Box sx={{ mt: 'auto', p: 2 }}>
            <Typography variant="caption" color="inherit" sx={{ opacity: 0.7 }}>
              YOLOv8 + DeepSORT
            </Typography>
            <Typography variant="body2" color="inherit" sx={{ fontWeight: 'bold' }}>
              Video Analysis System
            </Typography>
          </Box>
        </Box>
      </Drawer>
      
      {/* Main content */}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1,
          width: { md: drawerOpen ? `calc(100% - ${drawerWidth}px)` : '100%' },
          transition: 'width 0.25s ease',
        }}
      >
        <Toolbar />
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{ minHeight: 'calc(100vh - 64px)' }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </Box>
    </Box>
  );
};

export default AppLayout;