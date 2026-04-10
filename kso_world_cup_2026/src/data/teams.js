// Teams are ordered by approximate FIFA ranking — this determines their points multiplier tier
// ⚠️ Update fifaRank order if the official FIFA rankings change before the tournament

export const TEAMS = [
  // ── Top 16 (FIFA rank 1–16) — ×1 points multiplier ──────────────────────
  { id: 1,  name: 'Argentina',           flag: '🇦🇷', tier: 'top',    fifaRank: 1  },
  { id: 2,  name: 'France',              flag: '🇫🇷', tier: 'top',    fifaRank: 2  },
  { id: 3,  name: 'Spain',               flag: '🇪🇸', tier: 'top',    fifaRank: 3  },
  { id: 4,  name: 'England',             flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', tier: 'top',    fifaRank: 4  },
  { id: 5,  name: 'Brazil',              flag: '🇧🇷', tier: 'top',    fifaRank: 5  },
  { id: 6,  name: 'Belgium',             flag: '🇧🇪', tier: 'top',    fifaRank: 6  },
  { id: 7,  name: 'Portugal',            flag: '🇵🇹', tier: 'top',    fifaRank: 7  },
  { id: 8,  name: 'Netherlands',         flag: '🇳🇱', tier: 'top',    fifaRank: 8  },
  { id: 9,  name: 'Germany',             flag: '🇩🇪', tier: 'top',    fifaRank: 9  },
  { id: 10, name: 'Colombia',            flag: '🇨🇴', tier: 'top',    fifaRank: 10 },
  { id: 11, name: 'Croatia',             flag: '🇭🇷', tier: 'top',    fifaRank: 11 },
  { id: 12, name: 'Morocco',             flag: '🇲🇦', tier: 'top',    fifaRank: 12 },
  { id: 13, name: 'Japan',               flag: '🇯🇵', tier: 'top',    fifaRank: 13 },
  { id: 14, name: 'USA',                 flag: '🇺🇸', tier: 'top',    fifaRank: 14 },
  { id: 15, name: 'Uruguay',             flag: '🇺🇾', tier: 'top',    fifaRank: 15 },
  { id: 16, name: 'Switzerland',         flag: '🇨🇭', tier: 'top',    fifaRank: 16 },

  // ── Middle 16 (FIFA rank 17–32) — ×2 points multiplier ──────────────────
  { id: 17, name: 'Mexico',              flag: '🇲🇽', tier: 'mid',    fifaRank: 17 },
  { id: 18, name: 'Senegal',             flag: '🇸🇳', tier: 'mid',    fifaRank: 18 },
  { id: 19, name: 'Iran',                flag: '🇮🇷', tier: 'mid',    fifaRank: 19, apiName: 'IR Iran'           },
  { id: 20, name: 'South Korea',         flag: '🇰🇷', tier: 'mid',    fifaRank: 20, apiName: 'Korea Republic'    },
  { id: 21, name: 'Ecuador',             flag: '🇪🇨', tier: 'mid',    fifaRank: 21 },
  { id: 22, name: 'Canada',              flag: '🇨🇦', tier: 'mid',    fifaRank: 22 },
  { id: 23, name: 'Austria',             flag: '🇦🇹', tier: 'mid',    fifaRank: 23 },
  { id: 24, name: 'Turkey',              flag: '🇹🇷', tier: 'mid',    fifaRank: 24 },
  { id: 25, name: 'Australia',           flag: '🇦🇺', tier: 'mid',    fifaRank: 25 },
  { id: 26, name: 'Norway',              flag: '🇳🇴', tier: 'mid',    fifaRank: 26 },
  { id: 27, name: 'Sweden',              flag: '🇸🇪', tier: 'mid',    fifaRank: 27 },
  { id: 28, name: 'Czech Republic',      flag: '🇨🇿', tier: 'mid',    fifaRank: 28, apiName: 'Czechia'           },
  { id: 29, name: 'Scotland',            flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', tier: 'mid',    fifaRank: 29 },
  { id: 30, name: 'Paraguay',            flag: '🇵🇾', tier: 'mid',    fifaRank: 30 },
  { id: 31, name: 'Ivory Coast',         flag: '🇨🇮', tier: 'mid',    fifaRank: 31, apiName: "Côte d'Ivoire"    },
  { id: 32, name: 'Tunisia',             flag: '🇹🇳', tier: 'mid',    fifaRank: 32 },

  // ── Bottom 16 (FIFA rank 33–48) — ×3 points multiplier ──────────────────
  { id: 33, name: 'Saudi Arabia',        flag: '🇸🇦', tier: 'bottom', fifaRank: 33 },
  { id: 34, name: 'Uzbekistan',          flag: '🇺🇿', tier: 'bottom', fifaRank: 34 },
  { id: 35, name: 'Qatar',               flag: '🇶🇦', tier: 'bottom', fifaRank: 35 },
  { id: 36, name: 'Iraq',                flag: '🇮🇶', tier: 'bottom', fifaRank: 36 },
  { id: 37, name: 'Panama',              flag: '🇵🇦', tier: 'bottom', fifaRank: 37 },
  { id: 38, name: 'Ghana',               flag: '🇬🇭', tier: 'bottom', fifaRank: 38 },
  { id: 39, name: 'Egypt',               flag: '🇪🇬', tier: 'bottom', fifaRank: 39 },
  { id: 40, name: 'South Africa',        flag: '🇿🇦', tier: 'bottom', fifaRank: 40 },
  { id: 41, name: 'Cape Verde',          flag: '🇨🇻', tier: 'bottom', fifaRank: 41, apiName: 'Cabo Verde'        },
  { id: 42, name: 'DR Congo',            flag: '🇨🇩', tier: 'bottom', fifaRank: 42, apiName: 'Congo DR'           },
  { id: 43, name: 'Haiti',               flag: '🇭🇹', tier: 'bottom', fifaRank: 43 },
  { id: 44, name: 'New Zealand',         flag: '🇳🇿', tier: 'bottom', fifaRank: 44 },
  { id: 45, name: 'Bosnia & Herzegovina',flag: '🇧🇦', tier: 'bottom', fifaRank: 45, apiName: 'Bosnia-Herzegovina' },
  { id: 46, name: 'Jordan',              flag: '🇯🇴', tier: 'bottom', fifaRank: 46 },
  // Undrafted teams — in the tournament but not assigned to any KSO player
  { id: 47, name: 'Algeria',             flag: '🇩🇿', tier: 'bottom', fifaRank: 47 },
  { id: 48, name: 'Curaçao',             flag: '🇨🇼', tier: 'bottom', fifaRank: 48 },
]

export const TIER_CONFIG = {
  top:    { multiplier: 1, badge: 'Top 16',    description: 'FIFA rank 1–16'  },
  mid:    { multiplier: 2, badge: 'Middle 16', description: 'FIFA rank 17–32' },
  bottom: { multiplier: 3, badge: 'Bottom 16', description: 'FIFA rank 33–48' },
}

export function getTeamById(id) {
  return TEAMS.find(t => t.id === id)
}

export function getTeamByName(name) {
  return TEAMS.find(t => t.name === name || t.apiName === name)
}

export function getMultiplier(tier) {
  return TIER_CONFIG[tier]?.multiplier ?? 1
}
