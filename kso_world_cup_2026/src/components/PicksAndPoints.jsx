import { useState } from 'react'
import { TEAMS, getTeamById, getTeamByName } from '../data/teams'
import { DUMMY_RESULTS } from '../data/dummyResults'
import { DUMMY_DRAFT_PLAYERS, DUMMY_ALL_PICKS } from '../data/dummyFixtures'
import { calcMatchPoints } from '../utils/scoring'

const USE_DUMMY = true

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

function ColHeader({ children, className = '' }) {
  return (
    <p className={`text-[10px] font-medium uppercase tracking-[0.08em] text-[#0a0a0a]/40 ${className}`}>
      {children}
    </p>
  )
}

function TeamRow({ team, stats, divider }) {
  return (
    <div className={`flex items-center gap-0 ${divider ? 'border-b border-[#0a0a0a]/8' : ''}`}>
      {/* Country */}
      <div className="flex items-center gap-2 w-[160px] shrink-0 py-2.5">
        <span className="text-[18px] leading-none shrink-0">{team.flag}</span>
        <p className="text-[12px] font-semibold truncate">{team.name}</p>
      </div>
      {/* Stats */}
      <p className="w-9 text-center text-[12px] text-[#0a0a0a]/60 py-2.5">{stats.W}</p>
      <p className="w-9 text-center text-[12px] text-[#0a0a0a]/60 py-2.5">{stats.D}</p>
      <p className="w-9 text-center text-[12px] text-[#0a0a0a]/60 py-2.5">{stats.L}</p>
      <p className="w-9 text-center text-[12px] text-[#0a0a0a]/60 py-2.5">{stats.GF}</p>
      <p className="w-9 text-center text-[12px] text-[#0a0a0a]/60 py-2.5">{stats.GA}</p>
      <p className="w-14 text-right text-[12px] font-semibold text-[#0a0a0a] py-2.5 pr-1">{stats.pts}</p>
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
    <div className={`flex items-center gap-3 py-1.5 border-b last:border-0 ${dark ? 'border-white/8' : 'border-[#0a0a0a]/6'}`}>
      <p className={`text-[10px] w-24 shrink-0 ${dark ? 'text-white/30' : 'text-[#0a0a0a]/40'}`}>{match.stage}</p>
      <span className="text-[15px] leading-none shrink-0">{opponent?.flag ?? '🏳️'}</span>
      <p className={`text-[12px] flex-1 truncate ${dark ? 'text-white/70' : 'text-[#0a0a0a]/70'}`}>{match.opponent}</p>
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
      <div className={`flex items-center gap-2 mb-1.5`}>
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

      {/* Summary row — clickable */}
      <div
        className="flex items-stretch cursor-pointer select-none"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Rank */}
        <div className={`flex items-center justify-center w-12 shrink-0 border-r ${border}`}>
          <p className={`text-[18px] font-semibold ${isMe ? 'text-white/40' : 'text-[#0a0a0a]/30'}`}>{rank}</p>
        </div>

        {/* Name */}
        <div className={`flex items-center w-[90px] shrink-0 px-3 border-r ${border}`}>
          <div>
            <p className={`text-[13px] font-semibold leading-tight ${isMe ? 'text-white' : ''}`}>{name}</p>
            {isMe && <p className="text-[10px] text-white/50">You</p>}
          </div>
        </div>

        {/* Team stat rows */}
        <div className={`flex-1 flex flex-col px-3 border-r overflow-x-auto ${border}`}>
          {teams.map((team, i) => (
            <TeamRow
              key={team.id}
              team={team}
              stats={statsPerTeam[i]}
              divider={i < teams.length - 1}
            />
          ))}
        </div>

        {/* Total + chevron */}
        <div className="flex items-center justify-end gap-1.5 w-16 shrink-0 px-3">
          <p className={`text-[20px] font-semibold tabular-nums ${isMe ? 'text-white' : ''}`}>{total}</p>
          <p className={`text-[10px] mt-0.5 ${isMe ? 'text-white/30' : 'text-[#0a0a0a]/30'}`}>
            {expanded ? '▲' : '▼'}
          </p>
        </div>
      </div>

      {/* Expanded match detail */}
      {expanded && (
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

// ── Main component ────────────────────────────────────────────────────────────

export default function PicksAndPoints({ context }) {
  const results = USE_DUMMY ? DUMMY_RESULTS : []
  const rawPlayers = USE_DUMMY ? DUMMY_DRAFT_PLAYERS : []
  const allPicks   = USE_DUMMY ? DUMMY_ALL_PICKS   : []

  // Group picks by player id → [team, team]
  const picksByPlayer = {}
  allPicks.forEach(pick => {
    const team = getTeamById(pick.team_id)
    if (!team) return
    if (!picksByPlayer[pick.group_member_id]) picksByPlayer[pick.group_member_id] = []
    picksByPlayer[pick.group_member_id].push(team)
  })

  // Build sorted leaderboard
  const players = rawPlayers
    .map(p => {
      const teams = picksByPlayer[p.id] || []
      const total = teams.reduce((s, t) => s + getTeamStats(t.name, results).pts, 0)
      return { ...p, teams, total }
    })
    .sort((a, b) => b.total - a.total || a.display_name.localeCompare(b.display_name))

  const leader = players[0]
  const heroText = leader?.total > 0
    ? `${leader.display_name} is leading`
    : 'Picks & Points'

  return (
    <div>
      <div className="py-16 lg:py-[91px]">
        <h1
          className="text-[40px] sm:text-[56px] lg:text-[72px] font-semibold leading-none"
          style={{ letterSpacing: '-2.88px' }}
        >
          {heroText}
        </h1>
      </div>

      {/* Column headers — match PlayerCard layout exactly */}
      <div className="flex items-center mb-1 overflow-x-auto">
        {/* rank */}
        <div className="w-12 shrink-0" />
        {/* name */}
        <div className="w-[90px] shrink-0 px-3">
          <ColHeader>Player</ColHeader>
        </div>
        {/* stat headers */}
        <div className="flex-1 flex items-center px-3 min-w-0">
          <div className="w-[160px] shrink-0">
            <ColHeader>Country</ColHeader>
          </div>
          <ColHeader className="w-9 text-center">W</ColHeader>
          <ColHeader className="w-9 text-center">D</ColHeader>
          <ColHeader className="w-9 text-center">L</ColHeader>
          <ColHeader className="w-9 text-center">GF</ColHeader>
          <ColHeader className="w-9 text-center">GA</ColHeader>
          <ColHeader className="w-14 text-right pr-1">Pts</ColHeader>
        </div>
        {/* total */}
        <div className="w-16 shrink-0 px-4">
          <ColHeader className="text-right">Total</ColHeader>
        </div>
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
            isMe={player.display_name === 'Matt'}
          />
        ))}
      </div>
    </div>
  )
}
