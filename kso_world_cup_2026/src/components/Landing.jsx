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
const OCCY_HH       = 108   // (240 × 270/300) / 2 = 108 — element centre
const SVG_SCALE     = 0.8   // 240 / 300
const VIEWBOX_MIN_X = -50   // viewBox x origin
const N_SPHERES     = 8
const GRAB_RANGE    = 125   // px world-space — only a close flag triggers a reach
const GRAB_MAX      = 0.6   // cap so a reaching tentacle still keeps its flowing hang

// Tentacles are splines through TSEG+1 points down their length — more points
// let the line itself undulate (wiggle) rather than make a single S-bend.
const TSEG = 8
const SUCKER_K = [2, 4, 6]   // which spline points carry suction cups

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
      // Draw straight tentacles for static view
      OCCY_LEGS.forEach(([cx, ttop], i) => {
        const d = `M${cx} ${ttop} L${cx} ${ttop + TENT_LEN}`
        occyRef.current.querySelector(`[data-tent-bg="${i}"]`)?.setAttribute('d', d)
        occyRef.current.querySelector(`[data-tent-fg="${i}"]`)?.setAttribute('d', d)
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
            bg: Array.from(root.querySelectorAll('[data-tent-bg]')),
            fg: Array.from(root.querySelectorAll('[data-tent-fg]')),
            sk: Array.from(root.querySelectorAll('[data-sucker]')),
          }
        }
      }

      const tSec = now / 1000  // seconds since page load
      const leanRad = oLean * Math.PI / 180

      OCCY_LEGS.forEach(([cx, ttop], i) => {
        const te = tentElsRef.current
        if (!te) return
        const bgEl = te.bg[i], fgEl = te.fg[i]
        if (!bgEl || !fgEl) return

        const ax = cx, ay = ttop
        const p = tentParams[i]
        const ts = tSec * p.spd   // per-tentacle clock — desyncs the whole motion

        // Fan + curl shape the resting hang; idle drift sways the whole arm.
        const fanDir      = (cx - 100) / 60
        const idleDrift   = Math.sin(ts * p.driftF + p.driftPh) * TENT_LEN * 0.10
        const restLateral = fanDir * TENT_LEN * 0.52 + idleDrift
        const curlX       = p.curl * 16

        // Travelling-wave parameters — vary per tentacle so none move alike.
        const waveAmp   = 13 * p.a2                // wiggle radius (wider)
        const waveLen   = 0.85 + (p.a2 - 0.6) * 0.5 // fewer, broader bends → smoother curves
        const waveSpeed = 2.4
        const ampPulse  = 0.75 + 0.25 * Math.sin(ts * p.f1b + p.ph2)  // slow breathing of the wiggle

        // ── Grab setup: find nearest flag, derive a reach direction in SVG space
        const awx = (oPos.x - OCCY_HW) + (cx - VIEWBOX_MIN_X) * SVG_SCALE
        const awy = (oPos.y - OCCY_HH) + ttop * SVG_SCALE
        let tNearD = Infinity, tNearPos = null
        orbStates.forEach(s => {
          const d = Math.hypot(s.pos.x - awx, s.pos.y - awy)
          if (d < tNearD) { tNearD = d; tNearPos = s.pos }
        })
        let grabInfl = 0, gnx = 0, gny = 1, glen = TENT_LEN
        if (tNearPos && tNearD < GRAB_RANGE) {
          const relX = tNearPos.x - oPos.x
          const relY = tNearPos.y - oPos.y
          const cos = Math.cos(-leanRad), sin = Math.sin(-leanRad)
          const svgFx = (relX * cos - relY * sin + OCCY_HW) / SVG_SCALE + VIEWBOX_MIN_X
          const svgFy = (relX * sin + relY * cos + OCCY_HH) / SVG_SCALE
          const fdx = svgFx - ax, fdy = svgFy - ay
          const fd  = Math.hypot(fdx, fdy)
          if (fd > 0) {
            grabInfl = Math.pow(Math.max(0, 1 - tNearD / GRAB_RANGE), 1.6) * GRAB_MAX
            gnx = fdx / fd; gny = fdy / fd
            glen = Math.min(TENT_LEN, fd)
          }
        }

        // ── Build points down the tentacle, each riding the travelling wave ──
        const pts = []
        for (let k = 0; k <= TSEG; k++) {
          const f = k / TSEG                       // 0 at base … 1 at tip
          // natural hanging position (fan + curl grow toward the tip)
          let x = ax + restLateral * f + curlX * f
          let y = ay + TENT_LEN * f
          // travelling wiggle: phase shifts along the length → bends that drift
          // downward over time. Amplitude ramps up quickly just below the base
          // (smoothstep) then stays full the rest of the way, so the WHOLE leg
          // wiggles — not just the tip — while the base stays anchored.
          const phase = ts * waveSpeed + p.ph1 - f * Math.PI * 2 * waveLen
          const ramp  = Math.min(1, f / 0.18)
          const env   = ramp * ramp * (3 - 2 * ramp)   // smoothstep
          const amp   = waveAmp * env * ampPulse
          x += Math.sin(phase) * amp + Math.sin(phase * 1.6 + p.ph3) * amp * 0.22
          // grab: blend the lower portion toward the flag (more pull near the tip)
          if (grabInfl > 0) {
            const t = grabInfl * f
            x = x * (1 - t) + (ax + gnx * glen * f) * t
            y = y * (1 - t) + (ay + gny * glen * f) * t
          }
          pts.push({ x, y })
        }

        const d = catmullRomPath(pts)
        bgEl.setAttribute('d', d)
        fgEl.setAttribute('d', d)

        // Suction cups sit on chosen spline points
        SUCKER_K.forEach((k, j) => {
          const el = te.sk[i * N_SUCKERS + j]
          if (!el || !pts[k]) return
          el.setAttribute('cx', pts[k].x.toFixed(1))
          el.setAttribute('cy', pts[k].y.toFixed(1))
        })
      })

      // Sphere squash on proximity
      orbStates.forEach((state, i) => {
        const el = orbRefs.current[i]
        if (!el) return
        if (Math.hypot(state.pos.x - oPos.x, state.pos.y - oPos.y) < SPHERE_R + 60 && !el.dataset.sq) {
          el.dataset.sq = '1'
          el.classList.add('flag-sphere--squash')
          setTimeout(() => { el.classList.remove('flag-sphere--squash'); delete el.dataset.sq }, 480)
        }
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
        style={{ position: 'absolute', bottom: 32, left: 0, letterSpacing: '-2.88px', zIndex: 2 }}
      >
        {heroText}
      </h1>
    </div>
  )
}
