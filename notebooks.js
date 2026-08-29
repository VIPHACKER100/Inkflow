/**
 * Notebooks Module
 * IndexedDB CRUD + notebook management
 */
(function () {
  'use strict';

  const DB_NAME = 'InkflowNotebooks';
  const DB_VERSION = 1;
  const STORE_NAME = 'notebooks';

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function saveNotebook(id, data) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const record = {
        id,
        title: data.title || 'Untitled',
        text: data.text || '',
        state: data.state || {},
        pages: data.pages || [],
        createdAt: data.createdAt || Date.now(),
        updatedAt: Date.now(),
      };
      tx.objectStore(STORE_NAME).put(record);
      tx.oncomplete = () => resolve(record);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function loadNotebook(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function listNotebooks() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).index('updatedAt').openCursor(null, 'prev');
      const results = [];
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  async function deleteNotebook(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function duplicateNotebook(id, newTitle) {
    const source = await loadNotebook(id);
    if (!source) throw new Error('Notebook not found');
    const newId = 'nb-' + Date.now();
    return saveNotebook(newId, {
      title: newTitle || source.title + ' (copy)',
      text: source.text,
      state: { ...source.state },
      pages: source.pages.map((p) => ({ ...p })),
    });
  }

  function generateId() {
    return 'nb-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);
  }

  /* ── Sidebar UI ────────────────────────────────────────────────────────── */

  function renderNotebooksSidebar() {
    const container = document.getElementById('notebooks-list');
    if (!container) return;
    listNotebooks()
      .then((nbs) => {
        if (nbs.length === 0) {
          container.innerHTML = '<div style="font-size:12px;color:var(--text-muted);padding:8px 0;">No notebooks yet. Save your first one!</div>';
          return;
        }
        container.innerHTML = nbs
          .map(
            (nb) => `
          <div class="notebook-item" data-id="${nb.id}" onclick="NotebooksUI.open('${nb.id}')">
            <div class="notebook-title">${escapeHtml(nb.title)}</div>
            <div class="notebook-date">${new Date(nb.updatedAt).toLocaleDateString()}</div>
            <button class="btn sm icon-btn" onclick="event.stopPropagation();NotebooksUI.remove('${nb.id}')" title="Delete">✕</button>
          </div>`
          )
          .join('');
      })
      .catch(() => {});
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function saveCurrentNotebook() {
    const title = prompt('Notebook title:', 'My Notebook');
    if (!title) return;
    const id = generateId();
    saveNotebook(id, {
      title,
      text: window.S?.text || '',
      state: { ...window.S },
    }).then(() => renderNotebooksSidebar());
  }

  function openNotebook(id) {
    loadNotebook(id).then((nb) => {
      if (!nb) return;
      if (window.S) {
        Object.assign(window.S, nb.state);
        window.S.text = nb.text;
      }
      const textarea = document.getElementById('text-input');
      if (textarea) textarea.value = nb.text;
      if (window.renderText) window.renderText(nb.text);
      if (window.autosave) window.autosave();
    });
  }

  function removeNotebook(id) {
    if (!confirm('Delete this notebook?')) return;
    deleteNotebook(id).then(() => renderNotebooksSidebar());
  }

  window.NotebooksDB = { saveNotebook, loadNotebook, listNotebooks, deleteNotebook, duplicateNotebook, generateId };
  window.NotebooksUI = { renderNotebooksSidebar, saveCurrentNotebook, open: openNotebook, remove: removeNotebook };
})();
