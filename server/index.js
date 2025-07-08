const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let agentSocket = null;
const clients = new Map(); // user clients

wss.on('connection', (ws) => {
  ws.id = generateId(); // Assign unique ID to each socket
  console.log('New connection:', ws.id);

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());

      if (message.type === 'agent-login') {
        agentSocket = ws;
        ws.isAgent = true;
        console.log('Agent logged in');

        // Inform all users that agent is online
        broadcastToUsers({ type: 'agent-status', status: true });
      }

      else if (message.type === 'user-message') {
          clients.set(ws.id, ws); // This tracks the user connection

          if (agentSocket && agentSocket.readyState === WebSocket.OPEN) {
              agentSocket.send(JSON.stringify({
                  type: 'incoming-message',
                  from: ws.id,
                  msg: message.msg
              }));
          } else {
              ws.send(JSON.stringify({
                  type: 'waiting-message',
                  msg: 'Waiting for agent to log in...'
              }));
          }
      }

      else if (message.type === 'user-message') {
        clients.set(ws.id, ws); // store user connection

        if (agentSocket && agentSocket.readyState === WebSocket.OPEN) {
          agentSocket.send(JSON.stringify({ 
            type: 'incoming-message', 
            from: ws.id, 
            msg: message.msg 
          }));
        } else {
          ws.send(JSON.stringify({ 
            type: 'waiting-message', 
            msg: 'Waiting for agent to log in...' 
          }));
        }
      }

      else if (message.type === 'agent-reply') {
        const target = clients.get(message.to);
        if (target && target.readyState === WebSocket.OPEN) {
          target.send(JSON.stringify({ 
            type: 'chat-reply', 
            msg: message.msg 
          }));
        }
      }
    } catch (err) {
      console.error("Message handling error:", err);
    }
  });

  ws.on('close', () => {
    if (ws.isAgent) {
      console.log("⚠️ Agent disconnected");
      agentSocket = null;
      broadcastToUsers({ type: 'agent-status', status: false });
    } else {
      clients.delete(ws.id);
    }
  });
});

function broadcastToUsers(msg) {
  for (let [id, client] of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(msg));
    }
  }
}

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

const PORT = 5050;
server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
