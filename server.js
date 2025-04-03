const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// Configuration
const PORT = process.env.PORT || 10000;
const MAX_CLIENTS = 10;
const POSITION_HISTORY_SIZE = 100;
const MAX_UPDATE_RATE = 10; // Updates per second

// Create HTTP server
const server = http.createServer((req, res) => {
  // Serve simple HTML page for testing
  if (req.url === '/') {
    fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
      if (err) {
        res.writeHead(500);
        return res.end('Error loading index.html');
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ESP32 WebSocket Server');
  }
});

// Create WebSocket server
const wss = new WebSocket.Server({ 
  server,
  maxPayload: 1024 // Limit message size to 1KB
});

// Store client data and position history
const clients = new Map();
const positionHistory = [];

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  if (clients.size >= MAX_CLIENTS) {
    ws.close(1008, 'Server at maximum capacity');
    return;
  }

  const clientId = Date.now();
  const clientIp = req.socket.remoteAddress;
  const clientData = {
    id: clientId,
    ip: clientIp,
    lastUpdate: 0,
    updateCount: 0,
    lastReset: Date.now()
  };

  clients.set(clientId, clientData);
  console.log(`Client ${clientId} connected from ${clientIp}`);

  // Send connection acknowledgement
  ws.send(JSON.stringify({
    event: 'connection_ack',
    data: {
      clientId,
      timestamp: Date.now(),
      maxUpdateRate: MAX_UPDATE_RATE
    }
  }));

  // Message handler
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      // Rate limiting
      const now = Date.now();
      if (now - clientData.lastReset > 1000) {
        clientData.updateCount = 0;
        clientData.lastReset = now;
      }
      
      if (clientData.updateCount++ > MAX_UPDATE_RATE) {
        ws.send(JSON.stringify({
          event: 'error',
          data: {
            code: 429,
            message: "Update rate too high",
            maxUpdates: MAX_UPDATE_RATE
          }
        }));
        return;
      }

      // Handle position updates
      if (data.event === 'position_update') {
        // Validate data
        if (typeof data.data?.x !== 'number' || 
            typeof data.data?.y !== 'number' || 
            typeof data.data?.heading !== 'number') {
          throw new Error('Invalid position data');
        }

        // Store update
        clientData.lastUpdate = now;
        const positionData = {
          clientId,
          timestamp: now,
          x: data.data.x,
          y: data.data.y,
          heading: data.data.heading
        };

        // Add to history (rotating buffer)
        positionHistory.push(positionData);
        if (positionHistory.length > POSITION_HISTORY_SIZE) {
          positionHistory.shift();
        }

        // Send acknowledgement
        ws.send(JSON.stringify({
          event: 'position_ack',
          data: {
            timestamp: data.data.timestamp || now,
            received: now
          }
        }));

        console.log(`Position update from ${clientId}:`, {
          x: positionData.x.toFixed(2),
          y: positionData.y.toFixed(2),
          heading: positionData.heading.toFixed(1)
        });
      }

      // Add handlers for other event types as needed

    } catch (err) {
      console.error(`Error processing message from ${clientId}:`, err.message);
      ws.send(JSON.stringify({
        event: 'error',
        data: {
          code: 400,
          message: 'Invalid message format',
          error: err.message
        }
      }));
    }
  });

  // Error handler
  ws.on('error', (err) => {
    console.error(`Client ${clientId} error:`, err.message);
  });

  // Connection closed
  ws.on('close', () => {
    clients.delete(clientId);
    console.log(`Client ${clientId} disconnected`);
  });
});

// Cleanup inactive clients
setInterval(() => {
  const now = Date.now();
  clients.forEach((client, clientId) => {
    if (now - client.lastUpdate > 30000) { // 30 seconds inactivity
      const ws = wss.clients.get(clientId);
      if (ws) ws.close(1001, 'Inactive timeout');
      clients.delete(clientId);
      console.log(`Disconnected inactive client ${clientId}`);
    }
  });
}, 10000);

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  wss.clients.forEach(client => {
    client.close(1001, 'Server shutdown');
  });
  server.close(() => {
    process.exit(0);
  });
});