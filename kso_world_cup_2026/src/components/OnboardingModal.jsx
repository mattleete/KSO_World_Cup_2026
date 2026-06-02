import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { JOIN_CONFLICT_MESSAGE, INVITE_NOT_FOUND_MESSAGE } from '../utils/league'

export default function OnboardingModal({ user, inviteCode, onDone, onSkip }) {
  const [name, setName] = useState('')
  const [code, setCode] = useState(inviteCode || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError(null)

    const { error: nameError } = await supabase.auth.updateUser({
      data: { display_name: name.trim() },
    })
    if (nameError) { setError(nameError.message); setLoading(false); return }

    if (code.trim()) {
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select()
        .eq('invite_code', code.trim().toUpperCase())
        .single()

      if (groupError || !group) {
        setError(INVITE_NOT_FOUND_MESSAGE)
        setLoading(false)
        return
      }

      const { data: membership, error: memberError } = await supabase
        .from('group_members')
        .insert({ group_id: group.id, user_id: user.id, display_name: name.trim() })
        .select('*, groups(*)')
        .single()

      if (memberError) {
        setError(memberError.code === '23505' ? JOIN_CONFLICT_MESSAGE : memberError.message)
        setLoading(false)
        return
      }

      onDone(name.trim(), { group, membership })
    } else {
      onDone(name.trim(), null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md mx-4">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <p className="text-[26px] font-semibold leading-[1.1] tracking-[-0.02em]">
              Welcome
            </p>
            <p className="text-[#0a0a0a]/50 text-[15px]">
              Set your name and optionally join a league to get started.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              className="bg-[#e9e9e9] rounded-lg px-4 py-3 text-[16px] text-[#0a0a0a] placeholder:text-[#0a0a0a]/40 outline-none focus:ring-2 focus:ring-[#0a0a0a]/20"
            />
            <input
              type="text"
              placeholder="League invite code (optional)"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              className="bg-[#e9e9e9] rounded-lg px-4 py-3 text-[16px] text-[#0a0a0a] placeholder:text-[#0a0a0a]/40 outline-none focus:ring-2 focus:ring-[#0a0a0a]/20 tracking-wider"
            />
            {error && <p className="text-red-500 text-[14px]">{error}</p>}
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="bg-[#0a0a0a] text-white rounded-lg px-4 py-3 text-[14px] font-medium uppercase tracking-[0.08em] cursor-pointer disabled:opacity-40"
            >
              {loading ? 'Saving…' : 'Get started'}
            </button>
          </form>

          <button
            onClick={onSkip}
            className="text-[13px] text-[#0a0a0a]/40 hover:text-[#0a0a0a]/70 bg-transparent border-none cursor-pointer transition-colors text-center"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  )
}
