import { useState } from 'react'

const TABS = [
  { id: 'picks',    label: 'KSO Picks & Points' },
  { id: 'fixtures', label: 'Fixtures'            },
  { id: 'teams',    label: 'Team Info'            },
  { id: 'rules',    label: 'Rules'                },
  { id: 'leagues',  label: 'Leagues'              },
  { id: 'draft',    label: 'Draft'               },
]

export default function Nav({ activeTab, onTabChange, onLogoClick, session, onSignOut }) {
  const [menuOpen, setMenuOpen] = useState(false)

  function handleTabChange(id) {
    onTabChange(id)
    setMenuOpen(false)
  }

  function handleLogoClick() {
    onLogoClick()
    setMenuOpen(false)
  }

  return (
    <>
      <nav className="sticky top-0 z-50 bg-[#f7f7f7] h-16 flex items-center justify-between px-8 lg:px-16">
        {/* Logo */}
        <button
          onClick={handleLogoClick}
          className="text-[16px] font-semibold tracking-[-0.01em] text-[#0a0a0a] shrink-0 bg-transparent border-none cursor-pointer p-0"
        >
          KSO World Cup 2026
        </button>

        {/* Desktop tab row */}
        <div className="hidden sm:flex items-center gap-6 lg:gap-12">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`shrink-0 text-[11px] font-medium uppercase tracking-[0.08em] transition-opacity cursor-pointer bg-transparent border-none p-2 ${
                activeTab === tab.id
                  ? 'text-[#0a0a0a]'
                  : 'text-[#0a0a0a]/40 hover:text-[#0a0a0a]/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
          {session && (
            <button
              onClick={onSignOut}
              className="shrink-0 text-[11px] font-medium uppercase tracking-[0.08em] text-[#0a0a0a]/40 hover:text-[#0a0a0a]/70 transition-opacity cursor-pointer bg-transparent border-none p-2"
            >
              Sign out
            </button>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="sm:hidden flex flex-col justify-center gap-[5px] w-8 h-8 bg-transparent border-none cursor-pointer p-0"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          {menuOpen ? (
            <>
              <span className="block w-5 h-[2px] bg-[#0a0a0a] rounded rotate-45 translate-y-[3.5px]" />
              <span className="block w-5 h-[2px] bg-[#0a0a0a] rounded -rotate-45 -translate-y-[3.5px]" />
            </>
          ) : (
            <>
              <span className="block w-5 h-[2px] bg-[#0a0a0a] rounded" />
              <span className="block w-5 h-[2px] bg-[#0a0a0a] rounded" />
              <span className="block w-5 h-[2px] bg-[#0a0a0a] rounded" />
            </>
          )}
        </button>
      </nav>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div className="sm:hidden fixed inset-0 top-16 z-40 bg-white overflow-y-auto">
          <div className="flex flex-col px-8">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`text-left py-5 text-[32px] font-semibold leading-none tracking-[-0.02em] border-b border-[#e9e9e9] bg-transparent border-x-0 border-t-0 cursor-pointer ${
                  activeTab === tab.id ? 'text-[#0a0a0a]' : 'text-[#0a0a0a]/30'
                }`}
              >
                {tab.label}
              </button>
            ))}
            {session && (
              <button
                onClick={() => { onSignOut(); setMenuOpen(false) }}
                className="text-left py-5 text-[32px] font-semibold leading-none tracking-[-0.02em] text-[#0a0a0a]/30 bg-transparent border-none cursor-pointer mt-4"
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
