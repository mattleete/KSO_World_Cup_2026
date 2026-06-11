import { TEAMS } from '../data/teams'
import { supabase } from '../lib/supabase'

// Clients no longer call the WC2026 API directly — its key has a tiny daily
// request budget shared by every viewer. A scheduled GitHub Action fetches the
// feed and caches it in the `match_feed` table (one row, id='wc2026'); we read
// that here. Supabase reads aren't rate-limited, so usage no longer scales with
// the number of viewers. See .github/workflows/refresh-fixtures.yml.
async function fetchRawMatches() {
  const { data, error } = await supabase
    .from('match_feed')
    .select('matches')
    .eq('id', 'wc2026')
    .maybeSingle()
  if (error) throw new Error(error.message)
  return Array.isArray(data?.matches) ? data.matches : []
}

/**
 * Translate an API team name to our canonical teams.js name.
 * Falls back to the original string if no match found.
 */
function normalizeTeamName(apiName) {
  if (!apiName) return null
  const team = TEAMS.find(t => t.apiName === apiName || t.name === apiName)
  return team ? team.name : apiName
}

/** Format an API round string into a human-readable stage label. */
function formatStage(round, groupName) {
  if (round === 'group') return groupName ? `Group ${groupName}` : 'Group Stage'
  const labels = {
    round_of_32:   'Round of 32',
    round_of_16:   'Round of 16',
    quarter_final: 'Quarter-final',
    semi_final:    'Semi-final',
    third_place:   'Third Place',
    final:         'Final',
  }
  return labels[round] ?? round
}

/** Convert a UTC ISO date string to a display string in AEST (Australia/Sydney). */
export function toAEST(dateStr) {
  if (!dateStr) return ''
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(dateStr))
}

/**
 * Fetch all fixtures from the WC2026 API, sorted chronologically.
 * Returns an array of normalised match objects.
 */
export async function fetchFixtures() {
  const matches = await fetchRawMatches()

  const normalised = matches.map(m => ({
    team1:  normalizeTeamName(m.home_team),
    team2:  normalizeTeamName(m.away_team),
    date:   m.kickoff_utc,
    stage:  formatStage(m.round, m.group_name),
    score1: m.home_score,
    score2: m.away_score,
    status: m.status ?? null,
  }))

  normalised.sort((a, b) => new Date(a.date) - new Date(b.date))
  return normalised
}

/**
 * Fetch completed match results from the WC2026 API.
 * Returns only matches that have scores (i.e. have been played).
 */
export async function fetchResults() {
  const matches = await fetchRawMatches()

  return matches
    .filter(m => m.home_score !== null && m.away_score !== null)
    .map(m => ({
      team1:  normalizeTeamName(m.home_team),
      score1: m.home_score,
      team2:  normalizeTeamName(m.away_team),
      score2: m.away_score,
      stage:  formatStage(m.round, m.group_name),
      date:   m.kickoff_utc,
    }))
}
