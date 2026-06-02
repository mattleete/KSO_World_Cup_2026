import { useState } from 'react'
import { supabase } from '../lib/supabase'

function generateInviteCode() {
  const words = ['WOLF', 'HAWK', 'BULL', 'BEAR', 'LION', 'GOAT', 'LYNX', 'PUMA', 'IBIS', 'KITE']
  const word = words[Math.floor(Math.random() * words.length)]
  const num = Math.floor(Math.random() * 90) + 10
  return `${word}-${num}`
}

export function ModalShell({ onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-8 w-full max-w-md mx-4 relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-5 text-[#0a0a0a]/30 hover:text-[#0a0a0a] bg-transparent border-none cursor-pointer text-[22px] leading-none transition-colors"
          aria-label="Close"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  )
}

// ── Edit name ─────────────────────────────────────────────────────────────────

export function EditNameModal({ currentName, onDone, onClose }) {
  const [name, setName] = useState(currentName || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.updateUser({
      data: { display_name: name.trim() },
    })
    if (error) { setError(error.message); setLoading(false); return }
    onDone(name.trim())
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="flex flex-col gap-6">
        <p className="text-[26px] font-semibold leading-[1.1] tracking-[-0.02em]">
          Update your name
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
            className="bg-[#e9e9e9] rounded-lg px-4 py-3 text-[16px] text-[#0a0a0a] placeholder:text-[#0a0a0a]/40 outline-none focus:ring-2 focus:ring-[#0a0a0a]/20"
          />
          {error && <p className="text-red-500 text-[14px]">{error}</p>}
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="bg-[#0a0a0a] text-white rounded-lg px-4 py-3 text-[14px] font-medium uppercase tracking-[0.08em] cursor-pointer disabled:opacity-40"
          >
            {loading ? 'Saving…' : 'Save name'}
          </button>
        </form>
      </div>
    </ModalShell>
  )
}

// ── Join league ───────────────────────────────────────────────────────────────

export function JoinLeagueModal({ user, displayName, onDone, onClose }) {
  const [code, setCode] = useState('')
  const [name, setName] = useState(displayName || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select()
      .eq('invite_code', code.trim().toUpperCase())
      .single()

    if (groupError || !group) {
      setError('Invite code not found. Double-check and try again.')
      setLoading(false)
      return
    }

    const { data: membership, error: memberError } = await supabase
      .from('group_members')
      .insert({ group_id: group.id, user_id: user.id, display_name: name.trim() })
      .select('*, groups(*)')
      .single()

    if (memberError) {
      setError(
        memberError.code === '23505'
          ? 'That name is already taken in this league — try a different one.'
          : memberError.message
      )
      setLoading(false)
      return
    }

    onDone({ group, membership })
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="text-[26px] font-semibold leading-[1.1] tracking-[-0.02em]">
            Join a league
          </p>
          <p className="text-[#0a0a0a]/50 text-[15px]">
            Enter the invite code your friend shared with you.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Invite code (e.g. WOLF-42)"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            required
            autoFocus
            className="bg-[#e9e9e9] rounded-lg px-4 py-3 text-[16px] text-[#0a0a0a] placeholder:text-[#0a0a0a]/40 outline-none focus:ring-2 focus:ring-[#0a0a0a]/20 tracking-wider"
          />
          <input
            type="text"
            placeholder="Your name in this league"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            className="bg-[#e9e9e9] rounded-lg px-4 py-3 text-[16px] text-[#0a0a0a] placeholder:text-[#0a0a0a]/40 outline-none focus:ring-2 focus:ring-[#0a0a0a]/20"
          />
          {error && <p className="text-red-500 text-[14px]">{error}</p>}
          <button
            type="submit"
            disabled={loading || !code.trim() || !name.trim()}
            className="bg-[#0a0a0a] text-white rounded-lg px-4 py-3 text-[14px] font-medium uppercase tracking-[0.08em] cursor-pointer disabled:opacity-40"
          >
            {loading ? 'Joining…' : 'Join league'}
          </button>
        </form>
      </div>
    </ModalShell>
  )
}

// ── Create league ─────────────────────────────────────────────────────────────

export function CreateLeagueModal({ user, displayName, onDone, onClose }) {
  const [groupName, setGroupName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const inviteCode = generateInviteCode()
    const name = displayName || user.email.split('@')[0]

    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({ name: groupName.trim(), invite_code: inviteCode, commissioner_id: user.id })
      .select()
      .single()

    if (groupError) { setError(groupError.message); setLoading(false); return }

    const { data: membership, error: memberError } = await supabase
      .from('group_members')
      .insert({ group_id: group.id, user_id: user.id, display_name: name })
      .select('*, groups(*)')
      .single()

    if (memberError) { setError(memberError.message); setLoading(false); return }

    onDone({ group, membership })
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="text-[26px] font-semibold leading-[1.1] tracking-[-0.02em]">
            Create a league
          </p>
          <p className="text-[#0a0a0a]/50 text-[15px]">
            You'll get an invite code to share with your group.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="League name (e.g. KSO World Cup)"
            value={groupName}
            onChange={e => setGroupName(e.target.value)}
            required
            autoFocus
            className="bg-[#e9e9e9] rounded-lg px-4 py-3 text-[16px] text-[#0a0a0a] placeholder:text-[#0a0a0a]/40 outline-none focus:ring-2 focus:ring-[#0a0a0a]/20"
          />
          {error && <p className="text-red-500 text-[14px]">{error}</p>}
          <button
            type="submit"
            disabled={loading || !groupName.trim()}
            className="bg-[#0a0a0a] text-white rounded-lg px-4 py-3 text-[14px] font-medium uppercase tracking-[0.08em] cursor-pointer disabled:opacity-40"
          >
            {loading ? 'Creating…' : 'Create league'}
          </button>
        </form>
      </div>
    </ModalShell>
  )
}
