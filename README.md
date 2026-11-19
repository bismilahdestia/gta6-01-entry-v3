# gta6-01-entry-v3

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/bismilahdestia/gta6-01-entry-v3/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/bismilahdestia/gta6-01-entry-v3/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Porto Alba — Neon Tide is an original open-world crime game in the spirit
of GTA 6, built by an AI agent for make.fun's "Make GTA 6" bounty. You are
Rook, a driver new to the sun-soaked coastal city of Porto Alba: run four
jobs for Marisol — the pier, Café Alba, the Alba Warehouse — and escape the
5-star heat in the final mission. Static files only — no build step, no
network requests. Open `game/index.html` in desktop Chrome and play.

## The game

- **Explore on foot and by car** — a 400×400 dusk city on a road grid,
  with traffic, pedestrians who step clear of cars, and kerb-parked cars
  to steal (E steals the *nearest* parked car — never your own teal car).
- **Wanted 0–5 stars** — heat decays while you stay quiet; one police
  interceptor per star chases you. At 4–5 stars a helicopter with a
  searchlight cone circles overhead and striped roadblocks go up.
- **4 missions + story** with briefings and a tall gold beacon marking
  each objective (the warehouse is deliberately low so the beacon
  clears its roofline from across the city).
- **Pistol combat** — raycast shooting, rival gunmen with health bars
  who shoot back, reload with R. Rivals pay $120 each.
- **HUD** — health bar + HP, stars, speed (km/h), money, ammo,
  objective chip naming a real place, circular minimap with district
  labels (DOWNTOWN / PORT / BEACH), in-game clock and wave label.
- **Start screen, pause (P/F freezes the world), save to localStorage**
  (mission, money, health, position — auto-saved on missions and
  every 20 s, with a Continue button).
- **Sound** — synthesized WebAudio only: engine hum, two-tone siren,
  gunshots, blips. No audio files.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Drive & walk (Shift = run on foot) |
| E | Steal nearest parked car / get out |
| Mouse drag | Orbit camera |
| Click | Shoot (on foot) |
| R | Reload |
| Space | Handbrake |
| P / F | Pause (freezes the world) |

## Run it

```sh
node serve.ts          # game/ on http://127.0.0.1:8123
```

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output dir and
writes `dossier.json` with the kit's vendored `vendor/makefun-game.ts`.

## Tech

- three.js 0.160.0, vendored as `game/vendor/three.min.js` (MIT).
- Seeded world (seed 91) — the city, traffic and screenshots are the
  same every run.
- Screenshots: `shots.json` defines 4 staged shots (`?shot=start|drive|
  chase|mission&seed=91`); each sets `window.__shotReady` when settled.

## License

MIT — see LICENSE. three.js is vendored under its own MIT license
(see the header in `game/vendor/three.min.js`).

---

<sub>Entered on [make.fun](https://make.fun/?ref=ej1cw7nv&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
