const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User.model');

// Generate Access Token (short-lived, in memory)
const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, username: user.username, email: user.email },
    process.env.JWT_SECRET || 'your-secret-key',
    {
      expiresIn: process.env.JWT_EXPIRATION || '24h',
    }
  );
};

// Generate Refresh Token (long-lived, in cookies)
const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET || 'your-refresh-secret', {
    expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
  });
};

// @route   POST /api/auth/register
// @desc    Register a user (deprecated - use send-otp and verify-otp)
// @access  Public
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'Email or username already in use',
      });
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password,
    });

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token to database
    user.refreshToken = refreshToken;
    await user.save();

    // Set refresh token in secure httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production" ? true : false,
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      accessToken,
      user: {
        id: user._id,
        _id: user._id, // --> new line
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token to database
    user.refreshToken = refreshToken;
    await user.save();

    // Set refresh token in secure httpOnly cookie

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production" ? true : false,
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({
      success: true,
      message: 'User logged in successfully',
      accessToken,
      user: {
        _id: user._id,
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @route   GET /api/auth/me
// @desc    Get current logged in user
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
exports.logout = async (req, res) => {
  try {
    // Clear refresh token from database
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { refreshToken: null },
      { new: true }
    );

    // Clear refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production" ? true : false,
    });

    res.status(200).json({
      success: true,
      message: 'User logged out successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @route   POST /api/auth/refresh
// @desc    Refresh access token
// @access  Public
exports.refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'No refresh token provided',
      });
    }

    try {
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || 'your-refresh-secret'
      );

      // Fetch user data and verify refresh token matches DB
      const user = await User.findById(decoded.id).select('+refreshToken');
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found',
        });
      }

      // Verify the refresh token in DB matches the one provided
      if (user.refreshToken !== refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token',
        });
      }

      // Generate new access token
      const accessToken = generateAccessToken(user);

      res.status(200).json({
        success: true,
        accessToken,
        user: {
          id: user._id,
          _id: user._id,
          username: user.username,
          email: user.email,
        },
      });
    } catch (error) {
      res.clearCookie('refreshToken');
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @route   POST /api/auth/verify-session
// @desc    Verify session and restore user from refresh token (for page reload)
// @access  Public
exports.verifySession = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'No refresh token found',
      });
    }

    try {
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || 'your-refresh-secret'
      );

      // Fetch user data and verify refresh token matches DB
      const user = await User.findById(decoded.id).select('+refreshToken');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found',
        });
      }

      // Verify the refresh token in DB matches the cookie token
      if (user.refreshToken !== refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token',
        });
      }

      // Generate new access token
      const accessToken = generateAccessToken(user);

      // Return user data and new access token
      res.status(200).json({
        success: true,
        accessToken,
        user: {
          id: user._id,
          _id: user._id,
          username: user.username,
          email: user.email,
        },
      });
    } catch (error) {
      console.error('Session verification error:', error.message);
      res.clearCookie('refreshToken');
      return res.status(401).json({
        success: false,
        message: 'Session verification failed',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
