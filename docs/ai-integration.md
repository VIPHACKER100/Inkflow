# 🤖 AI Integration

This document describes Inkflow's multi-provider AI integration with SSE streaming support.

---

## Connection Details

Inkflow supports two primary AI backends. Users select their provider and model from the UI dropdowns.

### 🌐 OpenRouter (Primary)
- **URL**: `https://openrouter.ai/api/v1/chat/completions`
- **Models**: Dynamically fetched via `https://openrouter.ai/api/v1/models`. Features 100+ models from Google, Anthropic, OpenAI, Meta, DeepSeek, Mistral, Qwen, xAI, Cohere, NVIDIA, and Microsoft. Free models are auto-detected and prioritized.
- **Required Headers**:
  ```http
  Content-Type: application/json
  Authorization: Bearer USER_API_KEY
  HTTP-Referer: [Window Location]
  X-Title: Inkflow Notes Generator
  ```

### 🔑 Anthropic (Direct)
- **URL**: `https://api.anthropic.com/v1/messages`
- **Models**: Claude Sonnet 4, Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus, Claude 3 Haiku.
- **Required Headers**:
  ```http
  Content-Type: application/json
  x-api-key: USER_API_KEY
  anthropic-version: 2023-06-01
  anthropic-dangerous-direct-browser-access: true
  ```

---

## SSE Streaming (v1.2.0)

`callClaude()` now uses Server-Sent Events streaming via `ReadableStream` and `TextDecoder`:

```javascript
const response = await fetch(url, { method: 'POST', headers, body });
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const chunk = decoder.decode(value);
  // Parse SSE data lines, extract content deltas
  if (onChunk) onChunk(contentDelta);
}
```

The `onChunk` callback updates the canvas in real-time, rendering text word-by-word as the AI generates it, preventing UI freezing.

---

## AI Workflows

### 1. Bullet-Point Summarizer
```
System: Summarize the following text into clear, concise bullet-point notes.
Use short sentences. No markdown formatting — plain text only.
```

### 2. Grammar & Phrasing Correction
```
System: Fix the grammar, spelling, and phrasing of this text.
Keep the content and meaning identical. Return plain text only, no markdown.
```

### 3. Lecture Transcript → Notebook Notes
```
System: Convert this raw lecture transcript into clean, well-structured
handwritten-style notes. Plain text only, no markdown symbols.
```

### 4. Academic Assignment Generator
```
System: Generate a complete handwritten-style assignment with an introduction,
body paragraphs, and conclusion. Plain text only. No markdown.
```

### 5. Smart Arrange (Optimization)
```
System: Restructure this text to make it more organized and readable.
Keep all the original information but use better spacing, indentation, 
and bullet points. Plain text only. No markdown.
```

---

## Dynamic Model Registry

On page load, `fetchOpenRouterModels()` asynchronously fetches the full model catalog from OpenRouter and replaces the static fallback list. Models are:

- Auto-tagged with provider emoji (⚡ Google, 🟣 Anthropic, 🟢 OpenAI, 🦙 Meta, etc.)
- Sorted with free models first, then alphabetically
- Auto-refreshed when the provider dropdown changes

---

## Execution Flow

1. User inputs API key and selects an AI feature
2. System prompt loaded for clean plain-text output
3. Request dispatched via `fetch` with streaming enabled (`stream: true`)
4. `onChunk` callback incrementally renders text onto the canvas
5. Spinner displayed (`✦ Generating…`) with real-time text preview
6. On completion, final text is synced to the textarea and autosaved

---

## Error Handling

| Error | User Feedback |
| :--- | :--- |
| Missing API key | "Please enter your API key first" toast |
| Network failure | "Failed to connect — check your connection" error |
| Rate limiting (429) | "Rate limited — please wait and try again" |
| Invalid API key (401) | "Invalid API key — please check and re-enter" |
| Empty input text | "Please enter some text first" validation |
