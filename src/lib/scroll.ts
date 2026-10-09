import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { setBody, body } from './store'

gsap.registerPlugin(ScrollTrigger)

export const reducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

let lenis: Lenis | null = null

export function startSmoothScroll() {
  if (lenis || reducedMotion) return lenis
  lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((t) => lenis?.raf(t * 1000))
  gsap.ticker.lagSmoothing(0)
  return lenis
}

export function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  if (lenis) lenis.scrollTo(el, { offset: -20, duration: 1.6 })
  else el.scrollIntoView({ behavior: 'smooth' })
}

/** Half the visible width of the z=0 plane, so presets can place the figure by fraction of screen. */
export function halfWidth() {
  const aspect = window.innerWidth / window.innerHeight
  return 7 * Math.tan((34 / 2) * (Math.PI / 180)) * aspect
}

export const isNarrow = () => window.innerWidth < 900

type Preset = Partial<typeof body.target>
export const scenes: Record<string, () => Preset> = {
  hero: () => (isNarrow() ? { x: 0, y: 0.55, scale: 0.66, scatter: 0, spin: 0, scan: 1 } : { x: halfWidth() * 0.56, y: -0.04, scale: 0.98, scatter: 0, spin: 0, scan: 1 }),
  method: () => ({ x: 0, y: 0, scale: 1.25, scatter: 0.92, spin: 0.6, scan: 0 }),
  engine: () => (isNarrow() ? { x: 0, y: 0, scale: 0.7, scatter: 0.6, spin: 0, scan: 1 } : { x: halfWidth() * 0.62, y: -0.05, scale: 0.96, scatter: 0, spin: 0, scan: 1 }),
  field: () => ({ x: 0, y: 0, scale: 1.4, scatter: 1, spin: Math.PI * 0.5, scan: 0 }),
  outro: () => ({ x: 0, y: -0.12, scale: 0.6, scatter: 0, spin: 0, scan: 1 }),
}

/** Each <section data-scene="…"> re-poses the athlete when it reaches the middle of the screen. */
export function bindScenes(root: HTMLElement) {
  const triggers = Array.from(root.querySelectorAll<HTMLElement>('[data-scene]')).map((el) =>
    ScrollTrigger.create({
      trigger: el,
      start: 'top 60%',
      end: 'bottom 40%',
      onToggle: (self) => {
        if (self.isActive) setBody(scenes[el.dataset.scene!]())
      },
    }),
  )
  const onResize = () => {
    const active = triggers.find((t) => t.isActive)
    if (active) setBody(scenes[(active.trigger as HTMLElement).dataset.scene!]())
  }
  window.addEventListener('resize', onResize)
  return () => {
    triggers.forEach((t) => t.kill())
    window.removeEventListener('resize', onResize)
  }
}

/** Fade/slide in anything marked data-reveal, staggered per batch. */
export function bindReveals(root: HTMLElement) {
  const items = root.querySelectorAll<HTMLElement>('[data-reveal]')
  if (reducedMotion) {
    items.forEach((el) => el.classList.add('is-in'))
    return () => {}
  }
  // anything already on screen at load animates in straight away, in document order
  const first = Array.from(items).filter((el) => el.getBoundingClientRect().top < window.innerHeight)
  first.forEach((el, i) => setTimeout(() => el.classList.add('is-in'), 150 + i * 110))
  const rest = Array.from(items).filter((el) => !first.includes(el))
  const batch = ScrollTrigger.batch(rest, {
    start: 'top 88%',
    onEnter: (els) =>
      els.forEach((el, i) => setTimeout(() => el.classList.add('is-in'), i * 90)),
  })
  return () => batch.forEach((t) => t.kill())
}

export { gsap, ScrollTrigger }
