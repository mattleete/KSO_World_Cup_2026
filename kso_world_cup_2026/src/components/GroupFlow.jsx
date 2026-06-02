import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { generateInviteCode, JOIN_CONFLICT_MESSAGE, INVITE_NOT_FOUND_MESSAGE } from '../utils/league'

// ── Create league ─────────────────────────────────────────────────────────────

function CreateLeague({ user, onJoined }) {
  const [leagueName, setLeagueName] = useState('')
  const [displayName, setDisplayName] = useState(user.user_metadata?.display_name || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleCreate(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const inviteCode = generateInviteCode()

    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({ name: leagueName, invite_code: inviteCode, commissioner_id: user.id })
      .select()
      .single()

    if (groupError) {
      setError(groupError.message)
      setLoading(false)
      return
    }

    const { error: memberError } = await supabase
      .from('group_members')
      .insert({ group_id: group.id, user_id: user.id, display_name: displayName })

    if (memberError) {
      setError(memberError.code === '23505' ? JOIN_CONFLICT_MESSAGE : memberError.message)
      setLoading(false)
      return
    }

    onJoined(group)
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className="text-[40px] sm:text-[56px] lg:text-[72px] font-semibold leading-[1.1] tracking-[-0.02em]">
          Create a league
        </p>
        <p className="text-[#0a0a0a]/50 text-[16px]">
          You'll get an invite code to share with your friends.
        </p>
      </div>

      <form onSubmit={handleCreate} className="flex flex-col gap-3 max-w-sm">
        <input
          type="text"
          placeholder="League name (e.g. KSO World Cup)"
          value={leagueName}
          onChange={e => setLeagueName(e.target.value)}
          required
          className="bg-[#e9e9e9] rounded-lg px-4 py-3 text-[16px] text-[#0a0a0a] placeholder:text-[#0a0a0a]/40 outline-none focus:ring-2 focus:ring-[#0a0a0a]/20"
        />
        <input
          type="text"
          placeholder="Your name in this league"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          required
          className="bg-[#e9e9e9] rounded-lg px-4 py-3 text-[16px] text-[#0a0a0a] placeholder:text-[#0a0a0a]/40 outline-none focus:ring-2 focus:ring-[#0a0a0a]/20"
        />
        {error && <p className="text-red-500 text-[14px]">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="bg-[#0a0a0a] text-white rounded-lg px-4 py-3 text-[14px] font-medium uppercase tracking-[0.08em] cursor-pointer disabled:opacity-40"
        >
          {loading ? 'Creating…' : 'Create league'}
        </button>
      </form>
    </div>
  )
}

// ── Join league ───────────────────────────────────────────────────────────────

function JoinLeague({ user, prefillCode, onJoined }) {
  const [inviteCode, setInviteCode] = useState(prefillCode || '')
  const [displayName, setDisplayName] = useState(user.user_metadata?.display_name || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleJoin(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select()
      .eq('invite_code', inviteCode.toUpperCase())
      .single()

    if (groupError || !group) {
      setError(INVITE_NOT_FOUND_MESSAGE)
      setLoading(false)
      return
    }

    const { error: memberError } = await supabase
      .from('group_members')
      .insert({ group_id: group.id, user_id: user.id, display_name: displayName })

    if (memberError) {
      setError(memberError.code === '23505' ? JOIN_CONFLICT_MESSAGE : memberError.message)
      setLoading(false)
      return
    }

    onJoined(group)
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className="text-[40px] sm:text-[56px] lg:text-[72px] font-semibold leading-[1.1] tracking-[-0.02em]">
          Join a league
        </p>
        <p className="text-[#0a0a0a]/50 text-[16px]">
          Enter the invite code your friend shared with you.
        </p>
      </div>

      <form onSubmit={handleJoin} className="flex flex-col gap-3 max-w-sm">
        <input
          type="text"
          placeholder="Invite code (e.g. WOLF-42)"
          value={inviteCode}
          onChange={e => setInviteCode(e.target.value.toUpperCase())}
          required
          className="bg-[#e9e9e9] rounded-lg px-4 py-3 text-[16px] text-[#0a0a0a] placeholder:text-[#0a0a0a]/40 outline-none focus:ring-2 focus:ring-[#0a0a0a]/20 tracking-wider"
        />
        <input
          type="text"
          placeholder="Your name in this league"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          required
          className="bg-[#e9e9e9] rounded-lg px-4 py-3 text-[16px] text-[#0a0a0a] placeholder:text-[#0a0a0a]/40 outline-none focus:ring-2 focus:ring-[#0a0a0a]/20"
        />
        {error && <p className="text-red-500 text-[14px]">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="bg-[#0a0a0a] text-white rounded-lg px-4 py-3 text-[14px] font-medium uppercase tracking-[0.08em] cursor-pointer disabled:opacity-40"
        >
          {loading ? 'Joining…' : 'Join league'}
        </button>
      </form>
    </div>
  )
}

// ── League picker (if user is in multiple leagues) ─────────────────────────────

function PickLeague({ memberships, onSelect, onCreateNew, onJoinNew }) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className="text-[40px] sm:text-[56px] lg:text-[72px] font-semibold leading-[1.1] tracking-[-0.02em]">
          Your leagues
        </p>
        <p className="text-[#0a0a0a]/50 text-[16px]">
          Pick a league to continue to the draft.
        </p>
      </div>

      <div className="flex flex-col gap-2 max-w-sm">
        {memberships.map(m => (
          <button
            key={m.group_id}
            onClick={() => onSelect(m)}
            className="bg-[#e9e9e9] rounded-lg px-4 py-4 text-left cursor-pointer hover:bg-[#e0e0e0] transition-colors"
          >
            <p className="text-[16px] font-semibold text-[#0a0a0a]">{m.groups.name}</p>
            <p className="text-[13px] text-[#0a0a0a]/50">Playing as {m.display_name}</p>
          </button>
        ))}

        <div className="flex gap-2 mt-2">
          <button
            onClick={onJoinNew}
            className="flex-1 bg-[#e9e9e9] rounded-lg px-4 py-3 text-[13px] font-medium uppercase tracking-[0.08em] cursor-pointer hover:bg-[#e0e0e0] transition-colors"
          >
            Join another
          </button>
          <button
            onClick={onCreateNew}
            className="flex-1 bg-[#0a0a0a] text-white rounded-lg px-4 py-3 text-[13px] font-medium uppercase tracking-[0.08em] cursor-pointer"
          >
            Create new
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main GroupFlow ─────────────────────────────────────────────────────────────

export default function GroupFlow({ user, inviteCode, onReady }) {
  const [step, setStep] = useState('loading') // loading | pick | create | join
  const [memberships, setMemberships] = useState([])

  useEffect(() => {
    async function loadMemberships() {
      const { data } = await supabase
        .from('group_members')
        .select('*, groups(*)')
        .eq('user_id', user.id)

      if (data && data.length > 0) {
        setMemberships(data)
        // If arriving via invite link, go straight to join
        if (inviteCode) {
          setStep('join')
        } else if (data.length === 1) {
          // Only one league — go straight in
          onReady({ group: data[0].groups, membership: data[0] })
        } else {
          setStep('pick')
        }
      } else {
        // New user — go to join if invite code, otherwise create
        setStep(inviteCode ? 'join' : 'create')
      }
    }
    loadMemberships()
  }, [user.id, inviteCode])

  function handleJoined(group) {
    // Reload membership to get the full record
    supabase
      .from('group_members')
      .select('*, groups(*)')
      .eq('user_id', user.id)
      .eq('group_id', group.id)
      .single()
      .then(({ data }) => {
        if (data) onReady({ group, membership: data })
      })
  }

  if (step === 'loading') {
    return <p className="text-[#0a0a0a]/50 text-[16px]">Loading…</p>
  }

  if (step === 'pick') {
    return (
      <PickLeague
        memberships={memberships}
        onSelect={m => onReady({ group: m.groups, membership: m })}
        onCreateNew={() => setStep('create')}
        onJoinNew={() => setStep('join')}
      />
    )
  }

  if (step === 'create') {
    return <CreateLeague user={user} onJoined={handleJoined} />
  }

  if (step === 'join') {
    return <JoinLeague user={user} prefillCode={inviteCode} onJoined={handleJoined} />
  }
}
