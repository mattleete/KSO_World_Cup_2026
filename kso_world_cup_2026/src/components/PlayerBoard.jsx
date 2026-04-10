import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { fetchResults } from '../utils/api'
import { getTeamById } from '../data/teams'
import { calcPlayerPoints, calcTeamPoints } from '../utils/scoring'

const WC_START = new Date('2026-06-11T00:00:00+10:00') // AEST

function daysUntil(date) {
  return Math.ceil((date - new Date()) / (1000 * 60 * 60 * 24))
}

function PlayerCard({ name, rank, teamScores, total }) {
  return (
    <div className="bg-[#e9e9e9] rounded-[4px] p-2 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-[24px] font-semibold leading-[1.1] tracking-[-0.02em]">{name}</p>
        <p className="text-[24px] font-semibold leading-[1.1] tracking-[-0.02em]">Rank {rank}</p>
      </div>

      {teamScores.length === 0 && (
        <p className="text-[14px] text-[#0a0a0a]/40">No teams drafted yet</p>
      )}

      {teamScores.map(({ team, points }) => {
        if (!team) return null
        return (
          <div key={team.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-lg shrink-0">{team.flag}</span>
              <p className="text-[14px] leading-[1.7] tracking-[-0.03em] truncate">{team.name}</p>
            </div>
            <p className="text-[14px] leading-[1.7] tracking-[-0.03em] shrink-0 ml-2">{points}</p>
          </div>
        )
      })}

      <div className="flex items-center justify-end gap-3">
        <p className="text-[14px] leading-[1.7] tracking-[-0.03em]">Total points</p>
        <p className="text-[14px] leading-[1.7] tracking-[-0.03em] font-semibold">{total}</p>
      </div>
    </div>
  )
}

export default function PlayerBoard({ context }) {
  const [ranked, setRanked] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!context) {
      setLoading(false)
      return
    }

    async function load() {
      try {
        const [membersRes, sessionRes, resultsData] = await Promise.all([
          supabase.from('group_members').select().eq('group_id', context.group.id).order('joined_at'),
          supabase.from('draft_session').select().eq('group_id', context.group.id).maybeSingle(),
          fetchResults(),
        ])

        if (membersRes.error) throw new Error(membersRes.error.message)

        const members = membersRes.data || []
        let picks = []

        if (sessionRes.data) {
          const picksRes = await supabase
            .from('draft_picks')
            .select()
            .eq('draft_session_id', sessionRes.data.id)
          if (picksRes.error) throw new Error(picksRes.error.message)
          picks = picksRes.data || []
        }

        const board = members.map(member => {
          const memberPicks = picks.filter(p => p.group_member_id === member.id)
          const teamIds = memberPicks.map(p => p.team_id)
          const player = { id: member.id, name: member.display_name, teams: teamIds }
          return {
            id: member.id,
            name: member.display_name,
            total: calcPlayerPoints(player, resultsData),
            teamScores: teamIds.map(id => ({
              team: getTeamById(id),
              points: calcTeamPoints(id, resultsData),
            })),
          }
        }).sort((a, b) => b.total - a.total)

        setRanked(board)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [context])

  const days = daysUntil(WC_START)
  const leader = ranked[0]
  const heroText = !context
    ? 'KSO Picks & Points'
    : days > 0
    ? `The world cup starts in ${days} days`
    : leader?.total > 0
    ? `${leader.name} is leading ${context.group.name}`
    : context.group.name

  if (!context) {
    return (
      <div>
        <div className="py-16 lg:py-[91px]">
          <h1 className="text-[40px] sm:text-[56px] lg:text-[72px] font-semibold leading-none" style={{ letterSpacing: '-2.88px' }}>
            KSO Picks & Points
          </h1>
        </div>
        <p className="text-[16px] text-[#0a0a0a]/50">
          Log in and join a group to see the leaderboard.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="py-16 lg:py-[91px]">
        <h1 className="text-[40px] sm:text-[56px] lg:text-[72px] font-semibold leading-none" style={{ letterSpacing: '-2.88px' }}>
          {heroText}
        </h1>
      </div>

      {loading && <p className="text-[14px] text-[#0a0a0a]/50">Calculating scores…</p>}
      {error && <p className="text-[14px] text-red-600">Could not load results — {error}</p>}

      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {ranked.map((player, i) => (
            <PlayerCard key={player.id} {...player} rank={i + 1} />
          ))}
        </div>
      )}
    </div>
  )
}
