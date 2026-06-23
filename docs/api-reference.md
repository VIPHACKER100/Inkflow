# 📚 API Reference

Complete reference for all public JavaScript functions in `index.js`.

---

## Core Rendering

### `layoutText(text)`
**v1.4.0** — Unified layout engine that computes all character positions, word-wrap, and page breaks. Supports Mermaid diagram blocks (````mermaid`). Routes internally to `layoutTextTwoColumn` or `layoutTextCornell` if layout-specific overrides are active (Note: Diagram blocks currently supported in standard layout).
- **Parameters**: `text` (String) — raw input text
- **Returns**: `{ queue, pageTexts, pageCount }` — character render items, per-page text strings, total pages
- **Used by**: `renderText()`, `buildCharQueue()`, `startAnimation()`

### `layoutTextTwoColumn(text, S, PAGE_W, PAGE_H, sanitizeText, containsDevanagari, getFontStack, getCharVariation, getGraphemes, ctx)`
**v1.3.0** — Computes two-column layout word wrapping and coordinates.
- **Parameters**: Takes raw text, global state `S`, canvas size configuration, text-helper functions, and a rendering context.
- **Returns**: `{ queue, pageTexts, pageCount }` formatted for two columns.

### `layoutTextCornell(text, S, PAGE_W, PAGE_H, sanitizeText, containsDevanagari, getFontStack, getCharVariation, getGraphemes, ctx)`
**v1.3.0** — Computes layout coordinates matching the Cornell Study Notes structure.
- **Parameters**: Same as `layoutTextTwoColumn`. Parses lines starting with `? ` / `cue:` as cues, lines starting with `== ` / `summary:` as summary notes, and all other text as main notes.
- **Returns**: `{ queue, pageTexts, pageCount }` divided into three functional areas.

### `renderText(text)`
Renders the given text onto canvas pages with full handwriting simulation.
- **Parameters**: `text` (String)
- **Side Effects**: Calls `layoutText()`, creates/updates canvas pages, draws characters, syncs page editors

### `buildCharQueue(text)`
Thin wrapper around `layoutText()` that returns only the character queue.
- **Parameters**: `text` (String)
- **Returns**: Array of character render items `{ ch, x, y, v, pageIdx, isIndic, fontStack }`

### `drawPaperBackground(ctx, style)`
Paints the paper background on a canvas context.
- **Parameters**: `ctx` (CanvasRenderingContext2D), `style` (String — `ruled|plain|grid|legal|vintage|dark|dot_grid|engineering|music`)
- **Side Effects**: Also invokes `drawLayoutDecorations()` to overlay layout dividers and labels.

### `drawLayoutDecorations(ctx, noteLayout)`
**v1.3.0** — Draws dividing boundaries and text titles (e.g. "Cues", "Summary") for the active page layout template.
- **Parameters**: `ctx` (CanvasRenderingContext2D), `noteLayout` (String)
- **Side Effects**: Draws layout visual lines and labels onto the background canvas.

### `getCharVariation(rotMax, pressure, fontSize)`
Generates randomized per-character variation parameters.
- **Parameters**: `rotMax` (Float), `pressure` (Float), `fontSize` (Integer)
- **Returns**: `{ tiltDeg, scaleX, scaleY, baselineOff, spacingExtra, pressureMod, opacity }`

---

## Text Processing Helpers

### `sanitizeText(str)`
Strips non-printable control characters and Private Use Area codepoints.
- **Parameters**: `str` (String)
- **Returns**: Cleaned string

### `getGraphemes(text)`
Segments text into individual grapheme clusters using `Intl.Segmenter` with `Array.from()` fallback.
- **Parameters**: `text` (String)
- **Returns**: Array of grapheme strings

### `isIndicScript(text)` / `containsDevanagari(text)`
Tests if text contains Indic script characters (Devanagari, Bengali, Tamil, etc.).
- **Parameters**: `text` (String)
- **Returns**: Boolean

### `getFontStack(isIndic)`
Builds CSS font-family string with Devanagari fallbacks if needed.
- **Parameters**: `isIndic` (Boolean)
- **Returns**: Font family string (e.g., `"Caveat", "Noto Sans Devanagari", "Hind", sans-serif`)

---

## Page Management

### `createPage(pageNum)`
Creates a new canvas page with an inline `contenteditable` editor overlay.
- **Parameters**: `pageNum` (Integer)
- **Returns**: Canvas element
- **Side Effects**: Appends wrapper to DOM, registers focus/blur/input listeners, pushes to `pages[]`

### `clearPages()`
Removes all canvas pages from the DOM and resets the `pages[]` array.

### `clearText()`
Clears the textarea, resets `S.text`, creates a blank page with paper background, and calls `autosave()`.

### `updateEditorStyles(editor, canvas)`
Syncs the page editor overlay's font, padding, and size to match current settings and canvas dimensions.

### `getGlobalTextFromEditors()`
Reads all `.page-editor` elements and concatenates their `innerText`, keeping the sidebar textarea in sync.

---

## Animation

### `startAnimation()`
Begins the live writing animation sequence.
- **Side Effects**: Calls `layoutText()`, creates paper backgrounds, starts RAF loop, shows pen cursor, auto-scrolls viewport

### `stopAnimation()`
Stops the active animation and hides the pen cursor.

---

## AI Integration

### `callClaude(prompt, systemPrompt, onChunk)`
Sends a streaming request to OpenRouter or Anthropic API.
- **Parameters**: `prompt` (String), `systemPrompt` (String), `onChunk` (Function — called with each text delta)
- **Returns**: Promise resolving to the full AI response text
- **Streaming**: Uses SSE via `ReadableStream` for real-time word-by-word rendering

### `aiAction(action)`
Dispatches an AI workflow (summarize, fix grammar, lecture→notes, generate assignment).
- **Parameters**: `action` (String — `summarize|grammar|lecture|assignment`)

### `fetchOpenRouterModels()`
Asynchronously fetches the complete model catalog from OpenRouter API and updates the dropdown.

### `onProviderChange()`
Updates the model dropdown and API key label when the AI provider selection changes.

---

## State Management

### `async initApp()`
**v1.3.0** — Initializes the application asynchronously. Awaits `restoreState()` to populate custom glyphs from IndexedDB, sets up the file upload triggers, initializes HandFonted Studio controls, and triggers the initial page render.

### `autosave()`
Debounced function (1000ms) that serializes current configurations to `localStorage` under key `inkflow-state`. Does *not* include custom glyph coordinate arrays.

### `async restoreState()`
**v1.3.0** — Hydrates the system state on boot. Reads saved settings from `localStorage`, updates all corresponding DOM UI inputs (sliders, dropdowns, layouts), and loads drawn glyphs from IndexedDB. If legacy glyph data is found in `localStorage`, migrates it to IndexedDB and purges it from `localStorage`.

### `resetToDefaults()`
Resets all configurations to factory defaults, updates DOM controls, and triggers a re-render.

### `getDB()`
**v1.3.0** — Resolves a Promise with the active `IndexedDB` connection instance to `InkflowDB`, initializing the `draftedGlyphs` object store if it does not exist.

### `saveGlyphDB(char, dataUrl)`
**v1.3.0** — Asynchronously writes the SVG path data URL for a given character to `IndexedDB`.
- **Parameters**: `char` (String), `dataUrl` (String)
- **Returns**: Promise resolving on transaction success.

### `getGlyphsDB()`
**v1.3.0** — Retrieves all drafted characters and their coordinates stored in the `IndexedDB` database.
- **Returns**: Promise resolving to an object mapping characters to their data URLs.

---

## Export Functions

### `exportImage(format)`
Exports rendered pages as PNG or JPG using `canvas.toBlob()` and Blob URLs.
- **Parameters**: `format` (String — `png|jpg`)

### `exportPDF()`
Compiles all pages into a multi-page A4 PDF with progress toasts. Output: `inkflow-notes.pdf`.

### `exportSVG()`
Generates SVG files wrapping full-resolution PNG images. One file per page for multi-page documents.

### `copyToClipboard()`
Copies the current page as a PNG image to the system clipboard via the Clipboard API.

### `triggerDownload(url, filename)`
Shared helper that creates a temporary anchor element, triggers the download, and cleans up.

### `showExportToast(msg, type)`
Displays a non-blocking toast notification with auto-dismiss for success/warn/error types.

---

## UI Helpers

### `toggleSection(id)`
Toggles a collapsible sidebar section open/closed with smooth animation.
- Parameters: `id` (String) — The HTML ID of the sidebar section to toggle

### `applyDark()`
Toggles the dark mode state on the root element of the document and updates the theme toggle icon.

### `navigatePage(direction)`
Navigates between rendered pages with smooth scroll-into-view.
- **Parameters**: `direction` (Integer — `-1` for previous, `1` for next)

### `updatePageNav()`
Updates the page indicator text and disables/enables navigation buttons based on current page.

### `debounceRender()`
Debounced wrapper (280ms) around `renderText()` to prevent redundant renders during fast typing.

### `triggerRender()`
Immediate (non-debounced) render from the current textarea value.

---

## Custom Font Suite

### `generateDownloadTemplate()`
Generates and downloads a blank 8×8 handwriting template grid (1600×1600px PNG) corresponding to the active character sheet (`Letters` or `Numbers & Symbols`).

### `buildCustomFont()`
Compiles sketched/traced glyphs across both sheets into a single, comprehensive TrueType font file and registers it via CSS FontFace.

### `traceContours(imageData, width, height)`
Runs Moore-Neighbor contour tracing on binary pixel data.
- **Returns**: Array of closed contour coordinate arrays

### `simplifyPath(points, epsilon)`
Applies Ramer-Douglas-Peucker simplification to a contour path.
- **Returns**: Simplified array of {x, y} coordinates

### `updateAlignerGrid()`
Redraws the template alignment overlay for the active upload template sheet using its corresponding slider values.

### `switchSheet(sheet)`
**v1.3.0** — Switches the active character sheet in HandFonted Studio.
- **Parameters**: `sheet` (String — `letters|symbols`)
- **Side Effects**: Sets the active sheet state, toggles active tab CSS classes, regenerates the character grid, and selects the first character of the sheet.

### `cropTemplateCell(index, sheetName)`
**v1.3.0** — Slices and crops a character cell from the uploaded scanned template image for the specified sheet.
- **Parameters**: `index` (Integer) — character cell index, `sheetName` (String — `letters|symbols`)
- **Returns**: Canvas element containing the cropped character, or `null` if no image has been uploaded for that sheet.
