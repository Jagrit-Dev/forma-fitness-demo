import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { loadBar } from '../lib/fitness'

const SLEEVE_START = 0.86

/** Studio reflections for the chrome bar, generated once without loading an HDR. */
function useStudioEnv() {
  const { gl, scene } = useThree()
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environmentIntensity = 0.55
    const prev = scene.environment
    scene.environment = env
    return () => {
      scene.environment = prev
      env.dispose()
      pmrem.dispose()
    }
  }, [gl, scene])
}

function Plate({ x, side, kg, color, w, r, delay }: { x: number; side: 1 | -1; kg: number; color: string; w: number; r: number; delay: number }) {
  const ref = useRef<THREE.Group>(null)
  const born = useRef(-1)
  const geo = useMemo(() => {
    // a plate with a raised rim and a recessed face, lathed from a profile
    const pts = [
      new THREE.Vector2(0.03, -w / 2),
      new THREE.Vector2(r * 0.92, -w / 2),
      new THREE.Vector2(r, -w / 2 + w * 0.12),
      new THREE.Vector2(r, w / 2 - w * 0.12),
      new THREE.Vector2(r * 0.92, w / 2),
      new THREE.Vector2(r * 0.8, w / 2),
      new THREE.Vector2(r * 0.76, w * 0.28),
      new THREE.Vector2(0.09, w * 0.28),
      new THREE.Vector2(0.075, w / 2),
      new THREE.Vector2(0.03, w / 2),
    ]
    const g = new THREE.LatheGeometry(pts, 72)
    g.rotateZ(Math.PI / 2)
    return g
  }, [w, r])
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color, roughness: kg >= 10 ? 0.55 : 0.35, metalness: kg >= 10 ? 0.05 : 0.6, envMapIntensity: 0.9 }),
    [color, kg],
  )
  const flip = side === -1 ? Math.PI : 0

  useFrame((state, dt) => {
    const g = ref.current
    if (!g) return
    if (born.current < 0) born.current = state.clock.elapsedTime
    const t = state.clock.elapsedTime - born.current - delay
    const target = x * side
    if (t < 0) {
      g.position.x = side * (x + 1.6)
      g.visible = false
      return
    }
    g.visible = true
    g.position.x += (target - g.position.x) * (1 - Math.exp(-dt * 9))
    g.rotation.x += (0 - g.rotation.x) * (1 - Math.exp(-dt * 6))
  })

  return (
    <group ref={ref} position={[side * (x + 1.6), 0, 0]} rotation={[side * 2.5, 0, flip]}>
      <mesh geometry={geo} material={mat} />
    </group>
  )
}

export function Barbell({ load, at = [0, 0, 1] }: { load: number; at?: [number, number, number] }) {
  useStudioEnv()
  const group = useRef<THREE.Group>(null)
  const drop = useRef(0)
  const plates = useMemo(() => loadBar(load), [load])

  // stack plates outward from the collar
  const placed = useMemo(() => {
    let cursor = SLEEVE_START + 0.035
    return plates.map((p, i) => {
      const x = cursor + p.w / 2
      cursor += p.w + 0.004
      return { ...p, x, i }
    })
  }, [plates])

  useEffect(() => {
    drop.current = 0.32
  }, [load])

  const chrome = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d9dde2', metalness: 1, roughness: 0.22 }), [])
  const knurl = useMemo(() => new THREE.MeshStandardMaterial({ color: '#8e959c', metalness: 1, roughness: 0.55 }), [])

  useFrame((state, dt) => {
    const g = group.current
    if (!g) return
    drop.current *= Math.exp(-dt * 5)
    const bounce = Math.abs(Math.sin(state.clock.elapsedTime * 14)) * drop.current * 0.25
    g.position.set(at[0], at[1] + bounce + Math.sin(state.clock.elapsedTime * 0.8) * 0.02, 0)
    g.scale.setScalar(at[2])
    g.rotation.y = -0.42 + Math.sin(state.clock.elapsedTime * 0.25) * 0.12 + state.pointer.x * 0.15
    g.rotation.x = 0.16 + state.pointer.y * -0.06
  })

  return (
    <group ref={group}>
      <ambientLight intensity={0.25} />
      <directionalLight position={[3, 4, 5]} intensity={1.6} />
      <pointLight position={[-3, 1, 2]} intensity={6} color="#d4ff3a" distance={8} />
      {/* shaft */}
      <mesh rotation={[0, 0, Math.PI / 2]} material={knurl}>
        <cylinderGeometry args={[0.028, 0.028, SLEEVE_START * 2, 32]} />
      </mesh>
      {([1, -1] as const).map((s) => (
        <group key={s}>
          {/* collar */}
          <mesh position={[s * (SLEEVE_START + 0.012), 0, 0]} rotation={[0, 0, Math.PI / 2]} material={chrome}>
            <cylinderGeometry args={[0.075, 0.075, 0.03, 40]} />
          </mesh>
          {/* sleeve */}
          <mesh position={[s * (SLEEVE_START + 0.24), 0, 0]} rotation={[0, 0, Math.PI / 2]} material={chrome}>
            <cylinderGeometry args={[0.05, 0.05, 0.46, 40]} />
          </mesh>
          {placed.map((p) => (
            <Plate key={`${s}-${p.i}-${p.kg}`} x={p.x} side={s} kg={p.kg} color={p.color} w={p.w} r={p.r} delay={p.i * 0.07} />
          ))}
        </group>
      ))}
    </group>
  )
}
