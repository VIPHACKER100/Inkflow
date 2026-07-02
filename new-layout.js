function layoutTextTemplated(text) {
  const tmpCanvas = document.createElement('canvas');
  tmpCanvas.width = PAGE_W;
  tmpCanvas.height = PAGE_H;
  const ctx = tmpCanvas.getContext('2d');

  const queue = [];
  const pageTexts = [];
  let currentPageText = '';

  const variationContext = new CharacterVariationContext();

  const margin = S.margin;
  const template = window.templateManager ? window.templateManager.resolveTemplate(S.noteLayout, PAGE_W, PAGE_H, margin) : null;
  const zones = template && template.zones && template.zones.length > 0 
    ? template.zones 
    : [{ id: 'main', x: margin, y: margin, width: PAGE_W - margin * 2, height: PAGE_H - margin * 2, nextZone: null }];
  
  let activeZone = zones[0];
  let x = activeZone.x;
  const lineH = S.fontSize * S.lineHeight;
  let y = activeZone.y + S.fontSize + lineH;

  let pageIdx = 0;
  let charIndex = 0;
  let lineCharIndex = 0;

  function advanceLineOrZone() {
    x = activeZone.x;
    y += lineH;
    lineCharIndex = 0;
    variationContext.resetAtLineBreak();
    if (y + lineH > activeZone.y + activeZone.height) {
      if (activeZone.nextZone) {
        activeZone = zones.find(z => z.id === activeZone.nextZone) || zones[0];
      } else {
        pageTexts.push(currentPageText);
        currentPageText = '';
        pageIdx++;
        activeZone = zones[0];
      }
      x = activeZone.x;
      y = activeZone.y + S.fontSize + lineH;
    }
  }

  const blocks = parseBlocks(text);

  for (const block of blocks) {
    if (block.type === 'mermaid') {
      const diag = getDiagramImage(block.content);
      
      const maxWidth = activeZone.width;
      let dWidth = diag.width || 400;
      let dHeight = diag.height || 200;

      if (dWidth > maxWidth) {
        const scale = maxWidth / dWidth;
        dWidth = maxWidth;
        dHeight *= scale;
      }

      if (y + dHeight > activeZone.y + activeZone.height) {
        advanceLineOrZone();
      }

      queue.push({
        type: 'mermaid',
        content: block.content,
        x: activeZone.x + (activeZone.width - dWidth) / 2,
        y: y,
        w: dWidth,
        h: dHeight,
        pageIdx
      });

      currentPageText += block.raw + '\n';
      y += dHeight + lineH;
      x = activeZone.x;
      lineCharIndex = 0;
      continue;
    }

    if (block.type === 'diagram') {
      let data;
      try {
        data = JSON.parse(block.content);
        if (!data || !data.nodes) throw new Error('Missing nodes');
      } catch (e) {
        console.error('Failed to parse diagram JSON', e);
        continue;
      }

      const dWidth = activeZone.width;
      const dHeight = data.nodes.length > 5 ? 400 : 300;

      if (y + dHeight > activeZone.y + activeZone.height) {
        advanceLineOrZone();
      }

      let positionedNodes = [];
      const cx = activeZone.x + activeZone.width / 2;
      const cy = y + dHeight / 2;
      const r = Math.min(activeZone.width, dHeight) / 2 - 60;
      
      data.nodes.forEach((n, i) => {
        const angle = (i / data.nodes.length) * Math.PI * 2 - Math.PI / 2;
        positionedNodes.push({
          id: n.id,
          label: n.label,
          x: cx + Math.cos(angle) * r,
          y: cy + Math.sin(angle) * r,
          w: 100, h: 40
        });
      });

      queue.push({
        type: 'diagram',
        nodes: positionedNodes,
        edges: data.edges || [],
        pageIdx
      });

      positionedNodes.forEach(n => {
        const words = n.label.split(' ');
        let ly = n.y - 5;
        const labelLineHeight = S.fontSize * 1.2;
        
        words.forEach(word => {
          let lx = n.x - ctx.measureText(word).width / 2;
          const chars = getGraphemes(word);
          chars.forEach((ch, ci) => {
            const v = getCharVariation(S.rotationMax * 0.5, S.pressure, S.fontSize);
            queue.push({
              ch, x: lx, y: ly + v.baselineOff, v,
              pageIdx, isIndic: false,
              fontStack: fontSwitcher.getFontStack(false, S.font),
              inkColor: S.inkColor
            });
            lx += ctx.measureText(ch).width + v.spacingExtra;
          });
          ly += labelLineHeight;
        });
      });

      y += dHeight + lineH;
      currentPageText += block.raw + '\n';
      x = activeZone.x;
      lineCharIndex = 0;
      continue;
    }

    const lines = block.content.split('\n');

    const applySpaceAdvance = (fontStack) => {
      ctx.font = `${S.fontSize}px ${fontStack}`;
      const spaceW = ctx.measureText(' ').width + S.wordSpacing;
      if (x + spaceW < activeZone.x + activeZone.width) {
        x += spaceW;
        currentPageText += ' ';
      }
    };

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      if (lineIdx > 0) {
        advanceLineOrZone();
        currentPageText += '\n';
      }

      const lineText = lines[lineIdx];
      if (!lineText) continue;

      const segments = getStyledLineSegments(lineText);
      for (let si = 0; si < segments.length; si++) {
        const segment = segments[si];
        if (!segment.text) continue;

        const penProfile = getPenProfileForSegment(segment);
        const penPressure = penProfile.pressure !== null ? penProfile.pressure : S.pressure;
        const penRotation = S.rotationMax * penProfile.rotationScale;
        const inkColor = penProfile.inkColor || S.inkColor;
        const tokens = tokenizeWithSpaces(segment.text);

        for (let ti = 0; ti < tokens.length; ti++) {
          const token = tokens[ti];
          if (token.type === 'space') {
            const previewIsIndic = ScriptDetector.isIndicScript(segment.text);
            applySpaceAdvance(fontSwitcher.getFontStack(previewIsIndic, S.font));
            continue;
          }

          const lineWord = token.text;
          if (!lineWord) continue;

          const scriptRuns = fontSwitcher.getTokenScriptRuns(lineWord, S.hinglishAutoSwitch, getGraphemes);
          let wordWidth = S.wordSpacing;
          scriptRuns.forEach(run => {
            const runFontStack = fontSwitcher.getFontStack(run.isIndic, S.font);
            ctx.font = `${S.fontSize}px ${runFontStack}`;
            wordWidth += ctx.measureText(run.text).width;
          });

          if (x + wordWidth > activeZone.x + activeZone.width && x > activeZone.x) {
            advanceLineOrZone();
          }

          scriptRuns.forEach(run => {
            const fontStack = fontSwitcher.getFontStack(run.isIndic, S.font);
            if (run.isIndic) {
              const estimatedLineLength = 100;
              const lineLength = Math.max(1, estimatedLineLength);
              variationContext.updateForCharacter(lineCharIndex, lineLength, lineCharIndex === 0, lineCharIndex === lineLength - 1);
              const v = getCharVariationWithContext(run.isIndic ? penRotation * 0.3 : penRotation, penPressure, S.fontSize, variationContext);
              const wobble = Math.sin(lineCharIndex * 0.04) * 0.4 * (S.fontSize / 22);
              const alignOffset = getAlignmentOffset(S.textAlignment, S.fontSize, S.lineHeight);
              const cy = y + (v.baselineOff * 0.4) + wobble + alignOffset;

              queue.push({
                ch: run.text, x, y: cy, v, pageIdx, isIndic: true, fontStack, inkColor, penKey: penProfile.key
              });

              ctx.font = `${S.fontSize}px ${fontStack}`;
              x += ctx.measureText(run.text).width + v.spacingExtra;
              charIndex += run.text.length;
              lineCharIndex += run.text.length;
              currentPageText += run.text;
              return;
            }

            const graphemes = getGraphemes(run.text);
            for (let ci = 0; ci < graphemes.length; ci++) {
              const ch = graphemes[ci];
              const isWordStart = ci === 0;
              const isWordEnd = ci === graphemes.length - 1;
              const estimatedLineLength = 100;
              variationContext.updateForCharacter(lineCharIndex, estimatedLineLength, isWordStart, isWordEnd);

              const v = getCharVariationWithContext(run.isIndic ? penRotation * 0.3 : penRotation, penPressure, S.fontSize, variationContext);
              ctx.font = `${S.fontSize}px ${fontStack}`;
              const charWidth = ctx.measureText(ch).width + v.spacingExtra;

              if (x + charWidth > activeZone.x + activeZone.width && x > activeZone.x) {
                advanceLineOrZone();
              }

              const wobble = Math.sin(lineCharIndex * 0.04) * 0.8 * (S.fontSize / 22);
              const alignOffset = getAlignmentOffset(S.textAlignment, S.fontSize, S.lineHeight);
              const cy = y + v.baselineOff + wobble + alignOffset;

              queue.push({
                ch, x, y: cy, v, pageIdx, isIndic: false, fontStack, inkColor, penKey: penProfile.key
              });

              x += ctx.measureText(ch).width + v.spacingExtra;
              charIndex++;
              lineCharIndex++;
              currentPageText += ch;
            }
          });
        }
      }
    }
  }

  pageTexts.push(currentPageText);
  return { queue, pageTexts, pageCount: pageIdx + 1 };
}
