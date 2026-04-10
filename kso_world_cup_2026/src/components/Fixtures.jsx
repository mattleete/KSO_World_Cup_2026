import { useState, useEffect } from 'react'
import { fetchFixtures, toAEST } from '../utils/api'
import { getOwnerByTeamName } from '../data/players'
import { getTeamByName } from '../data/teams'

function FixtureRow({ match }) {
  const homeOwner = getOwnerByTeamName(match.team1)
  const awayOwner = getOwnerByTeamName(match.team2)
  const homeTeam  = getTeamByName(match.team1)
  const awayTeam  = getTeamByName(match.team2)
  const hasScore  = match.score1 !== null && match.score2 !== null

  return (
    <div className="flex flex-col gap-2">
      {/* Date / score line */}
      <p className="text-[24px] font-semibold leading-[1.1] tracking-[-0.02em] text-center">
        {hasScore
          ? `${match.score1} – ${match.score2}`
          : match.date ? toAEST(match.date) : 'TBC'
        }
      </p>

      {/* Teams row */}
      <div className="flex items-center gap-4">
        {/* Home side: player · country · flag */}
        <div className="flex-1 flex items-center justify-end gap-4 sm:gap-8 min-w-0">
          {homeOwner && (
            <p className="hidden sm:block text-[24px] font-semibold leading-[1.1] tracking-[-0.02em] truncate">
              {homeOwner.name}
            </p>
          )}
          <div className="flex items-center gap-4 min-w-0">
            <p className="text-[24px] font-semibold leading-[1.1] tracking-[-0.02em] truncate">
              {match.team1 ?? 'TBC'}
            </p>
            <span className="text-[36px] shrink-0">{homeTeam?.flag ?? '🏳️'}</span>
          </div>
        </div>

        {/* VS */}
        <p className="text-[24px] font-semibold leading-[1.1] tracking-[-0.02em] shrink-0">
          VS
        </p>

        {/* Away side: flag · country · player */}
        <div className="flex-1 flex items-center justify-start gap-4 sm:gap-8 min-w-0">
          <div className="flex items-center gap-4 min-w-0">
            <span className="text-[36px] shrink-0">{awayTeam?.flag ?? '🏳️'}</span>
            <p className="text-[24px] font-semibold leading-[1.1] tracking-[-0.02em] truncate">
              {match.team2 ?? 'TBC'}
            </p>
          </div>
          {awayOwner && (
            <p className="hidden sm:block text-[24px] font-semibold leading-[1.1] tracking-[-0.02em] truncate">
              {awayOwner.name}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Fixtures() {
  const [fixtures, setFixtures] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  useEffect(() => {
    fetchFixtures()
      .then(setFixtures)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  // Find the first upcoming match for the hero
  const now = new Date()
  const nextMatch = fixtures.find(m => !m.score1 && m.date && new Date(m.date) > now)
  const heroText = nextMatch
    ? `The next match is ${nextMatch.team1 ?? 'TBC'} vs ${nextMatch.team2 ?? 'TBC'}`
    : 'Fixtures'

  // Group fixtures by stage
  const groups = fixtures.reduce((acc, match) => {
    const key = match.stage ?? 'Other'
    if (!acc[key]) acc[key] = []
    acc[key].push(match)
    return acc
  }, {})

  return (
    <div>
      {/* Hero */}
      <div className="px-8 lg:px-[68px] py-16 lg:py-[91px]">
        <h1
          className="text-[40px] sm:text-[56px] lg:text-[72px] font-semibold leading-none"
          style={{ letterSpacing: '-2.88px' }}
        >
          {loading ? 'Fixtures' : heroText}
        </h1>
      </div>

      {loading && (
        <div className="px-8 lg:px-[68px] pb-16 text-[14px] text-[#0a0a0a]/50">
          Loading fixtures…
        </div>
      )}

      {error && (
        <div className="px-8 lg:px-[68px] pb-16">
          <p className="text-[14px] text-red-600">Could not load fixtures — {error}</p>
        </div>
      )}

      {!loading && !error && fixtures.length === 0 && (
        <div className="px-8 lg:px-[68px] pb-16 text-[14px] text-[#0a0a0a]/50">
          No fixtures available yet.
        </div>
      )}

      {!loading && !error && (
        <div className="px-8 lg:px-[68px] pb-16 flex flex-col gap-16">
          {Object.entries(groups).map(([stage, matches]) => (
            <div key={stage} className="flex flex-col gap-8">
              {/* Stage heading */}
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#0a0a0a]/40">
                {stage}
              </p>
              <div className="flex flex-col gap-8">
                {matches.map((match, i) => (
                  <FixtureRow
                    key={`${match.team1}-${match.team2}-${match.date}-${i}`}
                    match={match}
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
