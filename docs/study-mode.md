# 📖 Study Mode, Flashcards, Voice-to-Notes & Theme Packs

This document covers Inkflow's v1.6.0 study tools: interactive flashcard review, real-time voice transcription, and color theme presets.

---

## Study Mode

Study mode transforms the note editor into a focused review environment. It activates flashcard extraction from Q:/A: patterns in the text and highlights active study content.

### Activation

```javascript
toggleStudyMode()  // Toggles study mode on/off
```

**Toolbar**: The 📖 Study button in the top toolbar calls `toggleStudyMode()`.

### Behavior

1. Toggles `studyModeActive` flag
2. Adds/removes `.study-mode` class on `<body>` (CSS highlights active pages with accent border)
3. Calls `loadFlashcardsFromText()` to extract Q:/A: pairs
4. If flashcards found → opens the flashcards modal
5. If no flashcards → shows alert with format instructions

### Flashcard Format

Add Q:/A: pairs anywhere in your text:

```
Q: What is photosynthesis?
A: The process by which plants convert light energy into chemical energy.

Q: What is the powerhouse of the cell?
A: The mitochondria.
```

The parser uses regex: `/^Q[:.]\s/.test(line)` and `/^A[:.]\s/.test(line)`.

---

## Flashcards Modal

Interactive flip-card review UI with 3D CSS animation.

### DOM Structure

```html
<div id="flashcards-modal" class="modal-overlay hidden">
  <div class="modal-card">
    <div class="modal-header">
      <h3>🃏 Flashcards</h3>
      <button class="modal-close" onclick="closeFlashcardsModal()">✕</button>
    </div>
    <div class="modal-body">
      <div id="flashcard-counter">1 / 1</div>
      <div id="flashcard-card" onclick="flipFlashcard()">
        <div id="flashcard-inner">
          <div id="flashcard-front" class="flashcard-face flashcard-front">Question</div>
          <div id="flashcard-back" class="flashcard-face flashcard-back">Answer</div>
        </div>
      </div>
      <div id="flashcard-hint">Click card to flip</div>
      <button onclick="prevFlashcard()">← Prev</button>
      <button onclick="nextFlashcard()">Next →</button>
    </div>
  </div>
</div>
```

### Functions

| Function | Description |
|----------|-------------|
| `openFlashcardsModal()` | Shows modal, renders first card |
| `closeFlashcardsModal()` | Hides modal |
| `flipFlashcard()` | Toggles 3D rotation (front ↔ back) |
| `nextFlashcard()` | Advances to next card (wraps around) |
| `prevFlashcard()` | Goes to previous card (wraps around) |
| `renderFlashcard()` | Updates counter, front/back text, hint text |

### CSS

```css
.flashcard-face { box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
#flashcard-inner { cursor: pointer; transition: transform 0.5s; transform-style: preserve-3d; }
.flashcard-back { transform: rotateY(180deg); }
```

### Data Flow

```
S.text → loadFlashcardsFromText() → TextLayout.parseRichSyntax() → flashcards[]
flashcards[currentFlashcardIdx] → renderFlashcard() → DOM update
```

---

## Voice-to-Notes

Real-time speech-to-text transcription using the Web Speech API (Chrome/Edge only).

### Activation

```javascript
startVoiceRecording()  // Toggles recording on/off
```

**Toolbar**: The 🎤 Voice button in the top toolbar calls `startVoiceRecording()`.

### Behavior

1. Checks for `webkitSpeechRecognition` or `SpeechRecognition` support
2. If unsupported → shows alert ("Try Chrome")
3. If already recording → stops recognition, hides toast
4. If not recording → starts `SpeechRecognition` with:
   - `continuous: true` (keeps listening)
   - `interimResults: true` (shows partial results)
   - `lang: 'en-US'`

### Events

| Event | Handler |
|-------|---------|
| `onresult` | Appends final transcript to textarea, updates `S.text`, calls `renderText()` |
| `onerror` | Stops recording, hides toast |
| `onend` | Stops recording, hides toast |

### UI Feedback

- **Toast**: `<div id="voice-toast">🎤 Listening… click again to stop</div>` — fixed at bottom center
- **Button**: `.btn.active` class toggled for visual feedback

### Limitations

- Requires Chrome or Edge (no Firefox/Safari support for SpeechRecognition)
- Language fixed to `en-US`
- No punctuation insertion — transcript is plain text

---

## Theme Packs

Six predefined color presets that override CSS custom properties.

### Presets

| ID | Name | Accent | Paper | Ink |
|----|------|--------|-------|-----|
| `default` | Default | `#6C63FF` | `#f7f3ea` | `#1c2340` |
| `forest` | Forest | `#2e7d32` | `#f1f8e9` | `#1b5e20` |
| `sunset` | Sunset | `#e65100` | `#fff3e0` | `#bf360c` |
| `ocean` | Ocean | `#0277bd` | `#e1f5fe` | `#01579b` |
| `lavender` | Lavender | `#7b1fa2` | `#f3e5f5` | `#4a148c` |
| `charcoal` | Charcoal | `#546e7a` | `#eceff1` | `#263238` |

### Usage

```javascript
applyThemePack('forest')  // Applies forest color preset
```

### Implementation

```javascript
function applyThemePack(packId) {
  const pack = THEME_PACKS[packId];
  document.documentElement.style.setProperty('--accent', pack.accent);
  document.documentElement.style.setProperty('--paper-color', pack.paper);
  document.documentElement.style.setProperty('--ink-color', pack.ink);
  S.paperColor = pack.paper;
  S.inkColor = pack.ink;
  S.accentColor = pack.accent;
  autosave();
  debounceRender();
}
```

---

## Rich Syntax System

The rich syntax parser extracts structured annotations from raw text for margin rendering and flashcard generation.

### Syntax Markers

| Syntax | Type | Example |
|--------|------|---------|
| `[sticky:yellow]...[sticky]` | Sticky note | `[sticky:yellow]Review later[sticky]` |
| `[sticky:cyan]...[sticky]` | Sticky note | `[sticky:cyan]Key concept[sticky]` |
| `[sticky:pink]...[sticky]` | Sticky note | `[sticky:pink]Exam topic[sticky]` |
| `[sticky:mint]...[sticky]` | Sticky note | `[sticky:mint]Reference[sticky]` |
| `[callout:warning]...[callout]` | Callout box | `[callout:warning]Important formula[callout]` |
| `[callout:info]...[callout]` | Callout box | `[callout:info]Definition[callout]` |
| `[callout:formula]...[callout]` | Callout box | `[callout:formula]E = mc²[callout]` |
| `==text==` | Highlight | `==important term==` |
| `Q: ...` / `A: ...` | Flashcard pair | `Q: What is X?` / `A: It is Y.` |

### Parser

```javascript
TextLayout.parseRichSyntax(rawText)
// Returns: { cleanText, flashcards }
```

The parser strips sticky, callout, and highlight markers from `cleanText` and extracts flashcard pairs into the `flashcards` array. Remaining text is rendered as normal handwritten notes.

### Margin Rendering

```javascript
paintStickyNotes(queue, targetPageIdx)  // Draws sticky note boxes in right margin
paintCallouts(queue, targetPageIdx)     // Draws callout boxes in left margin
```

Both functions are called during `renderSpecificPage()` after the main character queue is drawn.

---

## Study Mode CSS

```css
body.study-mode .page-editor { border: 2px solid var(--accent) !important; }
body.study-mode .page { box-shadow: 0 0 0 2px var(--accent); }
```

---

## Integration Points

- `TextLayout.parseRichSyntax()` — core parser in `text-layout.js`
- `paintStickyNotes()` / `paintCallouts()` — canvas renderers in `index.js`
- `loadFlashcardsFromText()` — Q/A extractor in `index.js`
- `flashcards[]` — runtime array, reset on each `loadFlashcardsFromText()` call
- `THEME_PACKS` — constant in `index.js`, applied via `applyThemePack()`
