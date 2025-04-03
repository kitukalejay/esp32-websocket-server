require('dotenv').config(); // For local development
const WebSocket = require('ws');

// Configuration
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';
const KEEPALIVE_INTERVAL = process.env.KEEPALIVE_INTERVAL || 25000; // 25 seconds

// Create WebSocket Server
const wss = new WebSocket.Server({
  port: PORT,
  host: HOST
});

console.log(`🚀 WebSocket server running on ws://${HOST}:${PORT}`);

// Connection handler
wss.on('connection', (ws) => {
  console.log('🔌 New client connected');
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'welcome',
    message: 'Connected to WebSocket server',
    timestamp: Date.now()
  }));

  // Message handler
  ws.on('message', (message) => {
    console.log(`📩 Received: ${message}`);
    
    // Echo message back with additional data
    const response = {
      type: 'echo',
      original: message.toString(),
      timestamp: Date.now(),
      server: 'Render'
    };
    ws.send(JSON.stringify(response));
  });

  // Close handler
  ws.on('close', () => {
    console.log('❌ Client disconnected');
  });
});

// Keep-alive handler (for Render's free tier)
setInterval(() => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.ping();
    }
  });
}, KEEPALIVE_INTERVAL);

// Error handling
wss.on('error', (error) => {
  console.error('⚠️ WebSocket Server Error:', error);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('🛑 Shutting down server gracefully');
  wss.close();
  process.exit();
});