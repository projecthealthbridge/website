/* The 3D brain and heart. The models come from BodyParts3D (see assets/anatomy/CREDITS.txt), already
   split into their real parts; this file loads them, pulls them apart with a slider, lets you turn
   them, and shows what each part does. Three.js is saved in js/vendor so nothing comes from anywhere
   else. js/app.js loads this only when the section scrolls near the screen. */
import * as THREE from './vendor/three.module.min.js'

const calm = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)

// Colour-coding of the parts. In the heart, teal is oxygen-poor blood and red is oxygen-rich blood.
const PALETTE = {
  frontal: '#2e8b6e', parietal: '#3aa6a0', temporal: '#7cc4a0', occipital: '#4a8fb0', cerebellum: '#d9a441', brainstem: '#c8625a', hippocampus: '#8e7cc3', amygdala: '#e0845f',
  // The heart muscle is shown in muscle tones, so it reads as one organ; the vessels carry the oxygen colours.
  rightAtrium: '#e29a9c', rightVentricle: '#cc6a70', leftAtrium: '#d98486', leftVentricle: '#a93a45', aorta: '#d0453f', pulmonaryArtery: '#3d86b5', venaCava: '#3d86b5', pulmonaryVeins: '#d0453f',
  coronaryArteries: '#ff7a45', cardiacVeins: '#5aa7c9', valves: '#d9a441',
}
// `spread` is how far the parts fly apart; the heart has more small parts packed in the middle, so it needs more.
const VIEW = { brain: { yaw: -1.0, pitch: 0.2, radius: 2.45, spread: 0.72 }, heart: { yaw: 0.3, pitch: 0.1, radius: 3.25, spread: 1.0 } }

// Reads one model: a small JSON file that says what the parts are, and a binary file with the shapes.
async function loadModel(id) {
  const base = new URL('../assets/anatomy/', import.meta.url)
  const get = (name, as) => fetch(new URL(name, base)).then((r) => { if (!r.ok) throw new Error(`${name}: ${r.status}`); return r[as]() })
  const [manifest, bin] = await Promise.all([get(id + '.json', 'json'), get(id + '.bin', 'arrayBuffer')])
  return manifest.parts.map((p) => ({
    id: p.id,
    color: PALETTE[p.id] || '#2e8b6e',
    pieces: p.pieces.map((pc) => {
      const q = new Int16Array(bin, pc.posAt, pc.v * 3)
      const pos = new Float32Array(pc.v * 3)
      for (let k = 0; k < pc.v; k++) for (let a = 0; a < 3; a++) pos[3 * k + a] = pc.min[a] + ((q[3 * k + a] + 32767) / 65534) * pc.size[a]
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
      g.setIndex(new THREE.BufferAttribute(new Uint16Array(bin, pc.idxAt, pc.i).slice(), 1))
      g.computeVertexNormals()
      g.computeBoundingSphere()
      g.userData.open = pc.open
      return { geo: g, dir: pc.dir }
    }),
  }))
}

// A soft "photo studio" for the shiny surfaces to reflect: a few bright panels in a pale room.
function studio(renderer) {
  const scene = new THREE.Scene()
  scene.add(new THREE.Mesh(new THREE.BoxGeometry(12, 12, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.32, 0.4, 0.38), side: THREE.BackSide })))
  const panel = (x, y, z, w, h, d, power) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(power) }))
    m.position.set(x, y, z); scene.add(m)
  }
  panel(0, 5.6, 0, 5, 0.2, 5, 5)
  panel(-5.6, 1.5, 2.5, 0.2, 3.5, 4, 2.6)
  panel(5.6, 0.5, -2, 0.2, 3, 4, 1.8)
  panel(0, 1.5, 5.6, 6, 2.5, 0.2, 1.3)
  const pm = new THREE.PMREMGenerator(renderer)
  const target = pm.fromScene(scene, 0.035)
  pm.dispose()
  return target.texture
}

export async function init(root) {
  const canvas = root.querySelector('[data-canvas]')
  const stage = root.querySelector('[data-stage]')
  const labelsBox = root.querySelector('[data-labels]')
  const slider = root.querySelector('[data-explode]')
  const status = root.querySelector('[data-status]')
  const apartBtn = root.querySelector('[data-apart]')

  let renderer
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  } catch (e) {
    throw new Error('WebGL is not available')
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.setClearColor(0x000000, 0)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05

  const scene = new THREE.Scene()
  scene.environment = studio(renderer)
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100)
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb7d6cc, 0.35))
  const key = new THREE.DirectionalLight(0xffffff, 1.7); key.position.set(3, 5, 4); scene.add(key)
  const rim = new THREE.DirectionalLight(0xa8ecd9, 0.9); rim.position.set(-4, 2, -3); scene.add(rim)
  const pivot = new THREE.Group(); scene.add(pivot)

  const models = {}
  const names = {}
  root.querySelectorAll('[data-model] [data-part]').forEach((b) => { names[b.getAttribute('data-part')] = (b.querySelector('.part-name') || b).textContent.trim() })

  async function ensure(id) {
    if (models[id]) return models[id]
    const spec = await loadModel(id)
    const group = new THREE.Group()
    const parts = new Map()
    spec.forEach((s) => {
      const colour = new THREE.Color(s.color)
      const part = { id: s.id, name: names[s.id] || s.id, colour, pieces: [], fronts: [], backs: [] }
      s.pieces.forEach((pc) => {
        const g = new THREE.Group()
        const skin = new THREE.Mesh(pc.geo, new THREE.MeshPhysicalMaterial({ color: colour, roughness: 0.46, metalness: 0, clearcoat: 0.45, clearcoatRoughness: 0.35, envMapIntensity: 0.85, transparent: true }))
        skin.userData.part = s.id
        g.add(skin)
        part.fronts.push(skin.material)
        if (pc.geo.userData.open) { // a vessel with a cut end: show a darker inside
          const inside = new THREE.Mesh(pc.geo, new THREE.MeshStandardMaterial({ color: colour.clone().multiplyScalar(0.45), roughness: 0.8, side: THREE.BackSide, transparent: true }))
          inside.raycast = () => {}
          g.add(inside); part.backs.push(inside.material)
        }
        group.add(g)
        part.pieces.push({ group: g, dir: new THREE.Vector3(...pc.dir).multiplyScalar(VIEW[id].spread), centre: pc.geo.boundingSphere.center.clone() })
      })
      parts.set(s.id, part)
    })
    group.visible = false
    pivot.add(group)
    return (models[id] = { id, group, parts, view: VIEW[id] })
  }

  let current = null
  let selected = null, hovered = null
  let yaw = 0, pitch = 0, target = calm ? 1 : 0, explode = calm ? 1 : 0
  let lastTouch = -1e9, visible = false, raf = 0, last = 0
  let dragging = null, camBase = 8, initialPlayed = false, switching = 0

  const labels = new Map()
  function makeLabels(m) {
    labelsBox.textContent = ''
    labels.clear()
    m.parts.forEach((p) => {
      const b = document.createElement('button')
      b.type = 'button'; b.className = 'tag3d'; b.textContent = p.name; b.tabIndex = -1
      b.setAttribute('aria-hidden', 'true')
      b.addEventListener('click', () => choose(p.id))
      labelsBox.appendChild(b); labels.set(p.id, b)
    })
  }

  function fit() {
    const w = stage.clientWidth, h = stage.clientHeight
    if (!w || !h) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    const vf = THREE.MathUtils.degToRad(camera.fov)
    const hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect)
    camBase = ((current ? current.view.radius : 2.6) * 1.12) / Math.sin(Math.min(vf, hf) / 2)
    camera.updateProjectionMatrix()
    invalidate()
  }

  async function setModel(id) {
    if (current && current.id === id) return
    const ticket = ++switching
    root.setAttribute('data-loading', '')
    const m = await ensure(id)
    if (ticket !== switching) return // someone chose another tab meanwhile
    root.removeAttribute('data-loading')
    if (current) current.group.visible = false
    current = m
    current.group.visible = true
    selected = hovered = null
    yaw = current.view.yaw; pitch = current.view.pitch
    makeLabels(current)
    fit(); styleParts(); sync()
  }

  const ease = (t) => 1 - Math.pow(1 - t, 3)
  function placePieces() {
    const e = ease(explode)
    current.parts.forEach((p) => p.pieces.forEach((pc) => pc.group.position.copy(pc.dir).multiplyScalar(e)))
  }

  function styleParts() {
    current.parts.forEach((p) => {
      const on = selected === p.id, hov = hovered === p.id
      const dim = selected && !on
      const opacity = dim ? 0.2 : 1
      p.fronts.forEach((m) => { m.opacity = opacity; m.emissive.copy(p.colour); m.emissiveIntensity = on ? 0.38 : hov ? 0.2 : 0; m.depthWrite = !dim })
      p.backs.forEach((m) => { m.opacity = opacity; m.depthWrite = !dim })
      const lab = labels.get(p.id)
      if (lab) { lab.classList.toggle('on', on); lab.classList.toggle('dim', !!dim) }
    })
  }

  // The list on the page and the model always agree on what is selected.
  function sync() {
    root.querySelectorAll('[data-part]').forEach((b) => {
      const on = !!current && b.closest('[data-model]').getAttribute('data-model') === current.id && b.getAttribute('data-part') === selected
      b.setAttribute('aria-expanded', String(on))
      b.closest('li').classList.toggle('open', on)
    })
    if (status) {
      const p = current && selected ? current.parts.get(selected) : null
      status.textContent = p ? `${p.name}: ${root.querySelector(`[data-model="${current.id}"] [data-part="${selected}"]`).closest('li').querySelector('.part-fn').textContent}` : ''
    }
  }

  function choose(id) {
    if (!current) return
    selected = selected === id ? null : id
    styleParts(); sync(); invalidate()
  }

  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2()
  function pick(e) {
    const r = canvas.getBoundingClientRect()
    mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    ray.setFromCamera(mouse, camera)
    const hits = ray.intersectObjects(current.group.children.flatMap((g) => g.children), false)
    return hits.length ? hits[0].object.userData.part : null
  }

  canvas.addEventListener('pointerdown', (e) => {
    dragging = { x: e.clientX, y: e.clientY, moved: false }
    canvas.setPointerCapture(e.pointerId)
    lastTouch = performance.now()
  })
  canvas.addEventListener('pointermove', (e) => {
    if (!current) return
    if (dragging) {
      const dx = e.clientX - dragging.x, dy = e.clientY - dragging.y
      if (Math.abs(dx) + Math.abs(dy) > 3) dragging.moved = true
      dragging.x = e.clientX; dragging.y = e.clientY
      yaw += dx * 0.0085; pitch = Math.max(-0.9, Math.min(0.9, pitch + dy * 0.006))
      lastTouch = performance.now(); invalidate()
    } else if (e.pointerType === 'mouse') {
      const id = pick(e)
      if (id !== hovered) { hovered = id; canvas.style.cursor = id ? 'pointer' : 'grab'; styleParts(); invalidate() }
    }
  })
  canvas.addEventListener('pointerup', (e) => {
    if (current && dragging && !dragging.moved) choose(pick(e) || selected)
    dragging = null
  })
  canvas.addEventListener('pointerleave', () => { if (hovered) { hovered = null; styleParts(); invalidate() } })
  canvas.addEventListener('keydown', (e) => {
    const step = { ArrowLeft: [-0.25, 0], ArrowRight: [0.25, 0], ArrowUp: [0, -0.15], ArrowDown: [0, 0.15] }[e.key]
    if (step) { e.preventDefault(); yaw += step[0]; pitch = Math.max(-0.9, Math.min(0.9, pitch + step[1])); lastTouch = performance.now(); invalidate() }
  })

  const setApartLabel = () => { if (apartBtn) apartBtn.textContent = target > 0.5 ? 'Put together' : 'Pull apart' }
  const setApart = (v) => {
    target = v; if (calm) explode = v
    if (slider) slider.value = String(Math.round(v * 100))
    setApartLabel(); invalidate()
  }
  if (slider) slider.addEventListener('input', () => { target = explode = slider.value / 100; setApartLabel(); invalidate() })
  apartBtn?.addEventListener('click', () => setApart(target > 0.5 ? 0 : 1))
  root.querySelector('[data-reset]')?.addEventListener('click', () => { selected = null; if (current) { yaw = current.view.yaw; pitch = current.view.pitch; styleParts(); sync() } setApart(1) })
  root.querySelectorAll('[data-part]').forEach((b) => b.addEventListener('click', () => {
    if (current && b.closest('[data-model]').getAttribute('data-model') === current.id) choose(b.getAttribute('data-part'))
  }))
  root.addEventListener('anatomy:model', (e) => { setModel(e.detail).catch(() => root.setAttribute('data-failed', '')) })

  const v = new THREE.Vector3()
  function placeLabels() {
    const w = stage.clientWidth, h = stage.clientHeight
    const spots = []
    current.parts.forEach((p) => {
      const lab = labels.get(p.id)
      if (!lab) return
      v.set(0, 0, 0)
      p.pieces.forEach((pc) => v.add(pc.centre).add(pc.group.position))
      v.multiplyScalar(1 / p.pieces.length)
      v.applyMatrix4(pivot.matrixWorld).project(camera)
      spots.push({ lab, x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h, w: lab.offsetWidth || 90, h: lab.offsetHeight || 26 })
    })
    // Nudge labels apart so none sits on top of another.
    spots.sort((a, b) => a.y - b.y)
    for (let pass = 0; pass < 4; pass++) {
      for (let i = 0; i < spots.length; i++) for (let j = i + 1; j < spots.length; j++) {
        const a = spots[i], b = spots[j]
        const ox = (a.w + b.w) / 2 - Math.abs(a.x - b.x), oy = (a.h + b.h) / 2 + 2 - Math.abs(a.y - b.y)
        if (ox > 0 && oy > 0) { const push = oy / 2; a.y -= push; b.y += push }
      }
    }
    spots.forEach((s) => { s.lab.style.transform = `translate(${Math.min(w - s.w / 2, Math.max(s.w / 2, s.x))}px, ${Math.min(h - s.h / 2, Math.max(s.h / 2, s.y))}px) translate(-50%, -50%)` })
  }

  function frame(now) {
    raf = 0
    if (!current) return
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016)
    last = now
    let busy = false
    if (Math.abs(explode - target) > 0.001) { explode += (target - explode) * (1 - Math.exp(-dt * 3.2)); if (Math.abs(explode - target) <= 0.001) explode = target; busy = true }
    if (!calm && !dragging && !selected && now - lastTouch > 2500) { yaw += dt * 0.22; busy = true }
    pivot.rotation.y = yaw; pivot.rotation.x = pitch
    // Closer while it is together, easing back as the parts come apart, so it always fills the frame.
    camera.position.set(0, 0.25, camBase * (0.7 + 0.3 * ease(explode)))
    camera.lookAt(0, 0, 0)
    labelsBox.classList.toggle('quiet', explode < 0.5)
    pivot.updateMatrixWorld(true)
    placePieces()
    pivot.updateMatrixWorld(true)
    renderer.render(scene, camera)
    placeLabels()
    if (slider && !dragging && busy) slider.value = String(Math.round(explode * 100))
    if (busy && visible && !document.hidden) raf = requestAnimationFrame(frame)
  }
  function invalidate() { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame) }

  // The first time it is seen with a model ready, the parts glide apart once.
  function intro() {
    if (calm || !visible || !current || initialPlayed || target !== 0 || explode !== 0) return
    initialPlayed = true
    setTimeout(() => setApart(1), 600)
  }

  new ResizeObserver(fit).observe(stage)
  new IntersectionObserver((es) => {
    const was = visible
    visible = es[0].isIntersecting
    if (visible && !was) { intro(); last = performance.now(); invalidate() }
  }, { threshold: 0.25 }).observe(stage)
  document.addEventListener('visibilitychange', invalidate)

  canvas.style.cursor = 'grab'
  await setModel(root.getAttribute('data-current') || 'brain')
  root.setAttribute('data-ready', '')
  if (calm && slider) slider.value = '100'
  fit()
  intro()
  // Fetch the other model quietly while the visitor looks at the first.
  if (!root.hasAttribute('data-single')) setTimeout(() => ensure(root.getAttribute('data-current') === 'heart' ? 'brain' : 'heart').catch(() => {}), 1200)
  return { select: choose }
}
