const TABS = [
  { id: 'picks',    label: 'KSO Picks & Points', short: 'Picks'    },
  { id: 'fixtures', label: 'Fixtures',            short: 'Fixtures' },
  { id: 'teams',    label: 'Team Info',            short: 'Teams'    },
  { id: 'rules',    label: 'Rules',                short: 'Rules'    },
  { id: 'draft',    label: 'Draft',               short: 'Draft'    },
]

export default function Nav({ activeTab, onTabChange, onLogoClick, session, onSignOut }) {
  return (
    <nav className="sticky top-0 z-50 bg-[#f7f7f7] h-16 flex items-center justify-between px-8 lg:px-16">
      {/* Logo */}
      <button
        onClick={onLogoClick}
        className="text-[16px] font-semibold tracking-[-0.01em] text-[#0a0a0a] shrink-0 bg-transparent border-none cursor-pointer p-0"
      >
        KSO World Cup 2026
      </button>

      {/* Nav items */}
      <div className="flex items-center gap-6 lg:gap-12 overflow-x-auto scrollbar-none">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`shrink-0 text-[11px] font-medium uppercase tracking-[0.08em] transition-opacity cursor-pointer bg-transparent border-none p-2 ${
              activeTab === tab.id
                ? 'text-[#0a0a0a]'
                : 'text-[#0a0a0a]/40 hover:text-[#0a0a0a]/70'
            }`}
          >
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.short}</span>
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
    </nav>
  )
}
