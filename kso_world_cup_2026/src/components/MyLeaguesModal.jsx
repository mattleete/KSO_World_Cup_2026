import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ModalShell } from './AccountModals'

export default function MyLeaguesModal({ user, context, onSwitch, onClose }) {
  const [memberships, setMemberships] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(null)

  // Transfer commissioner state
  const [transferOpenId, setTransferOpenId] = useState(null) // group_id
  const [transferMembers, setTransferMembers] = useState({}) // group_id → members[]
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [transferring, setTransferring] = useState(false)
  const [transferError, setTransferError] = useState(null)

  function loadMemberships() {
    supabase
      .from('group_members')
      .select('*, groups(*)')
      .eq('user_id', user.id)
      .order('joined_at')
      .then(({ data }) => {
        setMemberships(data || [])
        setLoading(false)
      })
  }

  useEffect(() => { loadMemberships() }, [user.id])

  function copyCode(code) {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  function switchLeague(m) {
    onSwitch({ group: m.groups, membership: m })
  }

  async function openTransfer(groupId) {
    setTransferOpenId(groupId)
    setSelectedUserId(null)
    setTransferError(null)

    if (transferMembers[groupId]) return // already fetched

    const { data } = await supabase
      .from('group_members')
      .select('id, user_id, display_name')
      .eq('group_id', groupId)
      .neq('user_id', user.id)
      .order('display_name')

    setTransferMembers(prev => ({ ...prev, [groupId]: data || [] }))
  }

  async function confirmTransfer(groupId) {
    if (!selectedUserId) return
    setTransferring(true)
    setTransferError(null)

    const { error } = await supabase
      .from('groups')
      .update({ commissioner_id: selectedUserId })
      .eq('id', groupId)

    if (error) {
      setTransferError(error.message)
      setTransferring(false)
      return
    }

    // Reload memberships to reflect new commissioner status
    setTransferOpenId(null)
    setSelectedUserId(null)
    setTransferring(false)
    setLoading(true)
    loadMemberships()
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
              const isCommissioner = m.groups?.commissioner_id === user.id
              const code = m.groups?.invite_code ?? ''
              const isTransferOpen = transferOpenId === m.group_id
              const members = transferMembers[m.group_id] || []

              return (
                <div
                  key={m.id}
                  className={`rounded-xl p-4 flex flex-col gap-3 ${
                    isActive ? 'bg-[#0a0a0a] text-white' : 'bg-[#f7f7f7]'
                  }`}
                >
                  {/* League name + badges */}
                  <div className="flex items-center justify-between gap-3">
                    <p className={`text-[15px] font-semibold truncate ${isActive ? 'text-white' : ''}`}>
                      {m.groups?.name ?? 'Unnamed league'}
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      {isCommissioner && (
                        <span className={`text-[10px] font-medium uppercase tracking-[0.08em] ${isActive ? 'text-white/50' : 'text-[#0a0a0a]/40'}`}>
                          Commissioner
                        </span>
                      )}
                      {isActive && (
                        <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-white/50">
                          Active
                        </span>
                      )}
                    </div>
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

                  {/* Transfer commissioner section — commissioner only */}
                  {isCommissioner && (
                    <div className={`border-t pt-3 ${isActive ? 'border-white/10' : 'border-[#0a0a0a]/10'}`}>
                      {!isTransferOpen ? (
                        <button
                          onClick={() => openTransfer(m.group_id)}
                          className={`text-[11px] font-medium uppercase tracking-[0.06em] bg-transparent border-none cursor-pointer transition-opacity ${
                            isActive
                              ? 'text-white/40 hover:text-white/70'
                              : 'text-[#0a0a0a]/30 hover:text-[#0a0a0a]/60'
                          }`}
                        >
                          Transfer commissioner
                        </button>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <p className={`text-[11px] font-medium uppercase tracking-[0.06em] ${isActive ? 'text-white/50' : 'text-[#0a0a0a]/40'}`}>
                            Select new commissioner
                          </p>

                          {members.length === 0 ? (
                            <p className={`text-[12px] ${isActive ? 'text-white/40' : 'text-[#0a0a0a]/40'}`}>
                              No other members to transfer to.
                            </p>
                          ) : (
                            <div className="flex flex-col gap-1">
                              {members.map(mem => (
                                <button
                                  key={mem.id}
                                  onClick={() => setSelectedUserId(mem.user_id)}
                                  className={`text-left px-3 py-2 rounded-lg text-[13px] font-medium cursor-pointer border-none transition-colors ${
                                    selectedUserId === mem.user_id
                                      ? isActive
                                        ? 'bg-white text-[#0a0a0a]'
                                        : 'bg-[#0a0a0a] text-white'
                                      : isActive
                                        ? 'bg-white/10 text-white hover:bg-white/20'
                                        : 'bg-[#0a0a0a]/8 text-[#0a0a0a] hover:bg-[#0a0a0a]/15'
                                  }`}
                                >
                                  {mem.display_name}
                                </button>
                              ))}
                            </div>
                          )}

                          {transferError && (
                            <p className="text-red-400 text-[12px]">{transferError}</p>
                          )}

                          <div className="flex gap-2 mt-1">
                            <button
                              onClick={() => confirmTransfer(m.group_id)}
                              disabled={!selectedUserId || transferring}
                              className="text-[11px] font-medium uppercase tracking-[0.06em] bg-green-600 text-white rounded-lg px-3 py-1.5 cursor-pointer disabled:opacity-40"
                            >
                              {transferring ? 'Transferring…' : 'Confirm transfer'}
                            </button>
                            <button
                              onClick={() => { setTransferOpenId(null); setSelectedUserId(null); setTransferError(null) }}
                              className={`text-[11px] font-medium uppercase tracking-[0.06em] bg-transparent border-none cursor-pointer ${
                                isActive ? 'text-white/40' : 'text-[#0a0a0a]/30'
                              }`}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </ModalShell>
  )
}
