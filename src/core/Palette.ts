export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 640;

// "Twilight lavender" — eye-soothing pastels on dusky plum.
// Chrome/UI stays soft; impact effects (juice, crits, bombs) stay vivid.
export const Palette = {
  bgTop: 0x221c33,      // dusky plum
  bgBottom: 0x35294d,   // lighter twilight toward the floor
  primary: 0xb8a7e8,    // soft lavender — titles, hero button, default trail
  secondary: 0x9fe3c6,  // gentle mint — UI chrome, timers, barriers
  accent: 0xffcba4,     // warm peach — combos, stars, criticals
  danger: 0xff7a7a,     // softened red (still unmistakably "danger")
  good: 0xa8e6b8,       // calm green
  textDim: 0xa99cc7,    // muted lavender-gray for secondary text
  white: 0xffffff,
} as const;

export const Fonts = {
  display: '"Arial Black", "Segoe UI Black", sans-serif',
  body: 'Verdana, "Segoe UI", sans-serif',
} as const;

export function hex(c: number): string {
  return '#' + c.toString(16).padStart(6, '0');
}
