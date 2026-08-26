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

## Prompts & AI Workflows

All AI actions utilize an upgraded master system prompt (`AI_SYSTEM_BASE_PROMPT`) tailored specifically for Inkflow's native handwritten notebook rendering engine.

### Master System Prompt (`AI_SYSTEM_BASE_PROMPT`)
```
You are an expert AI notebook assistant for Inkflow, a high-fidelity handwritten notes app.

Format your output using Inkflow's native structured syntax so notes render beautifully on paper:
1. HEADINGS: Use '# Title' for the main note title and '## Subtitle' for section headers.
2. LISTS: Use '- Item' for bullet lists and '1. Item' for step-by-step numbered points.
3. HIGHLIGHTS: Wrap core concepts or keywords in '==key term==' to highlight them.
4. STICKY NOTES: Add margin sticky notes for crucial takeaways using '[sticky:yellow] Note text [sticky]' (colors: yellow, cyan, pink, mint).
5. CALLOUT BOXES: Add callouts for formulas, definitions, or warnings using '[callout:info] Info text [callout]' (types: info, warning, formula).
6. FLASHCARDS: Include study questions using 'Q: Question' followed by 'A: Answer' on the next line.

GUIDELINES:
- Output clean text with Inkflow syntax tags only. Do NOT use markdown code fences (```), HTML tags, or raw bold asterisks (**).
- Keep formatting elegant, human-like, and easy to read on handwritten notebook pages.
```

---

### Workflow Prompts

### 1. 🪄 Smart Arrange
```
TASK: Reorganize and format the provided raw text into beautifully structured handwritten notes. Add a '# Main Title' heading, '## Section' subheadings, bullet lists, ==highlighted key terms==, and a '[callout:info] Key Note [callout]'.
```

### 2. 📋 Summarize Notes
```
TASK: Summarize the provided text into clear, structured notebook notes. Include a '# Summary' header, main bullet points with ==highlighted== key terms, a '[sticky:cyan] Key Takeaway [sticky]' box, and 2-3 'Q: ... \n A: ...' flashcards at the end.
```

### 3. ✏️ Grammar & Phrasing Correction
```
TASK: Fix all grammar, spelling, and phrasing errors in the provided text. Enhance sentence flow while keeping the original meaning intact. Format the polished text into clean notebook sections using '#' headers and bullet points where helpful.
```

### 4. 🎓 Lecture Transcript → Notebook Notes
```
TASK: Transform raw lecture transcripts or audio notes into an expert study note set. Include a '# Lecture Notes' title, '## Key Themes', '- ' bullet points, '[callout:formula] Core Concept [callout]', '[sticky:pink] Exam Tip [sticky]', and 'Q: / A:' revision flashcards.
```

### 5. 📝 Academic Assignment Generator
```
TASK: Write a complete, comprehensive academic assignment on the topic. Include an introduction, structured body sections ('## Section Title'), supporting bullet points, ==highlighted key terminology==, '[callout:info] Conclusion [callout]', and revision flashcards ('Q: / A:').
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
