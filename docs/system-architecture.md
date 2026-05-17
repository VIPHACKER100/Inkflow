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
        C[Active Canvas Grid Viewport]
        D[Floating Pagination Controls]
    end

    subgraph State_Layer [State Management Layer]
        E[Global State Object S]
        F[Debounced Autosave Module]
        G[LocalStorage Interface]
    end

    subgraph Engine_Layer [Core Execution Engines]
        H[Paper Renderer]
        I[Glyph Variation Engine]
        J[Layout & Wrap Engine]
        K[Writing Queue & Animation Engine]
    end

    subgraph External_Layer [Integration & Export Services]
        L[Anthropic Claude API]
        M[html2canvas Image Pipeline]
        N[jsPDF Multi-Page Document Compiler]
        O[OS Print Spooler]
    end

    A -->|User Input Events| E
    B -->|Action Controls| E
    E -->|State Synchronization| F
    F -->|Serialized Save| G
    G -->|State Hydration| E
    
    E -->|Render Triggers| H
    E -->|Transform Configs| I
    E -->|Spacing / Size Controls| J
    E -->|Speed & Mode Controls| K

    H -->|Paint Canvas Backgrounds| C
    I -->|Matrix Transforms| C
    J -->|Baseline Wobble & Wrapping| C
    K -->|RAF Loop & Vector Pen Positioning| C

    A -->|AI Action Requests| L
    L -->|State Text Overwrites| E
    C -->|DOM Image Serialization| M
    C -->|JPEG Binary Stream| N
    C -->|Print Style Overrides| O
```

---

## Layer Descriptions

### 1. User Interface Layer
The visible DOM elements the user interacts with directly. These include the sidebar control console (300px width), the floating top toolbar (56px fixed header), the main canvas grid viewport, and the pagination controls at the bottom.

### 2. State Management Layer
A centralized global configuration object `S` acts as the single source of truth. Changes to any UI control update `S`, which triggers re-rendering. A debounced autosave module serializes the state to `localStorage` after a 1000ms idle delay.

### 3. Core Execution Engines
The rendering pipeline that transforms state data into visual canvas output. This includes the paper background painter, the per-character glyph variation engine, the word-wrap and page-break layout engine, and the live writing animation system.

### 4. Integration & Export Services
External integrations for AI text generation (Anthropic Claude), image screenshot capture (html2canvas), multi-page PDF compilation (jsPDF), and native OS print dialog access.

---

## Key Architectural Strengths

1. **Perfect Decoupling**: The central config state `S` is completely decoupled from the rendering loop. Updates to inputs, themes, or text simply update `S` and trigger a canvas repaint.
2. **Robust Multi-Page Math**: The word-wrapping and page-breaking calculations run automatically during rendering, ensuring clean margins without splitting words across lines or pages.
3. **Pristine Client-Side Vectorization**: Performs real-time Moore-Neighbor contour tracing, RDP curve simplification, and TTF compilation purely inside the browser.
4. **No-Lag Rendering**: The debounced rendering pipeline prevents UI stutters, keeping inputs responsive even when editing long-form text.
5. **Standalone Portability**: All styling, layout logic, rendering scripts, and third-party dependencies run inside a single, portable HTML file that works offline in any browser.
