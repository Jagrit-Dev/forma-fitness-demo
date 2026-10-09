/*
 * One mutable object shared by the DOM and the WebGL scene.
 * UI code writes targets; the render loop eases the live values toward them,
 * so dragging a slider never triggers a React re-render of the canvas.
 */
export const body = {
  target: {
    bulk: 0, // -1 lean … +1 heavy
    height: 1, // vertical scale
    scatter: 0, // 0 solid figure … 1 dissolved into a field
    energy: 0.35, // pulse speed + glow, follows TDEE
    x: 0.9, // world-space offset of the figure
    y: 0,
    scale: 1,
    spin: 0, // extra rotation (radians)
    zone: -1, // highlighted muscle zone (-1 none, see ZONES in bodyGeometry)
    scan: 1, // strength of the scanning band
  },
  live: {
    bulk: 0,
    height: 1,
    scatter: 0.9,
    energy: 0.35,
    x: 0.9,
    y: 0,
    scale: 1,
    spin: 0,
    zone: -1,
    scan: 1,
  },
  pointer: { x: 0, y: 0 },
}

export type BodyKey = keyof typeof body.target

export function setBody(patch: Partial<typeof body.target>) {
  Object.assign(body.target, patch)
}

if (typeof window !== 'undefined') {
  window.addEventListener('pointermove', (e) => {
    body.pointer.x = (e.clientX / window.innerWidth) * 2 - 1
    body.pointer.y = -(e.clientY / window.innerHeight) * 2 + 1
  })
}

if (import.meta.env.DEV && typeof window !== 'undefined') (window as unknown as { __body: typeof body }).__body = body
