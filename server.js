const http = require('http');
const socketIO = require('socket.io');

const PORT = process.env.PORT || 10000;
const server = http.createServer();
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Socket.IO server running on port ${PORT}`);
});

io.on('connection', (socket) => {
  console.log(`🔌 New client connected: ${socket.id}`);
  
  // Send welcome message
  socket.emit('welcome', {
    message: 'Connected to Socket.IO server',
    timestamp: Date.now(),
    clientId: socket.id
  });

  // Handle messages from ESP32
  socket.on('esp32_message', (data) => {
    console.log(`📩 Received from ${socket.id}:`, data);
    
    // Echo back with additional data
    socket.emit('echo', {
      original: data,
      timestamp: Date.now(),
      server: 'Render'
    });
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// Keep-alive
setInterval(() => {
  io.emit('ping', { timestamp: Date.now() });
}, 25000);