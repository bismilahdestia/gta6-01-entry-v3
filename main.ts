// Porto Alba — "Neon Tide" (gta6-01 entry v6, Node 22, stdlib only).
// The program hands the game in: it copies this repo's game/ and
// screenshots/ into /output (or MAKEFUN_OUTPUT_DIR outside the
// grader) and writes /output/dossier.json with the kit's vendored
// make.fun library, exactly as the kit's starter does. It runs
// twice in the grader and must write the same bytes both times,
// so it does nothing time-dependent and no network calls.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps (reference/gate.json): only text_max_bytes
// shapes the bytes; the others refuse an entry the scorer would
// refuse (more than 4 screenshots or one over 256 KiB; more than
// 993 files in game/ or 48 MiB of game files, in all, or a path
// under game/ over 1000 bytes). The dossier must be byte-identical
// across the grader's two runs, so nothing here depends on time,
// randomness or the network.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
