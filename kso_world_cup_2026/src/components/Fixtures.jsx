import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { fetchFixtures } from '../utils/api'
import { fetchManualResults, resultKey } from '../utils/results'
import { getTeamByName, getTeamById, getDisplayName } from '../data/teams'
import { calcMatchPoints } from '../utils/scoring'
import { DUMMY_FIXTURES, DUMMY_OWNERS } from '../data/dummyFixtures'

const USE_DUMMY = false // set to true to use dummy data for UI testing

// Overlay manually-entered scores onto the API fixture list (manual wins).
function applyManual(fixtures, manual) {
  if (!manual?.length) return fixtures
  const byKey = new Map(manual.map(m => [resultKey(m.team1, m.team2, m.stage), m]))
  return fixtures.map(f => {
    const m = byKey.get(resultKey(f.team1, f.team2, f.stage))
    return m ? { ...f, score1: m.score1, score2: m.score2 } : f
  })
}

function toAESTDateKey(dateStr) {
  if (!dateStr) return 'Date TBC'
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateStr))
}

function toAESTTime(dateStr) {
  if (!dateStr) return 'TBC'
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(dateStr))
}

function MatchCard({ match, ownerByTeamName }) {
  const homeOwnerName = ownerByTeamName?.[match.team1] ?? null
  const awayOwnerName = ownerByTeamName?.[match.team2] ?? null
  const homeTeam = getTeamByName(match.team1)
  const awayTeam = getTeamByName(match.team2)
  const hasScore = match.score1 !== null && match.score2 !== null
  const isLive = match.status === 'live' || match.status === 'in_progress'
  const isComplete = hasScore && !isLive

  // Always render a border so the live-game green border doesn't change the
  // card's size relative to its neighbours in the grid.
  const cardClass = isLive
    ? 'bg-[#f7f7f7] border border-green-500'
    : isComplete
      ? 'bg-[#e0e0e0] border border-transparent'
      : 'bg-[#f7f7f7] border border-transparent'

  const statusLabel = isLive
    ? `${match.stage ?? 'TBC'} · Live`
    : isComplete
      ? `${match.stage ?? 'TBC'} · Full time`
      : match.date
        ? `${match.stage ?? 'TBC'} · ${toAESTTime(match.date)}`
        : (match.stage ?? 'TBC')

  return (
    <div className={`rounded-[6px] px-4 py-3 flex flex-col gap-3 ${cardClass}`}>
      {/* Stage · status */}
      <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#0a0a0a]/40">
        {statusLabel}
      </p>

      {/* Teams + score */}
      <div className="flex items-center gap-2">
        {/* Home */}
        <div className="flex-1 flex flex-col items-start gap-0.5 min-w-0">
          <span className="text-[22px] leading-none">{homeTeam?.flag ?? '🏳️'}</span>
          <p className="text-[13px] font-semibold leading-tight truncate w-full">{homeTeam?.displayName ?? match.team1 ?? 'TBC'}</p>
        </div>

        {/* Score or vs */}
        <div className="flex flex-col items-center shrink-0 min-w-[52px]">
          {hasScore ? (
            <p className="text-[20px] font-semibold tracking-[-0.02em] leading-none text-[#0a0a0a]">
              {match.score1}–{match.score2}
            </p>
          ) : (
            <p className="text-[12px] font-medium text-[#0a0a0a]/30 uppercase tracking-[0.06em]">vs</p>
          )}
        </div>

        {/* Away */}
        <div className="flex-1 flex flex-col items-end gap-0.5 min-w-0">
          <span className="text-[22px] leading-none">{awayTeam?.flag ?? '🏳️'}</span>
          <p className="text-[13px] font-semibold leading-tight truncate w-full text-right">{awayTeam?.displayName ?? match.team2 ?? 'TBC'}</p>
        </div>
      </div>

      {/* Owner names + points (only when at least one team is owned) */}
      {(homeOwnerName || awayOwnerName) && (
        <div className="flex items-start justify-between pt-2 border-t border-[#0a0a0a]/10">
          <div className="flex flex-col gap-0.5 min-w-0">
            {homeOwnerName ? (
              <>
                <p className="text-[11px] font-medium text-[#0a0a0a]/60 truncate">{homeOwnerName}</p>
                {isComplete && (
                  <p className="text-[11px] text-[#0a0a0a]/40">
                    {calcMatchPoints(match.team1, match)} pts
                  </p>
                )}
              </>
            ) : <span />}
          </div>
          <div className="flex flex-col gap-0.5 items-end min-w-0">
            {awayOwnerName ? (
              <>
                <p className="text-[11px] font-medium text-[#0a0a0a]/60 truncate">{awayOwnerName}</p>
                {isComplete && (
                  <p className="text-[11px] text-[#0a0a0a]/40 text-right">
                    {calcMatchPoints(match.team2, match)} pts
                  </p>
                )}
              </>
            ) : <span />}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Fixtures({ context }) {
  const [fixtures, setFixtures] = useState([])
  const [ownerByTeamName, setOwnerByTeamName] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (USE_DUMMY) {
      setFixtures(DUMMY_FIXTURES)
      setOwnerByTeamName(DUMMY_OWNERS)
      setLoading(false)
      return
    }

    async function load() {
      try {
        const promises = [fetchFixtures(), fetchManualResults().catch(() => [])]

        if (context) {
          promises.push(
            supabase.from('draft_session').select().eq('group_id', context.group.id).maybeSingle(),
            supabase.from('group_members').select().eq('group_id', context.group.id),
          )
        }

        const [fixturesData, manual, sessionRes, membersRes] = await Promise.all(promises)
        setFixtures(applyManual(fixturesData, manual))

        if (context && sessionRes?.data && membersRes?.data) {
          const picksRes = await supabase
            .from('draft_picks')
            .select()
            .eq('draft_session_id', sessionRes.data.id)

          if (picksRes.data) {
            const members = membersRes.data
            const lookup = {}
            picksRes.data.forEach(pick => {
              const team = getTeamById(pick.team_id)
              const member = members.find(m => m.id === pick.group_member_id)
              if (team && member) {
                lookup[team.name] = member.display_name
                if (team.apiName) lookup[team.apiName] = member.display_name
              }
            })
            setOwnerByTeamName(lookup)
          }
        }
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [context])

  // Light auto-refresh so manual/API score changes appear without a reload.
  useEffect(() => {
    if (USE_DUMMY) return
    const id = setInterval(() => {
      if (document.hidden) return
      Promise.all([fetchFixtures(), fetchManualResults().catch(() => [])])
        .then(([fx, manual]) => setFixtures(applyManual(fx, manual)))
        .catch(() => {})
    }, 60000)
    return () => clearInterval(id)
  }, [])

  const now = new Date()
  const nextMatch = fixtures.find(m => m.score1 == null && m.date && new Date(m.date) > now)
  const heroText = nextMatch
    ? `Next up: ${nextMatch.team1 ? getDisplayName(nextMatch.team1) : 'TBC'} vs ${nextMatch.team2 ? getDisplayName(nextMatch.team2) : 'TBC'}`
    : 'Fixtures'

  const sorted = [...fixtures].sort((a, b) => {
    const dateA = a.date ? new Date(a.date) : Infinity
    const dateB = b.date ? new Date(b.date) : Infinity
    if (dateA - dateB !== 0) return dateA - dateB
    return (a.stage ?? '').localeCompare(b.stage ?? '')
  })

  const groups = sorted.reduce((acc, match) => {
    const key = toAESTDateKey(match.date)
    if (!acc[key]) acc[key] = []
    acc[key].push(match)
    return acc
  }, {})

  return (
    <div>
      <div className="py-16 lg:py-[91px]">
        <h1
          className="text-[40px] sm:text-[56px] lg:text-[72px] font-semibold leading-none"
          style={{ letterSpacing: '-2.88px' }}
        >
          {loading ? 'Fixtures' : heroText}
        </h1>
      </div>

      {loading && <p className="text-[14px] text-[#0a0a0a]/50">Loading fixtures…</p>}
      {error && <p className="text-[14px] text-red-600">Could not load fixtures — {error}</p>}
      {!loading && !error && fixtures.length === 0 && (
        <p className="text-[14px] text-[#0a0a0a]/50">No fixtures available yet.</p>
      )}

      {!loading && !error && (
        <div className="pb-16 flex flex-col gap-10">
          {Object.entries(groups).map(([dateLabel, matches]) => (
            <div key={dateLabel} className="flex flex-col gap-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#0a0a0a]/40">
                {dateLabel}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {matches.map((match, i) => (
                  <MatchCard
                    key={`${match.team1}-${match.team2}-${match.date}-${i}`}
                    match={match}
                    ownerByTeamName={ownerByTeamName}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
