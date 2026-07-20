import { useState } from 'react'
import { FINAL } from '../data/finalResults'
import { getTeamByName, getDisplayName } from '../data/teams'

// ── helpers ───────────────────────────────────────────────────────────────────
const flagOf = name => getTeamByName(name)?.flag ?? '🏳️'
const nameOf = name => getDisplayName(name)

function SectionLabel({ children }) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#0a0a0a]/40 mb-4">
      {children}
    </p>
  )
}

function TeamChip({ name, pts, dark }) {
  const muted = dark ? 'text-white/45' : 'text-[#0a0a0a]/45'
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className="text-[13px] leading-none">{flagOf(name)}</span>
      <span className={`text-[12px] ${dark ? 'text-white/80' : 'text-[#0a0a0a]/75'}`}>{nameOf(name)}</span>
      {pts != null && <span className={`text-[12px] tabular-nums ${muted}`}>{pts}</span>}
    </span>
  )
}

// ── podium ────────────────────────────────────────────────────────────────────
function PodiumCard({ p, place, medal, big }) {
  return (
    <div className={`flex-1 rounded-xl px-5 py-6 ${big ? 'bg-[#0a0a0a] text-white' : 'bg-[#f7f7f7]'}`}>
      <div className="flex items-baseline justify-between mb-3">
        <span className={`text-[11px] font-medium uppercase tracking-[0.1em] ${big ? 'text-white/50' : 'text-[#0a0a0a]/40'}`}>{place}</span>
        <span className="text-[20px] leading-none">{medal}</span>
      </div>
      <p className={`font-semibold leading-none ${big ? 'text-[28px]' : 'text-[22px]'}`}>{p.player}</p>
      <p className={`mt-1 text-[15px] tabular-nums font-semibold ${big ? 'text-white/70' : 'text-[#0a0a0a]/50'}`}>{p.total} pts</p>
      <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1">
        {p.teams.map(t => <TeamChip key={t} name={t} dark={big} />)}
      </div>
    </div>
  )
}

function Podium() {
  return (
    <div className="flex flex-col sm:flex-row gap-2.5">
      <PodiumCard p={FINAL.champion} place="Champion"  medal="🥇" big />
      <PodiumCard p={FINAL.runnerUp} place="Runner-up" medal="🥈" />
      <PodiumCard p={FINAL.third}    place="Third"     medal="🥉" />
    </div>
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

// ── insight cards ─────────────────────────────────────────────────────────────
function Insights() {
  return (
    <div className="grid sm:grid-cols-2 gap-2.5">
      {FINAL.insights.map((ins, i) => (
        <div key={i} className="rounded-xl bg-[#f7f7f7] px-5 py-5">
          <p className="text-[15px] font-semibold leading-snug mb-2">{ins.title}</p>
          <p className="text-[13px] leading-relaxed text-[#0a0a0a]/60">{ins.body}</p>
        </div>
      ))}
    </div>
  )
}

// ── two-column stat block (top teams / tiers / hauls / zeros) ─────────────────
function TopTeams() {
  const max = FINAL.topTeams[0].pts
  return (
    <div className="flex flex-col gap-1.5">
      {FINAL.topTeams.map(t => (
        <div key={t.team} className="flex items-center gap-3">
          <span className="text-[15px] leading-none shrink-0">{flagOf(t.team)}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[13px] font-medium truncate">
                {nameOf(t.team)} <span className="text-[#0a0a0a]/35">·{t.owner}</span>
              </p>
              <p className="text-[13px] font-semibold tabular-nums shrink-0">{t.pts}</p>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-[#ececec] overflow-hidden">
              <div className="h-full bg-[#0a0a0a] rounded-full" style={{ width: `${(t.pts / max) * 100}%` }} />
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
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#0a0a0a]/40 mb-1.5">Biggest steals</p>
        {FINAL.draftValue.best.map(r => <DraftRow key={r.team} r={r} sign={1} />)}
      </div>
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#0a0a0a]/40 mb-1.5">Biggest reaches</p>
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
  const [showMethod, setShowMethod] = useState(false)
  return (
    <div className="max-w-3xl mx-auto">
      {/* Hero */}
      <div className="mb-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#0a0a0a]/40 mb-3">
          Occy Picks 2026 · Final Results
        </p>
        <h1 className="text-[40px] sm:text-[56px] lg:text-[64px] font-semibold leading-none" style={{ letterSpacing: '-2.4px' }}>
          Jess wins it<br />on 57.
        </h1>
        <p className="mt-5 text-[15px] leading-relaxed text-[#0a0a0a]/55 max-w-xl">
          Spain beat Argentina 1–0 to win the World Cup — but the Occy Picks title went to Jess,
          whose two teams were both out by the Round of 16. A 2-point margin over Matt settled the
          closest possible finish. All {FINAL.matchesPlayed} matches complete.
        </p>
      </div>

      <div className="flex flex-col gap-14 mt-12">
        {/* Podium */}
        <section><SectionLabel>Podium</SectionLabel><Podium /></section>

        {/* Insights */}
        <section><SectionLabel>What the season showed</SectionLabel><Insights /></section>

        {/* Standings */}
        <section><SectionLabel>Final standings · all 23</SectionLabel><StandingsTable /></section>

        {/* Top teams */}
        <section>
          <SectionLabel>Top-scoring teams</SectionLabel>
          <TopTeams />
        </section>

        {/* Tiers */}
        <section>
          <SectionLabel>Tier (multiplier) performance</SectionLabel>
          <Tiers />
        </section>

        {/* Draft value */}
        <section>
          <SectionLabel>Draft value</SectionLabel>
          <DraftValue />
        </section>

        {/* Records */}
        <section>
          <SectionLabel>Records</SectionLabel>
          <div className="grid sm:grid-cols-2 gap-2.5">
            <div className="rounded-xl bg-[#f7f7f7] px-5 py-5">
              <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-[#0a0a0a]/40 mb-2">Biggest single-match haul</p>
              <p className="text-[14px] leading-relaxed text-[#0a0a0a]/70">
                A three-way tie at <span className="font-semibold text-[#0a0a0a]">16 points</span> — Egypt, Bosnia & Herzegovina
                and DR Congo, each a ×4 team winning a group game by 2+ goals.
              </p>
            </div>
            <div className="rounded-xl bg-[#f7f7f7] px-5 py-5">
              <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-[#0a0a0a]/40 mb-2">Teams that scored zero (6)</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                {FINAL.zeros.map(z => <TeamChip key={z} name={z} />)}
              </div>
            </div>
          </div>
        </section>

        {/* Methodology */}
        <section>
          <button
            onClick={() => setShowMethod(s => !s)}
            className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#0a0a0a]/40 hover:text-[#0a0a0a]/70 bg-transparent border-none cursor-pointer p-0 flex items-center gap-2"
          >
            Methodology & notes <span className="text-[9px]">{showMethod ? '▲' : '▼'}</span>
          </button>
          {showMethod && (
            <ul className="mt-4 flex flex-col gap-2.5 list-none">
              {FINAL.methodology.map((m, i) => (
                <li key={i} className="text-[13px] leading-relaxed text-[#0a0a0a]/55 pl-4 relative">
                  <span className="absolute left-0 text-[#0a0a0a]/25">·</span>{m}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
