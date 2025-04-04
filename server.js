// server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Store commands for devices
const deviceCommands = {};

// API endpoint to receive commands for devices
app.post('/api/command', (req, res) => {
    const { deviceId, command } = req.body;
    
    if (!deviceId || !command) {
        return res.status(400).json({ error: 'Device ID and command are required' });
    }
    
    // Validate command
    const validCommands = ['forward', 'backward', 'left', 'right', 'stop'];
    if (!validCommands.includes(command)) {
        return res.status(400).json({ error: 'Invalid command' });
    }
    
    // Store the command
    deviceCommands[deviceId] = command;
    console.log(`Command '${command}' set for device ${deviceId}`);
    
    res.status(200).json({ message: 'Command received' });
});

// API endpoint for ESP32 to check for commands
app.get('/api/command', (req, res) => {
    const deviceId = req.headers['device-id'];
    
    if (!deviceId) {
        return res.status(400).json({ error: 'Device ID header is required' });
    }
    
    // Get the current command for this device
    const command = deviceCommands[deviceId] || 'stop';
    
    // Clear the command after sending (optional)
    // deviceCommands[deviceId] = 'stop';
    
    res.status(200).send(command);
});

// Simple web interface to send commands
app.get('/control', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Robot Control</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
                button { padding: 15px 25px; font-size: 18px; margin: 10px; cursor: pointer; }
                #deviceId { padding: 10px; width: 300px; font-size: 16px; }
            </style>
        </head>
        <body>
            <h1>Robot Control Panel</h1>
            <input type="text" id="deviceId" placeholder="Enter Device ID" value="ESP32_ROBOT_001"><br><br>
            <button onclick="sendCommand('forward')">Forward</button><br>
            <button onclick="sendCommand('left')">Left</button>
            <button onclick="sendCommand('stop')">Stop</button>
            <button onclick="sendCommand('right')">Right</button><br>
            <button onclick="sendCommand('backward')">Backward</button>
            
            <script>
                async function sendCommand(command) {
                    const deviceId = document.getElementById('deviceId').value;
                    const response = await fetch('/api/command', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ deviceId, command })
                    });
                    const result = await response.json();
                    alert(result.message || result.error);
                }
            </script>
        </body>
        </html>
    `);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});