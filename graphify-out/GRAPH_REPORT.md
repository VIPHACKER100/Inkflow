# Graph Report - Inkflow-main  (2026-09-08)

## Corpus Check
- 31 files · ~64,928 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 466 nodes · 788 edges · 35 communities (26 shown, 7 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 62 edges (avg confidence: 0.87)
- Token cost: 1,015,961 input · 0 output

## Community Hubs (Navigation)
- AI Providers & Text Core
- UI Actions & Theming
- Docs: API & Accessibility
- Docs: AI & Animation Features
- HandFonted Studio & Canvas
- State, Autosave & Persistence
- Package Metadata
- PWA Manifest
- Export Pipelines & PDF
- Smoke Test Harness
- Custom Font Builder
- Getting Started & App Shell
- Text Layout Engine
- Version Check Script
- Smart Arrange & Streaming
- Handwriting Realism Effects
- Paper Rendering & Styles
- Page Editor State
- Voice & Component Map
- Model Discovery UI
- Inkflow Brand & Logo
- Typography & Word Wrap
- Client Vectorization
- ESLint Config
- Service Worker Caching
- Flashcards & Rich Syntax
- Responsive Layout
- API Key Persistence
- Writing Style Rules
- Screen Reader Gap
- Voice-to-Notes API
- Grapheme Handling
- Canvas Performance

## God Nodes (most connected - your core abstractions)
1. `bindUIActions()` - 44 edges
2. `renderText()` - 20 edges
3. `layoutText()` - 18 edges
4. `autosave()` - 16 edges
5. `createPage()` - 13 edges
6. `debounceRender()` - 13 edges
7. `redrawPageCanvas()` - 12 edges
8. `initHandFontedStudio()` - 12 edges
9. `Changelog` - 11 edges
10. `startAnimation()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Handwriting Font Suite (40+ OFL/Apache fonts)` --references--> `index.html (App Shell)`  [INFERRED]
  docs/ui-design-system.md → index.html
- `Page Navigation Bar (#page-nav)` --conceptually_related_to--> `Auto-Fit Font Size (autoFitFontSize)`  [AMBIGUOUS]
  index.html → docs/ux-interactions.md
- `bindUIActions() — no inline handlers` --references--> `index.html (App Shell)`  [EXTRACTED]
  docs/system-architecture.md → index.html
- `index.html (App Shell)` --references--> `index.css`  [EXTRACTED]
  index.html → docs/getting-started.md
- `index.html (App Shell)` --references--> `sw.js (Service Worker)`  [EXTRACTED]
  index.html → docs/getting-started.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **AI Response Post-Processing Pipeline** — docs_ai_integration_sanitize_ai_response, docs_ai_integration_resequence_qa, docs_ai_integration_trigram_jaccard_dedup, docs_api_reference_global_state_s [EXTRACTED 1.00]
- **Raster-to-Vector Custom Font Pipeline** — docs_custom_font_suite_vector_tracing_pipeline, docs_custom_font_suite_moore_neighbor_tracing, docs_custom_font_suite_rdp_simplification, docs_custom_font_suite_opentype_compilation, docs_custom_font_suite_opentype_js [EXTRACTED 1.00]
- **Unified Layout Engine Family** — docs_api_reference_layout_text, docs_api_reference_layout_text_two_column, docs_api_reference_layout_text_cornell, docs_api_reference_layout_text_clean_standard, docs_api_reference_seeded_prng [EXTRACTED 1.00]
- **Handwriting Rendering Pipeline (sanitize -> rich syntax -> layout -> render/animate)** — docs_handwriting_engine_sanitize_text, docs_handwriting_engine_parse_rich_syntax, docs_handwriting_engine_layout_text, docs_state_management_render_text, docs_system_architecture_start_animation, docs_state_management_page_texts [EXTRACTED 1.00]
- **Dual Persistence Architecture (localStorage + IndexedDB + autosave)** — docs_state_management_global_state_s, docs_state_management_localstorage, docs_state_management_inkflow_db, docs_state_management_autosave_fn, docs_state_management_restore_state [EXTRACTED 1.00]
- **Custom Font Creation Flow (sketch/template -> vectorize -> TTF -> apply)** — docs_ux_interactions_handfonted_studio, docs_system_architecture_client_side_vectorization, index_html_opentype, docs_ux_interactions_build_custom_font, docs_handwriting_engine_drafted_glyphs [INFERRED 0.85]

## Communities (35 total, 7 thin omitted)

### Community 0 - "AI Providers & Text Core"
Cohesion: 0.05
Nodes (78): activeFlashcards, AI_MODELS, aiAction(), alignerImages, ALL_TEMPLATE_CHARS, buildCharQueue(), callAI(), callClaude() (+70 more)

### Community 1 - "UI Actions & Theming"
Cohesion: 0.09
Nodes (45): applyTheme(), autoFitFontSize(), autosave(), bindSlider(), bindUIActions(), closeFlashcardsModal(), copyToClipboard(), createNewFolder() (+37 more)

### Community 2 - "Docs: API & Accessibility"
Cohesion: 0.06
Nodes (42): Accessibility, Modal Focus Trapping, AI Integration, Anthropic Claude Provider, callAI() Provider Router, Dynamic Model Registry (fetchOpenRouterModels), Ollama Local Provider, OpenRouter Provider (+34 more)

### Community 3 - "Docs: AI & Animation Features"
Cohesion: 0.07
Nodes (42): Touch Ergonomics (44px targets, touch-action), AI_SYSTEM_BASE_PROMPT, resequenceQA(), sanitizeAiResponse(), Smart Arrange, smartArrangeLocal(), SSE Streaming (callClaude), Trigram Jaccard Deduplication (+34 more)

### Community 4 - "HandFonted Studio & Canvas"
Cohesion: 0.09
Nodes (30): adjustCanvasSizeForDevice(), advanceActiveCharacter(), clearSketchCanvas(), getDB(), getDeviceType(), getGlyphsDB(), handleTemplateImage(), importFontProject() (+22 more)

### Community 5 - "State, Autosave & Persistence"
Cohesion: 0.09
Nodes (23): Drafted Glyph Rendering (draftedGlyphs), getCachedGlyphImage(), Ink Bleed Simulation (drop shadow), Debounced Autosave (1000ms), Glyph Image Cache (glyphImageCache), pruneBlankGlyphs(), autosave(), Global State Object S (+15 more)

### Community 6 - "Package Metadata"
Cohesion: 0.09
Nodes (22): author, bugs, url, dependencies, @vercel/analytics, description, directories, doc (+14 more)

### Community 7 - "PWA Manifest"
Cohesion: 0.12
Nodes (16): background_color, categories, description, display, icons, lang, name, orientation (+8 more)

### Community 8 - "Export Pipelines & PDF"
Cohesion: 0.18
Nodes (14): aria-live Status Regions (Gap), exportImage(), exportPDF(), PDF_SIZE_PRESETS (Compact/Standard/High), showExportToast(), _upscaleCanvas(), Export Pipelines, Blob-Based Export Architecture (+6 more)

### Community 9 - "Smoke Test Harness"
Cohesion: 0.13
Nodes (9): ctxStub, documentStub, elements, failures, localStorageStub, pageEditors, root, sandbox (+1 more)

### Community 10 - "Custom Font Builder"
Cohesion: 0.22
Nodes (13): buildCustomFont(), canvasToOpentypePath(), closeHandFontedModal(), cropTemplateCell(), ensureOpentypeLoaded(), exportCustomFontTTF(), glyphHasInk(), isCellBlank() (+5 more)

### Community 11 - "Getting Started & App Shell"
Cohesion: 0.22
Nodes (10): CodeQL Static-Analysis CI Workflow, index.css, index.js (application logic), Inkflow, Progressive Web App (PWA), sw.js (Service Worker), bindUIActions() — no inline handlers, CSS Design Tokens & Theme System (+2 more)

### Community 12 - "Text Layout Engine"
Cohesion: 0.22
Nodes (9): getAlignmentOffset(alignment, fontSize, lineHeight), layoutText(text) — Unified Layout Engine, layoutTextCleanStandard, layoutTextTwoColumn, parseStructuredContent(text), sanitizeText(str), Debounced Rendering (debounceRender, 280ms), renderText() (+1 more)

### Community 13 - "Version Check Script"
Cohesion: 0.25
Nodes (7): html, htmlMatch, pkg, refs, root, sw, swMatch

### Community 14 - "Smart Arrange & Streaming"
Cohesion: 0.29
Nodes (6): Smart Arrange (offline no-key tidy-up), callAI() Provider Router (OpenRouter / Anthropic / Ollama), SSE Streaming AI, smartArrangeLocal(), Content-Security-Policy meta (defense-in-depth), html2canvas (CDN, SRI-pinned)

### Community 15 - "Handwriting Realism Effects"
Cohesion: 0.29
Nodes (7): Baseline Drift (Random Walk), getCharVariation() — Realism Engine, Indic Script Rendering (whole-word blocks), isIndicScript / containsDevanagari, Seeded PRNG (mulberry32 + FNV-1a hash), Pen Pressure Modulation, Rare Imperfections (retrace / margin compression)

### Community 16 - "Paper Rendering & Styles"
Cohesion: 0.33
Nodes (6): layoutTextCornell, drawLayoutDecorations(ctx, noteLayout) — Cornell, drawPaperBackground(ctx, style, pageNum), Date / Page No. Header Box, Paper Grain Texture Shader, 10 Paper Styles (ruled, clean, plain, grid, legal, vintage, dark, dot_grid, engineering, music)

### Community 17 - "Page Editor State"
Cohesion: 0.33
Nodes (6): Baseline Parity with DOM Editors, getGlobalTextFromEditors(), Inline Page Editors (.page-editor contenteditable overlays), pageTexts[] — per-page text sync, Auto-Fit Font Size (autoFitFontSize), Page Navigation Bar (#page-nav)

### Community 18 - "Voice & Component Map"
Cohesion: 0.33
Nodes (6): _upscaleCanvas(src, scale) — 2x upscaling, Four-Layer Component Map, jsPDF Multi-Page Document Compiler, Web Speech API — Voice to Notes, Voice to Notes (toggleVoiceInput), jsPDF 2.5.1 (CDN, SRI-pinned)

### Community 19 - "Model Discovery UI"
Cohesion: 0.60
Nodes (6): fetchOllamaModels(), fetchOpenRouterModels(), loadCachedOpenRouterModels(), onProviderChange(), refreshCurrentProviderModels(), updateModelSyncBadge()

### Community 20 - "Inkflow Brand & Logo"
Cohesion: 0.40
Nodes (6): AI Handwriting Generation (product tagline), Inkflow Brand Identity, Warm Terracotta Orange Circular Minimalist Emblem Style, Inkflow Logo (inkflow_logo.jpeg), Inkwell and Fountain Pen Visual Motif, Inkflow Project

### Community 21 - "Typography & Word Wrap"
Cohesion: 0.40
Nodes (5): drawMarginTextOnCanvas (Left Margin Notes Engine), getFontStack(isIndic), Word Wrap & Page Break Algorithm, drawMarginQuestionLabels (v1.6.8+), Handwriting Font Suite (40+ OFL/Apache fonts)

### Community 22 - "Client Vectorization"
Cohesion: 0.40
Nodes (5): Client-Side Vectorization (Moore-Neighbor tracing, RDP, TTF), buildCustomFont() — TTF compilation + FontFace, HandFonted Studio (Custom Font Creator), HandFonted Studio Modal (#handfonted-modal), opentype.js 1.3.4 (CDN, SRI-pinned)

### Community 23 - "ESLint Config"
Cohesion: 0.40
Nodes (4): browserGlobals, correctnessRules, nodeGlobals, serviceWorkerGlobals

### Community 25 - "Flashcards & Rich Syntax"
Cohesion: 0.50
Nodes (4): parseRichSyntax(rawText), Rich Study Syntax (sticky/callout/highlight/Q&A), Flashcards Review Workflow, Flashcards Modal (#flashcards-modal)

### Community 26 - "Responsive Layout"
Cohesion: 0.50
Nodes (4): getResponsiveCanvasWidth() (v1.6.24), setSidebarOpen() — Mobile Drawer, Responsive Breakpoints (mobile CSS overrides), Sidebar Backdrop Scrim (#sidebar-backdrop)

## Ambiguous Edges - Review These
- `bindUIActions()` → `Mobile UX Overhaul (v1.6.23)`  [AMBIGUOUS]
  docs/api-reference.md · relation: conceptually_related_to
- `Auto-Fit Font Size (autoFitFontSize)` → `Page Navigation Bar (#page-nav)`  [AMBIGUOUS]
  index.html · relation: conceptually_related_to

## Knowledge Gaps
- **130 isolated node(s):** `browserGlobals`, `serviceWorkerGlobals`, `nodeGlobals`, `correctnessRules`, `S` (+125 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 173 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `bindUIActions()` and `Mobile UX Overhaul (v1.6.23)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Auto-Fit Font Size (autoFitFontSize)` and `Page Navigation Bar (#page-nav)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `Inkflow Documentation Hub` connect `Docs: API & Accessibility` to `Docs: AI & Animation Features`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `Changelog` connect `Docs: AI & Animation Features` to `Docs: API & Accessibility`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `Four-Layer Component Map` connect `Voice & Component Map` to `State, Autosave & Persistence`, `Getting Started & App Shell`, `Text Layout Engine`, `Smart Arrange & Streaming`, `Paper Rendering & Styles`, `Page Editor State`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `layoutText()` (e.g. with `getCharVariation()` and `getFontStack()`) actually correct?**
  _`layoutText()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `browserGlobals`, `serviceWorkerGlobals`, `nodeGlobals` to the rest of the system?**
  _130 weakly-connected nodes found - possible documentation gaps or missing edges._