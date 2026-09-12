# 📋 Changelog

All notable changes to Inkflow are documented in this file.

---

## [1.7.0] — 2026-09-13

### ✨ Added
- **Seeded Realism Engine (upstream 1.6.22 parity)**: `mulberry32` PRNG seeded via an FNV-1a hash of the note text — re-renders, page switches, and PDF exports are now pixel-identical. New **Realism / Human Jitter** slider (0–1, default 0.5) scales all variation; Devanagari script auto-tightens jitter (0.3× rotation / 0.4× scale) to protect matras and the shirorekha line. Per-line baseline drift random walk (clamped ±3.5·r·k). New **Rare Imperfections** toggle: ~1.8% of glyphs render a faint 1px-offset retrace stroke in the live render, the writing animation, and exports.
- **Clean paper style (upstream 1.4.0 parity)**: new "✨ Clean" paper button — crisp typographic mode (neutral variation, no grain, no ink-bleed shadow, drafted glyphs bypassed). Unsupported handwriting fonts auto-switch to Kalam; bare `Answer:` lines are hidden on canvas in Standard layout and represented by the margin **Ans** label (still editable).
- **Margin Q/Ans labels (upstream 1.6.8–1.6.17 parity)**: new `margin-labels.js` module clusters the render queue into visual lines and draws **Q1…Qn** next to numbered question lines (space-tolerant matching, trailing `?` required) and **Ans** next to bare `Answer:` lines — right-aligned in the margin, document-wide sequential numbering computed per render, toggle in the Page Layout section (Standard layout only).
- **PDF Output Size presets (upstream 1.6.20 parity)**: new dropdown in Export — Compact (1×, JPEG 75%), Standard (2×, JPEG 92%, default), High (2×, lossless PNG). Persisted per browser; toast names the active preset.
- **AI Response Post-Processing (upstream 1.6.23 parity)**: new `ai-postprocess.js` — `sanitizeAiResponse()` strips markdown/HTML leakage before rendering (code fences, inline backticks, bold/italic, raw tags) while preserving Inkflow syntax and `​```diagram`/`​```mermaid` fences; `resequenceQA()` renumbers Q:/A: pairs sequentially from Q1 and silently drops near-duplicate questions (trigram Jaccard ≥ 0.72) with their paired answers. Applied to every AI result and accepted grammar corrections.
- **Offline Smart Arrange (upstream 1.6.7 parity)**: the 🪄 Smart Arrange button no longer needs an AI provider or API key — a deterministic in-browser tidy-up normalizes bullets, headers, study tags, highlights, Q/A labels and punctuation spacing, inserts structural breaks, and reports the fix count via toast.
- **Full 48-font handwriting suite**: Google Fonts expanded to 50 families; the font dropdown now mirrors the upstream grouping — Print Handwriting (20), Cursive & Script (20), Devanagari (8), Clean (2).
- **Mobile UX overhaul (upstream 1.6.23/1.6.24 parity)**: proper sidebar drawer (`setSidebarOpen()`, `#sidebar-backdrop` scrim, body scroll-lock, closes on scrim tap / canvas tap / Escape); compact icon-only toolbar ≤768px; responsive canvas width via `getResponsiveCanvasWidth()` (≤480px: vw−24, ≤768px: vw−32, desktop min(794,720)) with full resize reflow; `viewport-fit=cover` + safe-area padding; `100dvh` stable height; `touch-action: manipulation`; ≥16px drawer inputs (iOS zoom guard); edge-to-edge HandFonted/Flashcards modals on phones.
- **Accessibility**: ARIA labels on emoji-only buttons (ink presets, Animate/Start/Stop, page nav, modal closes, toolbar), `aria-live` screen-reader announcer wired to AI status and export toasts, skip-to-canvas link, `prefers-reduced-motion` support, canvas page `tabindex` focus.
- **Theme Packs UI**: 6 one-click theme buttons in the Paper Style section (the packs previously existed but had no launcher).
- **Supply chain**: SRI `integrity` + `crossorigin` attributes on all 7 CDN resources (hashes computed from the live CDN responses).
- **Offline fonts**: the Google Fonts stylesheet is precached by the service worker — the full suite is available offline; `.woff2` files cache at runtime.

### 🛠️ Fixed
- **Critical: `window.S` was never assigned** — `ai-assistant.js` and `notebooks.js` read shared state via `window.S`, which was `undefined`: any real AI action with a valid API key crashed with a TypeError mid-stream. State is now exposed in index.js.
- **Critical: broken production build** — `npm run build` produced a dist missing all 17 classic `<script>` files (Rollup ignores non-module scripts), so the built site was dead. `vite.config.js` now copies root scripts into dist.
- **Critical: cursive render crash** — `renderCursive(ctx, pageItems)` was called with 2 arguments against a 3-argument signature; Cursive Mode threw at render time.
- **Service worker**: removed `/server.js` (a Node file that can never run in the browser) from precache; added `manifest.json`, `audio-recorder.js` and the new modules; cache-name version drift is now enforced by `npm run check:version` (runs in CI).
- **`setPaper()` missing autosave** (claimed fixed in 1.6.2 but absent from the code).
- **Voice recognition errors were silent** — friendly toasts now appear for mic-denied / no-microphone / network / no-speech conditions.
- **ESLint**: the 45-name unused-vars allowlist no longer hides warnings for functions extracted to modules; 0 errors maintained.

### ♻️ Changed
- **Version bumped** 1.6.0 → 1.7.0 (service-worker cache refreshes automatically for installed users).
- **CI**: new GitHub Actions workflow — lint + unit tests (Vitest) + version-consistency check + production build with dist sanity check + non-blocking `npm audit` on every pull request.
- **Modularization continued**: `flashcards.js`, `voice-notes.js`, `ai-postprocess.js` and `margin-labels.js` extracted from index.js; new unit suites for AI post-processing, flashcard extraction, margin labels and the realism engine — **197 tests passing** (up from 130).
- **Root `README.md` added**, plus `docs/roadmap.md` (update & enhancement plan with progress log) and `docs/feature-gap-analysis.md` (fork-vs-upstream analysis, all items now closed).

---

## [1.6.0] — 2026-08-30

### ✨ Added
- **Rich Syntax System**: `parseRichSyntax()` extracts `[sticky:color]...[sticky]`, `[callout:type]...[callout]`, `==highlighted==` markers, and `Q:/A:` flashcard pairs from raw text. `paintStickyNotes()` and `paintCallouts()` render margin annotations on canvas.
- **Ollama Local AI**: New `callOllama()` function for local LLM inference via `localhost:11434`. Added `ollama` provider to AI dropdown with 7 pre-configured models (Llama 3.2, Mistral, Phi-4, Gemma 2, Qwen 2.5, DeepSeek R1, CodeLlama). No API key required.
- **AI System Prompt**: New `AI_SYSTEM_BASE_PROMPT` constant for rich-syntax-aware AI output formatting.
- **API Key Persistence**: New `initApiKeyPersistence()` saves/restores API keys per-provider in localStorage with "Remember key" checkbox.
- **Study Mode**: `toggleStudyMode()` activates study-focused view with flashcard extraction from Q:/A: patterns.
- **Flashcards Modal**: Interactive flip-card modal with prev/next navigation, counter, and 3D CSS flip animation.
- **Voice to Notes**: `startVoiceRecording()` uses Web Speech API (Chrome) for real-time speech-to-text transcription directly into the note editor.
- **Theme Packs**: 6 color presets (Default, Forest, Sunset, Ocean, Lavender, Charcoal) via `applyThemePack()`.
- **Notebooks System**: Full IndexedDB CRUD via `notebooks.js` — `saveNotebook`, `loadNotebook`, `listNotebooks`, `deleteNotebook`, `duplicateNotebook`. Sidebar UI with save/open/delete controls.
- **PWA Support**: `sw.js` service worker with cache-first static assets and network-first API calls. `manifest.json` for installable progressive web app.
- **TTF Font Export**: `exportCustomFontTTF()` in `font-compilation.js` downloads compiled handwriting font as `.ttf` file. Export button added to HandFonted Studio.
- **`drawRoundedRect`**: Rounded rectangle helper in `paper-renderer.js` for sticky notes and callout boxes.
- **`drawWrappedText`**: Word-wrapped text rendering with max-lines truncation in `paper-renderer.js`.
- **`splitRawTextIntoPages`**: Splits raw text by clean page boundaries for multi-page export fidelity in `text-layout.js`.
- **`parseStructuredContent`**: Parses headings, bullets, questions, and paragraphs from text in `text-layout.js`.
- **`containsDevanagari`**: Backward-compatible alias for `ScriptDetector.isIndicScript()` in `script-detector.js`.
- **`_upscaleCanvas`**: 2× canvas upscaler for high-DPI export in `export-renderers.js`.
- **`redrawPageCanvas`**: Full page re-render helper (background + smudge + queue) in `index.js`.
- **Modal Accessibility**: ESC key closes modals, Tab focus trap on all `.modal-overlay` elements, focus save/restore.
- **`glyphImageCache` LRU**: Converted from unbounded `{}` to `Map` with 500-entry cap.
- **`diagramCache` LRU**: Converted from unbounded `{}` to `Map` with 100-entry cap in `diagram-engine.js`.

### 🛠️ Fixed
- **PDF Text Extraction**: Added `hasEOL` handling to preserve paragraph structure in `content.items`.
- **Shape Rendering Dedup**: Extracted shared `drawShapeOrEdge()` function, replacing ~220L of duplicated code in `renderSpecificPage` and `startAnimation`. Adds diamond fallback and edge labels to animation path.
- **Dead Code Removed**: Removed `drawStudioCanvas` reference (undefined function), IntersectionObserver force-render block (made observer redundant), redundant `arguments[1]` check in `renderSpecificPage`.
- **Test Theater Removed**: `doubt-solver.test.js` and `solution-streaming.test.js` excluded from vitest — they tested mock data, not real code.
- **`diagram-engine.js` Moved**: Moved from `<head>` to bottom of `<body>` in `index.html` (was render-blocking).
- **`audio-recorder.js` Bug Fix**: `window.aiAction()` → `window.AIAssistant.aiAction()`.

### ♻️ Changed
- **Version Bumped**: `package.json` updated from 1.5.2 to 1.6.0.
- **27+ New Functions**: Across `paper-renderer.js`, `text-layout.js`, `script-detector.js`, `export-renderers.js`, `font-compilation.js`, `ai-assistant.js`, `index.js`, `notebooks.js`.
- **130 Vitest Tests Pass**: All existing tests plus new test theater exclusions.

---

## [1.5.1] — 2026-08-29

### 🛠️ Fixed
- **Critical: `renderCursiveConnections` undefined** — Cursive mode rendering crashed with `ReferenceError`. Fixed to call `renderCursiveConnectionsOn(ctx, pageItems)` from `export-renderers.js`.
- **Critical: Server crash on malformed operations** — `server.js` crashed on `op.char.length` when `op.char` was undefined. Added type validation and position bounds checking.
- **Critical: `autoFitFontSize` state corruption** — Binary search mutated `S.fontSize` with no `try/finally`. If `layoutText()` threw, font size was permanently corrupted. Added restore on error.
- **High: `loadImageToCanvas` hangs forever** — Promise never rejected on invalid images. Added `img.onerror` handler.
- **High: `curr.v.pressureMod` null deref** — Cursive rendering crashed on malformed queue items. Added optional chaining.
- **High: DOM null dereferences** — 8+ `getElementById` calls accessed properties without null checks. Added `?.` optional chaining to all.
- **Medium: `resolveDimension` ignores `"px"` strings** — Template manager treated `"20px"` as `0`. Added `px` branch.
- **Medium: `resolveTemplate` crashes on missing zones** — Added fallback `(template.zones || [])`.
- **Medium: `getAllTemplates` corrupts Map** — Malformed localStorage entries added `undefined` key. Added validation.
- **Medium: Blob URL leaked on invalid SVG** — `diagram-engine.js` didn't revoke URL on early return.
- **Medium: `drawPaperBackground` crashes on missing globals** — Added guard for `S`, `PAGE_W`, `PAGE_H`.
- **Medium: WebSocket reconnection** — Added exponential backoff (3 attempts, max 8s delay) in `collaborative-engine.js`.
- **Medium: Server error handler** — Added `ws.on('error')` to prevent noisy stderr logs.

---

## [1.5.0] — 2026-08-28

### ✨ Added
- **Modular Architecture**: Extracted 4 pure-logic modules from index.js, reducing it from ~5,000 to ~3,765 lines (−24.6%).
- **`font-compilation.js`**: Contour tracing (Moore-Neighbor), RDP path simplification, blank-cell detection, OpenType path compilation.
- **`paper-renderer.js`**: All 10 paper style renderers, smudge effects, layout decorations, alignment offsets.
- **`text-layout.js`**: `sanitizeText`, `parseBlocks`, `getGraphemes` — pure text processing helpers.
- **`export-renderers.js`**: `renderQueueItems` and `renderCursiveConnectionsOn` — pure canvas rendering for exports.
- **ESLint + Prettier**: Code quality tooling with flat config (ESLint v9+), 0 errors, consistent formatting.
- **Vitest Test Framework**: Modern test runner with `npm test`, `npm run test:watch`, `npm run test:coverage`.

### ♻️ Changed
- **index.js reduced to 3,765 lines** (from 4,993) — core UI, state, AI, animation remain.
- **16 JS modules** total (up from 12), all passing syntax checks.
- **178+ tests passing** (27 cursive-connector + 23 diagram-engine + 128 Vitest).
- **Documentation updated** across all 19 files to match actual file structure and feature set.
- **All JS files formatted** with Prettier (single quotes, trailing commas, 120 print width).

### 🛠️ Fixed
- **smudge-effects.test.js**: Migrated from Jest to Vitest (`jest.fn()` → `vi.fn()`).
- **Standalone test files**: `cursive-connector.test.js` and `diagram-engine.test.js` now work with both Node.js and Vitest.

---

## [1.4.0] — 2026-08-25

### ✨ Added
- **6 Diagram Types**: New dropdown with Cycle, Flowchart, Hierarchy (Tree), Pipeline, Pyramid, and Mermaid diagram options. Each uses rough.js for hand-drawn aesthetic.
- **New Shapes — Pill & Hexagon**: Added `pill`/`rounded` and `hexagon` shape types to diagram rendering (both rough.js and canvas2d), including animation support.
- **Dated Paper Style**: New "Dated" paper style with a date column line to the left of the margin for date-stamped notes.
- **Transparent PNG Export**: New `✨ Transparent` export button that renders text on a transparent background without paper grain or rulings.
- **Cursive Connector Rendering**: New `renderConnectionStroke()` function that draws smooth cursive connections between characters using quadratic Bezier curves.
- **Edge Label Rendering**: Diagram edges now support `label` property rendered with a background pill for readability.
- **Node Label Rendering**: Diagram nodes support `label` property rendered below shapes via new `diagram-label` queue items.
- **Diagram Engine Module**: Extracted `layoutCycle`, `layoutFlowchart`, `layoutHierarchy`, `getDiagramImage`, `parseDiagramJSON`, `positionDiagramNodes` into standalone `diagram-engine.js` module.
- **Tests**: Added `diagram-engine.test.js` (23 tests) and `cursive-connector.test.js` (27 tests).

### 🛠️ Fixed
- **Cursive Exit/Entry Points**: Fixed `charExitPoints`/`charEntryPoints` Y coordinates from top-relative (0.1–0.55) to baseline-relative (0.02), eliminating diagonal slash-through-text bug on characters like L, T, V, W.
- **fontSwitcher Null Dereference**: Fixed 8 call sites where `fontSwitcher?.getFontStack()` could return null, adding fallback to `S.font`.
- **n.label Undefined Crash**: Diagram label rendering loop now skips nodes with no label; `ctx.font` set before `measureText`.
- **Mermaid Object URL Leak**: Blob URLs from Mermaid rendering are now revoked after image loads (`URL.revokeObjectURL(url)`).
- **autoFitFontSize Fallback**: Defaults to minimum font size (14) when no size fits the page.
- **Collab Engine Event Listener Leak**: `disconnect()` now removes the input event listener to prevent memory leaks.
- **Null Guards**: Added optional chaining for slider wiring loop, fontSelect, inkColorInput listeners, cursive getExitPoint/getEntryPoint, and audio-recorder timerDisplay/sizeDisplay.

### ♻️ Changed
- **Diagram Queue Rendering**: Split `type: 'diagram'` queue items into individual shape+edge items for proper sequential rendering.
- **Edge Label Background**: Now derives from paper style (dark: `rgba(26,26,46,0.85)`, light: `rgba(247,243,234,0.85)`).
- **Script Loading**: `diagram-engine.js` loads without `defer` before `index.js` for proper global availability.

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

---

## [Unreleased]

### Planned
- Extended character sets (diacritics, special symbols)
- Localization support (i18n)
- Bullet / Mind-map templates for AI output note styling
