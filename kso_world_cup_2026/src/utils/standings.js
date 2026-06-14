import { TEAM_GROUPS } from '../data/teamGroups'
import { getTeamByName } from '../data/teams'
import { isPlayed } from './fixtures'

// Standard FIFA group-table points — 3 for a win, 1 for a draw, 0 for a loss.
// NOTE: these are the REAL tournament standings, NOT the fantasy points shown
// on the cards/leaderboard (those use tier multipliers via calcMatchPoints).

/**
 * Compute a group's standings table from the fixture list.
 * Returns rows sorted by Pts → goal difference → goals for, each:
 * { team, P, W, D, L, GF, GA, GD, Pts }. `team` is the teams.js team object.
 */
export function computeGroupStandings(groupLetter, fixtures) {
  const teamNames = Object.keys(TEAM_GROUPS).filter(n => TEAM_GROUPS[n] === groupLetter)

  const rows = teamNames.map(name => {
    const row = { name, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, Pts: 0 }
    fixtures.forEach(match => {
      if (!isPlayed(match)) return
      const isHome = match.team1 === name
      const isAway = match.team2 === name
      if (!isHome && !isAway) return
      const my  = isHome ? match.score1 : match.score2
      const opp = isHome ? match.score2 : match.score1
      row.P++
      row.GF += my
      row.GA += opp
      if (my > opp)       { row.W++; row.Pts += 3 }
      else if (my === opp) { row.D++; row.Pts += 1 }
      else                  row.L++
    })
    row.GD = row.GF - row.GA
    return { ...row, team: getTeamByName(name) ?? { name, flag: '🏳️' } }
  })

  rows.sort((a, b) =>
    b.Pts - a.Pts || b.GD - a.GD || b.GF - a.GF ||
    (a.team.displayName ?? a.team.name).localeCompare(b.team.displayName ?? b.team.name)
  )
  return rows
}
