import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { TEAMS } from '../data/teams'
import { TEAM_GROUPS } from '../data/teamGroups'
import Preferences from './Preferences'
import {
  DUMMY_DRAFT_PLAYERS,
  DUMMY_DRAFT_ORDER,
  DUMMY_DRAFT_PICKS,
  DUMMY_DRAFT_SESSION,
} from '../data/dummyFixtures'

const USE_DUMMY = true // set to false to use live Supabase data

const MULTIPLIER_LABEL = { top: '×1', upper: '×2', lower: '×3', bottom: '×4' }

const TIMEOUT_OPTIONS = [
  { label: '60 seconds', value: 60 },
  { label: '90 seconds', value: 90 },
  { label: '2 minutes', value: 120 },
  { label: '5 minutes', value: 300 },
  { label: 'No limit', value: 0 },
]

// ── Countdown timer hook ──────────────────────────────────────────────────────

function useCountdown(deadline) {
  const [secondsLeft, setSecondsLeft] = useState(null)

  useEffect(() => {
    if (!deadline) { setSecondsLeft(null); return }

    function tick() {
      const diff = Math.ceil((new Date(deadline) - new Date()) / 1000)
      setSecondsLeft(Math.max(0, diff))
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [deadline])

  return secondsLeft
}

function formatCountdown(seconds) {
  if (seconds === null) return null
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`
}

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

function WaitingRoom({ group, membership, members, isCommissioner, onStartDraft, starting, error, timeoutSeconds, onTimeoutChange }) {
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
          <div className="flex flex-col gap-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#0a0a0a]/40">
              Time per pick
            </p>
            <select
              value={timeoutSeconds}
              onChange={e => onTimeoutChange(Number(e.target.value))}
              className="bg-[#e9e9e9] rounded-lg px-4 py-3 text-[16px] text-[#0a0a0a] outline-none cursor-pointer"
            >
              {TIMEOUT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
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

// ── Team card (used in both pick slots and available panel) ──────────────────

function TeamCard({ team, isClickable, onClick }) {
  const group = TEAM_GROUPS[team.name]
  return (
    <div
      onClick={onClick}
      className={`rounded-[6px] bg-[#f0f0f0] p-2 flex flex-col gap-0.5 transition-all ${
        isClickable
          ? 'cursor-pointer hover:bg-[#e4e4e4] active:scale-[0.98]'
          : ''
      }`}
    >
      <span className="text-[22px] leading-none">{team.flag}</span>
      <p className="text-[12px] font-semibold leading-tight truncate">{team.name}</p>
      <p className="text-[10px] text-[#0a0a0a]/50">
        {group ? `Group ${group}` : '—'}
      </p>
      <p className="text-[10px] text-[#0a0a0a]/40">
        #{team.fifaRank} · {MULTIPLIER_LABEL[team.tier]}
      </p>
    </div>
  )
}

function EmptySlot() {
  return (
    <div className="rounded-[6px] border-2 border-dashed border-[#0a0a0a]/10 min-h-[76px]" />
  )
}

// ── Draft board ───────────────────────────────────────────────────────────────

function DraftBoard({ group, membership, members, draftSession, draftOrder, picks, onPick, picking, pickError, isCommissioner, onPause, onResume, onUndo, onCommissionerPick, pickingOnBehalf, onTogglePickOnBehalf, onAutoDraft }) {
  const memberMap = Object.fromEntries(members.map(m => [m.id, m]))

  const currentOrderEntry = draftOrder[draftSession.current_pick_number - 1]
  const currentMember = currentOrderEntry ? memberMap[currentOrderEntry.group_member_id] : null
  const isMyTurn = currentMember?.id === membership.id
  const isPaused = draftSession.status === 'paused'
  const isDone = draftSession.status === 'complete' || draftSession.current_pick_number > TEAMS.length

  const secondsLeft = useCountdown(draftSession.pick_deadline)
  const countdown = formatCountdown(secondsLeft)
  const isUrgent = secondsLeft !== null && secondsLeft <= 15

  // Build picks lookup: member id → [team, team]
  const picksByMember = {}
  picks.forEach(pick => {
    if (!picksByMember[pick.group_member_id]) picksByMember[pick.group_member_id] = []
    picksByMember[pick.group_member_id].push(pick)
  })

  // Members in round-1 pick order (first N entries of draftOrder)
  const membersInOrder = draftOrder
    .slice(0, members.length)
    .map(entry => memberMap[entry.group_member_id])
    .filter(Boolean)

  // Available teams (not yet picked), sorted by FIFA rank
  const pickedTeamIds = new Set(picks.map(p => p.team_id))
  const availableTeams = [...TEAMS]
    .sort((a, b) => a.fifaRank - b.fifaRank)
    .filter(t => !pickedTeamIds.has(t.id))

  const canPick = !isDone && !picking && !isPaused && (isMyTurn || pickingOnBehalf)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1
          className="text-[40px] sm:text-[56px] lg:text-[72px] font-semibold leading-none"
          style={{ letterSpacing: '-2.88px' }}
        >
          {isDone
            ? 'Draft complete'
            : isMyTurn
            ? "It's your pick"
            : `${currentMember?.display_name ?? '…'} is picking`}
        </h1>
        {!isDone && (
          <p className="text-[#0a0a0a]/50 text-[16px]">
            Pick {draftSession.current_pick_number} of {TEAMS.length}
            {' · '}{TEAMS.length - picks.length} teams remaining
          </p>
        )}
        {!isDone && countdown && !isPaused && (
          <p className={`text-[40px] sm:text-[56px] font-semibold leading-none tabular-nums ${isUrgent ? 'text-red-500' : 'text-[#0a0a0a]/20'}`}>
            {countdown}
          </p>
        )}
        {isPaused && <p className="text-[16px] text-[#0a0a0a]/50">Draft is paused.</p>}
        {canPick && (
          <p className="text-[16px] text-[#0a0a0a]">
            {pickingOnBehalf
              ? `Picking on behalf of ${currentMember?.display_name} — click a team on the right.`
              : 'Click a team on the right to make your pick.'}
          </p>
        )}
        {pickError && <p className="text-red-500 text-[14px]">{pickError}</p>}
      </div>

      {/* Commissioner controls */}
      {isCommissioner && !isDone && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={isPaused ? onResume : onPause}
            className="bg-[#e9e9e9] rounded-lg px-3 py-2 text-[13px] font-medium cursor-pointer hover:bg-[#d8d8d8] transition-colors"
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button
            onClick={onUndo}
            disabled={picks.length === 0}
            className="bg-[#e9e9e9] rounded-lg px-3 py-2 text-[13px] font-medium cursor-pointer hover:bg-[#d8d8d8] transition-colors disabled:opacity-40"
          >
            Undo
          </button>
          {!isMyTurn && !isPaused && (
            <button
              onClick={onTogglePickOnBehalf}
              className={`rounded-lg px-3 py-2 text-[13px] font-medium cursor-pointer transition-colors ${
                pickingOnBehalf ? 'bg-[#0a0a0a] text-white' : 'bg-[#e9e9e9] hover:bg-[#d8d8d8]'
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
              Auto-draft
            </button>
          )}
        </div>
      )}

      {/* Split panel */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">

        {/* ── Left: player list ─────────────────────────────────────────── */}
        <div className="lg:w-[55%] flex flex-col">
          <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_1fr_1fr] gap-x-2 gap-y-1 items-center mb-2">
            <span />
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#0a0a0a]/40">Player</p>
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#0a0a0a]/40">Pick 1</p>
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#0a0a0a]/40">Pick 2</p>
          </div>

          <div className="flex flex-col gap-1">
            {membersInOrder.map((member, i) => {
              const memberPicks = picksByMember[member.id] || []
              const team1 = memberPicks[0] ? TEAMS.find(t => t.id === memberPicks[0].team_id) : null
              const team2 = memberPicks[1] ? TEAMS.find(t => t.id === memberPicks[1].team_id) : null
              const isCurrentPicker = member.id === currentMember?.id
              const isMe = member.id === membership.id

              return (
                <div
                  key={member.id}
                  className={`grid grid-cols-[1.5rem_minmax(0,1fr)_1fr_1fr] gap-x-2 items-start rounded-lg px-1 py-1 ${
                    isCurrentPicker ? 'bg-[#f7f7f7]' : ''
                  }`}
                >
                  {/* Pick number */}
                  <p className="text-[11px] text-[#0a0a0a]/30 pt-1.5 text-right">{i + 1}</p>

                  {/* Name */}
                  <div className="pt-1.5 min-w-0">
                    <p className={`text-[13px] font-semibold truncate ${isCurrentPicker ? '' : 'text-[#0a0a0a]'}`}>
                      {member.display_name}
                    </p>
                    {isMe && (
                      <p className="text-[10px] text-[#0a0a0a]/40">You</p>
                    )}
                    {isCurrentPicker && !isMe && (
                      <p className="text-[10px] text-green-600">Picking…</p>
                    )}
                  </div>

                  {/* Pick slot 1 */}
                  {team1 ? <TeamCard team={team1} /> : <EmptySlot />}

                  {/* Pick slot 2 */}
                  {team2 ? <TeamCard team={team2} /> : <EmptySlot />}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Right: available teams ────────────────────────────────────── */}
        <div className="lg:w-[45%] flex flex-col gap-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#0a0a0a]/40">
            {availableTeams.length} teams available
          </p>
          {availableTeams.length === 0 ? (
            <p className="text-[14px] text-[#0a0a0a]/40">All teams have been drafted.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {availableTeams.map(team => (
                <TeamCard
                  key={team.id}
                  team={team}
                  isClickable={canPick}
                  onClick={() => {
                    if (!canPick) return
                    pickingOnBehalf ? onCommissionerPick(team.id) : onPick(team.id)
                  }}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

// ── Main Draft component ──────────────────────────────────────────────────────

const DUMMY_CONTEXT = {
  group: { id: 'dummy-group', name: 'KSO World Cup', invite_code: 'WOLF-42', commissioner_id: 'user-1' },
  membership: { id: '1', user_id: 'user-1', display_name: 'Matt' },
}

export default function Draft({ context }) {
  const { group, membership } = USE_DUMMY ? DUMMY_CONTEXT : context
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
  const [timeoutSeconds, setTimeoutSeconds] = useState(90)
  const [error, setError] = useState(null)

  // Load initial data
  useEffect(() => {
    if (USE_DUMMY) {
      setMembers(DUMMY_DRAFT_PLAYERS)
      setDraftSession(DUMMY_DRAFT_SESSION)
      setDraftOrder(DUMMY_DRAFT_ORDER)
      setPicks(DUMMY_DRAFT_PICKS)
      setLoading(false)
      return
    }

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
    if (!draftSession || USE_DUMMY) return

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
    await supabase.from('draft_session')
      .update({ status: 'paused', pick_deadline: null })
      .eq('id', draftSession.id)
  }

  async function handleResume() {
    const pick_deadline = draftSession.pick_timeout_seconds > 0
      ? new Date(Date.now() + draftSession.pick_timeout_seconds * 1000).toISOString()
      : null
    await supabase.from('draft_session')
      .update({ status: 'active', pick_deadline })
      .eq('id', draftSession.id)
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

    const pick_deadline = timeoutSeconds > 0
      ? new Date(Date.now() + timeoutSeconds * 1000).toISOString()
      : null

    const { data: session, error: sessionError } = await supabase
      .from('draft_session')
      .insert({ group_id: group.id, status: 'active', current_pick_number: 1, pick_timeout_seconds: timeoutSeconds, pick_deadline })
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
        timeoutSeconds={timeoutSeconds}
        onTimeoutChange={setTimeoutSeconds}
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
