import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login({ inviteCode }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const redirectTo = `${window.location.origin}${window.location.pathname}${inviteCode ? `?invite=${inviteCode}` : ''}`

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSent(true)
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-[40px] sm:text-[56px] lg:text-[72px] font-semibold leading-[1.1] tracking-[-0.02em]">
          Check your email
        </p>
        <p className="text-[#0a0a0a]/50 text-[16px]">
          We sent a magic link to <span className="text-[#0a0a0a]">{email}</span>. Click it to log in — no password needed.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className="text-[40px] sm:text-[56px] lg:text-[72px] font-semibold leading-[1.1] tracking-[-0.02em]">
          Log in to join the draft
        </p>
        <p className="text-[#0a0a0a]/50 text-[16px]">
          Enter your email and we'll send you a magic link — no password needed.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-sm">
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="bg-[#e9e9e9] rounded-lg px-4 py-3 text-[16px] text-[#0a0a0a] placeholder:text-[#0a0a0a]/40 outline-none focus:ring-2 focus:ring-[#0a0a0a]/20"
        />
        {error && <p className="text-red-500 text-[14px]">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="bg-[#0a0a0a] text-white rounded-lg px-4 py-3 text-[14px] font-medium uppercase tracking-[0.08em] cursor-pointer disabled:opacity-40"
        >
          {loading ? 'Sending…' : 'Send magic link'}
        </button>
      </form>
    </div>
  )
}
