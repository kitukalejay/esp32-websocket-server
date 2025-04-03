require('dotenv').config();
const express = require('express');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Create HTTP server
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store connected clients
const clients = new Set();

wss.on('connection', (ws) => {
  console.log('New client connected');
  clients.add(ws);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log(`Received from ESP32: x=${data.x}, y=${data.y}, heading=${data.heading}`);
      
      // Broadcast to all clients (for a dashboard)
      clients.forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'position',
            data: data
          }));
        }
      });

      // Example: Send command based on position
      if (data.x > 100) {
        ws.send(JSON.stringify({ command: "stop" }));
      } else if (data.heading > 180) {
        ws.send(JSON.stringify({ command: "left" }));
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    clients.delete(ws);
  });
});

// HTTP endpoint to send commands
app.get('/send-command', (req, res) => {
  const { command } = req.query;
  
  if (!command) {
    return res.status(400).send('Command parameter is required');
  }

  // Broadcast command to all ESP32 clients
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ command }));
    }
  });

  res.send(`Command "${command}" sent to all devices`);
});

// Simple dashboard
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});