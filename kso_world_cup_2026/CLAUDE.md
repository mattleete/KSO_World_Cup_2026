# KSO World Cup 2026 — Project Context

## What this is
A fantasy World Cup tracker and live draft tool. Groups of friends each do a snake draft of the 48 World Cup teams, then earn points based on how their teams perform in the 2026 FIFA World Cup. Supports multiple independent groups. Live at: https://occypicks.com (GitHub Pages + custom domain; DNS via Cloudflare set to "DNS only" / grey cloud so GitHub can issue the TLS cert).

## Tech stack
- React 19 + Vite 8
- Tailwind CSS v4 (via `@tailwindcss/vite` — requires `@import "tailwindcss"` as first line in `src/index.css`)
- Supabase (Auth, Postgres, Realtime)
- @dnd-kit/core + @dnd-kit/sortable (drag-and-drop for preferences)
- Deployed to GitHub Pages via `npm run deploy` (uses `gh-pages` package)
- `vite.config.js` has `base: '/'` (custom domain serves from root); `public/CNAME` (occypicks.com) is baked into every build so the GitHub Pages custom domain survives each deploy
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
    Nav.jsx             # sticky top nav — logo + 4 tabs (logged in) + ⚽ user menu; login CTA only when logged out
    Landing.jsx         # countdown hero to June 11 2026
    PicksAndPoints.jsx  # leaderboard — player cards sorted by points, expandable per-match detail
    Fixtures.jsx        # match schedule + results from WC2026 API (card grid, AEST)
    Rules.jsx           # static scoring rules page
    Login.jsx           # magic link email login modal
    OnboardingModal.jsx # first-login modal — set name + optionally join a league
    AccountModals.jsx   # ModalShell + Edit name / Join league / Create league modals
    MyLeaguesModal.jsx  # list leagues, switch active, copy code, transfer commissioner, manage members, leave/delete
    GroupFlow.jsx       # Draft-tab create league / join league / pick league flow
    Draft.jsx           # live draft room — waiting room + draft board + commissioner controls
    Admin.jsx           # commissioner admin tab — players/picks mgmt, games/scores, reset controls
    AdminModals.jsx     # confirm / rename / edit-pick / score modals for the admin page
    Preferences.jsx     # drag-and-drop team preference ranking list
  data/
    teams.js            # 48 WC2026 teams with tier, flag, FIFA rank, apiName; TIER_CONFIG multipliers
    teamGroups.js       # team name → World Cup group letter (A–L)
    dummyFixtures.js    # dummy fixtures + a full 24-player completed draft for UI testing
    dummyResults.js     # test match results (UI testing only)
    players.js          # legacy hardcoded roster — no longer used for ownership
  utils/
    api.js              # fetchFixtures() + fetchResults() — calls WC2026 API, normalises team names
    results.js          # loadAllResults() — merges API feed with manual match_results (manual wins); SUPERADMIN_EMAIL
    scoring.js          # calcMatchPoints / calcTeamPoints / calcPlayerPoints
    league.js           # shared generateInviteCode + join/create error copy
  lib/
    supabase.js         # Supabase client singleton
```

Note: terminology is **"league"** in all user-facing copy (the DB tables are still named `groups`/`group_members`).

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

### `match_results` (manual scores — global)
| Column | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| team1 / team2 | text | canonical team names (must match `teams.js` `name`) |
| score1 / score2 | integer | |
| stage | text | e.g. "Group A", "Round of 16" |
| played_at | timestamptz | |
| updated_by | uuid | auth.users(id) of the editor |
| updated_at | timestamptz | |
Global, canonical manual results entered from the Admin page. A row **overrides** the live WC2026 API feed for the same match (matched client-side by unordered team pair + stage in `src/utils/results.js`) everywhere points are computed. RLS: everyone may SELECT; **writes only via the superadmin RPCs** below (no insert/update/delete policies). Editing is gated to `matt.c.leete@gmail.com` (the `SUPERADMIN_EMAIL` constant in `src/utils/results.js` and the same literal hardcoded in the SQL functions).

## Supabase Postgres functions (security definer)
All functions are version-controlled in `supabase/functions.sql` (dependency-ordered) — paste the whole file into the Supabase SQL Editor to (re)install everything from scratch.
- `make_pick(p_draft_session_id, p_team_id)` — validates turn, inserts pick, advances pick number
- `commissioner_pick(p_draft_session_id, p_team_id)` — same but commissioner picks on behalf of current player
- `undo_pick(p_draft_session_id)` — deletes last pick, rewinds pick number
- `auto_draft(p_draft_session_id)` — commissioner-only; delegates to `auto_draft_for_session`
- `auto_draft_for_session(p_draft_session_id)` — picks current player's highest-ranked available team from preferences (falls back to lowest available team id 1–48)
- `reset_draft(p_group_id)` — commissioner-only; deletes all picks/order/session for the league (back to waiting room)
- `leave_league(p_group_id)` — leave a league you're in; blocked once a draft_session exists; commissioner must transfer/delete first
- `remove_member(p_group_id, p_member_id)` — commissioner-only; remove a member before the draft starts
- `delete_league(p_group_id)` — commissioner-only; deletes the league and all related rows (session, order, picks, preferences, members)
- `admin_remove_member(p_group_id, p_member_id)` — commissioner-only; **post-draft** member removal (deletes their picks/order/preferences, frees their teams, then the member). Counterpart to the pre-draft-only `remove_member`
- `admin_set_member_name(p_group_id, p_member_id, p_name)` — commissioner-only; rename any player (respects the `(group_id, display_name)` unique constraint)
- `admin_set_pick_team(p_pick_id, p_team_id)` — commissioner-only; reassign a drafted team, **swap-aware** (if another pick holds the team, the two swap; implemented as delete-then-reinsert to avoid the `(draft_session_id, team_id)` unique-constraint hazard)
- `scramble_draft_order(p_group_id)` — commissioner-only; re-rolls the snake order at random; **only before any picks exist** (right after the draft starts)
- `upsert_match_result(p_id, p_team1, p_score1, p_team2, p_score2, p_stage, p_played_at)` — **superadmin-only** (`auth.email() = matt.c.leete@gmail.com`); insert (p_id null) or update a manual score
- `delete_match_result(p_id)` — superadmin-only; drop one manual override
- `reset_all_match_results()` — superadmin-only; wipe all manual scores back to fresh/unplayed (testing)

## Auth flow
1. User clicks the "Log in" CTA in the nav → Login modal
2. Enters email → Supabase sends magic link via Resend SMTP
3. Clicks link → redirected back to app, session established, lands on the Picks & Points tab; first-time users (no display name) see the onboarding modal
4. League context: auto-loads when the user is in exactly one league; the Draft tab's GroupFlow (or the ⚽ menu) handles create/join/pick when there are zero or multiple
5. Sign out from the ⚽ user menu clears session

## Realtime subscriptions (in Draft.jsx)
- `draft_session` INSERT (filtered by group_id, while in the waiting room) → non-commissioners drop into the board live when the draft starts
- `draft_session` UPDATE → updates current pick number, status, and pick deadline live
- `draft_session` DELETE → returns everyone to the waiting room when the commissioner resets
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
- Win: 3 pts | Draw: 1 pt | Loss: 0 pts
- Bonus: +1 pt if winning margin ≥ 2 goals
- Multiplier applied to (base + bonus), by FIFA rank at draft time (4 tiers of 12):
  - Top 12 (rank 1–12): ×1
  - Upper 12 (rank 13–24): ×2
  - Lower 12 (rank 25–36): ×3
  - Bottom 12 (rank 37–48): ×4
- Formula: `(base + bonus) × multiplier`
- Source of truth: `src/data/teams.js` (`TIER_CONFIG`) + `src/utils/scoring.js`; player-facing copy on the Rules page (`src/components/Rules.jsx`)

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
