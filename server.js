const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { MongoClient } = require('mongodb');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());

// Your MongoDB URI
const MONGO_URI = "mongodb+srv://makie006:vLMtDjOqeSaAm8Vt@hbmaxx.aw7rucy.mongodb.net/?retryWrites=true&w=majority&appName=hbmaxx";
const DB_NAME = "chatroom";
const COLLECTION_NAME = "messages";

let messagesCollection;

// Connect to MongoDB
MongoClient.connect(MONGO_URI, { useUnifiedTopology: true })
  .then(client => {
    const db = client.db(DB_NAME);
    messagesCollection = db.collection(COLLECTION_NAME);
    server.listen(3000, () => console.log('Server running on http://localhost:3000'));
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Socket.io logic
io.on('connection', (socket) => {
  // Send previous messages to the newly connected client
  messagesCollection.find().sort({ timestamp: 1 }).toArray()
    .then(messages => {
      socket.emit('messages', messages);
    })
    .catch(err => console.error('Error fetching messages:', err));

  // Listen for new chat messages
  socket.on('chat message', (msg) => {
    const message = {
      text: msg,
      timestamp: new Date()
    };
    messagesCollection.insertOne(message)
      .then(() => {
        io.emit('chat message', message);
      })
      .catch(err => console.error('Error saving message:', err));
  });
});

// (Optional) health check endpoint
app.get('/', (req, res) => {
  res.send('Chat server is running!');
});
