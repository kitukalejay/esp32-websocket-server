const WebSocket = require('ws');
const http = require('http');

const server = http.createServer();
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 10000;
const MAX_SAMPLE_RATE = 10; // Max allowed updates per second
const clients = new Map();

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

wss.on('connection', (ws) => {
  const clientId = Date.now();
  const clientData = {
    lastUpdate: 0,
    updateCount: 0,
    lastReset: Date.now()
  };
  clients.set(clientId, clientData);

  console.log(`Client ${clientId} connected`);
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      // Rate limiting
      const now = Date.now();
      if(now - clientData.lastReset > 1000) {
        clientData.updateCount = 0;
        clientData.lastReset = now;
      }
      
      if(clientData.updateCount++ > MAX_SAMPLE_RATE) {
        ws.send(JSON.stringify({
          event: "error",
          data: {
            code: 429,
            message: "Update rate too high"
          }
        }));
        return;
      }
      
      if(data.event === "compass_update") {
        // Data validation
        if(data.data.heading < 0 || data.data.heading > 360) {
          ws.send(JSON.stringify({
            event: "error",
            data: {
              code: 400,
              message: "Invalid heading value",
              received: data.data.heading
            }
          }));
          return;
        }
        
        console.log(`[${clientId}] Heading: ${data.data.heading.toFixed(2)}°`);
        
        // Process data here (store in DB, etc.)
        
        // Optional: Send acknowledgement
        ws.send(JSON.stringify({
          event: "ack",
          data: {
            timestamp: data.data.timestamp,
            status: "processed"
          }
        }));
      }
      
    } catch(err) {
      ws.send(JSON.stringify({
        event: "error",
        data: {
          code: 500,
          message: "Invalid message format"
        }
      }));
    }
  });

  ws.on('close', () => {
    console.log(`Client ${clientId} disconnected`);
    clients.delete(clientId);
  });
});