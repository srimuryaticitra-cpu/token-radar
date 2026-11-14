# Build transcript — Tortoise Radar (token-radar-01)

How this entry was built, in the order it happened, by the agent session
that wrote it. The kit's bundle (run at submit time) carries the full
session log; this file is the human-readable record of the same work.

## 1. Read the rules

- `GET https://make.fun/api/competitions` → slug `token-radar-01`,
  $1,325, deadline Mon 14 Dec 2026 17:00 WIB, `entryFeeUsd: null`.
- `GET https://make.fun/api/competitions/token-radar-01/requirements`
  → program/v1, main.ts at repo root, LICENSE, bundle/transcripts,
  max 5 submits/day and 10 total, dossier gate.
- Downloaded the kit: `curl https://make.fun/c/token-radar-01/kit`,
  unpacked to `token-radar-01-kit/`, read `RULES.txt` (399 lines) in full.
- Snapshot: 758 protocols, watchlist 40, floor $50,000,000, as_of
  2026-11-14, source DefiLlama `https://api.llama.fi/protocols`.

## 2. Analysed the snapshot before modelling

- 342 protocols record no token; the rest already trade.
- Per-category median mcap/TVL of token-bearing peers computed
  (e.g. Lending 0.132, Dexs 0.342, RWA 0.275, Liquid Staking 0.041;
  whole-market median 0.205) — these medians became the comps table,
  not hand-picked numbers.
- The house watchlist rule (CEX / Bridge / Liquid Staking / versioned
  names / wrapped-staked words / exchange prefixes) applied to the whole
  snapshot leaves 198 rankable pre-token protocols, and every one of the
  40 watchlist slugs is rankable by it.

## 3. Wrote the code (this session, in this order)

1. `lib/model.ts` — the tortoise-comps-1 model: category comps multiple
   (median mcap/TVL, winsorized 0.02–1.50, fallback market median),
   growth / maturity / breadth multipliers, the rankability rule, the
   7-step farm-plan generator, board + dossier-data builders, the gate
   self-check (`boardIssue`).
2. `main.ts` — entrypoint: snapshot in, board.json + data.js +
   dashboard/ + screenshots/ + dossier.json out, via the kit's
   `vendor/makefun-board.ts` (`buildDossier`).
3. `dashboard/index.html`, `dashboard/app.css`, `dashboard/app.js` —
   dark sonar board, sortable table, search + category / chain /
   watchlist filters, detail view per protocol with the full formula and
   its farm plan, "Already trading" comps panel, method section.
   No network: no http/https address anywhere in the dashboard files.
4. `vendor/makefun-board.ts` — copied from the kit (the required library).
5. `LICENSE` — MIT, first line `SPDX-License-Identifier: MIT`.
6. `.makefun/owner.json` — agent wallet `CX5d…Xo5B` (connected account
   @sri-muryati).
7. `README.md` — run instructions, model, file list.

## 4. Verified

- First run: `MAKEFUN_OUTPUT_DIR=/tmp/radar-out node main.ts` → 198
  rows; gate self-check passed (ranks 1–198, implied values strictly
  non-increasing and all distinct, 7 farm steps of 128–196 chars each,
  watchlist fully covered).
- Screenshots: no browser was installed, so Chrome headless shell
  157.0.8103.78 was downloaded from Chrome for Testing and used to
  capture `1-board.png` (1280×900, 191 KB), `2-detail.png`
  (1280×1250, 264 KB, `?slug=steakhouse-financial`), `3-filtered.png`
  (1280×900, 186 KB, `?watchlist=1`). All three were read back and
  inspected visually.
- Two fixes from the visual check: the header emoji was replaced with
  a plain radar mark, and the "Watchlist only" filter was changed from
  a TVL test (which matched 60 protocols) to the snapshot's actual
  watchlist set (40) — the filtered screenshot now reads
  "40 of 198 protocols".
- Two full runs into separate directories: `diff -r` clean —
  byte-identical, deterministic.
- Dossier: 875,355 bytes (cap 1.5 MiB), text 20,445 bytes (cap 65,536 —
  the whole dashboard source is shown, nothing cut), 3 images.
- Dashboard source total 20,180 bytes; no http/https address in any
  dashboard file.

## 5. Not done here (parent's step)

- No GitHub repo was created and nothing was submitted, per the task.
  The repo + `node cli/makefun.mjs check` + bundle + submit are the
  next steps, on the connected @sri-muryati account.
