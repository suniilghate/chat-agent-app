const express = require('express');
const http = require('http');
const socketIo = require('ws');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new socketIo.Server({server});

let isAgentOnline = false;
let agentSocket = null;

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('agent-login', () => {
    isAgentOnline = true;
    agentSocket = socket;
    console.log("Agent logged in");
    io.emit('agent-status', true);
  });

  socket.on('agent-logout', () => {
    isAgentOnline = false;
    agentSocket = null;
    console.log("Agent logged out");
    io.emit('agent-status', false);
  });

  socket.on('user-message', (msg) => {
    if (isAgentOnline && agentSocket) {
      agentSocket.emit('incoming-message', { from: socket.id, msg });
    } else {
      socket.emit('waiting-message', "Waiting for an agent to respond...");
    }
  });

  socket.on('agent-reply', ({ to, msg }) => {
    io.to(to).emit('chat-reply', msg);
  });

  socket.on('disconnect', () => {
    if (socket === agentSocket) {
      isAgentOnline = false;
      agentSocket = null;
      io.emit('agent-status', false);
      console.log("Agent disconnected");
    }
  });
});

const PORT = 5050;
server.listen(PORT, () => console.log(`Server is listening on port ${PORT}`));
