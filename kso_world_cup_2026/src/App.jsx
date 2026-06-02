import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Nav from './components/Nav'
import Landing from './components/Landing'
import PicksAndPoints from './components/PicksAndPoints'
import Fixtures from './components/Fixtures'
import Rules from './components/Rules'
import LoginModal from './components/Login'
import OnboardingModal from './components/OnboardingModal'
import { EditNameModal, JoinLeagueModal, CreateLeagueModal } from './components/AccountModals'
import MyLeaguesModal from './components/MyLeaguesModal'
import GroupFlow from './components/GroupFlow'
import Draft from './components/Draft'

// Capture auth callback params before Supabase cleans the URL.
// PKCE flow uses ?code=, implicit flow uses #access_token=
const params = new URLSearchParams(window.location.search)
const isAuthCallback =
  params.has('code') ||
  window.location.hash.includes('access_token')

// Capture invite code before Supabase strips query params
const initialInviteCode = params.get('invite')

// modal state: null | 'login' | 'onboarding' | 'editName' | 'joinLeague' | 'createLeague' | 'myLeagues'

export default function App() {
  const [activeTab, setActiveTab] = useState(null)
  const [session, setSession] = useState(undefined) // undefined = loading, null = logged out
  const [context, setContext] = useState(null)       // { group, membership } once ready
  const [inviteCode] = useState(initialInviteCode)
  const [modal, setModal] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session && isAuthCallback) {
        setActiveTab('picks')
        // Show onboarding if this is a first-time login (no display name set yet)
        if (!data.session.user.user_metadata?.display_name) {
          setModal('onboarding')
        }
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      if (!session) { setContext(null); setActiveTab(null); setModal(null) }
      if (event === 'SIGNED_IN') {
        setActiveTab('picks')
        setModal(prev => {
          // Don't override onboarding if already set; close login if open
          if (prev === 'login') return null
          return prev
        })
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const displayName =
    session?.user?.user_metadata?.display_name ||
    context?.membership?.display_name ||
    session?.user?.email?.split('@')[0] ||
    ''

  function handleOnboardingDone(name, leagueContext) {
    setModal(null)
    if (leagueContext) {
      setContext(leagueContext)
      setActiveTab('draft')
    }
  }

  function handleLeagueDone(leagueContext) {
    setModal(null)
    setContext(leagueContext)
  }

  function renderTab() {
    if (activeTab === null) return <Landing />

    if (activeTab === 'picks') {
      if (session === undefined) return null
      if (!session) return (
        <p className="text-[16px] text-[#0a0a0a]/50">
          <button onClick={() => setModal('login')} className="text-[#0a0a0a] underline bg-transparent border-none cursor-pointer">Log in</button>{' '}
          to see your picks and points.
        </p>
      )
      return <PicksAndPoints context={context} />
    }

    if (activeTab === 'fixtures') return <Fixtures context={context} />

    if (activeTab === 'draft') {
      if (session === undefined) return null
      if (!session) return (
        <p className="text-[16px] text-[#0a0a0a]/50">
          <button onClick={() => setModal('login')} className="text-[#0a0a0a] underline bg-transparent border-none cursor-pointer">Log in</button>{' '}
          to access the draft.
        </p>
      )
      if (!context) return <GroupFlow user={session.user} inviteCode={inviteCode} onReady={setContext} />
      return <Draft context={context} />
    }

    if (activeTab === 'rules') return <Rules />
  }

  return (
    <div className="min-h-screen bg-white">
      <Nav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogoClick={() => setActiveTab(null)}
        session={session}
        displayName={displayName}
        onSignOut={() => supabase.auth.signOut()}
        onLoginClick={() => setModal('login')}
        onEditName={() => setModal('editName')}
        onJoinLeague={() => setModal('joinLeague')}
        onCreateLeague={() => setModal('createLeague')}
        onMyLeagues={() => setModal('myLeagues')}
      />
      <main className="px-8 lg:px-[68px] py-16 lg:py-[91px]">
        {renderTab()}
      </main>

      {modal === 'login' && (
        <LoginModal inviteCode={inviteCode} onClose={() => setModal(null)} />
      )}
      {modal === 'onboarding' && session && (
        <OnboardingModal
          user={session.user}
          inviteCode={inviteCode}
          onDone={handleOnboardingDone}
          onSkip={() => setModal(null)}
        />
      )}
      {modal === 'editName' && session && (
        <EditNameModal
          currentName={displayName}
          onDone={() => setModal(null)}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'joinLeague' && session && (
        <JoinLeagueModal
          user={session.user}
          displayName={displayName}
          onDone={handleLeagueDone}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'createLeague' && session && (
        <CreateLeagueModal
          user={session.user}
          displayName={displayName}
          onDone={handleLeagueDone}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'myLeagues' && session && (
        <MyLeaguesModal
          user={session.user}
          context={context}
          onSwitch={(newContext) => { setContext(newContext); setModal(null) }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
