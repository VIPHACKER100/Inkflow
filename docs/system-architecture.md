# 🏛️ System Architecture

This document outlines the **high-level system architecture**, **component layers**, and **data flow** of the Inkflow Handwritten Notes Generator.

---

## Architecture Overview

Inkflow is architected as a highly modular, decoupled, single-file client-side application. It operates entirely within the user's browser, eliminating backend latency and optimizing rendering speeds.

---

## Component Map

The application's structural components are divided into four primary layers:

```mermaid
graph TD
    subgraph UI_Layer [User Interface Layer]
        A[Control Console / Sidebar]
        B[Floating Top Toolbar]
        C[Canvas Viewport + Page Editors]
        D[Floating Pagination Controls]
    end

    subgraph State_Layer [State Management Layer]
        E[Global State Object S]
        F[Debounced Autosave Module]
        G[LocalStorage Interface]
        R[IndexedDB Glyph Store]
    end

    subgraph Engine_Layer [Core Execution Engines]
        H[Paper Renderer]
        I[Glyph Variation Engine]
        J[layoutText — Unified Layout Engine]
        K[Writing Queue & Animation Engine]
        L[Page Editor Sync Layer]
    end

    subgraph External_Layer [Integration & Export Services]
        M[OpenRouter / Anthropic Claude API — SSE Streaming]
        N[Blob URL Export — PNG / JPG / SVG]
        O[jsPDF Multi-Page Document Compiler]
        P[Clipboard API — Copy as PNG]
        Q[OS Print Spooler]
    end

    A -->|User Input Events| E
    B -->|Action Controls| E
    E -->|State Synchronization| F
    F -->|Serialized Save| G
    G -->|State Hydration| E
    R -->|Glyph Data Hydration| E

    E -->|Render Triggers| H
    E -->|Transform Configs| I
    E -->|Spacing / Size Controls| J
    E -->|Speed & Mode Controls| K

    H -->|Paint Canvas Backgrounds| C
    I -->|Matrix Transforms| C
    J -->|Char Queue + Page Texts| K
    J -->|Char Queue| L
    K -->|RAF Loop & Vector Pen Positioning| C
    L -->|Editor innerText Sync| C

    A -->|AI Action Requests + SSE stream| M
    M -->|Incremental Text Chunks| E
    C -->|canvas.toBlob()| N
    C -->|JPEG Binary Stream| O
    C -->|canvas.toBlob() PNG| P
    C -->|Print Style Overrides| Q
```

---

## Layer Descriptions

### 1. User Interface Layer
The visible DOM elements the user interacts with directly. These include the sidebar control console (300px width), the floating top toolbar (56px fixed header), the main canvas grid viewport with inline page editors (`.page-editor` contenteditable overlays), and the bottom pill-style pagination controls.

### 2. State Management Layer
A centralized global configuration object `S` acts as the single source of truth. Changes to any UI control update `S`, which triggers re-rendering. A debounced autosave module serializes the state to `localStorage` after a 1000ms idle delay. Custom handwriting glyph data is stored in **IndexedDB** (`InkflowDB` → `draftedGlyphs` store) to bypass the 5MB `localStorage` quota limit.

### 3. Core Execution Engines
The rendering pipeline that transforms state data into visual canvas output. The key innovation in v1.2.0 is the **unified `layoutText()` engine**, which performs all word-wrap, page-break, and character queue computation in a single pass, ensuring that both static rendering (`renderText`) and animation playback (`buildCharQueue`) produce identical results from the same layout logic.

### 4. Integration & Export Services
External integrations for AI text generation (OpenRouter + Anthropic, with SSE streaming), native canvas image exports (Blob URL-based PNG/JPG/SVG), multi-page PDF compilation (jsPDF), clipboard copy (Clipboard API), and native OS print dialog access.

---

## Rendering Pipeline Data Flow

```mermaid
graph LR
    INPUT[Text Input / AI Chunk] --> SANITIZE[sanitizeText]
    SANITIZE --> LAYOUT[layoutText]
    LAYOUT --> QUEUE["queue[] — char positions & variations"]
    LAYOUT --> PAGETEXTS["pageTexts[] — text per page"]
    LAYOUT --> PAGECOUNT[pageCount]

    QUEUE --> STATIC[renderText — static canvas draw]
    QUEUE --> ANIM[startAnimation — RAF loop]
    PAGETEXTS --> EDITORS[Page Editor innerText sync]
    PAGECOUNT --> PAGES[createPage — canvas allocation]
```

---

## Key Architectural Strengths

1. **Unified Layout Engine**: A single `layoutText()` function handles all word-wrap, page-break, and character coordinate calculations — ensuring layout parity between static renders and animations.
2. **Perfect Decoupling**: The central config state `S` is completely decoupled from the rendering loop. Updates to inputs, themes, or text simply update `S` and trigger a canvas repaint.
3. **SSE Streaming AI**: AI responses stream word-by-word into the canvas in real time, preventing UI freezing and providing instant visual feedback.
4. **Blob-based Export**: All exports use native `canvas.toBlob()` rather than DataURL strings, resolving browser download limits for large documents and improving memory efficiency.
5. **Inline Page Editing**: Transparent `contenteditable` overlays over each canvas allow direct text editing on the page, with automatic sync back to the global text state.
6. **Pristine Client-Side Vectorization**: Performs real-time Moore-Neighbor contour tracing, RDP curve simplification, and TTF compilation purely inside the browser.
7. **Standalone Portability**: All styling, layout logic, rendering scripts, and third-party dependencies run inside a single, portable HTML file that works offline in any browser.
