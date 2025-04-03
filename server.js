const http = require('http');
const WebSocket = require('ws');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('ESP32 WebSocket Control Server');
});

const wss = new WebSocket.Server({ 
  server,
  clientTracking: true,
  perMessageDeflate: false, // Disable compression for stability
  maxPayload: 1024 // Limit message size
});

const PORT = process.env.PORT || 10000;
const CLIENT_TIMEOUT = 30000; // 30 seconds

// Client management
const clients = new Map();

wss.on('connection', (ws, req) => {
  const clientId = Date.now();
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  
  clients.set(clientId, {
    ws,
    ip: clientIp,
    lastActivity: Date.now()
  });

  console.log(`Client ${clientId} connected from ${clientIp}`);

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'welcome',
    clientId,
    timestamp: Date.now(),
    heartbeatInterval: 20000
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      clients.get(clientId).lastActivity = Date.now();

      switch(data.type) {
        case 'heartbeat':
          ws.send(JSON.stringify({ type: 'heartbeat_ack' }));
          break;
          
        case 'update':
          // Process your data here
          const response = {
            type: 'update_ack',
            received: Date.now(),
            clientId
          };
          ws.send(JSON.stringify(response));
          break;
          
        default:
          console.log(`Unknown message type from ${clientId}:`, data.type);
      }
    } catch (err) {
      console.error(`Error processing message from ${clientId}:`, err.message);
    }
  });

  ws.on('pong', () => {
    clients.get(clientId).lastActivity = Date.now();
  });

  ws.on('close', () => {
    console.log(`Client ${clientId} disconnected`);
    clients.delete(clientId);
  });
});

// Cleanup inactive clients
setInterval(() => {
  const now = Date.now();
  clients.forEach((client, clientId) => {
    if (now - client.lastActivity > CLIENT_TIMEOUT) {
      console.log(`Client ${clientId} timed out`);
      client.ws.terminate();
      clients.delete(clientId);
    }
  });
}, 10000);

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  
  // Health check server for Render
  if(process.env.RENDER) {
    const healthServer = http.createServer((req, res) => {
      res.writeHead(200);
      res.end(`OK - ${clients.size} clients connected`);
    });
    healthServer.listen(8080, '0.0.0.0');
    console.log('Health check server running on port 8080');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  wss.clients.forEach(client => {
    if(client.readyState === WebSocket.OPEN) {
      client.close(1001, 'Server maintenance');
    }
  });
  
  setTimeout(() => {
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  }, 1000);
});