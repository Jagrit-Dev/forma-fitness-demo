import { useEffect, useRef, useState } from 'react'
import { scrollToId } from '../lib/scroll'

export function Nav({ page }: { page: 'home' | 'lab' }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  const go = (id: string) => (e: React.MouseEvent) => {
    if (page !== 'home') return
    e.preventDefault()
    scrollToId(id)
  }
  return (
    <header className={`nav ${scrolled ? 'nav--solid' : ''}`}>
      <a className="nav__brand" href="/" aria-label="FORMA home">
        <Mark />
        <span>FORMA</span>
      </a>
      <nav className="nav__links" aria-label="Primary">
        <a href="/#method" onClick={go('method')}>Method</a>
        <a href="/#programs" onClick={go('programs')}>Programs</a>
        <a href="/lab/" className={page === 'lab' ? 'on' : ''}>The Lab</a>
        <a href="/#membership" onClick={go('membership')}>Membership</a>
      </nav>
      <a className="btn btn--accent btn--sm" href="/#membership" onClick={go('membership')}>
        Book assessment
      </a>
    </header>
  )
}

export function Mark() {
  return (
    <svg className="mark" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M6 4h20v5H12v5h11v5H12v9H6z" fill="currentColor" />
      <circle cx="24" cy="25" r="3" fill="var(--accent)" />
    </svg>
  )
}

/** Small ring that trails the pointer and grows over interactive elements. */
export function Cursor() {
  const ring = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return
    let x = innerWidth / 2,
      y = innerHeight / 2,
      cx = x,
      cy = y,
      raf = 0
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      x = e.clientX
      y = e.clientY
      ring.current?.classList.add('cursor--on')
      const t = e.target as HTMLElement
      ring.current?.classList.toggle('cursor--hover', !!t.closest('a,button,input,[role=radio]'))
    }
    const loop = () => {
      cx += (x - cx) * 0.2
      cy += (y - cy) * 0.2
      if (ring.current) ring.current.style.transform = `translate3d(${cx}px, ${cy}px, 0)`
      raf = requestAnimationFrame(loop)
    }
    window.addEventListener('pointermove', move)
    loop()
    document.documentElement.classList.add('has-cursor')
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', move)
    }
  }, [])
  return <div ref={ring} className="cursor" aria-hidden="true" />
}

/** Live-looking lab telemetry in the hero corner. */
export function Telemetry() {
  const [t, setT] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setT((v) => v + 1), 900)
    return () => clearInterval(id)
  }, [])
  const hr = 58 + Math.round(Math.sin(t * 0.7) * 3 + Math.sin(t * 1.9))
  const rows = [
    ['HR', `${hr}`, 'bpm'],
    ['VO₂ MAX', (54.2 + Math.sin(t * 0.3) * 0.2).toFixed(1), 'ml/kg'],
    ['HRV', `${82 + Math.round(Math.sin(t * 0.5) * 4)}`, 'ms'],
    ['SCAN', `${(t * 37) % 100}`.padStart(2, '0'), '%'],
  ]
  return (
    <dl className="telemetry mono">
      {rows.map(([k, v, u]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>
            {v}
            <small>{u}</small>
          </dd>
        </div>
      ))}
    </dl>
  )
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer__grid">
        <div>
          <span className="mono tag">VISIT</span>
          <p>
            FORMA Performance Lab
            <br />
            14 Foundry Lane, Unit 3
            <br />
            Open 05:00 – 23:00 daily
          </p>
        </div>
        <div>
          <span className="mono tag">EXPLORE</span>
          <p>
            <a href="/#method">Method</a>
            <br />
            <a href="/#programs">Programs</a>
            <br />
            <a href="/lab/">The Lab</a>
          </p>
        </div>
        <div>
          <span className="mono tag">FOLLOW</span>
          <p>
            <a href="#" onClick={(e) => e.preventDefault()}>Instagram</a>
            <br />
            <a href="#" onClick={(e) => e.preventDefault()}>YouTube</a>
            <br />
            <a href="#" onClick={(e) => e.preventDefault()}>Strava club</a>
          </p>
        </div>
      </div>
      <div className="footer__word" aria-hidden="true">FORMA</div>
      <div className="footer__base mono">
        <span>© 2026 FORMA. A concept project.</span>
        <span>Calculators are estimates, not medical advice.</span>
      </div>
    </footer>
  )
}
