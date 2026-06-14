import { useState } from 'react'

// A titled, collapsible section. Header shows the title, an optional count
// badge, and a chevron. Children render below when open.
export default function CollapsibleSection({ title, count, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="flex items-center justify-between w-full text-left bg-transparent border-none cursor-pointer p-0 group"
      >
        <span className="flex items-baseline gap-2">
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#0a0a0a]/40 group-hover:text-[#0a0a0a]/70 transition-colors">
            {title}
          </span>
          {count != null && (
            <span className="text-[11px] font-medium text-[#0a0a0a]/30">{count}</span>
          )}
        </span>
        <span className="text-[10px] text-[#0a0a0a]/30">{open ? '▲' : '▼'}</span>
      </button>
      {open && children}
    </div>
  )
}
