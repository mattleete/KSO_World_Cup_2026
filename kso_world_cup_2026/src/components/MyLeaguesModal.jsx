import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ModalShell } from './AccountModals'

export default function MyLeaguesModal({ user, context, onSwitch, onClose }) {
  const [memberships, setMemberships] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(null)

  // Other members per league (used by both transfer + manage members)
  const [otherMembers, setOtherMembers] = useState({}) // group_id → members[]

  // Transfer commissioner state
  const [transferOpenId, setTransferOpenId] = useState(null)
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [transferring, setTransferring] = useState(false)

  // Manage members + destructive actions
  const [manageOpenId, setManageOpenId] = useState(null)
  const [confirm, setConfirm] = useState(null) // { kind, groupId, memberId?, label }
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState(null)

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

  async function loadOtherMembers(groupId, force = false) {
    if (otherMembers[groupId] && !force) return
    const { data } = await supabase
      .from('group_members')
      .select('id, user_id, display_name')
      .eq('group_id', groupId)
      .neq('user_id', user.id)
      .order('display_name')
    setOtherMembers(prev => ({ ...prev, [groupId]: data || [] }))
  }

  function openTransfer(groupId) {
    setTransferOpenId(groupId)
    setManageOpenId(null)
    setSelectedUserId(null)
    setActionError(null)
    loadOtherMembers(groupId)
  }

  function openManage(groupId) {
    setManageOpenId(groupId)
    setTransferOpenId(null)
    setActionError(null)
    loadOtherMembers(groupId)
  }

  async function confirmTransfer(groupId) {
    if (!selectedUserId) return
    setTransferring(true)
    setActionError(null)
    const { error } = await supabase
      .from('groups')
      .update({ commissioner_id: selectedUserId })
      .eq('id', groupId)
    if (error) {
      setActionError(error.message)
      setTransferring(false)
      return
    }
    setTransferOpenId(null)
    setSelectedUserId(null)
    setTransferring(false)
    setLoading(true)
    loadMemberships()
  }

  // Run one of the destructive RPC actions, then refresh.
  async function runConfirm() {
    if (!confirm) return
    setBusy(true)
    setActionError(null)
    const { kind, groupId, memberId } = confirm
    const isActive = context?.group?.id === groupId

    let error
    if (kind === 'leave') {
      ;({ error } = await supabase.rpc('leave_league', { p_group_id: groupId }))
    } else if (kind === 'delete') {
      ;({ error } = await supabase.rpc('delete_league', { p_group_id: groupId }))
    } else if (kind === 'remove') {
      ;({ error } = await supabase.rpc('remove_member', { p_group_id: groupId, p_member_id: memberId }))
    }

    if (error) {
      setActionError(error.message)
      setBusy(false)
      return
    }

    setBusy(false)
    setConfirm(null)

    if (kind === 'remove') {
      await loadOtherMembers(groupId, true)
      return
    }
    // leave / delete
    if (isActive) {
      onSwitch(null) // clear active context + close modal
    } else {
      setLoading(true)
      loadMemberships()
    }
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="flex flex-col gap-5 max-h-[75vh] overflow-y-auto">
        <p className="text-[26px] font-semibold leading-[1.1] tracking-[-0.02em]">
          My Leagues
        </p>

        {loading && <p className="text-[14px] text-[#0a0a0a]/40">Loading…</p>}

        {!loading && memberships.length === 0 && (
          <p className="text-[14px] text-[#0a0a0a]/40">You're not in any leagues yet.</p>
        )}

        {!loading && memberships.length > 0 && (
          <div className="flex flex-col gap-2">
            {memberships.map(m => {
              const isActive = context?.group?.id === m.group_id
              const isCommissioner = m.groups?.commissioner_id === user.id
              const code = m.groups?.invite_code ?? ''
              const isTransferOpen = transferOpenId === m.group_id
              const isManageOpen = manageOpenId === m.group_id
              const members = otherMembers[m.group_id] || []
              const divider = isActive ? 'border-white/10' : 'border-[#0a0a0a]/10'
              const linkColour = isActive
                ? 'text-white/40 hover:text-white/70'
                : 'text-[#0a0a0a]/30 hover:text-[#0a0a0a]/60'

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

                  {/* Invite code + switch */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className={`text-[12px] font-mono tracking-wider ${isActive ? 'text-white/70' : 'text-[#0a0a0a]/60'}`}>
                        {code}
                      </p>
                      <button
                        onClick={() => copyCode(code)}
                        className={`text-[11px] font-medium uppercase tracking-[0.06em] bg-transparent border-none cursor-pointer shrink-0 transition-opacity ${linkColour}`}
                      >
                        {copied === code ? 'Copied!' : 'Copy'}
                      </button>
                    </div>

                    {!isActive && (
                      <button
                        onClick={() => onSwitch({ group: m.groups, membership: m })}
                        className="shrink-0 text-[11px] font-medium uppercase tracking-[0.06em] bg-[#0a0a0a] text-white rounded-lg px-3 py-1.5 cursor-pointer"
                      >
                        Switch
                      </button>
                    )}
                  </div>

                  {/* Actions */}
                  <div className={`border-t pt-3 flex flex-col gap-3 ${divider}`}>
                    {/* Action links */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {isCommissioner ? (
                        <>
                          <button
                            onClick={() => (isTransferOpen ? setTransferOpenId(null) : openTransfer(m.group_id))}
                            className={`text-[11px] font-medium uppercase tracking-[0.06em] bg-transparent border-none cursor-pointer transition-opacity ${linkColour}`}
                          >
                            Transfer commissioner
                          </button>
                          <button
                            onClick={() => (isManageOpen ? setManageOpenId(null) : openManage(m.group_id))}
                            className={`text-[11px] font-medium uppercase tracking-[0.06em] bg-transparent border-none cursor-pointer transition-opacity ${linkColour}`}
                          >
                            Manage members
                          </button>
                          <button
                            onClick={() => { setActionError(null); setConfirm({ kind: 'delete', groupId: m.group_id, label: `Delete “${m.groups?.name}” and all its picks? This can’t be undone.` }) }}
                            className="text-[11px] font-medium uppercase tracking-[0.06em] bg-transparent border-none cursor-pointer text-red-500 hover:text-red-600 transition-colors"
                          >
                            Delete league
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => { setActionError(null); setConfirm({ kind: 'leave', groupId: m.group_id, label: `Leave “${m.groups?.name}”?` }) }}
                          className="text-[11px] font-medium uppercase tracking-[0.06em] bg-transparent border-none cursor-pointer text-red-500 hover:text-red-600 transition-colors"
                        >
                          Leave league
                        </button>
                      )}
                    </div>

                    {/* Transfer panel */}
                    {isTransferOpen && (
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
                                    ? isActive ? 'bg-white text-[#0a0a0a]' : 'bg-[#0a0a0a] text-white'
                                    : isActive ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-[#0a0a0a]/8 text-[#0a0a0a] hover:bg-[#0a0a0a]/15'
                                }`}
                              >
                                {mem.display_name}
                              </button>
                            ))}
                          </div>
                        )}
                        {members.length > 0 && (
                          <div className="flex gap-2 mt-1">
                            <button
                              onClick={() => confirmTransfer(m.group_id)}
                              disabled={!selectedUserId || transferring}
                              className="text-[11px] font-medium uppercase tracking-[0.06em] bg-green-600 text-white rounded-lg px-3 py-1.5 cursor-pointer disabled:opacity-40"
                            >
                              {transferring ? 'Transferring…' : 'Confirm transfer'}
                            </button>
                            <button
                              onClick={() => { setTransferOpenId(null); setSelectedUserId(null) }}
                              className={`text-[11px] font-medium uppercase tracking-[0.06em] bg-transparent border-none cursor-pointer ${isActive ? 'text-white/40' : 'text-[#0a0a0a]/30'}`}
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Manage members panel */}
                    {isManageOpen && (
                      <div className="flex flex-col gap-2">
                        <p className={`text-[11px] font-medium uppercase tracking-[0.06em] ${isActive ? 'text-white/50' : 'text-[#0a0a0a]/40'}`}>
                          Members
                        </p>
                        {members.length === 0 ? (
                          <p className={`text-[12px] ${isActive ? 'text-white/40' : 'text-[#0a0a0a]/40'}`}>
                            No other members yet.
                          </p>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {members.map(mem => (
                              <div
                                key={mem.id}
                                className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg ${isActive ? 'bg-white/10' : 'bg-[#0a0a0a]/8'}`}
                              >
                                <p className={`text-[13px] font-medium truncate ${isActive ? 'text-white' : ''}`}>{mem.display_name}</p>
                                <button
                                  onClick={() => { setActionError(null); setConfirm({ kind: 'remove', groupId: m.group_id, memberId: mem.id, label: `Remove ${mem.display_name} from the league?` }) }}
                                  className="shrink-0 text-[11px] font-medium uppercase tracking-[0.06em] bg-transparent border-none cursor-pointer text-red-500 hover:text-red-600 transition-colors"
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Inline confirm for this card's destructive action */}
                    {confirm && confirm.groupId === m.group_id && (
                      <div className={`rounded-lg p-3 flex flex-col gap-2 ${isActive ? 'bg-white/10' : 'bg-white'}`}>
                        <p className={`text-[13px] ${isActive ? 'text-white' : 'text-[#0a0a0a]'}`}>{confirm.label}</p>
                        <div className="flex gap-2">
                          <button
                            onClick={runConfirm}
                            disabled={busy}
                            className="text-[11px] font-medium uppercase tracking-[0.06em] bg-red-600 text-white rounded-lg px-3 py-1.5 cursor-pointer disabled:opacity-40"
                          >
                            {busy ? 'Working…' : 'Confirm'}
                          </button>
                          <button
                            onClick={() => setConfirm(null)}
                            disabled={busy}
                            className={`text-[11px] font-medium uppercase tracking-[0.06em] bg-transparent border-none cursor-pointer ${isActive ? 'text-white/40' : 'text-[#0a0a0a]/40'}`}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {actionError && (confirm?.groupId === m.group_id || transferOpenId === m.group_id) && (
                      <p className="text-red-500 text-[12px]">{actionError}</p>
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
