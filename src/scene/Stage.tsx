import { Suspense, useMemo, useRef, type ReactNode } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { body } from '../lib/store'

/* A polar dot grid under the athlete. Rings ripple outward at a pace set by energy. */
function Platform({ at }: { at?: [number, number, number] }) {
  const ref = useRef<THREE.Points>(null)
  const geometry = useMemo(() => {
    const pts: number[] = []
    for (let r = 1; r <= 26; r++) {
      const rad = r * 0.085
      const n = Math.floor(rad * 60)
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2
        pts.push(Math.cos(a) * rad, 0, Math.sin(a) * rad)
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return g
  }, [])
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uEnergy: { value: 0 }, uFade: { value: 1 } },
        vertexShader: /* glsl */ `
          uniform float uTime; uniform float uEnergy;
          varying float vA; varying float vRing;
          void main(){
            float r = length(position.xz);
            float wave = sin(r * 9.0 - uTime * (1.5 + uEnergy * 4.0));
            vRing = smoothstep(0.85, 1.0, wave);
            vA = smoothstep(2.25, 0.3, r);
            vec3 p = position; p.y += vRing * 0.02;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = (1.4 + vRing * 1.8) * (6.0 / -mv.z);
          }`,
        fragmentShader: /* glsl */ `
          uniform float uFade; varying float vA; varying float vRing;
          void main(){
            if (length(gl_PointCoord - 0.5) > 0.5) discard;
            vec3 c = mix(vec3(0.35,0.38,0.42), vec3(0.83,1.0,0.23), vRing);
            gl_FragColor = vec4(c * (1.0 + vRing), vA * (0.35 + vRing * 0.6) * uFade);
          }`,
      }),
    [],
  )
  useFrame((s) => {
    const l = body.live
    material.uniforms.uTime.value = s.clock.elapsedTime
    material.uniforms.uEnergy.value = l.energy
    material.uniforms.uFade.value = at ? 1 : 1 - Math.min(1, l.scatter * 1.5)
    if (ref.current && at) {
      ref.current.position.set(at[0], at[1], 0)
      ref.current.scale.setScalar(at[2])
    } else if (ref.current) {
      ref.current.position.set(l.x, l.y - 1.74 * l.scale, 0)
      ref.current.scale.setScalar(l.scale)
    }
  })
  return <points ref={ref} geometry={geometry} material={material} />
}

/* The camera drifts slightly with the pointer for parallax. */
function Rig() {
  useFrame(({ camera }, dt) => {
    const k = 1 - Math.exp(-dt * 2)
    camera.position.x += (body.pointer.x * 0.25 - camera.position.x) * k
    camera.position.y += (0.15 + body.pointer.y * 0.15 - camera.position.y) * k
    camera.lookAt(0, 0, 0)
  })
  return null
}

export function Stage({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <div className={className ?? 'stage'} aria-hidden="true">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0.15, 7], fov: 34 }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#08090a']} />
        <Suspense fallback={null}>
          <Rig />
          {children}
          <EffectComposer multisampling={0}>
            <Bloom mipmapBlur intensity={1.1} luminanceThreshold={0.18} luminanceSmoothing={0.3} radius={0.75} />
            <Noise opacity={0.045} premultiply />
            <Vignette offset={0.25} darkness={0.75} />
          </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  )
}

export { Platform }
