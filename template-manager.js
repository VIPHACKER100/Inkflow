/**
 * template-manager.js
 * Advanced Template System for InkFlow (Task 15)
 *
 * Manages parsed JSON templates with defined text zones, guides, and constraints.
 */

class TemplateManager {
  constructor() {
    this.templates = new Map();
    this.registerBuiltInTemplates();
  }

  registerBuiltInTemplates() {
    // 1. Standard (Flowing)
    this.templates.set('standard', {
      id: 'standard',
      name: 'Standard (Flowing)',
      zones: [
        {
          id: 'main',
          name: 'Main Body',
          x: 0,
          y: 0,
          width: '100%',
          height: '100%',
          nextZone: null, // overflow creates a new page with the same active zone
        },
      ],
      guides: [],
      labels: [],
    });

    // 2. Two-Column Grid
    this.templates.set('twocolumn', {
      id: 'twocolumn',
      name: 'Two-Column Grid',
      zones: [
        {
          id: 'col1',
          name: 'Column 1',
          x: 0,
          y: 0,
          width: 'calc(50% - 20px)',
          height: '100%',
          nextZone: 'col2',
        },
        {
          id: 'col2',
          name: 'Column 2',
          x: 'calc(50% + 20px)',
          y: 0,
          width: 'calc(50% - 20px)',
          height: '100%',
          nextZone: null, // overflow creates a new page, restarts at col1
        },
      ],
      guides: [{ type: 'line', x1: '50%', y1: 0, x2: '50%', y2: '100%', color: 'ink', alpha: 0.2 }],
      labels: [],
    });

    // 3. Cornell Study Notes
    this.templates.set('cornell', {
      id: 'cornell',
      name: 'Cornell Study Notes',
      zones: [
        {
          id: 'cues',
          name: 'Cues / Questions',
          x: 0,
          y: 0,
          width: 210,
          height: 'calc(100% - 190px)',
          nextZone: 'notes',
        },
        {
          id: 'notes',
          name: 'Main Notes',
          x: 230,
          y: 0,
          width: 'calc(100% - 230px)',
          height: 'calc(100% - 190px)',
          nextZone: 'summary',
        },
        {
          id: 'summary',
          name: 'Summary',
          x: 0,
          y: 'calc(100% - 170px)',
          width: '100%',
          height: 170,
          nextZone: null,
        },
      ],
      guides: [
        { type: 'line', x1: 220, y1: -20, x2: 220, y2: 'calc(100% - 190px)', color: 'ink', alpha: 0.35 },
        {
          type: 'line',
          x1: -20,
          y1: 'calc(100% - 190px)',
          x2: 'calc(100% + 20px)',
          y2: 'calc(100% - 190px)',
          color: 'ink',
          alpha: 0.35,
        },
      ],
      labels: [
        { text: 'Cues / Questions', x: 0, y: -10, font: 'italic bold 11px sans-serif', color: 'ink', alpha: 0.5 },
        { text: 'Main Notes', x: 230, y: -10, font: 'italic bold 11px sans-serif', color: 'ink', alpha: 0.5 },
        {
          text: 'Summary',
          x: 0,
          y: 'calc(100% - 180px)',
          font: 'italic bold 11px sans-serif',
          color: 'ink',
          alpha: 0.5,
        },
      ],
    });

    // 4. Meeting Notes
    this.templates.set('meeting', {
      id: 'meeting',
      name: 'Meeting Notes',
      zones: [
        {
          id: 'details',
          name: 'Meeting Details',
          x: 0,
          y: 0,
          width: '100%',
          height: 100,
          nextZone: 'agenda',
        },
        {
          id: 'agenda',
          name: 'Agenda & Notes',
          x: 0,
          y: 120,
          width: '65%',
          height: 'calc(100% - 120px)',
          nextZone: 'actions',
        },
        {
          id: 'actions',
          name: 'Action Items',
          x: 'calc(65% + 20px)',
          y: 120,
          width: 'calc(35% - 20px)',
          height: 'calc(100% - 120px)',
          nextZone: null,
        },
      ],
      guides: [
        { type: 'line', x1: -20, y1: 105, x2: 'calc(100% + 20px)', y2: 105, color: 'ink', alpha: 0.35 },
        {
          type: 'line',
          x1: 'calc(65% + 10px)',
          y1: 120,
          x2: 'calc(65% + 10px)',
          y2: '100%',
          color: 'ink',
          alpha: 0.35,
        },
      ],
      labels: [
        {
          text: 'Date / Attendees / Topic',
          x: 0,
          y: -10,
          font: 'italic bold 11px sans-serif',
          color: 'ink',
          alpha: 0.5,
        },
        { text: 'Notes', x: 0, y: 110, font: 'italic bold 11px sans-serif', color: 'ink', alpha: 0.5 },
        {
          text: 'Action Items',
          x: 'calc(65% + 20px)',
          y: 110,
          font: 'italic bold 11px sans-serif',
          color: 'ink',
          alpha: 0.5,
        },
      ],
    });
  }

  getTemplate(id) {
    // Try to load custom template from localStorage if not found in built-ins
    if (!this.templates.has(id)) {
      try {
        const custom = localStorage.getItem('inkflow_template_' + id);
        if (custom) {
          try {
            return JSON.parse(custom);
          } catch (e) {
            console.error('Failed to parse custom template', id);
          }
        }
      } catch (e) {
        /* Safari private mode, storage full, etc. */
      }
      return this.templates.get('standard');
    }
    return this.templates.get(id);
  }

  saveCustomTemplate(template) {
    if (
      !template.id ||
      template.id === 'standard' ||
      template.id === 'twocolumn' ||
      template.id === 'cornell' ||
      template.id === 'meeting'
    ) {
      throw new Error('Cannot overwrite built-in templates. Provide a unique custom ID.');
    }
    try {
      localStorage.setItem('inkflow_template_' + template.id, JSON.stringify(template));
    } catch (e) {
      /* Safari private mode, storage full, etc. */
    }
    this.templates.set(template.id, template);
  }

  getAllTemplates() {
    const list = Array.from(this.templates.values());
    // Also grab custom ones from local storage
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('inkflow_template_')) {
          try {
            const tpl = JSON.parse(localStorage.getItem(key));
            if (!this.templates.has(tpl.id)) {
              list.push(tpl);
              this.templates.set(tpl.id, tpl);
            }
          } catch (e) {}
        }
      }
    } catch (e) {
      /* Safari private mode */
    }
    return list;
  }

  // Parses string dimensions like 'calc(100% - 200px)' or '50%' to pixel values
  resolveDimension(val, maxVal) {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      if (val.endsWith('%')) {
        return (parseFloat(val) / 100) * maxVal;
      }
      if (val.startsWith('calc(')) {
        // Simple eval: supports % and px, + and -
        // E.g. 'calc(100% - 230px)' or 'calc(50% + 20px)'
        const inner = val.substring(5, val.length - 1);
        const parts = inner.split(/([+-])/);
        let result = 0;
        let sign = 1;
        for (let part of parts) {
          part = part.trim();
          if (part === '+') {
            sign = 1;
          } else if (part === '-') {
            sign = -1;
          } else if (part.endsWith('%')) {
            result += sign * (parseFloat(part) / 100) * maxVal;
          } else if (part.endsWith('px')) {
            result += sign * parseFloat(part);
          } else if (!isNaN(parseFloat(part))) {
            result += sign * parseFloat(part);
          }
        }
        return result;
      }
    }
    return 0;
  }

  resolveZone(zone, maxW, maxH, margin) {
    // Zones are relative to the working area (inside margins)
    const innerW = maxW - margin * 2;
    const innerH = maxH - margin * 2;

    return {
      id: zone.id,
      name: zone.name,
      x: margin + this.resolveDimension(zone.x, innerW),
      y: margin + this.resolveDimension(zone.y, innerH),
      width: this.resolveDimension(zone.width, innerW),
      height: this.resolveDimension(zone.height, innerH),
      nextZone: zone.nextZone,
    };
  }

  resolveTemplate(templateId, pageWidth, pageHeight, margin) {
    const template = this.getTemplate(templateId);

    // Resolve all zones to absolute pixel coordinates
    const zones = template.zones.map((z) => this.resolveZone(z, pageWidth, pageHeight, margin));

    // Resolve guides
    const innerW = pageWidth - margin * 2;
    const innerH = pageHeight - margin * 2;

    const guides = (template.guides || []).map((g) => ({
      ...g,
      x1: margin + this.resolveDimension(g.x1, innerW),
      y1: margin + this.resolveDimension(g.y1, innerH),
      x2: margin + this.resolveDimension(g.x2, innerW),
      y2: margin + this.resolveDimension(g.y2, innerH),
    }));

    const labels = (template.labels || []).map((l) => ({
      ...l,
      x: margin + this.resolveDimension(l.x, innerW),
      y: margin + this.resolveDimension(l.y, innerH),
    }));

    return {
      id: template.id,
      name: template.name,
      zones,
      guides,
      labels,
    };
  }
}

// Ensure global singleton
window.templateManager = new TemplateManager();
