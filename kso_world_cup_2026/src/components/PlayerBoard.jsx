import { useState, useEffect } from 'react'
import { fetchResults } from '../utils/api'
import { PLAYERS } from '../data/players'
import { getTeamById } from '../data/teams'
import { calcPlayerPoints, calcTeamPoints } from '../utils/scoring'

const WC_START = new Date('2026-06-11T00:00:00+10:00') // AEST

function daysUntil(date) {
  return Math.ceil((date - new Date()) / (1000 * 60 * 60 * 24))
}

function PlayerCard({ player, rank }) {
  return (
    <div className="bg-[#e9e9e9] rounded-[4px] p-2 flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[24px] font-semibold leading-[1.1] tracking-[-0.02em]">
          {player.name}
        </p>
        <p className="text-[24px] font-semibold leading-[1.1] tracking-[-0.02em]">
          Rank {rank}
        </p>
      </div>

      {/* Team rows */}
      {player.teamScores.map(({ team, points }) => {
        if (!team) return null
        return (
          <div key={team.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-lg shrink-0">{team.flag}</span>
              <p className="text-[14px] leading-[1.7] tracking-[-0.03em] truncate">
                {team.name}
              </p>
            </div>
            <p className="text-[14px] leading-[1.7] tracking-[-0.03em] shrink-0 ml-2">
              {points}
            </p>
          </div>
        )
      })}

      {/* Total */}
      <div className="flex items-center justify-end gap-3">
        <p className="text-[14px] leading-[1.7] tracking-[-0.03em]">Total points</p>
        <p className="text-[14px] leading-[1.7] tracking-[-0.03em] font-semibold">
          {player.total}
        </p>
      </div>
    </div>
  )
}

export default function PlayerBoard() {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    fetchResults()
      .then(setResults)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const ranked = PLAYERS
    .map(player => ({
      ...player,
      total: calcPlayerPoints(player, results),
      teamScores: player.teams.map(id => ({
        team:   getTeamById(id),
        points: calcTeamPoints(id, results),
      })),
    }))
    .sort((a, b) => b.total - a.total)

  const days = daysUntil(WC_START)
  const leader = ranked[0]
  const heroText = days > 0
    ? `The world cup starts in ${days} days`
    : leader
      ? `${leader.name} is a world cup picking genius`
      : 'KSO Picks and Points'

  return (
    <div>
      {/* Hero */}
      <div className="px-8 lg:px-[68px] py-16 lg:py-[91px]">
        <h1
          className="text-[40px] sm:text-[56px] lg:text-[72px] font-semibold leading-none"
          style={{ letterSpacing: '-2.88px' }}
        >
          {heroText}
        </h1>
      </div>

      {/* Cards grid */}
      {loading && (
        <div className="px-8 lg:px-[68px] pb-16 text-[14px] text-[#0a0a0a]/50">
          Calculating scores…
        </div>
      )}

      {error && (
        <div className="px-8 lg:px-[68px] pb-16">
          <p className="text-[14px] text-red-600">Could not load results — {error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="px-8 lg:px-[68px] pb-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {ranked.map((player, i) => (
            <PlayerCard key={player.id} player={player} rank={i + 1} />
          ))}
        </div>
      )}
    </div>
  )
}
