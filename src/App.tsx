import { useEffect, useRef, useState } from 'react'
import { Stage, Platform } from './scene/Stage'
import { ParticleBody } from './scene/ParticleBody'
import { Cursor, Footer, Nav, Telemetry } from './components/Chrome'
import { EnergyEngine } from './components/EnergyEngine'
import { Count, Rise, Segmented, Tilt } from './components/ui'
import { bindReveals, bindScenes, scrollToId, startSmoothScroll } from './lib/scroll'
import { setBody } from './lib/store'

const programs = [
  { code: 'STR', name: 'Strength', weeks: 12, days: 4, load: 5, line: 'Low reps, heavy bars, and a peak test day you will remember.' },
  { code: 'HYP', name: 'Hypertrophy', weeks: 10, days: 5, load: 4, line: 'Volume landmarks set to how fast you recover, not to a template.' },
  { code: 'ENG', name: 'Engine', weeks: 8, days: 4, load: 3, line: 'Zone 2 base, threshold intervals and a VO₂ max test at both ends.' },
  { code: 'RCP', name: 'Recomp', weeks: 16, days: 4, load: 4, line: 'Lose fat and keep the muscle, with the macros re-checked every two weeks.' },
]

const instruments = [
  { n: '01', name: 'Energy Engine', what: 'BMR · TDEE · macros', href: '/lab/#energy' },
  { n: '02', name: 'Bar Loader', what: '1RM · plate math · % chart', href: '/lab/#strength' },
  { n: '03', name: 'Pulse Zones', what: 'Karvonen heart-rate zones', href: '/lab/#pulse' },
  { n: '04', name: 'Muscle Atlas', what: 'Click a muscle, get the work', href: '/lab/#atlas' },
]

const tiers = [
  { name: 'Access', m: 89, perks: ['Open gym, 05:00–23:00', 'Quarterly body scan', 'App programming'] },
  { name: 'Performance', m: 189, featured: true, perks: ['Everything in Access', 'Coach-written 12-week block', 'Monthly lab testing', 'Recovery suite'] },
  { name: 'Lab Elite', m: 349, perks: ['Everything in Performance', '2 × 1:1 coaching / week', 'VO₂ and lactate testing', 'Nutrition coach'] },
]

export default function App() {
  const root = useRef<HTMLDivElement>(null)
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual')

  useEffect(() => {
    startSmoothScroll()
    const off1 = bindScenes(root.current!)
    const off2 = bindReveals(root.current!)
    // intro: the athlete assembles out of the dust
    const t = setTimeout(() => setBody({ scatter: 0 }), 250)
    document.documentElement.classList.add('ready')
    return () => {
      off1()
      off2()
      clearTimeout(t)
    }
  }, [])

  return (
    <div ref={root}>
      <Stage>
        <ParticleBody />
        <Platform />
      </Stage>
      <Cursor />
      <Nav page="home" />

      <main>
        <section className="hero" data-scene="hero">
          <div className="hero__copy">
            <p className="eyebrow mono" data-reveal>
              <span className="dot" /> Human Performance Lab · Est. 2026
            </p>
            <h1 className="display">
              <Rise text="Performance," />
              <br />
              <Rise text="engineered." className="accent-word" delay={180} />
            </h1>
            <p className="hero__lede" data-reveal>
              A members' training lab where every rep, calorie and heartbeat is measured, then turned into a program written for one body. Yours.
            </p>
            <div className="hero__cta" data-reveal>
              <button className="btn btn--accent" onClick={() => scrollToId('engine')}>
                Run your numbers <span aria-hidden="true">→</span>
              </button>
              <a className="btn btn--ghost" href="/lab/">
                Enter the Lab
              </a>
            </div>
          </div>
          <Telemetry />
          <div className="hero__scroll mono" aria-hidden="true">
            <span>Scroll</span>
            <i />
          </div>
          <div className="hero__coords mono" aria-hidden="true">
            SUBJECT 0429 · 3D SURFACE SCAN · 42,000 POINTS
          </div>
        </section>

        <section className="method" id="method" data-scene="method">
          <div className="wrap">
            <p className="eyebrow mono" data-reveal>
              <span className="dot" /> The method
            </p>
            <h2 className="display display--md">
              <Rise text="We don't guess." />
              <br />
              <Rise text="We measure." className="dim" delay={150} />
            </h2>
            <div className="method__steps">
              {[
                ['01', 'Assess', 'A 3D body scan, a VO₂ max test and a strength baseline in your first 90 minutes.'],
                ['02', 'Program', 'Your coach and your data write a 12-week block. Every set has a reason.'],
                ['03', 'Adapt', 'Each session is logged and each week is recalibrated. The plan learns as you do.'],
              ].map(([n, h, p]) => (
                <article className="step" key={n} data-reveal>
                  <span className="step__n mono">{n}</span>
                  <h3>{h}</h3>
                  <p>{p}</p>
                </article>
              ))}
            </div>
            <div className="stats">
              {[
                [3200, '+', 'members training'],
                [94, '%', 'hit their 12-week goal'],
                [41, '', 'certified coaches'],
                [11, 'k', 'sessions logged weekly'],
              ].map(([v, s, l]) => (
                <div className="stat" key={l as string} data-reveal>
                  <span className="stat__v">
                    <Count value={v as number} />
                    <em>{s}</em>
                  </span>
                  <span className="stat__l mono">{l}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="engine-sec" id="engine" data-scene="engine">
          <div className="wrap">
            <div className="engine-sec__head">
              <p className="eyebrow mono" data-reveal>
                <span className="dot" /> Try an instrument
              </p>
              <h2 className="display display--md">
                <Rise text="Feed it your numbers." />
              </h2>
            </div>
            <div className="engine-sec__body" data-reveal>
              <EnergyEngine compact />
            </div>
          </div>
        </section>

        <section className="programs" id="programs" data-scene="field">
          <div className="wrap">
            <div className="split-head">
              <h2 className="display display--md">
                <Rise text="Four blocks." />
                <br />
                <Rise text="Zero templates." className="dim" delay={120} />
              </h2>
              <p data-reveal>Each program is a starting framework. Your coach adjusts it to your tests, your schedule and how you recover.</p>
            </div>
            <div className="programs__grid">
              {programs.map((p) => (
                <Tilt className="program" key={p.code}>
                  <div data-reveal className="program__inner">
                    <span className="program__code mono">{p.code}</span>
                    <h3>{p.name}</h3>
                    <p>{p.line}</p>
                    <dl className="program__meta mono">
                      <div>
                        <dt>Weeks</dt>
                        <dd>{p.weeks}</dd>
                      </div>
                      <div>
                        <dt>Days / wk</dt>
                        <dd>{p.days}</dd>
                      </div>
                      <div>
                        <dt>Intensity</dt>
                        <dd className="meter" aria-label={`${p.load} of 5`}>
                          {Array.from({ length: 5 }, (_, i) => (
                            <i key={i} className={i < p.load ? 'on' : ''} />
                          ))}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </Tilt>
              ))}
            </div>
          </div>
        </section>

        <section className="lab-teaser" data-scene="field">
          <div className="wrap">
            <div className="split-head">
              <h2 className="display display--md">
                <Rise text="The Lab," />
                <br />
                <Rise text="open to everyone." className="dim" delay={120} />
              </h2>
              <p data-reveal>The same instruments our coaches use, free in your browser. Each one is a live 3D model that responds to your inputs.</p>
            </div>
            <ol className="instruments">
              {instruments.map((i) => (
                <li key={i.n} data-reveal>
                  <a href={i.href}>
                    <span className="mono">{i.n}</span>
                    <b>{i.name}</b>
                    <em className="mono">{i.what}</em>
                    <span className="instruments__go" aria-hidden="true">↗</span>
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="membership" id="membership" data-scene="field">
          <div className="wrap">
            <div className="split-head">
              <h2 className="display display--md">
                <Rise text="Membership." />
              </h2>
              <Segmented
                label="Billing"
                value={billing}
                onChange={setBilling}
                options={[
                  { id: 'monthly', label: 'Monthly' },
                  { id: 'annual', label: <>Annual <span className="save">−20%</span></> },
                ]}
              />
            </div>
            <div className="tiers">
              {tiers.map((t) => (
                <Tilt className={`tier ${t.featured ? 'tier--featured' : ''}`} key={t.name}>
                  <div className="tier__inner" data-reveal>
                    {t.featured && <span className="tier__flag mono">Most chosen</span>}
                    <h3>{t.name}</h3>
                    <p className="tier__price">
                      <span>$</span>
                      <Count value={billing === 'annual' ? Math.round(t.m * 0.8) : t.m} />
                      <small>/ month</small>
                    </p>
                    <p className="tier__bill mono">{billing === 'annual' ? `Billed $${Math.round(t.m * 0.8) * 12} yearly` : 'Cancel anytime'}</p>
                    <ul>
                      {t.perks.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                    <button className={`btn ${t.featured ? 'btn--accent' : 'btn--ghost'} btn--block`}>Start with an assessment</button>
                  </div>
                </Tilt>
              ))}
            </div>
          </div>
        </section>

        <section className="outro" data-scene="outro">
          <div className="wrap outro__inner">
            <h2 className="display">
              <Rise text="Your first scan" />
              <br />
              <Rise text="is on us." className="accent-word" delay={150} />
            </h2>
            <div className="outro__foot" data-reveal>
              <p>Ninety minutes, three tests and a coach who will tell you exactly where you stand.</p>
              <a className="btn btn--accent" href="#membership" onClick={(e) => { e.preventDefault(); scrollToId('membership') }}>
                Book your assessment <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
