# 📋 Changelog

All notable changes to Inkflow are documented in this file.

---

## [1.2.1] — 2026-06-20

### ✨ Added
- **"Smart Arrange" AI Tool**: New AI feature that restructures handwritten notes using an optimization prompt, automatically organizing lists, headers, and bullet points for better readability.
- **Font "Auto-Fit"**: New font size control that automatically scales the text size to perfectly fill the current page, preventing orphans and optimizing vertical space.
- **Glyph Pruning for Custom Fonts**: The font synthesizer now uses blank-cell detection (brightness/alpha checks) to skip empty cells in handwriting templates, preventing "invisible" character bugs in generated `.ttf` files.

### ♻️ Changed
- **"Line Height" Control Bar**: Renamed and upgraded "Line Spacing" to "Line Height", with an expanded scale range of $1.0$ to $3.5$ for more precise vertical typography.
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
- **Export pipeline**: Migrated from `html2canvas` (screenshot-based) to native `canvas.toBlob()` / `canvas.toDataURL()` methods, removing the html2canvas dependency for exports and improving accuracy.
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
- **RDP Curve Simplification** — Ramer-Douglas-Peucker path smoothing (ε = 1.0)
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

---

## [1.3.0] — 2026-06-15

### ✨ Added
- **Multi-Sheet HandFonting Templates**: Extended custom handwriting font coverage by dividing templates into two sheets: `Letters` (52 upper/lowercase letters) and `Numbers & Symbols` (32 standard numbers, symbols, and punctuation marks: `0–9` and standard symbols/punctuation: `. , ? ! @ # $ % ^ & * ( ) - _ + = / : ; ' "`).
- **Tabbed HandFonted Studio UI**: Interactive sheet tabs inside the Live Sketchpad modal and a dropdown selector inside the Scan Template upload tab to switch sheets. Each sheet retains separate grid alignment offsets (`X, Y, W, H`) and uploaded alignment image states.
- **IndexedDB Glyph Storage**: Migrated custom character drafts from `localStorage` to `IndexedDB` (`InkflowDB` -> `draftedGlyphs` store), bypassing the 5MB browser quota limit and preventing browser data crashes.
- **IndexedDB Auto-Migration**: Included a transparent boot migration script in `restoreState()` that transfers any pre-existing custom glyphs from `localStorage` into the IndexedDB store, clearing the old keys automatically.
- **Dotted Paper Grid**: New "Dot Grid" paper style rendering dots at 28px intervals on a beige background (`#f6f2ec`).
- **Engineering Paper Style**: New "Engineering" paper style on pale green background (`#eef6ed`) with 10px minor grid lines, 50px major grid lines, and reddish-brown margins.
- **Music Staff Paper Style**: New "Music Staff" paper style drawing groups of 5-line staffs with 8px spacing, 72px staff-to-staff spacing, and vertical bracket endpoints.
- **Cornell Note Layout**: New "Cornell Study Notes" layout template. Divides the page into visual cues, main notes, and summary sections, drawing dividing lines dynamically. Lines starting with `? ` or `cue:` automatically render in the Cues sidebar, and lines starting with `== ` or `summary:` render in the bottom Summary footer.
- **Two-Column Note Layout**: New "Two-Column Grid" layout template that wraps and flows text across two columns per page before breaking to the next page.
- **Page Layout UI Section**: Added a new collapsed "Page Layout" section in the sidebar with a note layout template selector.
- **Character-Level Soft Wrapping**: All three layout engines (Standard, Two-Column, and Cornell) now perform per-character wrap checks. Long continuous strings without spaces (e.g. URLs, unbroken text) wrap at the right margin instead of overflowing off the page.

### ♻️ Changed
- **`initApp()` & `restoreState()`**: Upgraded to async/await to support asynchronous IndexedDB initialization and glyph retrieval.
- **`cropTemplateCell()`**: Signature updated to `cropTemplateCell(index, sheetName)` to support slicing character cells from multiple templates.
- **`generateDownloadTemplate()`**: Updated to dynamically name files and draw guide characters depending on the active sheet.
- **`layoutText()` Engine**: Now includes character-level overflow detection in all layout modes; characters exceeding the right boundary trigger a soft line break with page-break checks.
