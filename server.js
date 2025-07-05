const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

// Load environment variables (for local dev, use a .env file)
require('dotenv').config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // For production, restrict this to your Netlify frontend URL!
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  throw new Error("MONGO_URI environment variable not set!");
}
mongoose.connect(mongoUri, { useNewUrlParser: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Example Mongoose schema/model for messages
const messageSchema = new mongoose.Schema({
  user: String,
  text: String,
  timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

// API endpoint to fetch all messages
app.get('/messages', async (req, res) => {
  try {
    const messages = await Message.find().sort({ timestamp: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Socket.io for real-time chat
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Receive new messages from clients
  socket.on('chat message', async (msg) => {
    try {
      const message = new Message({
        user: msg.user,
        text: msg.text
      });
      await message.save();

      // Broadcast message to all connected clients
      io.emit('chat message', message);
    } catch (err) {
      console.error('Error saving message:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Health check endpoint
app.get('/', (req, res) => {
  res.send('Chat server is running!');
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
