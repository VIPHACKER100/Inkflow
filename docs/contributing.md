# 🤝 Contributing

Guidelines for contributing to Inkflow.

---

## Project Philosophy

Inkflow is a **single-page, zero-dependency-install** application. Contributions should maintain this philosophy:
- No build tools, bundlers, or transpilers required
- All code runs directly in the browser
- Dependencies are loaded via CDN only
- The app works offline once loaded

---

## Code Style

### JavaScript
- Use `const` and `let` — never `var`
- Use template literals for string interpolation
- Functions should be documented with a brief comment
- Keep functions focused and under 50 lines where possible
- Use descriptive variable names (no single-letter vars except loop counters)

### CSS
- Use CSS custom properties for all theme-dependent values
- Organize properties: layout → sizing → spacing → visual → animation
- Use `rem` for font sizes, `px` for borders and shadows
- Mobile-first media queries

### HTML
- Semantic elements (`<nav>`, `<main>`, `<section>`, `<button>`)
- All inputs must have associated `<label>` elements
- Unique `id` attributes on all interactive elements
- No inline styles — use CSS classes

---

## File Structure

```
index.html              # Structure and CDN imports
index.css               # All styles — design tokens, components, layouts
index.js                # Core: UI, state, AI, animation (3,765 lines)
font-compilation.js     # Contour tracing, RDP, OpenType (198 lines)
paper-renderer.js       # 10 paper styles, smudge effects (341 lines)
text-layout.js          # sanitizeText, parseBlocks, getGraphemes (40 lines)
export-renderers.js     # Queue item rendering on canvas (107 lines)
diagram-engine.js       # 6 diagram types, Mermaid rendering (169 lines)
cursive-connector.js    # Cursive exit/entry points, Bezier (260 lines)
template-manager.js     # Cornell/Two-Column/Meeting layouts (242 lines)
markdown-parser.js      # Markdown tokenization (405 lines)
collaborative-engine.js # WebSocket collaboration (300 lines)
contextual-jitter-engine.js # Per-character transforms (149 lines)
stroke-prediction-engine.js # Stroke prediction (160 lines)
layer-compositor.js     # Multi-layer canvas (248 lines)
audio-recorder.js       # Audio recording (158 lines)
script-detector.js      # Unicode detection (119 lines)
server.js               # Node.js proxy (162 lines)
docs/                   # Documentation (19 markdown files)
```

Do NOT split JS/CSS into additional files without discussion. The single-file architecture is intentional.

---

## Pull Request Process

1. **Fork** the repository
2. **Create a feature branch**: `git checkout -b feature/your-feature`
3. **Make changes** following the code style above
4. **Test** in Chrome, Firefox, and Safari
5. **Submit PR** with a clear description of changes

### PR Checklist
- [ ] Code follows existing style conventions
- [ ] All existing features still work (no regressions)
- [ ] Tested on desktop and mobile viewports
- [ ] Tested in at least 2 browsers
- [ ] Documentation updated if adding new features
- [ ] No new npm/build dependencies added

---

## Reporting Issues

Use GitHub Issues with one of these templates:

### Bug Report
```markdown
**Description**: What happened?
**Expected**: What should have happened?
**Browser**: Chrome 120 / Firefox 121 / Safari 17
**Steps to reproduce**:
1. ...
2. ...
```

### Feature Request
```markdown
**Description**: What feature would you like?
**Use case**: Why is this useful?
**Proposed solution**: How should it work?
```

---

## Areas Open for Contribution

- Additional paper styles (e.g. isometric, manuscript, ledger)
- New handwriting fonts
- Extended character sets (diacritics, CJK, Arabic)
- Additional diagram types (e.g. Gantt, sequence, class diagrams)
- Accessibility improvements (ARIA labels, screen reader testing)
- Performance optimizations for large documents
- Localization / i18n support
- Unit and integration tests for rendering engines
