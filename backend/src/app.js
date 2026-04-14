const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
require('dotenv').config();
const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173'
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Test route
app.get('/api/test', (req, res) => {
  res.json({ success: true, message: 'Server is working' });
});

// Routes
const authRoutes = require('./routes/auth.route');
const roomRoutes = require('./routes/room.route');

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handling middleware (must be last)
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

module.exports = app;