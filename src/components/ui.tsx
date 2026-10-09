import { Fragment, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

/** Number that eases toward its value instead of jumping. */
export function Count({ value, decimals = 0, className }: { value: number; decimals?: number; className?: string }) {
  const [shown, setShown] = useState(value)
  const cur = useRef(value)
  useEffect(() => {
    let raf = 0
    const tick = () => {
      cur.current += (value - cur.current) * 0.14
      if (Math.abs(value - cur.current) < Math.pow(10, -decimals) / 2) cur.current = value
      setShown(cur.current)
      if (cur.current !== value) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, decimals])
  return (
    <span className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {shown.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
    </span>
  )
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
  format,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit: string
  onChange: (v: number) => void
  format?: (v: number) => string
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <label className="slider" style={{ '--pct': `${pct}%` } as CSSProperties}>
      <span className="slider__head">
        <span className="slider__label">{label}</span>
        <span className="slider__value">
          {format ? format(value) : value}
          <small>{unit}</small>
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="slider__ticks" aria-hidden="true">
        {Array.from({ length: 21 }, (_, i) => (
          <i key={i} className={i * 5 <= pct ? 'on' : ''} />
        ))}
      </span>
    </label>
  )
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { id: T; label: ReactNode }[]
  value: T
  onChange: (v: T) => void
  label: string
}) {
  const idx = Math.max(0, options.findIndex((o) => o.id === value))
  return (
    <div className="seg" role="radiogroup" aria-label={label} style={{ '--n': options.length, '--i': idx } as CSSProperties}>
      <span className="seg__thumb" aria-hidden="true" />
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={o.id === value}
          className={o.id === value ? 'on' : ''}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Splits a line into words that rise in one after another when the parent gets .is-in */
export function Rise({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  return (
    <span className={`rise ${className ?? ''}`} data-reveal>
      {text.split(' ').map((w, i) => (
        <Fragment key={i}>
          <span className="rise__mask">
            <span className="rise__word" style={{ transitionDelay: `${delay + i * 55}ms` }}>
              {w}
            </span>
          </span>{' '}
        </Fragment>
      ))}
    </span>
  )
}

/** Card that tilts toward the pointer. */
export function Tilt({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  return (
    <div
      ref={ref}
      className={`tilt ${className ?? ''}`}
      onPointerMove={(e) => {
        const r = ref.current!.getBoundingClientRect()
        const x = (e.clientX - r.left) / r.width - 0.5
        const y = (e.clientY - r.top) / r.height - 0.5
        ref.current!.style.setProperty('--rx', `${-y * 8}deg`)
        ref.current!.style.setProperty('--ry', `${x * 10}deg`)
        ref.current!.style.setProperty('--mx', `${(x + 0.5) * 100}%`)
        ref.current!.style.setProperty('--my', `${(y + 0.5) * 100}%`)
      }}
      onPointerLeave={() => {
        ref.current!.style.setProperty('--rx', '0deg')
        ref.current!.style.setProperty('--ry', '0deg')
      }}
    >
      {children}
    </div>
  )
}
