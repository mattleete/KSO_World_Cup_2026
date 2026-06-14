import { useFixtureData } from '../hooks/useFixtureData'
import CollapsibleSection from './CollapsibleSection'
import { MatchGrid } from './MatchCard'
import GroupStandings from './GroupStandings'
import { aestDateKey, todayKey, yesterdayKey, isPlayed } from '../utils/fixtures'

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']
const byDateDesc = (a, b) => (b.date ? new Date(b.date) : -Infinity) - (a.date ? new Date(a.date) : -Infinity)

function EmptyNote({ children }) {
  return <p className="text-[13px] text-[#0a0a0a]/40">{children}</p>
}

export default function Results({ context }) {
  const { fixtures, ownerByTeamName, myTeamNames, loading, error } = useFixtureData(context)

  const today     = todayKey()
  const yesterday = yesterdayKey()

  const todayMatches     = fixtures.filter(m => aestDateKey(m.date) === today).sort(byDateDesc)
  const yesterdayMatches = fixtures.filter(m => aestDateKey(m.date) === yesterday).sort(byDateDesc)
  const completed        = fixtures.filter(isPlayed).sort(byDateDesc)

  const grid = matches => (
    <MatchGrid matches={matches} ownerByTeamName={ownerByTeamName} myTeamNames={myTeamNames} />
  )

  return (
    <div>
      <div className="py-16 lg:py-[91px]">
        <h1 className="text-[40px] sm:text-[56px] lg:text-[72px] font-semibold leading-none" style={{ letterSpacing: '-2.88px' }}>
          Results
        </h1>
      </div>

      {loading && <p className="text-[14px] text-[#0a0a0a]/50">Loading results…</p>}
      {error && <p className="text-[14px] text-red-600">Could not load results — {error}</p>}

      {!loading && !error && (
        <div className="pb-16 flex flex-col gap-10">
          <CollapsibleSection title="Today's matches" count={todayMatches.length} defaultOpen>
            {todayMatches.length ? grid(todayMatches) : <EmptyNote>No matches today.</EmptyNote>}
          </CollapsibleSection>

          <CollapsibleSection title="Yesterday's matches" count={yesterdayMatches.length} defaultOpen>
            {yesterdayMatches.length ? grid(yesterdayMatches) : <EmptyNote>No matches yesterday.</EmptyNote>}
          </CollapsibleSection>

          <CollapsibleSection title="Group standings" defaultOpen={false}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {GROUPS.map(g => (
                <GroupStandings key={g} group={g} fixtures={fixtures} myTeamNames={myTeamNames} />
              ))}
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="All completed matches" count={completed.length} defaultOpen={false}>
            {completed.length ? grid(completed) : <EmptyNote>No completed matches yet.</EmptyNote>}
          </CollapsibleSection>
        </div>
      )}
    </div>
  )
}
