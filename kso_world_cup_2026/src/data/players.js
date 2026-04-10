// KSO players and their drafted teams
// Snake draft: 19 players, 46 teams
//   Round 1 (→): P1–P19 pick teams 1–19
//   Round 2 (←): P19–P1 pick teams 20–38
//   Round 3 (→): P1–P8 only pick teams 39–46 (first 8 players get a 3rd team)
// ⚠️ Update these team IDs once the real draft is completed

import { getTeamByName } from './teams'

export const PLAYERS = [
  { id: 1,  name: 'Matt',    teams: [1,  38, 39] }, // Argentina, Ghana, Egypt
  { id: 2,  name: 'Hannah',  teams: [2,  37, 40] }, // France, Panama, South Africa
  { id: 3,  name: 'Sam',     teams: [3,  36, 41] }, // Spain, Iraq, Cape Verde
  { id: 4,  name: 'Nat',     teams: [4,  35, 42] }, // England, Qatar, DR Congo
  { id: 5,  name: 'Dave',    teams: [5,  34, 43] }, // Brazil, Uzbekistan, Haiti
  { id: 6,  name: 'Tamina',  teams: [6,  33, 44] }, // Belgium, Saudi Arabia, New Zealand
  { id: 7,  name: 'Jack',    teams: [7,  32, 45] }, // Portugal, Tunisia, Bosnia & Herzegovina
  { id: 8,  name: 'Ange',    teams: [8,  31, 46] }, // Netherlands, Ivory Coast, Jordan
  { id: 9,  name: 'Pete',    teams: [9,  30]     }, // Germany, Paraguay
  { id: 10, name: 'Caitlyn', teams: [10, 29]     }, // Colombia, Scotland
  { id: 11, name: 'Murray',  teams: [11, 28]     }, // Croatia, Czech Republic
  { id: 12, name: 'Rina',    teams: [12, 27]     }, // Morocco, Sweden
  { id: 13, name: 'Charlie', teams: [13, 26]     }, // Japan, Norway
  { id: 14, name: 'Dan',     teams: [14, 25]     }, // USA, Australia
  { id: 15, name: 'Jess',    teams: [15, 24]     }, // Uruguay, Turkey
  { id: 16, name: 'Adam',    teams: [16, 23]     }, // Switzerland, Austria
  { id: 17, name: 'Amanda',  teams: [17, 22]     }, // Mexico, Canada
  { id: 18, name: 'Chris',   teams: [18, 21]     }, // Senegal, Ecuador
  { id: 19, name: 'Charles', teams: [19, 20]     }, // Iran, South Korea
]

/** Returns the player who owns a given team ID, or null */
export function getOwner(teamId) {
  return PLAYERS.find(p => p.teams.includes(teamId)) ?? null
}

/** Returns the player who owns a team by name, or null */
export function getOwnerByTeamName(teamName) {
  const team = getTeamByName(teamName)
  if (!team) return null
  return getOwner(team.id)
}
