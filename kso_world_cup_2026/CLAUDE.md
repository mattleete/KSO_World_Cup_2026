# KSO World Cup 2026 — Project Context

## What this is
A fantasy World Cup tracker and live draft tool. Groups of friends each do a snake draft of the 48 World Cup teams, then earn points based on how their teams perform in the 2026 FIFA World Cup. Supports multiple independent groups. Live at: https://mattleete.github.io/KSO_World_Cup_2026/

## Tech stack
- React 19 + Vite 8
- Tailwind CSS v4 (via `@tailwindcss/vite` — requires `@import "tailwindcss"` as first line in `src/index.css`)
- Supabase (Auth, Postgres, Realtime)
- @dnd-kit/core + @dnd-kit/sortable (drag-and-drop for preferences)
- Deployed to GitHub Pages via `npm run deploy` (uses `gh-pages` package)
- `vite.config.js` has `base: '/KSO_World_Cup_2026/'` for GitHub Pages
- Font: Instrument Sans (Google Fonts, variable font, `font-variation-settings: "'wdth' 100"`)

## Key commands
```
npm run dev      # local dev server
npm run build    # production build
npm run deploy   # build + push to gh-pages branch
```

## Environment variables (.env — never commit)
```
VITE_WORLDCUP_API_KEY=...     # WC2026 API bearer token
VITE_SUPABASE_URL=...         # Supabase project URL
VITE_SUPABASE_ANON_KEY=...    # Supabase anon/public key
```

## Project structure
```
src/
  components/
    Nav.jsx           # sticky top nav — logo + 5 tabs + sign out
    Landing.jsx       # countdown hero to June 11 2026
    PlayerBoard.jsx   # leaderboard — player cards sorted by points
    Fixtures.jsx      # match schedule + results from WC2026 API
    Teams.jsx         # all 48 teams as tiles, sorted by FIFA rank
    Rules.jsx         # static scoring rules page
    Login.jsx         # magic link email login form
    GroupFlow.jsx     # create group / join group / pick group flow
    Draft.jsx         # live draft room — waiting room + draft board
    Preferences.jsx   # drag-and-drop team preference ranking list
  data/
    players.js        # 19 KSO players + placeholder drafted team IDs (legacy)
    teams.js          # 48 WC2026 teams with tier, flag, FIFA rank, apiName
    dummyResults.js   # test match results (not used in production)
  utils/
    api.js            # fetchFixtures() + fetchResults() — calls WC2026 API
    scoring.js        # calcMatchPoints / calcTeamPoints / calcPlayerPoints
  lib/
    supabase.js       # Supabase client singleton
```

## Supabase database schema

### `groups`
| Column | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| name | text | group display name |
| invite_code | text | unique short code (e.g. WOLF-42) |
| commissioner_id | uuid | references auth.users(id) |
| created_at | timestamptz | |

### `group_members`
| Column | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| group_id | uuid | references groups(id) |
| user_id | uuid | references auth.users(id) |
| display_name | text | player's name within this group |
| joined_at | timestamptz | |
Unique constraints: `(group_id, user_id)`, `(group_id, display_name)`

### `draft_session`
| Column | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| group_id | uuid | unique — one draft per group |
| status | text | 'waiting' \| 'active' \| 'paused' \| 'complete' |
| current_pick_number | integer | which pick we're on |
| created_at | timestamptz | |

### `draft_order`
| Column | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| draft_session_id | uuid | references draft_session(id) |
| pick_number | integer | position in the snake draft |
| group_member_id | uuid | who picks at this position |
Unique: `(draft_session_id, pick_number)`

### `draft_picks`
| Column | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| draft_session_id | uuid | references draft_session(id) |
| pick_number | integer | |
| group_member_id | uuid | who made this pick |
| team_id | integer | references teams.js id |
| picked_at | timestamptz | |
Unique: `(draft_session_id, pick_number)`, `(draft_session_id, team_id)`

### `draft_preferences`
| Column | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| group_member_id | uuid | references group_members(id) |
| team_id | integer | |
| rank | integer | 1 = most preferred |
Unique: `(group_member_id, team_id)`, `(group_member_id, rank)`

## Supabase Postgres functions (security definer)
- `make_pick(p_draft_session_id, p_team_id)` — validates turn, inserts pick, advances pick number
- `commissioner_pick(p_draft_session_id, p_team_id)` — same but commissioner picks on behalf of current player
- `undo_pick(p_draft_session_id)` — deletes last pick, rewinds pick number
- `auto_draft(p_draft_session_id)` — picks current player's highest-ranked available team from their preferences (falls back to FIFA rank order)

## Auth flow
1. User clicks Draft tab → sees Login component
2. Enters email → Supabase sends magic link via Resend SMTP
3. Clicks link → redirected back to app, session established, navigates to Draft tab
4. GroupFlow checks if user has group memberships:
   - None → Create group or Join group (enter invite code)
   - One → goes straight to draft room
   - Multiple → shows group picker
5. Sign out button in Nav clears session

## Realtime subscriptions (in Draft.jsx)
- `draft_session` UPDATE → updates current pick number and status live
- `draft_picks` INSERT → adds new pick to board live across all clients

## WC2026 API
- Base URL: `https://api.wc2026api.com`
- Auth header: `Authorization: Bearer <VITE_WORLDCUP_API_KEY>`
- Main endpoint: `GET /matches`
- Match shape: `{ home_team, away_team, kickoff_utc, home_score, away_score, round, group_name, status }`
- `fetchResults()` filters for completed matches (both scores non-null)
- `fetchFixtures()` returns all matches sorted by `kickoff_utc`

## Team name mismatches (API → canonical)
Handled via `apiName` field in `teams.js` and `normalizeTeamName()` in `api.js`.
| API name | Our name |
|---|---|
| IR Iran | Iran |
| Korea Republic | South Korea |
| Czechia | Czech Republic |
| Côte d'Ivoire | Ivory Coast |
| Congo DR | DR Congo |
| Cabo Verde | Cape Verde |
| Bosnia-Herzegovina | Bosnia & Herzegovina |

Algeria (id: 47) and Curaçao (id: 48) appear in the API but are not drafted in any KSO group.

## Scoring rules
- Win: 2 pts | Draw: 1 pt | Loss: 0 pts
- Bonus: +1 pt if winning margin ≥ 2 goals
- Multiplier applied to (base + bonus):
  - Top 16 teams (FIFA rank 1–16): ×1
  - Mid 16 teams (FIFA rank 17–32): ×2
  - Bottom 16 teams (FIFA rank 33–48): ×3
- Formula: `(base + bonus) × multiplier`

## Design
- Figma file: https://www.figma.com/design/4HwN8rLXnbfd9loCUf0php/KSO-world-cup-2026
- Design language: Instrument Sans, minimal, white `#ffffff` background, `#e9e9e9` cards, `#f7f7f7` nav
- All times displayed in AEST (Australia/Sydney)
- Nav has no active-state tab on landing page

## Important notes
- `@import "tailwindcss"` MUST be the first line in `src/index.css` — removing it silently breaks all Tailwind utilities
- Supabase anon key is safe to expose in frontend — Row Level Security enforces all access rules
- The `players.js` data (hardcoded team assignments) is legacy — real team ownership now comes from `draft_picks` in Supabase
- Tournament starts 11 June 2026 AEST
- Realtime DELETE events on `draft_picks` are unreliable when filtered by non-primary-key columns — undo_pick refetches picks directly instead
