# 📋 Changelog

All notable changes to Inkflow are documented in this file.

---

## [1.5.0] — 2026-08-27

### ✨ Added
- **Progressive Web App (PWA) Offline Support**: Added `sw.js` (Service Worker) and `manifest.json` (Web App Manifest). Inkflow can now be installed directly to desktop or mobile home screens and works 100% offline with a Cache-First strategy for CDN assets (Google Fonts, FontAwesome, jsPDF) and Network-First for app shell files.
- **Ollama Local AI Provider Integration**: Added `ollama` option to the AI Provider selector with support for local models (`Llama 3.2`, `Mistral`, `Phi-4`, `Gemma 2`, `Qwen 2.5`, `DeepSeek R1`, `CodeLlama`). Integrates with Ollama's local REST API (`http://localhost:11434/api/chat`) for 100% private, offline AI notes summarization, smart arranging, and assignment generation without API keys.
- **Connected Cursive Ligature Engine**: Added `CURSIVE_FONTS` set (`Caveat`, `Homemade Apple`, `Shadows Into Light`, `Nanum Pen Script`, `Reey`, `Amita`, `Kalam`) and `drawCursiveConnector()` quadratic Bezier stroke rendering pipeline that dynamically draws entry/exit ligature connectors between adjacent glyphs for realistic cursive writing.

---

## [1.4.1] — 2026-08-24

### ✨ Added
- **Keyboard Shortcut for Study Mode**: Added an `Escape` key shortcut listener to exit Study Mode instantly from anywhere in the app.
- **Active Page Auto-Centering**: `toggleStudyMode()` now automatically scrolls the active page canvas cleanly into center view (`scrollIntoView({ behavior: 'smooth', block: 'center' })`) upon entering or exiting Study Mode.
- **Enhanced Voice Input Error Toasts**: `voiceRecognition.onerror` now displays friendly toast notifications (`showToast(msg, 'error')`) detailing microphone permission or network issues.

### ♻️ Changed
- **Study Mode Layout & Viewport Engine**: Completely rewritten Study Mode CSS (`body.study-mode-active`). Removed off-screen column shifts (`grid-template-columns: 1fr !important`). `#canvas-area` and `#canvas-area::before` (dot grid background pattern) now span 100% of the screen width. `#toolbar` auto-dims to `0.5` opacity and lights up smoothly on hover or focus-within.
- **Clean Notes Text Alignment**: Integrated `getAlignmentOffset(S.textAlignment, blockFontSize, S.lineHeight)` into `layoutTextCleanStandard()`, enabling Upper, Middle, and Lower text alignment in Clean Notes paper style.
- **Recalibrated Text Alignment Geometry**: Updated `getAlignmentOffset()` formulas so that `bottom` ("Lower") sits text baseline directly **ON** the ruled line (`0`), `middle` ("Middle") floats text **CENTERED** between lines (`-(lineH * 0.32)`), and `top` ("Upper") positions text touching the **UPPER** line (`-(lineH * 0.62)`).
- **Text Alignment UI Preview Icons**: Adjusted `.align-text.align-bottom` positioning (`bottom: 5px`) in `index.css` so preview button icons accurately match the canvas paper placement.
- **Voice Input Start/Stop Safety**: Removed recursive `toggleVoiceInput()` calls inside `onerror` and added `try-catch` guards around `.start()` and `.stop()`.

---

## [1.4.0] — 2026-08-15

### ✨ Added
- **Clean Paper Style**: New `clean` paper style that bypasses custom drafted glyphs, ink bleed, and rotation chaos for a crisp, typographic look. When active (with the Standard layout), text is rendered through a structured content parser (`parseStructuredContent`) supporting Markdown-style `#` headings, `##` subheadings, `-`/`*` bullet lists (nested levels), and auto-numbered `Q1.` / `Q.` question blocks.
- **Clean Style Font Restrictions**: Selecting `clean` paper automatically switches to a permitted font (Kalam or one of the clean/Devanagari set) when an unsupported handwriting font is active.
- **Configurable Header Visibility**: New "Show Date & P. No. Header" checkbox toggles the printed header box on `ruled` and `clean` pages. The `S.showHeaderBox` flag persists across sessions.
- **Structured Study Syntax**: The text parser now recognizes `[sticky:color]…[sticky]` notes, `[callout:type]…[callout]` boxes, `==highlight==` ranges, and `Q:`/`A:` flashcard pairs. Stickies float in the right margin (yellow/cyan/pink/mint), callouts attach to the left margin (warning/info/formula), and highlights are drawn behind their characters.
- **Study Mode**: New toolbar toggle that dims editing chrome for review, with a floating "Exit Study Mode" button.
- **Flashcard Review Deck**: `Q:`/`A:` pairs are collected into a flashcard deck. A toolbar button opens the flip-card review modal with prev/next navigation and a progress counter.
- **Voice to Notes**: Speech-to-text input (Web Speech API) appends transcribed notes to the text area. Automatically disabled in browsers without `SpeechRecognition` support.
- **Notebooks & Folders Explorer**: New sidebar section with persistent notebooks stored in IndexedDB (`InkflowDB` → `notebooks` store). Supports creating notes/folders, loading, and deleting notes. A "Welcome to Inkflow" note is auto-created on first boot, and the active notebook is autosaved on every change.
- **Theme Packs**: Six one-click themes (Default, Vintage Diary, Cute Pastel, Science Lab, Minimal Noir, Scrapbook) that apply paper style, ink color, rotation, bleed, pressure, and font size presets together.
- **Text Vertical Alignment**: New Upper / Middle / Lower alignment control (`setTextAlignment`) that shifts handwriting relative to the ruled grid lines via `getAlignmentOffset()`.
- **Auto-Fit Font Size**: `autoFitFontSize()` binary-searches the font size (14–52px) that fits the current text within one page and applies it.
- **High-Resolution Exports**: All image/PDF exports now upscale canvases 2× via `_upscaleCanvas()` (~150 DPI) for sharper output. PNG stays lossless (quality 1.0), JPG quality raised to 0.97, and PDF embeds lossless PNG with `compress: false` and `NONE` compression.
- **Glyph Image Cache**: `glyphImageCache` decodes drafted-glyph data URLs once and only draws them when fully ready, eliminating race conditions between async image loads and `ctx.restore()`.
- **Blank Glyph Pruning**: `pruneBlankGlyphs()` scans glyph data for visible ink (`glyphHasInk`) on boot and after imports, removing stale blank entries from memory and IndexedDB so they no longer render as invisible characters.
- **3-Sheet Template Package**: `generateDownloadTemplate()` now downloads an instructions cover sheet plus the Letters and Numbers & Symbols grid sheets (staggered downloads).

### ♻️ Changed
- **Editor Top Padding**: Inline page-editor top padding now accounts for `margin + fontSize × lineHeight` so typed text aligns with the ruled grid baselines (first line skipped).
- **Export Pipeline**: JPG default quality updated from 0.93 to 0.97; PDF encoding switched from JPEG/`FAST` to lossless PNG/`NONE`.
- **`parseRichSyntax()`**: Extended beyond highlight extraction to also produce `parsedStickies`, `parsedCallouts`, `highlightRanges`, and `activeFlashcards` arrays.
- **`layoutText()`**: Gains a structured-content route (`layoutTextCleanStandard`) used when `paperStyle === 'clean'` and `noteLayout === 'standard'`.
- **Autosave**: Now persists `activeNotebookId`, `pageDates`, `pageNos`, and `showHeaderBox`, and mirrors the current note into the active notebook in IndexedDB.

---

## [1.3.0] — 2026-06-15

### ✨ Added
- **Multi-Sheet HandFonting Templates**: Extended custom handwriting font coverage by dividing templates into two sheets: `Letters` (52 upper/lowercase letters) and `Numbers & Symbols` (32 standard numbers, symbols, and punctuation marks: `0–9` and standard symbols/punctuation: `. , ? ! @ # $ % ^ & * ( ) - _ + = / : ; ' "`).
- **Tabbed HandFonted Studio UI**: Interactive sheet tabs inside the Live Sketchpad modal and a dropdown selector inside the Scan Template upload tab to switch sheets. Each sheet retains separate grid alignment offsets (`X, Y, W, H`) and uploaded alignment image states.
- **IndexedDB Glyph Storage**: Migrated custom character drafts from `localStorage` to `IndexedDB` (`InkflowDB` → `draftedGlyphs` store), bypassing the 5MB browser quota limit and preventing browser data crashes.
- **IndexedDB Auto-Migration**: Included a transparent boot migration script in `restoreState()` that transfers any pre-existing custom glyphs from `localStorage` into the IndexedDB store, clearing the old keys automatically.
- **Dotted Paper Grid**: New "Dot Grid" paper style rendering dots on a beige background (`#f6f2ec`).
- **Engineering Paper Style**: New "Engineering" paper style on pale green background (`#eef6ed`) with minor/major grid lines and reddish-brown margins.
- **Music Staff Paper Style**: New "Music Staff" paper style drawing groups of 5-line staffs with vertical bracket endpoints.
- **Cornell Note Layout**: New "Cornell Study Notes" layout template. Divides the page into visual cues, main notes, and summary sections, drawing dividing lines dynamically. Lines starting with `? ` or `cue:` automatically render in the Cues sidebar, and lines starting with `== ` or `summary:` render in the bottom Summary footer.
- **Two-Column Note Layout**: New "Two-Column Grid" layout template that wraps and flows text across two columns per page before breaking to the next page.
- **Page Layout UI Section**: Added a new collapsed "Page Layout" section in the sidebar with a note layout template selector.
- **Character-Level Soft Wrapping**: All layout engines (Standard, Two-Column, Cornell, and Clean) now perform per-character wrap checks. Long continuous strings without spaces (e.g. URLs, unbroken text) wrap at the right margin instead of overflowing off the page.

### ♻️ Changed
- **`initApp()` & `restoreState()`**: Upgraded to async/await to support asynchronous IndexedDB initialization and glyph retrieval.
- **`cropTemplateCell()`**: Signature updated to `cropTemplateCell(index, sheetName)` to support slicing character cells from multiple templates.
- **`generateDownloadTemplate()`**: Updated to dynamically name files and draw guide characters depending on the active sheet.
- **`layoutText()` Engine**: Now includes character-level overflow detection in all layout modes; characters exceeding the right boundary trigger a soft line break with page-break checks.

---

## [1.2.2] — 2026-08-13

### ✨ Added
- **Classmate-Style Notebook Paper**: Overhauled the `Ruled` paper style to render a classmate-style notebook page, including double red vertical margin lines, double red horizontal margin lines, light blue guidelines, and a printed top-right header box.
- **Interactive Handwriting Baking**: Added interactive on-screen Date and Page No. inputs that display text in the active handwriting font when focused, and bake the text onto the canvas in real-time on blur to support printing and exporting.
- **State Persistence**: Persisted page-specific dates and page numbers across sessions and folders via `localStorage` and IndexedDB.

---

## [1.2.1] — 2026-06-20

### ✨ Added
- **"Smart Arrange" AI Tool**: New AI feature that restructures handwritten notes using an optimization prompt, automatically organizing lists, headers, and bullet points for better readability.
- **Font "Auto-Fit"**: New font size control that automatically scales the text size to perfectly fill the current page, preventing orphans and optimizing vertical space.
- **Glyph Pruning for Custom Fonts**: The font synthesizer now uses blank-cell detection (brightness/alpha checks) to skip empty cells in handwriting templates, preventing "invisible" character bugs in generated `.ttf` files.

### ♻️ Changed
- **"Line Spacing" Range**: Slider range tightened to **1.2 – 3.0** (default 1.5) for more precise vertical typography.
- **Automatic First-Line Skip**: The layout engine now defaults all handwritten text to start from the **second line** of the page (skipping the first ruled line), providing a more natural notebook aesthetic.

---

## [1.2.0] — 2026-06-14

### 🛠️ Fixed
- **Critical Syntax Errors**: Resolved a corrupted merge that caused `clearText` and `layoutText` to be concatenated into a single broken function declaration, crashing all text rendering.
- **Duplicate Layout Code**: Removed a leftover copy of the manual word-wrap loop that had been incorrectly embedded inside `buildCharQueue`, causing parse failures.
- **Orphaned Function Fragments**: Cleaned up residual code (`ment.createElement('canvas')...`) left by failed paste operations near line 649.

### ✨ Added
- **Unified `layoutText()` Engine**: Centralized all word-wrap, line-break, and page-break calculations into a single `layoutText(text)` function. Both `renderText()` and `buildCharQueue()` now share this function, eliminating duplicate logic and ensuring consistent layout between static rendering and animation playback.
- **Restored Helper Functions**: Re-integrated `sanitizeText()`, `getGraphemes()`, `isIndicScript()`, `containsDevanagari()`, `DEVANAGARI_FONTS`, and `getFontStack()` — all of which were accidentally removed during a previous refactoring session.
- **Indic/Devanagari Script Support**: Fully restored multi-script rendering pipeline for Hindi and other Indic languages with proper Unicode range detection and automatic `Noto Sans Devanagari` font fallbacks.
- **`lineCharIndex` Tracking**: Added per-line character index tracking so sinusoidal baseline wobble resets at each new line, preventing runaway drift across long passages.
- **Page Editor Inline Editing**: Each canvas page now has a transparent overlay `<div contenteditable>` (`.page-editor`) allowing users to directly click and edit handwriting text on the page. Blur triggers a full canvas redraw.
- **`getGlobalTextFromEditors()`**: New function that reads all page editors and concatenates their text, keeping the sidebar textarea in sync with in-page edits.
- **Blob-based Export Downloads**: All exports (PNG, JPG, PDF, SVG) now use `URL.createObjectURL(blob)` instead of DataURL strings, resolving Chrome download tray invisibility for files over 2MB.
- **SVG Export**: New `exportSVG()` function that generates an SVG file wrapping a full-resolution PNG image of each page.
- **Copy to Clipboard**: New `copyToClipboard()` function using the Clipboard API to copy the current page as a PNG image.
- **`showExportToast()`**: Non-blocking toast notification system for real-time export progress feedback (`info`, `success`, `warn`, `error` types with auto-dismiss).
- **`triggerDownload()`**: Shared helper function for all download operations, correctly attaching and removing anchor elements from the DOM.
- **SSE AI Streaming**: `callClaude()` upgraded to use Server-Sent Events (SSE) streaming via `ReadableStream` and `TextDecoder`. Text renders word-by-word onto the canvas as the AI generates it, eliminating UI freezing during generation.
- **Auto-scroll During Animation**: The viewport now automatically scrolls to keep the pen cursor visible during animation playback.

### ♻️ Changed
- **`buildCharQueue(text)`**: Simplified to a thin wrapper (`return layoutText(text).queue`), delegating all coordinate computation to `layoutText()`.
- **`renderText()`**: Updated to use `layoutText()` for all layout computation, then render the returned `queue` and sync `pageTexts` to editors.
- **`clearText()`**: Restored and fully implemented: clears textarea, resets `S.text`, creates a blank canvas page with paper background, clears all page editors, and calls `autosave()`.
- **Export pipeline**: Migrated from `html2canvas` (screenshot-based) to native `canvas.toBlob()` / `canvas.toDataURL()` methods for exports. *Note: the `html2canvas` CDN script is still loaded in `index.html` but is no longer used by any export path.*
- **`updateEditorStyles(editor, canvas)`**: New helper to keep page editor styles (font, padding, size) in sync whenever the canvas is resized or settings change.

---

## [1.1.0] — 2026-05-17

### Added
- **Clean Fallback Fonts**: Added `Roboto` and `Arial` to the font options for users who require cleaner, non-handwriting typography to avoid rendering artifacts.

### Changed
- **CSS Architecture**: Migrated hundreds of inline styles into external `index.css` utility classes for better maintainability and cleaner DOM structure.
- **Accessibility Improvements**: Added descriptive `title` attributes and accessible labels to all form inputs, selects, and controls, resolving numerous screen-reader compliance warnings.

---

## [1.0.0] — 2026-05-17

### 🎉 Initial Release

#### Core Features
- **Handwriting Synthesis Engine** — Per-character rendering with randomized tilt, scale, baseline offset, ink bleed, and pen pressure simulation
- **6 Paper Styles** — Ruled, Plain, Grid, Legal Pad, Vintage Parchment, Dark Mode
- **Paper Grain Texture** — Procedural noise shader for realistic paper fiber texture
- **Multi-Page Layout** — Automatic word-wrap and page-break calculations for unlimited-length documents
- **Live Writing Animation** — Real-time character-by-character writing with floating SVG pen cursor tracking
- **Typography Controls** — Font family, size, line height, word spacing with 12+ handwriting fonts

#### AI Integration
- **Anthropic Claude API** — Direct browser-to-API integration
- **4 AI Workflows** — Summarize, Fix Grammar, Lecture → Notes, Generate Assignment
- **Plain-text output** — AI responses render directly as handwritten notes

#### Export System
- **PNG Export** — High-resolution lossless image with transparency
- **JPG Export** — Compressed image for smaller file sizes
- **PDF Export** — Multi-page A4 document via jsPDF
- **Print** — Native OS print dialog with print-optimized CSS

#### HandFonted Studio (Custom Font Suite)
- **Live Sketchpad** — Draw characters on interactive canvas with adjustable pen settings
- **Template Grid Generator** — Downloadable 8×8 blank handwriting template (64 characters)
- **Scan Upload & Alignment** — Upload scanned sheets with interactive grid overlay sliders
- **Moore-Neighbor Contour Tracing** — Raster-to-vector boundary extraction
- **RDP Curve Simplification** — Ramer-Douglas-Peucker path smoothing
- **OpenType Font Compiler** — Client-side TrueType font compilation via opentype.js
- **Dynamic Font Registration** — CSS FontFace registration and instant activation

#### UI/UX
- **Glassmorphism Design** — Frosted glass sidebar with backdrop-filter blur
- **Dark/Light Theme** — Complete theme toggle with CSS custom properties
- **Responsive Layout** — Mobile-optimized with collapsible sidebar drawer
- **Collapsible Sections** — Smooth cubic-bezier accordion panels
- **State Persistence** — Auto-save to localStorage with debounced serialization

---

## [Unreleased]

### Planned
- Extended character sets (diacritics, special symbols)
- Localization support (i18n)
- Bullet / Mind-map templates for AI output note styling
