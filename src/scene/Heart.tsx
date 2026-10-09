import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { noise3 } from './glsl'

/*
 * A particle heart that beats at a given BPM with a lub-dub rhythm.
 * Points are sampled near the surface of the classic implicit heart
 * (x² + 9/4·y² + z² − 1)³ − x²z³ − 9/80·y²z³ = 0, with z pointing up.
 */
function heartField(x: number, y: number, z: number) {
  const a = x * x + 2.25 * y * y + z * z - 1
  return a * a * a - x * x * z * z * z - 0.1125 * y * y * z * z * z
}

function buildHeart(count: number) {
  const pos = new Float32Array(count * 3)
  const rnd = new Float32Array(count * 2)
  let i = 0
  let guard = 0
  while (i < count && guard < count * 400) {
    guard++
    const x = (Math.random() * 2 - 1) * 1.3
    const y = (Math.random() * 2 - 1) * 0.9
    const z = (Math.random() * 2 - 1) * 1.4
    const f = heartField(x, y, z)
    // keep a thin shell plus a sparse interior for depth
    if (f < 0 && (f > -0.035 || Math.random() < 0.006)) {
      // world: x right, y up (heart z), z toward the viewer (heart y)
      pos.set([x, z, y], i * 3)
      rnd.set([Math.random(), Math.random()], i * 2)
      i++
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('aRand', new THREE.BufferAttribute(rnd, 2))
  return g
}

export function Heart({ bpm, color, at = [0, 0, 1] }: { bpm: number; color: string; at?: [number, number, number] }) {
  const geometry = useMemo(() => buildHeart(26000), [])
  const ref = useRef<THREE.Points>(null)
  const phase = useRef(0)
  const col = useMemo(() => new THREE.Color(color), [color])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uBeat: { value: 0 }, uColor: { value: new THREE.Color() }, uPixelRatio: { value: 1 } },
        vertexShader: /* glsl */ `
          uniform float uTime; uniform float uBeat; uniform float uPixelRatio;
          attribute vec2 aRand;
          varying float vA; varying float vB;
          ${noise3}
          void main(){
            vec3 p = position;
            float n = snoise(p * 1.8 + uTime * 0.3);
            p *= 1.0 + uBeat * 0.13 + n * 0.02;
            // particles shed off the surface on each beat
            p += normalize(p + 1e-4) * uBeat * aRand.x * 0.18;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;
            vA = 0.35 + aRand.y * 0.4;
            vB = uBeat;
            gl_PointSize = mix(1.4, 3.2, aRand.x) * (1.0 + uBeat * 0.6) * uPixelRatio * (6.0 / -mv.z);
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor; varying float vA; varying float vB;
          void main(){
            float d = length(gl_PointCoord - 0.5);
            if (d > 0.5) discard;
            vec3 c = uColor * (0.9 + vB * 1.6);
            gl_FragColor = vec4(c, smoothstep(0.5, 0.0, d) * vA);
          }`,
      }),
    [],
  )

  useFrame((state, dt) => {
    phase.current += (dt * bpm) / 60
    const f = phase.current % 1
    // lub (strong) then dub (softer) a quarter-beat later
    const beat = Math.exp(-Math.pow(f * 9, 2)) + 0.55 * Math.exp(-Math.pow((f - 0.24) * 11, 2))
    const u = material.uniforms
    u.uTime.value = state.clock.elapsedTime
    u.uBeat.value = beat
    u.uColor.value.lerp(col, 1 - Math.exp(-dt * 4))
    u.uPixelRatio.value = state.gl.getPixelRatio()
    const p = ref.current
    if (p) {
      p.position.set(at[0], at[1], 0)
      p.scale.setScalar(at[2])
      p.rotation.y = Math.sin(state.clock.elapsedTime * 0.4) * 0.5 + state.pointer.x * 0.4
      p.rotation.z = -0.18
    }
  })

  return <points ref={ref} geometry={geometry} material={material} />
}
