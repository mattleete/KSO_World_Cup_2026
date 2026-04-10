const WC_START = new Date('2026-06-11T00:00:00+10:00') // AEST

function daysUntil(date) {
  return Math.ceil((date - new Date()) / (1000 * 60 * 60 * 24))
}

export default function Landing() {
  const days = daysUntil(WC_START)

  const heroText = days > 1
    ? `The world cup starts in ${days} days`
    : days === 1
      ? 'The world cup starts tomorrow'
      : days === 0
        ? 'The world cup starts today'
        : 'The world cup is underway'

  return (
    <h1
      className="text-[40px] sm:text-[56px] lg:text-[72px] font-semibold leading-none"
      style={{ letterSpacing: '-2.88px' }}
    >
      {heroText}
    </h1>
  )
}
