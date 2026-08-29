/**
 * AI Assistant Module
 * Functions: callClaude, setAiStatus, aiAction, GrammarCorrector
 * Depends on: window.S (state), window.renderText, window.autosave, window.debounceRender
 */
(function () {
  'use strict';

  function setAiStatus(msg) {
    const el = document.getElementById('ai-status');
    if (el) el.textContent = msg;
  }

  async function callClaude(prompt, systemPrompt, onChunk) {
    const provider = document.getElementById('ai-provider')?.value;
    if (provider === 'ollama') return callOllama(prompt, systemPrompt, onChunk);
    const model = document.getElementById('ai-model')?.value;
    const key = document.getElementById('api-key')?.value?.trim();

    if (!key) {
      setAiStatus('⚠ Enter your ' + (provider === 'openrouter' ? 'OpenRouter' : 'Anthropic') + ' API key first.');
      return null;
    }

    setAiStatus('✦ Generating via ' + (provider === 'openrouter' ? 'OpenRouter' : 'Anthropic') + '…');

    try {
      let res;

      if (provider === 'openrouter') {
        res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + key,
            'HTTP-Referer': window.location.href,
            'X-Title': 'Inkflow Notes Generator',
          },
          body: JSON.stringify({
            model: model,
            max_tokens: 1500,
            stream: true,
            messages: [
              { role: 'system', content: systemPrompt || 'You are a helpful assistant for a handwritten notes app.' },
              { role: 'user', content: prompt },
            ],
          }),
        });
      } else {
        res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: model,
            max_tokens: 1500,
            stream: true,
            system: systemPrompt || 'You are a helpful assistant for a handwritten notes app.',
            messages: [{ role: 'user', content: prompt }],
          }),
        });
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setAiStatus('✗ API Error: ' + (err.error?.message || res.status));
        return null;
      }

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
          if (!cleaned) continue;
          if (cleaned.startsWith('data: ')) {
            const dataStr = cleaned.slice(6);
            if (dataStr === '[DONE]') continue;
            try {
              const dataObj = JSON.parse(dataStr);
              if (provider === 'openrouter') {
                const delta = dataObj.choices?.[0]?.delta?.content || '';
                if (delta) {
                  textContent += delta;
                  if (onChunk) onChunk(textContent);
                }
              } else {
                if (dataObj.type === 'content_block_delta') {
                  const delta = dataObj.delta?.text || '';
                  if (delta) {
                    textContent += delta;
                    if (onChunk) onChunk(textContent);
                  }
                }
              }
            } catch (_e) {
              // Ignore incomplete chunks
            }
          }
        }
      }

      setAiStatus('✓ Done — ' + model.split('/').pop());
      setTimeout(() => setAiStatus(''), 3000);
      return textContent;
    } catch (e) {
      setAiStatus('✗ Network error: ' + e.message);
      return null;
    }
  }

  /* ── Grammar Corrector ──────────────────────────────────────────────────── */

  class GrammarCorrector {
    static detectLanguage(text) {
      const devanagariRatio = (text.match(/[\u0900-\u097F]/g) || []).length / text.length;
      if (devanagariRatio > 0.5) return 'hindi';
      if (devanagariRatio > 0.1) return 'hinglish';
      return 'english';
    }

    static getPrompt(language) {
      if (language === 'hindi') {
        return 'सुधारिए इस हिंदी वाक्य की व्याकरण गलतियाँ। केवल सुधरा हुआ वाक्य लिखें, कोई स्पष्टीकरण न दें।';
      }
      if (language === 'hinglish') {
        return 'Fix the grammar in this Hinglish text (Hindi written in Roman script). Return only the corrected text, no explanation.';
      }
      return 'Correct the grammar and spelling of the following text. Return only the corrected text, no explanation.';
    }
  }

  /* ── AI Action Dispatcher ───────────────────────────────────────────────── */

  async function aiAction(type) {
    const textarea = document.getElementById('text-input');
    if (!textarea) return;
    const currentText = textarea.value.trim();

    const S = window.S;
    const renderText = window.renderText;
    const autosave = window.autosave;
    const debounceRender = window.debounceRender;

    const btns = document.querySelectorAll('.ai-btn-group .btn');
    btns.forEach((b) => (b.disabled = true));

    let result = null;
    let lastRenderTime = 0;

    const onChunk = (text) => {
      textarea.value = text;
      S.text = text;
      const now = Date.now();
      if (now - lastRenderTime > 200) {
        renderText(text);
        lastRenderTime = now;
      }
    };

    if (type === 'doubt') {
      if (!currentText) {
        setAiStatus('⚠ Please enter a problem to solve');
        btns.forEach((b) => (b.disabled = false));
        return;
      }

      const systemPrompt = `You are an expert tutor helping Indian students solve math and physics problems aligned with CBSE, ICSE, and State Board curricula.

Your task is to provide step-by-step solutions with clear working and explanations suitable for student learning.

Format your response as:
- Start with "Step 1:" for the first step
- Continue with "Step 2:", "Step 3:", etc.
- Include all mathematical working and intermediate calculations
- Show the final answer clearly
- Use plain-text mathematical notation (e.g., x^2 for x squared, sqrt(x) for square root, integral for integration)
- Provide clear explanations for each step
- Maintain handwriting-suitable formatting with proper line breaks

Focus on conceptual clarity and helping students understand the problem-solving process.`;

      result = await callClaude('Solve this problem step by step:\n\n' + currentText, systemPrompt, onChunk);
    }

    if (type === 'diagram') {
      const topic = document.getElementById('ai-topic')?.value?.trim() || currentText;
      if (!topic) {
        setAiStatus('⚠ Enter a topic first.');
        btns.forEach((b) => (b.disabled = false));
        return;
      }

      const systemPrompt = `Generate a structured diagram JSON for the topic: ${topic}.
Return ONLY a JSON object surrounded by \`\`\`diagram and \`\`\` tags.
Supported types: "cycle", "flowchart".
Constraints: 
- Max 6 nodes.
- Short labels (2-3 words).
- If Hindi is detected, use Devanagari.
- Cycle format: { "type": "cycle", "nodes": [{ "id": "n1", "label": "Text" }, ...], "edges": [{ "from": "n1", "to": "n2" }, ...] }
- Flowchart format: { "type": "flowchart", "nodes": [{ "id": "s1", "label": "Step", "shape": "box/diamond/oval" }, ...], "edges": [{ "from": "s1", "to": "s2", "label": "Yes/No" }, ...] }`;

      result = await callClaude(
        'Generate a ' + (topic.length > 20 ? 'diagram of ' : '') + topic,
        systemPrompt,
        (text) => {
          textarea.value = text;
          S.text = text;
          if (text.includes('```diagram') && text.includes('```')) {
            debounceRender();
          }
        }
      );
    }

    if (type === 'summarize') {
      if (!currentText) {
        setAiStatus('⚠ Add some text first.');
        btns.forEach((b) => (b.disabled = false));
        return;
      }
      result = await callClaude(
        currentText,
        'Summarize the following text into clear, concise bullet-point notes. Use short sentences. No markdown formatting — plain text only.',
        onChunk
      );
    }

    if (type === 'arrange') {
      if (!currentText) {
        setAiStatus('⚠ Add some text first.');
        btns.forEach((b) => (b.disabled = false));
        return;
      }
      result = await callClaude(
        currentText,
        'Reorganize and format the following text to look like beautifully arranged handwritten notes. Add appropriate section headers, bullet points, and clean paragraph breaks. Ensure the flow is logical and aesthetic. Use plain text only, no markdown symbols like asterisks or hashtags.',
        onChunk
      );
    }

    if (type === 'grammar') {
      if (!currentText) {
        setAiStatus('⚠ Add some text first.');
        btns.forEach((b) => (b.disabled = false));
        return;
      }

      const language = GrammarCorrector.detectLanguage(currentText);
      if (language === 'hindi') setAiStatus('Using Hindi grammar model...');
      else if (language === 'hinglish') setAiStatus('Using Hinglish grammar model...');

      document.getElementById('grammar-original').value = currentText;
      document.getElementById('grammar-corrected').value = 'Correcting...';
      document.getElementById('grammar-lang-badge').textContent =
        language === 'hindi' ? 'Hindi' : language === 'hinglish' ? 'Hinglish' : 'English';
      document.getElementById('grammar-modal').classList.remove('hidden');

      result = await callClaude(currentText, GrammarCorrector.getPrompt(language), (text) => {
        document.getElementById('grammar-corrected').value = text;
      });

      btns.forEach((b) => (b.disabled = false));
      return;
    }

    if (type === 'lecture') {
      if (!currentText) {
        setAiStatus('⚠ Paste lecture text first.');
        btns.forEach((b) => (b.disabled = false));
        return;
      }
      result = await callClaude(
        currentText,
        'Convert this raw lecture transcript into clean, well-structured handwritten-style notes. Use headings, bullet points, and numbered lists where appropriate. Plain text only, no markdown symbols.',
        onChunk
      );
    }

    if (type === 'assignment') {
      const topic = document.getElementById('ai-topic')?.value?.trim() || currentText;
      if (!topic) {
        setAiStatus('⚠ Enter a topic first.');
        btns.forEach((b) => (b.disabled = false));
        return;
      }
      result = await callClaude(
        'Write a detailed, well-structured academic assignment on the topic: ' + topic,
        'Generate a complete handwritten-style assignment with an introduction, body paragraphs, and conclusion. Use plain text only. No markdown. Write naturally as someone would write in a notebook.',
        onChunk
      );
    }

    if (result !== null && type !== 'grammar') {
      textarea.value = result;
      S.text = result;
      renderText(S.text);
      autosave();
    }

    btns.forEach((b) => (b.disabled = false));
  }

  /* ── Accept Grammar Correction ──────────────────────────────────────────── */

  function acceptGrammarCorrection() {
    const corrected = document.getElementById('grammar-corrected')?.value;
    if (corrected && corrected !== 'Correcting...') {
      const textarea = document.getElementById('text-input');
      if (textarea) {
        textarea.value = corrected;
        window.S.text = corrected;
        window.renderText(window.S.text);
        window.autosave();
      }
    }
    const modal = document.getElementById('grammar-modal');
    if (modal) modal.classList.add('hidden');
  }

  /* ── Ollama Local AI ────────────────────────────────────────────────────── */

  const AI_SYSTEM_BASE_PROMPT = `You are Inkflow's AI assistant for handwritten notes. Output using Inkflow's native rich study syntax:
- # H1 headers for main topics
- ## H2 subheaders for subtopics
- - Bullet lists for key points
- ==highlighted text== for important terms
- [sticky:yellow]margin notes[sticky] for supplementary info
- [callout:info]important callouts[callout] for key takeaways
- Q: Question format for study review
- A: Answer format for study review
Keep responses concise and structured for handwritten note-taking.`;

  async function callOllama(prompt, systemPrompt, onChunk) {
    setAiStatus('✦ Generating via Ollama (local)…');
    try {
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
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setAiStatus('✗ Ollama Error: ' + (err.error || res.status));
        return null;
      }
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
          if (!cleaned) continue;
          try {
            const data = JSON.parse(cleaned);
            if (data.message?.content) {
              textContent += data.message.content;
              if (onChunk) onChunk(textContent);
            }
          } catch (err) { /* incomplete chunk */ }
        }
      }
      setAiStatus('✓ Done — Ollama');
      setTimeout(() => setAiStatus(''), 3000);
      return textContent;
    } catch (e) {
      setAiStatus('✗ Ollama not running. Start with: ollama serve');
      return null;
    }
  }

  /* ── API Key Persistence ────────────────────────────────────────────────── */

  function initApiKeyPersistence() {
    const keyInput = document.getElementById('api-key');
    const rememberCheck = document.getElementById('remember-api-key');
    const providerSelect = document.getElementById('ai-provider');
    if (!keyInput) return;
    const loadKey = () => {
      const provider = providerSelect?.value || 'openrouter';
      const saved = localStorage.getItem('inkflow-api-key-' + provider);
      if (saved) {
        keyInput.value = saved;
        if (rememberCheck) rememberCheck.checked = true;
      }
    };
    loadKey();
    providerSelect?.addEventListener('change', loadKey);
    keyInput.addEventListener('input', () => {
      if (rememberCheck?.checked) {
        const provider = providerSelect?.value || 'openrouter';
        localStorage.setItem('inkflow-api-key-' + provider, keyInput.value);
      }
    });
    rememberCheck?.addEventListener('change', () => {
      const provider = providerSelect?.value || 'openrouter';
      if (rememberCheck.checked) {
        localStorage.setItem('inkflow-api-key-' + provider, keyInput.value);
      } else {
        localStorage.removeItem('inkflow-api-key-' + provider);
      }
    });
  }

  /* ── Export ─────────────────────────────────────────────────────────────── */

  window.AIAssistant = {
    callClaude, callOllama, setAiStatus, aiAction,
    GrammarCorrector, acceptGrammarCorrection,
    AI_SYSTEM_BASE_PROMPT, initApiKeyPersistence,
  };
})();
