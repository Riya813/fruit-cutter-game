# Neon Fruit Cutter

Slice fruit with glowing swipe trails, dodge bombs, and chain combos across 10 escalating levels — ending in the Level 10 **Fruit Storm** boss wave. Built with **TypeScript + Vite + Phaser 3**, all art and audio generated at runtime (no external assets).

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
npm run preview  # serve the production build
```

Target: 60 FPS, responsive canvas (`Scale.FIT`, desktop-first, touch-ready)

## Controls

| Action | Default | Notes |
|---|---|---|
| Slice | Click-drag (mouse) / swipe (touch) | Neon trail follows the pointer; multitouch supported |
| Pause | `Esc` or the on-screen ⏸ | Resume with `Esc` or the button |
| Quick restart | `R` | Instant (<0.5 s), counts as a retry for stars |
| Mute | `M` | Persisted in save data |
| Next level (results screen) | `Enter` | After a win |

**Remapping:** the system keys (Esc/R/M) live in `src/core/InputManager.ts` — change the `keydown-*` names there. Slicing is pointer-only by design; Phaser normalizes touch into pointer events, so mouse and touch share one code path.

## Tutorial

The first time you press PLAY, a guided interactive tutorial runs: seven hands-on steps (slice → critical → streak → bomb → spike orb → laser barrier → keyboard blade) in a sandbox with no lives, timer, or penalties. Each step waits for you to actually do the thing. Skippable at any time (SKIP button or Esc), and replayable from the menu's TUTORIAL button.

## Rules

- **Slice** fruit for points. Through the **center** = **critical** (×2).
- **Streak**: slices within 1.5 s chain; every 4 streak raises the multiplier (max ×5).
- **Multi-cut**: 2+ fruit in one stroke = combo bonus popup.
- **Bombs** (every level) cost 1 of 3 lives. Slicing *near* a bomb flashes a near-miss "CLOSE!".
- **Spike orbs** (level 2+): steel balls — slicing one clangs your streak to 0 and costs 30 points, but no life.
- **Laser barriers** (level 4+): rotating cyan beams that *block your blade* — slices stop where they touch one. Fruit pass through freely.
- **Dropped fruit**: −20 points and streak reset (bombs, spikes, and orbs are safe to drop).

### Special fruits
- **Golden** (level 2+, ~4%): tiny, fast, worth a flat 100 × your multiplier.
- **Frozen** (level 3+, ~6%): armored in ice — the first slice cracks it, the second scores (flat 40).
- **Rainbow** (level 5+, ~3%): slicing it slows the whole world to ~45% speed for 2.5 s.
All specials are always active in Endless and Daily.

### Frenzy orbs
Reaching the ×5 multiplier launches a star orb. Slice it for one of two rewards (50/50): **MEGA SLICE** (every fruit on screen is cut instantly, scored with your current multiplier) or **×2 POINTS for 6 seconds**. One orb per streak build — lose the streak, earn it again.

### Blade skins
Total stars unlock trail skins, selectable from the menu: Neon Pink (default) → Plasma Cyan (10★) → Solar Gold (20★) → Spectrum, a hue-cycling rainbow blade (30★).

### Game modes
- **Campaign**: the 10 levels below.
- **Endless** (unlocks after clearing level 10): no timer, no target — survive as difficulty ramps forever (spawn rate, bombs, speed, wind, barriers, even storms past 90 s). Best score persists.
- **Daily Challenge**: one fixed 60-second score attack. Spawns are seeded by the UTC date, so every player worldwide gets the identical fruit sequence — compare scores fairly. Resets at midnight UTC.
- Fruit **bounces off the ceiling** — nothing escapes upward.
- **Win**: reach the target score before the timer ends. **Lose**: time out under target, or 0 lives.
- **Stars**: ★★★ beat PAR score with no retries · ★★ clear with no retries · ★ clear after retrying.
- Progress (unlocked levels, stars, best score, fastest clear, mute) persists in `localStorage`.

## Level design table

| # | Name | Spawn (ms) | Burst | Bomb % | Spike % | Barriers | Speed | Wind | Time | Target | Par | Size mix S/M/B |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | First Slice | 1500 | 1 | 3 | 0 | 0 | 1.00× | – | 45 s | 150 | 400 | 0/3/7 |
| 2 | Juice Break | 1350 | 1–2 | 5 | 4 | 0 | 1.05× | – | 45 s | 250 | 550 | 1/4/6 |
| 3 | Double Down | 1250 | 1–2 | 7 | 6 | 0 | 1.10× | – | 50 s | 380 | 800 | 1/5/5 |
| 4 | Breeze In | 1150 | 2 | 9 | 7 | 1 | 1.15× | 40 | 50 s | 550 | 1100 | 2/5/4 |
| 5 | Neon Rush | 1050 | 2–3 | 11 | 8 | 1 | 1.22× | 55 | 55 s | 750 | 1450 | 2/5/4 |
| 6 | Bomb Alley | 1000 | 2–3 | 14 | 9 | 1 | 1.28× | 65 | 55 s | 950 | 1800 | 3/5/3 |
| 7 | Small Fry | 950 | 2–4 | 16 | 10 | 2 | 1.35× | 80 | 60 s | 1200 | 2250 | 4/4/3 |
| 8 | Crosswind | 900 | 3–4 | 18 | 11 | 2 | 1.42× | 100 | 60 s | 1500 | 2750 | 4/4/2 |
| 9 | Blade Fever | 850 | 3–5 | 20 | 12 | 2 | 1.50× | 120 | 65 s | 1850 | 3300 | 5/4/2 |
| 10 | **Fruit Storm** | 800 | 3–5 | 22 | 12 | 3 | 1.58× | 140 | 70 s | 2300 | 4000 | 5/3/2 + storm bursts of 12 every ~11 s |

Difficulty is deliberately spread across *every* axis a little per level (spawn rate, bombs, spikes, barriers, speed, wind, size mix) rather than spiking one. Hazard tiers: bomb = lose a life · spike = lose your streak · barrier = lose the slice. Small fruit score ×2, big fruit ×0.6, so later levels trade easy targets for high-value fast ones. Wind flips direction every ~6 s (HUD arrow shows it).

## Source tree

```
index.html
src/
  main.ts                  Phaser config + scene registration
  config/levels.ts         all 10 level definitions (single source of truth)
  core/
    Palette.ts             color system, fonts, canvas size
    TextureFactory.ts      runtime-generated fruit/bomb/particle/glow textures
    InputManager.ts        pointer + touch swipe layer, system keys (Esc/R/M)
    Skins.ts               blade skins unlocked by total stars
    AudioManager.ts        Web Audio synth (slice, crit, combo, bomb, jingles)
    SaveManager.ts         localStorage progress (unlock, stars, bests, mute)
    Ui.ts                  gradient bg, neon buttons, star rows, score ticker
  objects/Fruit.ts         fruit/bomb entity: sizes, ceiling bounce, cut halves
  scenes/
    BootScene.ts → MenuScene.ts → TutorialScene.ts → LevelSelectScene.ts → GameScene.ts
    PauseScene.ts (overlay) · GameOverScene.ts (win + lose results) · VictoryScene.ts
```

## Notes

- Audio starts on the first user gesture (browser autoplay policy); everything is synthesized — no audio files.
- Physics is a tiny manual integrator in `Fruit.step()` (gravity + wind + ceiling/wall bounce) rather than Arcade bodies, which keeps slice geometry exact.
- Mobile: swipe slicing works through pointer events with multitouch (3 pointers); an on-screen ⏸ button covers pause, and menu hints adapt to touch devices.
- Daily determinism: spawn rolls run through a seeded mulberry32 RNG (seed = hash of the UTC date), so the fruit sequence is identical for every player on a given day.
