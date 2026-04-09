const { cacheRoomMessages, getCachedRoomMessages, invalidateRoomMessagesCache } = require('../services/redis.service');

// Create a new room
const createRoom = async (req, res) => {
  try {
    const { name, description, maxMembers, isPrivate } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!name || name.trim().length < 3) {
      return res.status(400).json({ message: 'Room name must be at least 3 characters' });
    }

    // Create room
    const room = new Room({
      name: name.trim(),
      description: description?.trim() || '',
      owner: userId,
      members: [userId],
      maxMembers: maxMembers || 20,
      isPrivate: isPrivate || false,
    });

    await room.save();
    await room.populate('owner', 'username email');
    await room.populate('members', 'username');
    
    // Invalidate rooms list cache
    await deleteCachePattern('rooms:list:*');

    res.status(201).json({
      message: 'Room created successfully',
      room,
    });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ message: 'Failed to create room', error: error.message });
  }
};

// Get all rooms (public and private)
const getAllRooms = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    
    // Create cache key
    const cacheKey = `rooms:list:${search || 'all'}:${page}:${limit}`;
    
    // Check cache first
    const cachedRooms = await getCache(cacheKey);
    if (cachedRooms) {
      return res.json(cachedRooms);
    }

    let query = {};

    // Search functionality
    if (search) {
      query.$text = { $search: search };
    }

    const rooms = await Room.find(query)
      .populate('owner', 'username')
      .populate('members', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Room.countDocuments(query);

    const response = {
      message: 'Rooms retrieved successfully',
      rooms,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    };
    
    // Cache the response
    await setCache(cacheKey, response, CACHE_TTL.ROOMS_LIST);

    res.json(response);
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ message: 'Failed to retrieve rooms', error: error.message });
  }
};

// Get single room
const getRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    
    // Check cache first
    const cachedRoom = await getCache(`room:${roomId}`);
    if (cachedRoom) {
      return res.json(cachedRoom);
    }

    const room = await Room.findById(roomId)
      .populate('owner', 'username email')
      .populate('members', 'username email');

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const response = {
      message: 'Room retrieved successfully',
      room,
    };
    
    // Cache the response
    await setCache(`room:${roomId}`, response, CACHE_TTL.ROOM);

    res.json(response);
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({ message: 'Failed to retrieve room', error: error.message });
  }
};

// Join room - Create join request instead of direct join
const joinRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if room is full
    if (room.members.length >= room.maxMembers) {
      return res.status(400).json({ message: 'Room is full. No more members can join.' });
    }

    // Check if user is already a member (handle both string and ObjectId)
    const isMember = room.members.some(
      (member) => member.toString() === userId.toString()
    );

    if (isMember) {
      return res.status(400).json({ message: 'You are already a member of this room' });
    }

    // Check if request already exists
    const existingRequest = await JoinRequest.findOne({
      roomId,
      userId,
      status: 'pending',
    });

    if (existingRequest) {
      return res.status(400).json({ message: 'You already have a pending join request' });
    }

    // Create join request
    const joinRequest = new JoinRequest({
      roomId,
      userId,
      username: req.user.username,
      email: req.user.email,
      status: 'pending',
    });

    await joinRequest.save();

    // Emit Socket.IO notification to room admin BEFORE response
    const io = req.app.get('io');
    if (io) {
      try {
        io.to(`user_${room.owner}`).emit('newJoinRequest', {
          requestId: joinRequest._id,
          roomId: room._id,
          roomName: room.name,
          userId: joinRequest.userId,
          username: joinRequest.username,
          email: joinRequest.email,
          message: `${joinRequest.username} has requested to join "${room.name}"`,
        });
      } catch (socketError) {
        console.error('Socket.IO error:', socketError);
      }
    }

    res.status(201).json({
      message: 'Join request sent to room admin',
      request: joinRequest,
    });
  } catch (error) {
    console.error('Join room error:', error);
    res.status(500).json({ message: 'Failed to join room', error: error.message });
  }
};


// Leave room
const leaveRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if user is a member
    if (!room.members.includes(userId)) {
      return res.status(400).json({ message: 'You are not a member of this room' });
    }

    // Cannot leave if owner (owner can only delete)
    if (room.owner.toString() === userId) {
      return res.status(400).json({ message: 'Owner cannot leave room. Delete room instead.' });
    }

    // Remove user from members
    room.members = room.members.filter((id) => id.toString() !== userId);
    await room.save();

    res.json({
      message: 'Left room successfully',
      room,
    });
  } catch (error) {
    console.error('Leave room error:', error);
    res.status(500).json({ message: 'Failed to leave room', error: error.message });
  }
};

// Delete room (owner only)
const deleteRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if user is owner
    if (room.owner.toString() !== userId) {
      return res.status(403).json({ message: 'Only room owner can delete room' });
    }

    // Delete all messages in the room
    await Message.deleteMany({ roomId });

    // Delete the room
    await Room.findByIdAndDelete(roomId);

    res.json({
      message: 'Room deleted successfully',
    });
  } catch (error) {
    console.error('Delete room error:', error);
    res.status(500).json({ message: 'Failed to delete room', error: error.message });
  }
};

// Get room messages
const getRoomMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    // Check cache first (only for first page to ensure realtime updates)
    if (page === 1) {
      const cachedMessages = await getCachedRoomMessages(roomId);
      if (cachedMessages) {
        return res.json(cachedMessages);
      }
    }
    
    const skip = (page - 1) * limit;

    // Verify room exists
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const messages = await Message.find({ roomId })
      .populate('userId', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Message.countDocuments({ roomId });

    const response = {
      message: 'Messages retrieved successfully',
      messages: messages.reverse(), // Return in chronological order
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    };
    
    // Cache only first page
    if (page === 1) {
      await cacheRoomMessages(roomId, response);
    }

    res.json(response);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Failed to retrieve messages', error: error.message });
  }
};

// Approve a join request - Admin only
const approveRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const adminId = req.user.id;

    // Find the request
    const joinRequest = await JoinRequest.findById(requestId);
    if (!joinRequest) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Verify the user is the room admin
    const room = await Room.findById(joinRequest.roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (room.owner.toString() !== adminId) {
      return res.status(403).json({ message: 'Only room admin can approve requests' });
    }

    // Check if room is full
    if (room.members.length >= room.maxMembers) {
      // Delete the request
      await JoinRequest.findByIdAndDelete(requestId);
      return res.status(400).json({ message: 'Room is full. Cannot approve this request.' });
    }

    // Add user to room members
    if (!room.members.includes(joinRequest.userId)) {
      room.members.push(joinRequest.userId);
      await room.save();
      
      // Invalidate room cache
      await deleteCache(`room:${joinRequest.roomId}`);
      await deleteCachePattern('rooms:list:*');
    }

    // Delete the request
    await JoinRequest.findByIdAndDelete(requestId);

    // Emit Socket.IO notification to the approved user
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${joinRequest.userId}`).emit('joinRequestApproved', {
        roomId: room._id,
        roomName: room.name,
        message: `Your request to join "${room.name}" has been approved!`,
      });
    }

    res.json({ 
      message: 'Request approved successfully',
      roomId: room._id,
      userId: joinRequest.userId,
    });
  } catch (error) {
    console.error('Approve request error:', error);
    res.status(500).json({ message: 'Failed to approve request', error: error.message });
  }
};

// Reject a join request - Admin only
const rejectRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const adminId = req.user.id;
    const { reason } = req.body; // Optional rejection reason

    // Find the request
    const joinRequest = await JoinRequest.findById(requestId);
    if (!joinRequest) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Verify the user is the room admin
    const room = await Room.findById(joinRequest.roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (room.owner.toString() !== adminId) {
      return res.status(403).json({ message: 'Only room admin can reject requests' });
    }

    // Update request status to rejected
    joinRequest.status = 'rejected';
    await joinRequest.save();

    // Emit Socket.IO notification to the rejected user
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${joinRequest.userId}`).emit('joinRequestRejected', {
        roomId: room._id,
        roomName: room.name,
        reason: reason || 'Your request was rejected by the admin',
      });
    }

    res.json({ 
      message: 'Request rejected successfully',
      roomId: room._id,
      userId: joinRequest.userId,
    });
  } catch (error) {
    console.error('Reject request error:', error);
    res.status(500).json({ message: 'Failed to reject request', error: error.message });
  }
};

// Get all pending requests for a room (admin only)
const getPendingRequests = async (req, res) => {
  try {
    const { roomId } = req.params;
    const adminId = req.user.id;

    // Verify the user is the room admin
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (room.owner.toString() !== adminId) {
      return res.status(403).json({ message: 'Only room admin can view requests' });
    }

    // Get all pending requests for this room
    const requests = await JoinRequest.find({
      roomId: roomId,
      status: 'pending',
    }).sort({ createdAt: -1 });

    res.json({
      message: 'Pending requests retrieved successfully',
      requests,
    });
  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({ message: 'Failed to retrieve requests', error: error.message });
  }
};

module.exports = {
  createRoom,
  getAllRooms,
  getRoom,
  joinRoom,
  leaveRoom,
  deleteRoom,
  getRoomMessages,
  approveRequest,
  rejectRequest,
  getPendingRequests,
};
