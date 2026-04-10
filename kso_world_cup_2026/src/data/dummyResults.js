// ⚠️ DUMMY DATA — simulates the tournament up to the semi-final stage
// Replace this with real API data once the tournament is underway
// Team names must match the `name` field in teams.js exactly

export const DUMMY_RESULTS = [
  // ─────────────────────────────────────────────
  // GROUP STAGE
  // ─────────────────────────────────────────────

  // Group A: Argentina, Mexico, Ghana, Egypt
  { team1: 'Argentina', score1: 3, team2: 'Egypt',    score2: 0, stage: 'Group A', date: '2026-06-11' },
  { team1: 'Mexico',    score1: 2, team2: 'Ghana',    score2: 0, stage: 'Group A', date: '2026-06-11' },
  { team1: 'Argentina', score1: 2, team2: 'Ghana',    score2: 0, stage: 'Group A', date: '2026-06-17' },
  { team1: 'Mexico',    score1: 1, team2: 'Egypt',    score2: 1, stage: 'Group A', date: '2026-06-17' },
  { team1: 'Argentina', score1: 1, team2: 'Mexico',   score2: 1, stage: 'Group A', date: '2026-06-23' },
  { team1: 'Ghana',     score1: 1, team2: 'Egypt',    score2: 1, stage: 'Group A', date: '2026-06-23' },

  // Group B: France, Senegal, Panama, South Africa
  { team1: 'France',       score1: 3, team2: 'Panama',       score2: 0, stage: 'Group B', date: '2026-06-11' },
  { team1: 'Senegal',      score1: 2, team2: 'South Africa', score2: 0, stage: 'Group B', date: '2026-06-11' },
  { team1: 'France',       score1: 2, team2: 'South Africa', score2: 0, stage: 'Group B', date: '2026-06-17' },
  { team1: 'Senegal',      score1: 1, team2: 'Panama',       score2: 1, stage: 'Group B', date: '2026-06-17' },
  { team1: 'France',       score1: 1, team2: 'Senegal',      score2: 0, stage: 'Group B', date: '2026-06-23' },
  { team1: 'Panama',       score1: 1, team2: 'South Africa', score2: 1, stage: 'Group B', date: '2026-06-23' },

  // Group C: Spain, Iran, Iraq, Cape Verde
  { team1: 'Spain',      score1: 3, team2: 'Cape Verde', score2: 0, stage: 'Group C', date: '2026-06-12' },
  { team1: 'Iran',       score1: 2, team2: 'Iraq',       score2: 0, stage: 'Group C', date: '2026-06-12' },
  { team1: 'Spain',      score1: 2, team2: 'Iraq',       score2: 0, stage: 'Group C', date: '2026-06-18' },
  { team1: 'Iran',       score1: 1, team2: 'Cape Verde', score2: 1, stage: 'Group C', date: '2026-06-18' },
  { team1: 'Spain',      score1: 1, team2: 'Iran',       score2: 0, stage: 'Group C', date: '2026-06-24' },
  { team1: 'Iraq',       score1: 2, team2: 'Cape Verde', score2: 1, stage: 'Group C', date: '2026-06-24' },

  // Group D: England, South Korea, Qatar, DR Congo
  { team1: 'England',     score1: 2, team2: 'Qatar',    score2: 0, stage: 'Group D', date: '2026-06-12' },
  { team1: 'South Korea', score1: 2, team2: 'DR Congo', score2: 0, stage: 'Group D', date: '2026-06-12' },
  { team1: 'England',     score1: 2, team2: 'South Korea', score2: 1, stage: 'Group D', date: '2026-06-18' },
  { team1: 'Qatar',       score1: 2, team2: 'DR Congo', score2: 1, stage: 'Group D', date: '2026-06-18' },
  { team1: 'England',     score1: 2, team2: 'DR Congo', score2: 0, stage: 'Group D', date: '2026-06-24' },
  { team1: 'South Korea', score1: 1, team2: 'Qatar',    score2: 0, stage: 'Group D', date: '2026-06-24' },

  // Group E: Brazil, Ecuador, Uzbekistan, Haiti
  { team1: 'Brazil',      score1: 3, team2: 'Haiti',      score2: 0, stage: 'Group E', date: '2026-06-13' },
  { team1: 'Ecuador',     score1: 2, team2: 'Uzbekistan', score2: 0, stage: 'Group E', date: '2026-06-13' },
  { team1: 'Brazil',      score1: 2, team2: 'Uzbekistan', score2: 1, stage: 'Group E', date: '2026-06-19' },
  { team1: 'Ecuador',     score1: 1, team2: 'Haiti',      score2: 0, stage: 'Group E', date: '2026-06-19' },
  { team1: 'Brazil',      score1: 1, team2: 'Ecuador',    score2: 0, stage: 'Group E', date: '2026-06-25' },
  { team1: 'Uzbekistan',  score1: 2, team2: 'Haiti',      score2: 1, stage: 'Group E', date: '2026-06-25' },

  // Group F: Belgium, Canada, Saudi Arabia, New Zealand
  { team1: 'Belgium',      score1: 2, team2: 'Canada',      score2: 1, stage: 'Group F', date: '2026-06-13' },
  { team1: 'Saudi Arabia', score1: 1, team2: 'New Zealand', score2: 0, stage: 'Group F', date: '2026-06-13' },
  { team1: 'Belgium',      score1: 2, team2: 'Saudi Arabia',score2: 0, stage: 'Group F', date: '2026-06-19' },
  { team1: 'Canada',       score1: 2, team2: 'New Zealand', score2: 0, stage: 'Group F', date: '2026-06-19' },
  { team1: 'Belgium',      score1: 2, team2: 'New Zealand', score2: 0, stage: 'Group F', date: '2026-06-25' },
  { team1: 'Canada',       score1: 1, team2: 'Saudi Arabia',score2: 0, stage: 'Group F', date: '2026-06-25' },

  // Group G: Portugal, Austria, Tunisia, Bosnia & Herzegovina
  { team1: 'Portugal',            score1: 3, team2: 'Bosnia & Herzegovina', score2: 0, stage: 'Group G', date: '2026-06-14' },
  { team1: 'Austria',             score1: 2, team2: 'Tunisia',              score2: 1, stage: 'Group G', date: '2026-06-14' },
  { team1: 'Portugal',            score1: 2, team2: 'Tunisia',              score2: 0, stage: 'Group G', date: '2026-06-20' },
  { team1: 'Austria',             score1: 1, team2: 'Bosnia & Herzegovina', score2: 1, stage: 'Group G', date: '2026-06-20' },
  { team1: 'Portugal',            score1: 1, team2: 'Austria',              score2: 0, stage: 'Group G', date: '2026-06-26' },
  { team1: 'Tunisia',             score1: 1, team2: 'Bosnia & Herzegovina', score2: 0, stage: 'Group G', date: '2026-06-26' },

  // Group H: Netherlands, Turkey, Ivory Coast, Jordan
  { team1: 'Netherlands', score1: 3, team2: 'Jordan',      score2: 0, stage: 'Group H', date: '2026-06-14' },
  { team1: 'Turkey',      score1: 2, team2: 'Ivory Coast', score2: 1, stage: 'Group H', date: '2026-06-14' },
  { team1: 'Netherlands', score1: 2, team2: 'Ivory Coast', score2: 0, stage: 'Group H', date: '2026-06-20' },
  { team1: 'Turkey',      score1: 1, team2: 'Jordan',      score2: 0, stage: 'Group H', date: '2026-06-20' },
  { team1: 'Netherlands', score1: 2, team2: 'Turkey',      score2: 0, stage: 'Group H', date: '2026-06-26' },
  { team1: 'Ivory Coast', score1: 2, team2: 'Jordan',      score2: 1, stage: 'Group H', date: '2026-06-26' },

  // Group I: Germany, Czech Republic, Paraguay, Scotland
  { team1: 'Germany',        score1: 2, team2: 'Scotland',       score2: 0, stage: 'Group I', date: '2026-06-15' },
  { team1: 'Czech Republic', score1: 1, team2: 'Paraguay',       score2: 1, stage: 'Group I', date: '2026-06-15' },
  { team1: 'Germany',        score1: 1, team2: 'Czech Republic', score2: 0, stage: 'Group I', date: '2026-06-21' },
  { team1: 'Scotland',       score1: 2, team2: 'Paraguay',       score2: 1, stage: 'Group I', date: '2026-06-21' },
  { team1: 'Germany',        score1: 2, team2: 'Paraguay',       score2: 0, stage: 'Group I', date: '2026-06-27' },
  { team1: 'Czech Republic', score1: 2, team2: 'Scotland',       score2: 1, stage: 'Group I', date: '2026-06-27' },

  // Group J: Colombia, Norway, Croatia (3-team group)
  { team1: 'Colombia', score1: 2, team2: 'Norway',   score2: 1, stage: 'Group J', date: '2026-06-15' },
  { team1: 'Colombia', score1: 1, team2: 'Croatia',  score2: 0, stage: 'Group J', date: '2026-06-21' },
  { team1: 'Croatia',  score1: 2, team2: 'Norway',   score2: 1, stage: 'Group J', date: '2026-06-27' },

  // Group K: Morocco, Japan, Sweden (3-team group)
  { team1: 'Morocco', score1: 2, team2: 'Sweden', score2: 0, stage: 'Group K', date: '2026-06-16' },
  { team1: 'Morocco', score1: 1, team2: 'Japan',  score2: 1, stage: 'Group K', date: '2026-06-22' },
  { team1: 'Japan',   score1: 2, team2: 'Sweden', score2: 0, stage: 'Group K', date: '2026-06-28' },

  // Group L: USA, Uruguay, Switzerland, Australia
  { team1: 'USA',         score1: 2, team2: 'Australia',   score2: 0, stage: 'Group L', date: '2026-06-16' },
  { team1: 'Uruguay',     score1: 1, team2: 'Switzerland', score2: 0, stage: 'Group L', date: '2026-06-16' },
  { team1: 'USA',         score1: 2, team2: 'Uruguay',     score2: 1, stage: 'Group L', date: '2026-06-22' },
  { team1: 'Switzerland', score1: 1, team2: 'Australia',   score2: 0, stage: 'Group L', date: '2026-06-22' },
  { team1: 'USA',         score1: 2, team2: 'Switzerland', score2: 0, stage: 'Group L', date: '2026-06-28' },
  { team1: 'Uruguay',     score1: 2, team2: 'Australia',   score2: 1, stage: 'Group L', date: '2026-06-28' },

  // ─────────────────────────────────────────────
  // ROUND OF 32
  // ─────────────────────────────────────────────
  { team1: 'Argentina',  score1: 3, team2: 'Saudi Arabia', score2: 1, stage: 'Round of 32', date: '2026-06-29' },
  { team1: 'France',     score1: 2, team2: 'Uzbekistan',   score2: 0, stage: 'Round of 32', date: '2026-06-29' },
  { team1: 'Spain',      score1: 2, team2: 'Switzerland',  score2: 0, stage: 'Round of 32', date: '2026-06-29' },
  { team1: 'England',    score1: 3, team2: 'Qatar',        score2: 0, stage: 'Round of 32', date: '2026-06-29' },
  { team1: 'Brazil',     score1: 3, team2: 'Iraq',         score2: 0, stage: 'Round of 32', date: '2026-06-30' },
  { team1: 'Belgium',    score1: 2, team2: 'Scotland',     score2: 1, stage: 'Round of 32', date: '2026-06-30' },
  { team1: 'Morocco',    score1: 2, team2: 'Tunisia',      score2: 1, stage: 'Round of 32', date: '2026-06-30' },
  { team1: 'Netherlands',score1: 3, team2: 'Ivory Coast',  score2: 1, stage: 'Round of 32', date: '2026-06-30' },
  { team1: 'Germany',    score1: 2, team2: 'Croatia',      score2: 0, stage: 'Round of 32', date: '2026-07-01' },
  { team1: 'Colombia',   score1: 2, team2: 'Czech Republic',score2:1, stage: 'Round of 32', date: '2026-07-01' },
  { team1: 'Portugal',   score1: 2, team2: 'South Korea',  score2: 0, stage: 'Round of 32', date: '2026-07-01' },
  { team1: 'USA',        score1: 2, team2: 'Japan',        score2: 1, stage: 'Round of 32', date: '2026-07-01' },
  { team1: 'Mexico',     score1: 1, team2: 'Uruguay',      score2: 2, stage: 'Round of 32', date: '2026-07-02' },
  { team1: 'Senegal',    score1: 0, team2: 'Iran',         score2: 1, stage: 'Round of 32', date: '2026-07-02' },
  { team1: 'Canada',     score1: 1, team2: 'Turkey',       score2: 0, stage: 'Round of 32', date: '2026-07-02' },
  { team1: 'Ecuador',    score1: 2, team2: 'Austria',      score2: 1, stage: 'Round of 32', date: '2026-07-02' },

  // ─────────────────────────────────────────────
  // ROUND OF 16
  // ─────────────────────────────────────────────
  { team1: 'Argentina',  score1: 2, team2: 'Uruguay',     score2: 0, stage: 'Round of 16', date: '2026-07-03' },
  { team1: 'France',     score1: 2, team2: 'Iran',        score2: 1, stage: 'Round of 16', date: '2026-07-03' },
  { team1: 'Morocco',    score1: 2, team2: 'Spain',       score2: 1, stage: 'Round of 16', date: '2026-07-04' },
  { team1: 'England',    score1: 2, team2: 'Canada',      score2: 1, stage: 'Round of 16', date: '2026-07-04' },
  { team1: 'Brazil',     score1: 3, team2: 'Ecuador',     score2: 1, stage: 'Round of 16', date: '2026-07-05' },
  { team1: 'Belgium',    score1: 1, team2: 'Colombia',    score2: 0, stage: 'Round of 16', date: '2026-07-05' },
  { team1: 'Germany',    score1: 1, team2: 'Portugal',    score2: 0, stage: 'Round of 16', date: '2026-07-06' },
  { team1: 'Netherlands',score1: 2, team2: 'USA',         score2: 1, stage: 'Round of 16', date: '2026-07-06' },

  // ─────────────────────────────────────────────
  // QUARTER-FINALS
  // ─────────────────────────────────────────────
  { team1: 'Argentina',  score1: 2, team2: 'Netherlands', score2: 1, stage: 'Quarter-final', date: '2026-07-09' },
  { team1: 'France',     score1: 3, team2: 'England',     score2: 2, stage: 'Quarter-final', date: '2026-07-09' },
  { team1: 'Brazil',     score1: 2, team2: 'Belgium',     score2: 0, stage: 'Quarter-final', date: '2026-07-10' },
  { team1: 'Morocco',    score1: 1, team2: 'Germany',     score2: 0, stage: 'Quarter-final', date: '2026-07-10' },

  // ─────────────────────────────────────────────
  // SEMI-FINALS
  // ─────────────────────────────────────────────
  { team1: 'Argentina',  score1: 2, team2: 'Morocco',  score2: 1, stage: 'Semi-final', date: '2026-07-14' },
  { team1: 'France',     score1: 1, team2: 'Brazil',   score2: 0, stage: 'Semi-final', date: '2026-07-15' },
]
