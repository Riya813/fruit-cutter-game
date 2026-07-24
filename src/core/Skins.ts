import { Save } from './SaveManager';

export type BladeStyle = 'classic' | 'ember' | 'arc' | 'petal' | 'frost' | 'glitch' | 'shadow' | 'rainbow';

/** Blade skins unlocked by total stars (max 120 across 40 levels). */
export interface BladeSkin {
  id: string;
  name: string;
  req: number;          // total stars required
  core: number;         // inner stroke color
  glow: number;         // outer glow color
  style: BladeStyle;    // how the trail renders (see TrailRenderer)
}

export const SKINS: BladeSkin[] = [
  { id: 'neon',     name: 'Lavender Mist', req: 0,   core: 0xffffff, glow: 0xb8a7e8, style: 'classic' },
  { id: 'plasma',   name: 'Plasma Cyan',   req: 8,   core: 0xffffff, glow: 0x59e6ff, style: 'classic' },
  { id: 'ember',    name: 'Ember Blade',   req: 16,  core: 0xfff1d6, glow: 0xff8c3a, style: 'ember' },
  { id: 'arc',      name: 'Electric Arc',  req: 24,  core: 0xffffff, glow: 0xfff27a, style: 'arc' },
  { id: 'petal',    name: 'Petal Wind',    req: 36,  core: 0xfff0f6, glow: 0xff9ec8, style: 'petal' },
  { id: 'frost',    name: 'Frost Edge',    req: 48,  core: 0xffffff, glow: 0x9fd8ff, style: 'frost' },
  { id: 'solar',    name: 'Solar Gold',    req: 60,  core: 0xfff7cc, glow: 0xffd75e, style: 'classic' },
  { id: 'glitch',   name: 'Glitch Blade',  req: 75,  core: 0xffffff, glow: 0x59f0ff, style: 'glitch' },
  { id: 'shadow',   name: 'Shadow Reaper', req: 90,  core: 0x2a1840, glow: 0x6a44a8, style: 'shadow' },
  { id: 'spectrum', name: 'Spectrum',      req: 105, core: 0xffffff, glow: 0xb8a7e8, style: 'rainbow' },
];

export function unlockedSkins(): BladeSkin[] {
  const stars = Save.totalStars();
  return SKINS.filter(s => stars >= s.req);
}

export function currentSkin(): BladeSkin {
  const unlocked = unlockedSkins();
  return unlocked.find(s => s.id === Save.blade) ?? unlocked[0];
}

/** Hue-cycling color for the Spectrum blade. */
export function hueCycle(timeNow: number): number {
  const h = (timeNow / 12) % 360 / 360;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const q = 1 - f;
  let r = 0, g = 0, b = 0;
  switch (i % 6) {
    case 0: r = 1; g = f; b = 0; break;
    case 1: r = q; g = 1; b = 0; break;
    case 2: r = 0; g = 1; b = f; break;
    case 3: r = 0; g = q; b = 1; break;
    case 4: r = f; g = 0; b = 1; break;
    case 5: r = 1; g = 0; b = q; break;
  }
  return (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255);
}
