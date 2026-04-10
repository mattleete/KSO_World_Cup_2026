# KSO World Cup 2026 — Project Context

## What this is
A fantasy World Cup tracker for 19 friends ("KSO players"). Each person drafted national teams via a snake draft and earns points based on how their teams perform in the 2026 FIFA World Cup. Live at: https://mattleete.github.io/KSO_World_Cup_2026/

## Tech stack
- React + Vite
- Tailwind CSS v4 (via `@tailwindcss/vite` — requires `@import "tailwindcss"` in `src/index.css`)
- Deployed to GitHub Pages via `npm run deploy` (uses `gh-pages` package)
- `vite.config.js` has `base: '/KSO_World_Cup_2026/'` for GitHub Pages
- Font: Instrument Sans (Google Fonts, variable font, `font-variation-settings: "'wdth' 100"`)

## Key commands
```
npm run dev      # local dev server
npm run build    # production build
npm run deploy   # build + push to gh-pages branch
```

## Project structure
```
src/
  components/
    Nav.jsx          # sticky top nav — logo left, 4 menu items right
    Landing.jsx      # default home screen (countdown to June 11 2026)
    PlayerBoard.jsx  # leaderboard — player cards sorted by points
    Fixtures.jsx     # match schedule + results from API
    Teams.jsx        # all 48 teams as tiles, sorted by FIFA rank
    Rules.jsx        # static scoring rules page
  data/
    players.js       # 19 KSO players + their drafted team IDs
    teams.js         # 48 WC2026 teams with tier, flag, FIFA rank, apiName
  utils/
    api.js           # fetchFixtures() + fetchResults() — calls WC2026 API
    scoring.js       # calcMatchPoints / calcTeamPoints / calcPlayerPoints
```

## Scoring rules
- Win: 2 pts | Draw: 1 pt | Loss: 0 pts
- Bonus: +1 pt if winning margin ≥ 2 goals
- Multiplier applied to (base + bonus):
  - Top 16 teams (FIFA rank 1–16): ×1
  - Mid 16 teams (FIFA rank 17–32): ×2
  - Bottom 16 teams (FIFA rank 33–48): ×3
- Formula: `(base + bonus) × multiplier`

## WC2026 API
- Base URL: `https://api.wc2026api.com`
- Auth header on every request: `Authorization: Bearer wc26_SQ8uWLJifHaBayKs7XtW53`
- Key stored in `.env` as `VITE_WORLDCUP_API_KEY`
- Main endpoint: `GET /matches`
- Match shape: `{ home_team, away_team, kickoff_utc, home_score, away_score, round, group_name, status }`
- `fetchResults()` filters for matches where both scores are non-null
- `fetchFixtures()` returns all matches sorted by `kickoff_utc`

## Team name mismatches (API name → our canonical name)
The API uses different names for some teams. Handled via `apiName` field in `teams.js` and `getTeamByName()` checks both `name` and `apiName`.
| API name | Our name |
|---|---|
| IR Iran | Iran |
| Korea Republic | South Korea |
| Czechia | Czech Republic |
| Côte d'Ivoire | Ivory Coast |
| Congo DR | DR Congo |
| Cabo Verde | Cape Verde |
| Bosnia-Herzegovina | Bosnia & Herzegovina |

Algeria (id: 47) and Curaçao (id: 48) are in the API but undrafted — no KSO player owns them.

## KSO player draft
19 players, 48 teams. Snake draft: first 8 players got 3 teams each, remaining 11 got 2 teams each.

| Player | Teams |
|---|---|
| Matt | Argentina, Ghana, Egypt |
| Hannah | France, Panama, South Africa |
| Sam | Spain, Iraq, Cape Verde |
| Nat | England, Qatar, DR Congo |
| Dave | Brazil, Uzbekistan, Haiti |
| Tamina | Belgium, Saudi Arabia, New Zealand |
| Jack | Portugal, Tunisia, Bosnia & Herzegovina |
| Ange | Netherlands, Ivory Coast, Jordan |
| Pete | Germany, Paraguay |
| Caitlyn | Colombia, Scotland |
| Murray | Croatia, Czech Republic |
| Rina | Morocco, Sweden |
| Charlie | Japan, Norway |
| Dan | USA, Australia |
| Jess | Uruguay, Turkey |
| Adam | Switzerland, Austria |
| Amanda | Mexico, Canada |
| Chris | Senegal, Ecuador |
| Charles | Iran, South Korea |

## Design
- Figma file: https://www.figma.com/design/4HwN8rLXnbfd9loCUf0php/KSO-world-cup-2026
- Design language: Instrument Sans, minimal, white background, `#e9e9e9` cards, `#f7f7f7` nav
- All times displayed in AEST (Australia/Sydney)
- Nav has no active-state tab when on the landing page; clicking the logo returns to landing

## Important notes
- `@import "tailwindcss"` MUST be the first line in `src/index.css` — removing it silently breaks all Tailwind utilities
- Team names in scoring/fixtures use our canonical names (not API names) — `normalizeTeamName()` in `api.js` handles the translation at fetch time
- The tournament starts 11 June 2026 AEST
