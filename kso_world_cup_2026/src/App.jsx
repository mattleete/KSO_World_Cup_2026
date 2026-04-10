import { useState } from 'react'
import Nav from './components/Nav'
import Landing from './components/Landing'
import PlayerBoard from './components/PlayerBoard'
import Fixtures from './components/Fixtures'
import Teams from './components/Teams'
import Rules from './components/Rules'

export default function App() {
  const [activeTab, setActiveTab] = useState(null)

  return (
    <div className="min-h-screen bg-white">
      <Nav activeTab={activeTab} onTabChange={setActiveTab} onLogoClick={() => setActiveTab(null)} />
      <main>
        {activeTab === null       && <Landing />}
        {activeTab === 'picks'    && <PlayerBoard />}
        {activeTab === 'fixtures' && <Fixtures />}
        {activeTab === 'teams'    && <Teams />}
        {activeTab === 'rules'    && <Rules />}
      </main>
    </div>
  )
}
