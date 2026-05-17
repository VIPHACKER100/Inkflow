# 📚 API Reference

Complete reference for all public JavaScript functions in `index.js`.

---

## Core Rendering

### `renderText(text)`
Renders the given text string onto the canvas pages with full handwriting simulation.
- **Parameters**: `text` (String) — the text to render
- **Side Effects**: Creates/updates canvas pages, applies glyph variations, handles word-wrap and page breaks
- **Triggers**: Called on text change, font change, or any style update

### `drawPaperBackground(ctx, style)`
Paints the paper background on a canvas context.
- **Parameters**: `ctx` (CanvasRenderingContext2D), `style` (String — `ruled|plain|grid|legal|vintage|dark`)
- **Side Effects**: Fills canvas with background color, draws lines/grids, adds paper grain noise

### `getCharVariation(rotMax, pressure)`
Generates randomized per-character variation parameters.
- **Parameters**: `rotMax` (Float — max rotation degrees), `pressure` (Float — pressure factor)
- **Returns**: `{ tiltDeg, scaleX, scaleY, baselineOff, spacingAdj, pressureMod }`

---

## Animation

### `startAnimation()`
Begins the live writing animation sequence.
- **Side Effects**: Builds character queue, creates paper backgrounds, starts RAF loop, shows pen cursor

### `stopAnimation()`
Stops the active animation and hides the pen cursor.

---

## AI Integration

### `callClaude(systemPrompt, userText)`
Sends a request to the Anthropic Claude API.
- **Parameters**: `systemPrompt` (String), `userText` (String)
- **Returns**: Promise resolving to the AI response text
- **Throws**: Error on network failure, invalid API key, or rate limiting

---

## State Management

### `initApp()`
Initializes the application — restores state from localStorage, syncs UI controls, triggers initial render.

### `autosave()`
Debounced function (1000ms) that serializes current state to `localStorage` under key `inkflow-state`.

### `restoreState()`
Reads saved state from localStorage, hydrates global config `S`, and syncs all DOM input elements.

---

## Export Functions

### `exportImage(format)`
Exports the rendered pages as an image file.
- **Parameters**: `format` (String — `png|jpg`)
- **Side Effects**: Triggers browser download of the image file

### `exportPDF()`
Compiles all rendered pages into a multi-page A4 PDF and triggers download.
- **Output**: `inkflow-notes.pdf`

### `printNotes()`
Opens the native OS print dialog with print-optimized CSS overrides.

---

## Custom Font Suite

### `generateDownloadTemplate()`
Generates and downloads a blank 8×8 handwriting template grid (1600×1600px PNG).

### `buildCustomFont()`
Compiles sketched/traced glyphs into a TrueType font file and registers it via CSS FontFace.
- **Side Effects**: Creates font blob URL, registers FontFace, adds to font dropdown

### `traceContours(imageData, width, height)`
Runs Moore-Neighbor contour tracing on binary pixel data.
- **Parameters**: ImageData pixel array, canvas dimensions
- **Returns**: Array of closed contour coordinate arrays

### `simplifyPath(points, epsilon)`
Applies Ramer-Douglas-Peucker simplification to a contour path.
- **Parameters**: `points` (Array of {x, y}), `epsilon` (Float — tolerance, default 1.0)
- **Returns**: Simplified array of {x, y} coordinates

### `updateAlignerGrid()`
Redraws the template alignment overlay using current slider values (X, Y, W, H offsets).

---

## UI Helpers

### `toggleSection(element)`
Toggles a collapsible sidebar section open/closed with smooth animation.

### `setTheme(theme)`
Switches between light and dark mode.
- **Parameters**: `theme` (String — `light|dark`)

### `changePage(direction)`
Navigates between rendered pages.
- **Parameters**: `direction` (Integer — `-1` for previous, `1` for next)

### `debounceRender()`
Debounced wrapper (280ms) around `renderText()` to prevent redundant renders during fast typing.
