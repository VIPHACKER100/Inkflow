<p align="center">
  <img src="../inkflow_logo.jpeg" alt="Inkflow Logo" width="80" style="border-radius: 50%; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />
</p>

# 🤖 AI Integration

This document describes Inkflow's multi-provider AI integration (OpenRouter, Anthropic, and local Ollama) with SSE streaming support.

---

## Connection Details

Inkflow supports three AI backends (OpenRouter, Anthropic Claude, and local private Ollama). Users select their provider and model from the UI dropdowns.

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

## Provider Routing (`callAI`)

All AI actions route through `callAI(prompt, systemPrompt, onChunk)`, which checks the selected provider and dispatches to the appropriate backend:

```javascript
async function callAI(prompt, systemPrompt, onChunk) {
  const provider = document.getElementById('ai-provider').value;
  if (provider === 'ollama') {
    const model = document.getElementById('ai-model').value;
    return callOllama(prompt, systemPrompt, model, onChunk);
  }
  return callClaude(prompt, systemPrompt, onChunk);
}
```

This ensures all four AI actions (Summarize, Grammar, Lecture, Assignment) work correctly with Ollama — previously they were hardcoded to `callClaude()` and silently ignored the Ollama provider selection.

> **Note (v1.6.7+):** Smart Arrange is no longer an AI action — it runs fully offline via the deterministic `smartArrangeLocal()` tidy-up and needs no provider or API key.

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
- Write naturally, like a thoughtful human—not a generic AI, essay, brochure, or corporate press release. Be direct, specific, clear, and useful. Use simple words and ordinary verbs.
- Avoid AI-style filler such as "delve", "pivotal", "crucial", "robust", "vibrant", "meticulous", "enduring", "showcase", "foster", "garner", "bolster", "landscape", "tapestry", "testament", "underscore", "serves as", and "boasts".
- State facts plainly. Never inflate ordinary facts into grand significance, legacy, impact, cultural importance, broader trends, debates, or future prospects. Avoid empty "highlighting", "underscoring", "reflecting", and "showcasing" clauses.
- Avoid vague claims, fake generalizations, promotional praise, forced optimism, and unsupported certainty. Say exactly who did what.
- Avoid "not only…but also", "not X but Y", forced groups of three, forced synonym variety, and formulaic structures. Vary sentence length and rhythm naturally. Use transitions sparingly. Don't overuse em dashes, semicolons, colons, parentheses, bold, headings, bullets, tables, emoji, or exclamation marks.
- Never invent facts, sources, citations, quotes, URLs, or placeholders. Never leak internal artifacts or malformed markup.
- Don't pad, repeat conclusions, or announce that something is "comprehensive" or "well-written." Write for meaning, not appearance.
- Keep formatting elegant, human-like, and easy to read on handwritten notebook pages.
```

---

### Workflow Prompts

### 1. 🪄 Smart Arrange — *offline since v1.6.7 (Upgraded)*
```
Smart Arrange does NOT call any AI provider. It applies the deterministic
smartArrangeLocal() tidy-up directly in the browser:
- normalize headers (#Title → # Title, ##   Heading → ## Heading)
- normalize Inkflow study tags ([sticky : yellow] → [sticky:yellow], [callout : info] → [callout:info])
- normalize highlight spacing (== key == → ==key==)
- normalize bullet markers (*, •, ‣, +, ⁃, ◦, ▪, ▫, –, — → "- ") & capitalize first character while preserving indentation
- reformat Q&A flashcards (q1: / Q 1 : / question 1: → Q1:, a 1 : / ans 1: → A1:, a: → A:)
- trim trailing whitespace and collapse double spaces (preserving leading line indentation and fill-in underscores)
- fix punctuation spacing (remove space before punctuation, add space after comma/semicolon/exclamation/question mark/period)
- insert structural blank lines before headers (# / ##) and Q&A questions (Q: / Q1:)
- collapse runs of 3+ blank lines down to one blank line
- end the document with exactly one newline
```
It needs no provider selection and no API key, and reports the number of fixes via a toast plus the AI status line.

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

## AI Response Post-Processing Pipeline (v1.6.23+)

To ensure raw model outputs render seamlessly as natural handwriting without breaking canvas formatting or duplicating content, all stream results pass through a two-stage post-processing pipeline (`sanitizeAiResponse()` and `resequenceQA()`) before updating state, rendering to canvas, or saving.

```
       ┌────────────────────────────────────────────────────────┐
       │             Raw AI Model Stream Response               │
       └───────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │   Stage 1: Markdown & Tag Sanitizer                    │
       │   sanitizeAiResponse(text)                             │
       │   - Strips ```code fences``` (keeps code body)        │
       │   - Strips `inline backticks`                           │
       │   - Strips **bold**, __bold__, *italic*, _italic_      │
       │   - Strips raw HTML tags (<b>, <code>, <p>, etc.)      │
       │   - Preserves Inkflow syntax ([sticky], ==hl==, etc.)  │
       └───────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │   Stage 2: Q&A Resequencer & Deduplicator              │
       │   resequenceQA(text)                                   │
       │   - Local sequential renumbering (Q1:, Q2:, ...)        │
       │   - Trigram Jaccard deduplication (threshold ≥ 0.72)   │
       │   - Drops near-duplicate questions & paired answers     │
       └───────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │            Canvas Renderer & State Autosave            │
       └────────────────────────────────────────────────────────┘
```

### 1. Markdown Leakage Stripping (`sanitizeAiResponse`)
Raw markdown symbols (like code fences or backticks) break the aesthetic of "handwritten" notes. `sanitizeAiResponse()` runs a single-pass regex conversion that cleans unwanted syntax while protecting Inkflow study markup:
- **Code Fences**: Removes triple-backtick markers (` ```python ... ``` `) while preserving the code text inside.
- **Inline Backticks**: Removes single backticks around inline words (`` `class` `` → `class`).
- **Bold & Italic**: Strips double and single asterisks/underscores (`**bold**` → `bold`).
- **HTML Markup**: Strips raw HTML tags (`<span>`, `<code>`, `<p>`).
- **Syntax Preservation**: Leaves Inkflow tags intact (`[sticky:color]`, `[callout:type]`, `==highlight==`, `---`, `***`, `#`, `##`).

### 2. Q&A Resequencer & Deduplicator (`resequenceQA`)
AI models occasionally misnumber flashcard questions (skipping numbers) or repeat duplicate questions within a single session. `resequenceQA()` fixes both issues deterministically:
- **Local Renumbering**: Ignores the model's own labels (`Q3:`, `Q7.`, etc.) and assigns sequential numbers starting at `Q1:`, `Q2:`, … based on a local counter.
- **Trigram Jaccard Deduplication**: Computes character 3-grams (`_trigrams()`) for each question and evaluates pairwise Jaccard similarity (`_jaccard()`). If a new question shares **≥ 72% trigram similarity** with any previously accepted question in the set, it and its corresponding `A:` answer are silently dropped.

---

## Execution Flow

1. User inputs API key and selects an AI feature
2. Input text is validated (per-action "add some text first" checks)
3. `callAI()` checks the selected provider and dispatches to `callClaude()` or `callOllama()`
4. Request dispatched via `fetch` with `stream: true`
5. `onChunk` incrementally updates the textarea and canvas (200ms throttle)
6. On stream completion, the raw output passes through `sanitizeAiResponse()` and `resequenceQA()`
7. Status line shows `✦ Generating…`, then `✓ Done — <model>`
8. Cleaned, resequenced text is updated in `S.text`, synced to page editors, re-rendered on canvas, and autosaved

---

## Error Handling

Status feedback is rendered in the `#ai-status` element via `setAiStatus()`:

| Condition | Feedback |
| :--- | :--- |
| Missing API key | `⚠ Enter your OpenRouter/Anthropic API key first.` |
| HTTP error from API | `✕ API Error: <message or status>` |
| Network / fetch failure | `✕ Network error: <message>` |
| Empty text for summarize/grammar | `⚠ Add some text first.` |
| Empty text for arrange | `⚠ Add some text first.` (offline tidy-up still applies once text exists) |
| Empty text for lecture | `⚠ Paste lecture text first.` |
| Empty topic for assignment | `⚠ Enter a topic first.` |
