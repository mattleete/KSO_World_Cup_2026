import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { fetchFixtures, toAEST } from '../utils/api'
import { getTeamByName, getTeamById } from '../data/teams'

function FixtureRow({ match, ownerByTeamName }) {
  const homeOwnerName = ownerByTeamName?.[match.team1] ?? null
  const awayOwnerName = ownerByTeamName?.[match.team2] ?? null
  const homeTeam = getTeamByName(match.team1)
  const awayTeam = getTeamByName(match.team2)
  const hasScore = match.score1 !== null && match.score2 !== null

  return (
    <div className="flex flex-col gap-2">
      {/* Date / score line */}
      <p className="text-[18px] sm:text-[24px] font-semibold leading-[1.1] tracking-[-0.02em] text-center">
        {hasScore
          ? `${match.score1} – ${match.score2}`
          : match.date ? toAEST(match.date) : 'TBC'
        }
      </p>

      {/* Teams row */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Home side: owner · country · flag */}
        <div className="flex-1 flex items-center justify-end gap-2 sm:gap-8 min-w-0">
          {homeOwnerName && (
            <p className="hidden sm:block text-[24px] font-semibold leading-[1.1] tracking-[-0.02em] truncate">
              {homeOwnerName}
            </p>
          )}
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <p className="text-[15px] sm:text-[24px] font-semibold leading-[1.1] tracking-[-0.02em] truncate">
              {match.team1 ?? 'TBC'}
            </p>
            <span className="text-[24px] sm:text-[36px] shrink-0">{homeTeam?.flag ?? '🏳️'}</span>
          </div>
        </div>

        {/* VS */}
        <p className="text-[13px] sm:text-[24px] font-semibold leading-[1.1] tracking-[-0.02em] shrink-0 text-[#0a0a0a]/40 sm:text-[#0a0a0a]">VS</p>

        {/* Away side: flag · country · owner */}
        <div className="flex-1 flex items-center justify-start gap-2 sm:gap-8 min-w-0">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <span className="text-[24px] sm:text-[36px] shrink-0">{awayTeam?.flag ?? '🏳️'}</span>
            <p className="text-[15px] sm:text-[24px] font-semibold leading-[1.1] tracking-[-0.02em] truncate">
              {match.team2 ?? 'TBC'}
            </p>
          </div>
          {awayOwnerName && (
            <p className="hidden sm:block text-[24px] font-semibold leading-[1.1] tracking-[-0.02em] truncate">
              {awayOwnerName}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Fixtures({ context }) {
  const [fixtures, setFixtures] = useState([])
  const [ownerByTeamName, setOwnerByTeamName] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const promises = [fetchFixtures()]

        // If we have a group context, also fetch draft picks to show ownership
        if (context) {
          promises.push(
            supabase.from('draft_session').select().eq('group_id', context.group.id).maybeSingle(),
            supabase.from('group_members').select().eq('group_id', context.group.id),
          )
        }

        const [fixturesData, sessionRes, membersRes] = await Promise.all(promises)
        setFixtures(fixturesData)

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

  const now = new Date()
  const nextMatch = fixtures.find(m => !m.score1 && m.date && new Date(m.date) > now)
  const heroText = nextMatch
    ? `The next match is ${nextMatch.team1 ?? 'TBC'} vs ${nextMatch.team2 ?? 'TBC'}`
    : 'Fixtures'

  const groups = fixtures.reduce((acc, match) => {
    const key = match.stage ?? 'Other'
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
        <div className="pb-16 flex flex-col gap-16">
          {Object.entries(groups).map(([stage, matches]) => (
            <div key={stage} className="flex flex-col gap-8">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#0a0a0a]/40">
                {stage}
              </p>
              <div className="flex flex-col gap-8">
                {matches.map((match, i) => (
                  <FixtureRow
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
