/* ============================================================
   buq-sampler.js — "how the method works" explainer on the BUQ tool page.
   A toy two-parameter loss landscape, explored in the same two stages as
   the CG-EAM workflow:
     1. Particle Swarm Optimisation finds the best-fit parameters;
     2. a Bayesian sampler (AIES, ESS or Metropolis–Hastings) starts from
        that optimum and maps the posterior — the spread of parameter sets
        that are still consistent with the reference data.
   The samplers are real implementations running on the toy posterior.
   ============================================================ */

import {
  THREE, createStage, palette, onThemeChange, isDark, rng, gauss,
  setInst, instanced, addLights, reducedMotion,
} from './viz-core.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const root = document.getElementById('samplerViz');

/* ---------- the toy problem ---------- */
// Negative log-posterior: a curved ("banana") ridge — parameters that trade
// off against each other, which is exactly what makes force-field fits hard.
const nlp = (x, y) => (0.5 * x * x) / 1.1 + (y + 0.55 * x * x - 1.2) ** 2 / (2 * 0.3 * 0.3);
const logp = (x, y) => (Math.abs(x) > 3 || Math.abs(y) > 3 ? -Infinity : -nlp(x, y));
// Loss surface shown and optimised by PSO: log-scaled, with a few local
// minima to show why a swarm beats a single gradient descent.
const WELLS = [[2.2, 2.2, 1.6, 0.35], [-2.3, 2.0, 1.4, 0.3], [-1.6, -2.6, 1.2, 0.3]];
function loss(x, y) {
  let h = Math.log1p(nlp(x, y));
  for (const [wx, wy, a, w] of WELLS) h -= a * Math.exp(-((x - wx) ** 2 + (y - wy) ** 2) / w);
  return Math.min(h, 4.6);
}
const HS = 0.3; // height scale, world units per loss unit
const toWorld = (x, y, lift = 0.05) => [x, loss(x, y) * HS + lift, -y];

const PSO_N = 24, PSO_ITERS = 36, PSO_DT = 0.14;
const WALKERS = 32, MC_STEPS = 320, MC_DT = 0.045, BURN_IN = 15;
const TRAIL = 8, SUB = 5;

function init() {
  const stage = createStage(root, { fov: 38, animate: true });
  const { scene, camera, renderer } = stage;
  camera.position.set(4.1, 7.4, 7.0);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.2, 0.2);
  controls.enableDamping = true;
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.autoRotate = !reducedMotion;
  controls.autoRotateSpeed = 0.35;
  controls.minPolarAngle = 0.25;
  controls.maxPolarAngle = 1.35;
  addLights(scene);

  /* ---- surface + grid ---- */
  const SEG = 140;
  const surfGeo = new THREE.PlaneGeometry(6, 6, SEG, SEG).rotateX(-Math.PI / 2);
  const pos = surfGeo.attributes.position;
  const heights = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = -pos.getZ(i);
    heights[i] = loss(x, y);
    pos.setY(i, heights[i] * HS);
  }
  surfGeo.computeVertexNormals();
  surfGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(pos.count * 3), 3));
  const surfMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0, side: THREE.DoubleSide });
  scene.add(new THREE.Mesh(surfGeo, surfMat));

  const gridPts = [];
  const LINES = 24, STEPS = 120;
  for (let l = 0; l <= LINES; l++) {
    const c = -3 + (6 * l) / LINES;
    for (let s = 0; s < STEPS; s++) {
      const a = -3 + (6 * s) / STEPS, b = -3 + (6 * (s + 1)) / STEPS;
      gridPts.push(...toWorld(c, a, 0.006), ...toWorld(c, b, 0.006));
      gridPts.push(...toWorld(a, c, 0.006), ...toWorld(b, c, 0.006));
    }
  }
  const gridGeo = new THREE.BufferGeometry();
  gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(gridPts, 3));
  const gridMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.35 });
  scene.add(new THREE.LineSegments(gridGeo, gridMat));

  /* ---- PSO particles + trails ---- */
  const ballGeo = new THREE.IcosahedronGeometry(1, 2);
  const psoMat = new THREE.MeshStandardMaterial({ roughness: 0.4 });
  const psoMesh = instanced(ballGeo, psoMat, PSO_N);
  const trailGeo = new THREE.BufferGeometry();
  const trailBuf = new Float32Array(PSO_N * (TRAIL - 1) * SUB * 2 * 3);
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailBuf, 3).setUsage(THREE.DynamicDrawUsage));
  const trailMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.55 });
  const trails = new THREE.LineSegments(trailGeo, trailMat);
  trails.frustumCulled = false;
  const ringMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, transparent: true });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.22, 40).rotateX(-Math.PI / 2), ringMat);
  scene.add(psoMesh, trails, ring);

  /* ---- MCMC walkers + accumulated samples ---- */
  const walkMat = new THREE.MeshStandardMaterial({ roughness: 0.35 });
  const walkMesh = instanced(ballGeo, walkMat, WALKERS);
  const MAX_SAMPLES = WALKERS * MC_STEPS;
  const sampGeo = new THREE.BufferGeometry();
  const sampBuf = new Float32Array(MAX_SAMPLES * 3);
  sampGeo.setAttribute('position', new THREE.BufferAttribute(sampBuf, 3).setUsage(THREE.DynamicDrawUsage));
  sampGeo.setDrawRange(0, 0);
  const sampMat = new THREE.PointsMaterial({ size: 2.6, sizeAttenuation: false, transparent: true, opacity: 0.55, depthWrite: false });
  const samples = new THREE.Points(sampGeo, sampMat);
  samples.frustumCulled = false;
  scene.add(walkMesh, samples);

  function recolor() {
    const p = palette();
    const low = new THREE.Color(isDark() ? '#2B4560' : '#B9CEE3');
    const high = new THREE.Color(isDark() ? '#2E2A26' : '#F3EEE7');
    const col = surfGeo.attributes.color, c = new THREE.Color();
    for (let i = 0; i < heights.length; i++) {
      c.copy(low).lerp(high, Math.min(1, heights[i] / 3.6) ** 0.6);
      col.setXYZ(i, c.r, c.g, c.b);
    }
    col.needsUpdate = true;
    gridMat.color.set(p.line);
    psoMat.color.set(p.blue);
    trailMat.color.set(p.blue);
    ringMat.color.set(p.accent);
    walkMat.color.set(p.accent);
    sampMat.color.set(p.accent);
    stage.render();
  }
  recolor();
  onThemeChange(recolor);

  /* ---- HUD ---- */
  const hud = {
    phase: document.getElementById('hudPhase'),
    iter: document.getElementById('hudIter'),
    samples: document.getElementById('hudSamples'),
    acc: document.getElementById('hudAcc'),
  };
  const pauseBtn = document.getElementById('samplerPause');
  const replayBtn = document.getElementById('samplerReplay');
  const samplerBtns = [...document.querySelectorAll('[data-sampler]')];

  /* ---- simulation state ---- */
  let R, sampler = 'aies', mode, timer, iter, paused = false;
  let pso, walkers, nSamples, accepted, proposed;

  function reset() {
    R = rng(42);
    mode = 'pso'; timer = 0; iter = 0;
    nSamples = 0; accepted = 0; proposed = 0;
    const parts = Array.from({ length: PSO_N }, () => {
      const x = R() * 5.6 - 2.8, y = R() * 5.6 - 2.8;
      return { x, y, vx: (R() - 0.5) * 0.4, vy: (R() - 0.5) * 0.4, bx: x, by: y, bf: loss(x, y), hist: [[x, y]] };
    });
    let g = parts[0];
    for (const q of parts) if (q.bf < g.bf) g = q;
    pso = { parts, gx: g.bx, gy: g.by, gf: g.bf };
    walkers = null;
    sampGeo.setDrawRange(0, 0);
    walkMesh.visible = false;
    psoMesh.visible = trails.visible = ring.visible = true;
    psoMat.opacity = trailMat.opacity = 1;
    psoMat.transparent = false;
  }

  function psoStep() {
    const w = 0.85 - 0.45 * (iter / PSO_ITERS), c1 = 1.6, c2 = 1.1, vmax = 0.5;
    for (const q of pso.parts) {
      q.vx = w * q.vx + c1 * R() * (q.bx - q.x) + c2 * R() * (pso.gx - q.x);
      q.vy = w * q.vy + c1 * R() * (q.by - q.y) + c2 * R() * (pso.gy - q.y);
      const v = Math.hypot(q.vx, q.vy);
      if (v > vmax) { q.vx *= vmax / v; q.vy *= vmax / v; }
      q.x = Math.max(-2.95, Math.min(2.95, q.x + q.vx));
      q.y = Math.max(-2.95, Math.min(2.95, q.y + q.vy));
      const f = loss(q.x, q.y);
      if (f < q.bf) { q.bf = f; q.bx = q.x; q.by = q.y; }
      if (f < pso.gf) { pso.gf = f; pso.gx = q.x; pso.gy = q.y; }
      q.hist.push([q.x, q.y]);
      if (q.hist.length > TRAIL) q.hist.shift();
    }
  }

  function startMCMC() {
    mode = 'mcmc'; iter = 0;
    walkers = Array.from({ length: WALKERS }, () => {
      const x = pso.gx + 0.06 * gauss(R), y = pso.gy + 0.06 * gauss(R);
      return { x, y, lp: logp(x, y), px: x, py: y };
    });
    walkMesh.visible = true;
  }

  // Affine-invariant ensemble sampler (Goodman & Weare stretch move, a = 2).
  function stepAIES() {
    const half = WALKERS / 2;
    for (const [lo, other] of [[0, half], [half, 0]]) {
      for (let k = lo; k < lo + half; k++) {
        const wk = walkers[k], wj = walkers[other + Math.floor(R() * half)];
        const z = ((R() + 1) ** 2) / 2;
        const yx = wj.x + z * (wk.x - wj.x), yy = wj.y + z * (wk.y - wj.y);
        const lpy = logp(yx, yy);
        proposed++;
        if (Math.log(R()) < Math.log(z) + lpy - wk.lp) { wk.x = yx; wk.y = yy; wk.lp = lpy; accepted++; }
      }
    }
  }
  // Ensemble slice sampler (differential direction from two other walkers,
  // stepping-out then shrinkage). Every update is accepted by construction.
  function stepESS() {
    const half = WALKERS / 2;
    for (const [lo, other] of [[0, half], [half, 0]]) {
      for (let k = lo; k < lo + half; k++) {
        const wk = walkers[k];
        const a = other + Math.floor(R() * half);
        let b = other + Math.floor(R() * (half - 1));
        if (b >= a) b++;
        const dx = walkers[a].x - walkers[b].x, dy = walkers[a].y - walkers[b].y;
        const at = t => logp(wk.x + t * dx, wk.y + t * dy);
        const yLevel = wk.lp + Math.log(R());
        let L = -R(), Rr = L + 1;
        let J = Math.floor(10 * R()), K = 9 - J;
        while (J-- > 0 && yLevel < at(L)) L -= 1;
        while (K-- > 0 && yLevel < at(Rr)) Rr += 1;
        for (let guard = 0; guard < 50; guard++) {
          const t = L + R() * (Rr - L), lpt = at(t);
          if (yLevel < lpt) { wk.x += t * dx; wk.y += t * dy; wk.lp = lpt; break; }
          if (t < 0) L = t; else Rr = t;
        }
        proposed++; accepted++;
      }
    }
  }
  // Independent random-walk Metropolis–Hastings chains, one per walker.
  function stepMH() {
    for (const wk of walkers) {
      const yx = wk.x + 0.28 * gauss(R), yy = wk.y + 0.28 * gauss(R);
      const lpy = logp(yx, yy);
      proposed++;
      if (Math.log(R()) < lpy - wk.lp) { wk.x = yx; wk.y = yy; wk.lp = lpy; accepted++; }
    }
  }

  function mcmcStep() {
    for (const wk of walkers) { wk.px = wk.x; wk.py = wk.y; }
    if (sampler === 'aies') stepAIES();
    else if (sampler === 'ess') stepESS();
    else stepMH();
    if (iter >= BURN_IN) {
      for (const wk of walkers) {
        if (nSamples >= MAX_SAMPLES) break;
        const p = toWorld(wk.x, wk.y, 0.03);
        sampBuf.set(p, nSamples * 3);
        nSamples++;
      }
      sampGeo.attributes.position.needsUpdate = true;
      sampGeo.setDrawRange(0, nSamples);
    }
  }

  /* ---- drawing ---- */
  function drawPSO(f) {
    let t = 0;
    pso.parts.forEach((q, i) => {
      const h = q.hist, n = h.length;
      const a = h[Math.max(0, n - 2)], b = h[n - 1];
      const x = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f;
      const p = toWorld(x, y, 0.09);
      setInst(psoMesh, i, p[0], p[1], p[2], 0.085);
      // trail: each segment between visits is resampled so it hugs the surface
      for (let s = 0; s < TRAIL - 1; s++) {
        const u = h[Math.max(0, n - 1 - (TRAIL - 1) + s)], v = h[Math.max(0, n - 1 - (TRAIL - 2) + s)];
        for (let k = 0; k < SUB; k++) {
          const t0 = k / SUB, t1 = (k + 1) / SUB;
          trailBuf.set(toWorld(u[0] + (v[0] - u[0]) * t0, u[1] + (v[1] - u[1]) * t0, 0.04), t); t += 3;
          trailBuf.set(toWorld(u[0] + (v[0] - u[0]) * t1, u[1] + (v[1] - u[1]) * t1, 0.04), t); t += 3;
        }
      }
    });
    psoMesh.instanceMatrix.needsUpdate = true;
    trailGeo.attributes.position.needsUpdate = true;
    const g = toWorld(pso.gx, pso.gy, 0.02);
    ring.position.set(g[0], g[1], g[2]);
  }
  function drawWalkers(f) {
    walkers.forEach((wk, i) => {
      const x = wk.px + (wk.x - wk.px) * f, y = wk.py + (wk.y - wk.py) * f;
      const p = toWorld(x, y, 0.08);
      setInst(walkMesh, i, p[0], p[1], p[2], 0.07);
    });
    walkMesh.instanceMatrix.needsUpdate = true;
  }

  const NAMES = { aies: 'Affine-invariant ensemble (AIES)', ess: 'Ensemble slice sampling (ESS)', mh: 'Metropolis–Hastings' };
  function updateHud() {
    if (!hud.phase) return;
    if (mode === 'pso') {
      hud.phase.innerHTML = '<b>1 · Particle swarm optimisation</b> — searching for the best-fit parameters';
      hud.iter.textContent = `${iter} / ${PSO_ITERS}`;
      hud.samples.textContent = '—';
      hud.acc.textContent = '—';
    } else {
      hud.phase.innerHTML = `<b>2 · Bayesian sampling</b> — ${NAMES[sampler]} maps the posterior`;
      hud.iter.textContent = `${iter} / ${MC_STEPS}`;
      hud.samples.textContent = nSamples.toLocaleString();
      hud.acc.textContent = sampler === 'ess' ? '100% (slice)' : proposed ? `${Math.round((100 * accepted) / proposed)}%` : '—';
    }
  }

  /* ---- the loop ---- */
  let fadeOut = 0;
  stage.update = (dt, t) => {
    controls.update();
    ringMat.opacity = 0.55 + 0.35 * Math.sin(t * 3);
    if (paused) return;
    timer += dt;
    if (mode === 'pso') {
      while (timer >= PSO_DT && mode === 'pso') {
        timer -= PSO_DT; iter++;
        psoStep();
        if (iter >= PSO_ITERS) { startMCMC(); fadeOut = 0; timer = 0; }
      }
      if (mode === 'pso') drawPSO(timer / PSO_DT);
    }
    if (mode === 'mcmc') {
      // PSO swarm fades while the walkers take over from its best point
      fadeOut = Math.min(1, fadeOut + dt / 0.8);
      psoMat.transparent = true;
      psoMat.opacity = trailMat.opacity = 1 - fadeOut;
      psoMesh.visible = trails.visible = fadeOut < 1;
      while (timer >= MC_DT && iter < MC_STEPS) { timer -= MC_DT; iter++; mcmcStep(); }
      drawWalkers(iter < MC_STEPS ? timer / MC_DT : 1);
      if (iter >= MC_STEPS) {
        mode = 'done'; timer = 0;
      }
    }
    if (mode === 'done' && timer > 4) reset(); // hold the finished posterior, then loop
    updateHud();
  };

  // Reduced motion: compute the whole run up front and show the final posterior.
  function fastForward() {
    while (iter < PSO_ITERS) { iter++; psoStep(); }
    startMCMC();
    while (iter < MC_STEPS) { iter++; mcmcStep(); }
    mode = 'done';
    psoMesh.visible = trails.visible = false;
    drawWalkers(1);
    updateHud();
    stage.render();
  }

  samplerBtns.forEach(b => b.addEventListener('click', () => {
    sampler = b.dataset.sampler;
    samplerBtns.forEach(x => x.classList.toggle('active', x === b));
    reset();
    if (reducedMotion) fastForward();
  }));
  replayBtn?.addEventListener('click', () => {
    reset();
    paused = reducedMotion;
    if (pauseBtn) pauseBtn.textContent = 'Pause';
    if (reducedMotion) fastForward();
  });
  pauseBtn?.addEventListener('click', () => {
    paused = !paused;
    pauseBtn.textContent = paused ? 'Resume' : 'Pause';
  });

  reset();
  stage.run();
  if (reducedMotion) { paused = true; fastForward(); if (pauseBtn) pauseBtn.hidden = true; }
}

if (root) init();
