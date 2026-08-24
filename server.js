const WebSocket = require('ws');
const http = require('http');

const PORT = 8080;
const server = http.createServer();
const wss = new WebSocket.Server({ server });

// Server state
let documentText = "";
let serverRevision = 0;
const operationHistory = []; // Array of { revision, op }
const MAX_HISTORY = 1000; // ponytail: cap history to prevent memory leak
const connectedClients = new Map();

function generateColor() {
  const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722'];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Basic string transformation logic (Operational Transformation)
// We only support INSERT and DELETE for a single character or string at a given position.
function transform(op1, op2) {
  // transforms op1 to include the effects of op2
  if (op1.type === 'INSERT' && op2.type === 'INSERT') {
    if (op1.position < op2.position) {
      return op1; // op1 stays the same
    } else if (op1.position > op2.position) {
      return { ...op1, position: op1.position + op2.char.length };
    } else {
      // If at same position, we need a tie-breaker. Usually user ID or alphabetical.
      // Let's tie-break using user ID to ensure consistency.
      if (op1.userId > op2.userId) {
        return { ...op1, position: op1.position + op2.char.length };
      }
      return op1;
    }
  }

  if (op1.type === 'INSERT' && op2.type === 'DELETE') {
    if (op1.position <= op2.position) {
      return op1;
    } else {
      // op2 deleted something before op1
      const overlap = Math.max(0, Math.min(op1.position - op2.position, op2.char.length));
      return { ...op1, position: op1.position - overlap };
    }
  }

  if (op1.type === 'DELETE' && op2.type === 'INSERT') {
    if (op1.position < op2.position) {
      return op1; // We delete before their insertion
    } else {
      // We delete after their insertion
      return { ...op1, position: op1.position + op2.char.length };
    }
  }

  if (op1.type === 'DELETE' && op2.type === 'DELETE') {
    if (op1.position < op2.position) {
      return op1;
    } else {
      // Both are deleting, potentially overlapping
      if (op1.position >= op2.position + op2.char.length) {
        return { ...op1, position: op1.position - op2.char.length };
      } else {
        // They overlap. We simplify by treating overlapping deletes as doing nothing for the overlapping part.
        // A full OT system splits operations here. 
        // For simplicity, we just adjust the position.
        return { ...op1, position: op2.position };
      }
    }
  }

  return op1;
}

wss.on('connection', (ws) => {
  const userId = 'user_' + Math.random().toString(36).substr(2, 9);
  const color = generateColor();

  const clientInfo = { ws, userId, color, cursor: 0 };
  connectedClients.set(userId, clientInfo);

  console.log(`Client connected: ${userId}`);

  // Send initial state to the client
  ws.send(JSON.stringify({
    type: 'INIT',
    userId,
    color,
    text: documentText,
    revision: serverRevision,
    users: Array.from(connectedClients.values()).map(c => ({ userId: c.userId, color: c.color, cursor: c.cursor }))
  }));

  // Broadcast the new user to everyone else
  broadcast({
    type: 'USER_JOINED',
    userId,
    color
  }, userId);

  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message);

      if (msg.type === 'OPERATION') {
        let op = msg.operation;
        if (!op || !op.type) { ws.close(); return; }
        const clientRevision = msg.revision || 0;

        // OT logic: transform incoming operation against all history operations that happened after clientRevision
        if (clientRevision < 0 || clientRevision > serverRevision) { ws.close(); return; }
        for (let i = clientRevision; i < serverRevision; i++) {
          const pastOp = operationHistory[i].op;
          op = transform(op, pastOp);
        }

        // Apply operation to server's document text
        if (op.type === 'INSERT') {
          documentText = documentText.slice(0, op.position) + op.char + documentText.slice(op.position);
        } else if (op.type === 'DELETE') {
          documentText = documentText.slice(0, op.position) + documentText.slice(op.position + op.char.length);
        }

        // Save to history and increment revision
        operationHistory.push({ revision: serverRevision, op });
        serverRevision++;
        // Compact history if it exceeds limit (all active clients are tracked by revision)
        if (operationHistory.length > MAX_HISTORY) {
          operationHistory.splice(0, operationHistory.length - MAX_HISTORY);
        }


        // Send ACK to the sender (just updates their revision, no re-apply)
        ws.send(JSON.stringify({
          type: 'ACK',
          revision: serverRevision
        }));

        // Broadcast the transformed operation to all OTHER clients
        broadcast({
          type: 'OPERATION',
          operation: op,
          revision: serverRevision,
          sourceUserId: userId
        }, userId);

      } else if (msg.type === 'CURSOR') {
        clientInfo.cursor = msg.position;
        broadcast({
          type: 'CURSOR',
          userId,
          position: msg.position
        }, userId);
      }
    } catch (e) {
      console.error('Error processing message:', e);
    }
  });

  ws.on('close', () => {
    console.log(`Client disconnected: ${userId}`);
    connectedClients.delete(userId);
    broadcast({
      type: 'USER_LEFT',
      userId
    });
  });
});

function broadcast(data, excludeUserId = null) {
  const message = JSON.stringify(data);
  for (const [userId, client] of connectedClients.entries()) {
    if (userId !== excludeUserId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
    }
  }
}

server.listen(PORT, () => {
  console.log(`WebSocket Collaborative Server running on ws://localhost:${PORT}`);
});
