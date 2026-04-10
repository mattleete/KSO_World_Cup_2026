# KSO World Cup 2026 — Architecture & Scaling Guide

## What's been built

A full-stack fantasy sports app with live drafting, built in two main layers:

- **Frontend:** React SPA deployed as static files on GitHub Pages
- **Backend:** Supabase (hosted Postgres + Auth + Realtime WebSockets)

---

## System architecture

```
┌─────────────────────────────────────────────────────┐
│                    Browser (React)                   │
│                                                     │
│  Nav → Landing / Leaderboard / Fixtures / Teams /   │
│         Rules / Login / GroupFlow / Draft           │
│                          │                          │
│              src/lib/supabase.js                    │
└──────────────────────────┼──────────────────────────┘
                           │
          ┌────────────────┼─────────────────┐
          │                │                 │
          ▼                ▼                 ▼
   Supabase Auth    Supabase Postgres   Supabase Realtime
   (magic links)    (REST via PostgREST) (WebSockets)
          │                │                 │
          └────────────────┼─────────────────┘
                           │
                    Supabase project
                 zqcgygsdvlyuvbzpuguq

          ┌────────────────────────────┐
          │       External APIs        │
          │  api.wc2026api.com         │
          │  (match fixtures/results)  │
          └────────────────────────────┘
```

---

## Technology pieces and how they interface

### React + Vite (frontend framework)
- Single-page app — no server-side rendering, no routing library
- Tab state (`activeTab`) in `App.jsx` drives which component renders
- All data fetching happens inside components via `useEffect`
- Built with `npm run build` → static files in `/dist`

### Tailwind CSS v4
- Utility-first CSS — all styling is inline class names
- Configured via `@tailwindcss/vite` plugin (no `tailwind.config.js` needed)
- Critical: `@import "tailwindcss"` must be the first line in `src/index.css`

### GitHub Pages (hosting)
- Hosts the built `/dist` folder as static files
- Deployed via `npm run deploy` → pushes to `gh-pages` branch
- Base path `/KSO_World_Cup_2026/` is hardcoded in `vite.config.js`
- **No server-side code runs here** — everything is client-side

### Supabase Auth
- Magic link authentication — no passwords
- Email sent via Resend SMTP (configured in Supabase dashboard)
- Session stored in `localStorage` by the Supabase client
- `onAuthStateChange` listener in `App.jsx` keeps session state in sync
- When a magic link is clicked, Supabase puts tokens in the URL hash — the client detects this and fires `SIGNED_IN`

### Supabase Postgres (database)
- Standard relational database accessed via PostgREST (auto-generated REST API)
- All queries go through `src/lib/supabase.js` client
- Row Level Security (RLS) on every table — the anon key alone cannot do anything unless a policy allows it
- Four `security definer` functions handle complex atomic operations:
  - `make_pick` — validates turn + inserts pick + advances counter
  - `commissioner_pick` — same but bypasses turn check for commissioner
  - `undo_pick` — removes last pick + rewinds counter
  - `auto_draft` — picks highest-preference available team

### Supabase Realtime
- WebSocket connection maintained by the Supabase client
- `Draft.jsx` subscribes to:
  - `draft_session` UPDATE events → updates whose turn it is
  - `draft_picks` INSERT events → shows new picks instantly on all browsers
- All connected clients see picks within ~100–300ms of each other

### @dnd-kit (drag-and-drop)
- Used in `Preferences.jsx` for the team ranking list
- `DndContext` + `SortableContext` + `useSortable` hook per row
- Supports both mouse (PointerSensor) and touch (TouchSensor) with activation constraints to prevent accidental drags while scrolling

### WC2026 API
- Third-party API providing live match data
- Called directly from the browser (no proxy) — API key is in `.env` but exposed in the built JS bundle
- `fetchFixtures()` and `fetchResults()` in `src/utils/api.js`
- Results fetched once on component mount — no polling or auto-refresh yet

---

## Data flow: draft pick

```
Player clicks a team tile
        │
        ▼
Draft.jsx handlePick(teamId)
        │
        ▼
supabase.rpc('make_pick', { draft_session_id, team_id })
        │
        ▼
Postgres function (security definer):
  1. Lock draft_session row
  2. Verify it's the caller's turn (check auth.uid() matches current order entry)
  3. Verify team not already picked
  4. INSERT into draft_picks
  5. UPDATE draft_session.current_pick_number + 1
        │
        ▼
Supabase Realtime broadcasts:
  - draft_picks INSERT → all clients add team to picked list
  - draft_session UPDATE → all clients advance to next picker
        │
        ▼
All connected browsers update simultaneously
```

---

## Data flow: authentication + group join

```
User clicks Draft tab
        │
        ├─ Not logged in → Login.jsx
        │       │
        │       ▼
        │  Enter email → supabase.auth.signInWithOtp()
        │       │
        │       ▼
        │  Resend SMTP sends magic link email
        │       │
        │       ▼
        │  User clicks link → redirected to app with token in URL hash
        │       │
        │       ▼
        │  Supabase client detects hash → fires SIGNED_IN
        │       │
        │       ▼
        │  App.jsx navigates to Draft tab
        │
        └─ Logged in → GroupFlow.jsx
                │
                ▼
          Query group_members for this user
                │
                ├─ No groups → Create or Join flow
                ├─ One group → go straight to draft room
                └─ Multiple → pick which group
```

---

## Database relationships

```
auth.users (Supabase managed)
    │
    ├──< groups (commissioner_id)
    │
    └──< group_members (user_id)
              │
              ├──< draft_order (group_member_id)
              ├──< draft_picks (group_member_id)
              └──< draft_preferences (group_member_id)

groups
    │
    └──< draft_session (group_id, unique — one per group)
              │
              ├──< draft_order (draft_session_id)
              └──< draft_picks (draft_session_id)
```

---

## Security model

| Layer | Mechanism |
|---|---|
| Auth | Supabase magic links — no passwords to leak |
| API key exposure | Anon key is intentionally public — RLS enforces all rules |
| Turn enforcement | Server-side Postgres function — client can't bypass |
| Data access | RLS policies — users can only read/write their own group's data |
| Commissioner actions | Policies check `commissioner_id = auth.uid()` server-side |

The WC2026 API key (`VITE_WORLDCUP_API_KEY`) is visible in the built JS bundle — this is a known limitation of the current architecture. For a public app, this should be proxied through a server or Supabase Edge Function.

---

## Scaling considerations for public use

If you want to open this app to the general public (any group of friends, not just KSO), here's what to think about:

### 1. WC2026 API key exposure
**Current:** API key is in the client bundle — anyone can extract it and make requests on your behalf.
**Fix:** Create a Supabase Edge Function that acts as a proxy. The browser calls your Edge Function, which adds the API key server-side and forwards to the WC2026 API. This keeps the key secret.

### 2. Email rate limits and deliverability
**Current:** Using Resend's shared domain (`onboarding@resend.dev`). Works for small numbers but may hit spam filters at scale.
**Fix:** Add a custom domain (e.g. `noreply@ksoworldcup.com`) verified in Resend. This dramatically improves deliverability. Resend's free tier covers 3,000 emails/month — enough for hundreds of groups.

### 3. Supabase free tier limits
**Current:** Free tier (500MB database, 50,000 monthly active users, 200MB file storage).
**Limits to watch:**
- 500MB DB — fine for thousands of groups at this data size
- 50,000 MAU — fine for a small public app
- Realtime connections — free tier allows 200 concurrent connections
**Fix if needed:** Upgrade to Supabase Pro ($25/month) which removes most practical limits.

### 4. GitHub Pages limitations
**Current:** Static hosting, no server-side logic, no environment variable protection.
**Issues at scale:**
- No server-side rendering (slower initial load, worse SEO)
- No ability to run server code (needed for API proxying)
- Custom domain requires DNS configuration
**Fix:** Move to Vercel or Netlify — both have generous free tiers, support custom domains trivially, and can run Edge Functions for API proxying. Migration is straightforward since the app is already a Vite build.

### 5. No rate limiting on group creation
**Current:** Any logged-in user can create unlimited groups.
**Fix:** Add a Postgres policy or Edge Function that limits groups per user, or require email verification before group creation.

### 6. Leaderboard uses hardcoded player data
**Current:** `PlayerBoard.jsx` and `Fixtures.jsx` use the legacy `players.js` file (hardcoded KSO players and their teams). This doesn't reflect draft picks made through the new Supabase draft system.
**Fix:** Rewrite `PlayerBoard.jsx` to query `draft_picks` from Supabase for the active group, replacing the static `players.js` data. This is the most important code change needed before going fully multi-group.

### 7. No group discovery or landing page
**Current:** Users need an invite code to join a group — there's no way to browse or find groups.
**For public use:** This is actually a feature, not a bug — private invite codes keep groups closed. If you want open groups, add a public group directory and a "join without code" flow.

### 8. Commissioner is a single point of failure
**Current:** Only the commissioner can start drafts, undo picks, and pause. If they lose access to their account, the group is stuck.
**Fix:** Add a co-commissioner role, or allow the commissioner to transfer ownership to another group member.

### 9. No pick timer
**Current:** There's no time limit on picks — a player can hold up the draft indefinitely.
**Fix:** A server-side timer is the right approach (client clocks can't be trusted). Supabase Edge Functions with a cron job or a `pg_cron` extension task can check if the current pick has been outstanding for too long and call `auto_draft` automatically. This is a meaningful engineering task.

### 10. Match results shown to all groups regardless of draft
**Current:** The Leaderboard and Fixtures tabs show data from `players.js` — static KSO data. In a true multi-group world, each group should see their own members' scores.
**Fix:** Pass the active group context from `App.jsx` down to `PlayerBoard.jsx` and `Fixtures.jsx`, query `draft_picks` for that group's team ownership, and compute scores dynamically.

---

## Summary: what's needed before full public launch

| Priority | Task | Effort |
|---|---|---|
| High | Rewrite Leaderboard to use Supabase draft_picks instead of players.js | M |
| High | Proxy WC2026 API through Supabase Edge Function | M |
| High | Add custom email domain via Resend | S |
| Medium | Move hosting to Vercel for Edge Function support | S |
| Medium | Add pick timer via pg_cron + auto_draft | L |
| Medium | Rate limit group creation | S |
| Low | Co-commissioner / ownership transfer | M |
| Low | Public group discovery (if wanted) | M |
