# 02 — FORMA Human Performance Lab

A fictional premium training lab where the website *is* the instrument. Instead of a scroll-driven
video, every tool feeds a live WebGL scene: move a slider and a 42,000-point particle athlete changes
build, stature and energy in real time.

**Stack:** Vite · React 19 · React Three Fiber · three.js · postprocessing · GSAP ScrollTrigger · Lenis.
Everything runs client-side; no backend.

## Pages

| Page | What it does |
|---|---|
| `/` | Cinematic landing: the athlete assembles from dust, dissolves into a starfield on scroll and re-poses per section. Includes a live Energy Engine, programs, lab teaser, membership pricing toggle. |
| `/lab/` | Four instruments, each with its own 3D scene (hash-routed: `#energy`, `#strength`, `#pulse`, `#atlas`). |

## Instruments

| # | Instrument | Maths | 3D |
|---|---|---|---|
| 01 | Energy Engine | Mifflin–St Jeor BMR → TDEE → goal calories → macros | Particle athlete: BMI drives mass, height drives stature, TDEE drives breathing + glow |
| 02 | Bar Loader | 1RM (mean of Epley + Brzycki), % chart, plate math | Chrome barbell; colour-coded Olympic plates spin onto each sleeve |
| 03 | Pulse Zones | Karvonen zones, Tanaka max HR | Particle heart beating lub-dub at the zone BPM + canvas ECG trace |
| 04 | Muscle Atlas | Exercise library per muscle group | Click the figure to light a muscle zone; athlete turns for back/glutes |

## Layout

```
index.html, lab/index.html   two Vite entries
src/scene/bodyGeometry.ts    procedural athlete: capsules, ellipsoids, lofted torso, 9 muscle zones
src/scene/ParticleBody.tsx   GLSL: bulk/height morph, breathing, scan band, cursor repulsion, dissolve
src/scene/Stage.tsx          Canvas, ripple platform, camera parallax, bloom/noise/vignette
src/scene/Barbell.tsx        lathed plates, RoomEnvironment reflections
src/scene/Heart.tsx          implicit-surface heart sampled into points
src/lib/fitness.ts           all formulas
src/lib/store.ts             shared mutable state between DOM and the render loop
src/lib/scroll.ts            Lenis + ScrollTrigger scene choreography and reveals
src/lab/                     Lab page and instrument panels
```

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # -> dist/
npm run deploy   # build + wrangler deploy (Cloudflare Workers static assets)
```

Calculators give estimates, not medical advice. Brand, address, prices and stats are fictional.
