import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ModalShell } from './AccountModals'

export default function MyLeaguesModal({ user, context, onSwitch, onClose }) {
  const [memberships, setMemberships] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(null) // invite_code that was just copied

  useEffect(() => {
    supabase
      .from('group_members')
      .select('*, groups(*)')
      .eq('user_id', user.id)
      .order('joined_at')
      .then(({ data }) => {
        setMemberships(data || [])
        setLoading(false)
      })
  }, [user.id])

  function copyCode(code) {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  function switchLeague(m) {
    onSwitch({ group: m.groups, membership: m })
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="flex flex-col gap-5">
        <p className="text-[26px] font-semibold leading-[1.1] tracking-[-0.02em]">
          My Leagues
        </p>

        {loading && (
          <p className="text-[14px] text-[#0a0a0a]/40">Loading…</p>
        )}

        {!loading && memberships.length === 0 && (
          <p className="text-[14px] text-[#0a0a0a]/40">
            You're not in any leagues yet.
          </p>
        )}

        {!loading && memberships.length > 0 && (
          <div className="flex flex-col gap-2">
            {memberships.map(m => {
              const isActive = context?.group?.id === m.group_id
              const code = m.groups?.invite_code ?? ''

              return (
                <div
                  key={m.id}
                  className={`rounded-xl p-4 flex flex-col gap-3 ${
                    isActive ? 'bg-[#0a0a0a] text-white' : 'bg-[#f7f7f7]'
                  }`}
                >
                  {/* League name + active badge */}
                  <div className="flex items-center justify-between gap-3">
                    <p className={`text-[15px] font-semibold truncate ${isActive ? 'text-white' : ''}`}>
                      {m.groups?.name ?? 'Unnamed league'}
                    </p>
                    {isActive && (
                      <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.08em] text-white/50">
                        Active
                      </span>
                    )}
                  </div>

                  {/* Display name */}
                  <p className={`text-[12px] ${isActive ? 'text-white/50' : 'text-[#0a0a0a]/40'}`}>
                    Playing as {m.display_name}
                  </p>

                  {/* Invite code + actions */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className={`text-[12px] font-mono tracking-wider ${isActive ? 'text-white/70' : 'text-[#0a0a0a]/60'}`}>
                        {code}
                      </p>
                      <button
                        onClick={() => copyCode(code)}
                        className={`text-[11px] font-medium uppercase tracking-[0.06em] bg-transparent border-none cursor-pointer shrink-0 transition-opacity ${
                          isActive
                            ? 'text-white/40 hover:text-white/70'
                            : 'text-[#0a0a0a]/30 hover:text-[#0a0a0a]/60'
                        }`}
                      >
                        {copied === code ? 'Copied!' : 'Copy'}
                      </button>
                    </div>

                    {!isActive && (
                      <button
                        onClick={() => switchLeague(m)}
                        className="shrink-0 text-[11px] font-medium uppercase tracking-[0.06em] bg-[#0a0a0a] text-white rounded-lg px-3 py-1.5 cursor-pointer"
                      >
                        Switch
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </ModalShell>
  )
}
