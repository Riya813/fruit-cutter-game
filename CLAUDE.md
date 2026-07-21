# Neon Fruit Cutter — Project Context & Prompt History

This file is the memory of how this game was built. If you are an AI assistant
(Claude Code reads this automatically) or a future maintainer asked to enhance
the game, read this first: it records the original brief, every change request,
the reasoning behind decisions, and where the tuning knobs live.

## What this game is

A browser fruit-slicing arcade game: TypeScript + Vite + Phaser 3.90, all art
and audio generated at runtime (no asset files). Dark purple neon aesthetic.
10-level campaign + Endless mode + seeded Daily Challenge. Deployed via
GitHub Pages (workflow in `.github/workflows/deploy.yml`).

## Prompt history (chronological)

Each entry paraphrases the request that drove a change, plus what was built.

1. **Original brief** — "Build a complete, playable browser game from scratch:
   Neon Fruit Cutter." Required: TS + Vite + Phaser 3; scene flow
   Boot → Menu → LevelSelect → Game → Pause → GameOver → Victory; 60 FPS;
   programmatic assets; juice (tweens, shake, particles, combo popups);
   exactly 10 levels with lock/stars/best scores in localStorage; tutorial
   overlay; HUD; combo system; quick restart under 0.5 s; Web Audio synth
   sounds; README with level table. Earlier design notes: 10 levels,
   small/medium/big fruit sizes, fruit bounces off the ceiling, difficulty
   spread gradually across every level rather than spiking.

2. **"Lower the target for initial levels and increase them with each level;
   keep it doable, not frustrating, and competitive."** → Retuned all
   target/par scores. Philosophy: target ≈ 50% of relaxed-play throughput
   (estimated from spawn rate × burst × non-bomb fraction × avg point value),
   PAR = 1.8–2.6× target requiring sustained streaks. Clearing = casual
   competence; 3 stars = mastery.

3. **"Add bombs and obstacles in each level."** → Bombs on every level
   (3% on L1 up to 22% on L10). Added two obstacle tiers: **spike orbs**
   (streak reset + −30, no life) and **rotating laser barriers** (blade is
   clipped where it crosses the beam; fruit pass through). Hazard ladder:
   bomb = lose a life · spike = lose the streak · barrier = lose the slice.

4. **"Add a tutorial gameplay at the start."** → Interactive TutorialScene:
   hands-on steps in a sandbox (no lives/timer/penalties), each advancing
   only when the player performs the action. Auto-runs on first PLAY,
   skippable, replayable from menu. The old level-1 text overlay remains only
   as a fallback for players who skipped it.

5. **"Add all six roadmap features. Also remove Q/E keys. Suggest slicing
   effects."** → Built in one pass:
   - Special fruits: golden (flat 100, tiny/fast, L2+), frozen (two-hit ice,
     flat 40, L3+), rainbow (world slow-mo 45% for 2.5 s, flat 25, L5+).
   - Endless mode (unlocked by clearing L10): difficulty interpolated
     continuously from elapsed time (`endlessTune()` in config/levels.ts),
     barriers come online at 50/120/200 s, storms past 90 s, persistent best.
   - Frenzy orbs: ×5 multiplier spawns an orb; slicing it gives 50/50
     MEGA SLICE (cut everything) or ×2 points for 6 s. Re-arms per streak build.
   - Blade skins by total stars: Neon Pink → Plasma Cyan (10★) →
     Solar Gold (20★) → Spectrum rainbow (30★). Selector on menu.
   - Daily Challenge: fixed 60 s score attack, spawns from mulberry32 RNG
     seeded by UTC date — identical sequence for all players each day.
   - Mobile: multitouch (3 pointers), on-screen ⏸ button, touch-aware hints.
   - **Removed** the Q/E aim + Space keyboard blade entirely: slicing is
     pointer-only by design. Esc/R/M remain as system keys. The tutorial's
     keyboard step was deleted (now 6 steps).

6. **"Deploy multiple games on GitHub."** → Added `vite.config.ts` with
   `base: './'` (relative paths → works at any URL) and a GitHub Actions
   Pages workflow. One repo per game; Pages source set to "GitHub Actions".

## Design decisions worth preserving

- **Manual physics, not Arcade bodies.** `Fruit.step()` integrates gravity +
  wind + spin; slice detection is exact clamped point-to-segment distance.
  Criticals = cut within 30% of radius from center. Don't switch to physics
  bodies without a reason — exact geometry is what makes crits fair.
- **Levels run the full timer** (they don't end at target). This is what
  makes PAR meaningful and lets scores keep building. `timeToTarget` records
  when the target was first crossed (that's the "fastest clear" stat).
- **Stars**: 3★ = beat PAR with zero retries · 2★ = clear, no retries ·
  1★ = clear after retrying. Quick restart (R) counts as a retry.
- **Specials score flat** (their size/speed already encodes risk); normal
  fruit scale by size (small ×2.0, medium ×1.0, big ×0.6).
- **Slow-mo slows the whole world** including the level timer — purely
  cinematic, no hidden nerf.
- **Bombs/spikes/orbs are safe to let fall**; only real fruit count as misses.
- **Daily determinism**: every random draw in the spawn path goes through
  `this.rand` (seeded for daily). If you add spawn-time randomness, use
  `this.rand`, never `Math.random`, or daily runs diverge between players.
- **One texture key can't be regenerated** in Phaser — the rainbow fruit's
  body skips the generic loop for this reason (see TextureFactory).
- **Artifact/chat build quirk**: the single-file HTML build replaces
  `localStorage` with an in-memory shim (chat sandboxes block storage).
  The real Vite build uses localStorage normally.

## Where to tune things

- `src/config/levels.ts` — the entire campaign difficulty table, endless
  curve (`endlessTune`), daily config. Most balance requests end here.
- `src/scenes/GameScene.ts` — scoring constants (COMBO_WINDOW, MISS_PENALTY),
  special spawn rates (`rollSpecial`), frenzy behavior (`hitPower`),
  multiplier formula (`get multiplier`).
- `src/core/Skins.ts` — blade skins and unlock thresholds.
- `src/core/TextureFactory.ts` — all visuals; `src/core/AudioManager.ts` —
  all sounds (Web Audio synth, no files).
- Trail rendering lives in `drawTrail()` in GameScene AND TutorialScene —
  change both, or extract to Skins.ts if adding effect-based skins.

## Backlog (discussed, not yet built)

- Slicing effects, wired into the skin system as a `style` field:
  electric arc (jittered segments), ember trail (falling particles),
  glitch blade (cyan/magenta offset rects) — plus a global "katana flash"
  crescent on every cut, and a critical shockwave ring.
- Balance pass from real playtesting (targets were set analytically).
- Portfolio arcade page on s1rishabh.github.io linking all deployed games.

## Maintenance protocol for this file

When a future session changes the game, append a numbered entry to the
prompt history above (request → what was built → why), and update the
decisions/tuning sections if they changed. This file only stays useful
if it stays current.
