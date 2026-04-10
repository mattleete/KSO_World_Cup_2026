import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Nav from './components/Nav'
import Landing from './components/Landing'
import PlayerBoard from './components/PlayerBoard'
import Fixtures from './components/Fixtures'
import Teams from './components/Teams'
import Rules from './components/Rules'
import Login from './components/Login'
import GroupFlow from './components/GroupFlow'

export default function App() {
  const [activeTab, setActiveTab] = useState(null)
  const [session, setSession] = useState(undefined) // undefined = loading, null = logged out
  const [context, setContext] = useState(null)       // { group, membership } once ready
  const [inviteCode, setInviteCode] = useState(null)

  // Pick up ?invite=CODE from URL (set before auth so it survives the magic link redirect)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('invite')
    if (code) setInviteCode(code)
  }, [])

  // Listen for auth state changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      // If arriving via magic link (Supabase puts tokens in the URL hash), go to draft
      if (data.session && window.location.hash.includes('access_token')) {
        setActiveTab('draft')
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      if (!session) setContext(null)
      if (event === 'SIGNED_IN') setActiveTab('draft')
    })
    return () => subscription.unsubscribe()
  }, [])

  // Render the active tab content
  function renderTab() {
    if (activeTab === null)       return <Landing />
    if (activeTab === 'picks')    return <PlayerBoard />
    if (activeTab === 'fixtures') return <Fixtures />
    if (activeTab === 'teams')    return <Teams />
    if (activeTab === 'rules')    return <Rules />

    if (activeTab === 'draft') {
      if (session === undefined)  return null
      if (!session)               return <Login inviteCode={inviteCode} />
      if (!context)               return <GroupFlow user={session.user} inviteCode={inviteCode} onReady={setContext} />
      return <DraftRoom context={context} onSwitchGroup={() => setContext(null)} />
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <Nav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogoClick={() => setActiveTab(null)}
        session={session}
        onSignOut={() => supabase.auth.signOut()}
      />
      <main className="px-8 lg:px-[68px] py-16 lg:py-[91px]">
        {renderTab()}
      </main>
    </div>
  )
}

// Placeholder — replaced in Phase 3
function DraftRoom({ context, onSwitchGroup }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[40px] sm:text-[56px] lg:text-[72px] font-semibold leading-[1.1] tracking-[-0.02em]">
        {context.group.name}
      </p>
      <p className="text-[#0a0a0a]/50 text-[16px]">
        Playing as <span className="text-[#0a0a0a]">{context.membership.display_name}</span>
        {' · '}
        Invite code: <span className="text-[#0a0a0a] font-mono">{context.group.invite_code}</span>
      </p>
      <p className="text-[#0a0a0a]/50 text-[14px] mt-4">Draft room coming in Phase 3.</p>
      <button
        onClick={onSwitchGroup}
        className="text-[13px] text-[#0a0a0a]/40 hover:text-[#0a0a0a]/70 underline cursor-pointer bg-transparent border-none p-0 w-fit"
      >
        Switch group
      </button>
    </div>
  )
}
