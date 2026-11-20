# Porto Alba — Neon Tide

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/bismilahdestia/gta6-01-entry-v3/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/bismilahdestia/gta6-01-entry-v3/reward.svg)](https://make.fun/bounty/gta6-01)

An open-world crime game in the spirit of GTA 6, built for the [Make GTA 6 bounty](https://make.fun/bounty/gta6-01) on make.fun. You are Rook, a driver new to the coastal city of Porto Alba, running jobs for Marisol as the neon tide rolls in at dusk. Explore a 400 × 400 city on foot and by car, steal cars, dodge the police, and work through four story missions — ending in a five-star escape to Marisol Pier.

Everything in this game is original: the city, the characters, the vehicles, the names, the story, the art, and the sound. Nothing is taken from Rockstar Games' Grand Theft Auto series or any other commercial game.

## Play

No build step, no install, no network. Serve the `game/` folder with any static HTTP server and open `game/index.html` in desktop Chrome:

```sh
node serve.ts
# game/ is on http://127.0.0.1:8123
```

Or use any static server of your choice, for example `python3 -m http.server` from inside `game/`. The game loads only files under `game/` (plus `data:` URIs), so it plays fully offline once served. Sound is synthesized with WebAudio — there are no audio files to fetch.

## The city

Porto Alba is a coastal city on a 40-unit road grid, seen at dusk: a deep-purple sky over an orange horizon, neon-lit streets, and the sea along the south edge. The clock starts at 17:45 and runs one game-minute every three real seconds.

- **Districts:** Downtown, Port, and Beach, labelled on the circular minimap.
- **Landmarks:** Marisol Pier at the south promenade, Café Alba under its orange awning, and the low Alba Warehouse on the west side. A tall gold beacon marks each mission destination.
- **Traffic:** 14 moving cars and 10 parked cars on the grid, plus 24 pedestrians walking the streets.
- **Your car:** a teal car that is always yours — it is never a steal target. Top speed is about 150 km/h.

## Missions — Rook and Marisol

Four jobs, each paying cash on completion and opening the next. Finish all four to complete the story.

| # | Mission | Objective | Reward |
|---|---------|-----------|--------|
| 1 | First Light | Meet Marisol at Marisol Pier | $500 |
| 2 | Café Alba | Pick up the package at Café Alba | $750 |
| 3 | Warehouse Run | Deliver the package to Alba Warehouse | $1,200 |
| 4 | Neon Tide | Escape to Marisol Pier — 5 stars! | $2,500 |

You start with $250 and 100 health. Mission briefings appear before each job starts, with a hint pointing at the place to find. The final mission forces a five-star wanted level for the escape run. Once all four jobs are done, Porto Alba is yours in free roam — keep driving, keep the heat down, or don't.

## Controls

Keyboard and mouse, desktop Chrome.

| Key | Action |
|-----|--------|
| W / A / S / D or arrow keys | Walk / drive |
| Shift | Run on foot |
| E | Steal a nearby car / get out of a car |
| Mouse click | Shoot the pistol |
| Mouse drag | Orbit the camera |
| R | Reload |
| Space | Handbrake |
| P or F | Pause |

## Combat

- **Pistol:** 12 rounds in the magazine, 48 in reserve, 34 damage per hit, 70-unit range, 1.2-second reload.
- **Rivals:** armed gunmen spawn around the current mission target and shoot back. Dropping a rival pays cash.
- **Health:** 100 HP. The HUD shows your health bar, ammo, money, speed, the current objective, and the in-game clock.

## Wanted system

Crime adds heat, and heat sets your wanted level from 0 to 5 stars:

- Each crime (stealing a car, firing a shot, dropping a rival) adds 22 heat; one star needs 25 heat, so a single crime nearly earns a star.
- Heat decays by 1.6 per second while you stay quiet. When heat reaches zero, the stars clear.
- Police cars chase you, faster and more numerous as the stars climb.
- At 4 stars and above a police helicopter circles overhead with a visible searchlight cone, and roadblocks go up on the streets ahead.

## HUD and saving

The HUD shows a health bar, wanted stars, speed, money, ammo, the current objective and its hint, a high-contrast circular minimap with district labels, and the in-game clock. Progress saves automatically to the browser after each mission (localStorage, key `porto-alba-save-v6`) and loads when you return.

## Screenshots

Four screenshots, all rendered from the game's own code in a browser from the same seeded world (seed 91):

1. `1-start.jpg` — start screen over the dusk city
2. `2-drive.jpg` — Rook driving the teal car down a neon avenue
3. `3-chase.jpg` — a four-star chase: police, helicopter searchlight, roadblock
4. `4-mission.jpg` — a mission moment at the gold beacon

## How it is built

- **Engine:** three.js r160, vendored as `game/vendor/three.min.js`.
- **Code:** 14 original modules under `game/src/` — `audio`, `boot`, `cars`, `city`, `combat`, `config`, `hud`, `input`, `people`, `save`, `shots`, `story`, `util`, `wanted` — plus `game/index.html`. Central tuning (palette, speeds, damage, wanted heat, mission data) lives in `game/src/config.js` so the dusk look and difficulty stay consistent.
- **Hand-in:** `main.ts` at the repository root copies `game/` and `screenshots/` to `/output` (or `$MAKEFUN_OUTPUT_DIR` outside the grader) and writes `/output/dossier.json` with the kit's vendored `vendor/makefun-game.ts`. It does nothing time-dependent and makes no network calls, so the dossier is byte-identical across runs.
- **License:** MIT — see `LICENSE`.

## Referral

Built for make.fun. Referral code: `ej1cw7nv` — https://make.fun/?ref=ej1cw7nv
