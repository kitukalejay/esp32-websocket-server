const WebSocket = require('ws');

// Create WebSocket server on port 8080
const wss = new WebSocket.Server({ port: 8080 });

console.log('WebSocket server running at ws://localhost:8080');

wss.on('connection', (ws) => {
  console.log('New ESP32 connected!');
  
  // Send welcome message
  ws.send('SERVER: Connection established');
  
  // Handle messages from ESP32
  ws.on('message', (message) => {
    console.log(`Received from ESP32: ${message}`);
    
    // Echo back with timestamp
    const reply = `[${new Date().toLocaleTimeString()}] ECHO: ${message}`;
    ws.send(reply);
  });

  // Handle disconnection
  ws.on('close', () => {
    console.log('ESP32 disconnected');
  });
});