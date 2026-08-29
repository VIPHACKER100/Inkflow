# 📓 Notebooks System

This document covers Inkflow's v1.6.0 notebook system — IndexedDB-backed persistent storage for saving, loading, and managing multiple note documents.

---

## Overview

The notebooks system provides CRUD operations for persisting complete note states (text, settings, pages) in IndexedDB, with a sidebar UI for browsing and managing saved notebooks.

**File**: `notebooks.js`

---

## IndexedDB Schema

| Property | Type | Description |
|----------|------|-------------|
| `id` | String | Unique ID (`nb-{timestamp}-{random}`) |
| `title` | String | User-provided notebook title |
| `text` | String | Full textarea content |
| `state` | Object | Snapshot of `window.S` (all settings) |
| `pages` | Array | Canvas page data (reserved) |
| `createdAt` | Number | Creation timestamp (ms) |
| `updatedAt` | Number | Last save timestamp (ms) |

**Database**: `InkflowNotebooks`, **Object Store**: `notebooks`, **Index**: `updatedAt`

---

## API (NotebooksDB)

### `saveNotebook(id, data)`

Saves or updates a notebook record.

```javascript
await NotebooksDB.saveNotebook('nb-1234', {
  title: 'My Notes',
  text: S.text,
  state: { ...S },
});
```

### `loadNotebook(id)`

Loads a single notebook by ID.

```javascript
const nb = await NotebooksDB.loadNotebook('nb-1234');
// nb: { id, title, text, state, pages, createdAt, updatedAt }
```

### `listNotebooks()`

Returns all notebooks sorted by `updatedAt` descending (newest first).

```javascript
const notebooks = await NotebooksDB.listNotebooks();
```

### `deleteNotebook(id)`

Deletes a notebook from IndexedDB.

```javascript
await NotebooksDB.deleteNotebook('nb-1234');
```

### `duplicateNotebook(id, newTitle)`

Clones a notebook with a new ID and optional new title.

```javascript
const clone = await NotebooksDB.duplicateNotebook('nb-1234', 'My Notes (copy)');
```

### `generateId()`

Returns a unique ID string: `nb-{timestamp}-{6-char-random}`.

---

## UI (NotebooksUI)

### Sidebar Section

```html
<div class="sb-section" id="sec-notebooks">
  <button class="sb-section-header" onclick="toggleSection('sec-notebooks')">
    📓 Notebooks
  </button>
  <div class="sb-body">
    <button onclick="NotebooksUI.saveCurrentNotebook()">💾 Save Current</button>
    <div id="notebooks-list"></div>
  </div>
</div>
```

### `saveCurrentNotebook()`

Prompts for a title via `window.prompt()`, then saves the current editor text and state as a new notebook.

### `renderNotebooksSidebar()`

Fetches all notebooks from IndexedDB and renders them as a list in `#notebooks-list`. Each item shows:
- Title (clickable to open)
- Last modified date
- Delete button (✕)

### `open(id)`

Loads the notebook by ID, restores `S` state and textarea content, triggers `renderText()` and `autosave()`.

### `remove(id)`

Confirms deletion via `window.confirm()`, then deletes and re-renders the sidebar.

---

## Data Flow

```
Save: textarea → saveNotebook(id, { text, state }) → IndexedDB
Load: IndexedDB → loadNotebook(id) → S.text + textarea → renderText()
List: IndexedDB → listNotebooks() → DOM render
Delete: IndexedDB → deleteNotebook(id) → DOM render
```

---

## Initialization

```javascript
// index.js — called after DOM ready
if (window.NotebooksUI) {
  setTimeout(() => window.NotebooksUI.renderNotebooksSidebar(), 500);
}
```

---

## CSS

```css
.notebook-item { display: flex; align-items: center; gap: 8px; padding: 6px 8px;
                 border-radius: 6px; cursor: pointer; border: 1px solid var(--btn-border);
                 margin-bottom: 4px; }
.notebook-item:hover { background: var(--btn-hover); }
.notebook-title { flex: 1; font-size: 13px; font-weight: 500;
                  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.notebook-date { font-size: 11px; color: var(--text-muted); }
```

---

## Limitations

- Notebook state is a shallow copy of `S` — nested objects may share references
- No page canvas data persistence (only text + settings)
- No sync between tabs (IndexedDB transactions are tab-isolated)
- No export/import of notebook collections
