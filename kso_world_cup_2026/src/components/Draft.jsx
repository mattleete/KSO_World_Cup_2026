import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { TEAMS } from '../data/teams'
import Preferences from './Preferences'

const MULTIPLIER_LABEL = { top: '×1', mid: '×2', bottom: '×3' }

// ── Snake order generator ─────────────────────────────────────────────────────

function generateSnakeOrder(memberIds, totalPicks) {
  const order = []
  let round = 0
  while (order.length < totalPicks) {
    const roundMembers = round % 2 === 0 ? memberIds : [...memberIds].reverse()
    for (const id of roundMembers) {
      if (order.length >= totalPicks) break
      order.push(id)
    }
    round++
  }
  return order
}

// ── Waiting room ──────────────────────────────────────────────────────────────

function WaitingRoom({ group, membership, members, isCommissioner, onStartDraft, starting, error }) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h1 className="text-[40px] sm:text-[56px] lg:text-[72px] font-semibold leading-[1.1] tracking-[-0.02em]">
          {group.name}
        </h1>
        <p className="text-[#0a0a0a]/50 text-[16px]">
          Playing as <span className="text-[#0a0a0a]">{membership.display_name}</span>
          {' · '}
          Invite code: <span className="text-[#0a0a0a] font-mono">{group.invite_code}</span>
        </p>
      </div>

      {/* Member list */}
      <div className="flex flex-col gap-2 max-w-sm">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#0a0a0a]/40">
          {members.length} {members.length === 1 ? 'player' : 'players'} joined
        </p>
        {members.map(m => (
          <div key={m.id} className="bg-[#e9e9e9] rounded-lg px-4 py-3 flex items-center justify-between">
            <p className="text-[16px] font-medium">{m.display_name}</p>
            {m.id === membership.id && (
              <p className="text-[12px] text-[#0a0a0a]/40 uppercase tracking-[0.08em]">You</p>
            )}
          </div>
        ))}
      </div>

      {isCommissioner ? (
        <div className="flex flex-col gap-3 max-w-sm">
          <p className="text-[14px] text-[#0a0a0a]/50">
            When everyone has joined, start the draft. Pick order will be randomly assigned as a snake draft.
          </p>
          {error && <p className="text-red-500 text-[14px]">{error}</p>}
          <button
            onClick={onStartDraft}
            disabled={starting || members.length < 1}
            className="bg-[#0a0a0a] text-white rounded-lg px-4 py-3 text-[14px] font-medium uppercase tracking-[0.08em] cursor-pointer disabled:opacity-40"
          >
            {starting ? 'Starting…' : 'Start draft'}
          </button>
        </div>
      ) : (
        <p className="text-[#0a0a0a]/50 text-[16px]">
          Waiting for the commissioner to start the draft…
        </p>
      )}

      <Preferences membership={membership} />
    </div>
  )
}

// ── Draft board ───────────────────────────────────────────────────────────────

function DraftBoard({ group, membership, members, draftSession, draftOrder, picks, onPick, picking, pickError, isCommissioner, onPause, onResume, onUndo, onCommissionerPick, pickingOnBehalf, onTogglePickOnBehalf, onAutoDraft }) {
  const memberMap = Object.fromEntries(members.map(m => [m.id, m]))
  const pickedTeams = Object.fromEntries(picks.map(p => [p.team_id, p]))

  const currentOrderEntry = draftOrder[draftSession.current_pick_number - 1]
  const currentMember = currentOrderEntry ? memberMap[currentOrderEntry.group_member_id] : null
  const isMyTurn = currentMember?.id === membership.id
  const isPaused = draftSession.status === 'paused'
  const isDone = draftSession.status === 'complete' || draftSession.current_pick_number > TEAMS.length

  const sortedTeams = [...TEAMS].sort((a, b) => a.fifaRank - b.fifaRank)
  const recentPicks = [...picks].reverse().slice(0, 10)

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <h1 className="text-[40px] sm:text-[56px] lg:text-[72px] font-semibold leading-[1.1] tracking-[-0.02em]">
          {isDone
            ? 'Draft complete'
            : isMyTurn
            ? "It's your pick"
            : `${currentMember?.display_name ?? '…'} is picking`}
        </h1>
        {!isDone && (
          <p className="text-[#0a0a0a]/50 text-[16px]">
            Pick {draftSession.current_pick_number} of {TEAMS.length}
            {' · '}
            {picks.length} teams drafted
            {' · '}
            {TEAMS.length - picks.length} remaining
          </p>
        )}
        {isPaused && <p className="text-[16px] text-[#0a0a0a]/50">Draft is paused.</p>}
        {!isPaused && isMyTurn && !isDone && (
          <p className="text-[16px] text-[#0a0a0a]">Click a team below to make your pick.</p>
        )}
        {!isPaused && pickingOnBehalf && !isDone && (
          <p className="text-[16px] text-[#0a0a0a]">
            Picking on behalf of <span className="font-semibold">{currentMember?.display_name}</span> — click a team.
          </p>
        )}
        {pickError && <p className="text-red-500 text-[14px]">{pickError}</p>}
      </div>

      {/* Commissioner controls */}
      {isCommissioner && !isDone && (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#0a0a0a]/40">
            Commissioner
          </p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={isPaused ? onResume : onPause}
              className="bg-[#e9e9e9] rounded-lg px-3 py-2 text-[13px] font-medium cursor-pointer hover:bg-[#d8d8d8] transition-colors"
            >
              {isPaused ? 'Resume draft' : 'Pause draft'}
            </button>
            <button
              onClick={onUndo}
              disabled={picks.length === 0}
              className="bg-[#e9e9e9] rounded-lg px-3 py-2 text-[13px] font-medium cursor-pointer hover:bg-[#d8d8d8] transition-colors disabled:opacity-40"
            >
              Undo last pick
            </button>
            {!isMyTurn && !isPaused && (
              <button
                onClick={onTogglePickOnBehalf}
                className={`rounded-lg px-3 py-2 text-[13px] font-medium cursor-pointer transition-colors ${
                  pickingOnBehalf
                    ? 'bg-[#0a0a0a] text-white'
                    : 'bg-[#e9e9e9] hover:bg-[#d8d8d8]'
                }`}
              >
                {pickingOnBehalf ? 'Cancel' : `Pick for ${currentMember?.display_name ?? '…'}`}
              </button>
            )}
            {!isPaused && (
              <button
                onClick={onAutoDraft}
                className="bg-[#e9e9e9] rounded-lg px-3 py-2 text-[13px] font-medium cursor-pointer hover:bg-[#d8d8d8] transition-colors"
              >
                Auto-draft {currentMember?.display_name ?? '…'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Pick order — next 5 picks */}
      {!isDone && (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#0a0a0a]/40">
            Up next
          </p>
          <div className="flex gap-2 flex-wrap">
            {draftOrder
              .slice(draftSession.current_pick_number - 1, draftSession.current_pick_number + 4)
              .map((entry, i) => {
                const member = memberMap[entry.group_member_id]
                return (
                  <div
                    key={entry.pick_number}
                    className={`rounded-lg px-3 py-2 text-[13px] font-medium ${
                      i === 0
                        ? 'bg-[#0a0a0a] text-white'
                        : 'bg-[#e9e9e9] text-[#0a0a0a]/60'
                    }`}
                  >
                    {member?.display_name ?? '?'}
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Team grid */}
      <div className="flex flex-col gap-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#0a0a0a]/40">
          Teams
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {sortedTeams.map(team => {
            const pick = pickedTeams[team.id]
            const picker = pick ? memberMap[pick.group_member_id] : null
            const isPicked = !!pick
            const isClickable = !isPicked && !isDone && !picking && !isPaused &&
              (isMyTurn || pickingOnBehalf)
            const handleClick = () => {
              if (!isClickable) return
              pickingOnBehalf ? onCommissionerPick(team.id) : onPick(team.id)
            }

            return (
              <div
                key={team.id}
                onClick={handleClick}
                className={`rounded-[4px] p-2 flex items-center justify-between h-14 transition-all ${
                  isPicked
                    ? 'bg-[#e9e9e9] opacity-40'
                    : isClickable
                    ? 'bg-[#e9e9e9] cursor-pointer hover:bg-[#d8d8d8] active:scale-[0.98]'
                    : 'bg-[#e9e9e9]'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-[36px] leading-none">{team.flag}</span>
                  <p className="text-[24px] font-semibold leading-[1.1] tracking-[-0.02em]">
                    {team.name}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-2">
                  {picker && (
                    <p className="text-[14px] text-[#0a0a0a]/70 font-medium">
                      {picker.display_name}
                    </p>
                  )}
                  <p className="text-[14px] text-[#0a0a0a]/40">
                    {MULTIPLIER_LABEL[team.tier]}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent picks */}
      {recentPicks.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#0a0a0a]/40">
            Recent picks
          </p>
          <div className="flex flex-col gap-1 max-w-sm">
            {recentPicks.map(pick => {
              const team = TEAMS.find(t => t.id === pick.team_id)
              const picker = memberMap[pick.group_member_id]
              return (
                <div key={pick.id} className="flex items-center justify-between py-2 border-b border-[#e9e9e9]">
                  <div className="flex items-center gap-3">
                    <span className="text-[20px]">{team?.flag}</span>
                    <p className="text-[15px] font-medium">{team?.name}</p>
                  </div>
                  <p className="text-[14px] text-[#0a0a0a]/50">{picker?.display_name}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* My preferences */}
      <Preferences membership={membership} pickedTeamIds={picks.map(p => p.team_id)} />
    </div>
  )
}

// ── Main Draft component ──────────────────────────────────────────────────────

export default function Draft({ context }) {
  const { group, membership } = context
  const isCommissioner = group.commissioner_id === membership.user_id

  const [draftSession, setDraftSession] = useState(null)
  const [members, setMembers] = useState([])
  const [draftOrder, setDraftOrder] = useState([])
  const [picks, setPicks] = useState([])
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [picking, setPicking] = useState(false)
  const [pickError, setPickError] = useState(null)
  const [pickingOnBehalf, setPickingOnBehalf] = useState(false)
  const [error, setError] = useState(null)

  // Load initial data
  useEffect(() => {
    async function load() {
      const [sessionRes, membersRes] = await Promise.all([
        supabase.from('draft_session').select().eq('group_id', group.id).maybeSingle(),
        supabase.from('group_members').select().eq('group_id', group.id).order('joined_at'),
      ])

      setMembers(membersRes.data || [])

      if (sessionRes.data) {
        setDraftSession(sessionRes.data)
        const [orderRes, picksRes] = await Promise.all([
          supabase.from('draft_order').select().eq('draft_session_id', sessionRes.data.id).order('pick_number'),
          supabase.from('draft_picks').select().eq('draft_session_id', sessionRes.data.id).order('pick_number'),
        ])
        setDraftOrder(orderRes.data || [])
        setPicks(picksRes.data || [])
      }

      setLoading(false)
    }
    load()
  }, [group.id])

  // Real-time subscriptions
  useEffect(() => {
    if (!draftSession) return

    const channel = supabase
      .channel(`draft-${draftSession.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'draft_session',
        filter: `id=eq.${draftSession.id}`,
      }, payload => setDraftSession(payload.new))
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'draft_picks',
        filter: `draft_session_id=eq.${draftSession.id}`,
      }, payload => setPicks(prev => [...prev, payload.new]))
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [draftSession?.id])

  async function handlePick(teamId) {
    setPicking(true)
    setPickError(null)
    const { error } = await supabase.rpc('make_pick', {
      p_draft_session_id: draftSession.id,
      p_team_id: teamId,
    })
    if (error) setPickError(error.message)
    setPicking(false)
  }

  async function handleCommissionerPick(teamId) {
    setPicking(true)
    setPickError(null)
    const { error } = await supabase.rpc('commissioner_pick', {
      p_draft_session_id: draftSession.id,
      p_team_id: teamId,
    })
    if (error) setPickError(error.message)
    else setPickingOnBehalf(false)
    setPicking(false)
  }

  async function handleAutoDraft() {
    setPicking(true)
    setPickError(null)
    const { error } = await supabase.rpc('auto_draft', { p_draft_session_id: draftSession.id })
    if (error) setPickError(error.message)
    setPicking(false)
  }

  async function handlePause() {
    await supabase.from('draft_session').update({ status: 'paused' }).eq('id', draftSession.id)
  }

  async function handleResume() {
    await supabase.from('draft_session').update({ status: 'active' }).eq('id', draftSession.id)
  }

  async function handleUndo() {
    const { error } = await supabase.rpc('undo_pick', { p_draft_session_id: draftSession.id })
    if (error) {
      setPickError(error.message)
    } else {
      setPickingOnBehalf(false)
      const { data } = await supabase
        .from('draft_picks')
        .select()
        .eq('draft_session_id', draftSession.id)
        .order('pick_number')
      if (data) setPicks(data)
    }
  }

  async function handleStartDraft() {
    setStarting(true)
    setError(null)

    const memberIds = members.map(m => m.id)
    const snakeOrder = generateSnakeOrder(memberIds, TEAMS.length)

    const { data: session, error: sessionError } = await supabase
      .from('draft_session')
      .insert({ group_id: group.id, status: 'active', current_pick_number: 1 })
      .select()
      .single()

    if (sessionError) {
      setError(sessionError.message)
      setStarting(false)
      return
    }

    const orderRows = snakeOrder.map((memberId, i) => ({
      draft_session_id: session.id,
      pick_number: i + 1,
      group_member_id: memberId,
    }))

    const { error: orderError } = await supabase.from('draft_order').insert(orderRows)

    if (orderError) {
      setError(orderError.message)
      setStarting(false)
      return
    }

    setDraftSession(session)
    setDraftOrder(orderRows)
    setStarting(false)
  }

  if (loading) return <p className="text-[#0a0a0a]/50 text-[16px]">Loading draft…</p>

  if (!draftSession) {
    return (
      <WaitingRoom
        group={group}
        membership={membership}
        members={members}
        isCommissioner={isCommissioner}
        onStartDraft={handleStartDraft}
        starting={starting}
        error={error}
      />
    )
  }

  return (
    <DraftBoard
      group={group}
      membership={membership}
      members={members}
      draftSession={draftSession}
      draftOrder={draftOrder}
      picks={picks}
      onPick={handlePick}
      picking={picking}
      pickError={pickError}
      isCommissioner={isCommissioner}
      onPause={handlePause}
      onResume={handleResume}
      onUndo={handleUndo}
      onCommissionerPick={handleCommissionerPick}
      pickingOnBehalf={pickingOnBehalf}
      onTogglePickOnBehalf={() => setPickingOnBehalf(p => !p)}
      onAutoDraft={handleAutoDraft}
    />
  )
}
