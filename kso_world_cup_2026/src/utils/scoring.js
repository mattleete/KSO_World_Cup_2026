import { getTeamById, getTeamByName, getMultiplier } from '../data/teams'

/**
 * Calculate points earned by one team from a single completed match.
 *
 * Scoring rules:
 *   Win:             3 pts
 *   Draw:            1 pt
 *   Win by 2+ goals: +1 bonus pt
 *   Multiplier:      ×1 (rank 1–12), ×2 (13–24), ×3 (25–36), ×4 (37–48)
 *   Formula:         (base + bonus) × multiplier
 *
 * Penalty shootout: a knockout level after extra time is decided on penalties.
 * That counts as a WIN (3 pts) for the shootout winner and a LOSS (0) for the
 * loser — NOT a draw. The margin bonus never applies (the score is level). A
 * shootout is detected by the presence of both `pen1`/`pen2` on the match;
 * group-stage draws have no penalties and stay 1 pt each.
 *
 * @param {string} teamName - Team name (must match teams.js `name` field)
 * @param {object} match    - Result object: { team1, score1, team2, score2, pen1?, pen2? }
 * @returns {number} Points earned
 */
export function calcMatchPoints(teamName, match) {
  const isTeam1 = teamName === match.team1
  const isTeam2 = teamName === match.team2
  if (!isTeam1 && !isTeam2) return 0

  const myScore  = isTeam1 ? match.score1 : match.score2
  const oppScore = isTeam1 ? match.score2 : match.score1

  const team = getTeamByName(teamName)
  const multiplier = getMultiplier(team?.tier)

  // Penalty shootout (level score with recorded penalties): win 3 / loss 0,
  // no margin bonus.
  if (myScore === oppScore && match.pen1 != null && match.pen2 != null) {
    const myPens  = isTeam1 ? match.pen1 : match.pen2
    const oppPens = isTeam1 ? match.pen2 : match.pen1
    return (myPens > oppPens ? 3 : 0) * multiplier
  }

  let base = 0
  if (myScore > oppScore)       base = 3  // win
  else if (myScore === oppScore) base = 1  // draw
  // loss = 0

  const bonus = (myScore - oppScore) >= 2 ? 1 : 0

  return (base + bonus) * multiplier
}

/**
 * Total points earned by a single team across all completed matches.
 *
 * @param {number} teamId  - Team ID from teams.js
 * @param {Array}  results - Array of completed match objects
 * @returns {number} Total points
 */
export function calcTeamPoints(teamId, results) {
  const team = getTeamById(teamId)
  if (!team) return 0
  return results.reduce((sum, match) => sum + calcMatchPoints(team.name, match), 0)
}

/**
 * Total cumulative points for a player across all completed matches.
 *
 * @param {object} player  - Player object from players.js
 * @param {Array}  results - Array of completed match objects
 * @returns {number} Total points
 */
export function calcPlayerPoints(player, results) {
  return player.teams.reduce((sum, teamId) => sum + calcTeamPoints(teamId, results), 0)
}
