// Occy — kawaii sticker style
// Tentacle paths are bezier curves whose `d` attribute is set every frame
// by Landing.jsx's rAF loop (see TENT_LEN + LEGS exports used there).

const LAVENDER       = '#c4a8f0'
const LAVENDER_LIGHT = '#ddd0fa'
const SUCKER         = '#8f5ec7'
const OUTLINE        = '#1a0a2e'

const BODY_PATH = [
  'M 100 14',
  'C 157 14 178 58 178 90',
  'C 178 130 172 152 160 157',
  'Q 135 163 100 163',
  'Q 65 163 40 157',
  'C 28 152 22 130 22 90',
  'C 22 58 43 14 100 14 Z',
].join(' ')

// Exported so Landing.jsx can compute bezier positions and grab angles
export const TENT_LEN = 85    // SVG units (rendered ≈ 68 px at w-40)
export const N_SUCKERS = 3    // sucker circles per tentacle
export const LEGS = [         // [cx, ttop, spreadDeg]  — 7 tentacles, wide fan
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
      viewBox="-50 0 300 270"
      fill="none"
      role="img"
      aria-label="Occy, a friendly purple octopus"
      xmlns="http://www.w3.org/2000/svg"
    >
      {!hideShadow && (
        <ellipse cx="100" cy="259" rx="52" ry="7" fill="#000" opacity="0.06" className="occy-shadow" />
      )}

      <g className="occy-float">

        {/* ── Tentacles ── drawn before body so body covers their attachment */}

        {/* dark outlines — slightly wider, drawn first (behind) */}
        {LEGS.map((_, i) => (
          <path
            key={`tbo${i}`}
            data-tent-bg={i}
            fill="none"
            stroke={OUTLINE}
            strokeWidth="14"
            strokeLinecap="round"
          />
        ))}

        {/* lavender fill — narrower, drawn on top of outline */}
        {LEGS.map((_, i) => (
          <path
            key={`tbf${i}`}
            data-tent-fg={i}
            fill="none"
            stroke={LAVENDER}
            strokeWidth="10"
            strokeLinecap="round"
          />
        ))}

        {/* suction cups — positioned along bezier by Landing.jsx */}
        {LEGS.map((_, i) => [0, 1, 2].map(j => (
          <circle
            key={`sk${i}-${j}`}
            data-sucker={i * N_SUCKERS + j}
            r={3.0 - j * 0.5}
            fill={SUCKER}
          />
        )))}

        {/* ── Body ── covers tentacle attachment points */}
        <path d={BODY_PATH} fill={LAVENDER} stroke={OUTLINE} strokeWidth="5" strokeLinejoin="round" />

        {/* belly highlight */}
        <ellipse cx="100" cy="112" rx="46" ry="32" fill={LAVENDER_LIGHT} opacity="0.55" />

        {/* head shines */}
        <ellipse cx="73" cy="50" rx="17" ry="10" fill="white" opacity="0.45" transform="rotate(-25 73 50)" />
        <ellipse cx="90" cy="44" rx="8"  ry="5"  fill="white" opacity="0.5"  transform="rotate(-25 90 44)" />

        {/* eyes */}
        <g className="occy-eye">
          <circle cx="77"  cy="82" r="18" fill={OUTLINE} />
          <circle cx="84"  cy="73" r="6"  fill="white"   />
        </g>
        <g className="occy-eye">
          <circle cx="123" cy="82" r="18" fill={OUTLINE} />
          <circle cx="130" cy="73" r="6"  fill="white"   />
        </g>

        {/* smile */}
        <path
          d="M88 107 Q100 120 112 107"
          stroke={OUTLINE}
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
      </g>
    </svg>
  )
}
