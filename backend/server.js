const app = require('./src/app');
const connectDB = require('./src/config/db');
const http = require('http');
const socketIo = require('socket.io');
const Message = require('./src/models/Message.model');
const { invalidateRoomMessagesCache } = require('./src/services/redis.service');

const PORT = process.env.PORT || 3000;

// Create HTTP server with Express
const server = http.createServer(app);

// Initialize Socket.IO with CORS
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Store connected users
const connectedUsers = {};
const roomUsers = {};

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Register user
  socket.on('register-user', ({ userId }) => {
    connectedUsers[userId] = socket.id;
    socket.join(`user_${userId}`); // Join user-specific room for personal notifications
    console.log(`User ${userId} registered with socket ${socket.id}`);
  });

  // Join room
  socket.on('join-room', ({ roomId, userId, username }) => {
    socket.join(roomId);

    // Track user in room
    if (!roomUsers[roomId]) {
      roomUsers[roomId] = [];
    }
    roomUsers[roomId].push({ userId, username, socketId: socket.id });

    // Notify other users in room
    socket.to(roomId).emit('user-joined', {
      userId,
      username,
      totalMembers: roomUsers[roomId].length,
    });

    console.log(`User ${username} joined room ${roomId}`);
  });

  // Send message
  socket.on('send-message', async ({ roomId, userId, username, text }) => {
    try {
      // Save message to database
      const message = new Message({
        roomId,
        userId,
        username,
        text,
      });
      await message.save();
      
      // Invalidate messages cache for this room
      await invalidateRoomMessagesCache(roomId);

      // Broadcast to all users in room
      io.to(roomId).emit('message-received', {
        _id: message._id,
        userId,
        username,
        text,
        createdAt: message.createdAt,
      });
    } catch (error) {
      console.error('Error saving message:', error);
      socket.emit('message-error', { message: 'Failed to save message' });
    }
  });

  // Typing indicator
  socket.on('user-typing', ({ roomId, username }) => {
    socket.to(roomId).emit('user-typing', { username });
  });

  socket.on('user-stopped-typing', ({ roomId, username }) => {
    socket.to(roomId).emit('user-stopped-typing', { username });
  });

  // Leave room
  socket.on('leave-room', ({ roomId, userId, username }) => {
    socket.leave(roomId);

    // Remove user from room tracking
    if (roomUsers[roomId]) {
      roomUsers[roomId] = roomUsers[roomId].filter(
        (user) => user.socketId !== socket.id
      );
    }

    // Notify other users
    socket.to(roomId).emit('user-left', {
      userId,
      username,
      totalMembers: roomUsers[roomId]?.length || 0,
    });

    console.log(`User ${username} left room ${roomId}`);
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);

    // Remove user from connected users
    for (const userId in connectedUsers) {
      if (connectedUsers[userId] === socket.id) {
        delete connectedUsers[userId];
        console.log(`User ${userId} removed from connected users`);
        break;
      }
    }

    // Remove user from all rooms
    for (const roomId in roomUsers) {
      const userIndex = roomUsers[roomId].findIndex(
        (user) => user.socketId === socket.id
      );
      if (userIndex !== -1) {
        const user = roomUsers[roomId][userIndex];
        roomUsers[roomId].splice(userIndex, 1);

        io.to(roomId).emit('user-left', {
          userId: user.userId,
          username: user.username,
          totalMembers: roomUsers[roomId].length,
        });
      }
    }
  });
});

// Make Socket.IO instance available to Express routes/controllers
app.set('io', io);

// Connect to MongoDB
connectDB();

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Socket.IO server listening on ws://localhost:${PORT}`);
});