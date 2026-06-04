import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { TEAMS } from '../data/teams'
import { resultKey } from '../utils/results'
import { ModalShell } from './AccountModals'

const titleCls  = 'text-[26px] font-semibold leading-[1.1] tracking-[-0.02em]'
const subCls    = 'text-[#0a0a0a]/50 text-[15px]'
const inputCls  = 'bg-[#e9e9e9] rounded-lg px-4 py-3 text-[16px] text-[#0a0a0a] placeholder:text-[#0a0a0a]/40 outline-none focus:ring-2 focus:ring-[#0a0a0a]/20'
const primaryCls = 'bg-[#0a0a0a] text-white rounded-lg px-4 py-3 text-[14px] font-medium uppercase tracking-[0.08em] cursor-pointer disabled:opacity-40'

// ── Confirm dialog (destructive actions) ───────────────────────────────────────
// onConfirm is async and returns an error string (or null on success). On
// success this closes itself; the parent's onConfirm should also refresh data.
export function ConfirmModal({ title, body, confirmLabel = 'Confirm', onConfirm, onClose }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function go() {
    setBusy(true)
    setError(null)
    const err = await onConfirm()
    if (err) { setError(err); setBusy(false); return }
    onClose()
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className={titleCls}>{title}</p>
          {body && <p className={subCls}>{body}</p>}
        </div>
        {error && <p className="text-red-500 text-[14px]">{error}</p>}
        <div className="flex gap-2">
          <button onClick={onClose} disabled={busy}
            className="flex-1 bg-[#e9e9e9] rounded-lg px-4 py-3 text-[14px] font-medium uppercase tracking-[0.08em] cursor-pointer hover:bg-[#e0e0e0] transition-colors disabled:opacity-40">
            Cancel
          </button>
          <button onClick={go} disabled={busy}
            className="flex-1 bg-red-600 text-white rounded-lg px-4 py-3 text-[14px] font-medium uppercase tracking-[0.08em] cursor-pointer disabled:opacity-40">
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

// ── Edit a player's name ────────────────────────────────────────────────────────
export function EditMemberNameModal({ member, groupId, onSaved, onClose }) {
  const [name, setName] = useState(member.display_name || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function submit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    setError(null)
    const { error } = await supabase.rpc('admin_set_member_name', {
      p_group_id: groupId, p_member_id: member.id, p_name: name.trim(),
    })
    if (error) { setError(error.message); setBusy(false); return }
    onSaved()
  }

  return (
    <ModalShell onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-6">
        <p className={titleCls}>Rename player</p>
        <input value={name} onChange={e => setName(e.target.value)} autoFocus className={inputCls} />
        {error && <p className="text-red-500 text-[14px]">{error}</p>}
        <button type="submit" disabled={busy || !name.trim()} className={primaryCls}>
          {busy ? 'Saving…' : 'Save name'}
        </button>
      </form>
    </ModalShell>
  )
}

// ── Reassign a drafted team (swap-aware) ────────────────────────────────────────
// pick: the draft_picks row being edited. ownerByTeamId: Map(team_id → name).
export function EditPickModal({ pick, ownerByTeamId, onSaved, onClose }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function choose(teamId) {
    if (teamId === pick.team_id) { onClose(); return }
    setBusy(true)
    setError(null)
    const { error } = await supabase.rpc('admin_set_pick_team', {
      p_pick_id: pick.id, p_team_id: teamId,
    })
    if (error) { setError(error.message); setBusy(false); return }
    onSaved()
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className={titleCls}>Change team</p>
          <p className={subCls}>
            Pick a team. If another player owns it, the two will swap.
          </p>
        </div>
        {error && <p className="text-red-500 text-[14px]">{error}</p>}
        <div className="grid grid-cols-2 gap-1.5 max-h-[50vh] overflow-y-auto pr-1">
          {TEAMS.map(t => {
            const owner = ownerByTeamId.get(t.id)
            const isCurrent = t.id === pick.team_id
            return (
              <button
                key={t.id}
                onClick={() => choose(t.id)}
                disabled={busy}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left cursor-pointer disabled:opacity-50 transition-colors ${
                  isCurrent ? 'bg-[#0a0a0a] text-white' : 'bg-[#f0f0f0] hover:bg-[#e6e6e6]'
                }`}
              >
                <span className="text-[18px] leading-none">{t.flag}</span>
                <span className="flex flex-col min-w-0">
                  <span className="text-[12px] font-semibold truncate">{t.name}</span>
                  {owner && !isCurrent && (
                    <span className="text-[10px] text-[#0a0a0a]/40 truncate">{owner}</span>
                  )}
                  {isCurrent && <span className="text-[10px] text-white/50">Current</span>}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </ModalShell>
  )
}

// ── Enter / override a match score (superadmin) ─────────────────────────────────
// prefill: { id, team1, team2, stage, score1, score2 } (id null = new result).
// manual: current manual results array, used for the duplicate guard.
const teamNames = TEAMS.map(t => t.name)

export function ScoreModal({ prefill = {}, manual = [], onSaved, onClose }) {
  const [team1, setTeam1] = useState(prefill.team1 || '')
  const [team2, setTeam2] = useState(prefill.team2 || '')
  const [score1, setScore1] = useState(prefill.score1 == null ? '' : String(prefill.score1))
  const [score2, setScore2] = useState(prefill.score2 == null ? '' : String(prefill.score2))
  const [stage, setStage] = useState(prefill.stage || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  function validate() {
    if (!team1 || !team2) return 'Pick both teams.'
    if (team1 === team2) return 'A team can’t play itself.'
    const s1 = Number(score1), s2 = Number(score2)
    if (score1 === '' || score2 === '' || !Number.isInteger(s1) || !Number.isInteger(s2) || s1 < 0 || s2 < 0) {
      return 'Enter whole, non-negative scores for both teams.'
    }
    // Duplicate guard: a different manual row already covers this match.
    const key = resultKey(team1, team2, stage)
    const clash = manual.find(m => resultKey(m.team1, m.team2, m.stage) === key && m.id !== prefill.id)
    if (clash) return 'A manual result for this match already exists — edit that one instead.'
    return null
  }

  async function submit(e) {
    e.preventDefault()
    const v = validate()
    if (v) { setError(v); return }
    setBusy(true)
    setError(null)
    const { error } = await supabase.rpc('upsert_match_result', {
      p_id: prefill.id ?? null,
      p_team1: team1,
      p_score1: Number(score1),
      p_team2: team2,
      p_score2: Number(score2),
      p_stage: stage || null,
      p_played_at: new Date().toISOString(),
    })
    if (error) { setError(error.message); setBusy(false); return }
    onSaved()
  }

  const selectCls = inputCls + ' appearance-none cursor-pointer'

  return (
    <ModalShell onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-5">
        <p className={titleCls}>{prefill.id ? 'Edit score' : 'Enter score'}</p>

        <div className="flex flex-col gap-3">
          {/* Team 1 row */}
          <div className="flex gap-2">
            <select value={team1} onChange={e => setTeam1(e.target.value)} className={selectCls + ' flex-1'}>
              <option value="">Team 1…</option>
              {teamNames.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <input type="number" min="0" inputMode="numeric" value={score1}
              onChange={e => setScore1(e.target.value)} placeholder="0"
              className={inputCls + ' w-20 text-center'} />
          </div>
          {/* Team 2 row */}
          <div className="flex gap-2">
            <select value={team2} onChange={e => setTeam2(e.target.value)} className={selectCls + ' flex-1'}>
              <option value="">Team 2…</option>
              {teamNames.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <input type="number" min="0" inputMode="numeric" value={score2}
              onChange={e => setScore2(e.target.value)} placeholder="0"
              className={inputCls + ' w-20 text-center'} />
          </div>
          <input value={stage} onChange={e => setStage(e.target.value)}
            placeholder="Stage (e.g. Group A, Round of 16)" className={inputCls} />
        </div>

        {error && <p className="text-red-500 text-[14px]">{error}</p>}
        <button type="submit" disabled={busy} className={primaryCls}>
          {busy ? 'Saving…' : 'Save score'}
        </button>
      </form>
    </ModalShell>
  )
}
