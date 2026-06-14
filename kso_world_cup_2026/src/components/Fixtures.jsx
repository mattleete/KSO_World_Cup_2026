import { useFixtureData } from '../hooks/useFixtureData'
import CollapsibleSection from './CollapsibleSection'
import { MatchGrid } from './MatchCard'
import { getDisplayName } from '../data/teams'
import {
  aestDateKey, todayKey, shortDayLabel,
  isPlayed, isGroupStage, isKnockout, bothTeamsKnown,
} from '../utils/fixtures'

const byDateAsc = (a, b) => (a.date ? new Date(a.date) : Infinity) - (b.date ? new Date(b.date) : Infinity)
const byDateDesc = (a, b) => (b.date ? new Date(b.date) : -Infinity) - (a.date ? new Date(a.date) : -Infinity)

function EmptyNote({ children }) {
  return <p className="text-[13px] text-[#0a0a0a]/40">{children}</p>
}

export default function Fixtures({ context }) {
  const { fixtures, ownerByTeamName, myTeamNames, loading, error } = useFixtureData(context)

  const today = todayKey()

  // Only games still to come or in progress — completed games live in Results.
  const todayMatches  = fixtures.filter(m => aestDateKey(m.date) === today && !isPlayed(m)).sort(byDateDesc)
  const upcomingGroup = fixtures.filter(m => isGroupStage(m.stage) && !isPlayed(m)).sort(byDateAsc)
  const upcomingKnockout = fixtures
    .filter(m => isKnockout(m.stage) && !isPlayed(m) && bothTeamsKnown(m))
    .sort(byDateAsc)

  const now = new Date()
  const nextMatch = fixtures.find(m => m.score1 == null && m.date && new Date(m.date) > now)
  const heroText = nextMatch
    ? `Next up: ${nextMatch.team1 ? getDisplayName(nextMatch.team1) : 'TBC'} vs ${nextMatch.team2 ? getDisplayName(nextMatch.team2) : 'TBC'}`
    : 'Fixtures'

  const grid = matches => (
    <MatchGrid matches={matches} ownerByTeamName={ownerByTeamName} myTeamNames={myTeamNames} />
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
          <CollapsibleSection title={`Today's matches · ${shortDayLabel(new Date())}`} count={todayMatches.length} defaultOpen>
            {todayMatches.length ? grid(todayMatches) : <EmptyNote>No matches today.</EmptyNote>}
          </CollapsibleSection>

          <CollapsibleSection title="Upcoming group stage" count={upcomingGroup.length} defaultOpen={false}>
            {upcomingGroup.length ? grid(upcomingGroup) : <EmptyNote>Group stage complete.</EmptyNote>}
          </CollapsibleSection>

          <CollapsibleSection title="Upcoming knockout stage" count={upcomingKnockout.length} defaultOpen={false}>
            {upcomingKnockout.length ? grid(upcomingKnockout) : <EmptyNote>Knockout matchups are set once the group stage finishes.</EmptyNote>}
          </CollapsibleSection>
        </div>
      )}
    </div>
  )
}
