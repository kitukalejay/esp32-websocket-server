const WebSocket = require('ws');
const http = require('http');

// Configuration
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

// Create HTTP server
const server = http.createServer();
const wss = new WebSocket.Server({ server });

// Start server
server.listen(PORT, HOST, () => {
  console.log(`🚀 WebSocket server running on port ${PORT}`);
});

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('🔌 New client connected');
  
  ws.send(JSON.stringify({
    type: 'status',
    message: 'Connected to WebSocket server',
    timestamp: Date.now()
  }));

  ws.on('message', (message) => {
    console.log(`📩 Received: ${message}`);
    ws.send(JSON.stringify({
      type: 'echo',
      message: message.toString(),
      timestamp: Date.now()
    }));
  });

  ws.on('close', () => console.log('❌ Client disconnected'));
});

// Keep-alive for Render
setInterval(() => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.ping();
    }
  });
}, 25000);

// Error handling
server.on('error', (error) => {
  console.error('⚠️ Server Error:', error);
});