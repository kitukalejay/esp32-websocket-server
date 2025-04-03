// server.js
const express = require('express');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Create HTTP server
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// WebSocket Server
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('New ESP32 connected');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log(`Position update - X: ${data.x.toFixed(2)}cm, Y: ${data.y.toFixed(2)}cm, Heading: ${data.heading.toFixed(2)}°`);
      
      // Example: Send stop command if x > 100cm
      if (data.x > 100) {
        ws.send('stop');
      }
    } catch (err) {
      console.error('Error parsing message:', err);
    }
  });

  ws.on('close', () => {
    console.log('ESP32 disconnected');
  });
});

// HTTP API to send commands
app.post('/send-command', (req, res) => {
  const { command } = req.body;
  
  if (!command) {
    return res.status(400).json({ error: 'Command is required' });
  }
  
  // Broadcast to all connected ESP32s
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(command);
    }
  });
  
  res.json({ success: true, message: `Command "${command}" sent` });
});

// Dashboard route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});