import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getTeamById } from '../data/teams'
import { fetchFixtures } from '../utils/api'
import { fetchManualResults, resultKey, SUPERADMIN_EMAIL } from '../utils/results'
import { ConfirmModal, EditMemberNameModal, EditPickModal, ScoreModal } from './AdminModals'

const STATUS_LABEL = {
  waiting:  'Waiting room',
  active:   'Draft in progress',
  paused:   'Draft paused',
  complete: 'Draft complete',
}

function Hero({ children }) {
  return (
    <div className="py-10 lg:py-14">
      <h1 className="text-[40px] sm:text-[56px] lg:text-[72px] font-semibold leading-none" style={{ letterSpacing: '-2.88px' }}>
        {children}
      </h1>
    </div>
  )
}

export default function Admin({ context, session }) {
  const groupId = context.group.id
  const isCommissioner = context.group.commissioner_id === session?.user?.id
  const isSuperadmin   = session?.user?.email === SUPERADMIN_EMAIL

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [draftSession, setDraftSession] = useState(null)
  const [members, setMembers] = useState([])
  const [picks, setPicks] = useState([])
  const [fixtures, setFixtures] = useState([])
  const [manual, setManual] = useState([])
  const [modal, setModal] = useState(null)
  const [notice, setNotice] = useState(null)
  const [copied, setCopied] = useState(false)

  async function loadDraft() {
    const [sessionRes, membersRes] = await Promise.all([
      supabase.from('draft_session').select().eq('group_id', groupId).maybeSingle(),
      supabase.from('group_members').select().eq('group_id', groupId).order('joined_at'),
    ])
    setDraftSession(sessionRes.data || null)
    setMembers(membersRes.data || [])
    if (sessionRes.data) {
      const picksRes = await supabase
        .from('draft_picks').select().eq('draft_session_id', sessionRes.data.id).order('pick_number')
      setPicks(picksRes.data || [])
    } else {
      setPicks([])
    }
  }

  async function loadScores() {
    const [fx, mn] = await Promise.all([
      fetchFixtures().catch(() => []),
      fetchManualResults().catch(() => []),
    ])
    setFixtures(fx)
    setManual(mn)
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        await Promise.all([loadDraft(), loadScores()])
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [groupId])

  function flash(msg) {
    setNotice(msg)
    setTimeout(() => setNotice(n => (n === msg ? null : n)), 2500)
  }

  function copyCode() {
    navigator.clipboard?.writeText(context.group.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (loading) {
    return <div><Hero>Admin</Hero><p className="text-[14px] text-[#0a0a0a]/50">Loading…</p></div>
  }
  if (error) {
    return <div><Hero>Admin</Hero><p className="text-[14px] text-red-600">Couldn't load — {error}</p></div>
  }

  // ── Derived ──────────────────────────────────────────────────────────────
  const ownerByTeamId = new Map()
  const picksByMember = {}
  picks.forEach(p => {
    const m = members.find(x => x.id === p.group_member_id)
    if (m) ownerByTeamId.set(p.team_id, m.display_name)
    ;(picksByMember[p.group_member_id] ||= []).push(p)
  })
  const hasPicks = picks.length > 0

  // Games table — fixtures with manual overlays + any manual-only rows.
  const manualByKey = new Map(manual.map(m => [resultKey(m.team1, m.team2, m.stage), m]))
  const seen = new Set()
  const gameRows = []
  for (const f of fixtures) {
    const k = resultKey(f.team1, f.team2, f.stage)
    const m = manualByKey.get(k)
    gameRows.push({
      key: k, team1: f.team1, team2: f.team2, stage: f.stage,
      score1: m ? m.score1 : f.score1, score2: m ? m.score2 : f.score2,
      manual: !!m, manualId: m?.id, date: f.date,
    })
    seen.add(k)
  }
  for (const m of manual) {
    const k = resultKey(m.team1, m.team2, m.stage)
    if (seen.has(k)) continue
    gameRows.push({ key: k, team1: m.team1, team2: m.team2, stage: m.stage, score1: m.score1, score2: m.score2, manual: true, manualId: m.id, date: m.date })
  }
  gameRows.sort((a, b) => {
    const da = a.date ? new Date(a.date) : Infinity
    const db = b.date ? new Date(b.date) : Infinity
    return da - db
  })

  // ── Action handlers (open modals) ─────────────────────────────────────────
  function confirmRemovePlayer(member) {
    const preDraft = !draftSession
    setModal({
      kind: 'confirm',
      title: `Remove ${member.display_name}?`,
      body: preDraft
        ? 'They’ll be removed from the league.'
        : (draftSession.status === 'active' || draftSession.status === 'paused'
            ? 'The draft is in progress — removing a player now is disruptive (consider Reset draft instead). Their picks will be deleted and their teams freed.'
            : 'They’ll be removed from the league and their drafted teams freed up.'),
      confirmLabel: 'Remove',
      onConfirm: async () => {
        const fn = preDraft ? 'remove_member' : 'admin_remove_member'
        const { error } = await supabase.rpc(fn, { p_group_id: groupId, p_member_id: member.id })
        if (error) return error.message
        await loadDraft()
        flash(`Removed ${member.display_name}.`)
        return null
      },
    })
  }

  function confirmResetDraft() {
    setModal({
      kind: 'confirm',
      title: 'Reset the draft?',
      body: 'All picks and the draft order will be wiped and the league returns to the waiting room. This cannot be undone.',
      confirmLabel: 'Reset draft',
      onConfirm: async () => {
        const { error } = await supabase.rpc('reset_draft', { p_group_id: groupId })
        if (error) return error.message
        await loadDraft()
        flash('Draft reset.')
        return null
      },
    })
  }

  function confirmScramble() {
    setModal({
      kind: 'confirm',
      title: 'Scramble the draft order?',
      body: 'The pick order will be re-rolled at random. Only possible before any picks are made.',
      confirmLabel: 'Scramble',
      onConfirm: async () => {
        const { error } = await supabase.rpc('scramble_draft_order', { p_group_id: groupId })
        if (error) return error.message
        await loadDraft()
        flash('Draft order scrambled.')
        return null
      },
    })
  }

  function confirmResetScores() {
    setModal({
      kind: 'confirm',
      title: 'Reset all scores?',
      body: 'Every manually-entered score will be deleted, returning games to their fresh/unplayed baseline.',
      confirmLabel: 'Reset scores',
      onConfirm: async () => {
        const { error } = await supabase.rpc('reset_all_match_results')
        if (error) return error.message
        await loadScores()
        flash('All scores reset.')
        return null
      },
    })
  }

  function confirmRemoveOverride(row) {
    setModal({
      kind: 'confirm',
      title: 'Remove this score?',
      body: `${row.team1} vs ${row.team2} will revert to the live feed (or unplayed).`,
      confirmLabel: 'Remove',
      onConfirm: async () => {
        const { error } = await supabase.rpc('delete_match_result', { p_id: row.manualId })
        if (error) return error.message
        await loadScores()
        flash('Score removed.')
        return null
      },
    })
  }

  const status = draftSession?.status || 'waiting'

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="pb-16">
      <Hero>Admin</Hero>

      {notice && (
        <p className="mb-4 text-[13px] text-green-700 bg-green-50 rounded-lg px-4 py-2">{notice}</p>
      )}

      {/* League summary header */}
      {isCommissioner && (
        <div className="bg-[#f7f7f7] rounded-lg p-5 mb-10 flex flex-wrap items-center gap-x-8 gap-y-3">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-[0.08em] text-[#0a0a0a]/40">League</span>
            <span className="text-[16px] font-semibold">{context.group.name}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-[0.08em] text-[#0a0a0a]/40">Invite code</span>
            <button onClick={copyCode} className="text-[16px] font-mono text-left bg-transparent border-none cursor-pointer p-0 hover:text-[#0a0a0a]/60 transition-colors">
              {context.group.invite_code} <span className="text-[11px] text-[#0a0a0a]/40">{copied ? '✓ copied' : 'copy'}</span>
            </button>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-[0.08em] text-[#0a0a0a]/40">Players</span>
            <span className="text-[16px] font-semibold">{members.length}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-[0.08em] text-[#0a0a0a]/40">Draft</span>
            <span className="text-[16px] font-semibold">{STATUS_LABEL[status] || status}</span>
          </div>
        </div>
      )}

      {/* ── Section A — Players & picks ── */}
      {isCommissioner && (
        <section className="mb-12">
          <h2 className="text-[13px] font-medium uppercase tracking-[0.08em] text-[#0a0a0a]/40 mb-3">Players &amp; picks</h2>
          {!draftSession && (
            <p className="text-[14px] text-[#0a0a0a]/50 mb-3">The draft hasn’t started — teams will appear here once it does.</p>
          )}
          <div className="flex flex-col gap-2">
            {members.map(member => {
              const myPicks = (picksByMember[member.id] || []).slice().sort((a, b) => a.pick_number - b.pick_number)
              return (
                <div key={member.id} className="bg-[#f7f7f7] rounded-lg p-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="text-[16px] font-semibold">{member.display_name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => setModal({ kind: 'rename', member })}
                        className="text-[11px] uppercase tracking-[0.08em] text-[#0a0a0a]/50 hover:text-[#0a0a0a] bg-transparent border-none cursor-pointer p-1">
                        Rename
                      </button>
                      <button onClick={() => confirmRemovePlayer(member)}
                        className="text-[11px] uppercase tracking-[0.08em] text-red-600/70 hover:text-red-600 bg-transparent border-none cursor-pointer p-1">
                        Remove
                      </button>
                    </div>
                  </div>
                  {myPicks.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {myPicks.map(p => {
                        const t = getTeamById(p.team_id)
                        return (
                          <button key={p.id} onClick={() => setModal({ kind: 'editPick', pick: p })}
                            className="flex items-center gap-1.5 bg-white rounded-md px-2.5 py-1.5 cursor-pointer hover:bg-[#efefef] transition-colors">
                            <span className="text-[15px] leading-none">{t?.flag}</span>
                            <span className="text-[12px] font-medium">{t?.name || `#${p.team_id}`}</span>
                            <span className="text-[10px] text-[#0a0a0a]/30">edit</span>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-[12px] text-[#0a0a0a]/40">No teams yet.</p>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Section B — Games & scores ── */}
      <section className="mb-12">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-[13px] font-medium uppercase tracking-[0.08em] text-[#0a0a0a]/40">Games &amp; scores</h2>
          {isSuperadmin && (
            <button onClick={() => setModal({ kind: 'score', prefill: {} })}
              className="text-[11px] font-medium uppercase tracking-[0.08em] bg-[#0a0a0a] text-white rounded-lg px-3 py-2 cursor-pointer">
              + Add result
            </button>
          )}
        </div>

        <div className="flex flex-col gap-1">
          {gameRows.map(row => {
            const played = row.score1 != null && row.score2 != null
            const canEdit = isSuperadmin && row.team1 && row.team2
            return (
              <div key={row.key} className="bg-[#f7f7f7] rounded-lg px-4 py-3 flex items-center gap-3">
                <span className="text-[10px] uppercase tracking-[0.08em] text-[#0a0a0a]/40 w-28 shrink-0 truncate">{row.stage || '—'}</span>
                <span className="flex-1 text-[14px] text-right truncate">{row.team1 || 'TBC'}</span>
                <span className="text-[14px] font-semibold tabular-nums w-14 text-center">
                  {played ? `${row.score1}–${row.score2}` : '–'}
                </span>
                <span className="flex-1 text-[14px] truncate">{row.team2 || 'TBC'}</span>
                {row.manual && (
                  <span className="text-[9px] uppercase tracking-[0.08em] text-[#0a0a0a]/40 bg-[#e9e9e9] rounded px-1.5 py-0.5 shrink-0">Manual</span>
                )}
                {canEdit && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setModal({ kind: 'score', prefill: { id: row.manualId ?? null, team1: row.team1, team2: row.team2, stage: row.stage, score1: row.score1, score2: row.score2 } })}
                      className="text-[11px] uppercase tracking-[0.08em] text-[#0a0a0a]/50 hover:text-[#0a0a0a] bg-transparent border-none cursor-pointer p-1">
                      {row.manual ? 'Edit' : 'Enter'}
                    </button>
                    {row.manual && (
                      <button onClick={() => confirmRemoveOverride(row)}
                        className="text-[11px] uppercase tracking-[0.08em] text-red-600/70 hover:text-red-600 bg-transparent border-none cursor-pointer p-1">
                        ✕
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          {gameRows.length === 0 && (
            <p className="text-[14px] text-[#0a0a0a]/50">No games yet.</p>
          )}
        </div>
      </section>

      {/* ── Section C — Reset / testing controls ── */}
      {(isCommissioner || isSuperadmin) && (
        <section>
          <h2 className="text-[13px] font-medium uppercase tracking-[0.08em] text-red-600/60 mb-3">Danger zone</h2>
          <div className="border border-red-200 rounded-lg p-4 flex flex-wrap gap-2">
            {isCommissioner && (
              <button onClick={confirmResetDraft}
                className="text-[12px] font-medium uppercase tracking-[0.08em] border border-red-300 text-red-600 rounded-lg px-3 py-2 cursor-pointer hover:bg-red-50 bg-transparent transition-colors">
                Reset draft
              </button>
            )}
            {isCommissioner && (
              <button onClick={confirmScramble} disabled={!draftSession || hasPicks}
                title={!draftSession ? 'Start the draft first' : hasPicks ? 'Picks already made' : ''}
                className="text-[12px] font-medium uppercase tracking-[0.08em] border border-red-300 text-red-600 rounded-lg px-3 py-2 cursor-pointer hover:bg-red-50 bg-transparent transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                Scramble draft order
              </button>
            )}
            {isSuperadmin && (
              <button onClick={confirmResetScores}
                className="text-[12px] font-medium uppercase tracking-[0.08em] border border-red-300 text-red-600 rounded-lg px-3 py-2 cursor-pointer hover:bg-red-50 bg-transparent transition-colors">
                Reset all scores
              </button>
            )}
          </div>
        </section>
      )}

      {/* ── Modals ── */}
      {modal?.kind === 'confirm' && (
        <ConfirmModal
          title={modal.title} body={modal.body} confirmLabel={modal.confirmLabel}
          onConfirm={modal.onConfirm} onClose={() => setModal(null)}
        />
      )}
      {modal?.kind === 'rename' && (
        <EditMemberNameModal
          member={modal.member} groupId={groupId}
          onSaved={async () => { await loadDraft(); setModal(null); flash('Name updated.') }}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.kind === 'editPick' && (
        <EditPickModal
          pick={modal.pick} ownerByTeamId={ownerByTeamId}
          onSaved={async () => { await loadDraft(); setModal(null); flash('Pick updated.') }}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.kind === 'score' && (
        <ScoreModal
          prefill={modal.prefill} manual={manual}
          onSaved={async () => { await loadScores(); setModal(null); flash('Score saved.') }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
