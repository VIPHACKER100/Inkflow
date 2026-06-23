/**
 * MarkdownParser — Parse markdown structure before stripping symbols
 * 
 * Provides structured data format with:
 * - Text segments with associated Text_Type metadata (heading, body, bullet, emphasis)
 * - Original character positions for coordinate mapping
 * - Support for nested structures (emphasis within bullets)
 * - Clean display text with markdown symbols stripped
 */

class MarkdownParser {
  constructor() {
    // Text types that can be detected in markdown
    this.TEXT_TYPES = {
      HEADING: 'heading',
      BODY: 'body',
      BULLET: 'bullet',
      EMPHASIS: 'emphasis'
    };
  }

  /**
   * Parse raw markdown text into structured segments
   * @param {string} text - Raw markdown text with symbols
   * @returns {Array} Array of segment objects with: text, type, level, startPos, endPos, originalStartPos, originalEndPos
   */
  parse(text) {
    if (!text || typeof text !== 'string') {
      return [];
    }

    const segments = [];
    const lines = text.split('\n');
    let originalPos = 0;

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      const lineStartPos = originalPos;

      // Parse heading
      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const content = headingMatch[2];
        
        // Extract emphasis from heading content and preserve structure
        const headingSegments = this._parseEmphasisSegments(content, lineStartPos + headingMatch[1].length + 1);
        
        // If no emphasis found, treat whole heading as one segment
        if (headingSegments.length === 0 || (headingSegments.length === 1 && headingSegments[0].type === null)) {
          segments.push({
            text: content,
            type: this.TEXT_TYPES.HEADING,
            level: level,
            startPos: lineStartPos + headingMatch[1].length + 1,
            endPos: lineStartPos + line.length,
            originalStartPos: lineStartPos,
            originalEndPos: lineStartPos + line.length
          });
        } else {
          // Add heading segments with emphasis information
          headingSegments.forEach(seg => {
            if (seg.type === this.TEXT_TYPES.EMPHASIS) {
              segments.push({
                ...seg,
                type: this.TEXT_TYPES.EMPHASIS,
                level: level,
                originalStartPos: lineStartPos,
                originalEndPos: lineStartPos + line.length
              });
            } else if (seg.text && seg.text.trim().length > 0) {
              segments.push({
                ...seg,
                type: this.TEXT_TYPES.HEADING,
                level: level,
                originalStartPos: lineStartPos,
                originalEndPos: lineStartPos + line.length
              });
            }
          });
        }
      } else {
        // Parse bullet point
        const bulletMatch = line.match(/^([-*])\s+(.*)$/);
        if (bulletMatch) {
          const content = bulletMatch[2];
          
          // Extract emphasis from bullet content
          const bulletSegments = this._parseEmphasisSegments(content, lineStartPos + bulletMatch[1].length + 1);
          
          if (bulletSegments.length === 0 || (bulletSegments.length === 1 && bulletSegments[0].type === null)) {
            segments.push({
              text: content,
              type: this.TEXT_TYPES.BULLET,
              startPos: lineStartPos + bulletMatch[1].length + 1,
              endPos: lineStartPos + line.length,
              originalStartPos: lineStartPos,
              originalEndPos: lineStartPos + line.length
            });
          } else {
            bulletSegments.forEach(seg => {
              if (seg.type === this.TEXT_TYPES.EMPHASIS) {
                segments.push({
                  ...seg,
                  type: this.TEXT_TYPES.EMPHASIS,
                  originalStartPos: lineStartPos,
                  originalEndPos: lineStartPos + line.length
                });
              } else if (seg.text && seg.text.trim().length > 0) {
                segments.push({
                  ...seg,
                  type: this.TEXT_TYPES.BULLET,
                  originalStartPos: lineStartPos,
                  originalEndPos: lineStartPos + line.length
                });
              }
            });
          }
        } else {
          // Parse body text (may contain emphasis)
          if (line.trim().length > 0) {
            const bodySegments = this._parseEmphasisSegments(line, lineStartPos);
            
            if (bodySegments.length === 0 || (bodySegments.length === 1 && bodySegments[0].type === null)) {
              segments.push({
                text: line,
                type: this.TEXT_TYPES.BODY,
                startPos: lineStartPos,
                endPos: lineStartPos + line.length,
                originalStartPos: lineStartPos,
                originalEndPos: lineStartPos + line.length
              });
            } else {
              bodySegments.forEach(seg => {
                if (seg.type === this.TEXT_TYPES.EMPHASIS) {
                  segments.push({
                    ...seg,
                    type: this.TEXT_TYPES.EMPHASIS,
                    originalStartPos: lineStartPos,
                    originalEndPos: lineStartPos + line.length
                  });
                } else if (seg.text && seg.text.trim().length > 0) {
                  segments.push({
                    ...seg,
                    type: this.TEXT_TYPES.BODY,
                    originalStartPos: lineStartPos,
                    originalEndPos: lineStartPos + line.length
                  });
                }
              });
            }
          }
        }
      }

      // Update original position for next line (include newline character)
      originalPos += line.length + 1;
    }

    return segments;
  }

  /**
   * Extract emphasis segments from text (handles *, _ markers)
   * @private
   * @param {string} text - Text to parse for emphasis
   * @param {number} basePos - Starting position in original text
   * @returns {Array} Array of segments with emphasis type marked
   */
  _parseEmphasisSegments(text, basePos = 0) {
    const segments = [];
    
    // Pattern matches *text*, _text_, **text**, __text__ with content inside
    // First try double markers, then single markers to avoid confusion
    const patterns = [
      { regex: /\*\*(.+?)\*\*/g, type: 'bold', marker: '**' },
      { regex: /__(.+?)__/g, type: 'bold', marker: '__' },
      { regex: /\*(.+?)\*/g, type: 'italic', marker: '*' },
      { regex: /_(.+?)_/g, type: 'italic', marker: '_' }
    ];
    
    let lastIndex = 0;
    let matches = [];
    
    // Find all emphasis matches across all patterns
    for (const { regex, type, marker } of patterns) {
      let match;
      while ((match = regex.exec(text)) !== null) {
        matches.push({
          index: match.index,
          endIndex: match.index + match[0].length,
          text: match[1],
          type: type,
          marker: marker,
          fullMatch: match[0]
        });
      }
    }
    
    // Sort by index to process in order
    matches.sort((a, b) => a.index - b.index);
    
    // Remove overlapping matches (keep first occurrence)
    const nonOverlapping = [];
    for (const m of matches) {
      const overlaps = nonOverlapping.some(existing => 
        (m.index >= existing.index && m.index < existing.endIndex) ||
        (m.endIndex > existing.index && m.endIndex <= existing.endIndex)
      );
      if (!overlaps) {
        nonOverlapping.push(m);
      }
    }
    
    lastIndex = 0;
    for (const m of nonOverlapping) {
      // Add text before this emphasis if any
      if (m.index > lastIndex) {
        const beforeText = text.substring(lastIndex, m.index);
        segments.push({
          text: beforeText,
          type: null,  // No emphasis
          startPos: basePos + lastIndex,
          endPos: basePos + m.index,
          isEmphasis: false
        });
      }

      // Add emphasis segment
      segments.push({
        text: m.text,
        type: this.TEXT_TYPES.EMPHASIS,
        emphasisType: m.type,
        startPos: basePos + m.index + m.marker.length,
        endPos: basePos + m.endIndex - m.marker.length,
        originalStartPos: basePos + m.index,
        originalEndPos: basePos + m.endIndex,
        isEmphasis: true
      });

      lastIndex = m.endIndex;
    }

    // Add remaining text after last emphasis
    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex);
      segments.push({
        text: remainingText,
        type: null,
        startPos: basePos + lastIndex,
        endPos: basePos + text.length,
        isEmphasis: false
      });
    }

    return segments;
  }

  /**
   * Convert parsed segments back to plain text (stripped of markdown symbols)
   * @param {Array} segments - Parsed segments from parse()
   * @returns {string} Plain text with markdown symbols removed
   */
  prettyPrint(segments) {
    if (!Array.isArray(segments) || segments.length === 0) {
      return '';
    }

    const lines = [];
    let currentLineSegments = [];
    let lastLineOriginalEnd = -1;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];

      // Detect line break (when originalEndPos jumps or we transition segments)
      if (lastLineOriginalEnd !== -1 && segment.originalStartPos > lastLineOriginalEnd) {
        // Reconstruct line from accumulated segments
        lines.push(this._reconstructLine(currentLineSegments));
        currentLineSegments = [];
      }

      currentLineSegments.push(segment);
      lastLineOriginalEnd = segment.originalEndPos;
    }

    // Add final line
    if (currentLineSegments.length > 0) {
      lines.push(this._reconstructLine(currentLineSegments));
    }

    return lines.join('\n');
  }

  /**
   * Reconstruct markdown for segments on a single line
   * @private
   * @param {Array} lineSegments - Segments on one line
   * @returns {string} Reconstructed markdown line
   */
  _reconstructLine(lineSegments) {
    if (lineSegments.length === 0) return '';

    // Get the type from the first meaningful segment
    const firstTypedSegment = lineSegments.find(s => s.type !== null);
    
    let result = '';
    
    if (firstTypedSegment && firstTypedSegment.type === this.TEXT_TYPES.HEADING) {
      const level = firstTypedSegment.level || 1;
      const marker = '#'.repeat(level);
      const content = lineSegments.map(seg => {
        if (seg.type === this.TEXT_TYPES.EMPHASIS) {
          const m = seg.emphasisType === 'bold' ? '**' : '*';
          return `${m}${seg.text}${m}`;
        }
        return seg.text;
      }).join('');
      result = `${marker} ${content}`;
    } else if (firstTypedSegment && firstTypedSegment.type === this.TEXT_TYPES.BULLET) {
      const content = lineSegments.map(seg => {
        if (seg.type === this.TEXT_TYPES.EMPHASIS) {
          const m = seg.emphasisType === 'bold' ? '**' : '*';
          return `${m}${seg.text}${m}`;
        }
        return seg.text;
      }).join('');
      result = `- ${content}`;
    } else {
      // Body text (may contain emphasis)
      result = lineSegments.map(seg => {
        if (seg.type === this.TEXT_TYPES.EMPHASIS) {
          const m = seg.emphasisType === 'bold' ? '**' : '*';
          return `${m}${seg.text}${m}`;
        }
        return seg.text;
      }).join('');
    }

    return result;
  }

  /**
   * Detect if text contains a heading marker at the start
   * @param {string} text - Text to check
   * @returns {boolean|number} false if no heading, or heading level (1-6)
   */
  detectHeading(text) {
    if (!text || typeof text !== 'string') return false;
    const match = text.match(/^(#{1,6})\s/);
    return match ? match[1].length : false;
  }

  /**
   * Detect if text contains a bullet marker
   * @param {string} text - Text to check
   * @returns {boolean} true if line starts with bullet marker
   */
  detectBullet(text) {
    if (!text || typeof text !== 'string') return false;
    return /^[-*]\s/.test(text);
  }

  /**
   * Detect if text contains emphasis markers
   * @param {string} text - Text to check
   * @returns {boolean} true if text contains emphasis markers
   */
  detectEmphasis(text) {
    if (!text || typeof text !== 'string') return false;
    return /(\*{1,2}|_{1,2})[^*_]+?\1/.test(text);
  }

  /**
   * Extract clean display text (markdown symbols removed) from parsed segments
   * @param {Array} segments - Parsed segments from parse()
   * @returns {string} Display text without markdown symbols
   */
  getDisplayText(segments) {
    if (!Array.isArray(segments) || segments.length === 0) {
      return '';
    }

    return segments.map(seg => seg.text).join('');
  }

  /**
   * Merge segments on the same line into a single line segment
   * Useful for rendering where we want line-by-line text
   * @param {Array} segments - Parsed segments
   * @returns {Array} Line segments with all content merged per line
   */
  mergeSegmentsByLine(segments) {
    if (!Array.isArray(segments) || segments.length === 0) {
      return [];
    }

    const lineSegments = [];
    let currentLine = null;

    for (const segment of segments) {
      if (!currentLine || segment.originalStartPos > (currentLine.originalEndPos || 0)) {
        // Start new line
        if (currentLine) {
          lineSegments.push(currentLine);
        }
        currentLine = {
          text: segment.text,
          type: segment.type,
          level: segment.level,
          startPos: segment.startPos,
          endPos: segment.endPos,
          originalStartPos: segment.originalStartPos,
          originalEndPos: segment.originalEndPos,
          segments: [segment]
        };
      } else {
        // Append to current line
        currentLine.text += segment.text;
        currentLine.endPos = segment.endPos;
        currentLine.originalEndPos = segment.originalEndPos;
        currentLine.segments.push(segment);
      }
    }

    // Add final line
    if (currentLine) {
      lineSegments.push(currentLine);
    }

    return lineSegments;
  }
}

// Export for use in Node.js or as global in browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MarkdownParser;
}
