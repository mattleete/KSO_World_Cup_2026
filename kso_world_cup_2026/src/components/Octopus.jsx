// Occy — orange cartoon octopus.
// Each tentacle is ONE filled path whose `d` (a tapered closed outline) is set
// every frame by Landing.jsx's verlet simulation. See LEGS / TENT_LEN exports.

const BODY    = '#fb7c3f'   // default orange body + tentacle fill (recoloured at runtime)
const OUTLINE = '#6e2c12'   // body / tentacle outline
const INK     = '#241008'   // eyes, eyebrows, mouth

const BODY_PATH = [
  'M 100 14',
  'C 157 14 178 58 178 90',
  'C 178 130 172 152 160 157',
  'Q 135 163 100 163',
  'Q 65 163 40 157',
  'C 28 152 22 130 22 90',
  'C 22 58 43 14 100 14 Z',
].join(' ')

// Exported so Landing.jsx can build the verlet chains + grab math
export const TENT_LEN = 118    // SVG units
export const N_SUCKERS = 3     // sucker circles per tentacle
export const LEGS = [          // [cx, ttop, spreadDeg]  — 7 tentacles, wide fan
  [40,  150, +58],
  [58,  157, +38],
  [78,  160, +18],
  [100, 161,   0],
  [122, 160, -18],
  [142, 157, -38],
  [160, 150, -58],
]

export default function Octopus({ className = 'w-44 sm:w-56 h-auto', hideShadow = false }) {
  return (
    <svg
      className={className}
      viewBox="-50 0 300 298"
      fill="none"
      role="img"
      aria-label="Occy, a friendly orange octopus"
      xmlns="http://www.w3.org/2000/svg"
    >
      {!hideShadow && (
        <ellipse cx="100" cy="259" rx="52" ry="7" fill="#000" opacity="0.06" className="occy-shadow" />
      )}

      <g className="occy-float">

        {/* ── Tentacles ── one filled tapered path each, set by Landing.jsx.
            Drawn before the body so the body covers their attachment points. */}
        {LEGS.map((_, i) => (
          <path
            key={`tent${i}`}
            data-tent={i}
            fill={BODY}
            stroke={OUTLINE}
            strokeWidth="3.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}

        {/* suction cups — translucent dark dots so they read on any arm colour */}
        {LEGS.map((_, i) => [0, 1, 2].map(j => (
          <circle
            key={`sk${i}-${j}`}
            data-sucker={i * N_SUCKERS + j}
            r={3.2 - j * 0.6}
            fill="rgba(0,0,0,0.16)"
          />
        )))}

        {/* ── Body ── (fill recoloured at runtime when Occy collects a flag) */}
        <path data-occy-body d={BODY_PATH} fill={BODY} stroke={OUTLINE} strokeWidth="5" strokeLinejoin="round" />

        {/* belly highlight — translucent white so it lightens any body colour */}
        <ellipse cx="100" cy="114" rx="46" ry="32" fill="#ffffff" opacity="0.38" />

        {/* glossy head shines */}
        <ellipse cx="72" cy="48" rx="18" ry="10" fill="white" opacity="0.5"  transform="rotate(-25 72 48)" />
        <ellipse cx="91" cy="42" rx="8"  ry="5"  fill="white" opacity="0.55" transform="rotate(-25 91 42)" />

        {/* eyebrows — short raised arches for a curious look */}
        <path d="M62 60 Q74 53 86 58"  stroke={INK} strokeWidth="3.6" strokeLinecap="round" fill="none" />
        <path d="M114 58 Q126 53 138 60" stroke={INK} strokeWidth="3.6" strokeLinecap="round" fill="none" />

        {/* eyes — large whites with side-glancing pupils */}
        <g className="occy-eye">
          <ellipse cx="77" cy="85" rx="16" ry="19" fill="white" stroke={OUTLINE} strokeWidth="2" />
          <circle  cx="82" cy="90" r="10" fill={INK} />
          <circle  cx="79" cy="85" r="3.2" fill="white" />
        </g>
        <g className="occy-eye">
          <ellipse cx="123" cy="85" rx="16" ry="19" fill="white" stroke={OUTLINE} strokeWidth="2" />
          <circle  cx="128" cy="90" r="10" fill={INK} />
          <circle  cx="125" cy="85" r="3.2" fill="white" />
        </g>

        {/* smile */}
        <path
          d="M89 116 Q100 127 111 116"
          stroke={INK}
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
      </g>
    </svg>
  )
}
