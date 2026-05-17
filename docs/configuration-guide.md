# ⚙️ Configuration Guide

Complete reference for all user-configurable controls in Inkflow.

---

## Typography Controls

| Control | Range | Default | Effect |
| :--- | :--- | :--- | :--- |
| **Font Family** | Dropdown (12+ fonts) | Caveat | Handwriting font used for rendering |
| **Font Size** | 14px – 52px | 24px | Character size on canvas |
| **Line Height** | 1.2 – 3.0 | 1.7 | Vertical spacing between lines |
| **Word Spacing** | -2px – 14px | 2px | Horizontal gap between words |

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
| **Rotation Max** | 0° – 12° | 3.0° | Maximum character tilt angle |
| **Ink Bleed** | 0.0 – 2.5 | 0.5 | Shadow blur simulating ink spread |
| **Pen Pressure** | 0.0 – 0.3 | 0.12 | Stroke thickness variation |
| **Margin** | 20px – 100px | 52px | Page boundary padding |

### Preset Combinations

| Preset | Rotation | Bleed | Pressure | Style |
| :--- | :--- | :--- | :--- | :--- |
| **Clean & Neat** | 1.0° | 0.2 | 0.05 | Careful student writing |
| **Natural** | 3.0° | 0.5 | 0.12 | Default — realistic handwriting |
| **Messy & Quick** | 6.0° | 1.0 | 0.20 | Rushed lecture notes |
| **Calligraphic** | 2.0° | 0.8 | 0.25 | Stylized pen writing |

---

## Animation Controls

| Control | Range | Default | Effect |
| :--- | :--- | :--- | :--- |
| **Animation Speed** | 1 – 30 chars/frame | 8 | Writing speed during animation |

- **1–3**: Slow, dramatic (presentations)
- **5–10**: Natural handwriting pace
- **15–30**: Fast fill for long documents

---

## AI Configuration

| Setting | Description |
| :--- | :--- |
| **API Key** | Your Anthropic API key (stored in browser only) |
| **Summarize** | Converts text to bullet-point notes |
| **Fix Grammar** | Corrects spelling and phrasing |
| **Lecture → Notes** | Transforms transcripts to study notes |
| **Generate Assignment** | Creates essay-style assignments |

---

## Export Options

| Format | Quality | Use Case |
| :--- | :--- | :--- |
| **PNG** | Lossless, transparent | Digital sharing, presentations |
| **JPG** | Compressed, small size | Email attachments, web upload |
| **PDF** | Multi-page A4, 92% JPEG | Printing, submission, archival |
| **Print** | Native OS dialog | Direct hardcopy printing |
