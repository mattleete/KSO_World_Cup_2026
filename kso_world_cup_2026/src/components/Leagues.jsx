import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function generateInviteCode() {
  const words = ['WOLF', 'HAWK', 'BULL', 'BEAR', 'LION', 'GOAT', 'LYNX', 'PUMA', 'IBIS', 'KITE']
  const word = words[Math.floor(Math.random() * words.length)]
  const num = Math.floor(Math.random() * 90) + 10
  return `${word}-${num}`
}

// ── Create form ───────────────────────────────────────────────────────────────

function CreateForm({ user, onCreated, onCancel }) {
  const [groupName, setGroupName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleCreate(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const inviteCode = generateInviteCode()

    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({ name: groupName, invite_code: inviteCode, commissioner_id: user.id })
      .select()
      .single()

    if (groupError) { setError(groupError.message); setLoading(false); return }

    const { error: memberError } = await supabase
      .from('group_members')
      .insert({ group_id: group.id, user_id: user.id, display_name: displayName })

    if (memberError) { setError(memberError.message); setLoading(false); return }

    onCreated()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-[24px] font-semibold leading-[1.1] tracking-[-0.02em]">Create a league</p>
        <p className="text-[14px] text-[#0a0a0a]/50">You'll get an invite code to share with your friends.</p>
      </div>
      <form onSubmit={handleCreate} className="flex flex-col gap-3 max-w-sm">
        <input
          type="text"
          placeholder="League name (e.g. KSO World Cup)"
          value={groupName}
          onChange={e => setGroupName(e.target.value)}
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
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-[#e9e9e9] rounded-lg px-4 py-3 text-[14px] font-medium uppercase tracking-[0.08em] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-[#0a0a0a] text-white rounded-lg px-4 py-3 text-[14px] font-medium uppercase tracking-[0.08em] cursor-pointer disabled:opacity-40"
          >
            {loading ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Join form ─────────────────────────────────────────────────────────────────

function JoinForm({ user, prefillCode, onJoined, onCancel }) {
  const [inviteCode, setInviteCode] = useState(prefillCode || '')
  const [displayName, setDisplayName] = useState('')
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
      setError('Invite code not found. Double-check and try again.')
      setLoading(false)
      return
    }

    const { error: memberError } = await supabase
      .from('group_members')
      .insert({ group_id: group.id, user_id: user.id, display_name: displayName })

    if (memberError) {
      setError(memberError.code === '23505'
        ? 'You\'re already in this league, or that name is taken.'
        : memberError.message)
      setLoading(false)
      return
    }

    onJoined()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-[24px] font-semibold leading-[1.1] tracking-[-0.02em]">Join a league</p>
        <p className="text-[14px] text-[#0a0a0a]/50">Enter the invite code your friend shared with you.</p>
      </div>
      <form onSubmit={handleJoin} className="flex flex-col gap-3 max-w-sm">
        <input
          type="text"
          placeholder="Invite code (e.g. WOLF-42)"
          value={inviteCode}
          onChange={e => setInviteCode(e.target.value)}
          required
          className="bg-[#e9e9e9] rounded-lg px-4 py-3 text-[16px] text-[#0a0a0a] placeholder:text-[#0a0a0a]/40 outline-none focus:ring-2 focus:ring-[#0a0a0a]/20 uppercase"
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
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-[#e9e9e9] rounded-lg px-4 py-3 text-[14px] font-medium uppercase tracking-[0.08em] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-[#0a0a0a] text-white rounded-lg px-4 py-3 text-[14px] font-medium uppercase tracking-[0.08em] cursor-pointer disabled:opacity-40"
          >
            {loading ? 'Joining…' : 'Join'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ── League card ───────────────────────────────────────────────────────────────

function LeagueCard({ membership, onGoToDraft }) {
  const [copied, setCopied] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [memberCount, setMemberCount] = useState(null)

  const inviteUrl = `${window.location.origin}${window.location.pathname}?invite=${membership.groups.invite_code}`

  useEffect(() => {
    supabase
      .from('group_members')
      .select('id', { count: 'exact' })
      .eq('group_id', membership.group_id)
      .then(({ count }) => setMemberCount(count))
  }, [membership.group_id])

  function copyCode() {
    navigator.clipboard.writeText(membership.groups.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function copyLink() {
    navigator.clipboard.writeText(inviteUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  return (
    <div className="bg-[#e9e9e9] rounded-[4px] p-4 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-[24px] font-semibold leading-[1.1] tracking-[-0.02em]">
            {membership.groups.name}
          </p>
          <p className="text-[14px] text-[#0a0a0a]/50">
            Playing as {membership.display_name}
            {memberCount !== null && ` · ${memberCount} member${memberCount !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <div className="flex-1 bg-white rounded-lg px-4 py-3 flex items-center justify-between">
            <p className="text-[14px] font-mono tracking-[0.08em] text-[#0a0a0a]">
              {membership.groups.invite_code}
            </p>
            <button
              onClick={copyCode}
              className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#0a0a0a]/40 hover:text-[#0a0a0a] transition-colors cursor-pointer bg-transparent border-none"
            >
              {copied ? 'Copied!' : 'Copy code'}
            </button>
          </div>
          <button
            onClick={() => onGoToDraft(membership)}
            className="bg-[#0a0a0a] text-white rounded-lg px-4 py-3 text-[13px] font-medium uppercase tracking-[0.08em] cursor-pointer shrink-0"
          >
            Draft room
          </button>
        </div>
        <button
          onClick={copyLink}
          className="w-full bg-white rounded-lg px-4 py-3 text-[13px] font-medium uppercase tracking-[0.08em] text-[#0a0a0a]/40 hover:text-[#0a0a0a] transition-colors cursor-pointer text-left flex items-center gap-3 min-w-0"
        >
          <span className="shrink-0">{copiedLink ? 'Link copied!' : 'Copy invite link'}</span>
          {!copiedLink && (
            <span className="text-[#0a0a0a]/20 font-normal normal-case tracking-normal truncate">{inviteUrl}</span>
          )}
        </button>
      </div>
    </div>
  )
}

// ── Main Leagues component ────────────────────────────────────────────────────

export default function Leagues({ user, inviteCode, onGoToDraft }) {
  const [memberships, setMemberships] = useState([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState(null) // null | 'create' | 'join'

  async function loadMemberships() {
    const { data } = await supabase
      .from('group_members')
      .select('*, groups(*)')
      .eq('user_id', user.id)
      .order('joined_at')

    setMemberships(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadMemberships()
    if (inviteCode) setMode('join')
  }, [user.id])

  function handleDone() {
    setMode(null)
    setLoading(true)
    loadMemberships()
  }

  const hasLeagues = memberships.length > 0

  return (
    <div>
      <div className="py-16 lg:py-[91px]">
        <h1
          className="text-[40px] sm:text-[56px] lg:text-[72px] font-semibold leading-none"
          style={{ letterSpacing: '-2.88px' }}
        >
          {loading ? 'Leagues' : hasLeagues ? 'Your leagues' : 'Leagues'}
        </h1>
      </div>

      {loading && <p className="text-[14px] text-[#0a0a0a]/50">Loading…</p>}

      {!loading && (
        <div className="flex flex-col gap-8">

          {/* Active form */}
          {mode === 'create' && (
            <CreateForm user={user} onCreated={handleDone} onCancel={() => setMode(null)} />
          )}
          {mode === 'join' && (
            <JoinForm user={user} prefillCode={inviteCode} onJoined={handleDone} onCancel={() => setMode(null)} />
          )}

          {/* League list */}
          {!mode && (
            <>
              {!hasLeagues && (
                <p className="text-[16px] text-[#0a0a0a]/50">
                  You're not in any leagues yet. Create one or join with an invite code.
                </p>
              )}

              {hasLeagues && (
                <div className="flex flex-col gap-2 max-w-xl">
                  {memberships.map(m => (
                    <LeagueCard
                      key={m.id}
                      membership={m}
                      onGoToDraft={onGoToDraft}
                    />
                  ))}
                </div>
              )}

              <div className="flex gap-2 max-w-sm">
                <button
                  onClick={() => setMode('join')}
                  className="flex-1 bg-[#e9e9e9] rounded-lg px-4 py-3 text-[14px] font-medium uppercase tracking-[0.08em] cursor-pointer hover:bg-[#e0e0e0] transition-colors"
                >
                  Join a league
                </button>
                <button
                  onClick={() => setMode('create')}
                  className="flex-1 bg-[#0a0a0a] text-white rounded-lg px-4 py-3 text-[14px] font-medium uppercase tracking-[0.08em] cursor-pointer"
                >
                  Create a league
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
