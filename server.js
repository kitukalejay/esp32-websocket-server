const http = require('http');
const WebSocket = require('ws');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('ESP32 WebSocket Server');
});

const wss = new WebSocket.Server({ 
  server,
  clientTracking: true,
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

// Environment variable for Render
const PORT = process.env.PORT || 10000;

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`New client connected from ${clientIp}`);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received:', data);
      
      // Handle different message types
      if(data.type === 'auth') {
        ws.send(JSON.stringify({ type: 'auth_ack', status: 'authenticated' }));
      } else if(data.type === 'update') {
        ws.send(JSON.stringify({ 
          type: 'update_ack',
          received: Date.now(),
          data: data.data
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

// Handle Render's port scanning
server.on('listening', () => {
  const addr = server.address();
  console.log(`Server listening on ${addr.address}:${addr.port}`);
  
  // This helps Render detect the HTTP server
  if(process.env.RENDER) {
    const keepAlive = http.createServer((req, res) => {
      res.writeHead(200);
      res.end('Render keep-alive');
    });
    keepAlive.listen(8080, '0.0.0.0');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`WebSocket server started on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
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