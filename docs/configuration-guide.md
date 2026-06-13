# ⚙️ Configuration Guide

Complete reference for all user-configurable controls in Inkflow.

---

## Typography Controls

| Control | Range | Default | Effect |
| :--- | :--- | :--- | :--- |
| **Font Family** | Dropdown (12+ fonts) | Caveat | Handwriting font used for rendering |
| **Font Size** | 14px – 52px | 16px | Character size on canvas |
| **Line Height** | 1.2 – 3.0 | 1.5 | Vertical spacing between lines |
| **Word Spacing** | -2px – 14px | 1px | Horizontal gap between words |

---

## Paper Styles

| Style | Description | Best For |
| :--- | :--- | :--- |
| **Ruled** | Cream background, blue lines, red margin | Standard notebook notes |
| **Plain** | Clean ivory, no lines | Freeform writing, letters |
| **Grid** | Light grid at 28px intervals | Math, diagrams, engineering |
| **Legal** | Yellow background, dense ruled lines | Legal documents, formal notes |
| **Vintage** | Aged parchment with vignette | Creative writing, journals |
| **Dark** | Indigo slate, neon guide lines | Dark mode, presentations |

---

## Ink & Impression Controls

| Control | Range | Default | Effect |
| :--- | :--- | :--- | :--- |
| **Ink Color** | Color picker (hex) | `#1c2340` | Color of all rendered text |
| **Rotation Max** | 0° – 12° | 1.0° | Maximum character tilt angle |
| **Ink Bleed** | 0.0 – 2.5 | 0.5 | Shadow blur simulating ink spread |
| **Pen Pressure** | 0.0 – 0.3 | 0.12 | Stroke thickness variation |
| **Margin** | 20px – 100px | 80px | Page boundary padding |

### Preset Combinations

| Preset | Rotation | Bleed | Pressure | Style |
| :--- | :--- | :--- | :--- | :--- |
| **Clean & Neat** | 0.5° | 0.2 | 0.05 | Careful student writing |
| **Natural** | 1.0° | 0.5 | 0.12 | Default — realistic handwriting |
| **Messy & Quick** | 4.0° | 1.0 | 0.20 | Rushed lecture notes |
| **Calligraphic** | 1.5° | 0.8 | 0.25 | Stylized pen writing |

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

## AI Configuration

| Setting | Description |
| :--- | :--- |
| **AI Provider** | OpenRouter (100+ models) or Anthropic (direct) |
| **Model** | Selected from provider's model list (auto-fetched for OpenRouter) |
| **API Key** | Your OpenRouter or Anthropic API key (stored in browser only) |
| **Summarize** | Converts text to bullet-point notes |
| **Fix Grammar** | Corrects spelling and phrasing |
| **Lecture → Notes** | Transforms transcripts to study notes |
| **Generate Assignment** | Creates essay-style assignments on a given topic |

---

## Export Options

| Format | Quality | Use Case |
| :--- | :--- | :--- |
| **PNG** | Lossless, native canvas | Digital sharing, presentations |
| **JPG** | 93% JPEG, smaller size | Email attachments, web upload |
| **SVG** | PNG embedded in SVG wrapper | Vector-aware applications |
| **PDF** | Multi-page A4, 93% JPEG | Printing, submission, archival |
| **Copy** | PNG to system clipboard | Quick paste into other apps |
| **Print** | Native OS dialog | Direct hardcopy printing |

---

## File Upload

| Format | Method |
| :--- | :--- |
| **TXT / MD** | FileReader API — direct text extraction |
| **PDF** | pdf.js (CDN-loaded) — page-by-page text extraction with progress bar |

Drag-and-drop is supported on the upload zone.
