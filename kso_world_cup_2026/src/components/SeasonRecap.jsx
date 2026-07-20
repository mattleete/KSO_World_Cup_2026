import { useState } from 'react'
import { FINAL } from '../data/finalResults'
import { getTeamByName, getDisplayName } from '../data/teams'

// ── helpers ───────────────────────────────────────────────────────────────────
const flagOf = name => getTeamByName(name)?.flag ?? '🏳️'
const nameOf = name => getDisplayName(name)

// Every drafted team with points/owner/tier/seed — flattened from the standings
// (single source of truth), seed/tier resolved from teams.js by FIFA rank.
const ALL_TEAMS = FINAL.standings.flatMap(p =>
  p.teams.map(([team, pts]) => {
    const rank = getTeamByName(team)?.fifaRank
    return { team, pts, owner: p.player, rank, tier: Math.ceil(rank / 12) }
  })
)
const MAX_PTS = Math.max(...ALL_TEAMS.map(t => t.pts))
const SEED_ORDER = [...ALL_TEAMS].sort((a, b) => a.rank - b.rank)
const BY_NAME = Object.fromEntries(ALL_TEAMS.map(t => [t.team, t]))
// Draft order (pick 1 → last). Populated from FINAL.draftOrder once available;
// the section only renders when the pick order is known.
const DRAFT_ORDERED = (FINAL.draftOrder ?? []).map(n => BY_NAME[n]).filter(Boolean)

// ── collapsible section (minimised by default) ────────────────────────────────
function Collapsible({ label, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-[#0a0a0a]/10">
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 py-4 px-0 text-left bg-transparent border-none cursor-pointer group"
      >
        <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#0a0a0a]/45 group-hover:text-[#0a0a0a]/75 transition-colors">
          {label}
        </span>
        <span className="text-[9px] text-[#0a0a0a]/30 shrink-0">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="pb-8">{children}</div>}
    </div>
  )
}

function TeamChip({ name, pts }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className="text-[13px] leading-none">{flagOf(name)}</span>
      <span className="text-[12px] text-[#0a0a0a]/75">{nameOf(name)}</span>
      {pts != null && <span className="text-[12px] tabular-nums text-[#0a0a0a]/45">{pts}</span>}
    </span>
  )
}

// ── standings ─────────────────────────────────────────────────────────────────
function StandingsTable() {
  return (
    <div className="flex flex-col gap-1">
      {FINAL.standings.map((p, i) => {
        const podium = p.rank <= 3
        return (
          <div
            key={p.player + i}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${podium ? 'bg-[#f2f2f2]' : ''}`}
          >
            <span className={`w-8 shrink-0 text-center text-[14px] font-semibold tabular-nums ${podium ? 'text-[#0a0a0a]' : 'text-[#0a0a0a]/30'}`}>
              {p.tie ? '=' : ''}{p.rank}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold leading-tight truncate">
                {p.player}
                {p.note && <span className="ml-1.5 text-[10px] font-normal text-[#0a0a0a]/35">({p.note})</span>}
              </p>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                {p.teams.map(([name, pts]) => <TeamChip key={name} name={name} pts={pts} />)}
              </div>
            </div>
            <span className="shrink-0 text-[20px] font-semibold tabular-nums">{p.total}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── generic team bar list (flag · name · owner · points bar · ×tier) ──────────
function BarList({ items, max = MAX_PTS }) {
  return (
    <div className="flex flex-col gap-1.5">
      {items.map((t, i) => (
        <div key={t.team + i} className="flex items-center gap-3">
          <span className="text-[15px] leading-none shrink-0">{flagOf(t.team)}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[13px] font-medium truncate">
                {nameOf(t.team)} <span className="text-[#0a0a0a]/35">·{t.owner}</span>
              </p>
              <p className="text-[13px] font-semibold tabular-nums shrink-0">{t.pts}</p>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-[#ececec] overflow-hidden">
              <div className="h-full bg-[#0a0a0a] rounded-full" style={{ width: `${max ? (t.pts / max) * 100 : 0}%` }} />
            </div>
          </div>
          <span className="shrink-0 text-[10px] font-medium text-[#0a0a0a]/35 w-6 text-right">×{t.tier}</span>
        </div>
      ))}
    </div>
  )
}

function Tiers() {
  const max = Math.max(...FINAL.tiers.map(t => t.avg))
  return (
    <div className="flex flex-col gap-2.5">
      {FINAL.tiers.map(t => (
        <div key={t.tier} className="flex items-center gap-3">
          <span className="w-8 shrink-0 text-[14px] font-semibold tabular-nums">×{t.tier}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[11px] text-[#0a0a0a]/45">{t.range}</span>
              <span className="text-[13px] font-semibold tabular-nums">{t.avg.toFixed(2)}</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-[#ececec] overflow-hidden">
              <div className="h-full bg-[#0a0a0a] rounded-full" style={{ width: `${(t.avg / max) * 100}%` }} />
            </div>
          </div>
          <span className="shrink-0 w-16 text-right text-[10px] text-[#0a0a0a]/35">
            {t.zeros ? `${t.zeros} zeros` : '—'}
          </span>
        </div>
      ))}
      <p className="text-[11px] text-[#0a0a0a]/40 mt-1">Average points per team (12 teams per tier).</p>
    </div>
  )
}

function DraftRow({ r, sign }) {
  return (
    <div className="flex items-center gap-2 py-1.5 border-b last:border-0 border-[#0a0a0a]/6">
      <span className="text-[13px] leading-none shrink-0">{flagOf(r.team)}</span>
      <p className="flex-1 min-w-0 truncate text-[12px]">
        {nameOf(r.team)} <span className="text-[#0a0a0a]/35">·{r.owner}</span>
      </p>
      <span className="shrink-0 text-[10px] text-[#0a0a0a]/35 tabular-nums w-14 text-right">pick {r.pick}</span>
      <span className={`shrink-0 text-[12px] font-semibold tabular-nums w-9 text-right ${sign > 0 ? 'text-green-600' : 'text-red-500'}`}>
        {r.value > 0 ? `+${r.value}` : r.value}
      </span>
    </div>
  )
}

function DraftValue() {
  return (
    <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#0a0a0a]/40 mb-1.5">Draft best value picks</p>
        {FINAL.draftValue.best.map(r => <DraftRow key={r.team} r={r} sign={1} />)}
      </div>
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#0a0a0a]/40 mb-1.5">Draft worst value picks</p>
        {FINAL.draftValue.worst.map(r => <DraftRow key={r.team} r={r} sign={-1} />)}
      </div>
      <p className="sm:col-span-2 text-[11px] text-[#0a0a0a]/40">
        Value = draft pick − points-rank among drafted teams. First-round picks averaged {FINAL.draftValue.r1avg};
        second-round picks averaged {FINAL.draftValue.r2avg}.
      </p>
    </div>
  )
}

// ── main ──────────────────────────────────────────────────────────────────────
export default function SeasonRecap() {
  return (
    <div className="max-w-3xl mx-auto">
      {/* Hero */}
      <div className="mb-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#0a0a0a]/40 mb-3">
          Occy Picks 2026 · Post Season Analysis
        </p>
        <h1 className="text-[40px] sm:text-[56px] lg:text-[64px] font-semibold leading-none" style={{ letterSpacing: '-2.4px' }}>
          Jess wins it<br />on 57.
        </h1>
      </div>

      {/* Collapsible sections — all minimised by default */}
      <div className="mt-10 border-t border-[#0a0a0a]/10">
        <Collapsible label="Final standings · all 23">
          <StandingsTable />
        </Collapsible>

        <Collapsible label="Top-scoring teams">
          <BarList items={FINAL.topTeams} />
        </Collapsible>

        <Collapsible label="Tier (multiplier) performance">
          <Tiers />
        </Collapsible>

        <Collapsible label="Draft value">
          <DraftValue />
        </Collapsible>

        {DRAFT_ORDERED.length > 0 && (
          <Collapsible label="Draft order with points">
            <BarList items={DRAFT_ORDERED} />
            <p className="text-[11px] text-[#0a0a0a]/40 mt-3">
              Picks 1–44 in snake order. Cape Verde, Saudi Arabia, Qatar and Jordan were
              auto-assigned to Charlie Cox after the draft.
            </p>
          </Collapsible>
        )}

        <Collapsible label="Original team seed order">
          <BarList items={SEED_ORDER} />
        </Collapsible>

        <Collapsible label="Methodology & notes">
          <ul className="flex flex-col gap-2.5 list-none">
            {FINAL.methodology.map((m, i) => (
              <li key={i} className="text-[13px] leading-relaxed text-[#0a0a0a]/55 pl-4 relative">
                <span className="absolute left-0 text-[#0a0a0a]/25">·</span>{m}
              </li>
            ))}
          </ul>
        </Collapsible>
      </div>
    </div>
  )
}
