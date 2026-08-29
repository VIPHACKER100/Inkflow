import { describe, it, expect, beforeEach } from 'vitest';
import { TemplateManager } from './template-manager.js';

describe('TemplateManager', () => {
  let tm;

  beforeEach(() => {
    tm = new TemplateManager();
  });

  describe('Built-in Templates', () => {
    it('initializes with standard, twocolumn, cornell, and meeting templates', () => {
      const standard = tm.getTemplate('standard');
      expect(standard).toBeDefined();
      expect(standard.id).toBe('standard');
      expect(standard.zones).toHaveLength(1);

      const twocolumn = tm.getTemplate('twocolumn');
      expect(twocolumn).toBeDefined();
      expect(twocolumn.zones).toHaveLength(2);

      const cornell = tm.getTemplate('cornell');
      expect(cornell).toBeDefined();
      expect(cornell.zones).toHaveLength(3);

      const meeting = tm.getTemplate('meeting');
      expect(meeting).toBeDefined();
      expect(meeting.zones).toHaveLength(3);
    });

    it('returns standard template as fallback for unknown template ID', () => {
      const fallback = tm.getTemplate('non_existent_template_xyz');
      expect(fallback).toBeDefined();
      expect(fallback.id).toBe('standard');
    });
  });

  describe('Dimension Resolution (resolveDimension)', () => {
    it('resolves raw numbers directly', () => {
      expect(tm.resolveDimension(150, 1000)).toBe(150);
      expect(tm.resolveDimension(0, 500)).toBe(0);
    });

    it('resolves percentage strings', () => {
      expect(tm.resolveDimension('50%', 800)).toBe(400);
      expect(tm.resolveDimension('100%', 600)).toBe(600);
      expect(tm.resolveDimension('25%', 400)).toBe(100);
    });

    it('resolves pixel strings', () => {
      expect(tm.resolveDimension('180px', 1000)).toBe(180);
      expect(tm.resolveDimension('45.5px', 1000)).toBe(45.5);
    });

    it('resolves calc() expressions with + and -', () => {
      // calc(100% - 200px) with maxVal 1000 -> 1000 - 200 = 800
      expect(tm.resolveDimension('calc(100% - 200px)', 1000)).toBe(800);

      // calc(50% + 20px) with maxVal 1000 -> 500 + 20 = 520
      expect(tm.resolveDimension('calc(50% + 20px)', 1000)).toBe(520);

      // calc(50% - 20px) with maxVal 1000 -> 500 - 20 = 480
      expect(tm.resolveDimension('calc(50% - 20px)', 1000)).toBe(480);
    });

    it('handles invalid or empty dimension strings safely', () => {
      expect(tm.resolveDimension('', 1000)).toBe(0);
      expect(tm.resolveDimension(null, 1000)).toBe(0);
    });
  });

  describe('Zone and Template Resolution', () => {
    it('resolves standard template coordinates within page margins', () => {
      const pageW = 800;
      const pageH = 1000;
      const margin = 40;

      const resolved = tm.resolveTemplate('standard', pageW, pageH, margin);
      expect(resolved.id).toBe('standard');
      expect(resolved.zones).toHaveLength(1);

      const zone = resolved.zones[0];
      expect(zone.id).toBe('main');
      expect(zone.x).toBe(40);
      expect(zone.y).toBe(40);
      expect(zone.width).toBe(pageW - margin * 2); // 720
      expect(zone.height).toBe(pageH - margin * 2); // 920
    });

    it('resolves two-column grid layout coordinates accurately', () => {
      const pageW = 800;
      const pageH = 1000;
      const margin = 40;
      const innerW = pageW - margin * 2; // 720

      const resolved = tm.resolveTemplate('twocolumn', pageW, pageH, margin);
      expect(resolved.zones).toHaveLength(2);

      const [col1, col2] = resolved.zones;
      expect(col1.x).toBe(margin); // 40
      expect(col1.width).toBe(innerW * 0.5 - 20); // 340
      expect(col1.nextZone).toBe('col2');

      expect(col2.x).toBe(margin + (innerW * 0.5 + 20)); // 40 + 380 = 420
      expect(col2.width).toBe(innerW * 0.5 - 20); // 340
      expect(col2.nextZone).toBeNull();
    });

    it('resolves Cornell notes template zones, guides, and labels', () => {
      const pageW = 800;
      const pageH = 1000;
      const margin = 50;

      const resolved = tm.resolveTemplate('cornell', pageW, pageH, margin);
      expect(resolved.zones).toHaveLength(3);
      expect(resolved.guides.length).toBeGreaterThan(0);
      expect(resolved.labels.length).toBeGreaterThan(0);

      const cueZone = resolved.zones.find((z) => z.id === 'cues');
      const notesZone = resolved.zones.find((z) => z.id === 'notes');
      const summaryZone = resolved.zones.find((z) => z.id === 'summary');

      expect(cueZone).toBeDefined();
      expect(notesZone).toBeDefined();
      expect(summaryZone).toBeDefined();

      expect(cueZone.nextZone).toBe('notes');
      expect(notesZone.nextZone).toBe('summary');
    });
  });

  describe('Custom Templates Management', () => {
    it('prevents overwriting built-in templates', () => {
      expect(() => {
        tm.saveCustomTemplate({ id: 'standard', name: 'Custom Standard' });
      }).toThrow(/Cannot overwrite built-in templates/);

      expect(() => {
        tm.saveCustomTemplate({ id: 'cornell', name: 'Custom Cornell' });
      }).toThrow(/Cannot overwrite built-in templates/);
    });

    it('saves and retrieves custom templates successfully', () => {
      const customTpl = {
        id: 'project_brief',
        name: 'Project Brief',
        zones: [
          { id: 'header', name: 'Header', x: 0, y: 0, width: '100%', height: 120, nextZone: 'body' },
          { id: 'body', name: 'Body', x: 0, y: 140, width: '100%', height: 'calc(100% - 140px)', nextZone: null },
        ],
        guides: [],
        labels: [],
      };

      tm.saveCustomTemplate(customTpl);

      const retrieved = tm.getTemplate('project_brief');
      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe('project_brief');
      expect(retrieved.name).toBe('Project Brief');

      const all = tm.getAllTemplates();
      expect(all.some((t) => t.id === 'project_brief')).toBe(true);
    });
  });
});
