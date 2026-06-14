import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { fetchFixtures } from '../utils/api'
import { fetchManualResults } from '../utils/results'
import { getTeamById } from '../data/teams'
import { applyManual } from '../utils/fixtures'

/**
 * Loads the WC2026 fixture feed (with manual-score overlay) plus, when the user
 * is in a league, the team→owner lookup and the set of team names the current
 * member drafted. Shared by the Fixtures and Results tabs.
 *
 * Refreshes fixtures every 60s (paused while the tab is hidden) so manual/API
 * score changes appear without a reload.
 *
 * @param {object|null} context - { group, membership } for the active league.
 * @returns {{ fixtures, ownerByTeamName, myTeamNames, loading, error }}
 */
export function useFixtureData(context) {
  const [fixtures, setFixtures] = useState([])
  const [ownerByTeamName, setOwnerByTeamName] = useState(null)
  const [myTeamNames, setMyTeamNames] = useState(() => new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const promises = [fetchFixtures(), fetchManualResults().catch(() => [])]

        if (context) {
          promises.push(
            supabase.from('draft_session').select().eq('group_id', context.group.id).maybeSingle(),
            supabase.from('group_members').select().eq('group_id', context.group.id),
          )
        }

        const [fixturesData, manual, sessionRes, membersRes] = await Promise.all(promises)
        if (cancelled) return
        setFixtures(applyManual(fixturesData, manual))

        if (context && sessionRes?.data && membersRes?.data) {
          const picksRes = await supabase
            .from('draft_picks')
            .select()
            .eq('draft_session_id', sessionRes.data.id)
          if (cancelled) return

          if (picksRes.data) {
            const members = membersRes.data
            const myMemberId = context.membership?.id
            const lookup = {}
            const mine = new Set()
            picksRes.data.forEach(pick => {
              const team = getTeamById(pick.team_id)
              const member = members.find(m => m.id === pick.group_member_id)
              if (!team) return
              if (member) {
                lookup[team.name] = member.display_name
                if (team.apiName) lookup[team.apiName] = member.display_name
              }
              if (pick.group_member_id === myMemberId) {
                mine.add(team.name)
                if (team.apiName) mine.add(team.apiName)
              }
            })
            setOwnerByTeamName(lookup)
            setMyTeamNames(mine)
          }
        }
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [context])

  // Light auto-refresh of the fixture scores (owners rarely change).
  useEffect(() => {
    const id = setInterval(() => {
      if (document.hidden) return
      Promise.all([fetchFixtures(), fetchManualResults().catch(() => [])])
        .then(([fx, manual]) => setFixtures(applyManual(fx, manual)))
        .catch(() => {})
    }, 60000)
    return () => clearInterval(id)
  }, [])

  return { fixtures, ownerByTeamName, myTeamNames, loading, error }
}
