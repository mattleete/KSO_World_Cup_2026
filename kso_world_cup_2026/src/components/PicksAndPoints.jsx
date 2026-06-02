import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getTeamById, getTeamByName } from '../data/teams'
import { fetchResults } from '../utils/api'
import { calcMatchPoints } from '../utils/scoring'
import { DUMMY_RESULTS } from '../data/dummyResults'
import { DUMMY_DRAFT_PLAYERS, DUMMY_ALL_PICKS } from '../data/dummyFixtures'

const USE_DUMMY = false // set to true to use dummy data for UI testing

// Individual match results for a single team
function getTeamMatches(teamName, results) {
  return results
    .filter(m => m.team1 === teamName || m.team2 === teamName)
    .map(match => {
      const isHome   = match.team1 === teamName
      const myScore  = isHome ? match.score1 : match.score2
      const oppScore = isHome ? match.score2 : match.score1
      const result   = myScore > oppScore ? 'W' : myScore === oppScore ? 'D' : 'L'
      return {
        stage:    match.stage,
        opponent: isHome ? match.team2 : match.team1,
        myScore,
        oppScore,
        result,
        pts: calcMatchPoints(teamName, match),
      }
    })
}

// W / D / L / GF / GA / pts for a single team across all results
function getTeamStats(teamName, results) {
  let W = 0, D = 0, L = 0, GF = 0, GA = 0, pts = 0
  results.forEach(match => {
    const isHome = match.team1 === teamName
    const isAway = match.team2 === teamName
    if (!isHome && !isAway) return
    const myScore  = isHome ? match.score1 : match.score2
    const oppScore = isHome ? match.score2 : match.score1
    GF += myScore
    GA += oppScore
    if (myScore > oppScore) W++
    else if (myScore === oppScore) D++
    else L++
    pts += calcMatchPoints(teamName, match)
  })
  return { W, D, L, GF, GA, pts }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TeamStatRow({ team, stats, dark, divider }) {
  const muted = dark ? 'text-white/50' : 'text-[#0a0a0a]/50'
  const border = dark ? 'border-white/10' : 'border-[#0a0a0a]/8'
  return (
    <div className={`flex items-center gap-2 py-2 ${divider ? `border-t ${border}` : ''}`}>
      <span className="text-[16px] leading-none shrink-0">{team.flag}</span>
      <p className={`flex-1 min-w-0 truncate text-[13px] font-semibold ${dark ? 'text-white' : ''}`}>
        {team.name}
      </p>
      {/* W·D·L */}
      <p className={`shrink-0 text-[11px] tabular-nums ${muted}`}>
        {stats.W}W {stats.D}D {stats.L}L
      </p>
      {/* GF:GA */}
      <p className={`shrink-0 w-12 text-right text-[11px] tabular-nums ${muted}`}>
        {stats.GF}:{stats.GA}
      </p>
      {/* points */}
      <p className={`shrink-0 w-10 text-right text-[13px] font-semibold tabular-nums ${dark ? 'text-white' : ''}`}>
        {stats.pts}
      </p>
    </div>
  )
}

function MatchResultRow({ match, dark }) {
  const opponent = getTeamByName(match.opponent)
  const resultColour = match.result === 'W'
    ? 'text-green-500'
    : match.result === 'D'
      ? dark ? 'text-white/30' : 'text-[#0a0a0a]/30'
      : 'text-red-400'

  return (
    <div className={`flex items-center gap-2 sm:gap-3 py-1.5 border-b last:border-0 ${dark ? 'border-white/8' : 'border-[#0a0a0a]/6'}`}>
      <p className={`text-[10px] w-14 sm:w-24 shrink-0 truncate ${dark ? 'text-white/30' : 'text-[#0a0a0a]/40'}`}>{match.stage}</p>
      <span className="text-[15px] leading-none shrink-0">{opponent?.flag ?? '🏳️'}</span>
      <p className={`text-[12px] flex-1 min-w-0 truncate ${dark ? 'text-white/70' : 'text-[#0a0a0a]/70'}`}>{match.opponent}</p>
      <p className={`text-[12px] font-mono tabular-nums shrink-0 ${dark ? 'text-white' : ''}`}>
        {match.myScore}–{match.oppScore}
      </p>
      <p className={`text-[11px] font-bold w-4 shrink-0 ${resultColour}`}>{match.result}</p>
      <p className={`text-[12px] font-semibold w-10 text-right shrink-0 ${dark ? 'text-white' : ''}`}>
        {match.pts > 0 ? `+${match.pts}` : '0'}
      </p>
    </div>
  )
}

function TeamMatchList({ team, results, dark, divider }) {
  const matches = getTeamMatches(team.name, results)
  return (
    <div className={divider ? 'mb-4' : ''}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[15px] leading-none">{team.flag}</span>
        <p className={`text-[11px] font-semibold uppercase tracking-[0.06em] ${dark ? 'text-white/60' : 'text-[#0a0a0a]/50'}`}>
          {team.name}
        </p>
      </div>
      {matches.length === 0 ? (
        <p className={`text-[12px] ${dark ? 'text-white/30' : 'text-[#0a0a0a]/30'}`}>No matches played yet</p>
      ) : (
        <div>
          {matches.map((m, i) => (
            <MatchResultRow key={i} match={m} dark={dark} />
          ))}
        </div>
      )}
    </div>
  )
}

function PlayerCard({ rank, name, teams, results, isMe }) {
  const [expanded, setExpanded] = useState(false)
  const statsPerTeam = teams.map(t => getTeamStats(t.name, results))
  const total = statsPerTeam.reduce((s, st) => s + st.pts, 0)
  const border = isMe ? 'border-white/10' : 'border-[#0a0a0a]/8'

  return (
    <div className={`rounded-lg overflow-hidden ${isMe ? 'bg-[#0a0a0a] text-white' : 'bg-[#f7f7f7]'}`}>

      {/* Summary header — clickable */}
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        aria-expanded={expanded}
        className="w-full flex items-center gap-3 px-3 py-3 text-left cursor-pointer bg-transparent border-none"
      >
        <span className={`w-7 shrink-0 text-center text-[18px] font-semibold ${isMe ? 'text-white/40' : 'text-[#0a0a0a]/30'}`}>
          {rank}
        </span>
        <div className="flex-1 min-w-0">
          <p className={`text-[15px] font-semibold leading-tight truncate ${isMe ? 'text-white' : ''}`}>{name}</p>
          {isMe && <p className="text-[10px] text-white/50">You</p>}
        </div>
        <p className={`text-[22px] font-semibold tabular-nums shrink-0 ${isMe ? 'text-white' : ''}`}>{total}</p>
        <span className={`shrink-0 text-[10px] ${isMe ? 'text-white/30' : 'text-[#0a0a0a]/30'}`}>
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {/* Team stat rows */}
      <div className="px-3 pb-2">
        {teams.length === 0 ? (
          <p className={`text-[12px] pb-2 ${isMe ? 'text-white/40' : 'text-[#0a0a0a]/40'}`}>No teams drafted yet</p>
        ) : (
          teams.map((team, i) => (
            <TeamStatRow
              key={team.id}
              team={team}
              stats={statsPerTeam[i]}
              dark={isMe}
              divider={i > 0}
            />
          ))
        )}
      </div>

      {/* Expanded per-match detail */}
      {expanded && teams.length > 0 && (
        <div className={`px-4 py-3 border-t ${border}`}>
          {teams.map((team, i) => (
            <TeamMatchList
              key={team.id}
              team={team}
              results={results}
              dark={isMe}
              divider={i < teams.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function Hero({ children }) {
  return (
    <div className="py-16 lg:py-[91px]">
      <h1
        className="text-[40px] sm:text-[56px] lg:text-[72px] font-semibold leading-none"
        style={{ letterSpacing: '-2.88px' }}
      >
        {children}
      </h1>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PicksAndPoints({ context, onJoinLeague, onCreateLeague }) {
  const [members, setMembers] = useState([])
  const [picks, setPicks] = useState([])
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(!USE_DUMMY)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (USE_DUMMY) {
      setMembers(DUMMY_DRAFT_PLAYERS)
      setPicks(DUMMY_ALL_PICKS)
      setResults(DUMMY_RESULTS)
      setLoading(false)
      return
    }

    if (!context) {
      setLoading(false)
      return
    }

    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [sessionRes, membersRes, resultsData] = await Promise.all([
          supabase.from('draft_session').select().eq('group_id', context.group.id).maybeSingle(),
          supabase.from('group_members').select().eq('group_id', context.group.id),
          // Don't let an API hiccup blank the whole leaderboard — fall back to no results.
          fetchResults().catch(() => []),
        ])

        let sessionPicks = []
        if (sessionRes.data) {
          const picksRes = await supabase
            .from('draft_picks')
            .select()
            .eq('draft_session_id', sessionRes.data.id)
          sessionPicks = picksRes.data || []
        }

        if (cancelled) return
        setMembers(membersRes.data || [])
        setPicks(sessionPicks)
        setResults(resultsData || [])
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [context])

  // No active league — prompt the user to join or create one.
  if (!USE_DUMMY && !context) {
    return (
      <div>
        <Hero>Picks &amp; Points</Hero>
        <div className="flex flex-col gap-4 max-w-sm">
          <p className="text-[16px] text-[#0a0a0a]/50">
            Join or create a league to see picks and points.
          </p>
          <div className="flex gap-2">
            <button
              onClick={onJoinLeague}
              className="flex-1 bg-[#0a0a0a] text-white rounded-lg px-4 py-3 text-[13px] font-medium uppercase tracking-[0.08em] cursor-pointer"
            >
              Join a league
            </button>
            <button
              onClick={onCreateLeague}
              className="flex-1 bg-[#e9e9e9] rounded-lg px-4 py-3 text-[13px] font-medium uppercase tracking-[0.08em] cursor-pointer hover:bg-[#e0e0e0] transition-colors"
            >
              Create a league
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div>
        <Hero>Picks &amp; Points</Hero>
        <p className="text-[14px] text-[#0a0a0a]/50">Loading…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <Hero>Picks &amp; Points</Hero>
        <p className="text-[14px] text-red-600">Couldn't load picks &amp; points — {error}</p>
      </div>
    )
  }

  // Group picks by player id → [team, …]
  const picksByPlayer = {}
  picks.forEach(pick => {
    const team = getTeamById(pick.team_id)
    if (!team) return
    if (!picksByPlayer[pick.group_member_id]) picksByPlayer[pick.group_member_id] = []
    picksByPlayer[pick.group_member_id].push(team)
  })

  // Build sorted leaderboard
  const players = members
    .map(p => {
      const teams = picksByPlayer[p.id] || []
      const total = teams.reduce((s, t) => s + getTeamStats(t.name, results).pts, 0)
      return { ...p, teams, total }
    })
    .sort((a, b) => b.total - a.total || a.display_name.localeCompare(b.display_name))

  const myId = USE_DUMMY ? null : context?.membership?.id
  const anyPicks = picks.length > 0

  if (!anyPicks) {
    return (
      <div>
        <Hero>Picks &amp; Points</Hero>
        <p className="text-[14px] text-[#0a0a0a]/50">
          No picks yet — points will appear here once the draft is done.
        </p>
      </div>
    )
  }

  const leader = players[0]
  const heroText = leader?.total > 0 ? `${leader.display_name} is leading` : 'Picks & Points'

  return (
    <div>
      <Hero>{heroText}</Hero>

      {/* Legend */}
      <div className="flex items-center justify-end gap-3 mb-2 pr-3 text-[10px] uppercase tracking-[0.08em] text-[#0a0a0a]/40">
        <span>W·D·L</span>
        <span>GF:GA</span>
        <span className="w-10 text-right">Pts</span>
      </div>

      {/* Player cards */}
      <div className="flex flex-col gap-1.5 pb-16">
        {players.map((player, i) => (
          <PlayerCard
            key={player.id}
            rank={i + 1}
            name={player.display_name}
            teams={player.teams}
            results={results}
            isMe={USE_DUMMY ? player.display_name === 'Matt' : player.id === myId}
          />
        ))}
      </div>
    </div>
  )
}
