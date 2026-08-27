/**
 * collaborative-engine.js
 * Task 13: Real-Time Collaborative Writing
 *
 * Implements Operational Transformation (OT) and WebSocket management
 * for multi-user collaborative editing in InkFlow.
 *
 * Protocol: Client <-> server.js (ws on port 8080)
 *
 * Message Types (Client -> Server):
 *   { type: 'OPERATION', operation, revision }
 *   { type: 'CURSOR', position }
 *
 * Message Types (Server -> Client):
 *   { type: 'INIT', userId, color, text, revision, users }
 *   { type: 'OPERATION', operation, revision }
 *   { type: 'CURSOR', userId, position }
 *   { type: 'USER_JOINED', userId, color }
 *   { type: 'USER_LEFT', userId }
 */

// ─── Operational Transformation ───────────────────────────────────────────────

/**
 * Apply a single operation to a string.
 * @param {string} text  The current document text
 * @param {{ type: 'INSERT'|'DELETE', position: number, char: string }} op
 * @returns {string} The resulting text
 */
function applyOp(text, op) {
  if (op.type === 'INSERT') {
    return text.slice(0, op.position) + op.char + text.slice(op.position);
  } else if (op.type === 'DELETE') {
    return text.slice(0, op.position) + text.slice(op.position + op.char.length);
  }
  return text;
}

/**
 * Transform op1 so that it is correct relative to op2 having already been applied.
 * Classic Operational Transformation for plain-text insert/delete.
 * @param {{ type, position, char, userId }} op1
 * @param {{ type, position, char, userId }} op2
 * @returns Transformed version of op1
 */
function transformOp(op1, op2) {
  if (op1.type === 'INSERT' && op2.type === 'INSERT') {
    if (op1.position < op2.position) return op1;
    if (op1.position > op2.position) return { ...op1, position: op1.position + op2.char.length };
    // Same position: break tie with userId to ensure all clients agree on ordering.
    return op1.userId > op2.userId ? { ...op1, position: op1.position + op2.char.length } : op1;
  }

  if (op1.type === 'INSERT' && op2.type === 'DELETE') {
    if (op1.position <= op2.position) return op1;
    const charsDeleted = op2.char.length;
    return { ...op1, position: Math.max(op2.position, op1.position - charsDeleted) };
  }

  if (op1.type === 'DELETE' && op2.type === 'INSERT') {
    if (op1.position < op2.position) return op1;
    return { ...op1, position: op1.position + op2.char.length };
  }

  if (op1.type === 'DELETE' && op2.type === 'DELETE') {
    if (op1.position < op2.position) return op1;
    if (op1.position >= op2.position + op2.char.length) {
      return { ...op1, position: op1.position - op2.char.length };
    }
    // Overlapping delete — move position to the start of what the other deleted.
    return { ...op1, position: op2.position };
  }

  return op1;
}

// ─── CollaborativeEngine ──────────────────────────────────────────────────────

class CollaborativeEngine {
  /**
   * @param {object} options
   * @param {HTMLTextAreaElement}  options.textarea       - The text-input textarea
   * @param {function(string)}     options.onTextChange   - Called when remote op changes the text
   * @param {function(object[])}   options.onUsersChange  - Called with current user list
   * @param {function(string,bool)} options.onStatusChange - Called with status text and isOnline flag
   */
  constructor({ textarea, onTextChange, onUsersChange, onStatusChange }) {
    this.textarea = textarea;
    this.onTextChange = onTextChange;
    this.onUsersChange = onUsersChange;
    this.onStatusChange = onStatusChange;

    this.ws = null;
    this.userId = null;
    this.color = null;

    // OT state
    this.serverRevision = 0; // Last revision acknowledged from server
    this.pendingOps = []; // Ops sent to server but not yet ACKed
    this.localText = ''; // Our local view of the document text
    this.users = new Map(); // userId -> { color, cursor }

    // Track the last value of the textarea to compute deltas
    this._lastValue = '';
    this._suppressEvents = false;

    this._onInputBound = this._onInput.bind(this);
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  initialize() {
    this._lastValue = this.textarea.value;
    this.localText = this.textarea.value;
    this.textarea.addEventListener('input', this._onInputBound);
  }

  connect(url = 'ws://localhost:8080') {
    this.onStatusChange('Connecting…', false);
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {};

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this._handleServerMessage(msg);
      } catch (e) {
        console.error('[Collab] Bad message from server', e);
      }
    };

    this.ws.onclose = () => {
      this.onStatusChange('Offline', false);
    };

    this.ws.onerror = (err) => {
      this.onStatusChange('Connection error', false);
      console.error('[Collab] WebSocket error', err);
    };
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.textarea && this._onInputBound) {
      this.textarea.removeEventListener('input', this._onInputBound);
    }
    this.users.clear();
    this.onUsersChange([]);
    this.onStatusChange('Offline', false);
  }

  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  sendCursorPosition(pos) {
    if (!this.isConnected()) return;
    this.ws.send(JSON.stringify({ type: 'CURSOR', position: pos }));
  }

  getUserPresence() {
    return Array.from(this.users.values());
  }

  getDocumentState() {
    return { text: this.localText, revision: this.serverRevision };
  }

  // ── Private: Input Handling ────────────────────────────────────────────────

  _onInput() {
    if (this._suppressEvents || !this.isConnected()) {
      this._lastValue = this.textarea.value;
      return;
    }

    const newVal = this.textarea.value;
    const ops = this._diffToOps(this._lastValue, newVal);

    for (const op of ops) {
      this._sendOperation(op);
    }

    this._lastValue = newVal;
    this.localText = newVal;

    // Emit cursor position
    this.sendCursorPosition(this.textarea.selectionStart);
  }

  /**
   * Compute a minimal list of INSERT/DELETE operations from oldText to newText.
   * This uses a simple prefix/suffix approach adequate for single-keystroke edits.
   */
  _diffToOps(oldText, newText) {
    const ops = [];
    let prefixLen = 0;
    while (prefixLen < oldText.length && prefixLen < newText.length && oldText[prefixLen] === newText[prefixLen]) {
      prefixLen++;
    }

    let oldSuffix = oldText.length - 1;
    let newSuffix = newText.length - 1;
    while (oldSuffix >= prefixLen && newSuffix >= prefixLen && oldText[oldSuffix] === newText[newSuffix]) {
      oldSuffix--;
      newSuffix--;
    }

    const deletedStr = oldText.slice(prefixLen, oldSuffix + 1);
    const insertedStr = newText.slice(prefixLen, newSuffix + 1);

    // Build a single DELETE op for removed text, then a single INSERT op for added text
    if (deletedStr.length > 0) {
      ops.push({ type: 'DELETE', position: prefixLen, char: deletedStr, userId: this.userId });
    }
    if (insertedStr.length > 0) {
      ops.push({ type: 'INSERT', position: prefixLen, char: insertedStr, userId: this.userId });
    }

    return ops;
  }

  // ── Private: OT Send ──────────────────────────────────────────────────────

  _sendOperation(op) {
    if (!this.isConnected()) return;

    // Transform the op against all outstanding pending ops before queuing
    let outgoing = op;
    for (const pending of this.pendingOps) {
      outgoing = transformOp(outgoing, pending);
    }

    this.pendingOps.push(op);

    this.ws.send(
      JSON.stringify({
        type: 'OPERATION',
        operation: outgoing,
        revision: this.serverRevision,
        userId: this.userId,
      })
    );
  }

  // ── Private: Server Message Handling ──────────────────────────────────────

  _handleServerMessage(msg) {
    switch (msg.type) {
      case 'INIT': {
        this.userId = msg.userId;
        this.color = msg.color;
        this.serverRevision = msg.revision;
        this.localText = msg.text;
        this._lastValue = msg.text;

        // Populate known users
        this.users.clear();
        for (const u of msg.users) {
          if (u.userId !== this.userId) {
            this.users.set(u.userId, { color: u.color, cursor: u.cursor });
          }
        }

        this._suppressEvents = true;
        this.onTextChange(msg.text);
        this._suppressEvents = false;

        this.onStatusChange('Online', true);
        this.onUsersChange(this._usersArray());
        break;
      }

      case 'ACK': {
        // Server acknowledged our operation — pop the oldest pending op and update revision
        this.serverRevision = msg.revision;
        this.pendingOps.shift();
        break;
      }

      case 'OPERATION': {
        const serverOp = msg.operation;
        this.serverRevision = msg.revision;

        // Transform server op against any still-pending local ops (that the server hasn't seen yet)
        let transformed = serverOp;
        const newPending = [];
        for (const pending of this.pendingOps) {
          newPending.push(transformOp(pending, transformed));
          transformed = transformOp(transformed, pending);
        }
        this.pendingOps = newPending;

        // Apply transformed server op to local text
        const newText = applyOp(this.localText, transformed);
        this.localText = newText;
        this._lastValue = newText;

        // Push the change to the textarea WITHOUT triggering _onInput
        this._suppressEvents = true;
        const sel = this.textarea.selectionStart;
        this.onTextChange(newText);
        // Restore cursor, adjusting for the op
        const newSel = this._adjustCursor(sel, transformed);
        this.textarea.setSelectionRange(newSel, newSel);
        this._suppressEvents = false;
        break;
      }

      case 'CURSOR': {
        if (this.users.has(msg.userId)) {
          this.users.get(msg.userId).cursor = msg.position;
          this.onUsersChange(this._usersArray());
        }
        break;
      }

      case 'USER_JOINED': {
        if (msg.userId !== this.userId) {
          this.users.set(msg.userId, { color: msg.color, cursor: 0 });
          this.onUsersChange(this._usersArray());
        }
        break;
      }

      case 'USER_LEFT': {
        this.users.delete(msg.userId);
        this.onUsersChange(this._usersArray());
        break;
      }
    }
  }

  _usersArray() {
    return Array.from(this.users.entries()).map(([userId, info]) => ({ userId, ...info }));
  }

  /**
   * Adjust cursor position after a remote operation was applied.
   */
  _adjustCursor(cursorPos, op) {
    if (op.type === 'INSERT') {
      if (op.position <= cursorPos) return cursorPos + op.char.length;
    } else if (op.type === 'DELETE') {
      if (op.position < cursorPos) {
        return Math.max(op.position, cursorPos - op.char.length);
      }
    }
    return cursorPos;
  }
}
