const RULES = [
  {
    heading: 'The draft',
    body: '24 players each draft 2 national teams from the 48 FIFA World Cup squads via a snake draft — 48 picks in total. Pick order is randomly assigned when the draft begins, then reversed for round 2.',
  },
  {
    heading: 'Points per match',
    body: 'Win: 3 pts\nDraw: 1 pt\nLoss: 0 pts\nBonus: +1 pt if your team wins by 2 or more goals',
  },
  {
    heading: 'Multipliers',
    body: 'Points are multiplied based on FIFA ranking at the time of the draft:\n\nTop 12 (rank 1–12): ×1\nUpper 12 (rank 13–24): ×2\nLower 12 (rank 25–36): ×3\nBottom 12 (rank 37–48): ×4',
  },
  {
    heading: 'Formula',
    body: '(base points + bonus) × multiplier',
  },
  {
    heading: 'Example',
    body: 'Australia (rank 25, ×3) beats Brazil 2–0:\nBase 3 pts + bonus 1 pt = 4 × 3 = 12 pts\n\nArgentina (rank 1, ×1) beats Australia 2–0:\nBase 3 pts + bonus 1 pt = 4 × 1 = 4 pts',
  },
  {
    heading: 'Winner',
    body: 'The player with the most total points when the World Cup final is played wins.',
  },
]

export default function Rules() {
  return (
    <div>
      <div className="py-16 lg:py-[91px]">
        <h1
          className="text-[40px] sm:text-[56px] lg:text-[72px] font-semibold leading-none"
          style={{ letterSpacing: '-2.88px' }}
        >
          Rules
        </h1>
      </div>

      <div className="pb-16 flex flex-col gap-10 max-w-2xl">
        {RULES.map(rule => (
          <div key={rule.heading} className="flex flex-col gap-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#0a0a0a]/40">
              {rule.heading}
            </p>
            <p className="text-[20px] font-semibold leading-[1.3] tracking-[-0.01em] whitespace-pre-line">
              {rule.body}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
