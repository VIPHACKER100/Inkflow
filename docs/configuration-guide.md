<p align="center">
  <img src="../inkflow_logo.jpeg" alt="Inkflow Logo" width="80" style="border-radius: 50%; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />
</p>

# ⚙️ Configuration Guide

Complete reference for all user-configurable controls in Inkflow.

---

## Typography Controls

| Control | Range | Default | Effect |
| :--- | :--- | :--- | :--- |
| **Font Family** | Dropdown (14+ fonts) | Caveat | Handwriting font used for rendering |
| **Font Size** | 14px – 52px | 22px | Character size on canvas |
| **Line Height** | 1.2 – 3.0 | 1.5 | Vertical spacing between lines |
| **Word Spacing** | -2px – 14px | 1px | Horizontal gap between words |
| **Auto-Fit** | — | — | Binary-searches a font size that fits the current text on one page |
| **Text Alignment** | Upper / Middle / Lower | Middle | Vertical position of handwriting relative to the grid lines |
| **Custom Font Upload** | `.ttf` / `.otf` | — | Loads a local font; remembered via `localStorage` (`inkflow-fonts`) |

> Devanagari content automatically falls back to `Noto Sans Devanagari` / `Hind` when the selected font lacks Indic glyphs.

---

## Paper Styles

| Style | Description | Best For |
| :--- | :--- | :--- |
| **Ruled** | Off-white notebook with blue guidelines, double red margin lines, printed Date/P. No. box | Standard notebook notes |
| **Clean** | Same ruling as Ruled but crisp, typographic text (no rotation/bleed/drafted glyphs), structured headings & bullets | Lecture notes, study handouts |
| **Plain** | Clean ivory, no lines | Freeform writing, letters |
| **Grid** | Light grid at `fontSize × lineHeight` intervals | Math, diagrams, engineering |
| **Legal** | Yellow background, dense ruled lines | Legal documents, formal notes |
| **Vintage** | Aged parchment with vignette | Creative writing, journals |
| **Dark** | Indigo slate, muted guide lines | Dark mode, presentations |
| **Dot Grid** | Dotted background at grid intervals | Technical sketches, bullet journaling |
| **Engineering** | Pale green grid (minor + major lines) with reddish margins | Math calculations, graphing |
| **Music Staff** | Sets of 5-line staffs, bracket endpoints | Writing sheet music |

> Ruled and Clean styles also expose the **Show Date & P. No. Header** checkbox, and let you edit the date/page number directly on each page.

---

## Note Layout Templates

| Layout | Description | Formatting / Syntax |
| :--- | :--- | :--- |
| **Standard (Flowing)** | Default single-column layout where text flows naturally and wraps. | Standard text |
| **Two-Column Grid** | Splits the page into two equal-width columns. Text fills the left column first, then the right column, before breaking to the next page. | Standard text |
| **Cornell Study Notes** | Divides the page into "Cues / Questions" (left column), "Main Notes" (right column), and "Summary" (bottom footer). | Prefix a line with `? ` or `cue:` → Cues column.<br>Prefix a line with `== ` or `summary:` → Summary area.<br>Other lines flow into Main Notes. |

> **Clean style** additionally parses structured content: `#` headings, `##` subheadings, `-` / `*` bullets (nested levels), `Q1.` / `Q.` auto-numbered questions **and numbered questions ending with `?`** (e.g. `3. What are … ?` — rendered bold, keeping their original number style), and bare `Answer:` lines (own block; hidden on canvas, represented by the margin **Ans** label). One empty line is also rendered after every finished answer, before the next question.

### Margin Labels (Standard layout, v1.6.8+)

The **Question & answer numbers in left margin** checkbox (below the layout selector) draws **Q1…Qn** next to numbered question lines and **Ans** next to bare `Answer:` lines, right-aligned in the left margin with clear space before the red margin rules, in the current ink color.

- The **Ans** label sits one line down from the hidden `Answer:` row, aligned with the first line of the answer content; both label types are optically centered on their line's handwriting.
- When enabled, a line containing only `Answer:` is *not* drawn on the page — the margin label carries the meaning — while the word stays visible and editable in the textarea and the per-page editors.
- The setting is saved with your state and per-note settings, included in Reset Defaults, and honored by exports and print (labels are drawn on the canvas).

---

## Study Syntax (rich note markup)

| Syntax | Rendered As |
| :--- | :--- |
| `[sticky:yellow] text [sticky]` | Sticky note floating in the right margin (colors: `yellow`, `cyan`, `pink`, `mint`) |
| `[callout:warning] text [callout]` | Boxed tag in the left margin (types: `warning`, `info`, `formula`) |
| `==text==` | Translucent highlight behind characters |
| `Q: question` followed by `A: answer` | Flashcards in the review deck (toolbar 🃏 button) |

---

## Ink & Impression Controls

| Control | Range | Default | Effect |
| :--- | :--- | :--- | :--- |
| **Ink Color** | Color picker (hex) | `#1c2340` | Color of all rendered text |
| **Ink Presets** | Navy / Black / Blue / Purple / Red / Green | — | One-click ink colors |
| **Rotation Max** | 0° – 12° | 1.0° | Maximum character tilt angle |
| **Ink Bleed** | 0.0 – 2.5 | 0.5 | Shadow blur simulating ink spread |
| **Pen Pressure** | 0.0 – 0.3 | 0.12 | Stroke thickness variation |
| **Margin** | 20px – 100px | 80px | Page boundary padding |

---

## Theme Packs

One-click theme presets applied via `applyTheme(themeId)`:

| Theme | Paper Style | Ink | Rotation | Bleed | Pressure | Font Size |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Default** | Ruled | `#1c2340` | 1.0 | 0.5 | 0.12 | 22 |
| **Vintage Diary** | Vintage | `#3c2f2f` | 3.0 | 0.8 | 0.15 | 22 |
| **Cute Pastel** | Plain | `#5d3f6a` | 1.5 | 0.4 | 0.10 | 22 |
| **Science Lab** | Engineering | `#1a331e` | 0 | 0.3 | 0.08 | 20 |
| **Minimal Noir** | Dark | `#e0e0e0` | 0.8 | 0.2 | 0.10 | 22 |
| **Scrapbook** | Dot Grid | `#1c3144` | 2.2 | 0.6 | 0.14 | 24 |

The **Reset Defaults** button restores factory settings for all of the above.

---

## Animation Controls

| Control | Range | Default | Effect |
| :--- | :--- | :--- | :--- |
| **Animation Speed** | 1 – 30 chars/frame | 8 | Writing speed during animation |

- **1–3**: Slow, dramatic (presentations)
- **5–10**: Natural handwriting pace
- **15–30**: Fast fill for long documents

The viewport auto-scrolls to keep the pen cursor visible during animation.

---

## Study & Productivity Features

| Feature | Description |
| :--- | :--- |
| **Study Mode** | Toolbar toggle that dims editing chrome for review; floating exit button |
| **Flashcards** | `Q:`/`A:` pairs collected into a flip-card review deck with prev/next |
| **Voice to Notes** | Microphone button uses the Web Speech API to append transcribed notes |
| **Notebooks & Folders** | IndexedDB-backed explorer to create, load, and delete notes, grouped by folder |
| **File Upload** | Drag-and-drop `.txt`, `.md`, `.pdf`; PDFs extracted via pdf.js with a progress bar |

---

## AI Configuration

| Setting | Description |
| :--- | :--- |
| **AI Provider** | OpenRouter (100+ models), Anthropic (direct), or Ollama (local, no API key) |
| **Model** | Selected from provider's model list (auto-fetched for OpenRouter) |
| **API Key** | Your OpenRouter or Anthropic API key (entered at runtime, stored in browser only). Not required for Ollama. |
| **Smart Arrange** | Tidies and structures text — **works fully offline, no API key required** (deterministic tidy-up, v1.6.7+) |
| **Summarize** | Converts text to bullet-point notes |
| **Fix Grammar** | Corrects spelling and phrasing |
| **Lecture → Notes** | Transforms transcripts to study notes |
| **Generate Assignment** | Creates essay-style assignments on a given topic |

> All AI actions route through `callAI()`, which dispatches to the correct backend based on the selected provider.

---

## Export Options

| Format | Quality | Use Case |
| :--- | :--- | :--- |
| **PNG** | Lossless, 2× upscaled (~150 DPI) | Digital sharing, presentations |
| **JPG** | 97% JPEG, 2× upscaled | Email attachments, web upload |
| **SVG** | PNG embedded in SVG wrapper | Vector-aware applications |
| **PDF** | Multi-page A4, lossless PNG embed | Printing, submission, archival |
| **Copy** | PNG to system clipboard | Quick paste into other apps |
| **Print** | Native OS dialog | Direct hardcopy printing |
