// Builds the compact 3D model files for the "Inside the brain and the heart" section.
//
//   node tools/build-anatomy.mjs <folder-with-BodyParts3D>
//
// The folder must hold the BodyParts3D download: `obj/partof_BP3D_4.0_obj_99/*.obj` (from
// partof_BP3D_4.0_obj_99.zip) and `partof_element_parts.txt`, both from
// https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html
//
// What it does to the original data (this is the "adaptation" the licence asks us to mention):
//   merges the small mesh files that make up each named part, trims vessels that run far away from
//   the heart, smooths the surface a little, moves everything into one coordinate system, shrinks it
//   to 16-bit numbers, and adds one simplified almond shape for the amygdala (BodyParts3D has none).
// The output goes to assets/anatomy/ (brain.json + brain.bin, heart.json + heart.bin).
//
// BodyParts3D, (c) The Database Center for Life Science, licensed under CC Attribution-Share Alike 2.1 Japan.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = process.argv[2]
if (!SRC) { console.error('Usage: node tools/build-anatomy.mjs <folder with obj/ and partof_element_parts.txt>'); process.exit(1) }
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../assets/anatomy')
fs.mkdirSync(OUT, { recursive: true })

/* ---------- Reading the data ---------- */
const rows = fs.readFileSync(path.join(SRC, 'partof_element_parts.txt'), 'utf8').split(/\r?\n/).slice(1).filter(Boolean).map((l) => l.split('\t'))
const elements = new Map()
for (const [, name, file] of rows) { if (!elements.has(name)) elements.set(name, []); elements.get(name).push(file) }

function readObj(file) {
  const p = path.join(SRC, 'obj', 'partof_BP3D_4.0_obj_99', file + '.obj')
  const v = [], f = []
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    if (line.startsWith('v ')) { const a = line.trim().split(/\s+/); v.push(+a[1], +a[2], +a[3]) }
    else if (line.startsWith('f ')) { const a = line.trim().split(/\s+/).slice(1).map((s) => parseInt(s.split('/')[0], 10) - 1); for (let i = 1; i < a.length - 1; i++) f.push(a[0], a[i], a[i + 1]) }
  }
  return { v, f }
}

// Join identical corners, so the surface can be smoothed and shaded as one piece.
function weld({ v, f }) {
  const map = new Map(), nv = [], nf = []
  for (const i of f) {
    const x = v[3 * i], y = v[3 * i + 1], z = v[3 * i + 2]
    const key = `${Math.round(x * 100)},${Math.round(y * 100)},${Math.round(z * 100)}`
    let id = map.get(key)
    if (id === undefined) { id = nv.length / 3; map.set(key, id); nv.push(x, y, z) }
    nf.push(id)
  }
  const out = []
  for (let t = 0; t < nf.length; t += 3) if (nf[t] !== nf[t + 1] && nf[t + 1] !== nf[t + 2] && nf[t] !== nf[t + 2]) out.push(nf[t], nf[t + 1], nf[t + 2])
  return { v: nv, f: out }
}

// Taubin smoothing: softens the faceted look without shrinking the shape.
function smooth(m, passes = 6) {
  const n = m.v.length / 3, nb = Array.from({ length: n }, () => new Set())
  for (let t = 0; t < m.f.length; t += 3) for (let k = 0; k < 3; k++) { const a = m.f[t + k], b = m.f[t + (k + 1) % 3]; nb[a].add(b); nb[b].add(a) }
  const step = (lambda) => {
    const out = m.v.slice()
    for (let i = 0; i < n; i++) {
      if (!nb[i].size) continue
      let x = 0, y = 0, z = 0
      nb[i].forEach((j) => { x += m.v[3 * j]; y += m.v[3 * j + 1]; z += m.v[3 * j + 2] })
      const c = nb[i].size
      out[3 * i] += lambda * (x / c - m.v[3 * i]); out[3 * i + 1] += lambda * (y / c - m.v[3 * i + 1]); out[3 * i + 2] += lambda * (z / c - m.v[3 * i + 2])
    }
    m.v = out
  }
  for (let p = 0; p < passes; p++) { step(0.5); step(-0.53) }
  return m
}

// Keep only the triangles whose middle passes `keep`, then drop the corners nobody uses.
function trim(m, keep) {
  const f = []
  for (let t = 0; t < m.f.length; t += 3) {
    const [a, b, c] = [m.f[t], m.f[t + 1], m.f[t + 2]]
    const cx = (m.v[3 * a] + m.v[3 * b] + m.v[3 * c]) / 3, cy = (m.v[3 * a + 1] + m.v[3 * b + 1] + m.v[3 * c + 1]) / 3, cz = (m.v[3 * a + 2] + m.v[3 * b + 2] + m.v[3 * c + 2]) / 3
    if (keep(cx, cy, cz)) f.push(a, b, c)
  }
  const map = new Map(), v = [], nf = []
  for (const i of f) { let id = map.get(i); if (id === undefined) { id = v.length / 3; map.set(i, id); v.push(m.v[3 * i], m.v[3 * i + 1], m.v[3 * i + 2]) } nf.push(id) }
  return { v, f: nf }
}

function merge(list) {
  const v = [], f = []
  for (const m of list) { const base = v.length / 3; v.push(...m.v); for (const i of m.f) f.push(base + i) }
  return { v, f }
}

// Cut a mesh with a flat plane (keeping the side where the value is at least `at`, or at most it when
// `above` is false). Triangles the plane crosses are split exactly, so the cut edge is clean.
function clipPlane(m, axis, at, above = true) {
  const out = { v: [], f: [] }
  const sgn = above ? 1 : -1
  const d = (i) => (m.v[3 * i + axis] - at) * sgn
  const push = (p) => { out.f.push(out.v.length / 3); out.v.push(p[0], p[1], p[2]) }
  const get = (i) => [m.v[3 * i], m.v[3 * i + 1], m.v[3 * i + 2]]
  const cross = (i, j) => { const a = get(i), b = get(j), t = d(i) / (d(i) - d(j)); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t] }
  for (let t = 0; t < m.f.length; t += 3) {
    const tri = [m.f[t], m.f[t + 1], m.f[t + 2]]
    const inside = tri.filter((i) => d(i) >= 0)
    if (inside.length === 3) tri.forEach((i) => push(get(i)))
    else if (inside.length === 0) continue
    else {
      // walk round the triangle, collecting the corners that stay and the points where an edge meets the plane
      const poly = []
      for (let k = 0; k < 3; k++) {
        const a = tri[k], b = tri[(k + 1) % 3]
        if (d(a) >= 0) poly.push(get(a))
        if ((d(a) >= 0) !== (d(b) >= 0)) poly.push(cross(a, b))
      }
      for (let k = 1; k < poly.length - 1; k++) { push(poly[0]); push(poly[k]); push(poly[k + 1]) }
    }
  }
  return weld(out)
}

// Grow a closed shape outwards by `mm` along its surface normals. BodyParts3D stores each ventricle as the
// blood-filled space inside it, not as muscle; growing that space outwards gives the muscle wall, and the
// coronary arteries (which run 6 to 10 mm outside it) then sit right on the surface.
function inflate(m, mm) {
  const n = new Float64Array(m.v.length)
  for (let t = 0; t < m.f.length; t += 3) {
    const [a, b, c] = [m.f[t], m.f[t + 1], m.f[t + 2]]
    const ux = m.v[3 * b] - m.v[3 * a], uy = m.v[3 * b + 1] - m.v[3 * a + 1], uz = m.v[3 * b + 2] - m.v[3 * a + 2]
    const vx = m.v[3 * c] - m.v[3 * a], vy = m.v[3 * c + 1] - m.v[3 * a + 1], vz = m.v[3 * c + 2] - m.v[3 * a + 2]
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx
    for (const i of [a, b, c]) { n[3 * i] += nx; n[3 * i + 1] += ny; n[3 * i + 2] += nz }
  }
  // make sure the normals point outwards (away from the middle of the shape)
  const cnt = m.v.length / 3
  let cx = 0, cy = 0, cz = 0
  for (let i = 0; i < m.v.length; i += 3) { cx += m.v[i]; cy += m.v[i + 1]; cz += m.v[i + 2] }
  cx /= cnt; cy /= cnt; cz /= cnt
  let outward = 0
  for (let i = 0; i < cnt; i++) outward += (m.v[3 * i] - cx) * n[3 * i] + (m.v[3 * i + 1] - cy) * n[3 * i + 1] + (m.v[3 * i + 2] - cz) * n[3 * i + 2]
  const sign = outward < 0 ? -1 : 1
  const v = m.v.slice()
  for (let i = 0; i < cnt; i++) {
    const len = Math.hypot(n[3 * i], n[3 * i + 1], n[3 * i + 2]) || 1
    v[3 * i] += (sign * n[3 * i] / len) * mm; v[3 * i + 1] += (sign * n[3 * i + 1] / len) * mm; v[3 * i + 2] += (sign * n[3 * i + 2] / len) * mm
  }
  return { v, f: m.f }
}

// Fill the holes in a surface (where a vessel or a valve opens into it) with a gently domed lid, so the
// shape is closed and looks like one organ instead of a shell with windows in it.
function closeHoles(m, dome = 0.3) {
  const count = new Map(), dir = new Map()
  for (let t = 0; t < m.f.length; t += 3) for (let k = 0; k < 3; k++) {
    const a = m.f[t + k], b = m.f[t + ((k + 1) % 3)]
    const key = a < b ? a + '_' + b : b + '_' + a
    count.set(key, (count.get(key) || 0) + 1); dir.set(key, [a, b])
  }
  const next = new Map()
  count.forEach((c, key) => { if (c === 1) { const [a, b] = dir.get(key); if (!next.has(a)) next.set(a, []); next.get(a).push(b) } })
  const v = m.v.slice(), f = m.f.slice()
  let cx = 0, cy = 0, cz = 0; const n = m.v.length / 3
  for (let i = 0; i < m.v.length; i += 3) { cx += m.v[i]; cy += m.v[i + 1]; cz += m.v[i + 2] }
  cx /= n; cy /= n; cz /= n
  const used = new Set()
  for (const start of next.keys()) {
    if (used.has(start)) continue
    const loop = [start]; used.add(start)
    let cur = start
    for (let guard = 0; guard < 5000; guard++) {
      const outs = (next.get(cur) || []).filter((x) => !used.has(x) || x === start)
      if (!outs.length) break
      cur = outs[0]
      if (cur === start) break
      loop.push(cur); used.add(cur)
    }
    if (loop.length < 3) continue
    let mx = 0, my = 0, mz = 0
    for (const i of loop) { mx += v[3 * i]; my += v[3 * i + 1]; mz += v[3 * i + 2] }
    mx /= loop.length; my /= loop.length; mz /= loop.length
    // the lid's direction: away from the middle of the whole shape
    let ox = mx - cx, oy = my - cy, oz = mz - cz; const ol = Math.hypot(ox, oy, oz) || 1
    let rad = 0; for (const i of loop) rad += Math.hypot(v[3 * i] - mx, v[3 * i + 1] - my, v[3 * i + 2] - mz); rad /= loop.length
    const apex = v.length / 3
    v.push(mx + (ox / ol) * rad * dome, my + (oy / ol) * rad * dome, mz + (oz / ol) * rad * dome)
    for (let k = 0; k < loop.length; k++) f.push(loop[(k + 1) % loop.length], loop[k], apex)
  }
  return { v, f }
}

// Join corners that are almost in the same place (the small gaps between neighbouring mesh files).
function weldNear(m, eps) {
  const cell = new Map(), rep = new Array(m.v.length / 3), nv = []
  const key = (x, y, z) => Math.floor(x / eps) + ',' + Math.floor(y / eps) + ',' + Math.floor(z / eps)
  for (let i = 0; i < m.v.length / 3; i++) {
    const x = m.v[3 * i], y = m.v[3 * i + 1], z = m.v[3 * i + 2]
    const cx = Math.floor(x / eps), cy = Math.floor(y / eps), cz = Math.floor(z / eps)
    let found = -1
    search: for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      const list = cell.get((cx + dx) + ',' + (cy + dy) + ',' + (cz + dz)); if (!list) continue
      for (const j of list) if (Math.hypot(nv[3 * j] - x, nv[3 * j + 1] - y, nv[3 * j + 2] - z) < eps) { found = j; break search }
    }
    if (found < 0) { found = nv.length / 3; nv.push(x, y, z); const k = key(x, y, z); if (!cell.has(k)) cell.set(k, []); cell.get(k).push(found) }
    rep[i] = found
  }
  const f = []
  for (let t = 0; t < m.f.length; t += 3) { const a = rep[m.f[t]], b = rep[m.f[t + 1]], c = rep[m.f[t + 2]]; if (a !== b && b !== c && a !== c) f.push(a, b, c) }
  return { v: nv, f }
}

// Rebuild a tube-shaped part (an artery or a vein) as ONE smooth, continuous tube that follows the real
// path and width of the data. This removes the seams where BodyParts3D cuts a vessel into segments, and
// the far end narrows and closes smoothly instead of ending in a chopped-off cut.
function vesselTube(m, o = {}) {
  const K = o.slices ?? 56, R = 26, taperFar = o.taperFar ?? 0.5, extend = o.extendNear ?? 3
  const w = weldNear(m, o.joinEps ?? 2.2)
  const n = w.v.length / 3
  const adj = Array.from({ length: n }, () => [])
  for (let t = 0; t < w.f.length; t += 3) for (let k = 0; k < 3; k++) {
    const a = w.f[t + k], b = w.f[t + ((k + 1) % 3)]
    const d = Math.hypot(w.v[3 * a] - w.v[3 * b], w.v[3 * a + 1] - w.v[3 * b + 1], w.v[3 * a + 2] - w.v[3 * b + 2])
    adj[a].push([b, d]); adj[b].push([a, d])
  }
  const dijkstra = (src) => {
    const dist = new Float64Array(n).fill(Infinity); dist[src] = 0
    const heap = [[0, src]]
    const push = (e) => { heap.push(e); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p } }
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { let l = 2 * i + 1, r = l + 1, s = i; if (l < heap.length && heap[l][0] < heap[s][0]) s = l; if (r < heap.length && heap[r][0] < heap[s][0]) s = r; if (s === i) break; [heap[s], heap[i]] = [heap[i], heap[s]]; i = s } } return top }
    while (heap.length) { const [d, u] = pop(); if (d > dist[u]) continue; for (const [v2, w2] of adj[u]) if (d + w2 < dist[v2]) { dist[v2] = d + w2; push([dist[v2], v2]) } }
    return dist
  }
  const far = (dist) => { let b = 0, bd = -1; for (let i = 0; i < n; i++) if (dist[i] !== Infinity && adj[i].length && dist[i] > bd) { bd = dist[i]; b = i } return b }
  const first = adj.findIndex((a) => a.length)
  const A0 = far(dijkstra(first)), dA = dijkstra(A0), B0 = far(dA)
  const reach = dA.reduce((c, d) => c + (d !== Infinity ? 1 : 0), 0)
  if (reach < n * 0.9 && !o.quiet) console.warn(`  note: only ${reach} of ${n} corners are joined; tube built from the main piece`)
  // which end is nearer the heart? That one stays wide and is tucked slightly into the chamber.
  const pt = (i) => [w.v[3 * i], w.v[3 * i + 1], w.v[3 * i + 2]]
  const dh = (p) => Math.hypot(p[0] - heartCentre[0], p[1] - heartCentre[1], p[2] - heartCentre[2])
  let dist = dA, maxD = dA[B0]
  if (dh(pt(B0)) < dh(pt(A0))) { dist = dijkstra(B0); maxD = dist[A0] }
  // slices along the length
  const sum = Array.from({ length: K }, () => ({ x: 0, y: 0, z: 0, c: 0 }))
  const bin = new Int32Array(n).fill(-1)
  for (let i = 0; i < n; i++) { if (dist[i] === Infinity) continue; const k = Math.min(K - 1, Math.floor((dist[i] / maxD) * K)); bin[i] = k; const s = sum[k]; s.x += w.v[3 * i]; s.y += w.v[3 * i + 1]; s.z += w.v[3 * i + 2]; s.c++ }
  let C = sum.map((s) => (s.c ? [s.x / s.c, s.y / s.c, s.z / s.c] : null))
  for (let k = 0; k < K; k++) if (!C[k]) { let a = k - 1, b = k + 1; while (a >= 0 && !C[a]) a--; while (b < K && !C[b]) b++; C[k] = a >= 0 && b < K ? C[a].map((x, j) => (x + C[b][j]) / 2) : C[a >= 0 ? a : b] }
  for (let pass = 0; pass < (o.smoothC ?? 4); pass++) C = C.map((c, k) => (k === 0 || k === K - 1 ? c : c.map((x, j) => (C[k - 1][j] + 2 * x + C[k + 1][j]) / 4)))
  const tan = (k) => { const a = C[Math.max(0, k - 1)], b = C[Math.min(K - 1, k + 1)]; const t = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]; const l = Math.hypot(...t) || 1; return t.map((x) => x / l) }
  const rad = new Array(K).fill(0), rc = new Array(K).fill(0)
  for (let i = 0; i < n; i++) {
    const k = bin[i]; if (k < 0) continue
    const t = tan(k), d = [w.v[3 * i] - C[k][0], w.v[3 * i + 1] - C[k][1], w.v[3 * i + 2] - C[k][2]]
    const along = d[0] * t[0] + d[1] * t[1] + d[2] * t[2]
    rad[k] += Math.sqrt(Math.max(0, d[0] * d[0] + d[1] * d[1] + d[2] * d[2] - along * along)); rc[k]++
  }
  let r = rad.map((x, k) => (rc[k] ? x / rc[k] : 0))
  for (let k = 0; k < K; k++) if (!r[k]) r[k] = r[k - 1] ?? r[k + 1] ?? 5
  for (let pass = 0; pass < 5; pass++) r = r.map((x, k) => (k === 0 || k === K - 1 ? x : (r[k - 1] + 2 * x + r[k + 1]) / 4))
  // Real vessels run at a fairly even width. `uniform` uses the typical width all along; otherwise the width
  // may vary but is kept within sensible limits so the data's bumps do not become blobs.
  const sorted = r.slice().sort((a, b) => a - b), med = sorted[Math.floor(sorted.length / 2)]
  r = o.uniform ? r.map(() => med) : r.map((x) => Math.min(med * 1.35, Math.max(med * 0.7, x)))
  r = r.map((x) => x * (o.radiusScale ?? 1))
  // slide the near end a little into the chamber so there is never a gap
  const t0 = tan(0); C[0] = C[0].map((x, j) => x - t0[j] * extend)
  // finer samples (Catmull-Rom), a smooth narrowing towards the far end
  const M = K * 2, at = (arr, u) => { const f = u * (K - 1), i = Math.min(K - 2, Math.floor(f)), t = f - i; const p0 = arr[Math.max(0, i - 1)], p1 = arr[i], p2 = arr[i + 1], p3 = arr[Math.min(K - 1, i + 2)]; const cr = (a, b, c, d) => 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t); return Array.isArray(p1) ? p1.map((_, j) => cr(p0[j], p1[j], p2[j], p3[j])) : cr(p0, p1, p2, p3) }
  const ring = [], rads = []
  for (let i = 0; i < M; i++) {
    const u = i / (M - 1)
    const taper = u > 0.7 ? 1 - (1 - taperFar) * Math.pow((u - 0.7) / 0.3, 2) : 1
    ring.push(at(C, u)); rads.push(at(r, u) * taper)
  }
  // frames that do not twist: carry the first side-direction along the path
  const T = ring.map((p, i) => { const a = ring[Math.max(0, i - 1)], b = ring[Math.min(M - 1, i + 1)]; const t = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]; const l = Math.hypot(...t) || 1; return t.map((x) => x / l) })
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
  const norm = (a) => { const l = Math.hypot(...a) || 1; return a.map((x) => x / l) }
  let N = norm(cross(T[0], Math.abs(T[0][0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]))
  const frames = []
  for (let i = 0; i < M; i++) {
    if (i > 0) { const d = T[i - 1][0] * T[i][0] + T[i - 1][1] * T[i][1] + T[i - 1][2] * T[i][2]; const proj = N.map((x, j) => x - T[i][j] * (N[0] * T[i][0] + N[1] * T[i][1] + N[2] * T[i][2])); N = norm(proj); void d }
    frames.push([N, norm(cross(T[i], N))])
  }
  // build the surface: rings along the length, and a rounded dome closing each end
  const v = [], f = [], CAP = 6
  const addRing = (c, rr, [a, b]) => { const base = v.length / 3; for (let j = 0; j < R; j++) { const ang = (j / R) * Math.PI * 2, ca = Math.cos(ang), sa = Math.sin(ang); v.push(c[0] + (a[0] * ca + b[0] * sa) * rr, c[1] + (a[1] * ca + b[1] * sa) * rr, c[2] + (a[2] * ca + b[2] * sa) * rr) } return base }
  const rings = []
  for (let c = CAP; c >= 1; c--) { const ph = (c / (CAP + 1)) * (Math.PI / 2); rings.push(addRing(ring[0].map((x, j) => x - T[0][j] * rads[0] * Math.sin(ph) * 0.9), rads[0] * Math.cos(ph), frames[0])) }
  for (let i = 0; i < M; i++) rings.push(addRing(ring[i], rads[i], frames[i]))
  for (let c = 1; c <= CAP; c++) { const ph = (c / (CAP + 1)) * (Math.PI / 2); rings.push(addRing(ring[M - 1].map((x, j) => x + T[M - 1][j] * rads[M - 1] * Math.sin(ph) * 1.1), rads[M - 1] * Math.cos(ph), frames[M - 1])) }
  const tip0 = v.length / 3; v.push(...ring[0].map((x, j) => x - T[0][j] * rads[0] * 0.9))
  const tip1 = v.length / 3; v.push(...ring[M - 1].map((x, j) => x + T[M - 1][j] * rads[M - 1] * 1.1))
  for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < R; j++) { const a = rings[i] + j, b = rings[i] + (j + 1) % R, c2 = rings[i + 1] + j, d = rings[i + 1] + (j + 1) % R; f.push(a, c2, b, b, c2, d) }
  for (let j = 0; j < R; j++) { f.push(tip0, rings[0] + (j + 1) % R, rings[0] + j); const last = rings[rings.length - 1]; f.push(tip1, last + j, last + (j + 1) % R) }
  // make sure the faces point outwards
  let vol = 0
  for (let t = 0; t < f.length; t += 3) { const a = f[t] * 3, b = f[t + 1] * 3, c = f[t + 2] * 3; vol += (v[a] * (v[b + 1] * v[c + 2] - v[b + 2] * v[c + 1]) - v[a + 1] * (v[b] * v[c + 2] - v[b + 2] * v[c]) + v[a + 2] * (v[b] * v[c + 1] - v[b + 1] * v[c])) / 6 }
  if (vol < 0) for (let t = 0; t < f.length; t += 3) { const x = f[t + 1]; f[t + 1] = f[t + 2]; f[t + 2] = x }
  return { v, f }
}

// The `n` biggest separate mesh files of a part: the main trunks, without the fine branches.
function biggest(files, n) {
  return files.map((file) => ({ file, mesh: weld(readObj(file)) })).sort((a, b) => b.mesh.v.length - a.mesh.v.length).slice(0, n)
}

// One piece of a model: a named set of mesh files, optionally trimmed and smoothed.
function load(names, opts = {}) {
  const parts = []
  const add = (mesh) => parts.push(opts.perFile ? inflate(mesh, opts.perFile) : mesh) // thicken thin vessels, one by one
  for (const name of [].concat(names)) {
    const files = elements.get(name)
    if (!files) throw new Error('No such part in BodyParts3D: ' + name)
    if (opts.top) biggest(files, opts.top).forEach((b) => add(b.mesh))
    else for (const file of files) add(weld(readObj(file)))
  }
  for (const file of opts.files || []) add(weld(readObj(file)))
  let m = merge(parts)
  if (opts.keep) m = trim(m, opts.keep)
  if (opts.vessel && m.f.length < 30) throw new Error('Nothing left of ' + [].concat(names).join(', ') + ' after trimming (' + m.f.length / 3 + ' triangles)')
  if (opts.vessel) return vesselTube(m, opts.vessel) // one smooth tube, rounded and narrowing at the far end
  m = smooth(m, opts.passes ?? 6)
  if (opts.close) m = smooth(closeHoles(m, opts.close), 5)
  if (opts.inflate) m = smooth(inflate(m, opts.inflate), 8)
  if (opts.zMin !== undefined) m = clipPlane(m, 2, opts.zMin, true)
  if (opts.zMax !== undefined) m = clipPlane(m, 2, opts.zMax, false)
  return m
}

/* ---------- The two models ---------- */
// BodyParts3D axes: x = towards the patient's left, y = towards the back, z = up (all in millimetres).
// The site's axes: x = viewer's right, y = up, z = towards the viewer (the front of the body).
const heartCentre = [20, -120, 1235]
const near = (R) => (x, y, z) => Math.hypot(x - heartCentre[0], y - heartCentre[1], z - heartCentre[2]) < R

const BRAIN = {
  id: 'brain', centre: [0, -80, 1547], scale: 0.0148,
  parts: [
    { id: 'frontal', pieces: [{ n: 'left frontal lobe', dir: [0.5, 0.2, 1.25] }, { n: 'right frontal lobe', dir: [-0.5, 0.2, 1.25] }] },
    { id: 'parietal', pieces: [{ n: 'left parietal lobe', dir: [0.55, 1.15, -0.15] }, { n: 'right parietal lobe', dir: [-0.55, 1.15, -0.15] }] },
    { id: 'temporal', pieces: [{ n: 'left temporal lobe', dir: [1.3, -0.6, 0.25] }, { n: 'right temporal lobe', dir: [-1.3, -0.6, 0.25] }] },
    { id: 'occipital', pieces: [{ n: 'left occipital lobe', dir: [0.5, 0.05, -1.3] }, { n: 'right occipital lobe', dir: [-0.5, 0.05, -1.3] }] },
    { id: 'cerebellum', pieces: [{ n: 'cerebellum', dir: [0, -0.8, -1.05] }] },
    { id: 'brainstem', pieces: [{ n: 'brainstem', dir: [0, -1.3, 0.1] }] },
    { id: 'hippocampus', pieces: [{ n: 'left hippocampus', dir: [1.05, -1.3, -0.1] }, { n: 'right hippocampus', dir: [-1.05, -1.3, -0.1] }] },
    { id: 'amygdala', pieces: [{ almond: 'left hippocampus', dir: [0.95, -0.95, 1.1] }, { almond: 'right hippocampus', dir: [-0.95, -0.95, 1.1] }] },
  ],
}
const HEART = {
  id: 'heart', centre: [21, -123, 1227], scale: 0.0215,
  parts: [
    // Chambers: closed, smooth shapes. The atria are the real walls with the openings (where vessels and valves
    // join) lidded over; the ventricles are grown from the blood space the data stores.
    { id: 'rightAtrium', pieces: [{ n: 'wall of right atrium', passes: 10, close: 0.3, dir: [-1.05, 0.7, 0.2] }] },
    { id: 'rightVentricle', pieces: [{ n: 'cavity of right ventricle', passes: 10, inflate: 4.5, dir: [-0.8, -0.65, 1.0] }] },
    { id: 'leftAtrium', pieces: [{ n: 'wall of left atrium', passes: 10, close: 0.3, dir: [0.85, 0.75, -0.95] }] },
    { id: 'leftVentricle', pieces: [{ n: 'cavity of left ventricle', passes: 10, inflate: 6.5, dir: [1.0, -0.9, -0.25] }] },
    // Vessels: each one smooth continuous tube, narrowing and rounding off at the far end.
    { id: 'aorta', pieces: [{ n: ['ascending aorta', 'arch of aorta', 'descending aorta'], keep: (x, y, z) => z > 1185, vessel: { taperFar: 0.55 }, dir: [0.55, 1.15, -0.4] }] },
    { id: 'pulmonaryArtery', pieces: [{ n: 'pulmonary trunk', vessel: { taperFar: 0.9, extendNear: 4, uniform: true }, dir: [0, 1.0, 1.05] }, { n: 'right pulmonary artery', top: 1, keep: near(130), vessel: { taperFar: 0.5, extendNear: 4, uniform: true, smoothC: 30, radiusScale: 1.5 }, dir: [-1.3, 0.8, 0.85] }, { n: 'left pulmonary artery', top: 1, keep: near(130), vessel: { taperFar: 0.5, extendNear: 4, uniform: true, smoothC: 30, radiusScale: 1.5 }, dir: [1.3, 0.8, 0.85] }] },
    { id: 'venaCava', pieces: [{ n: 'superior vena cava', vessel: { taperFar: 0.6, uniform: true, smoothC: 60 }, dir: [-1.15, 1.05, 0.05] }, { n: 'inferior vena cava', keep: (x, y, z) => z > 1140, vessel: { taperFar: 0.6, uniform: true, smoothC: 60 }, dir: [-1.1, -1.05, 0.0] }] },
    { id: 'pulmonaryVeins', pieces: [
      { n: 'right superior pulmonary vein', top: 1, keep: near(130), vessel: { taperFar: 0.5, extendNear: 4, uniform: true, smoothC: 40, radiusScale: 1.7 }, dir: [-1.5, 0.5, -0.7] }, { n: 'right inferior pulmonary vein', top: 1, keep: near(130), vessel: { taperFar: 0.5, extendNear: 4, uniform: true, smoothC: 40, radiusScale: 1.7 }, dir: [-1.5, -0.3, -0.7] },
      { n: 'left superior pulmonary vein', top: 1, keep: near(130), vessel: { taperFar: 0.5, extendNear: 4, uniform: true, smoothC: 40, radiusScale: 1.7 }, dir: [1.5, 0.5, -0.7] }, { n: 'left inferior pulmonary vein', top: 1, keep: near(130), vessel: { taperFar: 0.5, extendNear: 4, uniform: true, smoothC: 40, radiusScale: 1.7 }, dir: [1.5, -0.3, -0.7] }] },
    // The coronary arteries that wrap the outside of the heart (every branch in the data, made a little thicker so
    // they read clearly), the cardiac veins that drain it, and its four valves. `auto` sends each piece straight away
    // from the middle of the heart when it is pulled apart.
    { id: 'coronaryArteries', pieces: [{ n: 'left coronary artery', passes: 2, perFile: 0.9, auto: 1.35 }, { n: 'right coronary artery', passes: 2, perFile: 0.9, auto: 1.35 }] },
    { id: 'cardiacVeins', pieces: [{ n: ['great cardiac vein', 'middle cardiac vein', 'small cardiac vein', 'coronary sinus'], files: ['FJ2727', 'FJ2728', 'FJ2729'], passes: 2, perFile: 0.9, auto: 1.3 }] },
    { id: 'valves', pieces: [{ n: 'tricuspid valve', passes: 3, auto: 1.0 }, { n: 'mitral valve', passes: 3, auto: 1.0 }, { n: 'aortic valve', passes: 3, auto: 1.0 }, { n: 'pulmonary valve', passes: 3, auto: 1.0 }] },
  ],
}

// A small almond shape for the amygdala, placed just in front of the hippocampus' head.
function almond(hippo) {
  const xs = [], ys = [], zs = []
  for (let i = 0; i < hippo.v.length; i += 3) { xs.push(hippo.v[i]); ys.push(hippo.v[i + 1]); zs.push(hippo.v[i + 2]) }
  const cx = xs.reduce((a, b) => a + b, 0) / xs.length, cy = Math.min(...ys) - 6, cz = zs.reduce((a, b) => a + b, 0) / zs.length + 3
  const v = [], f = []
  const N = 14, M = 20
  for (let a = 0; a <= N; a++) for (let b = 0; b <= M; b++) {
    const th = (a / N) * Math.PI, ph = (b / M) * 2 * Math.PI
    v.push(cx + 7.5 * Math.sin(th) * Math.cos(ph), cy + 10 * Math.cos(th), cz + 7.5 * Math.sin(th) * Math.sin(ph))
  }
  for (let a = 0; a < N; a++) for (let b = 0; b < M; b++) { const i = a * (M + 1) + b, j = i + M + 1; f.push(i, j, i + 1, i + 1, j, j + 1) }
  return smooth(weld({ v, f }), 2)
}

/* ---------- Writing the files ---------- */
function build(model) {
  const chunks = [], manifest = { model: model.id, parts: [] }
  let offset = 0
  const transform = (m) => {
    const out = new Array(m.v.length)
    for (let i = 0; i < m.v.length; i += 3) {
      out[i] = (m.v[i] - model.centre[0]) * model.scale
      out[i + 1] = (m.v[i + 2] - model.centre[2]) * model.scale
      out[i + 2] = -(m.v[i + 1] - model.centre[1]) * model.scale
    }
    return { v: out, f: m.f }
  }
  for (const part of model.parts) {
    const entry = { id: part.id, pieces: [] }
    for (const pc of part.pieces) {
      const mesh = pc.almond ? almond(load(pc.almond, { passes: 0 })) : load(pc.n, { keep: pc.keep, zMin: pc.zMin, zMax: pc.zMax, top: pc.top, passes: pc.passes, inflate: pc.inflate, close: pc.close, vessel: pc.vessel, perFile: pc.perFile, files: pc.files })
      const m = transform(mesh)
      if (pc.auto) { // fly straight out from the middle of the model, from wherever this piece sits
        let sx = 0, sy = 0, sz = 0
        for (let i = 0; i < m.v.length; i += 3) { sx += m.v[i]; sy += m.v[i + 1]; sz += m.v[i + 2] }
        const k = m.v.length / 3, len = Math.hypot(sx, sy, sz) / k || 1
        pc.dir = [+((sx / k / len) * pc.auto).toFixed(3), +((sy / k / len) * pc.auto + 0.15).toFixed(3), +((sz / k / len) * pc.auto).toFixed(3)]
      }
      const n = m.v.length / 3
      if (n >= 65535) throw new Error(`${part.id}: ${n} vertices is too many for 16-bit indices`)
      const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9]
      for (let i = 0; i < m.v.length; i += 3) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], m.v[i + k]); hi[k] = Math.max(hi[k], m.v[i + k]) }
      const size = hi.map((h, k) => Math.max(h - lo[k], 1e-6))
      const pos = new Int16Array(m.v.length)
      for (let i = 0; i < m.v.length; i += 3) for (let k = 0; k < 3; k++) pos[i + k] = Math.round(((m.v[i + k] - lo[k]) / size[k]) * 65534 - 32767)
      const idx = new Uint16Array(m.f)
      const pad = (b) => { const r = b.byteLength % 4; return r ? Buffer.concat([Buffer.from(b.buffer, b.byteOffset, b.byteLength), Buffer.alloc(4 - r)]) : Buffer.from(b.buffer, b.byteOffset, b.byteLength) }
      const pb = pad(pos), ib = pad(idx)
      entry.pieces.push({ v: n, i: m.f.length, posAt: offset, idxAt: offset + pb.length, min: lo.map((x) => +x.toFixed(5)), size: size.map((x) => +x.toFixed(5)), dir: pc.dir, open: !!pc.open })
      chunks.push(pb, ib); offset += pb.length + ib.length
    }
    manifest.parts.push(entry)
  }
  fs.writeFileSync(path.join(OUT, model.id + '.bin'), Buffer.concat(chunks))
  fs.writeFileSync(path.join(OUT, model.id + '.json'), JSON.stringify(manifest))
  console.log(`${model.id}: ${manifest.parts.reduce((a, p) => a + p.pieces.length, 0)} pieces, ${manifest.parts.reduce((a, p) => a + p.pieces.reduce((s, q) => s + q.v, 0), 0)} vertices, ${(offset / 1024).toFixed(0)} KB`)
}

build(BRAIN)
build(HEART)
fs.writeFileSync(path.join(OUT, 'CREDITS.txt'), `3D models of the brain and heart
=================================
Source: BodyParts3D, (c) The Database Center for Life Science, licensed under CC Attribution-Share Alike 2.1 Japan.
https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html

(The database's licence page now names CC Attribution 4.0; the downloaded files are stamped Share-Alike 2.1 Japan.
We follow the stricter one.)

Changes made to the original data: parts were merged, trimmed to the area around the heart where needed,
smoothed, moved to one coordinate system, recoloured and stored in a compact format. The amygdala is a simplified
almond shape placed at the front of the hippocampus, because BodyParts3D has no amygdala mesh.

These adapted files (brain.bin, brain.json, heart.bin, heart.json) are shared under the same licence,
Creative Commons Attribution-Share Alike (https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en).
`)
