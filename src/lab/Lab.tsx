import { useCallback, useEffect, useState } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Stage, Platform } from '../scene/Stage'
import { ParticleBody } from '../scene/ParticleBody'
import { Barbell } from '../scene/Barbell'
import { Heart } from '../scene/Heart'
import { Cursor, Nav } from '../components/Chrome'
import { EnergyEngine } from '../components/EnergyEngine'
import { BarLoader, MuscleAtlas, PulseZones, atlas, zoneAt } from './tools'
import { body, setBody } from '../lib/store'
import { halfWidth, isNarrow } from '../lib/scroll'

const tools = [
  { id: 'energy', n: '01', name: 'Energy Engine' },
  { id: 'strength', n: '02', name: 'Bar Loader' },
  { id: 'pulse', n: '03', name: 'Pulse Zones' },
  { id: 'atlas', n: '04', name: 'Muscle Atlas' },
] as const
type Tool = (typeof tools)[number]['id']

const fromHash = (): Tool => {
  const h = location.hash.slice(1)
  return (tools.find((t) => t.id === h)?.id ?? 'energy') as Tool
}

/** World x of the middle of the space right of the control panel. */
function focusX() {
  if (isNarrow()) return 0
  const panelRight = Math.min(600, window.innerWidth * 0.42)
  const f = (panelRight + (window.innerWidth - panelRight) / 2) / window.innerWidth
  return (f * 2 - 1) * halfWidth()
}

function useFocusX() {
  const [x, setX] = useState(focusX)
  useEffect(() => {
    const on = () => setX(focusX())
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return x
}

/** Turns a click on the canvas into a muscle-zone pick by projecting onto the figure's plane. */
function AtlasPicker({ onPick, onHover }: { onPick: (z: number) => void; onHover: (z: number) => void }) {
  const { camera, gl } = useThree()
  useEffect(() => {
    const ray = new THREE.Raycaster()
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
    const hit = new THREE.Vector3()
    const pick = (e: PointerEvent) => {
      const r = gl.domElement.getBoundingClientRect()
      const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      ray.setFromCamera(ndc, camera)
      if (!ray.ray.intersectPlane(plane, hit)) return -1
      const l = body.live
      const x = (hit.x - l.x) / l.scale
      const y = (hit.y - l.y) / l.scale
      let z = zoneAt(x, y)
      const facingBack = Math.cos(l.spin) < 0
      if (facingBack && z === 1) z = 2
      if (!facingBack && z === 6) z = 7
      return z
    }
    const layer = document.querySelector<HTMLElement>('.lab__pick')
    if (!layer) return
    const click = (e: PointerEvent) => {
      const z = pick(e)
      if (z >= 0) onPick(z)
    }
    const move = (e: PointerEvent) => onHover(pick(e))
    layer.addEventListener('pointerdown', click)
    layer.addEventListener('pointermove', move)
    return () => {
      layer.removeEventListener('pointerdown', click)
      layer.removeEventListener('pointermove', move)
    }
  }, [camera, gl, onPick, onHover])
  return null
}

export default function Lab() {
  const [tool, setTool] = useState<Tool>(fromHash)
  const [load, setLoad] = useState(100)
  const [beat, setBeat] = useState({ bpm: 120, color: '#2fbf71' })
  const [zone, setZone] = useState<number>(atlas[0].zone)
  const [hover, setHover] = useState(-1)
  const fx = useFocusX()

  useEffect(() => {
    const on = () => setTool(fromHash())
    window.addEventListener('hashchange', on)
    document.documentElement.classList.add('ready')
    return () => window.removeEventListener('hashchange', on)
  }, [])

  // choreograph the athlete for each instrument
  useEffect(() => {
    const narrow = isNarrow()
    if (tool === 'energy') setBody({ x: fx, y: narrow ? -0.1 : -0.05, scale: narrow ? 0.62 : 0.95, scatter: 0, spin: 0, zone: -1, scan: 1 })
    if (tool === 'atlas') setBody({ x: fx, y: narrow ? -0.1 : -0.05, scale: narrow ? 0.62 : 0.95, scatter: 0, scan: 0.25 })
    if (tool === 'strength' || tool === 'pulse') setBody({ x: 0, y: 0, scale: 1.6, scatter: 1, spin: Math.PI * 0.5, zone: -1, scan: 0 })
  }, [tool, fx])

  const onLoad = useCallback((kg: number) => setLoad(kg), [])
  const onBeat = useCallback((bpm: number, color: string) => setBeat({ bpm, color }), [])
  const onHover = useCallback((z: number) => setHover(z), [])

  const go = (t: Tool) => {
    history.replaceState(null, '', `#${t}`)
    setTool(t)
  }

  const narrow = isNarrow()
  const caption =
    tool === 'energy'
      ? 'FIG. 01 · Live body model · 42,000 points'
      : tool === 'strength'
        ? `FIG. 02 · ${load} kg loaded · 20 kg bar`
        : tool === 'pulse'
          ? `FIG. 03 · Cardiac model · ${beat.bpm} bpm`
          : `FIG. 04 · ${atlas.find((a) => a.zone === (hover >= 0 ? hover : zone))?.name ?? 'Select a muscle'}`

  return (
    <>
      <Cursor />
      <Nav page="lab" />
      <Stage className="stage lab-stage">
        <ParticleBody />
        {(tool === 'energy' || tool === 'atlas') && <Platform />}
        {tool === 'strength' && (
          <>
            <Barbell load={load} at={[fx, narrow ? 0.1 : 0.1, narrow ? 0.85 : 1.45]} />
            <Platform at={[fx, narrow ? -0.35 : -0.52, narrow ? 0.7 : 1.1]} />
          </>
        )}
        {tool === 'pulse' && <Heart bpm={beat.bpm} color={beat.color} at={[fx, narrow ? 0.05 : 0.05, narrow ? 0.55 : 0.8]} />}
        {tool === 'atlas' && <AtlasPicker onPick={setZone} onHover={onHover} />}
      </Stage>
      {tool === 'atlas' && <div className={`lab__pick ${hover >= 0 ? 'is-hot' : ''}`} aria-hidden="true" />}

      <main className="lab">
        <div className="lab__ui">
          <header className="lab__head">
            <p className="eyebrow mono">
              <span className="dot" /> The Lab · Free instruments
            </p>
            <h1 className="display display--sm">Instruments</h1>
          </header>
          <nav className="lab__tabs" aria-label="Instruments">
            {tools.map((t) => (
              <button key={t.id} className={t.id === tool ? 'on' : ''} onClick={() => go(t.id)} aria-current={t.id === tool}>
                <span className="mono">{t.n}</span>
                {t.name}
              </button>
            ))}
          </nav>
          <section className={tool === 'energy' ? 'lab__panel lab__panel--bare' : 'panel lab__panel'} key={tool}>
            {tool === 'energy' && <EnergyEngine />}
            {tool === 'strength' && <BarLoader onLoad={onLoad} />}
            {tool === 'pulse' && <PulseZones onBeat={onBeat} />}
            {tool === 'atlas' && <MuscleAtlas zone={zone} onZone={setZone} />}
          </section>
        </div>
        <p className="lab__caption mono" aria-live="polite">
          {caption}
        </p>
      </main>
    </>
  )
}
