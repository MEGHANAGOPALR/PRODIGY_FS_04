// Backend Server (app.js)
require('dotenv').config(); // This makes sure .env file is loaded
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors({
    origin: 'http://localhost:3000', // React default port
    credentials: true,               // if you're using cookies or auth
    allowedHeaders: ['Content-Type', 'Authorization'] 
  }));  
app.use(express.json());
app.use('/uploads', express.static('uploads'));


if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// MongoDB Connection
// MongoDB Connection (Atlas via .env)
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ Connected to MongoDB Atlas!");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });  

// Define Schemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatar: { type: String, default: '' },
  status: { type: String, default: 'offline' },
  lastSeen: { type: Date, default: Date.now }
});

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  content: { type: String, required: true },
  room: { type: String, required: true },
  isPrivate: { type: Boolean, default: false },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  fileUrl: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const roomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  isPrivate: { type: Boolean, default: false },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now }
});

// Create Models
const User = mongoose.model('User', userSchema);
const Message = mongoose.model('Message', messageSchema);
const Room = mongoose.model('Room', roomSchema);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET;

// Authentication Routes
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user
    const user = new User({
      username,
      password: hashedPassword
    });
    
    await user.save();
    
    // Create token
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '24h' });
    
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        avatar: user.avatar
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Update status
    user.status = 'online';
    await user.save();
    
    // Create token
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '24h' });
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        avatar: user.avatar
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Access denied' });
  }
  
  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    res.status(400).json({ message: 'Invalid token' });
  }
};

// Room Routes
app.get('/api/rooms', verifyToken, async (req, res) => {
  try {
    const rooms = await Room.find({ isPrivate: false })
      .populate('participants', 'username avatar status');
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/rooms', verifyToken, async (req, res) => {
  try {
    const { name } = req.body;
    
    const room = new Room({
      name,
      participants: [req.user.id]
    });
    
    await room.save();
    
    io.emit('room-created', {
      _id: room._id,
      name: room.name,
      participants: [{
        _id: req.user.id
      }]
    });
    
    res.status(201).json(room);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Message Routes
app.get('/api/messages/:roomId', verifyToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const messages = await Message.find({ room: roomId })
      .populate('sender', 'username avatar')
      .sort({ createdAt: 1 });
    
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// User Routes
app.get('/api/users', verifyToken, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// File Upload
const multer = require('multer');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

app.post('/api/upload', verifyToken, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({ fileUrl });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Socket.IO
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication error'));
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

const connectedUsers = new Map();

io.on('connection', async (socket) => {
  console.log('User connected:', socket.userId);
  
  try {
    // Update user status
    await User.findByIdAndUpdate(socket.userId, { 
      status: 'online',
      lastSeen: new Date()
    });
    
    // Store connected user
    connectedUsers.set(socket.userId, socket.id);
    
    // Broadcast user status change
    io.emit('user-status-change', { 
      userId: socket.userId, 
      status: 'online' 
    });
    
    // Join user to rooms
    const userRooms = await Room.find({ 
      participants: socket.userId 
    });
    
    userRooms.forEach(room => {
      socket.join(room._id.toString());
    });
    
    // Listen for joining a room
    socket.on('join-room', async (roomId) => {
      socket.join(roomId);
      
      // Add user to room participants if not already there
      await Room.findByIdAndUpdate(
        roomId,
        { $addToSet: { participants: socket.userId } }
      );
      
      const updatedRoom = await Room.findById(roomId)
        .populate('participants', 'username avatar status');
      
      io.to(roomId).emit('room-updated', updatedRoom);
    });
    
    // Listen for new messages
    socket.on('send-message', async (data) => {
      try {
        const { content, roomId, isPrivate, recipientId, fileUrl } = data;
        
        // Create new message
        const message = new Message({
          sender: socket.userId,
          content,
          room: roomId,
          isPrivate,
          recipient: isPrivate ? recipientId : null,
          fileUrl
        });
        
        await message.save();
        
        // Populate sender info
        const populatedMessage = await Message.findById(message._id)
          .populate('sender', 'username avatar');
        
          io.to(roomId).emit('new-message', populatedMessage);
          
      } catch (error) {
        console.error('Message error:', error);
      }
    });
    
    // Listen for typing indicators
    socket.on('typing', (data) => {
      const { roomId, isTyping } = data;
      
      socket.to(roomId).emit('user-typing', {
        userId: socket.userId,
        isTyping
      });
    });
    
    // Listen for private chat initialization
    socket.on('init-private-chat', async (otherUserId) => {
      try {
        // Check if private room already exists
        const roomName = [socket.userId, otherUserId].sort().join('-');
        
        let privateRoom = await Room.findOne({
          name: roomName,
          isPrivate: true
        });
        
        if (!privateRoom) {
          // Create new private room
          privateRoom = new Room({
            name: roomName,
            isPrivate: true,
            participants: [socket.userId, otherUserId]
          });
          
          await privateRoom.save();
        }
        
        // Join both users to room
        socket.join(privateRoom._id.toString());
        
        const otherUserSocketId = connectedUsers.get(otherUserId);
        if (otherUserSocketId) {
          io.to(otherUserSocketId).emit('join-private-chat', privateRoom._id.toString());
        }
        
        // Notify user of the room details
        const populatedRoom = await Room.findById(privateRoom._id)
          .populate('participants', 'username avatar status');
        
        socket.emit('private-chat-initialized', populatedRoom);
      } catch (error) {
        console.error('Private chat error:', error);
      }
    });
    
    // Listen for disconnection
    socket.on('disconnect', async () => {
      console.log('User disconnected:', socket.userId);
      
      // Update user status
      await User.findByIdAndUpdate(socket.userId, {
        status: 'offline',
        lastSeen: new Date()
      });
      
      // Remove from connected users
      connectedUsers.delete(socket.userId);
      
      // Broadcast user status change
      io.emit('user-status-change', {
        userId: socket.userId,
        status: 'offline'
      });
    });
  } catch (error) {
    console.error('Socket error:', error);
  }
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});