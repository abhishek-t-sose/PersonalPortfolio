/* ============================================================
   viz-core.js — shared plumbing for the three.js scenes on the site.
   Every scene gets: a renderer sized to its container, a loop that
   only runs while the canvas is on screen, colours that follow the
   site's light/dark toggle, and a static single frame for visitors
   who ask their OS for reduced motion.
   ============================================================ */

import * as THREE from 'three';
export { THREE };

export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark';

// Mirrors the tokens in style.css, plus a few extra hues for multi-species scenes.
const PALETTES = {
  light: {
    bg: '#FAF8F5', bgAlt: '#F0EDE8', card: '#FFFFFF',
    accent: '#B04A32', accentSoft: '#D98A70', blue: '#3B6FA0',
    ink: '#3A3530', muted: '#9A8F82', line: '#BDB3A6',
    gold: '#C99A2E', green: '#6F8F5E', violet: '#8A5A9E', white: '#F4F1EC',
  },
  dark: {
    bg: '#121212', bgAlt: '#242424', card: '#1C1C1C',
    accent: '#E07A5F', accentSoft: '#F0A68E', blue: '#7FA7D6',
    ink: '#E8E4DF', muted: '#8C8378', line: '#4F4943',
    gold: '#E2BC5C', green: '#9DBB8A', violet: '#B98BCB', white: '#E8E4DF',
  },
};
export const palette = () => PALETTES[isDark() ? 'dark' : 'light'];

export function onThemeChange(cb) {
  const obs = new MutationObserver(() => cb(palette()));
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}

/* ---------- small maths helpers ---------- */
export function rng(seed = 1) { // mulberry32 — deterministic layouts across reloads
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const clamp01 = x => Math.min(1, Math.max(0, x));
export const smooth = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
export const lerp = (a, b, t) => a + (b - a) * t;
export function gauss(r) { // Box–Muller on a supplied uniform generator
  let u = 0, v = 0;
  while (u === 0) u = r();
  while (v === 0) v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/* FCC lattice of n×n×n conventional cells, centred on the origin. */
export function fcc(n, a = 1) {
  const basis = [[0, 0, 0], [0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5]];
  const pts = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < n; k++)
    for (const b of basis) pts.push([(i + b[0]) * a, (j + b[1]) * a, (k + b[2]) * a]);
  const c = [0, 1, 2].map(d => pts.reduce((s, p) => s + p[d], 0) / pts.length);
  return pts.map(p => [p[0] - c[0], p[1] - c[1], p[2] - c[2]]);
}

/* A loose, interconnected fibre network (aerogel-like): fibres run between
   shared junction nodes so the strands genuinely meet, rather than floating. */
export function fiberNetwork(r, { junctions = 8, fibers = 12, radius = 3 } = {}) {
  const inBall = s => {
    let p;
    do { p = [r() * 2 - 1, r() * 2 - 1, r() * 2 - 1]; } while (p[0] ** 2 + p[1] ** 2 + p[2] ** 2 > 1);
    return new THREE.Vector3(p[0] * s, p[1] * s, p[2] * s);
  };
  const nodes = Array.from({ length: junctions }, () => inBall(radius * 0.75));
  const curves = [];
  for (let f = 0; f < fibers; f++) {
    const a = nodes[f % junctions];
    let b = nodes[Math.floor(r() * junctions)];
    if (b === a) b = nodes[(f + 3) % junctions];
    const mid1 = a.clone().lerp(b, 0.33).add(inBall(radius * 0.45));
    const mid2 = a.clone().lerp(b, 0.66).add(inBall(radius * 0.45));
    // Extend some fibres past the junction so the network reaches the edges.
    const tail = b.clone().add(b.clone().sub(a).normalize().multiplyScalar(radius * 0.5 * r()));
    curves.push(new THREE.CatmullRomCurve3([a.clone(), mid1, mid2, b.clone(), tail]));
  }
  return { nodes, curves };
}

/* Write a uniform-scale transform straight into an InstancedMesh buffer —
   much cheaper than compose() when hundreds of instances move every frame. */
export function setInst(mesh, i, x, y, z, s) {
  const a = mesh.instanceMatrix.array, o = i * 16;
  a[o] = s; a[o + 1] = 0; a[o + 2] = 0; a[o + 3] = 0;
  a[o + 4] = 0; a[o + 5] = s; a[o + 6] = 0; a[o + 7] = 0;
  a[o + 8] = 0; a[o + 9] = 0; a[o + 10] = s; a[o + 11] = 0;
  a[o + 12] = x; a[o + 13] = y; a[o + 14] = z; a[o + 15] = 1;
}

export function instanced(geometry, material, count) {
  const m = new THREE.InstancedMesh(geometry, material, count);
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  m.frustumCulled = false; // instances move; the base geometry's bounds are meaningless
  return m;
}

export function addLights(scene) {
  const hemi = new THREE.HemisphereLight(0xffffff, 0x8a7e70, 1.6);
  const key = new THREE.DirectionalLight(0xffffff, 1.8);
  key.position.set(4, 6, 5);
  const rim = new THREE.DirectionalLight(0xffffff, 0.6);
  rim.position.set(-5, -2, -4);
  scene.add(hemi, key, rim);
  return { hemi, key, rim };
}

/* ---------- the stage ----------
   Usage:
     const stage = createStage(container, { fov: 35 });
     ...build scene...
     stage.update = (dt, t) => { ... };   // called each frame
     stage.run();
   With reduced motion the loop never starts; update(0, staticTime) is called
   once so the scene still shows a meaningful still frame. */
export function createStage(container, opts = {}) {
  const {
    fov = 35, maxDpr = 2, staticTime = 0, animate = !reducedMotion,
    preserveDrawingBuffer = false,
  } = opts;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  container.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 200);

  const stage = {
    renderer, scene, camera, canvas, container,
    update: () => {}, onResize: () => {},
    width: 0, height: 0, elapsed: 0,
    running: false, visible: false,
    render() { if (stage.width) renderer.render(scene, camera); },
    // Jump to a moment in the loop — handy from the console: __vizStages[0].seek(17)
    seek(t) { stage.elapsed = t; stage.update(0, t); stage.render(); },
  };
  (window.__vizStages = window.__vizStages || []).push(stage);

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    stage.width = w; stage.height = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    stage.onResize(w, h);
    if (!stage.running) stage.render();
  }

  let raf = 0, last = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    stage.elapsed += dt;
    stage.update(dt, stage.elapsed);
    stage.render();
  }
  function start() {
    if (stage.running || !animate) return;
    stage.running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    stage.running = false;
    cancelAnimationFrame(raf);
  }
  const sync = () => (stage.visible && !document.hidden ? start() : stop());

  stage.run = () => {
    // Pose the scene before the first draw: InstancedMesh starts with identity
    // matrices, which would flash every instance as a unit sphere at the origin.
    stage.elapsed = animate ? 0 : staticTime;
    stage.update(0, stage.elapsed);
    new ResizeObserver(resize).observe(container);
    resize();
    new IntersectionObserver(entries => {
      stage.visible = entries[0].isIntersecting;
      sync();
    }, { rootMargin: '80px' }).observe(container);
    document.addEventListener('visibilitychange', sync);
  };
  stage.start = start;
  stage.stop = stop;
  return stage;
}
