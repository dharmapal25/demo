import io from 'socket.io-client';

const socketURL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'https://chatroom-hub-server.onrender.com';
let socket = null;

// Initialize Socket.IO connection
export const initializeSocket = () => {
  if (socket) return socket;

  socket = io(socketURL, {
    transports: ['websocket', 'polling'],
    withCredentials: true,
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  return socket;
};

// Get socket instance
export const getSocket = () => {
  if (!socket) {
    return initializeSocket();
  }
  return socket;
};

// Join room
export const joinRoom = (roomId, userId, username) => {
  const socket = getSocket();
  socket.emit('join-room', { roomId, userId, username });
};

// Leave room
export const leaveRoom = (roomId, userId, username) => {
  const socket = getSocket();
  socket.emit('leave-room', { roomId, userId, username });
};

// Send message
export const sendMessage = (roomId, userId, username, text) => {
  const socket = getSocket();
  socket.emit('send-message', { roomId, userId, username, text });
};

// Typing indicator
export const userTyping = (roomId, username) => {
  const socket = getSocket();
  socket.emit('user-typing', { roomId, username });
};

export const userStoppedTyping = (roomId, username) => {
  const socket = getSocket();
  socket.emit('user-stopped-typing', { roomId, username });
};

// Listen for messages
export const onMessageReceived = (callback) => {
  const socket = getSocket();
  socket.on('message-received', callback);
};

// Listen for user joined
export const onUserJoined = (callback) => {
  const socket = getSocket();
  socket.on('user-joined', callback);
};

// Listen for user left
export const onUserLeft = (callback) => {
  const socket = getSocket();
  socket.on('user-left', callback);
};

// Listen for typing
export const onUserTyping = (callback) => {
  const socket = getSocket();
  socket.on('user-typing', callback);
};

export const onUserStoppedTyping = (callback) => {
  const socket = getSocket();
  socket.on('user-stopped-typing', callback);
};

// Listen for new join requests (admin notification)
export const onNewJoinRequest = (callback) => {
  const socket = getSocket();
  socket.on('newJoinRequest', callback);
};

// Listen for request approval
export const onRequestApproved = (callback) => {
  const socket = getSocket();
  socket.on('joinRequestApproved', callback);
};

// Listen for request rejection
export const onRequestRejected = (callback) => {
  const socket = getSocket();
  socket.on('joinRequestRejected', callback);
};

// Disconnect socket
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
