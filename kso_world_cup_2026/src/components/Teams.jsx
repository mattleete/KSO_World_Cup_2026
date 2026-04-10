import { TEAMS, TIER_CONFIG } from '../data/teams'
import { getOwner } from '../data/players'

const MULTIPLIER_LABEL = { top: '×1', mid: '×2', bottom: '×3' }

export default function Teams() {
  const sorted = [...TEAMS].sort((a, b) => a.fifaRank - b.fifaRank)
  const topTeam = sorted[0]

  return (
    <div>
      {/* Hero */}
      <div className="px-8 lg:px-[68px] py-16 lg:py-[91px]">
        <h1
          className="text-[40px] sm:text-[56px] lg:text-[72px] font-semibold leading-none"
          style={{ letterSpacing: '-2.88px' }}
        >
          {topTeam
            ? `The current #1 ranked team is ${topTeam.name}`
            : 'Team Info'
          }
        </h1>
      </div>

      {/* Tiles grid */}
      <div className="px-8 lg:px-[68px] pb-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {sorted.map(team => {
          const owner = getOwner(team.id)
          return (
            <div
              key={team.id}
              className="bg-[#e9e9e9] rounded-[4px] p-2 flex items-center justify-between h-14"
            >
              <div className="flex items-center gap-4">
                <span className="text-[36px] leading-none">{team.flag}</span>
                <p className="text-[24px] font-semibold leading-[1.1] tracking-[-0.02em]">
                  {team.name}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-2">
                {owner && (
                  <p className="hidden sm:block text-[14px] leading-[1.7] text-[#0a0a0a]/50">
                    {owner.name}
                  </p>
                )}
                <p className="text-[14px] leading-[1.7] text-[#0a0a0a]/40">
                  #{team.fifaRank}
                </p>
                <p className="text-[14px] leading-[1.7] font-semibold text-[#0a0a0a]/50">
                  {MULTIPLIER_LABEL[team.tier]}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
