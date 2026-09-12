import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { hashString, mulberry32, createPRNG, getCharVariationWithContext, CharacterVariationContext } =
  require('./contextual-jitter-engine.js');

describe('hashString (FNV-1a)', () => {
  it('returns the FNV-1a offset basis for empty input', () => {
    expect(hashString('')).toBe(0x811c9dc5);
  });

  it('computes the known FNV-1a vector for "a"', () => {
    expect(hashString('a')).toBe(0xe40c292c);
  });

  it('is deterministic and input-sensitive', () => {
    expect(hashString('hello')).toBe(hashString('hello'));
    expect(hashString('hello')).not.toBe(hashString('hellp'));
  });
});

describe('mulberry32 / createPRNG', () => {
  it('produces the same sequence for the same seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = [a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBe(b());
  });

  it('stays within [0,1)', () => {
    const prng = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = prng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('createPRNG pairs with hashString deterministically', () => {
    const p1 = createPRNG(hashString('same note'));
    const p2 = createPRNG(hashString('same note'));
    expect(p1()).toBe(p2());
  });
});

describe('getCharVariationWithContext — seeded realism path', () => {
  const OPTS = (seed) => ({ prng: mulberry32(seed), realism: 0.5 });

  it('is deterministic for the same seed', () => {
    const v1 = getCharVariationWithContext(1, 0.12, 22, null, OPTS(123));
    const v2 = getCharVariationWithContext(1, 0.12, 22, null, OPTS(123));
    expect(v1).toEqual(v2);
  });

  it('differs across seeds', () => {
    const v1 = getCharVariationWithContext(1, 0.12, 22, null, OPTS(1));
    const v2 = getCharVariationWithContext(1, 0.12, 22, null, OPTS(2));
    expect(v1).not.toEqual(v2);
  });

  it('at realism 0: neutral scale, baseline, and opacity', () => {
    const v = getCharVariationWithContext(1, 0.12, 22, null, { prng: mulberry32(9), realism: 0 });
    expect(v.scaleX).toBe(1);
    expect(v.scaleY).toBe(1);
    expect(v.baselineOff).toBe(0);
    expect(v.opacity).toBe(1);
  });

  it('keeps tilt within max(rotMax, 3.5·r) over many samples', () => {
    const prng = mulberry32(11);
    for (let i = 0; i < 500; i++) {
      const v = getCharVariationWithContext(1, 0.12, 22, null, { prng: prng, realism: 0.5 });
      expect(Math.abs(v.tiltDeg)).toBeLessThanOrEqual(1.75 + 1e-9);
    }
  });

  it('applies Devanagari multipliers (0.3 rot / 0.4 scale)', () => {
    const prng = mulberry32(13);
    const r = 1;
    const maxTilt = Math.max(1, 3.5 * r) * 0.3;
    for (let i = 0; i < 300; i++) {
      const v = getCharVariationWithContext(1, 0.12, 22, null, { prng: prng, realism: r, isIndic: true });
      expect(Math.abs(v.tiltDeg)).toBeLessThanOrEqual(maxTilt + 1e-9);
      expect(Math.abs(v.scaleY - 1)).toBeLessThanOrEqual(0.075 * 0.4 + 1e-9);
    }
  });

  it('still applies position-context scaling in the seeded path', () => {
    const ctxObj = new CharacterVariationContext();
    ctxObj.updateForCharacter(0, 10, true, false); // line start → pressureScale 1.2
    const v = getCharVariationWithContext(1, 0, 22, ctxObj, { prng: mulberry32(21), realism: 0.5 });
    const vPlain = getCharVariationWithContext(1, 0, 22, null, { prng: mulberry32(21), realism: 0.5 });
    expect(v.pressureMod).toBeCloseTo(vPlain.pressureMod * 1.2, 10);
  });

  it('scales opacity variation with realism', () => {
    const low = getCharVariationWithContext(1, 0, 22, null, { prng: mulberry32(31), realism: 0.1 });
    const high = getCharVariationWithContext(1, 0, 22, null, { prng: mulberry32(31), realism: 1 });
    expect(high.opacity).toBeLessThan(low.opacity);
  });
});

describe('legacy path unchanged (no opts)', () => {
  it('keeps the pre-realism scale bounds', () => {
    for (let i = 0; i < 200; i++) {
      const v = getCharVariationWithContext(1, 0.12, 22, null);
      expect(v.scaleY).toBeGreaterThanOrEqual(0.97);
      expect(v.scaleY).toBeLessThanOrEqual(1.03);
      expect(v.opacity).toBeGreaterThanOrEqual(0.92);
      expect(v.opacity).toBeLessThanOrEqual(1.0);
    }
  });
});
