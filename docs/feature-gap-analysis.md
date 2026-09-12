# 🔍 Feature Gap Analysis — This Fork vs. Upstream Changelog (v1.0.0 → v1.6.24)

**Date:** 2026-09-13 · **Branch:** `next-level` · **Method:** every claim below verified by grep against actual code on this date.

## Reference — upstream docs read (2026-09-13)

All 19 docs from `github.com/VIPHACKER100/Inkflow/tree/main/docs` were fetched (cached at `/tmp/inkflow-upstream-docs/`) and cross-checked against this fork. Reference-level findings that update this analysis:

1. **A1 font gap is bigger than "12 fonts".** `ui-design-system.md` defines the full suite: **20 Print + 20 Cursive/Script + 8 Devanagari fonts**. Still missing from this fork beyond what pass #1 added: Print — Gloria Hallelujah, Schoolbell, Neucha, Covered By Your Grace, The Girl Next Door, Waiting for the Sunrise, Permanent Marker, Coming Soon, Short Stack, Handlee, Rancho, Amatic SC, Fuzzy Bubbles; Cursive — Dancing Script, Great Vibes, Satisfy, Sacramento, Cedarville Cursive, Zeyada, La Belle Aurore, Nothing You Could Do, Reenie Beanie, Nanum Brush Script, Pacifico, Parisienne, Yellowtail, Charm, Aladin.
2. **Realism engine spec is exact** (`handwriting-engine.md`): `S.realism` slider 0.0–1.0 (default 0.5) + `S.rareImperfections` toggle; `mulberry32` PRNG seeded with FNV-1a hash of `(activeNotebookId + cleanText)`; Devanagari multipliers 0.3 rot / 0.4 scale; transform equations scale by `r`; baseline drift is a per-line random walk `(prng()−0.48)×0.45×r×k` clamped to ±3.5·r·k; rare imperfections = 1.8% of glyphs get a 1px retrace stroke at `opacity×0.35`, plus 35% space compression near the right margin on ~35% of occurrences; clean style forces neutral variation.
3. **Pass #1–3 implementations verified against upstream specs**: `ai-postprocess.js` matches the documented two-stage pipeline exactly (sanitizer preservation list, 0.72 trigram threshold, post-stream application point); PDF presets match `configuration-guide.md` values; margin-label checkbox/geometry match `configuration-guide.md` + `state-management.md`.
4. **Documented divergences (fork design vs upstream)**: fork renders margin notes as DOM overlays while upstream draws them on canvas (`drawMarginTextOnCanvas(ctx, pageNum)`); upstream animation *skips* sticky/callout placeholders and bare `Answer:` lines (pen hops over them; decorations appear in the final `renderText()`), while this fork draws labels lazily per page during animation; upstream `noteLayout` has no `meeting` option (fork-added).
5. **Fork is ahead of upstream in places**: `aria-live` announcer, skip-link, and `prefers-reduced-motion` (upstream's own accessibility.md still lists these as open gaps), glyph/diagram LRU caps, html2canvas fully removed, `meeting` layout, CI pipeline with tests.
6. **Still-open upstream gaps for future passes**: `?v=` cache-bust convention (upstream `deployment.md`), `S.showHeaderBox`-style printed Date/P.No. header box (fork has its own interactive header variant), upstream's empty-row-after-answer rhythm and bold question rendering in clean mode.

## Fill status — 2026-09-13, pass #6 (full 48-font suite + offline font precache)

- ✅ **A1 complete**: the Google Fonts stylesheet now loads all **50 families** (the 48-font handwriting suite + Crimson Pro/Roboto UI fonts) and the dropdown mirrors upstream's `ui-design-system.md` grouping — **Print Handwriting (20)**, **Cursive & Script (20)**, **हिंदी / Devanagari (8)**, **Clean (2)**. The 28 newly added families: Gloria Hallelujah, Schoolbell, Neucha, Covered By Your Grace, The Girl Next Door, Waiting for the Sunrise, Permanent Marker, Coming Soon, Short Stack, Handlee, Rancho, Amatic SC, Fuzzy Bubbles (Print); Dancing Script, Great Vibes, Satisfy, Sacramento, Cedarville Cursive, Zeyada, La Belle Aurore, Nothing You Could Do, Reenie Beanie, Nanum Brush Script, Pacifico, Parisienne, Yellowtail, Charm, Aladin (Cursive).
- ✅ **A4 offline font precache**: the exact stylesheet URL from `index.html` is now precached by `sw.js` (parity check enforced in-file), so the whole suite is available offline; `.woff2` files runtime-cache on first use.
- Note: live-verification of the combined stylesheet URL was skipped per user instruction; the URL is assembled from a 200-OK verified request plus the already-in-production `reey:wght@400` form. Two families initially returned silently-broken axis requests (`Martel` range form) — the current file already used the correct explicit-weight forms.

## Fill status — 2026-09-13, pass #5 (clean paper style, upstream v1.4.0 + v1.6.9–1.6.18)

- ✅ **`clean` paper style**: new config (`#faf9f5` bg, bluer guidelines, `#ff4d6d` red rule) sharing the Ruled branch, grain skipped (matches upstream paper-rendering.md); "✨ Clean" paper button added.
- ✅ **Crisp typographic rendering**: when `paperStyle === 'clean'`, all variation is neutralized (tilt 0, scale 1, no baseline offset/wobble/drift, pressure 1, opacity 1), drafted custom glyphs are bypassed (font outlines only), and the ink-bleed shadow is suppressed in render and animation.
- ✅ **Font restriction**: switching to Clean auto-switches unsupported handwriting fonts to Kalam (`CLEAN_FONTS` = clean + Devanagari set, upstream behavior). Also fixed: `setPaper()` was missing its `autosave()` (the fork's own changelog claimed this fix but the code lacked it).
- ✅ **Hidden `Answer:` lines (upstream v1.6.11/1.6.13)**: in clean + standard + margin-labels-on, bare `Answer:` lines emit queue items flagged `hidden: true` — the canvas skips them (render, animation, exports) while the text stays editable in the textarea/page editors and the row keeps its ruled line. This resolves the divergence noted in pass #3: the `Ans` margin label now anchors to the first line of the answer content (upstream v1.6.15).
- Not ported: upstream's empty-row-after-answer rhythm (v1.6.16) and bold question rendering — documented as remaining polish above.

## Fill status — 2026-09-13, pass #4 (seeded realism engine, upstream v1.6.22)

- ✅ **Seeded determinism**: `hashString` (FNV-1a) + `mulberry32`/`createPRNG` added to `contextual-jitter-engine.js`; `layoutTextTemplated()` seeds the PRNG from the note text, so re-renders, page switches, and PDF exports are pixel-identical. All three variation call sites (diagram labels, Indic runs, Latin graphemes) now run the seeded path.
- ✅ **Realism equations**: `getCharVariationWithContext(rotMax, pressure, fontSize, context, opts)` gained an upstream-spec path — `MaxTilt = max(rotMax, 3.5·r)×scriptRotMult`, `ScaleJitter = 0.075·r×scriptScaleMult`, baseline/pressure/opacity scaled by `r` — while the legacy unseeded path is preserved untouched for API compatibility (existing 31 engine tests pass unchanged). Fork's line-start/line-end/fatigue context multipliers still apply on top.
- ✅ **Baseline drift**: per-line random walk `(prng()−0.48)×0.45·r·k`, clamped ±3.5·r·k, reset at line breaks, applied to Latin and Indic baselines.
- ✅ **Rare imperfections**: `S.rareImperfections` toggle tags ~1.8% of Latin glyphs `isRetrace` (seeded), rendered as a faint 1px-offset secondary stroke at `opacity×0.35` in `renderSpecificPage`, `startAnimation`, and `renderQueueItems` (exports). Margin-space compression intentionally not ported (word-advance rework, low visual payoff — noted as the one remaining v1.6.22 bit).
- ✅ **Controls**: "Realism / Human Jitter" slider (0–1, default 0.5) + "Rare Imperfections" checkbox in Ink Effects; both persisted in the autosave whitelist, restored on load, and included in Reset Defaults. 15 new engine tests (FNV-1a vectors, mulberry32 sequences, determinism, r=0 neutrality, script multipliers, context scaling).

## How to read this

The supplied changelog describes the **upstream** project through **v1.6.24** (2026-09-08). This repository (`Inkflow-main`, `package.json` 1.6.0) is a **divergent fork**: it shares the v1.0–1.6.0 history, has its own changelog (`docs/changelog.md`, ends at 1.6.0), and its own extra modules (contextual-jitter, stroke-prediction, layer-compositor, template-manager, audio-recorder, collaborative engine, markdown parser). Below: what the upstream changelog promises that **this code does not contain**, what exists in **divergent** form, and dead code found along the way.

## Fill status — 2026-09-13 (gap-fill pass)

Filled on `next-level` (verified: 166/166 tests, 0 lint errors, build green):

- ✅ **A5 `sanitizeAiResponse()`** + **A6 `resequenceQA()`** — new `ai-postprocess.js` (23 unit tests), applied to every AI result in `aiAction()` and to accepted grammar corrections; `​```diagram`/`​```mermaid` fences are protected from stripping
- ✅ **A7 `smartArrangeLocal()`** — same module; `aiAction('arrange')` no longer calls AI at all (upstream v1.6.7 behavior) and reports fix counts via status + toast
- ✅ **A17 SRI** — `integrity` + `crossorigin="anonymous"` added to all 7 CDN resources; hashes computed from the live CDN responses, not copied
- ✅ **A21** Escape exits Study Mode (defers to the modal-close handler while the flashcards modal is open) — `flashcards.js`
- ✅ **A23** Voice recognition error toasts (mic denied, no mic, network, no-speech) — `voice-notes.js`
- ✅ **A24** Theme-pack UI — 6 launcher buttons in the Paper Style section
- ✅ **A1 (partial)** — the 8 loaded-but-unselectable handwriting fonts added to the dropdown (Homemade Apple, Delius, Architects Daughter, Gochi Hand, Just Another Hand, Nanum Pen Script, Pangolin, Reey); the 12 upstream v1.6.24 fonts themselves remain absent

**Correction to the original analysis:** item A10 / C-1 claimed `contextual-jitter-engine.js` was dead code. That was wrong — `index.js` consumes it via bare globals (`new CharacterVariationContext()`, `getCharVariationWithContext()`), which the original namespace-only grep missed. The engine is fully wired: `layoutText()` always delegates to `layoutTextTemplated()` (index.js:949), so every layout path uses it. What genuinely remains missing from upstream v1.6.22 is the *seeded* determinism (`mulberry32` PRNG → pixel-identical re-renders/exports), the baseline-drift random walk, the rare-imperfections pass, and the master Realism slider — this fork uses unseeded `Math.random()` variation plus the engine's fatigue model instead.

## Fill status — 2026-09-13, pass #3 (margin labels + PDF presets)

- ✅ **A13 Q/Ans margin labels** — new pure module `margin-labels.js` (+15 tests): clusters the render queue into visual lines (spaces are not queue items; y-tolerance = lineHeight/2; per-page grouping yields reading order), space-tolerant classifiers (question = numbered/Q prefix **and** trailing `?`, so sub-points like "1. Cardinality Constraint" are never mislabeled — upstream v1.6.9 fix), sequential document-wide numbering computed once per render (`window.marginLabelsCache`), so lazy per-page painting can't scramble it. Canvas drawing (`drawMarginQuestionLabels`) hooked into all three paint paths: `renderSpecificPage` (full render + editor blur), `redrawPageCanvas`, and `startAnimation` (labels drawn lazily when the pen first reaches a page). Geometry per upstream finals: 0.78× font (min 13px), right-aligned at `margin − 24`, baseline `− 0.15 × fontSize`. Gated to Standard layout + `S.showMarginLabels` checkbox (Page Layout section, default on, persisted in autosave whitelist, restored, included in Reset Defaults).
  - Divergence note: upstream v1.6.11 also *hides* bare `Answer:` lines from the canvas; this fork draws the `Ans` label but keeps the text visible (the fork has no clean-style answer-hiding machinery).
- ✅ **A12 PDF Output Size presets** — `PDF_SIZE_PRESETS` in `export-renderers.js` (Compact 1× JPEG 75% / Standard 2× JPEG 92% / High 2× lossless PNG); `exportPDF()` now upscales via the previously-unused `_upscaleCanvas` and encodes per preset; toast shows the active preset; `#pdf-size-select` dropdown in the Export section persisted under `'inkflow-pdf-size'` (survives Reset Defaults, matching upstream).
- 🐛 **Bonus bugfix:** `index.js` called `renderCursive(ctx, pageItems)` with 2 args against a 3-arg signature — Cursive Mode threw at render time. Fixed to pass the canvas.

## Fill status — 2026-09-13, pass #2 (mobile UX overhaul)

- ✅ **A2 `getResponsiveCanvasWidth()`** — implemented (≤480px: `vw−24`, ≤768px: `vw−32`, desktop: `min(794,720)`), used at page creation and in the resize handler, which now reflows every canvas's CSS display size (proportional height) before recomputing editor overlays. The old hardcoded `min(PAGE_W, 720)` is gone.
- ✅ **A8 Mobile UX overhaul** — `setSidebarOpen()` centralizes drawer state with `aria-expanded` sync, body scroll-lock (`body.sidebar-open`), a real `#sidebar-backdrop` scrim, and close-on: scrim tap, canvas tap (capture phase), and Escape (deferred while a modal is open). Toolbar labels wrapped in `.btn-label` spans (hidden ≤768px; logo collapses to "Ink" ≤480px) with `aria-label`s on all four toolbar buttons. `viewport-fit=cover` + `env(safe-area-inset-*)` padding on toolbar/sidebar/pagination. `100dvh` with `vh` fallback. `touch-action: manipulation` on interactive elements. Drawer inputs pinned ≥16px (iOS zoom guard). HandFonted/Flashcards modals become edge-to-edge sheets ≤768px. Canvas width constraints (`#page-container`/`.page-wrapper` max-width 720, `.canvas-container` block, ≤768 `overflow-x: hidden` + centered, ≤480 tighter gutters).
- Not carried over from upstream v1.6.24: the `.worksheet-header` repositioning (A3) — this fork renders the date/page-number header through its own mechanism, so there is no `.worksheet-header` element to reposition.

---

## A. Missing entirely

### v1.6.24 — Fonts & mobile canvas
| # | Missing feature / function | Evidence |
|---|---|---|
| A1 | **12 free handwriting fonts** — Permanent Marker, Coming Soon, Short Stack, Handlee, Rancho, Amatic SC, Fuzzy Bubbles, Pacifico, Parisienne, Yellowtail, Charm, Aladin | 0 refs in `index.html`; font dropdown has **14 options**, not "40+" |
| A2 | **`getResponsiveCanvasWidth()`** — mobile canvas CSS/coordinate alignment fix | 0 refs |
| A3 | **Worksheet header repositioning** (`.worksheet-header` inside canvas container) | class doesn't exist anywhere (fork has its own header variant) |
| A4 | **sw.js Google Fonts stylesheet pre-cache sync** | precache list is same-origin only |

### v1.6.23 — AI hygiene & mobile UX
| # | Missing feature / function | Evidence |
|---|---|---|
| A5 | **`sanitizeAiResponse()`** — strips markdown fences/backticks/bold/HTML before canvas render (AI output currently renders markdown literally) | 0 refs |
| A6 | **`resequenceQA()`** — renumbers Q:/A: pairs, trigram-Jaccard near-duplicate drop | 0 refs |
| A7 | **`smartArrangeLocal()`** — offline Smart Arrange without API key | 0 refs (Smart Arrange requires AI here) |
| A8 | **Mobile UX overhaul**: `setSidebarOpen()` drawer + `#sidebar-backdrop` scrim, `.btn-label` compact icon toolbar, `safe-area-inset`, `100dvh`, `touch-action: manipulation`, full-screen mobile modals | 0 refs for all six (only 3 basic media queries exist) |
| A9 | **24-test smoke suite** (layout invariants, smart-arrange normalization, editor sync) | no smoke test file |

### v1.6.22 — Realism engine
| # | Missing feature / function | Evidence |
|---|---|---|
| A10 | **Human Handwriting Realism Engine**: `mulberry32` seeded PRNG, per-glyph jitter, baseline drift, pressure/opacity variation, **rare imperfections**, Realism slider | 0 refs in app code — **but see Dead Code below: the engine module exists, unwired** |

### v1.6.21 / v1.6.20
| # | Missing feature / function | Evidence |
|---|---|---|
| A11 | Sticky/callout placeholder (`\uFFF0`/`\uFFF1`) **re-materialization** in editor sync (editing currently risks consuming the marker syntax) | 0 refs |
| A12 | **PDF Output Size presets** (Compact / Standard / High, persisted) | 0 refs |

### v1.6.8–v1.6.19 — Q/Ans margin labels & clean-notes fixes
| # | Missing feature / function | Evidence |
|---|---|---|
| A13 | **`drawMarginQuestionLabels()`** — Q1…Qn / Ans numbers in left margin | 0 refs (left-margin *notes* exist; the numbering pass doesn't) |
| A14 | `clusterQueueLines()` / `collectAnswerLineItems()` shared helpers | 0 refs |
| A15 | Clean-notes fix series (v1.6.9–v1.6.18: question regex, Answer: alignment, blank-row insertion, numbered-line fusion) | **N/A — the `clean` paper style itself is missing** (see A20) |

### v1.6.4 — Event wiring & supply chain
| # | Missing feature / function | Evidence |
|---|---|---|
| A16 | **`addEventListener` refactor** — upstream replaced ~80 inline `onclick`/`onchange` handlers | `bindUIActions()` exists here, but `index.html` still carries ~80 inline handlers (hence the 45-name ESLint allowlist) |
| A17 | **SRI `integrity`/`crossorigin`** on CDN scripts (opentype.js, Font Awesome, jsPDF, mermaid, rough.js, mammoth) | 0 `integrity=` attributes |
| A18 | `index.js?v=` cache-bust query | 0 refs |

### v1.6.2 / v1.4.1 / v1.4.0
| # | Missing feature / function | Evidence |
|---|---|---|
| A19 | **Notebook folders** (`createNewFolder()`) | 0 refs (notes only: save/load/list/delete/duplicate) |
| A20 | **`clean` paper style** + `parseStructuredContent()` + `layoutTextCleanStandard()` structured rendering | 0 refs; paper buttons ship 10 styles, no clean |
| A21 | **Escape exits Study Mode** | only modal-ESC handler exists (`index.js:2938`) |
| A22 | **Study-mode auto-centering** (`scrollIntoView` on toggle) | absent from `toggleStudyMode()` |
| A23 | **Voice error toasts** (mic permission / network) | `voice-notes.js` `onerror` is silent |
| A24 | **Theme-pack one-click grid UI** | `THEME_PACKS` data + `applyThemePack()` exist but **no UI renders them — the feature is unreachable** |

### Upstream 1.6.0 + Unreleased
| # | Missing feature / function | Evidence |
|---|---|---|
| A25 | **AI catalog gaps**: `openrouter/free` auto-routing, GPT-5.6 Luna, Gemini 3.6/3.7 Flash, DeepSeek V4 | partial: Llama 4 Maverick/Scout + Grok 3 Mini present; the rest absent |
| A26 | **Logo/favicon integration** (logo image in navbar, favicon links) | manifest icons only; no favicon/logo image in `index.html` |
| A27 | **Unreleased items**: extended character sets (diacritics), i18n, bullet/mind-map AI templates | not started |

---

## B. Present but divergent (don't "re-add" — already functionally covered)

| Feature | Upstream | This fork |
|---|---|---|
| Cornell / Two-Column layouts | `layoutTextCornell` / `layoutTextTwoColumn` in index.js | `template-manager.js` + `layoutTextTemplated()` — but Cornell **cue syntax** (`? `/`cue:`, `== `/`summary:`) is *not* supported (0 refs) |
| Cursive engine | `drawCursiveConnector()` + `CURSIVE_FONTS` | `CursiveConnector` class + `renderCursiveConnectionsOn()` — wired and tested |
| Ollama routing | `callAI()` provider router | routing inside `callClaude()` (`provider === 'ollama'` → `callOllama()`) — all providers reachable |
| Version-drift guard | `check-versions` script | `scripts/check-version.js` (`npm run check:version`, in CI) — added 2026-09-13 |
| html2canvas | still loaded (unused) upstream | fully removed here — an improvement |

---

## C. Dead / unwired code found during analysis

1. **`contextual-jitter-engine.js` is dead code** — loaded via `<script>` tag (index.html:733), 31 passing tests, defines `getCharVariation()`… and has **zero consumers** in app code. Wiring it into the render pipeline would deliver the upstream v1.6.22 realism engine (A10) nearly for free — highest-value pickup on this list.
2. **`THEME_PACKS` unreachable** — 6 theme packs + `applyThemePack()` implemented, no launcher in the UI (A24).
3. **Fonts loaded but not selectable** — Delius, Homemade Apple, Crimson Pro, architects-daughter, gochi-hand, just-another-hand, nanum-pen-script, pangolin, reey are fetched via the Google Fonts link but missing from the dropdown's 14 options.

---

## D. Recommended pickup order

1. **Wire `contextual-jitter-engine.js`** into rendering (A10) — code exists + tested; pure integration work
2. **`sanitizeAiResponse()` + `resequenceQA()`** (A5, A6) — biggest AI-output quality win
3. **`smartArrangeLocal()`** (A7) — Smart Arrange without an API key
4. **Quick fixes**: SRI attributes (A17), font-dropdown expansion incl. the 9 loaded-but-unselectable fonts (A1 partial), theme-pack UI (A24), voice error toasts (A23), Escape-exits-study (A21)
5. **Mobile UX overhaul** (A8) + `getResponsiveCanvasWidth()` (A2) — biggest UX win for phones
6. **PDF size presets** (A12) + **Q/Ans margin labels** (A13)
7. **Clean paper style** + structured parser (A20)
8. **Editor marker re-materialization** (A11) — protects rich-syntax data on edit
