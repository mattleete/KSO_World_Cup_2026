import { useState, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { supabase } from '../lib/supabase'
import { TEAMS, getMultiplier } from '../data/teams'
import { TEAM_GROUPS } from '../data/teamGroups'

// ── Sortable team row ─────────────────────────────────────────────────────────

function SortableTeamRow({ team, rank, isPicked }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: team.id,
    disabled: isPicked,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-[4px] flex items-center gap-3 h-14 transition-opacity ${
        isPicked ? 'opacity-30' : isDragging ? 'opacity-80 shadow-lg' : ''
      }`}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className={`flex flex-col gap-[3px] px-2 py-4 shrink-0 ${
          isPicked ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
        }`}
      >
        <span className="block w-4 h-[2px] bg-[#0a0a0a]/30 rounded" />
        <span className="block w-4 h-[2px] bg-[#0a0a0a]/30 rounded" />
        <span className="block w-4 h-[2px] bg-[#0a0a0a]/30 rounded" />
      </div>

      {/* Rank number */}
      <p className="text-[13px] text-[#0a0a0a]/30 w-6 shrink-0 tabular-nums">{rank}</p>

      {/* Team info */}
      <div className="bg-[#e9e9e9] rounded-[4px] px-3 flex items-center gap-3 flex-1 h-full min-w-0">
        <span className="text-[28px] leading-none shrink-0">{team.flag}</span>
        <p className="text-[18px] font-semibold leading-[1.1] tracking-[-0.02em] truncate min-w-0 flex-1">{team.name}</p>
        <div className="flex items-center gap-3 sm:gap-4 shrink-0 text-[12px] text-[#0a0a0a]/40">
          <div className="flex flex-col items-end leading-tight tabular-nums">
            <span>Group {TEAM_GROUPS[team.name] ?? '—'}</span>
            <span>Rank: {team.fifaRank}</span>
          </div>
          <span className="text-[#0a0a0a]/60 font-medium w-6 text-right">{getMultiplier(team.tier)}x</span>
        </div>
      </div>
    </div>
  )
}

// ── Main Preferences component ────────────────────────────────────────────────

export default function Preferences({ membership, pickedTeamIds = [] }) {
  const [order, setOrder] = useState(() => TEAMS.map(t => t.id)) // default: FIFA rank
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  )

  // Load saved preferences
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('draft_preferences')
        .select()
        .eq('group_member_id', membership.id)
        .order('rank')

      if (data && data.length > 0) {
        setOrder(data.map(p => p.team_id))
      }
      setLoading(false)
    }
    load()
  }, [membership.id])

  function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setOrder(prev => {
      const oldIndex = prev.indexOf(active.id)
      const newIndex = prev.indexOf(over.id)
      return arrayMove(prev, oldIndex, newIndex)
    })
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)

    const rows = order.map((teamId, i) => ({
      group_member_id: membership.id,
      team_id: teamId,
      rank: i + 1,
    }))

    // Upsert all preferences
    const { error } = await supabase
      .from('draft_preferences')
      .upsert(rows, { onConflict: 'group_member_id,team_id' })

    if (!error) setSaved(true)
    setSaving(false)
  }

  if (loading) return <p className="text-[#0a0a0a]/50 text-[14px]">Loading preferences…</p>

  const teams = order.map(id => TEAMS.find(t => t.id === id)).filter(Boolean)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#0a0a0a]/40">
            My draft preferences
          </p>
          <p className="text-[13px] text-[#0a0a0a]/50 mt-1">
            Drag to reorder. If you're not online when it's your turn, the top available team will be auto-drafted.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`shrink-0 ml-4 rounded-lg px-4 py-2 text-[13px] font-medium uppercase tracking-[0.08em] cursor-pointer transition-colors disabled:opacity-40 ${
            saved
              ? 'bg-[#e9e9e9] text-[#0a0a0a]/50'
              : 'bg-[#0a0a0a] text-white'
          }`}
        >
          {saving ? 'Saving…' : saved ? 'Saved' : 'Save order'}
        </button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-1">
            {teams.map((team, i) => (
              <SortableTeamRow
                key={team.id}
                team={team}
                rank={i + 1}
                isPicked={pickedTeamIds.includes(team.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
