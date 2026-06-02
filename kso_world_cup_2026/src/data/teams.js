// Teams ordered by FIFA ranking — determines points multiplier tier.
// Tiers: top (rank 1–12) ×1 · upper (rank 13–24) ×2 · lower (rank 25–36) ×3 · bottom (rank 37–48) ×4

export const TEAMS = [
  // ── Top 12 (FIFA rank 1–12) — ×1 multiplier ─────────────────────────────
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

  // ── Upper 12 (FIFA rank 13–24) — ×2 multiplier ──────────────────────────
  { id: 13, name: 'Japan',               flag: '🇯🇵', tier: 'upper',  fifaRank: 13 },
  { id: 14, name: 'USA',                 flag: '🇺🇸', tier: 'upper',  fifaRank: 14 },
  { id: 15, name: 'Uruguay',             flag: '🇺🇾', tier: 'upper',  fifaRank: 15 },
  { id: 16, name: 'Switzerland',         flag: '🇨🇭', tier: 'upper',  fifaRank: 16 },
  { id: 17, name: 'Mexico',              flag: '🇲🇽', tier: 'upper',  fifaRank: 17 },
  { id: 18, name: 'Senegal',             flag: '🇸🇳', tier: 'upper',  fifaRank: 18 },
  { id: 19, name: 'Iran',                flag: '🇮🇷', tier: 'upper',  fifaRank: 19, apiName: 'IR Iran'           },
  { id: 20, name: 'South Korea',         flag: '🇰🇷', tier: 'upper',  fifaRank: 20, apiName: 'Korea Republic'    },
  { id: 21, name: 'Ecuador',             flag: '🇪🇨', tier: 'upper',  fifaRank: 21 },
  { id: 22, name: 'Canada',              flag: '🇨🇦', tier: 'upper',  fifaRank: 22 },
  { id: 23, name: 'Austria',             flag: '🇦🇹', tier: 'upper',  fifaRank: 23 },
  { id: 24, name: 'Turkey',              flag: '🇹🇷', tier: 'upper',  fifaRank: 24 },

  // ── Lower 12 (FIFA rank 25–36) — ×3 multiplier ──────────────────────────
  { id: 25, name: 'Australia',           flag: '🇦🇺', tier: 'lower',  fifaRank: 25 },
  { id: 26, name: 'Norway',              flag: '🇳🇴', tier: 'lower',  fifaRank: 26 },
  { id: 27, name: 'Sweden',              flag: '🇸🇪', tier: 'lower',  fifaRank: 27 },
  { id: 28, name: 'Czech Republic',      flag: '🇨🇿', tier: 'lower',  fifaRank: 28, apiName: 'Czechia'           },
  { id: 29, name: 'Scotland',            flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', tier: 'lower',  fifaRank: 29 },
  { id: 30, name: 'Paraguay',            flag: '🇵🇾', tier: 'lower',  fifaRank: 30 },
  { id: 31, name: 'Ivory Coast',         flag: '🇨🇮', tier: 'lower',  fifaRank: 31, apiName: "Côte d'Ivoire"    },
  { id: 32, name: 'Tunisia',             flag: '🇹🇳', tier: 'lower',  fifaRank: 32 },
  { id: 33, name: 'Saudi Arabia',        flag: '🇸🇦', tier: 'lower',  fifaRank: 33 },
  { id: 34, name: 'Uzbekistan',          flag: '🇺🇿', tier: 'lower',  fifaRank: 34 },
  { id: 35, name: 'Qatar',               flag: '🇶🇦', tier: 'lower',  fifaRank: 35 },
  { id: 36, name: 'Iraq',                flag: '🇮🇶', tier: 'lower',  fifaRank: 36 },

  // ── Bottom 12 (FIFA rank 37–48) — ×4 multiplier ─────────────────────────
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
  { id: 47, name: 'Algeria',             flag: '🇩🇿', tier: 'bottom', fifaRank: 47 },
  { id: 48, name: 'Curaçao',             flag: '🇨🇼', tier: 'bottom', fifaRank: 48 },
]

export const TIER_CONFIG = {
  top:    { multiplier: 1, badge: 'Top 12',    description: 'FIFA rank 1–12'  },
  upper:  { multiplier: 2, badge: 'Upper 12',  description: 'FIFA rank 13–24' },
  lower:  { multiplier: 3, badge: 'Lower 12',  description: 'FIFA rank 25–36' },
  bottom: { multiplier: 4, badge: 'Bottom 12', description: 'FIFA rank 37–48' },
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
