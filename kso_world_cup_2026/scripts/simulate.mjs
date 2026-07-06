#!/usr/bin/env node
/*
 * Occy Picks — league-winner Monte Carlo simulation.
 *
 * Fetches the live tournament state (match_feed) from Supabase, applies the
 * app's real fantasy-scoring rules, simulates every remaining match, and prints
 * each player's projected final points and probability of winning the league.
 *
 * Re-run it after each match day — it auto-updates:
 *   - banked points recompute from whatever results are now in the feed
 *   - the bracket resolves from real results as rounds complete
 *   - only the still-unplayed matches get simulated
 *
 * Usage:   node scripts/simulate.mjs            (standard rules)
 *          node scripts/simulate.mjs --bonus    (+ round-progression win bonus)
 * Needs:   .env with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (already there),
 *          Node 18+ (global fetch).
 *
 * NOTE ON THE ROSTER: draft_picks is RLS-locked to authenticated league members,
 * so the anon key can't read it. The draft is therefore hard-coded below. If the
 * roster ever changes, edit ROSTER (team names must match teams.js `name`, using
 * the feed's spelling variants where they differ — see NORMALISE).
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO = join(__dirname, '..')

// ─── Tunable model parameters ──────────────────────────────────────────────
const SIMS         = 50000  // Monte Carlo runs
const HOME_ADV     = 35     // Elo bump for the feed's home_team (venue edge)
const GOAL_BASE    = 1.30   // baseline expected goals per side
const SUP_PER_100  = 0.25   // goals of supremacy per 100 Elo of rating difference
const ELO_TOP      = 2100   // rating of FIFA rank 1
const ELO_STEP     = 15     // Elo lost per rank position

// ─── Optional rule: round-progression win bonus (flag: --bonus) ─────────────
// Flat, unmultiplied points added to the WINNER of each knockout match (a
// penalty-shootout win counts). Off by default; enable with `--bonus`.
const BONUS = process.argv.includes('--bonus')
const ROUND_BONUS = { R32: 1, R16: 2, QF: 3, SF: 4, '3rd': 0, final: 5 }

// ─── The draft (player → teams). Feed spellings. ───────────────────────────
const ROSTER = {
  'Matt':            ['Norway', 'South Africa'],
  'Jess':            ['Egypt', "Côte d'Ivoire"],
  'Hannah':          ['England', 'Switzerland'],
  'Harry':           ['Algeria', 'Congo DR'],
  'Jack':            ['Canada', 'Bosnia-Herzegovina'],
  'John':            ['USA', 'Scotland'],
  'Jess Hamo':       ['Mexico', 'Iraq'],
  'Condie':          ['Brazil', 'Ghana'],
  'Yiorgo':          ['France', 'IR Iran'],
  'Charlie Cox':     ['Saudi Arabia', 'Qatar', 'Cabo Verde', 'Jordan'],
  'Dave':            ['Argentina', 'Morocco'],
  'Bree':            ['Australia', 'New Zealand'],
  'Caitlin':         ['Uruguay', 'Paraguay'],
  'Em':              ['Sweden', 'Czechia'],
  'Nat':             ['Japan', 'Turkey'],
  'Tamina':          ['Colombia', 'Ecuador'],
  'Murray':          ['Belgium', 'Croatia'],
  'Charlie Condali': ['Netherlands', 'Curaçao'],
  'Pete':            ['Korea Republic', 'Senegal'],
  'Amanda':          ['Spain', 'Tunisia'],
  'Sam':             ['Austria', 'Uzbekistan'],
  'badgoalryry':     ['Portugal', 'Haiti'],
  'Adam':            ['Germany', 'Panama'],
}

// ─── FIFA rank per team (canonical name + feed/API spelling variants) ───────
const R = {}
const add = (r, ...names) => names.forEach(n => (R[n] = r))
add(1,'Argentina');add(2,'France');add(3,'Spain');add(4,'England');add(5,'Brazil');add(6,'Belgium')
add(7,'Portugal');add(8,'Netherlands');add(9,'Germany');add(10,'Colombia');add(11,'Croatia');add(12,'Morocco')
add(13,'Japan');add(14,'USA','United States');add(15,'Uruguay');add(16,'Switzerland');add(17,'Mexico')
add(18,'Senegal');add(19,'Iran','IR Iran');add(20,'South Korea','Korea Republic');add(21,'Ecuador')
add(22,'Canada');add(23,'Austria');add(24,'Turkey','Türkiye');add(25,'Australia');add(26,'Norway')
add(27,'Sweden');add(28,'Czech Republic','Czechia');add(29,'Scotland');add(30,'Paraguay')
add(31,'Ivory Coast',"Côte d'Ivoire");add(32,'Tunisia');add(33,'Saudi Arabia');add(34,'Uzbekistan')
add(35,'Qatar');add(36,'Iraq');add(37,'Panama');add(38,'Ghana');add(39,'Egypt');add(40,'South Africa')
add(41,'Cape Verde','Cabo Verde');add(42,'DR Congo','Congo DR');add(43,'Haiti');add(44,'New Zealand')
add(45,'Bosnia & Herzegovina','Bosnia-Herzegovina');add(46,'Jordan');add(47,'Algeria');add(48,'Curaçao')

const rank   = n => R[n] ?? 24
const mult   = n => Math.ceil(rank(n) / 12)               // 1-12→1, 13-24→2, 25-36→3, 37-48→4
const rating = n => ELO_TOP - (rank(n) - 1) * ELO_STEP

// Knockout rounds (used for the penalty-shootout scoring rule).
const KO = new Set(['R32', 'R16', 'QF', 'SF', '3rd', 'final'])

// Fantasy points for one team from a decisive scoreline: win 3 (+1 if by 2+),
// draw 1, loss 0, all × the team's rank multiplier.
const teamPts = (t, my, opp) =>
  ((my > opp ? 3 : my === opp ? 1 : 0) + (my - opp >= 2 ? 1 : 0)) * mult(t)

// League rule: a knockout decided by a penalty shootout is a WIN for the
// shootout winner (3 × mult, no margin bonus — the result is level) and a LOSS
// for the loser (0) — NOT a draw. Group-stage draws stay 1 each. This differs
// from the live app's scoring.js, which ignores home_pen/away_pen and scores
// shootouts as draws. Returns points for `team` from a played match `m`.
function matchPts(m, team) {
  const isHome = team === m.home_team
  const my  = isHome ? m.home_score : m.away_score
  const opp = isHome ? m.away_score : m.home_score
  const shootout = KO.has(m.round) && my === opp && (m.home_pen != null || m.away_pen != null)
  if (shootout) {
    const homeWon = (m.home_pen ?? 0) >= (m.away_pen ?? 0)
    return isHome === homeWon ? 3 * mult(team) : 0
  }
  return teamPts(team, my, opp)
}

// ─── Knockout bracket wiring for TBD slots ─────────────────────────────────
// Only used when the feed hasn't yet filled a match's teams. R16 89-94 are
// confirmed from the feed's known pairings; 95/96 + QF/SF/final use standard
// 2026 adjacency (the feed carries no bracket-source fields). Once real results
// come in, the feed's own teams override these.
const BRACKET = {
  89:{h:'W74',a:'W77'}, 90:{h:'W73',a:'W75'}, 91:{h:'W76',a:'W78'}, 92:{h:'W79',a:'W80'},
  93:{h:'W83',a:'W84'}, 94:{h:'W81',a:'W82'}, 95:{h:'W86',a:'W88'}, 96:{h:'W85',a:'W87'},
  97:{h:'W89',a:'W90'}, 98:{h:'W93',a:'W94'}, 99:{h:'W91',a:'W92'}, 100:{h:'W95',a:'W96'},
  101:{h:'W97',a:'W98'}, 102:{h:'W99',a:'W100'}, 103:{h:'L101',a:'L102'}, 104:{h:'W101',a:'W102'},
}

// ─── Load .env and fetch the live feed ─────────────────────────────────────
function loadEnv() {
  const env = {}
  for (const line of readFileSync(join(REPO, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return env
}

async function fetchFeed() {
  const env = loadEnv()
  const url = `${env.VITE_SUPABASE_URL}/rest/v1/match_feed?select=matches&id=eq.wc2026`
  const res = await fetch(url, {
    headers: { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}` },
  })
  if (!res.ok) throw new Error(`match_feed fetch failed: ${res.status} ${res.statusText}`)
  const data = await res.json()
  const matches = data?.[0]?.matches
  if (!Array.isArray(matches)) throw new Error('match_feed returned no matches')
  return matches
}

// ─── Simulation engine ─────────────────────────────────────────────────────
const isPlayed = m => m.home_score != null && m.away_score != null
const poisson = l => { let L = Math.exp(-l), k = 0, p = 1; do { k++; p *= Math.random() } while (p > L); return k - 1 }

// Simulate one match; add fantasy points to `gain`; return the advancing team.
function playMatch(h, a, gain) {
  const d = (rating(h) + HOME_ADV) - rating(a)
  const sup = (d / 100) * SUP_PER_100
  const hs = poisson(Math.max(0.2, GOAL_BASE + sup / 2))
  const as = poisson(Math.max(0.2, GOAL_BASE - sup / 2))
  if (hs !== as) {                       // decided in normal/extra time
    gain[h] = (gain[h] || 0) + teamPts(h, hs, as)
    gain[a] = (gain[a] || 0) + teamPts(a, as, hs)
    return hs > as ? h : a
  }
  // level after ET → penalty shootout: winner scores a win (3 × mult, no margin
  // bonus), loser scores nothing.
  const winner = Math.random() < 0.5 + Math.max(-0.1, Math.min(0.1, d / 4000)) ? h : a
  gain[winner] = (gain[winner] || 0) + 3 * mult(winner)
  return winner
}

function actualWinnerLoser(m) {
  let w, l
  if (m.home_score > m.away_score) { w = m.home_team; l = m.away_team }
  else if (m.away_score > m.home_score) { w = m.away_team; l = m.home_team }
  else if ((m.home_pen ?? 0) >= (m.away_pen ?? 0)) { w = m.home_team; l = m.away_team }
  else { w = m.away_team; l = m.home_team }
  return { w, l }
}

async function main() {
  const feed = await fetchFeed()
  const played = feed.filter(isPlayed)

  // Banked points — fixed, from every played match.
  const banked = {}
  for (const m of played) {
    banked[m.home_team] = (banked[m.home_team] || 0) + matchPts(m, m.home_team)
    banked[m.away_team] = (banked[m.away_team] || 0) + matchPts(m, m.away_team)
    // Round-progression bonus to the knockout winner (--bonus only).
    if (BONUS && KO.has(m.round)) {
      const { w } = actualWinnerLoser(m)
      banked[w] = (banked[w] || 0) + (ROUND_BONUS[m.round] || 0)
    }
  }

  // Knockout matches, in dependency order (ascending match_number).
  const knockouts = feed.filter(m => KO.has(m.round)).sort((a, b) => a.match_number - b.match_number)
  const remaining = knockouts.filter(m => !isPlayed(m))

  // Precompute winners/losers of already-played knockouts (constant across runs).
  const fixed = {}
  for (const m of knockouts) if (isPlayed(m)) fixed[m.match_number] = actualWinnerLoser(m)

  // Which teams can still earn points (appear in any unplayed match, resolving TBDs).
  const players = Object.keys(ROSTER)

  // Validate the roster covers all 48 teams exactly once.
  const assigned = players.flatMap(p => ROSTER[p])
  const seen = {}
  assigned.forEach(t => (seen[t] = (seen[t] || 0) + 1))
  const dupes = Object.entries(seen).filter(([, c]) => c > 1)
  const unknown = assigned.filter(t => !(t in R))
  if (assigned.length !== 48 || dupes.length || unknown.length)
    console.warn(`⚠ roster check: ${assigned.length}/48 teams`,
      dupes.length ? `dupes=${dupes.map(d => d[0])}` : '', unknown.length ? `unknown=${unknown}` : '')

  const pBank = {}
  players.forEach(p => (pBank[p] = ROSTER[p].reduce((s, t) => s + (banked[t] || 0), 0)))

  // Run the Monte Carlo.
  const win = {}, top3 = {}, last = {}, finals = {}
  players.forEach(p => { win[p] = 0; top3[p] = 0; last[p] = 0; finals[p] = new Array(SIMS) })

  for (let i = 0; i < SIMS; i++) {
    const gain = {}
    const w = {}, l = {} // per-run winners/losers by match_number
    for (const [num, wl] of Object.entries(fixed)) { w[num] = wl.w; l[num] = wl.l }

    for (const m of remaining) {
      const num = m.match_number
      let home = m.home_team, away = m.away_team
      if (!home || !away) {
        const b = BRACKET[num]
        const ref = tok => (tok[0] === 'W' ? w[+tok.slice(1)] : l[+tok.slice(1)])
        home = ref(b.h); away = ref(b.a)
      }
      const winner = playMatch(home, away, gain)
      // Round-progression bonus to the simulated winner (--bonus only). Folded
      // straight into `gain` so it flows into player totals like any points.
      if (BONUS) gain[winner] = (gain[winner] || 0) + (ROUND_BONUS[m.round] || 0)
      w[num] = winner
      l[num] = winner === home ? away : home
    }

    const tot = players.map(p => pBank[p] + ROSTER[p].reduce((s, t) => s + (gain[t] || 0), 0))
    players.forEach((p, idx) => (finals[p][i] = tot[idx]))
    const max = Math.max(...tot), min = Math.min(...tot)
    const leaders = players.filter((_, idx) => tot[idx] === max)
    leaders.forEach(p => (win[p] += 1 / leaders.length))
    players.forEach((p, idx) => { if (tot[idx] === min) last[p] += 1 })
    const cut = [...tot].sort((a, b) => b - a)[2]
    players.forEach((p, idx) => { if (tot[idx] >= cut) top3[p] += 1 })
  }

  const pct = (arr, q) => { const s = [...arr].sort((a, b) => a - b); return s[Math.floor(q * s.length)] }
  const ALIVE = new Set()
  remaining.forEach(m => { if (m.home_team) ALIVE.add(m.home_team); if (m.away_team) ALIVE.add(m.away_team) })
  // add teams that reach TBD slots (any team not yet eliminated); approximate via R32/R16 fields already covered

  const rows = players.map(p => ({
    p, cur: pBank[p],
    mean: finals[p].reduce((s, x) => s + x, 0) / SIMS,
    p10: pct(finals[p], 0.1), p90: pct(finals[p], 0.9),
    win: (win[p] / SIMS) * 100, t3: (top3[p] / SIMS) * 100, last: (last[p] / SIMS) * 100,
    alive: ROSTER[p].filter(t => ALIVE.has(t)),
  }))

  // ─── Output ───
  console.log(`\nOccy Picks projection — ${played.length}/${feed.length} matches played, ` +
    `${remaining.length} to simulate · ${SIMS.toLocaleString()} sims · ${new Date().toISOString().slice(0, 16)}Z`)
  if (BONUS) console.log('RULE: round-progression win bonus ON (R32 +1, R16 +2, QF +3, SF +4, Final +5)')
  console.log()

  console.log('CURRENT STANDINGS (banked)')
  ;[...rows].sort((a, b) => b.cur - a.cur).forEach((r, i) =>
    console.log(`${String(i + 1).padStart(2)}. ${r.p.padEnd(16)}${String(r.cur).padStart(3)}   ${r.alive.join(', ') || '(eliminated)'}`))

  console.log('\nPROJECTION — sorted by P(win league)')
  console.log('player            now  E[final]  p10–p90   P(win)  P(top3)  alive')
  rows.sort((a, b) => b.win - a.win || b.mean - a.mean).forEach(r =>
    console.log(
      r.p.padEnd(16) + String(r.cur).padStart(4) + '   ' + r.mean.toFixed(1).padStart(5) + '  ' +
      `${r.p10}–${r.p90}`.padStart(8) + '  ' + `${r.win.toFixed(1)}%`.padStart(6) + '  ' +
      `${r.t3.toFixed(1)}%`.padStart(6) + '   ' + (r.alive.join(', ') || '—')))

  console.log(`\nModel: Elo from FIFA rank (top=${ELO_TOP}, −${ELO_STEP}/rank, +${HOME_ADV} home), ` +
    `Poisson goals (base ${GOAL_BASE}, ${SUP_PER_100}/100 Elo). Penalty shootout = win (3×mult) / loss (0). ` +
    `TBD bracket slots use standard 2026 adjacency. Tune the constants at the top of this file.`)
}

main().catch(e => { console.error(e); process.exit(1) })
