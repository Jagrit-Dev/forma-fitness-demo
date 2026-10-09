export type Sex = 'male' | 'female'
export type Goal = 'cut' | 'maintain' | 'bulk'

export const activityLevels = [
  { id: 'sedentary', label: 'Desk-bound', note: 'Little or no training', factor: 1.2 },
  { id: 'light', label: 'Light', note: '1–3 sessions / week', factor: 1.375 },
  { id: 'moderate', label: 'Moderate', note: '3–5 sessions / week', factor: 1.55 },
  { id: 'high', label: 'High', note: '6–7 sessions / week', factor: 1.725 },
  { id: 'athlete', label: 'Athlete', note: 'Twice daily / physical job', factor: 1.9 },
] as const

/** Mifflin–St Jeor. Weight kg, height cm. */
export function bmr(sex: Sex, weight: number, height: number, age: number) {
  return 10 * weight + 6.25 * height - 5 * age + (sex === 'male' ? 5 : -161)
}

export const goalAdjust: Record<Goal, { kcal: number; label: string; protein: number; fat: number }> = {
  cut: { kcal: -0.2, label: 'Cut', protein: 2.2, fat: 0.8 },
  maintain: { kcal: 0, label: 'Maintain', protein: 1.8, fat: 0.9 },
  bulk: { kcal: 0.12, label: 'Build', protein: 1.9, fat: 1.0 },
}

export function macros(target: number, weight: number, goal: Goal) {
  const g = goalAdjust[goal]
  const protein = Math.round(weight * g.protein)
  const fat = Math.round(weight * g.fat)
  const carbs = Math.max(0, Math.round((target - protein * 4 - fat * 9) / 4))
  return { protein, fat, carbs }
}

export function bmi(weight: number, height: number) {
  const m = height / 100
  return weight / (m * m)
}

/** One-rep max: mean of Epley and Brzycki, which agree well under 10 reps. */
export function oneRepMax(weight: number, reps: number) {
  if (reps <= 1) return weight
  const epley = weight * (1 + reps / 30)
  const brzycki = weight * (36 / (37 - Math.min(reps, 36)))
  return (epley + brzycki) / 2
}

export const repTable = [1, 2, 3, 5, 8, 10, 12]
export const pctOf1RM = (reps: number) => (reps <= 1 ? 1 : 1 / (1 + reps / 30))

/** Karvonen heart-rate zones from age and resting HR. */
export function hrZones(age: number, resting: number) {
  const max = Math.round(208 - 0.7 * age) // Tanaka
  const reserve = max - resting
  const bands = [
    { name: 'Recovery', range: [0.5, 0.6], use: 'Active rest, warm-ups' },
    { name: 'Aerobic base', range: [0.6, 0.7], use: 'Long, easy volume; fat oxidation' },
    { name: 'Tempo', range: [0.7, 0.8], use: 'Sustained efforts, aerobic power' },
    { name: 'Threshold', range: [0.8, 0.9], use: 'Lactate threshold intervals' },
    { name: 'VO₂ max', range: [0.9, 1.0], use: 'Short, maximal repeats' },
  ]
  return {
    max,
    zones: bands.map((b) => ({
      ...b,
      lo: Math.round(resting + reserve * b.range[0]),
      hi: Math.round(resting + reserve * b.range[1]),
    })),
  }
}

/** Standard Olympic plates in kg with the colours lifters know them by. */
export const plates = [
  { kg: 25, color: '#e5383b', w: 0.075, r: 0.3 },
  { kg: 20, color: '#2f6bff', w: 0.062, r: 0.3 },
  { kg: 15, color: '#f5c518', w: 0.05, r: 0.3 },
  { kg: 10, color: '#2fbf71', w: 0.04, r: 0.3 },
  { kg: 5, color: '#e8e8e8', w: 0.03, r: 0.2 },
  { kg: 2.5, color: '#1b1b1b', w: 0.024, r: 0.16 },
  { kg: 1.25, color: '#9aa3ad', w: 0.02, r: 0.13 },
]

export function loadBar(total: number, bar = 20) {
  let side = Math.max(0, (total - bar) / 2)
  const out: typeof plates = []
  for (const p of plates) {
    while (side >= p.kg - 1e-6 && out.length < 12) {
      out.push(p)
      side -= p.kg
    }
  }
  return out
}
