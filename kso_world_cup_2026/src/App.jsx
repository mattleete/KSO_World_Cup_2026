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
import Draft from './components/Draft'
import Leagues from './components/Leagues'

// Capture auth callback params before Supabase cleans the URL.
// PKCE flow uses ?code=, implicit flow uses #access_token=
const params = new URLSearchParams(window.location.search)
const isAuthCallback =
  params.has('code') ||
  window.location.hash.includes('access_token')

// Capture invite code before Supabase strips query params
const initialInviteCode = params.get('invite')

export default function App() {
  const [activeTab, setActiveTab] = useState(null)
  const [session, setSession] = useState(undefined) // undefined = loading, null = logged out
  const [context, setContext] = useState(null)       // { group, membership } once ready
  const [inviteCode] = useState(initialInviteCode)

  // Listen for auth state changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session && isAuthCallback) setActiveTab('draft')
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
    if (activeTab === 'picks')    return <PlayerBoard context={context} />
    if (activeTab === 'fixtures') return <Fixtures context={context} />
    if (activeTab === 'teams')    return <Teams />
    if (activeTab === 'rules')    return <Rules />

    if (activeTab === 'leagues') {
      if (session === undefined)  return null
      if (!session)               return <Login inviteCode={inviteCode} />
      return (
        <Leagues
          user={session.user}
          inviteCode={inviteCode}
          onGoToDraft={membership => {
            setContext({ group: membership.groups, membership })
            setActiveTab('draft')
          }}
        />
      )
    }

    if (activeTab === 'draft') {
      if (session === undefined)  return null
      if (!session)               return <Login inviteCode={inviteCode} />
      if (!context)               return <GroupFlow user={session.user} inviteCode={inviteCode} onReady={setContext} />
      return <Draft context={context} />
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

