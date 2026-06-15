import { useState } from 'react'
import { TEAMS } from '../data/teams'

const sortedTeams = [...TEAMS].sort((a, b) =>
  (a.displayName ?? a.name).localeCompare(b.displayName ?? b.name))

// Shared team filter for the Fixtures and Results tabs. Returns a `FilterBar`
// element to render and an `apply(matches)` helper that keeps only matches
// involving a selected team. With nothing selected, everything passes.
//
// Two ways to select: a "Your teams" toggle (the current user's drafted teams,
// only shown when they have any) and a checkbox list of individual countries.
// The two combine as a union.
export function useTeamFilter(myTeamNames) {
  const [open, setOpen] = useState(false)
  const [yourTeams, setYourTeams] = useState(false)
  const [selected, setSelected] = useState(() => new Set())

  const hasMine = myTeamNames && myTeamNames.size > 0
  const active = (yourTeams && hasMine) || selected.size > 0

  function toggleTeam(name) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }
  function clearAll() { setYourTeams(false); setSelected(new Set()) }

  function apply(matches) {
    if (!active) return matches
    return matches.filter(m => {
      if (yourTeams && hasMine && (myTeamNames.has(m.team1) || myTeamNames.has(m.team2))) return true
      if (selected.has(m.team1) || selected.has(m.team2)) return true
      return false
    })
  }

  const chip = (label, on, onClick) => (
    <button onClick={onClick}
      className={`text-[11px] font-medium uppercase tracking-[0.08em] rounded-lg px-3 py-2 cursor-pointer transition-colors border-none ${
        on ? 'bg-[#0a0a0a] text-white' : 'bg-[#f0f0f0] text-[#0a0a0a]/60 hover:bg-[#e6e6e6]'
      }`}>
      {label}
    </button>
  )

  const FilterBar = (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        {hasMine && chip('Your teams', yourTeams, () => setYourTeams(v => !v))}
        {chip(`Countries${selected.size ? ` · ${selected.size}` : ''} ${open ? '▲' : '▾'}`, selected.size > 0, () => setOpen(o => !o))}
        {active && (
          <button onClick={clearAll}
            className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#0a0a0a]/40 hover:text-[#0a0a0a]/70 px-2 py-2 cursor-pointer bg-transparent border-none">
            Clear
          </button>
        )}
      </div>
      {open && (
        <div className="bg-[#f7f7f7] rounded-lg p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2.5 max-h-[42vh] overflow-y-auto">
          {sortedTeams.map(t => (
            <label key={t.id} className="flex items-center gap-2 text-[13px] cursor-pointer min-w-0">
              <input type="checkbox" checked={selected.has(t.name)} onChange={() => toggleTeam(t.name)}
                className="accent-[#0a0a0a] shrink-0 w-4 h-4 cursor-pointer" />
              <span className="text-[15px] leading-none shrink-0">{t.flag}</span>
              <span className="truncate">{t.displayName ?? t.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )

  return { FilterBar, apply }
}
