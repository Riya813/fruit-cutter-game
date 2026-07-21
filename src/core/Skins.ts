import { Save } from './SaveManager';

/** Blade skins unlocked by total stars. The trail is the reward surface. */
export interface BladeSkin {
  id: string;
  name: string;
  req: number;          // total stars required
  core: number;         // inner stroke color
  glow: number;         // outer glow color
  rainbow?: boolean;    // hue-cycling override
}

export const SKINS: BladeSkin[] = [
  { id: 'neon',     name: 'Neon Pink',   req: 0,  core: 0xffffff, glow: 0xff2e97 },
  { id: 'plasma',   name: 'Plasma Cyan', req: 10, core: 0xffffff, glow: 0x2ee6ff },
  { id: 'solar',    name: 'Solar Gold',  req: 20, core: 0xfff7cc, glow: 0xffe14d },
  { id: 'spectrum', name: 'Spectrum',    req: 30, core: 0xffffff, glow: 0xff2e97, rainbow: true },
];

export function unlockedSkins(): BladeSkin[] {
  const stars = Save.totalStars();
  return SKINS.filter(s => stars >= s.req);
}

export function currentSkin(): BladeSkin {
  const unlocked = unlockedSkins();
  return unlocked.find(s => s.id === Save.blade) ?? unlocked[0];
}

/** Trail colors for this frame; Spectrum cycles hue over time. */
export function trailColors(timeNow: number): { core: number; glow: number } {
  const skin = currentSkin();
  if (!skin.rainbow) return { core: skin.core, glow: skin.glow };
  const hue = (timeNow / 12) % 360;
  const c = PhaserHSV(hue / 360);
  return { core: 0xffffff, glow: c };
}

// Minimal HSV→RGB (s=1, v=1) without importing Phaser here.
function PhaserHSV(h: number): number {
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
