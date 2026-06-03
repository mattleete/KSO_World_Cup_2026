import { useState, useRef, useEffect } from 'react'

const TABS = [
  { id: 'picks',    label: 'Picks & Points' },
  { id: 'fixtures', label: 'Fixtures'        },
  { id: 'draft',    label: 'Draft'           },
  { id: 'rules',    label: 'Rules'           },
]

export default function Nav({ activeTab, onTabChange, onLogoClick, session, displayName, leagueName, onSignOut, onLoginClick, onEditName, onJoinLeague, onCreateLeague, onMyLeagues }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleTabChange(id) {
    onTabChange(id)
    setMenuOpen(false)
  }

  function handleLogoClick() {
    onLogoClick()
    setMenuOpen(false)
  }

  const loggedIn = !!session

  return (
    <>
      <nav className="sticky top-0 z-50 bg-[#f7f7f7] h-16 flex items-center justify-between px-8 lg:px-16">
        {/* Left side — active league name when logged in; otherwise empty
            (the spacer keeps the right-hand controls right-aligned) */}
        {loggedIn && leagueName ? (
          <button
            onClick={handleLogoClick}
            className="text-[16px] font-semibold tracking-[-0.01em] text-[#0a0a0a] shrink-0 bg-transparent border-none cursor-pointer p-0 truncate max-w-[60%]"
          >
            {leagueName}
          </button>
        ) : (
          <span aria-hidden="true" />
        )}

        {/* Desktop — logged in */}
        {loggedIn && (
          <div className="hidden sm:flex items-center gap-6 lg:gap-10">
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

            {/* User pill */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(o => !o)}
                className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-[#0a0a0a]/70 hover:text-[#0a0a0a] transition-opacity cursor-pointer bg-transparent border-none p-2"
              >
                <span>⚽</span>
                <span>{displayName}</span>
                <span className="text-[#0a0a0a]/30">▾</span>
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-[#e9e9e9] rounded-lg shadow-sm min-w-[160px] overflow-hidden">
                  {[
                    { label: 'Update name',    action: onEditName    },
                    { label: 'Join a league',  action: onJoinLeague  },
                    { label: 'Create a league',action: onCreateLeague},
                    { label: 'My Leagues',     action: onMyLeagues   },
                  ].map(({ label, action }) => (
                    <button
                      key={label}
                      onClick={() => { action(); setDropdownOpen(false) }}
                      className="w-full text-left px-4 py-3 text-[13px] text-[#0a0a0a]/60 hover:text-[#0a0a0a] hover:bg-[#f7f7f7] cursor-pointer bg-transparent border-none transition-colors"
                    >
                      {label}
                    </button>
                  ))}
                  <div className="border-t border-[#e9e9e9]" />
                  <button
                    onClick={() => { onSignOut(); setDropdownOpen(false) }}
                    className="w-full text-left px-4 py-3 text-[13px] text-[#0a0a0a]/40 hover:text-[#0a0a0a] hover:bg-[#f7f7f7] cursor-pointer bg-transparent border-none transition-colors"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Logged out → direct Log in button (mobile + desktop); no hamburger */}
        {!loggedIn && session !== undefined && (
          <button
            onClick={onLoginClick}
            className="block text-[11px] font-medium uppercase tracking-[0.08em] text-[#0a0a0a] border border-[#0a0a0a]/20 rounded-lg px-4 py-2 cursor-pointer hover:border-[#0a0a0a]/60 bg-transparent transition-colors"
          >
            Log in →
          </button>
        )}

        {/* Mobile hamburger — only when logged in (there are tabs/account to show) */}
        {loggedIn && (
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
        )}
      </nav>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div className="sm:hidden fixed inset-0 top-16 z-40 bg-white overflow-y-auto">
          <div className="flex flex-col px-8">
            {loggedIn ? (
              <>
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
                {[
                  { label: 'Update name',     action: onEditName     },
                  { label: 'Join a league',   action: onJoinLeague   },
                  { label: 'Create a league', action: onCreateLeague },
                  { label: 'My Leagues',      action: onMyLeagues    },
                ].map(({ label, action }) => (
                  <button
                    key={label}
                    onClick={() => { action(); setMenuOpen(false) }}
                    className="text-left py-4 text-[22px] font-semibold leading-none tracking-[-0.02em] border-b border-[#e9e9e9] bg-transparent border-x-0 border-t-0 cursor-pointer text-[#0a0a0a]/30 hover:text-[#0a0a0a]/60"
                  >
                    {label}
                  </button>
                ))}
                <button
                  onClick={() => { onSignOut(); setMenuOpen(false) }}
                  className="text-left py-5 text-[32px] font-semibold leading-none tracking-[-0.02em] text-[#0a0a0a]/30 bg-transparent border-none cursor-pointer mt-4"
                >
                  Log out
                </button>
              </>
            ) : (
              <button
                onClick={() => { onLoginClick(); setMenuOpen(false) }}
                className="text-left py-5 text-[32px] font-semibold leading-none tracking-[-0.02em] text-[#0a0a0a] bg-transparent border-none cursor-pointer"
              >
                Log in →
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
