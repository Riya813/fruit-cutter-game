import Phaser from 'phaser';

export interface FruitKind {
  key: string;
  color: number;       // glow ring / flash tint
  juice: number;       // splatter particle tint
  points: number;      // base points for a medium slice
  highlight?: number;  // used by the generic orb renderer (specials)
}

// Recognizable fruits, colors tuned to pop on the purple gradient.
export const FRUITS: FruitKind[] = [
  { key: 'fruit-watermelon', color: 0x3ddc84, juice: 0xff4d79, points: 10 },
  { key: 'fruit-orange',     color: 0xff8c2e, juice: 0xffa64d, points: 12 },
  { key: 'fruit-apple',      color: 0xff3355, juice: 0xffe9c9, points: 12 },
  { key: 'fruit-lemon',      color: 0xffe14d, juice: 0xfff3b0, points: 12 },
  { key: 'fruit-kiwi',       color: 0xa8e04a, juice: 0x7ed957, points: 14 },
  { key: 'fruit-dragon',     color: 0xff2e97, juice: 0xf5f5ff, points: 14 },
];

// Special fruits: flat point values (size multiplier is skipped for these).
export const SPECIALS = {
  golden:  { key: 'fruit-golden',  color: 0xffd700, juice: 0xffe680, highlight: 0xfff6c0, points: 100 },
  frozen:  { key: 'fruit-frozen',  color: 0x9adfff, juice: 0xcdefff, highlight: 0xe8f9ff, points: 40 },
  rainbow: { key: 'fruit-rainbow', color: 0xff7ad9, juice: 0xffffff, highlight: 0xffffff, points: 25 },
} as const;

export const BOMB_KEY = 'bomb';
export const POWER_KEY = 'power-orb';
export const SPIKE_KEY = 'spike-orb';
export const PARTICLE_KEY = 'spark';
export const GLOW_KEY = 'glow';

const R = 44;      // base fruit radius at texture scale 1
const C = R + 8;   // texture center
const TEX = C * 2; // texture size

type G = Phaser.GameObjects.Graphics;

function glowRing(g: G, color: number) {
  g.fillStyle(color, 0.18);
  g.fillCircle(C, C, R + 8);
}

/** Flesh base for a cut half: rind arc + inner flesh. side 0 = lower, 1 = upper. */
function halfBase(g: G, side: number, rind: number, flesh: number, fleshInset: number) {
  const a0 = side ? Math.PI : 0, a1 = a0 + Math.PI;
  g.fillStyle(rind, 1);
  g.slice(C, C, R, a0, a1, false); g.fillPath();
  g.fillStyle(flesh, 1);
  g.slice(C, C, R - fleshInset, a0, a1, false); g.fillPath();
}

/** Point on the half at polar (angleFrac of the half-arc, radius). */
function halfPoint(side: number, frac: number, radius: number) {
  const a = (side ? Math.PI : 0) + frac * Math.PI;
  return { x: C + Math.cos(a) * radius, y: C + Math.sin(a) * radius };
}

/** Draws every texture the game needs into the texture manager. */
export function buildTextures(scene: Phaser.Scene) {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const tex = (key: string) => { g.generateTexture(key, TEX, TEX); g.clear(); };

  // ---------------------------------------------------------- real fruits

  // Watermelon: bright green with dark stripes; halves show pink flesh + seeds.
  glowRing(g, 0x3ddc84);
  g.fillStyle(0x3ddc84, 1); g.fillCircle(C, C, R);
  g.fillStyle(0x156a45, 1);
  for (const off of [-28, -14, 0, 14, 28]) {
    const chord = 2 * Math.sqrt(R * R - off * off);
    g.fillEllipse(C + off, C, 9, chord * 0.94);
  }
  g.lineStyle(3, 0x9dffcf, 0.8); g.strokeCircle(C, C, R - 2);
  tex('fruit-watermelon');
  for (const s of [0, 1]) {
    halfBase(g, s, 0x2fbf71, 0xeafff0, 4);
    const a0 = s ? Math.PI : 0;
    g.fillStyle(0xff4d79, 1);
    g.slice(C, C, R - 9, a0, a0 + Math.PI, false); g.fillPath();
    g.fillStyle(0x1c0f2a, 1);
    for (const f of [0.3, 0.5, 0.7]) {
      const p = halfPoint(s, f, R * 0.5);
      g.fillEllipse(p.x, p.y, 5, 8);
    }
    tex(`fruit-watermelon-half${s}`);
  }

  // Orange: dimpled peel, leaf + stem; halves show segment wedges.
  glowRing(g, 0xff8c2e);
  g.fillStyle(0xff8c2e, 1); g.fillCircle(C, C, R);
  g.fillStyle(0xcc6a1c, 1);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.4;
    g.fillCircle(C + Math.cos(a) * R * 0.55, C + Math.sin(a) * R * 0.55, 2.2);
  }
  g.fillStyle(0x7a4a1f, 1); g.fillRect(C - 2, 6, 4, 9);
  g.fillStyle(0x3ddc84, 1); g.fillEllipse(C + 11, 11, 17, 8);
  g.fillStyle(0xffc78a, 0.8); g.fillEllipse(C - R * 0.32, C - R * 0.36, R * 0.42, R * 0.26);
  tex('fruit-orange');
  for (const s of [0, 1]) {
    halfBase(g, s, 0xff8c2e, 0xffb05c, 6);
    g.lineStyle(2, 0xffffff, 0.55);
    for (let k = 1; k <= 5; k++) {
      const p = halfPoint(s, k / 6, R - 8);
      g.lineBetween(C, C, p.x, p.y);
    }
    g.fillStyle(0xffffff, 0.7); g.fillCircle(C, C, 3);
    tex(`fruit-orange-half${s}`);
  }

  // Apple: red with stem + leaf; halves show cream flesh + seeds.
  glowRing(g, 0xff3355);
  g.fillStyle(0xff3355, 1); g.fillCircle(C, C, R);
  g.fillStyle(0x5a3218, 1); g.fillRect(C - 2, 5, 4, 11);
  g.fillStyle(0x3ddc84, 1); g.fillEllipse(C + 12, 12, 18, 9);
  g.fillStyle(0xffb3c1, 0.75); g.fillEllipse(C - R * 0.34, C - R * 0.38, R * 0.44, R * 0.28);
  tex('fruit-apple');
  for (const s of [0, 1]) {
    halfBase(g, s, 0xff3355, 0xffe9c9, 5);
    g.fillStyle(0x5a3218, 1);
    for (const f of [0.42, 0.58]) {
      const p = halfPoint(s, f, R * 0.28);
      g.fillEllipse(p.x, p.y, 4, 7);
    }
    tex(`fruit-apple-half${s}`);
  }

  // Lemon: yellow ellipse with end nubs; halves segmented like the orange.
  glowRing(g, 0xffe14d);
  g.fillStyle(0xffe14d, 1);
  g.fillEllipse(C, C, R * 2, R * 1.56);
  g.fillCircle(C - R + 1, C, 6); g.fillCircle(C + R - 1, C, 6);
  g.fillStyle(0xfff7c9, 0.8); g.fillEllipse(C - R * 0.32, C - R * 0.3, R * 0.44, R * 0.24);
  tex('fruit-lemon');
  for (const s of [0, 1]) {
    halfBase(g, s, 0xffe14d, 0xfff3b0, 6);
    g.lineStyle(2, 0xffffff, 0.6);
    for (let k = 1; k <= 5; k++) {
      const p = halfPoint(s, k / 6, R - 8);
      g.lineBetween(C, C, p.x, p.y);
    }
    tex(`fruit-lemon-half${s}`);
  }

  // Kiwi: fuzzy brown skin; halves show green flesh, white core, seed ring.
  glowRing(g, 0xa8e04a);
  g.fillStyle(0x8a6b3f, 1); g.fillCircle(C, C, R);
  g.lineStyle(1, 0xa5854f, 0.8);
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    g.lineBetween(C + Math.cos(a) * R, C + Math.sin(a) * R, C + Math.cos(a) * (R + 3), C + Math.sin(a) * (R + 3));
  }
  tex('fruit-kiwi');
  for (const s of [0, 1]) {
    halfBase(g, s, 0x8a6b3f, 0x7ed957, 4);
    const core = halfPoint(s, 0.5, R * 0.3);
    g.fillStyle(0xeafff0, 1); g.fillEllipse(core.x, core.y, R * 0.55, R * 0.4);
    g.fillStyle(0x1c0f2a, 1);
    for (let k = 1; k <= 7; k++) {
      const p = halfPoint(s, k / 8, R * 0.58);
      g.fillCircle(p.x, p.y, 1.8);
    }
    tex(`fruit-kiwi-half${s}`);
  }

  // Dragonfruit: hot pink with mint scale tips; halves white flesh, black dots.
  glowRing(g, 0xff2e97);
  g.fillStyle(0x7dffb8, 1);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    const tipX = C + Math.cos(a) * (R + 6), tipY = C + Math.sin(a) * (R + 6);
    const b1 = a - 0.3, b2 = a + 0.3;
    g.fillTriangle(tipX, tipY,
      C + Math.cos(b1) * (R - 6), C + Math.sin(b1) * (R - 6),
      C + Math.cos(b2) * (R - 6), C + Math.sin(b2) * (R - 6));
  }
  g.fillStyle(0xff2e97, 1); g.fillCircle(C, C, R);
  g.fillStyle(0xffa3d1, 0.8); g.fillEllipse(C - R * 0.32, C - R * 0.36, R * 0.44, R * 0.26);
  tex('fruit-dragon');
  for (const s of [0, 1]) {
    halfBase(g, s, 0xff2e97, 0xf5f5ff, 5);
    g.fillStyle(0x1c0f2a, 1);
    for (let k = 0; k < 12; k++) {
      const p = halfPoint(s, 0.12 + (k % 4) * 0.24, R * (0.2 + Math.floor(k / 4) * 0.18));
      g.fillCircle(p.x, p.y, 1.6);
    }
    tex(`fruit-dragon-half${s}`);
  }

  // -------------------------------------------------- special fruit orbs

  // Golden + frozen keep the glossy-orb look (they read as "special").
  for (const f of [SPECIALS.golden, SPECIALS.frozen]) {
    glowRing(g, f.color);
    g.fillStyle(f.color, 1); g.fillCircle(C, C, R);
    g.lineStyle(4, f.highlight, 0.9); g.strokeCircle(C, C, R - 3);
    g.fillStyle(f.highlight, 0.85);
    g.fillEllipse(C - R * 0.35, C - R * 0.4, R * 0.5, R * 0.3);
    tex(f.key);
    for (const s of [0, 1]) {
      halfBase(g, s, f.color, f.highlight, 8);
      tex(`${f.key}-half${s}`);
    }
  }

  // Rainbow: concentric hue rings; halves reuse the ring pattern.
  const hues = [0xff2e97, 0xff8c2e, 0xffe14d, 0x53ff9a, 0x2ee6ff, 0xb44dff];
  g.fillStyle(0xffffff, 0.2); g.fillCircle(C, C, R + 8);
  hues.forEach((h, i) => { g.fillStyle(h, 1); g.fillCircle(C, C, R - i * (R / 6.5)); });
  g.fillStyle(0xffffff, 0.85);
  g.fillEllipse(C - R * 0.35, C - R * 0.4, R * 0.5, R * 0.3);
  tex(SPECIALS.rainbow.key);
  for (const s of [0, 1]) {
    const a0 = s ? Math.PI : 0;
    hues.forEach((h, i) => {
      g.fillStyle(h, 1);
      g.slice(C, C, R - i * (R / 6.5), a0, a0 + Math.PI, false); g.fillPath();
    });
    tex(`${SPECIALS.rainbow.key}-half${s}`);
  }

  // Cracked frozen fruit: same ice ball with fracture lines.
  glowRing(g, 0x9adfff);
  g.fillStyle(0x9adfff, 1); g.fillCircle(C, C, R);
  g.lineStyle(4, 0xe8f9ff, 0.9); g.strokeCircle(C, C, R - 3);
  g.lineStyle(3, 0xffffff, 0.95);
  g.lineBetween(C - R * 0.6, C - R * 0.3, C + R * 0.5, C + R * 0.4);
  g.lineBetween(C - R * 0.1, C - R * 0.7, C + R * 0.2, C + R * 0.6);
  g.lineBetween(C - R * 0.4, C + R * 0.5, C + R * 0.1, C - R * 0.1);
  tex('fruit-frozen-cracked');

  // ---------------------------------------------------------- non-fruit

  // Bomb: dark sphere, red glow ring, fuse.
  g.fillStyle(0xff3b3b, 0.22); g.fillCircle(C, C, R + 8);
  g.fillStyle(0x241238, 1);    g.fillCircle(C, C, R);
  g.lineStyle(5, 0xff3b3b, 1); g.strokeCircle(C, C, R - 2);
  g.fillStyle(0xff3b3b, 1);    g.fillCircle(C, 10, 6);
  g.lineStyle(4, 0xff8c8c, 1); g.lineBetween(C, 14, C, C - R + 10);
  tex(BOMB_KEY);

  // Spike orb: steel sphere ringed with triangular spikes.
  const body = R * 0.72;
  g.fillStyle(0xaab4c8, 1);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const b1 = a - 0.22, b2 = a + 0.22;
    g.fillTriangle(
      C + Math.cos(a) * R, C + Math.sin(a) * R,
      C + Math.cos(b1) * body, C + Math.sin(b1) * body,
      C + Math.cos(b2) * body, C + Math.sin(b2) * body,
    );
  }
  g.fillStyle(0x6b7688, 1); g.fillCircle(C, C, body);
  g.lineStyle(4, 0xd7dee9, 0.9); g.strokeCircle(C, C, body - 3);
  g.fillStyle(0xe8eef7, 0.7);
  g.fillEllipse(C - body * 0.3, C - body * 0.35, body * 0.45, body * 0.28);
  tex(SPIKE_KEY);

  // Frenzy power-up orb: white star core in a magenta glow ring.
  g.fillStyle(0xff2e97, 0.25); g.fillCircle(C, C, R + 6);
  g.fillStyle(0x2d1152, 1);    g.fillCircle(C, C, R * 0.8);
  g.lineStyle(4, 0xff2e97, 1); g.strokeCircle(C, C, R * 0.8);
  g.fillStyle(0xffffff, 1);
  const spikes = 5, outer = R * 0.55, inner = R * 0.24;
  g.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const rr = i % 2 === 0 ? outer : inner;
    const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    const px = C + Math.cos(a) * rr, py = C + Math.sin(a) * rr;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.closePath(); g.fillPath();
  tex(POWER_KEY);

  // Small square spark for particle emitters (tinted per-use).
  g.fillStyle(0xffffff, 1); g.fillRect(0, 0, 8, 8);
  g.generateTexture(PARTICLE_KEY, 8, 8); g.clear();

  // Radial glow blob for trail/flashes.
  for (let i = 6; i >= 1; i--) {
    g.fillStyle(0xffffff, 0.10 * (7 - i));
    g.fillCircle(32, 32, i * 5);
  }
  g.generateTexture(GLOW_KEY, 64, 64);

  g.destroy();
}
