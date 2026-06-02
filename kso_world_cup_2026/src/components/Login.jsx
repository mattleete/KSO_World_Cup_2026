import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function LoginModal({ inviteCode, onClose }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

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

        {sent ? (
          <div className="flex flex-col gap-3">
            <p className="text-[26px] font-semibold leading-[1.1] tracking-[-0.02em]">
              Check your email
            </p>
            <p className="text-[#0a0a0a]/50 text-[15px] leading-relaxed">
              We sent a magic link to{' '}
              <span className="text-[#0a0a0a]">{email}</span>.
              Click it to log in — no password needed.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <p className="text-[26px] font-semibold leading-[1.1] tracking-[-0.02em]">
                Log in
              </p>
              <p className="text-[#0a0a0a]/50 text-[15px]">
                Enter your email and we'll send you a magic link — no password needed.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
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
        )}
      </div>
    </div>
  )
}
