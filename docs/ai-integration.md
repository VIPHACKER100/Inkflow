# 🤖 AI Integration

This document describes Inkflow's Anthropic Claude API integration.

---

## Connection Details

Inkflow supports two primary AI backends. Users can select their provider and model directly from the UI dropdowns.

### 🌐 OpenRouter (Primary)
- **URL**: `https://openrouter.ai/api/v1/chat/completions`
- **Models**: Dynamically fetched via `https://openrouter.ai/api/v1/models`. Features 100+ models from Google, Anthropic, OpenAI, Meta, DeepSeek, etc. Free models are prioritized and marked.
- **Required Headers**:
  ```http
  Content-Type: application/json
  Authorization: Bearer USER_API_KEY
  HTTP-Referer: [Window Location]
  X-Title: Inkflow Notes Generator
  ```

### 🔑 Anthropic (Direct)
- **URL**: `https://api.anthropic.com/v1/messages`
- **Models**: Native Claude 3 and 3.5 family models.
- **Required Headers**:
  ```http
  Content-Type: application/json
  x-api-key: USER_API_KEY
  anthropic-version: 2023-06-01
  anthropic-dangerous-direct-browser-access: true
  ```

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

---

## Execution Flow

1. User inputs API key and selects an AI feature.
2. System prompt is loaded for clean plain-text output.
3. Request dispatched via `fetch` with bypass headers.
4. Spinner displayed (`✦ Generating…`) during processing.
5. Response parsed and rendered onto the canvas pages.

---

## Error Handling

| Error | User Feedback |
| :--- | :--- |
| Missing API key | "Please enter your API key first" toast |
| Network failure | "Failed to connect to Claude API" error |
| Rate limiting (429) | "Rate limited — please wait and try again" |
| Invalid API key (401) | "Invalid API key — please check and re-enter" |
| Empty input text | "Please enter some text first" validation |
