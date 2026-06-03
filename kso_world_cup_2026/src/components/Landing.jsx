import { useState, useEffect, useRef } from 'react'
import Octopus, { LEGS as OCCY_LEGS, TENT_LEN, N_SUCKERS } from './Octopus'
import { TEAMS } from '../data/teams'

const WC_START = new Date('2026-06-11T00:00:00+10:00') // AEST

// Layout constants — sync with Octopus viewBox (-50 0 300 270) rendered at 240px.
// The viewBox has 50u of horizontal padding each side so tentacles can fan out
// without being clipped; the body stays the same on-screen size as before.
const SPHERE_R      = 36    // half of 72px flag div
const MIN_STAGE_H   = 440   // floor for very short viewports
const STAGE_MARGIN  = 96    // px reserved below the stage (main's bottom padding) to avoid scroll
const OCCY_W        = 240   // rendered px width (w-[240px])
const OCCY_HW       = 120   // OCCY_W / 2 — element centre = body centre (viewBox symmetric on x=100)
const OCCY_HH       = 119   // (240 × 298/300) / 2 ≈ 119 — element centre
const SVG_SCALE     = 0.8   // 240 / 300
const VIEWBOX_MIN_X = -50   // viewBox x origin
const N_SPHERES     = 8
const GRAB_RANGE    = 90    // px world-space — only a close flag triggers a reach
const GRAB_MAX      = 0.32  // cap so a reaching tentacle still keeps its flowing hang

// Tentacles are verlet chains of CHAIN_N points, rendered as a tapered outline.
const CHAIN_N = 10
const SUCKER_K = [2, 4, 6]   // which chain points carry suction cups
const TENT_BASE_HW = 18      // tentacle half-width at the base (thick, connects to body)
const TENT_TIP_HW = 5        // tentacle half-width at the tip

function daysUntil(date) {
  return Math.ceil((date - new Date()) / (1000 * 60 * 60 * 24))
}

// Top-left keep-out zone — flags must never spawn or settle here. Sized as a
// fraction of the stage (capped) so it stays sensible on narrow/mobile widths.
function cornerKeepout(w, h) {
  return { kw: Math.min(240, w * 0.28), kh: Math.min(190, h * 0.32) }
}
function inCorner(x, y, w, h) {
  const { kw, kh } = cornerKeepout(w, h)
  return x < kw && y < kh
}

function scatterOrbs(w, h, n) {
  const minDist = SPHERE_R * 2.4
  const pad = SPHERE_R + 14
  const pts = []
  let tries = 0
  while (pts.length < n && tries < 600) {
    const x = pad + Math.random() * (w - pad * 2)
    const y = pad + Math.random() * (h - pad * 2)
    tries++
    if (inCorner(x, y, w, h)) continue                      // never spawn in the corner
    if (pts.every(p => Math.hypot(p.x - x, p.y - y) >= minDist)) pts.push({ x, y })
  }
  return pts
}

function FlagSphere({ sphere, elRef }) {
  return (
    <div
      ref={elRef}
      className="flag-sphere"
      style={{ left: 0, top: 0, transform: `translate(${sphere.x - SPHERE_R}px, ${sphere.y - SPHERE_R}px)` }}
      title={sphere.team.name}
    >
      <span style={{ fontSize: 58, lineHeight: 1 }}>{sphere.team.flag}</span>
    </div>
  )
}

// Smooth Catmull-Rom spline through a list of points → SVG path `d` string.
// Lets a tentacle bend multiple times along its length (wiggle), not just once.
function catmullRomPath(pts) {
  if (pts.length < 2) return ''
  let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] || p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
  }
  return d
}

// Build a closed, smooth tapered outline around a centre-line (tentacle): offset
// each node left/right by a half-width that tapers base→tip, then trace a loop
// (left side down, across the tip, right side back up) smoothed as one spline.
function taperedOutline(center, baseHW, tipHW) {
  const n = center.length
  if (n < 2) return ''
  const left = [], right = []
  for (let k = 0; k < n; k++) {
    const prev = center[Math.max(0, k - 1)]
    const next = center[Math.min(n - 1, k + 1)]
    let dx = next.x - prev.x, dy = next.y - prev.y
    const len = Math.hypot(dx, dy) || 1
    dx /= len; dy /= len
    const nx = -dy, ny = dx                 // perpendicular
    const f = k / (n - 1)
    const hw = baseHW + (tipHW - baseHW) * f
    left.push({ x: center[k].x + nx * hw, y: center[k].y + ny * hw })
    right.push({ x: center[k].x - nx * hw, y: center[k].y - ny * hw })
  }
  const loop = [...left, ...right.reverse()]
  return catmullRomPath(loop) + ' Z'
}

// Sample a flag emoji's colours by rendering it to a canvas, then CLUSTER
// similar shades together so a gradient (e.g. several blues) collapses to one
// representative colour per real colour. Returns up to 5 [r,g,b], dominant
// first. Cached per emoji.
const _flagColorCache = {}
const MAX_FLAG_COLORS = 5
function flagColors(emoji) {
  if (_flagColorCache[emoji]) return _flagColorCache[emoji]
  let result = []
  try {
    const size = 40
    const cv = document.createElement('canvas')
    cv.width = size; cv.height = size
    const ctx = cv.getContext('2d', { willReadFrequently: true })
    ctx.clearRect(0, 0, size, size)
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.font = '32px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'
    ctx.fillText(emoji, size / 2, size / 2)
    const data = ctx.getImageData(0, 0, size, size).data

    // fine pixel buckets first
    const raw = {}
    for (let p = 0; p < data.length; p += 4) {
      if (data[p + 3] < 200) continue
      const qr = Math.round(data[p] / 16) * 16
      const qg = Math.round(data[p + 1] / 16) * 16
      const qb = Math.round(data[p + 2] / 16) * 16
      const key = `${qr},${qg},${qb}`
      raw[key] = (raw[key] || 0) + 1
    }
    const sorted = Object.entries(raw)
      .map(([k, c]) => ({ col: k.split(',').map(Number), c }))
      .sort((a, b) => b.c - a.c)

    // greedily merge shades within DIST of an existing cluster → one per colour
    // (threshold tuned so gradient/anti-alias blends collapse — e.g. Australia's
    // navy + lighter-blue edges become a single blue — without merging red/white)
    const DIST2 = 125 * 125
    const clusters = []
    for (const { col, c } of sorted) {
      let merged = false
      for (const cl of clusters) {
        const dr = cl.col[0] - col[0], dg = cl.col[1] - col[1], db = cl.col[2] - col[2]
        if (dr * dr + dg * dg + db * db < DIST2) { cl.count += c; merged = true; break }
      }
      if (!merged) clusters.push({ col, count: c })   // representative = most frequent shade
    }
    clusters.sort((a, b) => b.count - a.count)
    const total = clusters.reduce((s, cl) => s + cl.count, 0) || 1
    // drop minor clusters (stray outline / anti-alias blend pixels), keep top 5
    result = clusters.filter(cl => cl.count > total * 0.06).slice(0, MAX_FLAG_COLORS).map(cl => cl.col)
    if (!result.length && clusters.length) result = [clusters[0].col]
  } catch { result = [] }
  _flagColorCache[emoji] = result
  return result
}

const clamp255 = (v) => Math.max(0, Math.min(255, v))
const rgbStr = (c) => `rgb(${clamp255(c[0])},${clamp255(c[1])},${clamp255(c[2])})`

// Recolour Occy from a flag's palette: dominant colour → head, the flag's other
// colours (max 4) distributed across the tentacles — ≤5 distinct colours total.
function applyFlagColors(root, emoji) {
  if (!root) return
  const cols = flagColors(emoji)
  if (!cols.length) return
  const head = cols[0]                                  // dominant → head
  const arms = cols.length > 1 ? cols.slice(1) : [head] // other colours → tentacles
  root.querySelector('[data-occy-body]')?.setAttribute('fill', rgbStr(head))
  root.querySelectorAll('[data-tent]').forEach((el, idx) => {
    el.setAttribute('fill', rgbStr(arms[idx % arms.length]))
  })
}

export default function Landing() {
  const days = daysUntil(WC_START)
  const heroText = days > 1
    ? `The world cup starts in ${days} days`
    : days === 1 ? 'The world cup starts tomorrow'
    : days === 0 ? 'The world cup starts today'
    : 'The world cup is underway'

  const heroRef    = useRef(null)
  const occyRef    = useRef(null)
  const textRef    = useRef(null)
  const orbRefs    = useRef([])
  const tentElsRef = useRef(null)   // { bg[], fg[], sk[] } — cached after first tick

  const [orbs, setOrbs] = useState([])
  const [stageH, setStageH] = useState(560)

  // Measure the available height so the stage fills the viewport (flags roam
  // the whole page), then scatter the orbs across that full area — once.
  useEffect(() => {
    if (!heroRef.current) return
    const top = heroRef.current.getBoundingClientRect().top
    const h = Math.max(MIN_STAGE_H, Math.round(window.innerHeight - top - STAGE_MARGIN))
    setStageH(h)
    const w = heroRef.current.offsetWidth
    const pts = scatterOrbs(w, h, N_SPHERES)
    const shuffled = [...TEAMS].sort(() => Math.random() - 0.5)
    setOrbs(pts.map((p, i) => ({ ...p, team: shuffled[i] })))
  }, [])

  useEffect(() => {
    if (!orbs.length || !occyRef.current) return

    // Live stage dimensions — flags + Occy roam this whole area.
    // `let` (not const) so a resize handler can keep them current; otherwise the
    // physics bounds/targets go stale on resize and flags get trapped in the
    // old region (looked like flags "stuck in a corner").
    let w = heroRef.current?.offsetWidth  ?? 800
    let h = heroRef.current?.offsetHeight ?? stageH

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      occyRef.current.style.transform =
        `translate(${w / 2 - OCCY_HW}px, ${h * 0.3 - OCCY_HH}px)`
      // Static pose: tentacles hang straight, drawn as tapered outlines
      const segLen = TENT_LEN / (CHAIN_N - 1)
      OCCY_LEGS.forEach(([cx, ttop], i) => {
        const center = Array.from({ length: CHAIN_N }, (_, k) => {
          const f = k / (CHAIN_N - 1)
          const fan = ((cx - 100) / 60) * TENT_LEN * 0.25 * f
          return { x: cx + fan, y: ttop + segLen * k }
        })
        occyRef.current.querySelector(`[data-tent="${i}"]`)
          ?.setAttribute('d', taperedOutline(center, TENT_BASE_HW, TENT_TIP_HW))
        SUCKER_K.forEach((k, j) => {
          const el = occyRef.current.querySelector(`[data-sucker="${i * N_SUCKERS + j}"]`)
          if (el && center[k]) { el.setAttribute('cx', center[k].x.toFixed(1)); el.setAttribute('cy', center[k].y.toFixed(1)) }
        })
      })
      if (heroRef.current) heroRef.current.style.opacity = '1'
      return
    }

    // ── Orb physics ──────────────────────────────────────────────────────
    const orbStates = orbs.map(o => ({
      pos: { x: o.x, y: o.y },
      vel: { x: (Math.random() - 0.5) * 0.8, y: (Math.random() - 0.5) * 0.8 },
      target: { x: o.x, y: o.y },
      timer: Math.random() * 4000,
      duration: 3000 + Math.random() * 5000,
    }))
    // Which team each flag currently shows (mutated imperatively on collect, so
    // we never re-render React / restart the sim). Used to avoid duplicates.
    const liveTeams = orbs.map(o => o.team)

    // Uniform random target across the WHOLE stage, except the top-left
    // keep-out zone (re-roll if it lands there) — so flags never aim into the
    // corner. Every point is in-bounds, so coverage is otherwise even.
    function pickOrbTarget() {
      const pad = SPHERE_R + 18
      let x, y, t = 0
      do {
        x = pad + Math.random() * (w - pad * 2)
        y = pad + Math.random() * (h - pad * 2)
      } while (inCorner(x, y, w, h) && ++t < 12)
      return { x, y }
    }

    // ── Per-tentacle "personality" — random once, so no two move alike ───
    const tentParams = OCCY_LEGS.map(() => ({
      // Slower, looser, more varied: lower time-scale + frequencies for a
      // relaxed drift; wider amplitude variance for bigger, more random sway.
       spd: 0.35 + Math.random() * 0.70,     // overall time-scale (slower than before)
      f1:  0.55 + Math.random() * 1.55,      // primary freq (rad/s) — scaled down
      f1b: 0.22 + Math.random() * 0.75,      // slow secondary freq
      f2:  0.55 + Math.random() * 1.70,
      f2b: 0.20 + Math.random() * 0.80,
      f3:  0.62 + Math.random() * 1.85,
      f3b: 0.22 + Math.random() * 0.85,
      ph1: Math.random() * Math.PI * 2,      // random starting phases
      ph2: Math.random() * Math.PI * 2,
      ph3: Math.random() * Math.PI * 2,
      a1:  0.50 + Math.random() * 1.05,      // per-tentacle amplitude scale (bigger + wider)
      a2:  0.60 + Math.random() * 1.15,
      a3:  0.70 + Math.random() * 1.10,
      curl: (Math.random() - 0.5) * 0.75,    // looser constant curl bias
      driftF: 0.12 + Math.random() * 0.40,   // slower idle drift
      driftPh: Math.random() * Math.PI * 2,
    }))

    // ── Verlet chains — one per tentacle, simulated in SVG-local space ───
    // Point 0 is pinned at the attachment; the rest hang and flop. restLen keeps
    // segments rigid-ish; gravity/idle/inertia/grab forces drive the motion.
    const segLen = TENT_LEN / (CHAIN_N - 1)
    const tentChains = OCCY_LEGS.map(([cx, ttop]) => {
      const chain = []
      for (let k = 0; k < CHAIN_N; k++) {
        const x = cx, y = ttop + segLen * k   // start hanging straight down
        chain.push({ x, y, px: x, py: y })
      }
      return chain
    })

    // ── Occy physics ─────────────────────────────────────────────────────
    const oPos = { x: w / 2, y: h * 0.30 }
    const oVel = { x: (Math.random() - 0.5) * 3, y: (Math.random() - 0.5) * 3 }
    let oTarget       = { ...oPos }
    let oTargetTimer  = 0
    let oTargetDur    = 1500
    let oMood         = 0.6                       // eased current energy
    let oMoodTarget   = 0.6                       // mood eases toward this
    let oMoodTimer    = 0
    let oMoodInterval = 1500 + Math.random() * 2500
    let oLean         = 0
    let wanderAngle   = Math.random() * Math.PI * 2  // smooth meander direction
    let breathPhase   = Math.random() * Math.PI * 2  // subtle speed oscillation

    function pickOccyTarget() {
      const pad = OCCY_HW + 16
      if (Math.random() < 0.65 && orbStates.length > 0) {
        const s = orbStates[Math.floor(Math.random() * orbStates.length)]
        if (Math.random() < 0.28) {
          const frac = 0.25 + Math.random() * 0.40
          oTarget = {
            x: oPos.x + (s.pos.x - oPos.x) * frac,
            y: oPos.y + (s.pos.y - oPos.y) * frac,
          }
        } else {
          oTarget = {
            x: s.pos.x + (Math.random() - 0.5) * 24,
            y: s.pos.y + (Math.random() - 0.5) * 24,
          }
        }
      } else {
        oTarget = {
          x: pad + Math.random() * (w - pad * 2),
          y: pad + Math.random() * (h - pad * 2),
        }
      }
      oTargetDur   = 900 + Math.random() * 2200
      oTargetTimer = 0
    }

    // Keep the stage height and physics bounds in sync with the viewport so
    // flags/Occy always use the whole CURRENT page (the per-frame clamp below
    // then pulls any out-of-bounds orb back in). Imperative (no React state) to
    // avoid a re-render that would re-hide the stage.
    function syncSize() {
      if (!heroRef.current) return
      const top = heroRef.current.getBoundingClientRect().top
      const nh = Math.max(MIN_STAGE_H, Math.round(window.innerHeight - top - STAGE_MARGIN))
      heroRef.current.style.height = nh + 'px'
      w = heroRef.current.offsetWidth
      h = nh
    }
    window.addEventListener('resize', syncSize)

    let lastTime = performance.now()
    let rafId
    let revealed = false

    function tick(now) {
      const dt = Math.min(now - lastTime, 50)
      lastTime = now

      // ── Orbs ──────────────────────────────────────────────────────────
      // Separation pass: push any overlapping pair apart so flags don't clump
      // together (the "stuck in a pile" look).
      const SEP = SPHERE_R * 2.3
      for (let a = 0; a < orbStates.length; a++) {
        for (let c = a + 1; c < orbStates.length; c++) {
          const A = orbStates[a], B = orbStates[c]
          const dx = B.pos.x - A.pos.x, dy = B.pos.y - A.pos.y
          const dd = Math.hypot(dx, dy) || 0.01
          if (dd < SEP) {
            const nx = dx / dd, ny = dy / dd
            const overlap = (SEP - dd)
            const push = overlap / SEP * 1.1
            A.vel.x -= nx * push; A.vel.y -= ny * push
            B.vel.x += nx * push; B.vel.y += ny * push
            // also nudge positions apart so heavy overlaps resolve immediately
            const corr = overlap * 0.15
            A.pos.x -= nx * corr; A.pos.y -= ny * corr
            B.pos.x += nx * corr; B.pos.y += ny * corr
          }
        }
      }

      orbStates.forEach((state, i) => {
        state.timer += dt
        if (state.timer > state.duration || Math.hypot(state.target.x - state.pos.x, state.target.y - state.pos.y) < 8) {
          state.target = pickOrbTarget(); state.duration = 3000 + Math.random() * 5000; state.timer = 0
        }
        state.vel.x += (state.target.x - state.pos.x) * 0.0014 + (Math.random() - 0.5) * 0.18
        state.vel.y += (state.target.y - state.pos.y) * 0.0014 + (Math.random() - 0.5) * 0.18
        state.vel.x *= 0.966; state.vel.y *= 0.966
        const spd = Math.hypot(state.vel.x, state.vel.y), cap = 1.6 * (dt / 16.67)
        if (spd > cap) { state.vel.x = state.vel.x / spd * cap; state.vel.y = state.vel.y / spd * cap }
        state.pos.x += state.vel.x; state.pos.y += state.vel.y
        // Guard: a non-finite position would yield an invalid transform and
        // snap the flag to the stage's top-left origin.
        if (!Number.isFinite(state.pos.x)) { state.pos.x = w / 2; state.vel.x = 0 }
        if (!Number.isFinite(state.pos.y)) { state.pos.y = h / 2; state.vel.y = 0 }
        // Keep-out: the top-left corner is a hard wall. If an orb crosses into
        // it, clamp it back to the nearest face of the zone and kill the inward
        // velocity — so a flag physically can't enter or linger there.
        const { kw, kh } = cornerKeepout(w, h)
        if (state.pos.x < kw && state.pos.y < kh) {
          if ((kw - state.pos.x) <= (kh - state.pos.y)) {
            state.pos.x = kw                                 // blocked by right face
            if (state.vel.x < 0) state.vel.x = 0
          } else {
            state.pos.y = kh                                 // blocked by bottom face
            if (state.vel.y < 0) state.vel.y = 0
          }
        }
        const bp = SPHERE_R + 12
        if (state.pos.x < bp)          state.vel.x += (bp - state.pos.x) * 0.14
        if (state.pos.x > w - bp)      state.vel.x -= (state.pos.x - (w - bp)) * 0.14
        if (state.pos.y < bp)          state.vel.y += (bp - state.pos.y) * 0.14
        if (state.pos.y > h - bp) state.vel.y -= (state.pos.y - (h - bp)) * 0.14
        state.pos.x = Math.max(bp, Math.min(w - bp, state.pos.x))
        state.pos.y = Math.max(bp, Math.min(h - bp, state.pos.y))
        const el = orbRefs.current[i]
        if (el) el.style.transform = `translate(${state.pos.x - SPHERE_R}px, ${state.pos.y - SPHERE_R}px)`
      })

      // ── Occy ──────────────────────────────────────────────────────────
      const dtN = dt / 16.67   // frames elapsed (≈1 at 60fps)

      // Mood: pick a new *target* energy periodically, ease toward it smoothly
      oMoodTimer += dt
      if (oMoodTimer > oMoodInterval) {
        oMoodTarget = 0.05 + Math.random() * 0.95
        oMoodTimer = 0
        oMoodInterval = 1200 + Math.random() * 3000
        pickOccyTarget()
      }
      oMood += (oMoodTarget - oMood) * 0.02 * dtN   // smooth energy transitions

      oTargetTimer += dt
      if (oTargetTimer > oTargetDur || Math.hypot(oTarget.x - oPos.x, oTarget.y - oPos.y) < 12) pickOccyTarget()

      // Spring pull toward target (no white noise — steering is smooth)
      const stiff = 0.004 + oMood * 0.014
      oVel.x += (oTarget.x - oPos.x) * stiff
      oVel.y += (oTarget.y - oPos.y) * stiff

      // Smooth wander: the meander direction drifts gradually, so the added
      // force curves organically instead of jittering frame-to-frame.
      wanderAngle += (Math.random() - 0.5) * 0.35 * dtN
      const wanderForce = (0.45 + oMood * 0.7) * dtN
      oVel.x += Math.cos(wanderAngle) * wanderForce
      oVel.y += Math.sin(wanderAngle) * wanderForce

      const damp = 0.86 + (1 - oMood) * 0.08
      oVel.x *= damp; oVel.y *= damp

      // "Breathing": speed cap gently oscillates so velocity is never constant
      breathPhase += 0.9 * (dt / 1000)
      const breath = 1 + Math.sin(breathPhase) * 0.18
      const maxSpd = (2.5 + oMood * 7.0) * breath * dtN
      const oSpd = Math.hypot(oVel.x, oVel.y)
      if (oSpd > maxSpd) { oVel.x = oVel.x / oSpd * maxSpd; oVel.y = oVel.y / oSpd * maxSpd }
      oPos.x += oVel.x; oPos.y += oVel.y
      if (!Number.isFinite(oPos.x)) { oPos.x = w / 2; oVel.x = 0 }
      if (!Number.isFinite(oPos.y)) { oPos.y = h / 2; oVel.y = 0 }

      const bL = OCCY_HW + 14, bR = w - OCCY_HW - 14
      const bT = OCCY_HH + 14, bB = h - 14
      if (oPos.x < bL) { oVel.x += (bL - oPos.x) * 0.22; oPos.x = Math.max(oPos.x, bL) }
      if (oPos.x > bR) { oVel.x -= (oPos.x - bR) * 0.22; oPos.x = Math.min(oPos.x, bR) }
      if (oPos.y < bT) { oVel.y += (bT - oPos.y) * 0.22; oPos.y = Math.max(oPos.y, bT) }
      if (oPos.y > bB) { oVel.y -= (oPos.y - bB) * 0.22; oPos.y = Math.min(oPos.y, bB) }

      const leanTarget = Math.max(-38, Math.min(38, oVel.x * 6.5))
      oLean += (leanTarget - oLean) * 0.11

      if (occyRef.current) {
        occyRef.current.style.transform =
          `translate(${oPos.x - OCCY_HW}px, ${oPos.y - OCCY_HH}px) rotate(${oLean}deg)`
      }

      // ── Tentacle bezier animation ──────────────────────────────────────
      // Cache DOM refs once
      if (!tentElsRef.current) {
        const root = occyRef.current
        if (root) {
          tentElsRef.current = {
            tent: Array.from(root.querySelectorAll('[data-tent]')),
            sk: Array.from(root.querySelectorAll('[data-sucker]')),
          }
        }
      }

      const tSec = now / 1000  // seconds since page load
      const leanRad = oLean * Math.PI / 180

      OCCY_LEGS.forEach(([cx, ttop], i) => {
        const te = tentElsRef.current
        if (!te) return
        const tentEl = te.tent[i]
        if (!tentEl) return

        const p = tentParams[i]
        const ts = tSec * p.spd
        const chain = tentChains[i]
        const fanDir = (cx - 100) / 60

        // Local-space force directions (Occy's wrapper is rotated by `lean`)
        const cosL = Math.cos(-leanRad), sinL = Math.sin(-leanRad)  // for grab transform
        const gy = 0.20 * dtN                    // gentle droop on top of the rest pose
        // Splayed rest direction: outer arms fan outward, centre points straight
        // down — arms radiate from the mantle like an octopus.
        const restAngle = fanDir * 0.70
        const dirX = Math.sin(restAngle), dirY = Math.cos(restAngle)
        const perpX = -dirY, perpY = dirX        // perpendicular = wave direction
        // Travelling wave that flows evenly down the whole arm (desynced per arm)
        const waveSpeed = 2.0, waveLen = 1.25, waveAmp = 11
        const curlDir = Math.sign(p.curl) || 1

        // ── Grab: nearest flag → its position in Occy-local coords ──
        const awx = (oPos.x - OCCY_HW) + (cx - VIEWBOX_MIN_X) * SVG_SCALE
        const awy = (oPos.y - OCCY_HH) + ttop * SVG_SCALE
        let tNearD = Infinity, tNearPos = null
        orbStates.forEach(s => {
          const d = Math.hypot(s.pos.x - awx, s.pos.y - awy)
          if (d < tNearD) { tNearD = d; tNearPos = s.pos }
        })
        let grabInfl = 0, gtx = 0, gty = 0
        if (tNearPos && tNearD < GRAB_RANGE) {
          const relX = tNearPos.x - oPos.x, relY = tNearPos.y - oPos.y
          gtx = (relX * cosL - relY * sinL + OCCY_HW) / SVG_SCALE + VIEWBOX_MIN_X
          gty = (relX * sinL + relY * cosL + OCCY_HH) / SVG_SCALE
          grabInfl = Math.pow(Math.max(0, 1 - tNearD / GRAB_RANGE), 1.6) * GRAB_MAX
        }

        const MAX_MOVE = 7
        const REST_K = 0.10   // how firmly the arm follows its (waving) rest pose

        // ── Verlet integration of the free points ──
        for (let k = 1; k < CHAIN_N; k++) {
          const pt = chain[k]
          const f = k / (CHAIN_N - 1)
          // travelling wave offset perpendicular to the arm; even envelope ramps
          // in near the base then stays full, so the whole arm undulates.
          const env = Math.min(1, f / 0.18)
          const wob = Math.sin(ts * waveSpeed + p.ph1 - f * Math.PI * 2 * waveLen) * waveAmp * env
          const restX = cx + dirX * segLen * k + perpX * wob
          const restY = ttop + dirY * segLen * k + perpY * wob
          const vx = (pt.x - pt.px) * 0.85
          const vy = (pt.y - pt.py) * 0.85
          pt.px = pt.x; pt.py = pt.y
          pt.x += vx + (restX - pt.x) * REST_K * dtN
          pt.y += vy + (restY - pt.y) * REST_K * dtN + gy
          if (k >= CHAIN_N - 3) pt.x += curlDir * Math.abs(p.curl) * 0.6 * dtN  // tip curl
          // cap per-frame displacement for stability
          const mvx = pt.x - pt.px, mvy = pt.y - pt.py
          const mv = Math.hypot(mvx, mvy)
          if (mv > MAX_MOVE) { pt.x = pt.px + mvx / mv * MAX_MOVE; pt.y = pt.py + mvy / mv * MAX_MOVE }
        }

        // ── Constraints: pin the base, keep segment lengths (relax) ──
        for (let iter = 0; iter < 4; iter++) {
          chain[0].x = cx; chain[0].y = ttop
          for (let k = 0; k < CHAIN_N - 1; k++) {
            const a = chain[k], b = chain[k + 1]
            const dx = b.x - a.x, dy = b.y - a.y
            const dist = Math.hypot(dx, dy) || 0.001
            const diff = (dist - segLen) / dist
            if (k === 0) { b.x -= dx * diff; b.y -= dy * diff }   // a is pinned
            else {
              const mx = dx * 0.5 * diff, my = dy * 0.5 * diff
              a.x += mx; a.y += my; b.x -= mx; b.y -= my
            }
          }
        }

        // ── Bending stiffness: nudge each point toward the straight
        // continuation of the previous segment. Resists sharp folds (keeps a
        // graceful curve) without making the tentacle rigid. Light factor. ──
        for (let k = 2; k < CHAIN_N; k++) {
          const a = chain[k - 2], bb = chain[k - 1], c = chain[k]
          const tx = bb.x + (bb.x - a.x), ty = bb.y + (bb.y - a.y)
          c.x += (tx - c.x) * 0.06
          c.y += (ty - c.y) * 0.06
        }

        // ── Grab pull on the lower points (after constraints) ──
        if (grabInfl > 0) {
          for (let k = CHAIN_N - 4; k < CHAIN_N; k++) {
            if (k < 1) continue
            const f = k / (CHAIN_N - 1)
            const t = grabInfl * f * 0.18
            chain[k].x += (gtx - chain[k].x) * t
            chain[k].y += (gty - chain[k].y) * t
          }
        }

        tentEl.setAttribute('d', taperedOutline(chain, TENT_BASE_HW, TENT_TIP_HW))

        SUCKER_K.forEach((k, j) => {
          const el = te.sk[i * N_SUCKERS + j]
          if (!el || !chain[k]) return
          el.setAttribute('cx', chain[k].x.toFixed(1))
          el.setAttribute('cy', chain[k].y.toFixed(1))
        })
      })

      // Collect on contact: Occy touches a flag → it poofs away and a NEW
      // random team (not already on screen) reappears at a fresh location.
      orbStates.forEach((state, i) => {
        const el = orbRefs.current[i]
        if (!el || el.dataset.poofing === '1') return
        const d = Math.hypot(state.pos.x - oPos.x, state.pos.y - oPos.y)
        if (d >= SPHERE_R + 48) return

        applyFlagColors(occyRef.current, liveTeams[i].flag)  // Occy adopts the collected flag's colours
        el.dataset.poofing = '1'
        el.style.opacity = '0'                       // vanish instantly
        setTimeout(() => {
          // pick a team not currently shown on any flag
          const used = new Set(liveTeams.map(t => t.id))
          const choices = TEAMS.filter(t => !used.has(t.id))
          const next = choices.length ? choices[Math.floor(Math.random() * choices.length)] : liveTeams[i]
          liveTeams[i] = next
          const span = el.querySelector('span')
          if (span) span.textContent = next.flag
          el.title = next.name

          // respawn at a fresh spot: in-bounds, out of the corner, away from Occy
          const pad = SPHERE_R + 18
          let nx, ny, tries = 0
          do {
            nx = pad + Math.random() * (w - pad * 2)
            ny = pad + Math.random() * (h - pad * 2)
          } while ((inCorner(nx, ny, w, h) || Math.hypot(nx - oPos.x, ny - oPos.y) < 240) && ++tries < 40)

          state.pos.x = nx; state.pos.y = ny
          state.vel.x = (Math.random() - 0.5) * 0.6
          state.vel.y = (Math.random() - 0.5) * 0.6
          state.target = { x: nx, y: ny }
          state.timer = 0
          el.style.transform = `translate(${nx - SPHERE_R}px, ${ny - SPHERE_R}px)`
          el.style.opacity = '1'                      // reappear at the new spot
          el.dataset.near = ''
          delete el.dataset.poofing
        }, 200)
      })

      // Everything is now positioned for this frame — reveal the stage once.
      if (!revealed) {
        revealed = true
        if (heroRef.current) heroRef.current.style.opacity = '1'
      }

      rafId = requestAnimationFrame(tick)
    }

    pickOccyTarget()
    rafId = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', syncSize)
      tentElsRef.current = null
    }
  }, [orbs])

  return (
    <div
      ref={heroRef}
      className="occy-stage w-full"
      // Hidden until the animation positions everything on its first frame, so
      // nothing is ever seen sitting at the stage's top-left default origin.
      style={{ height: stageH, opacity: 0, transition: 'opacity 0.35s ease' }}
    >
      {orbs.map((orb, i) => (
        <FlagSphere key={i} sphere={orb} elRef={el => { orbRefs.current[i] = el }} />
      ))}

      <div ref={occyRef} style={{ position: 'absolute', top: 0, left: 0, zIndex: 3 }}>
        <Octopus hideShadow className="w-[240px] h-auto" />
      </div>

      <h1
        ref={textRef}
        className="text-[40px] sm:text-[56px] lg:text-[72px] font-semibold leading-none"
        style={{ position: 'absolute', bottom: 32, left: 0, right: 0, textAlign: 'center', letterSpacing: '-2.88px', zIndex: 2 }}
      >
        {heroText}
      </h1>
    </div>
  )
}
