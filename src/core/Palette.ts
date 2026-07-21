export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 640;

// Cohesive neon-on-dark palette. Everything on screen derives from these.
export const Palette = {
  bgTop: 0x1a0b2e,      // deep violet
  bgBottom: 0x2d1152,   // brighter purple toward the floor
  primary: 0xff2e97,    // hot magenta — titles, slice trail core
  secondary: 0x2ee6ff,  // electric cyan — UI chrome, timers
  accent: 0xffe14d,     // citrus yellow — combos, stars, criticals
  danger: 0xff3b3b,     // bomb red
  good: 0x53ff9a,       // success green
  textDim: 0x9d8fc4,    // muted lavender for secondary text
  white: 0xffffff,
} as const;

export const Fonts = {
  display: '"Arial Black", "Segoe UI Black", sans-serif',
  body: 'Verdana, "Segoe UI", sans-serif',
} as const;

export function hex(c: number): string {
  return '#' + c.toString(16).padStart(6, '0');
}
