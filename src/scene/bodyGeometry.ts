import * as THREE from 'three'

/*
 * Procedural athlete made of particles.
 * Every particle stores the centre of the body part it belongs to (aCenter) and
 * its offset from that centre (aOut). The shader rebuilds the position as
 * centre + offset * bulk, so one uniform can make the whole figure leaner or heavier.
 */

type V3 = [number, number, number]
type Sampler = (rnd: () => number) => { c: V3; o: V3; z?: number }

interface Part {
  weight: number // share of particles
  bulk: number // how strongly this part responds to body mass
  zone: number // see ZONES; the torso sampler can override per particle
  sample: Sampler
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

function capsule(a: V3, b: V3, ra: number, rb: number): Sampler {
  const ax = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2])
  const dir = ax.clone().normalize()
  const helper = Math.abs(dir.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)
  const u = new THREE.Vector3().crossVectors(dir, helper).normalize()
  const v = new THREE.Vector3().crossVectors(dir, u).normalize()
  return (rnd) => {
    const t = rnd()
    // slight muscle belly: thickest a third of the way down
    const belly = 1 + 0.18 * Math.sin(Math.PI * Math.min(1, t * 1.4))
    const r = lerp(ra, rb, t) * belly
    const th = rnd() * Math.PI * 2
    const c: V3 = [a[0] + ax.x * t, a[1] + ax.y * t, a[2] + ax.z * t]
    const shell = r * (0.86 + 0.14 * Math.sqrt(rnd()))
    const o: V3 = [
      (u.x * Math.cos(th) + v.x * Math.sin(th)) * shell,
      (u.y * Math.cos(th) + v.y * Math.sin(th)) * shell,
      (u.z * Math.cos(th) + v.z * Math.sin(th)) * shell,
    ]
    return { c, o }
  }
}

function ellipsoid(c: V3, r: V3): Sampler {
  return (rnd) => {
    const z = rnd() * 2 - 1
    const th = rnd() * Math.PI * 2
    const s = Math.sqrt(1 - z * z)
    const k = 0.88 + 0.12 * Math.sqrt(rnd())
    return { c, o: [s * Math.cos(th) * r[0] * k, z * r[1] * k, s * Math.sin(th) * r[2] * k] }
  }
}

export const ZONES = { head: 0, chest: 1, back: 2, shoulders: 3, arms: 4, core: 5, glutes: 6, legs: 7, calves: 8 } as const

// Torso lofted through elliptical cross sections: hips → waist → chest → shoulders
const torsoProfile: { y: number; w: number; d: number; z: number }[] = [
  { y: -0.02, w: 0.3, d: 0.17, z: 0 },
  { y: 0.22, w: 0.27, d: 0.15, z: 0.0 },
  { y: 0.45, w: 0.255, d: 0.15, z: 0.01 },
  { y: 0.72, w: 0.34, d: 0.18, z: 0.02 },
  { y: 0.92, w: 0.39, d: 0.19, z: 0.02 },
  { y: 1.08, w: 0.42, d: 0.15, z: 0.0 },
  { y: 1.2, w: 0.2, d: 0.11, z: 0.0 },
]

const torso: Sampler = (rnd) => {
  const t = rnd() * (torsoProfile.length - 1)
  const i = Math.min(torsoProfile.length - 2, Math.floor(t))
  const f = t - i
  const p0 = torsoProfile[i]
  const p1 = torsoProfile[i + 1]
  const y = lerp(p0.y, p1.y, f)
  const w = lerp(p0.w, p1.w, f)
  const d = lerp(p0.d, p1.d, f)
  const z = lerp(p0.z, p1.z, f)
  const th = rnd() * Math.PI * 2
  const k = 0.88 + 0.12 * Math.sqrt(rnd())
  // abs line: a soft groove down the front of the torso
  const front = Math.max(0, Math.sin(th))
  const groove = 1 - 0.06 * front * Math.exp(-Math.pow(Math.cos(th) * 9, 2))
  const sn = Math.sin(th)
  const zone =
    y > 1.02 ? ZONES.back // traps
    : y > 0.55 ? (sn > 0.3 ? ZONES.chest : ZONES.back)
    : sn > -0.35 ? ZONES.core
    : ZONES.back
  return { c: [0, y, z], o: [Math.cos(th) * w * k, 0, Math.sin(th) * d * k * groove], z: zone }
}

function mirror(build: (s: 1 | -1) => Part[]): Part[] {
  return [...build(1), ...build(-1)]
}

const parts: Part[] = [
  { weight: 0.07, bulk: 0.12, zone: ZONES.head, sample: ellipsoid([0, 1.47, 0.01], [0.155, 0.2, 0.175]) },
  { weight: 0.015, bulk: 0.6, zone: ZONES.head, sample: capsule([0, 1.2, 0], [0, 1.32, 0.01], 0.085, 0.075) },
  // trapezius slope
  { weight: 0.03, bulk: 0.9, zone: ZONES.back, sample: capsule([-0.32, 1.12, -0.01], [0.32, 1.12, -0.01], 0.07, 0.07) },
  { weight: 0.3, bulk: 1, zone: ZONES.core, sample: torso },
  // pectorals, lats and glutes give the silhouette its athletic V
  ...mirror((s) => [
    { weight: 0.018, bulk: 1, zone: ZONES.chest, sample: ellipsoid([0.14 * s, 0.86, 0.11], [0.15, 0.1, 0.08]) },
    { weight: 0.016, bulk: 1, zone: ZONES.back, sample: ellipsoid([0.25 * s, 0.7, -0.04], [0.09, 0.2, 0.11]) },
    { weight: 0.016, bulk: 1, zone: ZONES.glutes, sample: ellipsoid([0.13 * s, -0.05, -0.08], [0.15, 0.13, 0.12]) },
    { weight: 0.012, bulk: 0.8, zone: ZONES.calves, sample: ellipsoid([0.2 * s, -1.05, -0.06], [0.07, 0.17, 0.07]) },
  ]),
  ...mirror((s) => [
    { weight: 0.025, bulk: 0.9, zone: ZONES.shoulders, sample: ellipsoid([0.42 * s, 1.08, 0], [0.12, 0.11, 0.12]) },
    { weight: 0.04, bulk: 0.9, zone: ZONES.arms, sample: capsule([0.46 * s, 1.04, 0], [0.56 * s, 0.56, 0.02], 0.09, 0.066) },
    { weight: 0.032, bulk: 0.7, zone: ZONES.arms, sample: capsule([0.56 * s, 0.56, 0.02], [0.63 * s, 0.1, 0.08], 0.068, 0.045) },
    { weight: 0.01, bulk: 0.2, zone: ZONES.arms, sample: ellipsoid([0.645 * s, -0.01, 0.09], [0.04, 0.085, 0.03]) },
    { weight: 0.075, bulk: 1, zone: ZONES.legs, sample: capsule([0.15 * s, 0.02, 0], [0.19 * s, -0.8, 0.01], 0.145, 0.085) },
    { weight: 0.05, bulk: 0.75, zone: ZONES.calves, sample: capsule([0.19 * s, -0.8, 0.01], [0.21 * s, -1.6, -0.02], 0.085, 0.048) },
    { weight: 0.01, bulk: 0.15, zone: ZONES.calves, sample: ellipsoid([0.22 * s, -1.67, 0.06], [0.055, 0.04, 0.12]) },
  ]),
]

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function buildBodyGeometry(count: number, auraCount: number) {
  const rnd = mulberry32(7)
  const total = count + auraCount
  const center = new Float32Array(total * 3)
  const out = new Float32Array(total * 3)
  const rand = new Float32Array(total * 4)
  const zone = new Float32Array(total)

  const sumW = parts.reduce((s, p) => s + p.weight, 0)
  let i = 0
  for (const p of parts) {
    const n = Math.round((p.weight / sumW) * count)
    for (let k = 0; k < n && i < count; k++, i++) {
      const { c, o, z } = p.sample(rnd)
      center.set(c, i * 3)
      out.set(o, i * 3)
      rand.set([rnd(), rnd(), p.bulk, 0], i * 4)
      zone[i] = z ?? p.zone
    }
  }
  // fill rounding leftovers on the torso
  for (; i < count; i++) {
    const { c, o, z } = torso(rnd)
    center.set(c, i * 3)
    out.set(o, i * 3)
    rand.set([rnd(), rnd(), 1, 0], i * 4)
    zone[i] = z!
  }
  // aura: a slow orbit of dust around the athlete
  for (; i < total; i++) {
    const r = 1.1 + rnd() * 1.6
    const th = rnd() * Math.PI * 2
    const y = (rnd() * 2 - 1) * 1.9
    center.set([0, y, 0], i * 3)
    out.set([Math.cos(th) * r, 0, Math.sin(th) * r], i * 3)
    rand.set([rnd(), rnd(), 0, 1], i * 4)
    zone[i] = -1
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(center.slice(), 3))
  g.setAttribute('aCenter', new THREE.BufferAttribute(center, 3))
  g.setAttribute('aOut', new THREE.BufferAttribute(out, 3))
  g.setAttribute('aRand', new THREE.BufferAttribute(rand, 4))
  g.setAttribute('aZone', new THREE.BufferAttribute(zone, 1))
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 5)
  return g
}
