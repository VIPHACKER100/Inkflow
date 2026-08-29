# 🤖 AI Assistant Module

This document covers Inkflow's `ai-assistant.js` module — provider routing, streaming, Ollama local AI, grammar correction, and API key persistence.

---

## Overview

`ai-assistant.js` is an extracted module (~440 lines) that encapsulates all AI provider logic. It exposes `window.AIAssistant` and is loaded before `index.js` in `index.html`.

**File**: `ai-assistant.js`

---

## Exports

```javascript
window.AIAssistant = {
  callClaude,           // Cloud AI streaming (OpenRouter/Anthropic)
  callOllama,           // Local AI streaming (Ollama)
  setAiStatus,          // Status bar updater
  aiAction,             // Workflow dispatcher
  GrammarCorrector,     // Grammar correction modal logic
  acceptGrammarCorrection,
  AI_SYSTEM_BASE_PROMPT, // Rich-syntax-aware system prompt
  initApiKeyPersistence, // Save/restore API keys in localStorage
};
```

---

## Provider Routing

### `callClaude(prompt, systemPrompt, onChunk)`

Routes to the selected cloud provider based on `#ai-provider` dropdown value.

| Provider | Endpoint | Auth Header |
|----------|----------|-------------|
| `openrouter` | `https://openrouter.ai/api/v1/chat/completions` | `Authorization: Bearer {key}` |
| `anthropic` | `https://api.anthropic.com/v1/messages` | `x-api-key: {key}` + `anthropic-dangerous-direct-browser-access: true` |
| `ollama` | `http://localhost:11434/api/chat` | None (local) |

If provider is `ollama`, `callClaude` delegates to `callOllama()`.

### `callOllama(prompt, systemPrompt, onChunk)`

Streams from local Ollama instance.

```javascript
const res = await fetch('http://localhost:11434/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: document.getElementById('ai-model')?.value || 'llama3.2',
    messages: [
      { role: 'system', content: systemPrompt || AI_SYSTEM_BASE_PROMPT },
      { role: 'user', content: prompt },
    ],
    stream: true,
  }),
});
```

Parses SSE JSON lines, calls `onChunk(textContent)` with accumulated text.

---

## System Prompts

### `AI_SYSTEM_BASE_PROMPT`

Rich-syntax-aware prompt for Ollama that instructs the model to output Inkflow's native syntax:

```
# H1 headers for main topics
## H2 subheaders for subtopics
- Bullet lists for key points
==highlighted text== for important terms
[sticky:yellow]margin notes[sticky]
[callout:info]important callouts[callout]
Q: Question format for study review
A: Answer format for study review
```

### Workflow Prompts

| Workflow | System Prompt Summary |
|----------|-----------------------|
| `summarize` | "Summarize into clear, concise bullet-point notes" |
| `grammar` | "Fix grammar, spelling, phrasing. Keep meaning identical." |
| `lecture` | "Convert raw lecture transcript into clean, well-structured notes" |
| `assignment` | "Generate complete assignment with introduction, body, conclusion" |
| `arrange` | "Restructure text for better readability with spacing and bullets" |

---

## `aiAction(type)`

Dispatches AI workflow based on action type:

```javascript
async function aiAction(type) {
  // 1. Disable all AI buttons
  // 2. Build prompt from textarea content + system prompt
  // 3. Call callClaude() with onChunk callback
  // 4. onChunk updates textarea + S.text in real-time
  // 5. On complete: autosave, re-enable buttons
}
```

Supported types: `summarize`, `grammar`, `lecture`, `assignment`, `arrange`.

---

## Grammar Corrector

### `GrammarCorrector`

Modal-based grammar correction workflow:

1. Opens `#grammar-modal` with original text in `#grammar-original`
2. AI generates corrected text into `#grammar-corrected`
3. User can manually edit the corrected text
4. `acceptGrammarCorrection()` applies changes to `S.text` and re-renders

### Modal DOM

```html
<div id="grammar-modal" class="modal-overlay hidden">
  <div class="modal-card modal-card-lg">
    <h3>✨ AI Grammar Correction <span id="grammar-lang-badge">English</span></h3>
    <textarea id="grammar-original" readonly></textarea>
    <textarea id="grammar-corrected"></textarea>
    <button onclick="acceptGrammarCorrection()">✅ Accept Changes</button>
  </div>
</div>
```

---

## API Key Persistence

### `initApiKeyPersistence()`

Called once on boot to restore saved API keys from localStorage.

**Behavior**:
- On load: reads `localStorage['inkflow-api-key-{provider}']` and populates `#api-key` input
- On input: if "Remember" checkbox is checked, saves key to localStorage
- On checkbox change: saves or removes key from localStorage
- On provider change: loads the key for the newly selected provider

### Storage Keys

| Key Pattern | Provider |
|-------------|----------|
| `inkflow-api-key-openrouter` | OpenRouter |
| `inkflow-api-key-anthropic` | Anthropic |
| `inkflow-api-key-ollama` | *(unused — no key needed)* |

---

## Provider Dropdown UI

### Ollama Handling

When `ollama` is selected:
- API key input is hidden (`display: none`)
- Key label shows "No API key needed (local)"
- Model dropdown shows: Llama 3.2, Mistral, Phi-4, Gemma 2, Qwen 2.5, DeepSeek R1, CodeLlama

### `onProviderChange()` (index.js)

```javascript
if (provider === 'ollama') {
  keyLabel.style.display = 'none';
  keyInput.style.display = 'none';
  keyInput.disabled = true;
} else {
  keyLabel.style.display = '';
  keyInput.style.display = '';
  keyInput.disabled = false;
}
```

---

## Streaming Architecture

```
User clicks AI action
  → aiAction(type) builds prompt
    → callClaude() / callOllama()
      → fetch() with stream: true
        → response.body.getReader()
          → decoder.decode(value) per chunk
            → onChunk(textContent) callback
              → textarea.value = textContent
              → S.text = textContent
              → renderText(S.text)  // throttled to 15fps
```

---

## Error Handling

| Error | User Message |
|-------|-------------|
| Missing API key | "Enter your {provider} API key first" |
| Ollama not running | "Ollama not running. Start with: ollama serve" |
| Network failure | "Failed to connect — check your connection" |
| Rate limiting (429) | "Rate limited — please wait and try again" |
| Invalid key (401) | "Invalid API key — please check and re-enter" |

---

## Dependencies

- `window.S` — global state
- `window.renderText` — canvas renderer
- `window.autosave` — state persistence
- `window.debounceRender` — throttled re-render

All accessed via `window.*` globals — no ES module imports.
