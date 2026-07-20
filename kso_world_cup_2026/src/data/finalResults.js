// Occy Picks 2026 — FINAL season data (all 104 matches complete).
// Figures verified against the app's own scoring engine over the live match feed
// (see reports/compute_final.mjs, which reuses the exact scoring + ownership
// rules). This is a frozen end-of-season snapshot — it does not change.
//
// Team names are internal keys (see teams.js). The recap component resolves
// each to its flag + display name (e.g. Ivory Coast → Côte d'Ivoire).

export const FINAL = {
  matchesPlayed: 104,

  // Snake draft pick order (pick 1 → 44), reconstructed from the final draft
  // board and cross-checked against every pick number in the season report.
  // The last four (Cape Verde, Saudi Arabia, Qatar, Jordan) were undrafted and
  // auto-assigned to Charlie Cox after the draft — appended here at the end.
  draftOrder: [
    // Round 1 (picks 1–22)
    'Canada', 'Austria', 'Mexico', 'Netherlands', 'Norway', 'Algeria', 'Spain',
    'France', 'Uruguay', 'Portugal', 'Japan', 'Argentina', 'Sweden', 'USA',
    'Australia', 'South Korea', 'Egypt', 'Germany', 'Colombia', 'Belgium',
    'England', 'Brazil',
    // Round 2 (picks 23–44, snake reversed)
    'Ghana', 'Switzerland', 'Croatia', 'Ecuador', 'Panama', 'Ivory Coast',
    'Senegal', 'New Zealand', 'Scotland', 'Czech Republic', 'Morocco', 'Turkey',
    'Haiti', 'Paraguay', 'Iran', 'Tunisia', 'DR Congo', 'South Africa',
    'Curaçao', 'Iraq', 'Uzbekistan', 'Bosnia & Herzegovina',
    // Auto-assigned after the draft
    'Cape Verde', 'Saudi Arabia', 'Qatar', 'Jordan',
  ],

  // Settled podium
  champion:  { player: 'Jess', total: 57, teams: ['Egypt', 'Ivory Coast'] },
  runnerUp:  { player: 'Matt', total: 55, teams: ['Norway', 'South Africa'] },
  third:     { player: 'Hannah', total: 52, teams: ['Switzerland', 'England'] },

  // Full final standings (ties share a rank; `tie` marks them)
  standings: [
    { rank: 1,  player: 'Jess',            total: 57, teams: [['Egypt', 36], ['Ivory Coast', 21]] },
    { rank: 2,  player: 'Matt',            total: 55, teams: [['Norway', 39], ['South Africa', 16]] },
    { rank: 3,  player: 'Hannah',          total: 52, teams: [['Switzerland', 30], ['England', 22]] },
    { rank: 4,  player: 'Dave',            total: 40, teams: [['Argentina', 25], ['Morocco', 15]] },
    { rank: 5,  player: 'Jack',            total: 36, teams: [['Bosnia & Herzegovina', 20], ['Canada', 16]], tie: true },
    { rank: 5,  player: 'Haz',             total: 36, teams: [['DR Congo', 20], ['Algeria', 16]], tie: true },
    { rank: 7,  player: 'John',            total: 33, teams: [['USA', 24], ['Scotland', 9]] },
    { rank: 8,  player: 'Jess Hamo',       total: 30, teams: [['Mexico', 30], ['Iraq', 0]] },
    { rank: 9,  player: 'Yiorgo',          total: 29, teams: [['France', 23], ['Iran', 6]] },
    { rank: 10, player: 'Condie',          total: 28, teams: [['Ghana', 16], ['Brazil', 12]] },
    { rank: 11, player: 'Amanda',          total: 25, teams: [['Spain', 25], ['Tunisia', 0]], tie: true },
    { rank: 11, player: 'Caitlin',         total: 25, teams: [['Paraguay', 21], ['Uruguay', 4]], tie: true },
    { rank: 13, player: 'Charlie Cox',     total: 21, teams: [['Cape Verde', 12], ['Saudi Arabia', 6], ['Qatar', 3], ['Jordan', 0]], note: 'auto-assigned' },
    { rank: 14, player: 'Bree',            total: 19, teams: [['Australia', 15], ['New Zealand', 4]], tie: true },
    { rank: 14, player: 'Murray',          total: 19, teams: [['Belgium', 13], ['Croatia', 6]], tie: true },
    { rank: 14, player: 'Tamina',          total: 19, teams: [['Colombia', 11], ['Ecuador', 8]], tie: true },
    { rank: 17, player: 'Em',              total: 18, teams: [['Sweden', 15], ['Czech Republic', 3]], tie: true },
    { rank: 17, player: 'Natalia',         total: 18, teams: [['Japan', 12], ['Turkey', 6]], tie: true },
    { rank: 19, player: 'Peter Crouch',    total: 14, teams: [['Senegal', 8], ['South Korea', 6]] },
    { rank: 20, player: 'Charlie Condali', total: 13, teams: [['Netherlands', 9], ['Curaçao', 4]] },
    { rank: 21, player: 'Sammy',           total: 10, teams: [['Austria', 10], ['Uzbekistan', 0]] },
    { rank: 22, player: 'badgoalryry',     total: 9,  teams: [['Portugal', 9], ['Haiti', 0]] },
    { rank: 23, player: 'adam',            total: 7,  teams: [['Germany', 7], ['Panama', 0]] },
  ],

  // Top-scoring teams of the tournament
  topTeams: [
    { team: 'Norway', pts: 39, owner: 'Matt', tier: 3 },
    { team: 'Egypt', pts: 36, owner: 'Jess', tier: 4 },
    { team: 'Switzerland', pts: 30, owner: 'Hannah', tier: 2 },
    { team: 'Mexico', pts: 30, owner: 'Jess Hamo', tier: 1 },
    { team: 'Spain', pts: 25, owner: 'Amanda', tier: 1 },
    { team: 'Argentina', pts: 25, owner: 'Dave', tier: 1 },
    { team: 'USA', pts: 24, owner: 'John', tier: 1 },
    { team: 'France', pts: 23, owner: 'Yiorgo', tier: 1 },
  ],

  // Six teams finished on zero
  zeros: ['Tunisia', 'Uzbekistan', 'Iraq', 'Panama', 'Haiti', 'Jordan'],

  // Tier (multiplier) performance — average points per team, 12 teams per tier
  tiers: [
    { tier: 1, range: 'FIFA rank 1–12',  avg: 14.75, zeros: 0 },
    { tier: 2, range: 'FIFA rank 13–24', avg: 13.33, zeros: 0 },
    { tier: 4, range: 'FIFA rank 37–48', avg: 12.00, zeros: 3 },
    { tier: 3, range: 'FIFA rank 25–36', avg: 11.00, zeros: 3 },
  ],

  // Biggest single-match hauls (three-way tie for the record)
  topHauls: [
    { team: 'Egypt', pts: 16, owner: 'Jess', label: 'New Zealand 1–3 Egypt', stage: 'Group' },
    { team: 'Bosnia & Herzegovina', pts: 16, owner: 'Jack', label: 'group-stage 2+ goal win', stage: 'Group' },
    { team: 'DR Congo', pts: 16, owner: 'Haz', label: 'group-stage 2+ goal win', stage: 'Group' },
  ],

  // Draft-value analysis — carried from the Season Report's snake-draft
  // reconstruction (value = draft pick number − points-rank among drafted teams;
  // positive = outperformed its draft slot). Pick numbers are not recomputed
  // here because the draft order is not readable from the public data.
  draftValue: {
    r1avg: 17.2,
    r2avg: 9.7,
    best: [
      { team: 'Bosnia & Herzegovina', owner: 'Jack', pick: 44, pts: 20, value: 31 },
      { team: 'DR Congo', owner: 'Haz', pick: 39, pts: 20, value: 27 },
      { team: 'Paraguay', owner: 'Caitlin', pick: 36, pts: 21, value: 26 },
      { team: 'South Africa', owner: 'Matt', pick: 40, pts: 16, value: 24 },
      { team: 'Switzerland', owner: 'Hannah', pick: 24, pts: 30, value: 21 },
      { team: 'Ivory Coast', owner: 'Jess', pick: 28, pts: 21, value: 17 },
    ],
    worst: [
      { team: 'Uruguay', owner: 'Caitlin', pick: 9, pts: 4, value: -27 },
      { team: 'Netherlands', owner: 'Charlie Condali', pick: 4, pts: 9, value: -23 },
      { team: 'Austria', owner: 'Sammy', pick: 2, pts: 10, value: -23 },
      { team: 'South Korea', owner: 'Peter Crouch', pick: 16, pts: 6, value: -18 },
      { team: 'Panama', owner: 'adam', pick: 27, pts: 0, value: -16 },
      { team: 'Portugal', owner: 'badgoalryry', pick: 10, pts: 9, value: -16 },
    ],
  },

  // Analytical takeaways (objective; no per-player editorialising)
  insights: [
    {
      title: 'The champion held no team past the Round of 16',
      body: "Jess's two teams — Côte d'Ivoire (out in the Round of 32) and Egypt (out in the Round of 16) — were both eliminated before the quarter-finals, yet the pair scored 57. The title was built on Egypt (36), a ×4 team whose deep run and 2+ goal wins compounded under the multiplier.",
    },
    {
      title: 'One scoring rule decided the title',
      body: "Penalty shootouts are scored as a win (3× multiplier), not a draw — a rule corrected mid-tournament. Egypt's Round-of-32 shootout win over Australia was therefore worth 12 points (×4), not 4. Under the original draw-based scoring Jess finishes on 49 and Matt (55) wins. The correction determined the champion; the final margin was 2 points.",
    },
    {
      title: 'Owning the World Cup winner was nearly irrelevant',
      body: 'Spain lifted the trophy, but as a ×1 team the title was worth only 25 points to their owner (Amanda, 11th). Egypt — knocked out in the Round of 16 — scored 36 as a ×4 team. Under this ruleset a weak team on a deep run outscored the actual champion by a wide margin.',
    },
    {
      title: 'The best single team did not win the pool',
      body: 'Matt held Norway (39), the highest-scoring team of the tournament, and South Africa (16, +24 draft value) — but finished second on 55 to Jess\'s 57. The tightest possible margin between the top two teams.',
    },
    {
      title: 'The multiplier system achieved close parity',
      body: 'Despite a ×1–×4 spread, average points per team ranged only from 11.0 (×3) to 14.75 (×1) — about 3.75 points. The ×3 tier was the most volatile: it produced the top scorer (Norway) and three of the six zero-point teams.',
    },
    {
      title: 'Draft position predicted return',
      body: 'First-round picks averaged 17.2 points; second-round picks averaged 9.7 — roughly 1.8× the output. The single best-value pick was Jack\'s Bosnia & Herzegovina at pick 44 (last overall), which returned 20 points.',
    },
  ],

  methodology: [
    'Scoring: win 3, draw 1, loss 0; +1 bonus for a 2+ goal margin; the total is multiplied by the team\'s FIFA-rank tier (×1 rank 1–12, ×2 13–24, ×3 25–36, ×4 37–48).',
    'Penalty shootouts count as a win (3 × multiplier) for the advancing team and a loss (0) for the other — not a draw. The margin bonus never applies.',
    'The four teams undrafted in the snake (Cape Verde, Saudi Arabia, Qatar, Jordan) were auto-assigned to Charlie Cox after the draft.',
    'Figures were computed directly from the live match feed using the app\'s own scoring engine across all 104 completed matches.',
  ],
}
