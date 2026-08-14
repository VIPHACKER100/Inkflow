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

`callClaude(prompt, systemPrompt, onChunk)` uses Server-Sent Events streaming via `ReadableStream` and `TextDecoder`:

```javascript
const res = await fetch(url, { method: 'POST', headers, body });
const reader = res.body.getReader();
const decoder = new TextDecoder();
let buffer = '';

while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  // split buffer into 'data:' lines, JSON.parse each, extract content delta
  if (onChunk) onChunk(textContent);
}
```

Requests use `stream: true` and `max_tokens: 1500`. OpenRouter responses are read from `dataObj.choices[0].delta.content`; Anthropic responses from `dataObj.delta.text` on `content_block_delta` events.

The `onChunk` callback updates the textarea and re-renders the canvas at most every 200ms, so text appears word-by-word as the AI generates it, preventing UI freezing.

---

## AI Workflows

`aiAction(type)` dispatches five workflows, disabling the action buttons for the duration and re-enabling them on completion. Final output replaces the textarea content, re-renders, and autosaves.

### 1. 🪄 Smart Arrange
```
System: Reorganize and format the following text to look like beautifully
arranged handwritten notes. Add appropriate section headers, bullet points,
and clean paragraph breaks. Plain text only, no markdown symbols.
```

### 2. 📋 Summarize
```
System: Summarize the following text into clear, concise bullet-point notes.
Use short sentences. No markdown formatting — plain text only.
```

### 3. ✏️ Grammar & Phrasing Correction
```
System: Fix the grammar, spelling, and phrasing of this text.
Keep the content and meaning identical. Return plain text only, no markdown.
```

### 4. 🎓 Lecture Transcript → Notebook Notes
```
System: Convert this raw lecture transcript into clean, well-structured
handwritten-style notes. Use headings, bullet points, and numbered lists
where appropriate. Plain text only, no markdown symbols.
```

### 5. 📝 Academic Assignment Generator
```
System: Write a detailed, well-structured academic assignment on the topic
given by the user, with an introduction, body paragraphs, and conclusion.
Plain text only, no markdown.
```
(Requires the topic field — falls back to the current textarea content if empty.)

---

## Dynamic Model Registry

`AI_MODELS` contains static fallback lists for both providers. On page load, `fetchOpenRouterModels()` asynchronously fetches the full model catalog from OpenRouter and replaces the static fallback list. Models are:

- Auto-tagged with provider emoji (⚡ Google, 🟣 Anthropic, 🟢 OpenAI, 🦙 Meta, 🌊 DeepSeek, 🔷 Mistral, 🟠 Qwen, ✖ xAI, 🟩 NVIDIA, 🪟 Microsoft, 🔴 Cohere, 🤖 other)
- Tagged `(Free)` when both prompt and completion pricing are zero
- Sorted with free models first, then alphabetically
- Auto-refreshed when the provider dropdown changes (guarded by `openRouterModelsLoaded` / `isFetchingOpenRouterModels`)

---

## Execution Flow

1. User inputs API key and selects an AI feature
2. Input text is validated (per-action "add some text first" checks)
3. Request dispatched via `fetch` with `stream: true`
4. `onChunk` incrementally updates the textarea and canvas (200ms throttle)
5. Status line shows `✦ Generating…`, then `✓ Done — <model>`
6. On completion, final text is synced and autosaved

---

## Error Handling

Status feedback is rendered in the `#ai-status` element via `setAiStatus()`:

| Condition | Feedback |
| :--- | :--- |
| Missing API key | `⚠ Enter your OpenRouter/Anthropic API key first.` |
| HTTP error from API | `✕ API Error: <message or status>` |
| Network / fetch failure | `✕ Network error: <message>` |
| Empty text for summarize/arrange/grammar | `⚠ Add some text first.` |
| Empty text for lecture | `⚠ Paste lecture text first.` |
| Empty topic for assignment | `⚠ Enter a topic first.` |
