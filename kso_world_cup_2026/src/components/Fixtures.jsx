import { useFixtureData } from '../hooks/useFixtureData'
import CollapsibleSection from './CollapsibleSection'
import { MatchGrid, MatchDateGroups } from './MatchCard'
import { useTeamFilter } from './TeamFilter'
import { getDisplayName } from '../data/teams'
import {
  aestDateKey, todayKey, shortDayLabel,
  isLive, isPlayed, isGroupStage, isKnockout, bothTeamsKnown,
} from '../utils/fixtures'

const byDateAsc = (a, b) => (a.date ? new Date(a.date) : Infinity) - (b.date ? new Date(b.date) : Infinity)
const byDateDesc = (a, b) => (b.date ? new Date(b.date) : -Infinity) - (a.date ? new Date(a.date) : -Infinity)

function EmptyNote({ children }) {
  return <p className="text-[13px] text-[#0a0a0a]/40">{children}</p>
}

export default function Fixtures({ context }) {
  const { fixtures, ownerByTeamName, myTeamNames, loading, error } = useFixtureData(context)

  const { FilterBar, apply } = useTeamFilter(myTeamNames)
  const today = todayKey()

  // Only games still to come or in progress — completed games live in Results.
  const todayMatches  = apply(fixtures.filter(m => aestDateKey(m.date) === today && !isPlayed(m)).sort(byDateDesc))
  // Exclude today's games — they're already shown in the Today's matches section.
  const upcomingGroup = apply(fixtures.filter(m => isGroupStage(m.stage) && !isPlayed(m) && aestDateKey(m.date) !== today).sort(byDateAsc))
  const upcomingKnockout = apply(fixtures
    .filter(m => isKnockout(m.stage) && !isPlayed(m) && bothTeamsKnown(m))
    .sort(byDateAsc))

  const teamsLabel = m => `${m.team1 ? getDisplayName(m.team1) : 'TBC'} vs ${m.team2 ? getDisplayName(m.team2) : 'TBC'}`

  const now = new Date()
  const liveMatch = fixtures.find(isLive)
  const nextMatch = fixtures.find(m => m.score1 == null && m.date && new Date(m.date) > now)
  const heroText = liveMatch
    ? `LIVE: ${teamsLabel(liveMatch)}`
    : nextMatch
      ? `Next up: ${teamsLabel(nextMatch)}`
      : 'Fixtures'

  const grid = matches => (
    <MatchGrid matches={matches} ownerByTeamName={ownerByTeamName} myTeamNames={myTeamNames} />
  )
  const datedGrid = matches => (
    <MatchDateGroups matches={matches} ownerByTeamName={ownerByTeamName} myTeamNames={myTeamNames} />
  )

  return (
    <div>
      <div className="py-16 lg:py-[91px]">
        <h1 className="text-[40px] sm:text-[56px] lg:text-[72px] font-semibold leading-none" style={{ letterSpacing: '-2.88px' }}>
          {loading ? 'Fixtures' : heroText}
        </h1>
      </div>

      {loading && <p className="text-[14px] text-[#0a0a0a]/50">Loading fixtures…</p>}
      {error && <p className="text-[14px] text-red-600">Could not load fixtures — {error}</p>}

      {!loading && !error && (
        <div className="pb-16 flex flex-col gap-10">
          {FilterBar}

          <CollapsibleSection title={`Today's matches · ${shortDayLabel(new Date())}`} count={todayMatches.length} defaultOpen>
            {todayMatches.length ? grid(todayMatches) : <EmptyNote>No matches today.</EmptyNote>}
          </CollapsibleSection>

          <CollapsibleSection title="Upcoming group stage" count={upcomingGroup.length} defaultOpen={false}>
            {upcomingGroup.length ? datedGrid(upcomingGroup) : <EmptyNote>Group stage complete.</EmptyNote>}
          </CollapsibleSection>

          <CollapsibleSection title="Upcoming knockout stage" count={upcomingKnockout.length} defaultOpen={false}>
            {upcomingKnockout.length ? datedGrid(upcomingKnockout) : <EmptyNote>Knockout matchups are set once the group stage finishes.</EmptyNote>}
          </CollapsibleSection>
        </div>
      )}
    </div>
  )
}
