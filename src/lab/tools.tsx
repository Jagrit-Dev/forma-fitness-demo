import { useEffect, useMemo, useRef, useState } from 'react'
import { hrZones, loadBar, oneRepMax, pctOf1RM, repTable } from '../lib/fitness'
import { Count, Segmented, Slider } from '../components/ui'
import { setBody } from '../lib/store'
import { ZONES } from '../scene/bodyGeometry'

/* ───────────── 02 · Bar Loader ───────────── */

export function BarLoader({ onLoad }: { onLoad: (kg: number) => void }) {
  const [weight, setWeight] = useState(100)
  const [reps, setReps] = useState(5)
  const [pct, setPct] = useState(100)
  const max = oneRepMax(weight, reps)
  const working = Math.max(20, Math.round((max * pct) / 100 / 2.5) * 2.5)
  const perSide = loadBar(working)

  useEffect(() => onLoad(working), [working, onLoad])

  return (
    <div className="tool">
      <ToolHead n="02" title="Bar Loader" lede="Turn any set into an estimated one-rep max, then see exactly what goes on the bar." />
      <Slider label="Weight lifted" value={weight} min={20} max={300} step={2.5} unit="kg" onChange={setWeight} format={(v) => v.toFixed(1)} />
      <Slider label="Reps completed" value={reps} min={1} max={12} unit="reps" onChange={setReps} />

      <div className="big-out">
        <span className="mono readout__k">Estimated 1RM</span>
        <span className="readout__v accent">
          <Count value={max} decimals={1} />
          <small>kg</small>
        </span>
      </div>

      <div className="field">
        <span className="field__label">Load the bar at</span>
        <Segmented
          label="Percentage of 1RM"
          value={String(pct)}
          onChange={(v) => setPct(Number(v))}
          options={[60, 70, 80, 90, 100].map((p) => ({ id: String(p), label: `${p}%` }))}
        />
      </div>

      <div className="bar-sum">
        <div>
          <span className="mono readout__k">On the bar</span>
          <b>
            <Count value={working} decimals={working % 1 ? 1 : 0} /> kg
          </b>
        </div>
        <div className="bar-sum__plates" aria-label="Plates per side">
          <span className="mono readout__k">Per side</span>
          <span className="chips">
            {perSide.length === 0 && <em>Empty bar</em>}
            {perSide.map((p, i) => (
              <i key={i} style={{ background: p.color, color: p.kg === 2.5 ? '#fff' : '#08090a' }}>
                {p.kg}
              </i>
            ))}
          </span>
        </div>
      </div>

      <table className="rep-table">
        <thead>
          <tr>
            <th>Reps</th>
            <th>% 1RM</th>
            <th>Load</th>
          </tr>
        </thead>
        <tbody>
          {repTable.map((r) => (
            <tr key={r} className={r === reps ? 'on' : ''}>
              <td>{r}</td>
              <td>{Math.round(pctOf1RM(r) * 100)}%</td>
              <td>{(Math.round((max * pctOf1RM(r)) / 2.5) * 2.5).toFixed(1)} kg</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="fineprint">Average of the Epley and Brzycki formulas, most reliable under 10 reps. Assumes a 20 kg bar and no collars.</p>
    </div>
  )
}

/* ───────────── 03 · Pulse Zones ───────────── */

export const zoneColors = ['#5ad1ff', '#2fbf71', '#d4ff3a', '#ffb03a', '#ff4d4d']

export function PulseZones({ onBeat }: { onBeat: (bpm: number, color: string) => void }) {
  const [age, setAge] = useState(29)
  const [rest, setRest] = useState(58)
  const [zone, setZone] = useState(1)
  const z = useMemo(() => hrZones(age, rest), [age, rest])
  const active = z.zones[zone]
  const bpm = Math.round((active.lo + active.hi) / 2)

  useEffect(() => onBeat(bpm, zoneColors[zone]), [bpm, zone, onBeat])

  return (
    <div className="tool">
      <ToolHead n="03" title="Pulse Zones" lede="Karvonen heart-rate zones from your age and resting pulse. Pick a zone and the heart beats at that rate." />
      <Slider label="Age" value={age} min={16} max={80} unit="yrs" onChange={setAge} />
      <Slider label="Resting heart rate" value={rest} min={38} max={90} unit="bpm" onChange={setRest} />

      <div className="monitor">
        <div className="monitor__top">
          <span className="mono readout__k">Max HR · {z.max} bpm</span>
          <span className="mono" style={{ color: zoneColors[zone] }}>
            Z{zone + 1} · {active.name}
          </span>
        </div>
        <div className="monitor__bpm" style={{ color: zoneColors[zone] }}>
          <Count value={bpm} />
          <small>bpm</small>
        </div>
        <Ecg bpm={bpm} color={zoneColors[zone]} />
      </div>

      <ol className="zones">
        {z.zones.map((b, i) => (
          <li key={b.name}>
            <button type="button" className={i === zone ? 'on' : ''} onClick={() => setZone(i)} style={{ '--zc': zoneColors[i] } as React.CSSProperties}>
              <span className="zones__n mono">Z{i + 1}</span>
              <span className="zones__name">
                <b>{b.name}</b>
                <small>{b.use}</small>
              </span>
              <span className="zones__range mono">
                {b.lo}–{b.hi}
              </span>
              <span className="zones__bar" style={{ width: `${b.range[1] * 100}%` }} />
            </button>
          </li>
        ))}
      </ol>
      <p className="fineprint">Max HR from Tanaka (208 − 0.7 × age). A lab test is more accurate than any formula.</p>
    </div>
  )
}

/** Scrolling ECG trace drawn on a canvas, paced to the BPM. */
function Ecg({ bpm, color }: { bpm: number; color: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const state = useRef({ bpm, color })
  state.current = { bpm, color }
  useEffect(() => {
    const cv = ref.current!
    const ctx = cv.getContext('2d')!
    let raf = 0
    let x = 0
    let phase = 0
    let last = performance.now()
    let prevY = 0
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio)
      cv.width = cv.clientWidth * dpr
      cv.height = cv.clientHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      x = 0
    }
    resize()
    const wave = (f: number) => {
      // P, QRS, T on one beat
      const g = (c: number, w: number, a: number) => a * Math.exp(-Math.pow((f - c) / w, 2))
      return g(0.1, 0.03, 0.12) - g(0.2, 0.008, 0.15) + g(0.22, 0.012, 1) - g(0.245, 0.01, 0.28) + g(0.45, 0.05, 0.22)
    }
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const w = cv.clientWidth
      const h = cv.clientHeight
      const speed = 140 // px per second
      const steps = Math.max(1, Math.round(speed * dt))
      for (let s = 0; s < steps; s++) {
        phase += (state.current.bpm / 60) * (dt / steps)
        const y = h * 0.62 - wave(phase % 1) * h * 0.5
        ctx.clearRect(x + 1, 0, 14, h)
        ctx.strokeStyle = state.current.color
        ctx.lineWidth = 1.6
        ctx.shadowColor = state.current.color
        ctx.shadowBlur = 8
        ctx.beginPath()
        ctx.moveTo(x, prevY || y)
        ctx.lineTo(x + 1, y)
        ctx.stroke()
        prevY = y
        x += 1
        if (x > w) {
          x = 0
          prevY = 0
        }
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])
  return <canvas ref={ref} className="ecg" aria-hidden="true" />
}

/* ───────────── 04 · Muscle Atlas ───────────── */

export const atlas = [
  { zone: ZONES.chest, name: 'Chest', moves: [['Barbell bench press', '4 × 5'], ['Incline dumbbell press', '3 × 8–10'], ['Weighted dip', '3 × 6–8'], ['Cable fly', '3 × 12–15']] },
  { zone: ZONES.back, name: 'Back', moves: [['Deadlift', '3 × 3–5'], ['Weighted pull-up', '4 × 5–8'], ['Chest-supported row', '3 × 8–10'], ['Straight-arm pulldown', '3 × 12']] },
  { zone: ZONES.shoulders, name: 'Shoulders', moves: [['Standing overhead press', '4 × 5'], ['Seated dumbbell press', '3 × 8'], ['Cable lateral raise', '4 × 12–15'], ['Face pull', '3 × 15']] },
  { zone: ZONES.arms, name: 'Arms', moves: [['Close-grip bench', '3 × 6–8'], ['Incline curl', '3 × 10'], ['Overhead extension', '3 × 12'], ['Hammer curl', '3 × 12']] },
  { zone: ZONES.core, name: 'Core', moves: [['Ab wheel rollout', '3 × 8–10'], ['Hanging leg raise', '3 × 10'], ['Pallof press', '3 × 12 / side'], ['Suitcase carry', '4 × 30 m']] },
  { zone: ZONES.glutes, name: 'Glutes', moves: [['Hip thrust', '4 × 8'], ['Romanian deadlift', '3 × 8'], ['Bulgarian split squat', '3 × 10 / leg'], ['Cable kickback', '3 × 15']] },
  { zone: ZONES.legs, name: 'Quads & hams', moves: [['Back squat', '4 × 5'], ['Leg press', '3 × 10–12'], ['Nordic curl', '3 × 5'], ['Walking lunge', '3 × 20 steps']] },
  { zone: ZONES.calves, name: 'Calves', moves: [['Standing calf raise', '4 × 10–12'], ['Seated calf raise', '3 × 15'], ['Tibialis raise', '3 × 20'], ['Jump rope', '3 × 60 s']] },
]

/** Map a point on the figure (body-local units, front view) to a muscle zone. */
export function zoneAt(x: number, y: number) {
  const ax = Math.abs(x)
  if (y > 1.22) return -1
  if (y > 0.92 && ax > 0.3) return ZONES.shoulders
  if (ax > 0.42 && y > -0.1) return ZONES.arms
  if (y > 0.6) return ZONES.chest
  if (y > 0.05) return ZONES.core
  if (y > -0.2) return ZONES.glutes
  if (y > -0.85) return ZONES.legs
  if (y > -1.75) return ZONES.calves
  return -1
}

export function MuscleAtlas({ zone, onZone }: { zone: number; onZone: (z: number) => void }) {
  const sel = atlas.find((a) => a.zone === zone)
  useEffect(() => {
    // back and glutes face away from the viewer, so turn the athlete round
    const back = zone === ZONES.back || zone === ZONES.glutes
    setBody({ zone, spin: back ? Math.PI : 0 })
  }, [zone])
  useEffect(() => () => setBody({ zone: -1, spin: 0 }), [])

  return (
    <div className="tool">
      <ToolHead n="04" title="Muscle Atlas" lede="Tap a muscle on the figure, or pick one below, to light it up and see the lifts that train it." />
      <div className="atlas-chips" role="radiogroup" aria-label="Muscle group">
        {atlas.map((a) => (
          <button key={a.name} role="radio" aria-checked={a.zone === zone} className={a.zone === zone ? 'on' : ''} onClick={() => onZone(a.zone)}>
            {a.name}
          </button>
        ))}
      </div>
      <div className="atlas-list" key={zone}>
        {sel ? (
          <>
            <h4>
              <span className="mono">Selected</span> {sel.name}
            </h4>
            <ol>
              {sel.moves.map(([m, s], i) => (
                <li key={m} style={{ animationDelay: `${i * 70}ms` }}>
                  <span className="mono">{String(i + 1).padStart(2, '0')}</span>
                  <b>{m}</b>
                  <em className="mono">{s}</em>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <p className="atlas-empty">No muscle selected. Hover the figure and click.</p>
        )}
      </div>
    </div>
  )
}

export function ToolHead({ n, title, lede }: { n: string; title: string; lede: string }) {
  return (
    <>
      <div className="panel__head">
        <span className="mono tag">INSTRUMENT {n}</span>
        <span className="mono status">
          <i /> LIVE
        </span>
      </div>
      <h3 className="panel__title">{title}</h3>
      <p className="panel__lede">{lede}</p>
    </>
  )
}
