import Phaser from 'phaser';

export interface FruitKind {
  key: string;
  color: number;
  highlight: number;
  points: number; // base points for a medium slice
}

// Neon fruit set — colors picked to pop on the purple gradient.
export const FRUITS: FruitKind[] = [
  { key: 'fruit-melon',  color: 0x53ff9a, highlight: 0xb9ffd9, points: 10 },
  { key: 'fruit-berry',  color: 0x2ee6ff, highlight: 0xbdf6ff, points: 12 },
  { key: 'fruit-mango',  color: 0xffe14d, highlight: 0xfff3b0, points: 12 },
  { key: 'fruit-cherry', color: 0xff2e97, highlight: 0xffb0d9, points: 14 },
  { key: 'fruit-plum',   color: 0xb44dff, highlight: 0xe0b8ff, points: 14 },
  { key: 'fruit-orange', color: 0xff8c2e, highlight: 0xffd0a3, points: 12 },
];

// Special fruits: flat point values (size multiplier is skipped for these).
export const SPECIALS = {
  golden:  { key: 'fruit-golden',  color: 0xffd700, highlight: 0xfff6c0, points: 100 },
  frozen:  { key: 'fruit-frozen',  color: 0x9adfff, highlight: 0xe8f9ff, points: 40 },
  rainbow: { key: 'fruit-rainbow', color: 0xff7ad9, highlight: 0xffffff, points: 25 },
} as const;

export const BOMB_KEY = 'bomb';
export const POWER_KEY = 'power-orb';
export const SPIKE_KEY = 'spike-orb';
export const PARTICLE_KEY = 'spark';
export const GLOW_KEY = 'glow';

const R = 44; // base fruit radius at texture scale 1

/** Draws every texture the game needs into the texture manager. */
export function buildTextures(scene: Phaser.Scene) {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  for (const f of [...FRUITS, SPECIALS.golden, SPECIALS.frozen, SPECIALS.rainbow]) {
    g.clear();
    // Soft outer glow ring, body, glossy highlight, dark rind edge.
    g.fillStyle(f.color, 0.18); g.fillCircle(R + 8, R + 8, R + 8);
    g.fillStyle(f.color, 1);    g.fillCircle(R + 8, R + 8, R);
    g.lineStyle(4, f.highlight, 0.9); g.strokeCircle(R + 8, R + 8, R - 3);
    g.fillStyle(f.highlight, 0.85);
    g.fillEllipse(R + 8 - R * 0.35, R + 8 - R * 0.4, R * 0.5, R * 0.3);
    // Rainbow's body is replaced by a ringed version below; keys can't be regenerated.
    if (f.key !== 'fruit-rainbow') g.generateTexture(f.key, (R + 8) * 2, (R + 8) * 2);

    // Two half textures used when the fruit is cut.
    for (const side of [0, 1]) {
      g.clear();
      g.fillStyle(f.color, 1);
      g.slice(R + 8, R + 8, R, Phaser.Math.DegToRad(side ? 180 : 0), Phaser.Math.DegToRad(side ? 360 : 180), false);
      g.fillPath();
      g.fillStyle(f.highlight, 0.55);
      g.slice(R + 8, R + 8, R * 0.72, Phaser.Math.DegToRad(side ? 180 : 0), Phaser.Math.DegToRad(side ? 360 : 180), false);
      g.fillPath();
      g.generateTexture(`${f.key}-half${side}`, (R + 8) * 2, (R + 8) * 2);
    }
  }

  // Bomb: dark sphere, red glow ring, fuse spark drawn as accents.
  g.clear();
  g.fillStyle(0xff3b3b, 0.22); g.fillCircle(R + 8, R + 8, R + 8);
  g.fillStyle(0x241238, 1);    g.fillCircle(R + 8, R + 8, R);
  g.lineStyle(5, 0xff3b3b, 1); g.strokeCircle(R + 8, R + 8, R - 2);
  g.fillStyle(0xff3b3b, 1);
  g.fillCircle(R + 8, 10, 6); // fuse tip
  g.lineStyle(4, 0xff8c8c, 1);
  g.lineBetween(R + 8, 14, R + 8, R + 8 - R + 10);
  g.generateTexture(BOMB_KEY, (R + 8) * 2, (R + 8) * 2);

  // Spike orb: steel sphere ringed with triangular spikes.
  // Visually distinct from bombs (gray metal vs dark-red fuse ball).
  g.clear();
  const cx = R + 8, cy = R + 8, body = R * 0.72;
  g.fillStyle(0xaab4c8, 1);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const tipX = cx + Math.cos(a) * R;
    const tipY = cy + Math.sin(a) * R;
    const b1 = a - 0.22, b2 = a + 0.22;
    g.fillTriangle(
      tipX, tipY,
      cx + Math.cos(b1) * body, cy + Math.sin(b1) * body,
      cx + Math.cos(b2) * body, cy + Math.sin(b2) * body,
    );
  }
  g.fillStyle(0x6b7688, 1); g.fillCircle(cx, cy, body);
  g.lineStyle(4, 0xd7dee9, 0.9); g.strokeCircle(cx, cy, body - 3);
  g.fillStyle(0xe8eef7, 0.7);
  g.fillEllipse(cx - body * 0.3, cy - body * 0.35, body * 0.45, body * 0.28);
  g.generateTexture(SPIKE_KEY, (R + 8) * 2, (R + 8) * 2);

  // Cracked frozen fruit: same ice ball with fracture lines.
  g.clear();
  g.fillStyle(0x9adfff, 0.18); g.fillCircle(R + 8, R + 8, R + 8);
  g.fillStyle(0x9adfff, 1);    g.fillCircle(R + 8, R + 8, R);
  g.lineStyle(4, 0xe8f9ff, 0.9); g.strokeCircle(R + 8, R + 8, R - 3);
  g.lineStyle(3, 0xffffff, 0.95);
  g.lineBetween(R + 8 - R * 0.6, R + 8 - R * 0.3, R + 8 + R * 0.5, R + 8 + R * 0.4);
  g.lineBetween(R + 8 - R * 0.1, R + 8 - R * 0.7, R + 8 + R * 0.2, R + 8 + R * 0.6);
  g.lineBetween(R + 8 - R * 0.4, R + 8 + R * 0.5, R + 8 + R * 0.1, R + 8 - R * 0.1);
  g.generateTexture('fruit-frozen-cracked', (R + 8) * 2, (R + 8) * 2);

  // Rainbow fruit gets concentric hue rings on top of its base body.
  g.clear();
  const hues = [0xff2e97, 0xff8c2e, 0xffe14d, 0x53ff9a, 0x2ee6ff, 0xb44dff];
  g.fillStyle(0xffffff, 0.2); g.fillCircle(R + 8, R + 8, R + 8);
  hues.forEach((h, i) => {
    g.fillStyle(h, 1);
    g.fillCircle(R + 8, R + 8, R - i * (R / 6.5));
  });
  g.fillStyle(0xffffff, 0.85);
  g.fillEllipse(R + 8 - R * 0.35, R + 8 - R * 0.4, R * 0.5, R * 0.3);
  g.generateTexture(SPECIALS.rainbow.key, (R + 8) * 2, (R + 8) * 2);

  // Frenzy power-up orb: white star core in a magenta glow ring.
  g.clear();
  g.fillStyle(0xff2e97, 0.25); g.fillCircle(R + 8, R + 8, R + 6);
  g.fillStyle(0x2d1152, 1);    g.fillCircle(R + 8, R + 8, R * 0.8);
  g.lineStyle(4, 0xff2e97, 1); g.strokeCircle(R + 8, R + 8, R * 0.8);
  g.fillStyle(0xffffff, 1);
  const spikes = 5, outer = R * 0.55, inner = R * 0.24;
  g.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const rr = i % 2 === 0 ? outer : inner;
    const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    const px = R + 8 + Math.cos(a) * rr, py = R + 8 + Math.sin(a) * rr;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.closePath(); g.fillPath();
  g.generateTexture(POWER_KEY, (R + 8) * 2, (R + 8) * 2);

  // Small square spark for particle emitters (tinted per-use).
  g.clear();
  g.fillStyle(0xffffff, 1);
  g.fillRect(0, 0, 8, 8);
  g.generateTexture(PARTICLE_KEY, 8, 8);

  // Radial glow blob for trail/flashes.
  g.clear();
  for (let i = 6; i >= 1; i--) {
    g.fillStyle(0xffffff, 0.10 * (7 - i));
    g.fillCircle(32, 32, i * 5);
  }
  g.generateTexture(GLOW_KEY, 64, 64);

  g.destroy();
}
