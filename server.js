const http = require('http');
const WebSocket = require('ws');

// Create HTTP server (required by Render)
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('ESP32 WebSocket Server Running');
});

// WebSocket Server
const wss = new WebSocket.Server({ 
  server,
  perMessageDeflate: {
    zlibDeflateOptions: {
      chunkSize: 1024,
      memLevel: 7,
      level: 3
    },
    zlibInflateOptions: {
      chunkSize: 10 * 1024
    },
    threshold: 1024,
    concurrencyLimit: 10
  }
});

const PORT = process.env.PORT || 10000;

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`New client connected from ${clientIp}`);

  // Handle messages from ESP32
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received:', data);
      
      // Handle different message types
      if(data.type === 'handshake') {
        ws.send(JSON.stringify({ 
          type: 'handshake_ack',
          status: 'connected',
          timestamp: Date.now() 
        }));
      } else if(data.type === 'update') {
        // Process update here
        ws.send(JSON.stringify({
          type: 'update_ack',
          received: Date.now()
        }));
      }
    } catch (err) {
      console.error('Error processing message:', err);
      ws.send(JSON.stringify({ 
        type: 'error',
        message: 'Invalid message format' 
      }));
    }
  });

  ws.on('close', () => {
    console.log(`Client from ${clientIp} disconnected`);
  });

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'welcome',
    message: 'Connected to WebSocket server',
    timestamp: Date.now()
  }));
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  
  // Additional HTTP server on port 8080 for Render health checks
  if(process.env.RENDER) {
    const healthCheckServer = http.createServer((req, res) => {
      res.writeHead(200);
      res.end('OK');
    });
    healthCheckServer.listen(8080, '0.0.0.0');
    console.log('Health check server running on port 8080');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  wss.clients.forEach(client => {
    if(client.readyState === WebSocket.OPEN) {
      client.close(1001, 'Server shutting down');
    }
  });
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});