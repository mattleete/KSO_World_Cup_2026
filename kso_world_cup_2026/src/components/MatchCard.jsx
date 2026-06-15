import { getTeamByName } from '../data/teams'
import { calcMatchPoints } from '../utils/scoring'
import { aestDateKey, isLive, isPlayed, formatCountdown, shortDayLabel, toAESTTimeLabel } from '../utils/fixtures'

// Responsive grid of match tiles: full-width single column on mobile, 3/4
// columns on larger screens.
export function MatchGrid({ matches, ownerByTeamName, myTeamNames }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-2">
      {matches.map((match, i) => (
        <MatchCard
          key={`${match.team1}-${match.team2}-${match.date}-${i}`}
          match={match}
          ownerByTeamName={ownerByTeamName}
          mine={myTeamNames?.has(match.team1) || myTeamNames?.has(match.team2)}
        />
      ))}
    </div>
  )
}

// Cluster an already-sorted match list into per-day groups (insertion order
// preserved), each under a "Day, Date" header. Used by the multi-day sections.
export function MatchDateGroups({ matches, ownerByTeamName, myTeamNames }) {
  const groups = []
  const index = new Map()
  for (const m of matches) {
    const key = m.date ? aestDateKey(m.date) : 'TBC'
    if (!index.has(key)) { index.set(key, groups.length); groups.push({ key, date: m.date, matches: [] }) }
    groups[index.get(key)].matches.push(m)
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map(g => (
        <div key={g.key} className="flex flex-col gap-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#0a0a0a]/40">
            {g.date ? shortDayLabel(g.date) : 'Date TBC'}
          </p>
          <MatchGrid matches={g.matches} ownerByTeamName={ownerByTeamName} myTeamNames={myTeamNames} />
        </div>
      ))}
    </div>
  )
}

// One match tile — used in the desktop grid and as a full-width mobile tile.
// `mine` marks a game involving a team the current user drafted.
export default function MatchCard({ match, ownerByTeamName, mine = false }) {
  const homeOwnerName = ownerByTeamName?.[match.team1] ?? null
  const awayOwnerName = ownerByTeamName?.[match.team2] ?? null
  const homeTeam = getTeamByName(match.team1)
  const awayTeam = getTeamByName(match.team2)
  const hasScore = match.score1 != null && match.score2 != null
  const live = isLive(match)
  const complete = isPlayed(match)
  const countdown = !hasScore && !live ? formatCountdown(match.date) : null

  // Always render a border so the live green border doesn't change card size
  // relative to its neighbours in the grid.
  const cardClass = live
    ? 'bg-[#f7f7f7] border border-green-500'
    : complete
      ? 'bg-[#e0e0e0] border border-transparent'
      : 'bg-[#f7f7f7] border border-transparent'
  const mineClass = mine ? 'ring-1 ring-[#0a0a0a]/30' : ''

  return (
    <div className={`rounded-[6px] px-4 py-3 flex flex-col gap-3 ${cardClass} ${mineClass}`}>
      {/* Stage · status on the left; date · kickoff time (AEST) top-right */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {live && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />}
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#0a0a0a]/40 truncate">
            {live
              ? `${match.stage ?? 'TBC'} · Live`
              : complete
                ? `${match.stage ?? 'TBC'} · Full time`
                : countdown
                  ? `${match.stage ?? 'TBC'} · ${countdown}`
                  : (match.stage ?? 'TBC')}
          </p>
        </div>
        {match.date && (
          <p className="text-[10px] font-medium text-[#0a0a0a]/40 text-right shrink-0 whitespace-nowrap">
            {shortDayLabel(match.date)} · {toAESTTimeLabel(match.date)}
          </p>
        )}
      </div>

      {/* Teams + score */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex flex-col items-start gap-0.5 min-w-0">
          <span className="text-[22px] leading-none">{homeTeam?.flag ?? '🏳️'}</span>
          <p className="text-[13px] font-semibold leading-tight truncate w-full">{homeTeam?.displayName ?? match.team1 ?? 'TBC'}</p>
        </div>

        <div className="flex flex-col items-center shrink-0 min-w-[52px]">
          {hasScore ? (
            <p className="text-[20px] font-semibold tracking-[-0.02em] leading-none text-[#0a0a0a]">
              {match.score1}–{match.score2}
            </p>
          ) : (
            <p className="text-[12px] font-medium text-[#0a0a0a]/30 uppercase tracking-[0.06em]">vs</p>
          )}
        </div>

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
                {complete && (
                  <p className="text-[11px] text-[#0a0a0a]/40">{calcMatchPoints(match.team1, match)} pts</p>
                )}
              </>
            ) : <span />}
          </div>
          <div className="flex flex-col gap-0.5 items-end min-w-0">
            {awayOwnerName ? (
              <>
                <p className="text-[11px] font-medium text-[#0a0a0a]/60 truncate">{awayOwnerName}</p>
                {complete && (
                  <p className="text-[11px] text-[#0a0a0a]/40 text-right">{calcMatchPoints(match.team2, match)} pts</p>
                )}
              </>
            ) : <span />}
          </div>
        </div>
      )}
    </div>
  )
}
