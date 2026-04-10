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

