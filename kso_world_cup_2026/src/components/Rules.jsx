const RULES = [
  {
    heading: 'Draft',
    body: 'Each player was assigned national teams via a snake draft. The first 8 players received 3 teams; the remaining 11 received 2 teams.',
  },
  {
    heading: 'Points per match',
    body: 'Win: 2 pts · Draw: 1 pt · Loss: 0 pts\nBonus: +1 pt if your team wins by 2 or more goals.',
  },
  {
    heading: 'Multipliers',
    body: 'Top 16 teams (FIFA rank 1–16): ×1\nMiddle 16 teams (FIFA rank 17–32): ×2\nBottom 16 teams (FIFA rank 33–48): ×3',
  },
  {
    heading: 'Formula',
    body: 'Points = (base + bonus) × multiplier',
  },
  {
    heading: 'Winner',
    body: 'The KSO player with the most points when the World Cup final is played wins.',
  },
]

export default function Rules() {
  return (
    <div>
      {/* Hero */}
      <div className="px-8 lg:px-[68px] py-16 lg:py-[91px]">
        <h1
          className="text-[40px] sm:text-[56px] lg:text-[72px] font-semibold leading-none"
          style={{ letterSpacing: '-2.88px' }}
        >
          Rules are important
        </h1>
      </div>

      {/* Rules content */}
      <div className="px-8 lg:px-[68px] pb-16 flex flex-col gap-8 max-w-3xl">
        {RULES.map(rule => (
          <div key={rule.heading} className="flex flex-col gap-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#0a0a0a]/40">
              {rule.heading}
            </p>
            <p
              className="text-[24px] font-semibold leading-[1.1] tracking-[-0.02em] whitespace-pre-line"
            >
              {rule.body}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
