import { supabase } from '../lib/supabase'
import { fetchResults } from './api'

// The one account allowed to enter/override match scores. Enforced for real in
// the SECURITY DEFINER functions in supabase/functions.sql (auth.email() check);
// the frontend gate is cosmetic. Keep both copies of this literal in sync.
export const SUPERADMIN_EMAIL = 'matt.c.leete@gmail.com'

/**
 * Stable key for a match, independent of which team is "home". Two teams could
 * meet more than once (e.g. group stage then a knockout), so the stage is part
 * of the key. Used to dedupe API results against manual overrides.
 */
export function resultKey(team1, team2, stage) {
  return [team1, team2].sort().join('|') + '|' + (stage ?? '')
}

/**
 * Fetch manually-entered results from Supabase, mapped to the same shape the
 * scoring engine and UI use for API results.
 */
export async function fetchManualResults() {
  const { data, error } = await supabase.from('match_results').select()
  if (error) throw error
  return (data || []).map(r => ({
    id:     r.id,
    team1:  r.team1,
    score1: r.score1,
    team2:  r.team2,
    score2: r.score2,
    stage:  r.stage,
    date:   r.played_at,
    manual: true,
    updatedAt: r.updated_at,
  }))
}

/**
 * Merge API results with manual overrides. A manual entry replaces any API
 * entry for the same match (team pair + stage). Returns a deduped array so
 * calcTeamPoints can't double-count.
 */
export function mergeResults(apiResults, manualResults) {
  const byKey = new Map()
  for (const m of apiResults || []) {
    byKey.set(resultKey(m.team1, m.team2, m.stage), m)
  }
  for (const m of manualResults || []) {
    byKey.set(resultKey(m.team1, m.team2, m.stage), m)
  }
  return [...byKey.values()]
}

/**
 * Load combined results — API feed plus manual overrides. Each source fails
 * soft (a missing/erroring API won't blank manual scores, and vice versa) so
 * points survive an API outage.
 */
export async function loadAllResults() {
  const [api, manual] = await Promise.all([
    fetchResults().catch(() => []),
    fetchManualResults().catch(() => []),
  ])
  return mergeResults(api, manual)
}
