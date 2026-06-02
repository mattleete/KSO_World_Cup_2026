// Dummy fixture data for UI testing.
// Covers all three card states: completed, live, and upcoming.
// Timestamps are UTC — e.g. 07:00Z = 17:00 AEST, 10:00Z = 20:00 AEST, 12:00Z = 22:00 AEST

export const DUMMY_FIXTURES = [
  // ── Thu 11 Jun — completed ────────────────────────────────────────────────
  { team1: 'Argentina',  score1: 2, team2: 'Mexico',      score2: 1, stage: 'Group A', date: '2026-06-11T07:00:00Z', status: 'finished' },
  { team1: 'France',     score1: 3, team2: 'Senegal',     score2: 0, stage: 'Group B', date: '2026-06-11T07:00:00Z', status: 'finished' },
  { team1: 'Brazil',     score1: 1, team2: 'Ecuador',     score2: 1, stage: 'Group E', date: '2026-06-11T10:00:00Z', status: 'finished' },
  { team1: 'Belgium',    score1: 2, team2: 'Canada',      score2: 0, stage: 'Group F', date: '2026-06-11T10:00:00Z', status: 'finished' },
  { team1: 'Germany',    score1: 3, team2: 'Scotland',    score2: 0, stage: 'Group I', date: '2026-06-11T12:00:00Z', status: 'finished' },
  { team1: 'Colombia',   score1: 1, team2: 'Norway',      score2: 0, stage: 'Group J', date: '2026-06-11T12:00:00Z', status: 'finished' },

  // ── Fri 12 Jun — completed + live ────────────────────────────────────────
  { team1: 'Spain',       score1: 1, team2: 'Iran',        score2: 0, stage: 'Group C', date: '2026-06-12T07:00:00Z', status: 'finished' },
  { team1: 'Netherlands', score1: 2, team2: 'Turkey',      score2: 1, stage: 'Group H', date: '2026-06-12T07:00:00Z', status: 'finished' },
  { team1: 'Portugal',    score1: 2, team2: 'Austria',     score2: 0, stage: 'Group G', date: '2026-06-12T10:00:00Z', status: 'finished' },
  { team1: 'Morocco',     score1: 1, team2: 'Japan',       score2: 1, stage: 'Group K', date: '2026-06-12T10:00:00Z', status: 'finished' },
  { team1: 'England',     score1: 1, team2: 'South Korea', score2: 0, stage: 'Group D', date: '2026-06-12T12:00:00Z', status: 'live'     },
  { team1: 'USA',         score1: 0, team2: 'Uruguay',     score2: 0, stage: 'Group L', date: '2026-06-12T12:00:00Z', status: 'live'     },

  // ── Sat 13 Jun — upcoming ────────────────────────────────────────────────
  { team1: 'Croatia',      score1: null, team2: 'Czech Republic', score2: null, stage: 'Group J', date: '2026-06-13T07:00:00Z', status: 'scheduled' },
  { team1: 'Mexico',       score1: null, team2: 'Ghana',          score2: null, stage: 'Group A', date: '2026-06-13T07:00:00Z', status: 'scheduled' },
  { team1: 'Saudi Arabia', score1: null, team2: 'New Zealand',    score2: null, stage: 'Group F', date: '2026-06-13T10:00:00Z', status: 'scheduled' },
  { team1: 'Senegal',      score1: null, team2: 'Panama',         score2: null, stage: 'Group B', date: '2026-06-13T10:00:00Z', status: 'scheduled' },
  { team1: 'Switzerland',  score1: null, team2: 'Australia',      score2: null, stage: 'Group L', date: '2026-06-13T12:00:00Z', status: 'scheduled' },
  { team1: 'Iraq',         score1: null, team2: 'Cape Verde',     score2: null, stage: 'Group C', date: '2026-06-13T12:00:00Z', status: 'scheduled' },

  // ── Sun 14 Jun — upcoming ────────────────────────────────────────────────
  { team1: 'Brazil',   score1: null, team2: 'Haiti',               score2: null, stage: 'Group E', date: '2026-06-14T07:00:00Z', status: 'scheduled' },
  { team1: 'Tunisia',  score1: null, team2: 'Bosnia & Herzegovina',score2: null, stage: 'Group G', date: '2026-06-14T07:00:00Z', status: 'scheduled' },
  { team1: 'Jordan',   score1: null, team2: 'Ivory Coast',         score2: null, stage: 'Group H', date: '2026-06-14T10:00:00Z', status: 'scheduled' },
  { team1: 'Ecuador',  score1: null, team2: 'Uzbekistan',          score2: null, stage: 'Group E', date: '2026-06-14T10:00:00Z', status: 'scheduled' },
  { team1: 'Egypt',    score1: null, team2: 'South Africa',        score2: null, stage: 'Group B', date: '2026-06-14T12:00:00Z', status: 'scheduled' },
  { team1: 'Scotland', score1: null, team2: 'Paraguay',            score2: null, stage: 'Group I', date: '2026-06-14T12:00:00Z', status: 'scheduled' },
]

// ── Dummy draft state (round 1 complete, pick 25 is next) ─────────────────
//
// 24 players in snake draft order. Round 1 picks 1–24 (best team first),
// round 2 picks 25–48 (reversed). State shown: round 1 done, Luke is next.

export const DUMMY_DRAFT_PLAYERS = [
  { id: '1',  display_name: 'Matt'  },
  { id: '2',  display_name: 'Tom'   },
  { id: '3',  display_name: 'Sam'   },
  { id: '4',  display_name: 'Jack'  },
  { id: '5',  display_name: 'Will'  },
  { id: '6',  display_name: 'Liam'  },
  { id: '7',  display_name: 'Hugo'  },
  { id: '8',  display_name: 'Ollie' },
  { id: '9',  display_name: 'Ben'   },
  { id: '10', display_name: 'Ed'    },
  { id: '11', display_name: 'Harry' },
  { id: '12', display_name: 'Finn'  },
  { id: '13', display_name: 'Max'   },
  { id: '14', display_name: 'Oscar' },
  { id: '15', display_name: 'Leo'   },
  { id: '16', display_name: 'Rory'  },
  { id: '17', display_name: 'Josh'  },
  { id: '18', display_name: 'Dan'   },
  { id: '19', display_name: 'Chris' },
  { id: '20', display_name: 'Alex'  },
  { id: '21', display_name: 'Pete'  },
  { id: '22', display_name: 'Nick'  },
  { id: '23', display_name: 'James' },
  { id: '24', display_name: 'Luke'  },
]

// Snake order: round 1 = players 1→24, round 2 = players 24→1
export const DUMMY_DRAFT_ORDER = [
  // Round 1
  ...Array.from({ length: 24 }, (_, i) => ({
    pick_number: i + 1,
    group_member_id: String(i + 1),
  })),
  // Round 2 (reversed)
  ...Array.from({ length: 24 }, (_, i) => ({
    pick_number: 25 + i,
    group_member_id: String(24 - i),
  })),
]

// Round 1 picks completed: each player drafted the team matching their pick slot
// (fifaRank 1–24 in order, so Matt→Argentina id:1, Tom→France id:2, … Luke→Turkey id:24)
export const DUMMY_DRAFT_PICKS = Array.from({ length: 24 }, (_, i) => ({
  id: `p${i + 1}`,
  pick_number: i + 1,
  group_member_id: String(i + 1),
  team_id: i + 1,
}))

// All 48 picks (both rounds complete) — used by PicksAndPoints
// Round 2 reversed: player 24→team 25, player 23→team 26, … player 1→team 48
export const DUMMY_ALL_PICKS = [
  ...Array.from({ length: 24 }, (_, i) => ({
    group_member_id: String(i + 1),
    team_id: i + 1,
  })),
  ...Array.from({ length: 24 }, (_, i) => ({
    group_member_id: String(24 - i),
    team_id: 25 + i,
  })),
]

export const DUMMY_DRAFT_SESSION = {
  id: 'dummy-session',
  group_id: 'dummy-group',
  status: 'active',
  current_pick_number: 25,
  pick_deadline: null,
  pick_timeout_seconds: 0,
}

// ── Full 24-player snake draft ─────────────────────────────────────────────
//
// Snake order — round 1 picks 1–24 (FIFA rank order), round 2 picks 25–48 (reversed):
//
//  Pick  Player    Team (round 1)     Pick  Player    Team (round 2)
//   1    Matt      Argentina           48    Matt      Curaçao
//   2    Tom       France              47    Tom       Algeria
//   3    Sam       Spain               46    Sam       Jordan
//   4    Jack      England             45    Jack      Bosnia & Herzegovina
//   5    Will      Brazil              44    Will      New Zealand
//   6    Liam      Belgium             43    Liam      Haiti
//   7    Hugo      Portugal            42    Hugo      DR Congo
//   8    Ollie     Netherlands         41    Ollie     Cape Verde
//   9    Ben       Germany             40    Ben       South Africa
//  10    Ed        Colombia            39    Ed        Egypt
//  11    Harry     Croatia             38    Harry     Ghana
//  12    Finn      Morocco             37    Finn      Panama
//  13    Max       Japan               36    Max       Iraq
//  14    Oscar     USA                 35    Oscar     Qatar
//  15    Leo       Uruguay             34    Leo       Uzbekistan
//  16    Rory      Switzerland         33    Rory      Saudi Arabia
//  17    Josh      Mexico              32    Josh      Tunisia
//  18    Dan       Senegal             31    Dan       Ivory Coast
//  19    Chris     Iran                30    Chris     Paraguay
//  20    Alex      South Korea         29    Alex      Scotland
//  21    Pete      Ecuador             28    Pete      Czech Republic
//  22    Nick      Canada              27    Nick      Sweden
//  23    James     Austria             26    James     Norway
//  24    Luke      Turkey              25    Luke      Australia

export const DUMMY_OWNERS = {
  // Matt (pick 1 + 48)
  'Argentina':            'Matt',
  'Curaçao':              'Matt',
  // Tom (pick 2 + 47)
  'France':               'Tom',
  'Algeria':              'Tom',
  // Sam (pick 3 + 46)
  'Spain':                'Sam',
  'Jordan':               'Sam',
  // Jack (pick 4 + 45)
  'England':              'Jack',
  'Bosnia & Herzegovina': 'Jack',
  // Will (pick 5 + 44)
  'Brazil':               'Will',
  'New Zealand':          'Will',
  // Liam (pick 6 + 43)
  'Belgium':              'Liam',
  'Haiti':                'Liam',
  // Hugo (pick 7 + 42)
  'Portugal':             'Hugo',
  'DR Congo':             'Hugo',
  // Ollie (pick 8 + 41)
  'Netherlands':          'Ollie',
  'Cape Verde':           'Ollie',
  // Ben (pick 9 + 40)
  'Germany':              'Ben',
  'South Africa':         'Ben',
  // Ed (pick 10 + 39)
  'Colombia':             'Ed',
  'Egypt':                'Ed',
  // Harry (pick 11 + 38)
  'Croatia':              'Harry',
  'Ghana':                'Harry',
  // Finn (pick 12 + 37)
  'Morocco':              'Finn',
  'Panama':               'Finn',
  // Max (pick 13 + 36)
  'Japan':                'Max',
  'Iraq':                 'Max',
  // Oscar (pick 14 + 35)
  'USA':                  'Oscar',
  'Qatar':                'Oscar',
  // Leo (pick 15 + 34)
  'Uruguay':              'Leo',
  'Uzbekistan':           'Leo',
  // Rory (pick 16 + 33)
  'Switzerland':          'Rory',
  'Saudi Arabia':         'Rory',
  // Josh (pick 17 + 32)
  'Mexico':               'Josh',
  'Tunisia':              'Josh',
  // Dan (pick 18 + 31)
  'Senegal':              'Dan',
  'Ivory Coast':          'Dan',
  // Chris (pick 19 + 30)
  'Iran':                 'Chris',
  'Paraguay':             'Chris',
  // Alex (pick 20 + 29)
  'South Korea':          'Alex',
  'Scotland':             'Alex',
  // Pete (pick 21 + 28)
  'Ecuador':              'Pete',
  'Czech Republic':       'Pete',
  // Nick (pick 22 + 27)
  'Canada':               'Nick',
  'Sweden':               'Nick',
  // James (pick 23 + 26)
  'Austria':              'James',
  'Norway':               'James',
  // Luke (pick 24 + 25)
  'Turkey':               'Luke',
  'Australia':            'Luke',
}
