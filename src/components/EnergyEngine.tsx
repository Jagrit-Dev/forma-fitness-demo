import { useEffect, useMemo, useRef, useState } from 'react'
import { activityLevels, bmi, bmr, goalAdjust, macros, type Goal, type Sex } from '../lib/fitness'
import { setBody } from '../lib/store'
import { Count, Segmented, Slider } from './ui'

type Activity = (typeof activityLevels)[number]['id']

/**
 * BMR → TDEE → target calories → macros.
 * Every input also re-shapes the particle athlete: weight/height drive its mass and
 * stature, daily burn drives how fast it breathes and how bright it glows.
 */
export function EnergyEngine({ compact = false, live = true }: { compact?: boolean; live?: boolean }) {
  const [sex, setSex] = useState<Sex>('male')
  const [age, setAge] = useState(29)
  const [height, setHeight] = useState(178)
  const [weight, setWeight] = useState(76)
  const [activity, setActivity] = useState<Activity>('moderate')
  const [goal, setGoal] = useState<Goal>('maintain')
  const [busy, setBusy] = useState(false)
  const busyTimer = useRef<number>(0)

  const r = useMemo(() => {
    const base = bmr(sex, weight, height, age)
    const factor = activityLevels.find((a) => a.id === activity)!.factor
    const tdee = base * factor
    const target = tdee * (1 + goalAdjust[goal].kcal)
    return { base, tdee, target, bmi: bmi(weight, height), m: macros(target, weight, goal) }
  }, [sex, age, height, weight, activity, goal])

  useEffect(() => {
    if (!live) return
    setBody({
      bulk: Math.max(-1, Math.min(1, (r.bmi - 22.5) / 7.5)),
      height: Math.max(0.88, Math.min(1.1, 1 + ((height - 178) / 178) * 0.9)),
      energy: Math.max(0, Math.min(1.2, (r.tdee - 1500) / 2600)),
    })
  }, [r, height, live])

  const poke = () => {
    setBusy(true)
    window.clearTimeout(busyTimer.current)
    busyTimer.current = window.setTimeout(() => setBusy(false), 900)
  }
  const wrap =
    <T,>(fn: (v: T) => void) =>
    (v: T) => {
      fn(v)
      poke()
    }

  const kcal = { p: r.m.protein * 4, c: r.m.carbs * 4, f: r.m.fat * 9 }
  const kcalSum = kcal.p + kcal.c + kcal.f || 1
  const bmiBand = r.bmi < 18.5 ? 'Under' : r.bmi < 25 ? 'Healthy' : r.bmi < 30 ? 'Over' : 'High'

  return (
    <div className={`engine ${compact ? 'engine--compact' : ''}`}>
      <div className="engine__inputs panel">
        <div className="panel__head">
          <span className="mono tag">INSTRUMENT 01</span>
          <span className={`mono status ${busy ? 'status--busy' : ''}`}>
            <i /> {busy ? 'RECALIBRATING' : 'LIVE'}
          </span>
        </div>
        <h3 className="panel__title">Energy Engine</h3>
        <p className="panel__lede">Basal metabolic rate, daily burn and a macro split. Move a slider and the figure changes with you.</p>

        <div className="engine__row">
          <Segmented
            label="Sex"
            value={sex}
            onChange={wrap(setSex)}
            options={[
              { id: 'male', label: 'Male' },
              { id: 'female', label: 'Female' },
            ]}
          />
        </div>
        <Slider label="Age" value={age} min={16} max={80} unit="yrs" onChange={wrap(setAge)} />
        <Slider label="Height" value={height} min={145} max={210} unit="cm" onChange={wrap(setHeight)} />
        <Slider label="Weight" value={weight} min={40} max={150} step={0.5} unit="kg" onChange={wrap(setWeight)} format={(v) => v.toFixed(1)} />

        <div className="field">
          <span className="field__label">Training load</span>
          <div className="activity">
            {activityLevels.map((a, i) => (
              <button
                key={a.id}
                type="button"
                className={a.id === activity ? 'on' : ''}
                onClick={() => wrap(setActivity)(a.id)}
                aria-pressed={a.id === activity}
              >
                <span className="activity__bars" aria-hidden="true">
                  {Array.from({ length: 5 }, (_, k) => (
                    <i key={k} className={k <= i ? 'on' : ''} />
                  ))}
                </span>
                <b>{a.label}</b>
                {!compact && <small>{a.note}</small>}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="field__label">Goal</span>
          <Segmented
            label="Goal"
            value={goal}
            onChange={wrap(setGoal)}
            options={[
              { id: 'cut', label: 'Cut −20%' },
              { id: 'maintain', label: 'Maintain' },
              { id: 'bulk', label: 'Build +12%' },
            ]}
          />
        </div>
      </div>

      <div className="engine__out panel panel--glass" aria-live="polite">
        <div className="readout readout--hero">
          <span className="mono readout__k">Daily target</span>
          <span className="readout__v">
            <Count value={Math.round(r.target)} />
            <small>kcal</small>
          </span>
        </div>
        <div className="readout-grid">
          <div className="readout">
            <span className="mono readout__k">BMR</span>
            <span className="readout__v readout__v--sm">
              <Count value={Math.round(r.base)} />
            </span>
            <span className="readout__n">at complete rest</span>
          </div>
          <div className="readout">
            <span className="mono readout__k">TDEE</span>
            <span className="readout__v readout__v--sm">
              <Count value={Math.round(r.tdee)} />
            </span>
            <span className="readout__n">with your training</span>
          </div>
          <div className="readout">
            <span className="mono readout__k">BMI</span>
            <span className="readout__v readout__v--sm">
              <Count value={r.bmi} decimals={1} />
            </span>
            <span className="readout__n">{bmiBand}</span>
          </div>
        </div>

        <div className="macro">
          <div className="macro__bar" aria-hidden="true">
            <i style={{ flexGrow: kcal.p / kcalSum }} className="p" />
            <i style={{ flexGrow: kcal.c / kcalSum }} className="c" />
            <i style={{ flexGrow: kcal.f / kcalSum }} className="f" />
          </div>
          <div className="macro__legend">
            <span>
              <i className="p" /> Protein <b><Count value={r.m.protein} />g</b>
            </span>
            <span>
              <i className="c" /> Carbs <b><Count value={r.m.carbs} />g</b>
            </span>
            <span>
              <i className="f" /> Fat <b><Count value={r.m.fat} />g</b>
            </span>
          </div>
        </div>
        <p className="fineprint">Mifflin–St Jeor equation. These are estimates, not medical advice. Your coach adjusts them after a real assessment.</p>
      </div>
    </div>
  )
}
