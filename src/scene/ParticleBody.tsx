import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { buildBodyGeometry } from './bodyGeometry'
import { body } from '../lib/store'
import { noise3 } from './glsl'

const vertex = /* glsl */ `
  uniform float uTime;
  uniform float uBulk;
  uniform float uHeight;
  uniform float uScatter;
  uniform float uEnergy;
  uniform float uZone;
  uniform float uScan;
  uniform float uPixelRatio;
  uniform vec3 uMouse;
  attribute vec3 aCenter;
  attribute vec3 aOut;
  attribute vec4 aRand;
  attribute float aZone;
  varying float vGlow;
  varying float vAlpha;
  varying float vHot;
  ${noise3}

  void main() {
    float isAura = aRand.w;
    vec3 c = aCenter;
    vec3 o = aOut;

    // breathing: chest and shoulders swell on a slow cycle
    float breath = sin(uTime * (1.1 + uEnergy * 1.6)) * 0.5 + 0.5;
    float chest = smoothstep(0.45, 0.9, c.y) * smoothstep(1.25, 0.95, c.y) * (1.0 - isAura);
    float mass = 1.0 + uBulk * (uBulk > 0.0 ? 0.55 : 0.32) * aRand.z;
    o *= mass * (1.0 + chest * breath * 0.035);

    vec3 p = c + o;

    // stretch from the feet so taller bodies still stand on the floor
    p.y = -1.72 + (p.y + 1.72) * uHeight;

    if (isAura > 0.5) {
      float a = uTime * (0.05 + aRand.x * 0.12) + aRand.y * 6.2831;
      float r = length(o.xz);
      p = vec3(cos(a) * r, c.y + sin(uTime * 0.3 + aRand.x * 9.0) * 0.15, sin(a) * r);
    }

    // living surface: low-frequency flow field
    float n = snoise(p * 1.6 + vec3(0.0, uTime * 0.25, 0.0));
    p += normalize(o + 1e-4) * n * 0.018 * (1.0 + uEnergy);

    // dissolve: each particle drifts out along its own curl of noise
    vec3 drift = vec3(
      snoise(aCenter * 0.7 + aRand.xyz * 4.0 + uTime * 0.04),
      snoise(aCenter * 0.7 + aRand.yzx * 4.0 + 13.0 + uTime * 0.04),
      snoise(aCenter * 0.7 + aRand.zxy * 4.0 + 31.0 + uTime * 0.04)
    );
    float s = smoothstep(aRand.x * 0.35, 0.65 + aRand.x * 0.35, uScatter);
    p += (drift * 3.2 + normalize(o + 1e-4) * 1.5) * s;

    // pointer: particles are pushed away from the cursor ray
    vec4 world = modelMatrix * vec4(p, 1.0);
    vec3 toM = world.xyz - uMouse;
    float md = length(toM.xy);
    float push = smoothstep(0.55, 0.0, md) * (1.0 - isAura);
    world.xyz += normalize(vec3(toM.xy, 0.25) + 1e-4) * push * 0.22;

    vec4 mv = viewMatrix * world;
    gl_Position = projectionMatrix * mv;

    // scanning band sweeping up the body
    float bandY = mod(uTime * 0.45, 4.6) - 2.3;
    float band = exp(-pow((p.y - bandY) * 7.0, 2.0)) * uScan * (1.0 - isAura);
    float hot = (1.0 - step(0.5, abs(aZone - uZone))) * (1.0 - isAura);

    vGlow = band + push * 0.8;
    vHot = hot;
    vAlpha = mix(0.5, 0.3, isAura) * mix(1.0, 0.55, s);
    if (uZone > -0.5 && hot < 0.5) vAlpha *= 0.4;

    float size = mix(1.3, 3.0, aRand.x) * mix(1.0, 0.75, isAura);
    size *= 1.0 + band * 1.6 + hot * 0.6;
    gl_PointSize = size * uPixelRatio * (6.0 / -mv.z);
  }
`

const fragment = /* glsl */ `
  uniform vec3 uBase;
  uniform vec3 uAccent;
  uniform float uEnergy;
  varying float vGlow;
  varying float vAlpha;
  varying float vHot;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float soft = smoothstep(0.5, 0.0, d);
    vec3 col = mix(uBase, uAccent, clamp(vGlow + vHot * 0.85, 0.0, 1.0));
    col *= 0.85 + vGlow * 2.0 + vHot * 0.9 + uEnergy * 0.2;
    gl_FragColor = vec4(col, soft * vAlpha);
  }
`

export function ParticleBody({ count = 42000, aura = 2600 }: { count?: number; aura?: number }) {
  const geometry = useMemo(() => buildBodyGeometry(count, aura), [count, aura])
  const points = useRef<THREE.Points>(null)
  const { camera, gl } = useThree()
  const ray = useMemo(() => new THREE.Raycaster(), [])
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), [])
  const hit = useMemo(() => new THREE.Vector3(), [])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uBulk: { value: 0 },
          uHeight: { value: 1 },
          uScatter: { value: 1 },
          uEnergy: { value: 0.3 },
          uZone: { value: -1 },
          uScan: { value: 1 },
          uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
          uMouse: { value: new THREE.Vector3(99, 99, 0) },
          uBase: { value: new THREE.Color('#7d8794') },
          uAccent: { value: new THREE.Color('#d4ff3a') },
        },
      }),
    [],
  )

  useFrame((state, dt) => {
    const t = body.target
    const l = body.live
    const k = 1 - Math.exp(-dt * 3.2)
    const ks = 1 - Math.exp(-dt * 1.6)
    l.bulk += (t.bulk - l.bulk) * k
    l.height += (t.height - l.height) * k
    l.energy += (t.energy - l.energy) * k
    l.scatter += (t.scatter - l.scatter) * ks
    l.x += (t.x - l.x) * ks
    l.y += (t.y - l.y) * ks
    l.scale += (t.scale - l.scale) * ks
    l.spin += (t.spin - l.spin) * ks
    l.scan += (t.scan - l.scan) * k
    l.zone = t.zone

    const u = material.uniforms
    u.uTime.value = state.clock.elapsedTime
    u.uBulk.value = l.bulk
    u.uHeight.value = l.height
    u.uScatter.value = l.scatter
    u.uEnergy.value = l.energy
    u.uZone.value = l.zone
    u.uScan.value = l.scan
    u.uPixelRatio.value = gl.getPixelRatio()

    // pointer → world point on the z=0 plane
    ray.setFromCamera(new THREE.Vector2(body.pointer.x, body.pointer.y), camera)
    if (ray.ray.intersectPlane(plane, hit)) u.uMouse.value.lerp(hit, 0.25)

    const p = points.current
    if (p) {
      p.position.set(l.x, l.y, 0)
      p.scale.setScalar(l.scale)
      const idle = Math.sin(state.clock.elapsedTime * 0.25) * 0.35
      const look = body.pointer.x * 0.45
      p.rotation.y += (idle + look + l.spin - p.rotation.y) * k
      p.rotation.x += (-body.pointer.y * 0.06 - p.rotation.x) * k
    }
  })

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />
}
