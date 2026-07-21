import Phaser from 'phaser';
import { Palette, Fonts, hex, GAME_WIDTH, GAME_HEIGHT } from './Palette';
import { Audio } from './AudioManager';

/** Vertical purple gradient with faint drifting glow orbs for depth. */
export function drawBackground(scene: Phaser.Scene) {
  const g = scene.add.graphics();
  g.fillGradientStyle(Palette.bgTop, Palette.bgTop, Palette.bgBottom, Palette.bgBottom, 1);
  g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  for (let i = 0; i < 5; i++) {
    const orb = scene.add.image(
      Phaser.Math.Between(0, GAME_WIDTH),
      Phaser.Math.Between(0, GAME_HEIGHT),
      'glow',
    ).setScale(Phaser.Math.FloatBetween(3, 6))
     .setTint(i % 2 ? Palette.primary : Palette.secondary)
     .setAlpha(0.06);
    scene.tweens.add({
      targets: orb,
      y: orb.y - Phaser.Math.Between(30, 80),
      duration: Phaser.Math.Between(4000, 8000),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
}

export function title(scene: Phaser.Scene, x: number, y: number, text: string, size = 56) {
  const t = scene.add.text(x, y, text, {
    fontFamily: Fonts.display,
    fontSize: `${size}px`,
    color: hex(Palette.white),
    stroke: hex(Palette.primary),
    strokeThickness: 8,
  }).setOrigin(0.5).setShadow(0, 0, hex(Palette.primary), 24, true, true);
  return t;
}

export function label(scene: Phaser.Scene, x: number, y: number, text: string, size = 18, color: number = Palette.textDim) {
  return scene.add.text(x, y, text, {
    fontFamily: Fonts.body,
    fontSize: `${size}px`,
    color: hex(color),
    align: 'center',
  }).setOrigin(0.5);
}

export function neonButton(
  scene: Phaser.Scene, x: number, y: number, text: string, onClick: () => void,
  w = 260, h = 58, color: number = Palette.secondary,
) {
  const c = scene.add.container(x, y);
  const bg = scene.add.rectangle(0, 0, w, h, 0x000000, 0.35)
    .setStrokeStyle(3, color, 1);
  const glowRect = scene.add.rectangle(0, 0, w + 10, h + 10, color, 0.08);
  const t = scene.add.text(0, 0, text, {
    fontFamily: Fonts.display, fontSize: '24px', color: hex(Palette.white),
  }).setOrigin(0.5);
  c.add([glowRect, bg, t]);
  c.setSize(w, h).setInteractive({ useHandCursor: true });

  c.on('pointerover', () => scene.tweens.add({ targets: c, scale: 1.07, duration: 120, ease: 'Back.easeOut' }));
  c.on('pointerout', () => scene.tweens.add({ targets: c, scale: 1, duration: 120, ease: 'Sine.easeOut' }));
  c.on('pointerdown', () => {
    Audio.uiClick();
    scene.tweens.add({
      targets: c, scale: 0.94, duration: 70, yoyo: true, ease: 'Sine.easeInOut',
      onComplete: () => onClick(),
    });
  });
  return c;
}

/** Row of 3 stars, `earned` of them lit; pops them in with a stagger. */
export function starRow(scene: Phaser.Scene, x: number, y: number, earned: number, size = 30, animate = false) {
  const c = scene.add.container(x, y);
  for (let i = 0; i < 3; i++) {
    const lit = i < earned;
    const s = scene.add.star(
      (i - 1) * (size + 14), 0, 5, size * 0.38, size * 0.75,
      lit ? Palette.accent : 0x3a2a5e,
    );
    if (lit) s.setStrokeStyle(2, 0xfff7cc, 0.9);
    c.add(s);
    if (animate && lit) {
      s.setScale(0);
      scene.tweens.add({
        targets: s, scale: 1, delay: 300 + i * 220, duration: 320, ease: 'Back.easeOut',
        onStart: () => Audio.tick(),
      });
    }
  }
  return c;
}

/** Animates a score readout counting up to `to`. */
export function tickScore(scene: Phaser.Scene, textObj: Phaser.GameObjects.Text, to: number, prefix = '') {
  const proxy = { v: 0 };
  scene.tweens.add({
    targets: proxy, v: to, duration: 700, ease: 'Cubic.easeOut',
    onUpdate: () => textObj.setText(`${prefix}${Math.round(proxy.v)}`),
  });
}

/** Full-screen fade transition into another scene. */
export function goTo(scene: Phaser.Scene, key: string, data?: object) {
  scene.cameras.main.fadeOut(220, 18, 8, 31);
  scene.cameras.main.once('camerafadeoutcomplete', () => scene.scene.start(key, data));
}
