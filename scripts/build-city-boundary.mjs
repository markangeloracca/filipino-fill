#!/usr/bin/env node
// Builds apps/web/public/data/calgary-boundary.geojson from the City of Calgary's
// official "City Boundary" open dataset (erra-cqp9), simplified for the web.
//
//   node scripts/build-city-boundary.mjs
//
// Contains information licensed under the Open Government Licence – City of Calgary.

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SOURCE = 'https://data.calgary.ca/resource/erra-cqp9.geojson'
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'apps', 'web', 'public', 'data', 'calgary-boundary.geojson')
const TOLERANCE_DEG = 0.0001 // ≈ 7–11 m at Calgary's latitude: invisible at city zooms
const PRECISION = 5 // ≈ 1 m

/** Perpendicular distance from p to segment ab, in degrees (fine at this scale). */
function segDist(p, a, b) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  if (dx === 0 && dy === 0) return Math.hypot(p[0] - a[0], p[1] - a[1])
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))
}

/** Iterative Douglas–Peucker. */
function simplify(points, tol) {
  if (points.length < 3) return points
  const keep = new Uint8Array(points.length)
  keep[0] = keep[points.length - 1] = 1
  const stack = [[0, points.length - 1]]
  while (stack.length) {
    const [start, end] = stack.pop()
    let maxD = 0
    let idx = -1
    for (let i = start + 1; i < end; i++) {
      const d = segDist(points[i], points[start], points[end])
      if (d > maxD) {
        maxD = d
        idx = i
      }
    }
    if (maxD > tol && idx !== -1) {
      keep[idx] = 1
      stack.push([start, idx], [idx, end])
    }
  }
  return points.filter((_, i) => keep[i])
}

const round = (n) => Number(n.toFixed(PRECISION))

function simplifyRing(ring) {
  const out = simplify(ring, TOLERANCE_DEG).map(([x, y]) => [round(x), round(y)])
  // A valid linear ring needs ≥ 4 positions and must be closed.
  if (out.length < 4) return null
  const [fx, fy] = out[0]
  const [lx, ly] = out[out.length - 1]
  if (fx !== lx || fy !== ly) out.push([fx, fy])
  return out
}

const res = await fetch(SOURCE)
if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`)
const source = await res.json()

const polygons = []
let before = 0
let after = 0
for (const feature of source.features ?? []) {
  const geom = feature.geometry
  const polys = geom?.type === 'MultiPolygon' ? geom.coordinates : geom?.type === 'Polygon' ? [geom.coordinates] : []
  for (const poly of polys) {
    const rings = []
    for (const ring of poly) {
      before += ring.length
      const s = simplifyRing(ring)
      if (s) {
        after += s.length
        rings.push(s)
      }
    }
    if (rings.length) polygons.push(rings)
  }
}
if (!polygons.length) throw new Error('No polygon geometry found in source')

const output = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        name: 'City of Calgary',
        source: SOURCE,
        license: 'Open Government Licence – City of Calgary',
        fetched: new Date().toISOString().slice(0, 10),
      },
      geometry: { type: 'MultiPolygon', coordinates: polygons },
    },
  ],
}

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, JSON.stringify(output))
console.log(`Simplified ${before} → ${after} vertices; wrote ${OUT}`)
