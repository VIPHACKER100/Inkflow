# Solution Streaming and Rendering Implementation Guide

## Overview

This guide explains how InkFlow's solution streaming and rendering system works end-to-end. This feature enables students to receive step-by-step solutions to math and physics problems, with solutions streaming in real-time and rendering to the canvas with authentic handwriting styling.

**Related Task**: Task 6.2 - Implement solution streaming and rendering  
**Related Requirements**: 5.4, 5.5, 5.6, 5.8, 5.10

---

## Architecture Overview

### System Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    User Interaction                          │
│  (Input problem, click "Doubt Solver" button)               │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────┐
│              Input Validation                                │
│  - Check if textarea is not empty                           │
│  - Display error if empty: "Please enter a problem"         │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────┐
│           Prepare AI Request                                 │
│  - Get current problem text                                 │
│  - Get system prompt with format instructions               │
│  - Select AI provider (OpenRouter or Anthropic)             │
│  - Include API key                                          │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────┐
│        Send to AI Provider (Streaming)                       │
│  POST to:                                                   │
│  - https://openrouter.ai/api/v1/chat/completions, or       │
│  - https://api.anthropic.com/v1/messages                    │
│  - stream: true (enables SSE streaming)                     │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────┐
│      Receive Streaming Response (SSE)                        │
│  - Receive chunks as data: JSON events                      │
│  - Parse delta.content (OpenRouter) or delta.text (Claude)  │
│  - Accumulate text into full response                       │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────┐
│         onChunk Callback (Per-Delta)                         │
│  - Update textarea.value with accumulated text              │
│  - Update S.text global state                               │
│  - Check throttle interval (200ms)                          │
│  - If interval passed: call renderText()                    │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────┐
│        Layout & Render to Canvas                             │
│  - Call layoutText() to format text into pages              │
│  - Call renderText() with handwriting engine                │
│  - Apply current S.font, S.fontSize, S.inkColor             │
│  - Apply character variation & jitter                       │
│  - Render to canvas pages incrementally                     │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────┐
│      Solution Visible on Canvas                              │
│  - Text appears character-by-character                      │
│  - Handwriting styling applied                              │
│  - Multiple pages handled automatically                     │
│  - User can edit, export, or save                           │
└──────────────────────────────────────────────────────────────┘
```

---

## Code Implementation Details

### 1. Problem Input and Validation

**File**: `index.js` (lines ~2370-2390)

```javascript
async function aiAction(type) {
  const textarea = document.getElementById('text-input');
  const currentText = textarea.value.trim();

  // Get all AI buttons
  const btns = document.querySelectorAll('.ai-btn-group .btn');
  btns.forEach(b => b.disabled = true);

  // Handle doubt-solver specifically
  if (type === 'doubt') {
    // Validation: check if input is empty
    if (!currentText) {
      setAiStatus('⚠ Please enter a problem to solve');
      btns.forEach(b => b.disabled = false);
      return;
    }
    
    // Continue with API call...
  }
}
```

**What Happens**:
- User enters problem: "Solve: 2x + 5 = 13"
- User clicks "Doubt Solver" button
- `aiAction('doubt')` is called
- Input validation checks `textarea.value.trim()`
- If empty, error toast displayed and function returns
- If valid, proceeds to create AI request

---

### 2. System Prompt with Format Instructions

**File**: `index.js` (lines 2595-2608)

```javascript
const systemPrompt = `You are an expert tutor helping Indian students 
solve math and physics problems aligned with CBSE, ICSE, and State Board 
curricula.

Your task is to provide step-by-step solutions with clear working and 
explanations suitable for student learning.

Format your response as:
- Start with "Step 1:" for the first step
- Continue with "Step 2:", "Step 3:", etc.
- Include all mathematical working and intermediate calculations
- Show the final answer clearly
- Use plain-text mathematical notation (e.g., x^2 for x squared, 
  sqrt(x) for square root, integral for integration)
- Provide clear explanations for each step
- Maintain handwriting-suitable formatting with proper line breaks

Focus on conceptual clarity and helping students understand the 
problem-solving process.`;
```

**What This Ensures**:
- ✅ Step numbering format
- ✅ Mathematical working included
- ✅ Final answer highlighted
- ✅ Plain-text notation used
- ✅ Line breaks for readability
- ✅ Educational focus

---

### 3. Streaming Setup and onChunk Callback

**File**: `index.js` (lines 2474-2479)

```javascript
let lastRenderTime = 0;

const onChunk = (text) => {
  // Update textarea immediately for instant feedback
  textarea.value = text;
  
  // Update global state
  S.text = text;
  
  // Throttle rendering to every 200ms for performance
  const now = Date.now();
  if (now - lastRenderTime > 200) {
    renderText(text);  // Render to canvas
    lastRenderTime = now;
  }
};

// Call API with streaming enabled
result = await callClaude(
  'Solve this problem step by step:\n\n' + currentText,
  systemPrompt,
  onChunk  // Callback that fires for each text delta
);
```

**Timeline Example** for response "Step 1: Add 5..."
```
Time   Event
─────  ──────────────────────────────────────────────
0ms    Stream starts, first delta: "Step"
10ms   onChunk("Step")            → textarea = "Step"
20ms   Delta: " 1"
30ms   onChunk("Step 1")          → textarea = "Step 1"
40ms   Delta: ":"
...
200ms  onChunk("Step 1: Add 5") → textarea + RENDER to canvas ✓
220ms  Delta: " from both sides"
230ms  onChunk("Step 1: Add 5 from both")
...
400ms  onChunk("Step 1: Add 5 from both sides") → RENDER ✓
...
1000ms Stream complete, all steps rendered
```

---

### 4. The callClaude Streaming Function

**File**: `index.js` (lines 2449-2555)

```javascript
async function callClaude(prompt, systemPrompt, onChunk) {
  const provider = document.getElementById('ai-provider').value;
  const model = document.getElementById('ai-model').value;
  const key = document.getElementById('api-key').value.trim();

  // For OpenRouter
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + key,
    },
    body: JSON.stringify({
      model: model,
      max_tokens: 1500,
      stream: true,  // ← Enable SSE streaming
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
    }),
  });

  // Read streaming response
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let textContent = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      const cleaned = line.trim();
      if (!cleaned || !cleaned.startsWith('data: ')) continue;
      
      try {
        const dataStr = cleaned.slice(6);
        if (dataStr === '[DONE]') continue;
        
        const dataObj = JSON.parse(dataStr);
        
        // Extract delta based on provider
        const delta = dataObj.choices?.[0]?.delta?.content || '';
        
        if (delta) {
          textContent += delta;
          if (onChunk) onChunk(textContent);  // ← Call callback
        }
      } catch (err) {
        // Ignore incomplete chunks
      }
    }
  }

  return textContent;
}
```

**Key Points**:
- `stream: true` enables SSE streaming
- Each chunk received triggers `onChunk()` callback
- Text accumulates in `textContent`
- Callback fires for each delta (sometimes multiple deltas per network packet)

---

### 5. Rendering with Handwriting Settings

**File**: `index.js` (lines 1900-2000+)

```javascript
function renderText(text) {
  text = sanitizeText(text);
  clearPages();
  
  if (!text.trim()) {
    // Empty text - just draw background
    const canvas = createPage(1);
    drawPaperBackground(canvas.getContext('2d'), S.paperStyle);
    return;
  }

  // Layout text into pages with current settings
  const { queue, pageTexts, pageCount } = layoutText(text);
  
  // Create pages
  for (let i = 0; i < pageCount; i++) {
    const canvas = createPage(i + 1);
    const ctx = canvas.getContext('2d');
    
    // Draw paper background
    drawPaperBackground(ctx, S.paperStyle);
    
    // Draw smudge effects (if enabled)
    renderSmudgeEffects(ctx, i);
  }

  // Render all character glyphs with variation
  queue.forEach((item) => {
    const canvas = pages[item.pageIdx];
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Draw character with variation engine
    // Uses: S.font, S.fontSize, S.inkColor, S.pressure, S.rotationMax
    // ... character rendering code ...
  });
}
```

**Handwriting Settings Applied**:

| Setting | Used For | Example |
|---------|----------|---------|
| `S.font` | Font family | "Caveat", "Indie Flower", custom fonts |
| `S.fontSize` | Text size | 14px to 52px |
| `S.lineHeight` | Line spacing | 1.0x to 2.0x |
| `S.inkColor` | Pen color | "#1c2340", "#0066cc", custom hex |
| `S.pressure` | Stroke weight | 0.05 to 0.3 |
| `S.rotationMax` | Character jitter | 0.5 to 3.0 degrees |
| `S.bleed` | Ink bleeding | 0.1 to 1.0 |
| `S.paperStyle` | Background | "ruled", "plain", "grid", "vintage", etc. |

---

## Mathematical Notation Examples

### Supported Notation

The system supports plain-text mathematical notation that passes through the entire pipeline:

#### Exponents and Powers
```
Problem: Solve x^2 + 5x + 6 = 0
Output: 
Step 1: Recognize x^2 + 5x + 6 is a quadratic
Step 2: Factor as (x + 2)(x + 3) = 0
Step 3: Solutions are x = -2 or x = -3
```

#### Square Roots
```
Problem: Simplify sqrt(16) + sqrt(9)
Output:
Step 1: sqrt(16) = 4
Step 2: sqrt(9) = 3
Step 3: 4 + 3 = 7
```

#### Division and Fractions
```
Problem: Simplify (2/3) * (3/4)
Output:
Step 1: Multiply numerators: 2 * 3 = 6
Step 2: Multiply denominators: 3 * 4 = 12
Step 3: Result = 6/12 = 1/2
```

#### Greek Letters and Symbols
```
Problem: If α + β = 90° and α = 30°, find β
Output:
Step 1: Given α + β = 90°
Step 2: Substitute α = 30°
Step 3: 30° + β = 90°
Step 4: β = 60°
```

#### Integrals and Calculus
```
Problem: Find the antiderivative of x^2
Output:
Step 1: The antiderivative of x^n is x^(n+1)/(n+1) + C
Step 2: For x^2: integral of x^2 = x^3/3 + C
Step 3: Verify by taking derivative: d/dx(x^3/3) = x^2 ✓
```

### Notation Preservation Through Pipeline

```
User Input
    ↓
System Prompt (mentions notation support)
    ↓
AI Response (uses x^2, sqrt(x), etc.)
    ↓
Streaming (notation preserved in delta)
    ↓
onChunk Accumulation (notation intact)
    ↓
textarea.value (notation visible in input)
    ↓
S.text Global State (notation unchanged)
    ↓
renderText() → layoutText()
    ↓
Canvas Rendering (Unicode characters rendered)
    ↓
Final Output (notation preserved end-to-end)
```

---

## Performance Optimization

### Throttled Rendering

Without throttling, the canvas would redraw on EVERY character delta, which could cause:
- Excessive CPU usage
- Battery drain on mobile devices
- Stuttering visual updates
- Dropped frames

**Solution**: Throttle to 200ms minimum between renders

```javascript
const THROTTLE_INTERVAL = 200; // milliseconds
let lastRenderTime = 0;

const onChunk = (text) => {
  textarea.value = text;  // Always update textarea
  S.text = text;          // Always update state
  
  const now = Date.now();
  // Only render if enough time has passed
  if (now - lastRenderTime > THROTTLE_INTERVAL) {
    renderText(text);
    lastRenderTime = now;
  }
};
```

**Benefit**: Smooth rendering at ~5 FPS while maintaining responsive feel

### Typical Rendering Timeline

For a 5-step solution (~200 words):
```
Streaming Duration: ~3-5 seconds (depends on AI provider)
Chunks Received: ~40-100 deltas
onChunk Calls: ~40-100
Canvas Renders: ~15-25 (every 200ms)
Final Update: ~5 seconds total
User Experience: Smooth character-by-character rendering
```

---

## Testing the Implementation

### Manual Test 1: Basic Problem

```
Steps:
1. Open InkFlow application
2. Enter: "Solve 3x - 7 = 11"
3. Click "Doubt Solver" button
4. Observe as solution streams and renders

Expected Output:
Step 1: Add 7 to both sides
3x - 7 + 7 = 11 + 7
3x = 18

Step 2: Divide by 3
x = 18/3
x = 6

Final Answer: x = 6

Expected Behavior:
- Solution appears progressively
- Each line appears character-by-character
- Math notation preserved (3x, +7, etc.)
- Handwriting style applied
```

### Manual Test 2: With Notation

```
Steps:
1. Change font to "Caveat"
2. Set font size to 26
3. Enter: "Solve x^2 - 4 = 0"
4. Click "Doubt Solver"

Expected Output:
Step 1: Recognize x^2 - 4 as a difference of squares
Step 2: Factor as (x - 2)(x + 2) = 0
Step 3: Solutions are x = 2 or x = -2

Expected Behavior:
- x^2 renders correctly in Caveat font
- Solution size is 26px
- All mathematical symbols preserved
```

### Manual Test 3: Settings Applied

```
Steps:
1. Change ink color to "#0066cc" (blue)
2. Change pressure to 0.2
3. Set paper to "grid"
4. Enter physics problem and click "Doubt Solver"

Expected:
- Solution rendered in blue
- Thicker strokes due to higher pressure
- Grid background visible
- All settings honored
```

### Automated Test Coverage

Tests in `solution-streaming.test.js` verify:
- ✅ Streaming chunks arrive incrementally
- ✅ Step numbering format correct
- ✅ Mathematical notation preserved
- ✅ Intermediate calculations shown
- ✅ Final answer present
- ✅ Handwriting settings applied
- ✅ Throttling prevents excess renders
- ✅ Edge cases handled (single step, special chars)
- ✅ Full pipeline integration works

---

## Troubleshooting

### Issue: Solution doesn't stream

**Possible Causes**:
1. API key not configured
   - Solution: Enter OpenRouter or Anthropic API key
2. Network connection issues
   - Solution: Check internet connection
3. AI provider rate limited
   - Solution: Wait a few minutes and try again

### Issue: Solution appears but doesn't render to canvas

**Possible Causes**:
1. Canvas rendering disabled
   - Solution: Check browser console for errors
2. Handwriting settings too extreme
   - Solution: Reset to default settings
3. Browser compatibility
   - Solution: Use modern browser (Chrome, Firefox, Safari, Edge)

### Issue: Mathematical notation not showing correctly

**Possible Causes**:
1. Font doesn't support characters
   - Solution: Switch to "sans-serif" or system font
2. Notation malformed
   - Solution: Check system prompt for valid notation examples
3. Special character encoding
   - Solution: Ensure UTF-8 encoding in browser

### Issue: Performance is slow

**Possible Causes**:
1. Multiple features enabled
   - Solution: Disable smudge effects, cursive mode temporarily
2. Large solutions (>1500 tokens)
   - Solution: Keep problems concise
3. Low-end device
   - Solution: Reduce font size or decrease pressure variation

---

## Integration with Other Features

### With Contextual Jitter Engine

Solutions benefit from enhanced per-character variation:
- Line-start: Increased pressure (1.2×)
- Line-end: Increased slant (1.3×)
- After 50 chars: Progressive baseline fatigue
- After 80 chars: Hand-cramping simulation

### With Cursive Mode

When enabled, solutions have connected letters:
- Lowercase letters connect with Bezier curves
- Common ligatures (th, ch, sh, etc.) use connected glyphs
- Uppercase and punctuation don't connect

### With Smudge Effects

Solutions can include realistic smudges:
- 2-5 semi-transparent overlay shapes per page
- Simulates erased areas and ink smudges
- Applied before text rendering (in correct drawing order)

### With Multi-Pen Support (Future)

When markdown parsing is implemented:
- Different problem types could use different pens
- "Step 1:" could be in bold blue
- Explanations in regular black
- Important final answer in red

---

## Advanced Configuration

### Adjusting Throttle Interval

In `index.js`, modify the throttle check:

```javascript
// Current: 200ms throttle
if (now - lastRenderTime > 200) {

// Faster rendering (more CPU): 100ms throttle
if (now - lastRenderTime > 100) {

// Slower rendering (less CPU): 500ms throttle
if (now - lastRenderTime > 500) {
```

### Custom Solution Format

To customize the system prompt without code changes, edit in UI:
- System prompt could be moved to settings panel
- Teachers could customize format for their needs
- Students could adjust difficulty/complexity level

### Multiple AI Providers

Currently supported:
- OpenRouter (150+ models available)
- Anthropic Claude (3+ models)

Could add:
- Google Gemini
- OpenAI GPT
- Local models via Ollama

---

## References

### Related Requirements
- **5.4**: Process AI response using existing SSE streaming mechanism
- **5.5**: Format solution with step numbering (Step 1:, Step 2:, etc.)
- **5.6**: Include mathematical working and intermediate calculations
- **5.8**: Support plain-text mathematical notation (x^2, sqrt(x), integrals)
- **5.10**: Render solution incrementally with current handwriting settings

### Related Files
- `index.js` - Main implementation
- `solution-streaming.test.js` - Test suite
- `TASK-6.2-VERIFICATION.md` - Verification checklist
- `DOUBT-SOLVER-IMPLEMENTATION.md` - Task 6.1 (foundation)

### Further Reading
- [MDN: Fetch Streaming](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [OpenRouter API Docs](https://openrouter.ai/docs)
- [Anthropic Claude API](https://docs.anthropic.com)

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Status**: Production Ready
