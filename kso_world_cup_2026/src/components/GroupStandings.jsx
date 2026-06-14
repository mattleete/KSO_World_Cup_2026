import { computeGroupStandings } from '../utils/standings'

// Real FIFA group-table standings (3/1/0) for one group — NOT fantasy points.
// `myTeamNames` highlights teams the current user drafted.
export default function GroupStandings({ group, fixtures, myTeamNames }) {
  const rows = computeGroupStandings(group, fixtures)

  return (
    <div className="bg-[#f7f7f7] rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[#0a0a0a]/8">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#0a0a0a]/40">Group {group}</p>
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-2 px-4 py-1.5 text-[10px] font-medium uppercase tracking-[0.06em] text-[#0a0a0a]/30">
        <span className="w-4 shrink-0" />
        <span className="flex-1 min-w-0">Team</span>
        <span className="w-5 text-center shrink-0">P</span>
        <span className="w-5 text-center shrink-0">W</span>
        <span className="w-5 text-center shrink-0">D</span>
        <span className="w-5 text-center shrink-0">L</span>
        <span className="w-7 text-center shrink-0">GD</span>
        <span className="w-6 text-center shrink-0 font-semibold text-[#0a0a0a]/50">Pts</span>
      </div>

      {rows.map((r, i) => {
        const mine = myTeamNames?.has(r.name)
        return (
          <div
            key={r.name}
            className={`flex items-center gap-2 px-4 py-2 border-t border-[#0a0a0a]/8 text-[12px] ${
              mine ? 'bg-[#0a0a0a]/[0.04]' : ''
            }`}
          >
            <span className="w-4 shrink-0 text-[11px] text-[#0a0a0a]/30 tabular-nums">{i + 1}</span>
            <span className="text-[15px] leading-none shrink-0">{r.team.flag}</span>
            <span className="flex-1 min-w-0 truncate font-semibold">{r.team.displayName ?? r.team.name}</span>
            <span className="w-5 text-center shrink-0 text-[#0a0a0a]/50 tabular-nums">{r.P}</span>
            <span className="w-5 text-center shrink-0 text-[#0a0a0a]/50 tabular-nums">{r.W}</span>
            <span className="w-5 text-center shrink-0 text-[#0a0a0a]/50 tabular-nums">{r.D}</span>
            <span className="w-5 text-center shrink-0 text-[#0a0a0a]/50 tabular-nums">{r.L}</span>
            <span className="w-7 text-center shrink-0 text-[#0a0a0a]/50 tabular-nums">{r.GD > 0 ? `+${r.GD}` : r.GD}</span>
            <span className="w-6 text-center shrink-0 font-semibold tabular-nums">{r.Pts}</span>
          </div>
        )
      })}
    </div>
  )
}
