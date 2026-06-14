import { getTeamByName } from '../data/teams'
import { resultKey } from './results'

// ── Manual score overlay ────────────────────────────────────────────────────
// Overlay manually-entered scores onto the API fixture list (manual wins).
export function applyManual(fixtures, manual) {
  if (!manual?.length) return fixtures
  const byKey = new Map(manual.map(m => [resultKey(m.team1, m.team2, m.stage), m]))
  return fixtures.map(f => {
    const m = byKey.get(resultKey(f.team1, f.team2, f.stage))
    return m ? { ...f, score1: m.score1, score2: m.score2 } : f
  })
}

// ── AEST (Australia/Sydney) day bucketing ───────────────────────────────────
// Day boundaries follow the timezone the app already displays times in, so a
// late-night UTC kickoff lands in the calendar day the user sees.
const aestDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Australia/Sydney',
  year: 'numeric', month: '2-digit', day: '2-digit',
})

/** AEST calendar date key ("YYYY-MM-DD") for a date string/Date, or null. */
export function aestDateKey(date) {
  if (!date) return null
  return aestDay.format(new Date(date))
}

const DAY_MS = 24 * 60 * 60 * 1000
export function todayKey()     { return aestDay.format(new Date()) }
export function tomorrowKey()  { return aestDay.format(new Date(Date.now() + DAY_MS)) }
export function yesterdayKey() { return aestDay.format(new Date(Date.now() - DAY_MS)) }

// ── Match classification ────────────────────────────────────────────────────
export function isLive(match) {
  return match.status === 'live' || match.status === 'in_progress'
}

/** A completed match: both scores in and not still live. */
export function isPlayed(match) {
  return match.score1 != null && match.score2 != null && !isLive(match)
}

export function isGroupStage(stage) {
  return typeof stage === 'string' && stage.startsWith('Group')
}

export function isKnockout(stage) {
  return typeof stage === 'string' && stage.length > 0 && !isGroupStage(stage)
}

/** Both sides resolve to real teams (knockout slots are TBD until groups finish). */
export function bothTeamsKnown(match) {
  return !!(match.team1 && match.team2 &&
    getTeamByName(match.team1) && getTeamByName(match.team2))
}

// ── Formatters ──────────────────────────────────────────────────────────────
const aestDateLabel = new Intl.DateTimeFormat('en-AU', {
  timeZone: 'Australia/Sydney',
  weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
})
const aestTimeLabel = new Intl.DateTimeFormat('en-AU', {
  timeZone: 'Australia/Sydney',
  hour: 'numeric', minute: '2-digit', hour12: true,
})

export function toAESTDateKey(dateStr) {
  return dateStr ? aestDateLabel.format(new Date(dateStr)) : 'Date TBC'
}

export function toAESTTime(dateStr) {
  return dateStr ? aestTimeLabel.format(new Date(dateStr)) : 'TBC'
}

/** "in 3d", "in 2h 14m", "in 45m" — or null if the date is past/missing. */
export function formatCountdown(dateStr, now = Date.now()) {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - now
  if (diff <= 0) return null
  const mins = Math.floor(diff / 60000)
  const days = Math.floor(mins / 1440)
  const hours = Math.floor((mins % 1440) / 60)
  const m = mins % 60
  if (days > 0) return `in ${days}d ${hours}h`
  if (hours > 0) return `in ${hours}h ${m}m`
  return `in ${m}m`
}
