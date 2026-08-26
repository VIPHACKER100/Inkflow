# 📚 API Reference

Complete reference for all public JavaScript functions in `index.js` (≈5,600 lines).

---

## Global State

### `S` (global config object)
Single source of truth for the app. Fields: `text`, `font`, `fontSize`, `lineHeight`, `wordSpacing`, `margin`, `rotationMax`, `inkColor`, `bleed`, `pressure`, `paperStyle`, `noteLayout`, `textAlignment`, `animSpeed`, `currentPage`, `pageDates`, `pageNos`, `showHeaderBox`. Runtime-only fields include `activeTheme`, `_highlightColor`, `isStudyMode`.

### Constants
- `PAGE_W` / `PAGE_H` — canvas size (794 × 1123)
- `TEMPLATE_SHEETS` — `{ letters: [52 chars], symbols: [32 chars] }`
- `ALL_TEMPLATE_CHARS` — 84-character union of both sheets
- `AI_MODELS` — static fallback model lists for `openrouter` / `anthropic`
- `THEMES` — theme pack presets (`default`, `vintage`, `cute`, `science`, `minimal`, `scrapbook`)
- `DB_NAME` (`InkflowDB`), `STORE_NAME` (`draftedGlyphs`), `NOTEBOOKS_STORE` (`notebooks`)

---

## Core Rendering

### `layoutText(text)`
Unified layout engine that computes all character positions, word-wrap, and page breaks. Routes internally to `layoutTextTwoColumn`, `layoutTextCornell`, or `layoutTextCleanStandard` depending on `noteLayout` / `paperStyle`.
- **Parameters**: `text` (String) — raw input text
- **Returns**: `{ queue, pageTexts, pageCount }` — character render items, per-page text strings, total pages
- **Used by**: `renderText()`, `buildCharQueue()`, `startAnimation()`, `autoFitFontSize()`, `redrawPageCanvas()`

### `layoutTextTwoColumn(text, S, PAGE_W, PAGE_H, sanitizeText, containsDevanagari, getFontStack, getCharVariation, getGraphemes, ctx)`
Computes two-column layout wrapping and coordinates.
- **Returns**: `{ queue, pageTexts, pageCount }`

### `layoutTextCornell(text, S, PAGE_W, PAGE_H, sanitizeText, containsDevanagari, getFontStack, getCharVariation, getGraphemes, ctx)`
Computes Cornell Study Notes coordinates. Lines prefixed `? ` / `cue:` → cues column; `== ` / `summary:` → summary footer; other lines → main notes.
- **Returns**: `{ queue, pageTexts, pageCount }`

### `layoutTextCleanStandard(cleanText, S, PAGE_W, PAGE_H, ctx)`
Structured-content layout for `clean` paper + Standard layout. Parses `#`/`##` headings, bullets, and questions via `parseStructuredContent()`, with proportional font sizes, block spacing, and vertical text alignment offsets (`getAlignmentOffset`).
- **Returns**: `{ queue, pageTexts, pageCount }`

### `renderText(text)`
Renders text onto canvas pages with full handwriting simulation.
- **Parameters**: `text` (String)
- **Side Effects**: Sanitizes + parses rich syntax, calls `layoutText()`, clears/recreates pages, draws characters, runs sticky/callout post-passes, syncs page editors

### `buildCharQueue(text)`
Thin wrapper around `layoutText()` returning only the character queue.
- **Returns**: Array of character render items

### `drawPaperBackground(ctx, style, pageNum)`
Paints the paper background (ruled/clean/plain/grid/legal/vintage/dark/dot_grid/engineering/music) including grain texture, margin rules, header box, and layout decorations.
- **Parameters**: `ctx`, `style` (String), `pageNum` (Integer, default 1)
- **Side Effects**: Invokes `drawLayoutDecorations()`

### `drawLayoutDecorations(ctx, noteLayout)`
Draws Cornell dividers and `Cues / Questions`, `Main Notes`, `Summary` labels.
- **Parameters**: `ctx`, `noteLayout` (String)

### `drawRoundedRect(ctx, x, y, width, height, radius)`
Strokes a rounded-rectangle path (used by the header box).

### `getCharVariation(rotMax, pressure, fontSize)`
Generates randomized per-character variation parameters.
- **Returns**: `{ tiltDeg, scaleX, scaleY, baselineOff, spacingExtra, pressureMod, opacity }`

### `getAlignmentOffset(alignment, fontSize, lineHeight)`
Returns the vertical baseline shift for `top` (Upper: `-(lineH * 0.62)`), `middle` (Middle: `-(lineH * 0.32)`), and `bottom` (Lower: `0`) text alignments relative to notebook line baselines.

### `drawCursiveConnector(ctx, item1, item2, S)`
Renders quadratic Bezier stroke curves connecting the exit anchor point of `item1` to the entry anchor point of `item2` for cursive fonts (`Caveat`, `Homemade Apple`, `Kalam`, etc.).

### `getCachedGlyphImage(char, src)`
Returns a fully-decoded `<img>` for a drafted glyph (cached), or `null` while decoding; triggers `debounceRender()` when ready.

---

## Text Processing & Rich Syntax

### `sanitizeText(str)`
Strips non-printable control characters and Private Use Area codepoints. Returns cleaned string.

### `getGraphemes(text)`
Segments text into grapheme clusters via `Intl.Segmenter` with `Array.from()` fallback.

### `isIndicScript(text)` / `containsDevanagari(text)`
Tests for Indic script characters (Devanagari, Bengali, Tamil, etc.). Returns Boolean.

### `getFontStack(isIndic)`
Builds the CSS font-family string, appending `"Noto Sans Devanagari", "Hind", sans-serif` fallbacks when needed.

### `parseRichSyntax(rawText)`
Extracts stickies, callouts, highlights, and flashcards from raw text.
- **Parameters**: `rawText` (String)
- **Returns**: `{ cleanText, flashcards }`
- **Side Effects**: Populates `parsedStickies[]`, `parsedCallouts[]`, `highlightRanges[]`, `activeFlashcards[]`, and updates the flashcards button indicator

### `parseStructuredContent(text)`
Splits text into blocks: `heading`, `subheading`, `bullet` (levels 1/2), `question` (auto-numbered), and `paragraph`.

### `splitRawTextIntoPages(rawText, cleanPageTexts)`
Maps cleaned per-page text back to raw (un-sanitized) page slices.

### `paintStickyNotes(queue, targetPageIdx)`
Post-pass that draws sticky notes into the right margin from `parsedStickies`.
- **Parameters**: `queue` (Array), `targetPageIdx` (Integer or `null` for all pages)

### `paintCallouts(queue, targetPageIdx)`
Post-pass that draws callout boxes into the left margin from `parsedCallouts`.

### `drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines)`
Word-wraps and fills short text (used inside stickies/callouts).

---

## Page Management

### `createPage(pageNum)`
Creates a canvas page with a `contenteditable` editor overlay, Date/Page No. inputs, and margin-text overlay.
- **Returns**: Canvas element
- **Side Effects**: Appends wrapper to DOM, registers focus/blur/input listeners, pushes to `pages[]`, calls `updatePageNav()`

### `redrawPageCanvas(pageNum)`
Re-paints a single page's background and character queue (used during date/page-number editing).

### `updateEditorStyles(editor, canvas)`
Syncs the page editor overlay's font, size, padding, and caret color to canvas dimensions and settings.

### `getGlobalTextFromEditors()`
Concatenates all `.page-editor` `innerText` values. Returns String.

### `clearPages()`
Removes all canvas pages from the DOM and resets the `pages[]` array.

### `clearText()`
Clears the textarea, resets `S.text`, creates one blank page with paper background, and calls `autosave()`.

### `updatePageNav()`
Updates `Page X of Y` indicators and disables/enables prev/next buttons.

### `navigatePage(dir)`
Scrolls to the target page with smooth behavior and updates the nav.
- **Parameters**: `dir` (Integer — `-1` or `1`)

---

## Animation

### `startAnimation()`
Begins the live writing animation. Parses rich syntax, builds the queue via `layoutText()`, recreates pages, then drives a `requestAnimationFrame` loop drawing `S.animSpeed` characters per frame. Moves the pen cursor, auto-scrolls the viewport, and calls `renderText()` on completion.

### `stopAnimation()`
Cancels the animation frame, sets `isAnimating = false`, and hides the pen cursor.

### `buildCharQueue(text)`
Returns the character queue for the given text (see above).

---

## AI Integration

### `callClaude(prompt, systemPrompt, onChunk)`
Sends a streaming request to OpenRouter or Anthropic.
- **Parameters**: `prompt` (String), `systemPrompt` (String), `onChunk` (Function)
- **Returns**: Promise resolving to the full response text, or `null` on failure
- **Streaming**: SSE via `ReadableStream` / `TextDecoder`, `max_tokens: 1500`

### `callOllama(prompt, systemPrompt, model, onChunk)`
Sends a streaming request to a local Ollama server (default `http://localhost:11434/api/chat`).
- **Parameters**: `prompt` (String), `systemPrompt` (String), `model` (String), `onChunk` (Function)
- **Returns**: Promise resolving to full response text, or `null` on failure (e.g. connection error)
- **Privacy**: 100% private client-side REST call; requires no API key.

### `initApiKeyPersistence()`
Wires `input` and `change` event listeners to `#api-key` and `#remember-api-key`. Saves `inkflow-api-key-{provider}` to `localStorage` when checked and restores it on page boot or provider change.

### `aiAction(type)`
Dispatches an AI workflow and streams the result onto the canvas.
- **Parameters**: `type` (String — `arrange | summarize | grammar | lecture | assignment`)

### `fetchOpenRouterModels()`
Asynchronously fetches the OpenRouter model catalog and replaces the fallback list (free models first, then alphabetical).

### `onProviderChange()`
Rebuilds the model dropdown and API-key label for the selected provider (`openrouter | anthropic | ollama`); triggers `fetchOpenRouterModels()` for OpenRouter and loads saved API keys.

### `setAiStatus(msg)`
Writes a status message into `#ai-status`.

---

## Export Functions

### `_upscaleCanvas(src, scale)`
Renders a canvas onto a `scale`× higher-resolution off-screen canvas with high-quality smoothing. Returns the new canvas.

### `exportImage(format)`
Exports pages as PNG or JPG, 2× upscaled, via `canvas.toBlob()` and Blob URLs. Multi-page documents download one file per page.

### `exportPDF()`
Compiles all pages into a multi-page A4 PDF, embedding 2×-upscaled lossless PNGs with `NONE` compression. Output: `inkflow-notes.pdf`.

### `exportSVG()`
Generates SVG files wrapping full-resolution PNG images, one file per page.

### `copyToClipboard()`
Copies the current page as PNG to the system clipboard via the Clipboard API.

### `triggerDownload(url, filename)`
Creates a temporary anchor element, triggers the download, and cleans up.

### `showExportToast(msg, type)`
Shows a non-blocking toast (`info | success | warn | error`) with auto-dismiss for non-info types.

---

## Persistence

### `autosave()`
Debounced (1000ms) serializer that writes settings to `localStorage` (`inkflow-state`) and mirrors the current note into the active notebook in IndexedDB.

### `async restoreState()`
Hydrates `S` from `localStorage`, syncs DOM controls, loads glyphs from IndexedDB, migrates legacy glyphs, and prunes blank glyphs.

### `resetToDefaults()`
Resets all settings to factory defaults and updates every relevant DOM control.

### `getDB()`
Resolves a Promise with the `InkflowDB` connection, creating the `draftedGlyphs` store if needed.

### `saveGlyphDB(char, dataUrl)`
Writes a drafted glyph data URL to IndexedDB. Returns a Promise.

### `getGlyphsDB()`
Returns a Promise resolving to an object mapping characters → data URLs from IndexedDB.

### `glyphHasInk(dataUrl)`
Returns a Promise resolving to `true` if the data URL contains a visible (non-blank) pixel.

### `async pruneBlankGlyphs()`
Removes blank/corrupt glyphs from memory and IndexedDB, updates the char-grid UI, and clears cache entries. Returns the number pruned.

---

## Notebooks & Folders

### `getNotebooksDB()`
Resolves a Promise with the `InkflowDB` connection, creating the `notebooks` store (keyPath `id`) if needed.

### `saveNotebook(notebook)`
Puts a notebook record into the `notebooks` store. Returns a Promise.

### `getAllNotebooks()`
Returns a Promise resolving to the array of all notebook records.

### `deleteNotebook(id)`
Deletes a notebook record. Returns a Promise.

### `async createNewNotebook()`
Prompts for a title/folder, saves a new note, loads it, and re-renders the explorer.

### `async createNewFolder()`
Prompts for a folder name and creates an untitled note inside it.

### `async loadNotebook(id)`
Loads a notebook's content and per-note settings into `S`, syncs the UI, and re-renders.

### `async deleteNotebookClicked(id, event)`
Confirms and deletes a note; loads the next available note (or clears) if the active note was deleted.

### `renderNotebooksList()`
Renders the folder-grouped notebook explorer from IndexedDB.

---

## Study Tools

### `toggleStudyMode()`
Toggles the `study-mode-active` body class, expands canvas area to 100% viewport width (`grid-template-columns: 1fr`), auto-dims top toolbar (`opacity: 0.5`) with hover reveal, displays floating exit button, smoothly scrolls active page into view, and supports `Escape` key shortcut exit.

### Flashcards — `openFlashcardsModal()`, `closeFlashcardsModal()`, `flipFlashcard()`, `nextFlashcard()`, `prevFlashcard()`, `updateFlashcardUI()`
Open/close the review modal, flip the active card, navigate the deck, and update the question/answer/progress UI.

### Voice — `initVoiceToNotes()`, `toggleVoiceInput()`
Initializes the Web Speech API recognizer (continuous, `en-US`) and toggles recording inside `try-catch` guards. Appends transcripts to the textarea, displays toast error notifications (`showToast`) on permission or speech errors, and disables the mic button when unsupported.

---

## Theme Packs

### `applyTheme(themeId)`
Applies a theme preset (`default | vintage | cute | science | minimal | scrapbook`) to `S` and syncs all UI controls, then re-renders and autosaves.

---

## Font & Style Controls

### `setPaper(btn)`
Activates a paper style, enforces the clean-style font allow-list when needed, and toggles header visibility.

### `setInkPreset(hex, name)`
Sets the ink color from a preset button and updates the label.

### `setTextAlignment(alignment)`
Sets `S.textAlignment` (`top` / `middle` / `bottom`), updates the alignment UI, and re-renders.

### `autoFitFontSize()`
Binary-searches (6 iterations) the largest font size in 14–52 that keeps text on one page, then re-renders.

### `toggleSection(id)`
Toggles a collapsible sidebar section.

### `applyDark()`
Toggles dark mode on the root element and updates the toggle icon.

### `trapFocusModal(modalElement)`
Enforces WCAG 2.1 accessible focus trapping (`Tab` cycling and `Escape` dismissal) within the specified open modal element.

---

## Custom Font Suite

### `openHandFontedModal()` / `closeHandFontedModal()`
Show/hide the HandFonted Studio modal (resets to the Letters sheet on open).

### `switchFontTab(tab)`
Switches between `sketchpad` and `template` panels.

### `switchSheet(sheet)`
Switches the active sheet (`letters` / `symbols`), re-renders the char grid, and selects the first character.

### `renderSketchCharGrid()`
Builds the character button grid for the active sheet, marking drafted characters.

### `selectSketchCharacter(char)`
Selects a character, updates the guide/display, clears the canvas, and loads the drafted image if present.

### `saveActiveCharacter()`
Guards against blank sketches (`isCellBlank`), saves the canvas as a data URL into `draftedGlyphs` and IndexedDB, updates the UI, and shows a preview.

### `clearSketchCanvas()`, `undoSketchStroke()`, `updateBrushSize()`
Canvas tools for clearing, undoing strokes, and adjusting brush width.

### `updateCharProgress()`
Updates the `completed / 84` progress bar.

### `showCharPreview(dataUrl)`
Draws the just-saved glyph into the preview canvas.

### `exportFontProject()`
Downloads the entire glyph set + font name as a JSON project file.

### `importFontProject(event)`
Loads a JSON project, merges glyphs, prunes blanks, and refreshes the UI.

### `advanceActiveCharacter()`
Saves the current character and selects the next one; prompts to switch sheets when a set is complete.

### `generateDownloadTemplate()`
Generates and downloads the 3-sheet template package (instructions + Letters + Numbers & Symbols) as 1600×1600 PNGs.

### `setupTemplateUploader()`
Wires the template dropzone, sheet selector, and grid sliders.

### `handleTemplateImage(file)`
Loads an uploaded sheet image and stores it per-sheet in `alignerImages`.

### `updateAlignerGrid()`
Redraws the alignment overlay (shading + 8×8 grid) from the current slider values.

### `cropTemplateCell(index, sheetName)`
Crops a character cell (128×128) from the aligned upload for the given sheet. Returns a canvas or `null`.

### `traceCanvasContours(canvas)`
Runs Moore-Neighbor contour tracing on a binarized canvas. Returns an array of contour point arrays.

### `isCellBlank(canvas)`
Returns `true` when the canvas has no significant ink (alpha > 50 and brightness < 160).

### `simplifyPath(points, tolerance)`
Applies Ramer–Douglas–Peucker simplification. Returns a reduced point array.

### `loadImageToCanvas(dataUrl)`
Decodes a data URL into a centered 256×256 canvas. Returns a Promise.

### `canvasToOpentypePath(canvas)`
Converts traced contours into an `opentype.Path` scaled into the 1000-unit em box (fit within 600×700 units).

### `ensureOpentypeLoaded()`
Lazy-loads opentype.js 1.3.4 from CDN. Returns a Promise.

### `async buildCustomFont()`
Compiles all drafted glyphs into a TrueType font, registers it as a `FontFace`, appends it to the font selector, and applies it.

---

## Device & Misc Helpers

### `getDeviceType()`
Returns `{ type, canvasSize, isTouchDevice }` based on viewport width (mobile / tablet-portrait / tablet-landscape / desktop / large-desktop).

### `adjustCanvasSizeForDevice()`
Sets the sketchpad canvas resolution based on device pixel ratio (up to 2×) and applies touch optimizations.

### `getOptimalAnimationSettings()`
Returns `{ useRAF, smoothing }` based on screen refresh rate. *(Defined but currently unused.)*

### `debounceRender()`
Debounced wrapper (280ms) around `renderText(S.text)`.

### `triggerRender()`
Immediate render from the current textarea value.
