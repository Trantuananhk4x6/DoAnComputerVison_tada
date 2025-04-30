import { io } from 'socket.io-client';

// Cấu hình Socket.io client
let socket;

// Hàm này sẽ khởi tạo kết nối socket hoặc trả về kết nối hiện có
export const getSocket = () => {
  if (!socket) {
    // Lấy URL từ window.location để đảm bảo cùng domain
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.hostname;
    const port = process.env.NODE_ENV === 'development' ? ':5000' : window.location.port ? `:${window.location.port}` : '';
    
    const socketUrl = `${protocol === 'wss' ? 'https' : 'http'}://${host}${port}`;
    
    console.log(`Connecting to Socket.IO at: ${socketUrl}`);
    
    socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      autoConnect: false,
    });
    
    // Xử lý sự kiện connect
    socket.on('connect', () => {
      console.log('Socket.IO connected');
    });
    
    // Xử lý sự kiện disconnect
    socket.on('disconnect', (reason) => {
      console.log(`Socket.IO disconnected: ${reason}`);
    });
    
    // Xử lý lỗi kết nối
    socket.on('connect_error', (error) => {
      console.error(`Socket.IO connection error: ${error.message}`);
    });
    
    // Kết nối chỉ khi cần thiết
    try {
      socket.connect();
    } catch (error) {
      console.error('Failed to initialize socket connection:', error);
    }
  }
  
  return socket;
};

// Hàm tắt kết nối socket
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Hàm này kiểm tra kết nối và kết nối lại nếu cần
export const ensureSocketConnection = () => {
  try {
    const socket = getSocket();
    if (!socket.connected) {
      socket.connect();
    }
    return socket;
  } catch (error) {
    console.error('Error ensuring socket connection:', error);
    return null;
  }
};