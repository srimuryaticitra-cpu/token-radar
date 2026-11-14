# Tortoise Radar — Build the best token launch radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Slow is smooth. Smooth is early. A pre-token launch radar that ranks every
protocol recording no token by what its launch would be worth — priced from
the market's own comps, not from a hardcoded list of names.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <snapshot.json>
```

Node 22.18+ (standard library only, no install). Reads the sealed
DefiLlama snapshot, writes `board.json`, `data.js`, `dashboard/`,
`screenshots/` and `dossier.json` into the output directory. Run it twice:
both runs write the same bytes.

## The model (tortoise-comps-1)

```
implied = TVL × comp × growth × maturity × breadth
```

- **comp** — median mcap/TVL of token-bearing peers in the same category,
  winsorized to 0.02–1.50; categories with fewer than 3 priced peers use the
  whole market's median (0.20 on this snapshot).
- **growth** — `1 + clamp(change_7d, −50%, +100%) × 0.60`.
- **maturity** — `0.70 + 0.30 × min(age_days, 1095) / 1095`; unknown age 0.85.
- **breadth** — `1 + 0.05 × min(chains − 1, 6)`.

The board ranks 198 protocols: the 40-protocol watchlist (TVL ≥ $50M, no
token recorded, not wrapped/staked/bridged) plus 158 early finds below the
floor, by the same rule. Wrapped, staked and bridged products and exchanges
are left out entirely. Token-bearing protocols are kept apart in the
dashboard's "Already trading" panel — they are the comps, not the ranking.

Every row carries a 7-step farm plan, generated from the protocol's own
category, chains, TVL and age, with a cost and a time per step.

## The dashboard

A static page, no network, no framework: sortable board, search + category /
chain / watchlist filters, a detail view for every protocol (model breakdown
with the full formula, plus its farm plan), and the live-token panel.

## Files

- `main.ts` — entrypoint: snapshot in, board + dashboard + dossier out
- `lib/model.ts` — the comps model, the farm-plan generator, the gate checks
- `vendor/makefun-board.ts` — make.fun's dossier library, from the kit
- `dashboard/` — `index.html`, `app.css`, `app.js` (renders `data.js`)
- `screenshots/` — the board, a protocol detail, and a filtered view

---

<sub>Entered on [make.fun](https://make.fun/?ref=mzz4mwfh&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
