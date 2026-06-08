import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { TEAMS } from '../data/teams'
import { TEAM_GROUPS } from '../data/teamGroups'
import Preferences from './Preferences'
import { ModalShell } from './AccountModals'
import {
  DUMMY_DRAFT_PLAYERS,
  DUMMY_DRAFT_ORDER,
  DUMMY_DRAFT_PICKS,
  DUMMY_DRAFT_SESSION,
} from '../data/dummyFixtures'

const USE_DUMMY = false // set to true to use dummy data for UI testing

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
  if (memberIds.length === 0) {
    throw new Error('Cannot start a draft with no players.')
  }
  if (new Set(memberIds).size !== memberIds.length) {
    throw new Error('Duplicate players detected — refresh and try again before starting.')
  }
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
  // Persist the expected player count per league so a refresh mid-setup
  // doesn't wipe it.
  const storageKey = `kso-expected-count-${group.id}`
  const [expectedCount, setExpectedCount] = useState(() => {
    try { return localStorage.getItem(storageKey) || '' } catch { return '' }
  })
  const [confirming, setConfirming] = useState(false)

  function updateExpected(v) {
    setExpectedCount(v)
    setConfirming(false)
    try { localStorage.setItem(storageKey, v) } catch { /* ignore */ }
  }

  const expected = Number(expectedCount)
  const expectedValid = Number.isInteger(expected) && expected >= 2
  const countMatches = expectedValid && members.length === expected
  const tooMany = expectedValid && members.length > expected

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
            When everyone has joined, start the draft. Pick order is assigned as a snake draft. <span className="text-[#0a0a0a]/70">No one can join after the draft starts.</span>
          </p>
          {members.length > 0 && (() => {
            const perPlayer = Math.floor(TEAMS.length / members.length)
            const unused = TEAMS.length - perPlayer * members.length
            return (
              <p className="text-[14px] text-[#0a0a0a]/50">
                With <span className="text-[#0a0a0a]">{members.length}</span> {members.length === 1 ? 'player' : 'players'}, each drafts{' '}
                <span className="text-[#0a0a0a]">{perPlayer}</span> {perPlayer === 1 ? 'team' : 'teams'}
                {unused > 0 && <> · <span className="text-[#0a0a0a]">{unused}</span> {unused === 1 ? 'team' : 'teams'} will be unused</>}.
              </p>
            )
          })()}
          <div className="flex flex-col gap-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#0a0a0a]/40">
              Expected number of players
            </p>
            <input
              type="number"
              min="2"
              placeholder="e.g. 24"
              value={expectedCount}
              onChange={e => updateExpected(e.target.value)}
              className="bg-[#e9e9e9] rounded-lg px-4 py-3 text-[16px] text-[#0a0a0a] placeholder:text-[#0a0a0a]/40 outline-none"
            />
          </div>
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

          {expectedValid && !countMatches && (
            <p className="text-[14px] text-[#0a0a0a]/50">
              {tooMany
                ? `${members.length} players have joined but you expected ${expected}. Check the list above before starting.`
                : `Waiting for ${expected - members.length} more ${expected - members.length === 1 ? 'player' : 'players'} (${members.length}/${expected} joined).`}
            </p>
          )}

          {error && <p className="text-red-500 text-[14px]">{error}</p>}

          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              disabled={starting || !countMatches}
              className="bg-[#0a0a0a] text-white rounded-lg px-4 py-3 text-[14px] font-medium uppercase tracking-[0.08em] cursor-pointer disabled:opacity-40"
            >
              Start draft
            </button>
          ) : (
            <div className="flex flex-col gap-2 bg-[#f7f7f7] rounded-lg p-4">
              <p className="text-[14px] text-[#0a0a0a]">
                Start the draft with <span className="font-semibold">{members.length} players</span>? No one can join after this.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={onStartDraft}
                  disabled={starting}
                  className="bg-[#0a0a0a] text-white rounded-lg px-4 py-3 text-[14px] font-medium uppercase tracking-[0.08em] cursor-pointer disabled:opacity-40"
                >
                  {starting ? 'Starting…' : 'Yes, start draft'}
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  disabled={starting}
                  className="text-[14px] font-medium uppercase tracking-[0.08em] text-[#0a0a0a]/40 hover:text-[#0a0a0a] bg-transparent border-none cursor-pointer px-4"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
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
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.() }
      }) : undefined}
      className={`rounded-[6px] bg-[#f0f0f0] p-2 flex flex-col gap-0.5 transition-all ${
        isClickable
          ? 'cursor-pointer hover:bg-[#e4e4e4] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#0a0a0a]/30'
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

function DraftBoard({ group, membership, members, draftSession, draftOrder, picks, onPick, picking, pickError, isCommissioner, onPause, onResume, onUndo, onCommissionerPick, pickingOnBehalf, onTogglePickOnBehalf, onAutoDraft, onResetTimer, onResetDraft }) {
  const memberMap = Object.fromEntries(members.map(m => [m.id, m]))
  const [pendingPick, setPendingPick] = useState(null) // { team, onBehalf }
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [resetting, setResetting] = useState(false)

  const currentOrderEntry = draftOrder[draftSession.current_pick_number - 1]
  const currentMember = currentOrderEntry ? memberMap[currentOrderEntry.group_member_id] : null
  const isMyTurn = currentMember?.id === membership.id
  const isPaused = draftSession.status === 'paused'
  // Total picks in this draft = draft_order length (rounds × players), which can
  // be fewer than all 48 teams when players don't divide evenly. Unused teams
  // simply stay in the available pool and are never drafted.
  const totalPicks = draftOrder.length
  const isDone = draftSession.status === 'complete' || (totalPicks > 0 && draftSession.current_pick_number > totalPicks)

  const secondsLeft = useCountdown(draftSession.pick_deadline)
  const countdown = formatCountdown(secondsLeft)
  const isUrgent = secondsLeft !== null && secondsLeft <= 15

  // Build picks lookup: member id → [team, team, …]
  const picksByMember = {}
  picks.forEach(pick => {
    if (!picksByMember[pick.group_member_id]) picksByMember[pick.group_member_id] = []
    picksByMember[pick.group_member_id].push(pick)
  })

  // How many picks each player gets, derived from the snake order. Every player
  // gets exactly floor(48 / players) picks; draft_order is the source of truth.
  const slotsByMember = {}
  draftOrder.forEach(entry => {
    slotsByMember[entry.group_member_id] = (slotsByMember[entry.group_member_id] || 0) + 1
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
            Pick {draftSession.current_pick_number} of {totalPicks}
            {' · '}{totalPicks - picks.length} picks remaining
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
      {isCommissioner && (
        <div className="flex gap-2 flex-wrap">
          {!isDone && (
            <>
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
              {!isPaused && draftSession.pick_timeout_seconds > 0 && (
                <button
                  onClick={onResetTimer}
                  className="bg-[#e9e9e9] rounded-lg px-3 py-2 text-[13px] font-medium cursor-pointer hover:bg-[#d8d8d8] transition-colors"
                >
                  Reset timer
                </button>
              )}
            </>
          )}
          <button
            onClick={() => setConfirmingReset(true)}
            className="bg-red-50 text-red-600 rounded-lg px-3 py-2 text-[13px] font-medium cursor-pointer hover:bg-red-100 transition-colors"
          >
            Reset draft
          </button>
        </div>
      )}

      {/* Split panel */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">

        {/* ── Left: player list ─────────────────────────────────────────── */}
        <div className="lg:w-[55%] flex flex-col">
          <div className="grid grid-cols-[1.5rem_minmax(0,9rem)_1fr] gap-x-2 gap-y-1 items-center mb-2">
            <span />
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#0a0a0a]/40">Player</p>
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#0a0a0a]/40">Picks</p>
          </div>

          <div className="flex flex-col gap-1">
            {membersInOrder.map((member, i) => {
              const memberPicks = picksByMember[member.id] || []
              const slotCount = slotsByMember[member.id] || 0
              const isCurrentPicker = member.id === currentMember?.id
              const isMe = member.id === membership.id

              return (
                <div
                  key={member.id}
                  className={`grid grid-cols-[1.5rem_minmax(0,9rem)_1fr] gap-x-2 items-start rounded-lg px-1 py-1 ${
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

                  {/* Pick slots — one per pick this player gets in the snake order */}
                  <div className="grid gap-1 [grid-template-columns:repeat(auto-fill,minmax(90px,1fr))]">
                    {Array.from({ length: slotCount }).map((_, slot) => {
                      const pick = memberPicks[slot]
                      const team = pick ? TEAMS.find(t => t.id === pick.team_id) : null
                      return team
                        ? <TeamCard key={slot} team={team} />
                        : <EmptySlot key={slot} />
                    })}
                  </div>
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
                    setPendingPick({ team, onBehalf: pickingOnBehalf })
                  }}
                />
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Confirm pick modal */}
      {pendingPick && (
        <ModalShell onClose={() => setPendingPick(null)}>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <p className="text-[26px] font-semibold leading-[1.1] tracking-[-0.02em]">
                Confirm pick
              </p>
              <p className="text-[#0a0a0a]/50 text-[15px]">
                {pendingPick.onBehalf
                  ? `Pick this team for ${currentMember?.display_name}?`
                  : 'This pick is final and can’t be changed.'}
              </p>
            </div>

            <div className="bg-[#f7f7f7] rounded-xl p-4 flex items-center gap-3">
              <span className="text-[40px] leading-none">{pendingPick.team.flag}</span>
              <div className="flex flex-col gap-0.5 min-w-0">
                <p className="text-[18px] font-semibold leading-tight truncate">{pendingPick.team.name}</p>
                <p className="text-[12px] text-[#0a0a0a]/50">
                  {TEAM_GROUPS[pendingPick.team.name] ? `Group ${TEAM_GROUPS[pendingPick.team.name]}` : '—'}
                  {' · '}#{pendingPick.team.fifaRank} · {MULTIPLIER_LABEL[pendingPick.team.tier]}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  const { team, onBehalf } = pendingPick
                  onBehalf ? onCommissionerPick(team.id) : onPick(team.id)
                  setPendingPick(null)
                }}
                disabled={picking}
                className="flex-1 bg-[#0a0a0a] text-white rounded-lg px-4 py-3 text-[14px] font-medium uppercase tracking-[0.08em] cursor-pointer disabled:opacity-40"
              >
                Confirm
              </button>
              <button
                onClick={() => setPendingPick(null)}
                disabled={picking}
                className="text-[14px] font-medium uppercase tracking-[0.08em] text-[#0a0a0a]/40 hover:text-[#0a0a0a] bg-transparent border-none cursor-pointer px-4"
              >
                Cancel
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* Confirm reset draft modal */}
      {confirmingReset && (
        <ModalShell onClose={() => !resetting && setConfirmingReset(false)}>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <p className="text-[26px] font-semibold leading-[1.1] tracking-[-0.02em]">
                Reset the draft?
              </p>
              <p className="text-[#0a0a0a]/50 text-[15px]">
                This permanently deletes every pick and the pick order, and sends
                everyone back to the waiting room. This can’t be undone.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={async () => {
                  setResetting(true)
                  await onResetDraft()
                  setResetting(false)
                  setConfirmingReset(false)
                }}
                disabled={resetting}
                className="flex-1 bg-red-600 text-white rounded-lg px-4 py-3 text-[14px] font-medium uppercase tracking-[0.08em] cursor-pointer disabled:opacity-40"
              >
                {resetting ? 'Resetting…' : 'Reset draft'}
              </button>
              <button
                onClick={() => setConfirmingReset(false)}
                disabled={resetting}
                className="text-[14px] font-medium uppercase tracking-[0.08em] text-[#0a0a0a]/40 hover:text-[#0a0a0a] bg-transparent border-none cursor-pointer px-4"
              >
                Cancel
              </button>
            </div>
          </div>
        </ModalShell>
      )}
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

  // Listen for the draft starting while sitting in the waiting room.
  // The commissioner INSERTs a draft_session row; everyone else needs to
  // pick that up live instead of having to refresh.
  useEffect(() => {
    if (draftSession || USE_DUMMY) return

    const channel = supabase
      .channel(`draft-start-${group.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'draft_session',
        filter: `group_id=eq.${group.id}`,
      }, async payload => {
        const session = payload.new
        // draft_order is inserted immediately after the session row; give it a
        // beat and refetch if it isn't visible yet.
        async function loadOrder() {
          const [orderRes, picksRes] = await Promise.all([
            supabase.from('draft_order').select().eq('draft_session_id', session.id).order('pick_number'),
            supabase.from('draft_picks').select().eq('draft_session_id', session.id).order('pick_number'),
          ])
          return { order: orderRes.data || [], picks: picksRes.data || [] }
        }
        let { order, picks: sessionPicks } = await loadOrder()
        if (order.length === 0) {
          await new Promise(r => setTimeout(r, 600))
          ;({ order, picks: sessionPicks } = await loadOrder())
        }
        setDraftOrder(order)
        setPicks(sessionPicks)
        setDraftSession(session)
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [group.id, draftSession?.id])

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
        event: 'DELETE',
        schema: 'public',
        table: 'draft_session',
        filter: `id=eq.${draftSession.id}`,
      }, () => {
        // Commissioner reset the draft — return everyone to the waiting room.
        setDraftSession(null)
        setDraftOrder([])
        setPicks([])
      })
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

  async function handleResetTimer() {
    if (!(draftSession.pick_timeout_seconds > 0)) return
    const pick_deadline = new Date(Date.now() + draftSession.pick_timeout_seconds * 1000).toISOString()
    const { error } = await supabase.from('draft_session')
      .update({ pick_deadline })
      .eq('id', draftSession.id)
    if (error) setPickError(error.message)
  }

  async function handleResetDraft() {
    setPickError(null)
    const { error } = await supabase.rpc('reset_draft', { p_group_id: group.id })
    if (error) {
      setPickError(error.message)
      return
    }
    // Locally drop back to the waiting room; other clients get the
    // draft_session DELETE event.
    setPickingOnBehalf(false)
    setDraftSession(null)
    setDraftOrder([])
    setPicks([])
  }

  async function handleStartDraft() {
    setStarting(true)
    setError(null)

    const memberIds = members.map(m => m.id)

    // Rounds = total teams ÷ players, rounded down. Each player drafts that many
    // teams; any teams that don't divide evenly are left undrafted/unused.
    const rounds = Math.floor(TEAMS.length / memberIds.length)
    if (rounds < 1) {
      setError(`Too many players (${memberIds.length}) for ${TEAMS.length} teams — each player needs at least one pick.`)
      setStarting(false)
      return
    }
    const totalPicks = rounds * memberIds.length

    let snakeOrder
    try {
      snakeOrder = generateSnakeOrder(memberIds, totalPicks)
    } catch (e) {
      setError(e.message)
      setStarting(false)
      return
    }

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
      onResetTimer={handleResetTimer}
      onResetDraft={handleResetDraft}
    />
  )
}
