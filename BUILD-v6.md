# BUILD-v6 notes — Porto Alba "Neon Tide"

## What was built (Phase 1, fresh — no line copied from entry v2)

A complete original open-world crime game in `game/`, three.js 0.160.0
vendored as `game/vendor/three.min.js` (MIT, 670,681 bytes, fetched from
jsDelivr — the kit starter ships no three.js copy).

- `game/src/config.js` — constants, dusk palette, 4 missions, shot seed 91.
- `game/src/util.js` — mulberry32 seeded RNG, clamp/lerp, 2D helpers.
- `game/src/city.js` — 40-unit road grid (x=0 IS a street), towers with
  instanced lit windows (warm orange + cool blue), marina/promenade,
  Marisol Pier with gold lamps, Café Alba + orange awning, LOW warehouse
  (8 high, door + sign on the south face), palms, neon signs, 9 clouds.
- `game/src/cars.js` — teal player car, 14 traffic cars, 10 kerb-parked
  steal targets, police interceptors with flashing red/blue light bars.
  Steal takes the NEAREST parked car only — never the teal car.
- `game/src/people.js` — 24 pedestrians on pavements, step clear of cars.
- `game/src/wanted.js` — stars 0–5 from heat + decay, 1 interceptor per
  star, helicopter + searchlight cone at 4–5 stars, striped roadblocks.
- `game/src/combat.js` — pistol raycast, rivals with health bars who
  shoot back, reload (R), $120 per rival dropped.
- `game/src/story.js` — 4 missions, briefings, gold beacon (top y=22,
  clears the warehouse roofline), final mission forces 5 stars.
- `game/src/hud.js` — health/HP, stars, speed, money, ammo, objective
  chip naming a place + landmark hint, circular minimap with DOWNTOWN /
  PORT / BEACH labels, clock (starts 17:45), "WAVE n — Neon Tide", slim
  top banner (never covers the scene).
- `game/src/boot.js` — renderer, gradient dusk sky dome + low sun glow,
  chase / third-person camera with mouse orbit, start + pause screens
  (pause freezes the world), save/load wiring, wasted/respawn.
- `game/src/shots.js` — 4 staged shots, `window.__shotReady` when settled.
- `game/src/input.js` — keys + mouse as specified.
- `game/src/audio.js` — WebAudio synth: engine hum, two-tone siren,
  gunshot, blips. No audio files.
- `game/src/save.js` — localStorage save/load (mission, money, health,
  ammo, heat, position).
- `game/index.html` — import map (`three` → `./vendor/three.min.js`),
  HUD DOM, dusk CSS.
- `main.ts` / `serve.ts` (port 8123) / `shots.json` (4 shots, seed 91).

## Checks

- `node --check` on every `game/src/*.js`: 0 errors (see below).
- Line counts (actual, `wc -l`): config 136, util 70, city 350, cars 279,
  people 96, wanted 160, combat 174, story 114, hud 127, boot 451,
  shots 98, input 94, audio 124, save 57, index.html 123, main.ts 39,
  serve.ts 76 — 2,568 lines total across counted files.
- `node main.ts` run: see Phase-1 report (screenshots are Phase 2's
  job — `screenshots/` is empty until then).

## Numbers

- Map 400×400, road step 40, ~100 building blocks, ~3,000 instanced
  lit windows, 14 traffic + 10 parked + up to 5 police cars, 24 peds,
  9 clouds.
- Missions pay $500 / $750 / $1,200 / $2,500; rivals $120; hospital
  bill $200.
- v5 rank 1,606/6,900, judge 986,657 — v6 closes the gap with the dusk
  "Neon Tide" look, helicopter + roadblocks at high wanted, circular
  minimap with district labels, place-named objectives and slim banners.

## Known Phase-2 work

- Screenshots (4) via the `?shot=` staging — browser work, not done
  in Phase 1.
- Play-test in desktop Chrome: driving feel, steal flow, police chase
  balance, beacon visibility from distance, pause freeze.
- Verify `node main.ts` output + dossier once screenshots exist.
