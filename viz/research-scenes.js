/* ============================================================
   research-scenes.js — one small 3D scene per research theme.
   Each .project-viz[data-viz] container picks its scene by name:
     buq      FCC lattice whose parameter-uncertainty "halos" tighten (prior → posterior)
     mof      IRMOF-style cage: H₂ adsorbing at Zn₄O nodes, then photo-triggered release
     hea      five-element FCC alloy whose composition is re-designed on the fly
     aerogel  fibrous network wrapped in a design → make → measure → learn loop
     water    water layering between a graphene sheet and a MoS₂ sheet
   All scenes are illustrations, not simulation output.
   ============================================================ */

import {
  THREE, createStage, palette, onThemeChange, rng, gauss, fcc,
  setInst, instanced, addLights, smooth, lerp,
} from './viz-core.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';


/* Highlight one caption chip (data-k) inside a scene's container. */
function captionSetter(el) {
  const chips = [...el.querySelectorAll('[data-k]')];
  let current = null;
  return key => {
    if (key === current) return;
    current = key;
    chips.forEach(c => c.classList.toggle('on', c.dataset.k === key));
  };
}

const sphere = (detail = 2) => new THREE.IcosahedronGeometry(1, detail);
const std = (o = {}) => new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.1, ...o });

/* ---------------- BUQ: uncertainty halos tighten ---------------- */
function sceneBUQ(stage, el) {
  const { scene, camera } = stage;
  camera.position.set(0, 0, 9.2);
  const R = rng(3);
  const pts = fcc(3, 1.05);
  const n = pts.length;
  const group = new THREE.Group();
  scene.add(group);

  const coreMat = std();
  const core = instanced(sphere(), coreMat, n);
  const haloMat = std({ transparent: true, opacity: 0.16, depthWrite: false, roughness: 0.9 });
  const halo = instanced(sphere(2), haloMat, n);
  group.add(halo, core);
  const ph = Float32Array.from({ length: n * 3 }, () => R() * Math.PI * 2);
  const caption = captionSetter(el);

  stage.update = (dt, t) => {
    const s = t % 11;
    const k = smooth((s - 1.5) / 3) * (1 - smooth((s - 9) / 1.5)); // 0 = prior, 1 = posterior
    const spread = lerp(0.17, 0.035, k), hr = lerp(0.44, 0.17, k);
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      setInst(halo, i, p[0], p[1], p[2], hr);
      setInst(core, i,
        p[0] + spread * Math.sin(t * 1.7 + ph[3 * i]),
        p[1] + spread * Math.sin(t * 2.3 + ph[3 * i + 1]),
        p[2] + spread * Math.sin(t * 1.9 + ph[3 * i + 2]), 0.12);
    }
    core.instanceMatrix.needsUpdate = halo.instanceMatrix.needsUpdate = true;
    group.rotation.set(0.45, t * 0.15 + 0.6, 0);
    caption(k < 0.5 ? 'prior' : 'posterior');
  };

  return () => {
    const p = palette();
    coreMat.color.set(p.accent);
    haloMat.color.set(p.blue);
  };
}

/* ---------------- MOF: H₂ adsorption, then light-triggered release ---------------- */
function sceneMOF(stage, el) {
  const { scene, camera } = stage;
  camera.position.set(0, 0, 10.5);
  const R = rng(9);
  const L = 1.7, BOX = L + 0.35;
  const group = new THREE.Group();
  scene.add(group);

  // Zn₄O nodes on a 3×3×3 grid (2×2×2 cages), tetrahedra alternating orientation
  const nodes = [];
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++)
    nodes.push([i * L, j * L, k * L, (i + j + k + 3) % 2]);
  const tet = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]];
  const znMat = std({ metalness: 0.35 }), oMat = std();
  const zn = instanced(sphere(), znMat, nodes.length * 4);
  const ox = instanced(sphere(), oMat, nodes.length);
  nodes.forEach((nd, a) => {
    setInst(ox, a, nd[0], nd[1], nd[2], 0.09);
    tet.forEach((v, b) => {
      const sgn = nd[3] ? 1 : -1;
      setInst(zn, a * 4 + b, nd[0] + sgn * v[0] * 0.12, nd[1] + v[1] * 0.12, nd[2] + v[2] * 0.12, 0.085);
    });
  });

  // Linkers: a rod plus two hexagonal rings (biphenyl-like) on every edge
  const edges = [];
  nodes.forEach(a => nodes.forEach(b => {
    const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const len = Math.hypot(...d);
    if (Math.abs(len - L) < 1e-6 && (d[0] + d[1] + d[2]) > 0) edges.push([a, b, d.map(v => v / len)]);
  }));
  const rodMat = std({ roughness: 0.7 }), ringMat = std({ roughness: 0.6 });
  const rods = instanced(new THREE.CylinderGeometry(1, 1, 1, 6), rodMat, edges.length);
  const rings = instanced(new THREE.TorusGeometry(0.13, 0.024, 4, 6), ringMat, edges.length * 2);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  edges.forEach(([a, b, d], e) => {
    const dir = new THREE.Vector3(...d);
    q.setFromUnitVectors(up, dir);
    m.compose(new THREE.Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), q, new THREE.Vector3(0.022, L - 0.3, 0.022));
    rods.setMatrixAt(e, m);
    // ring normal must be perpendicular to the rod so the rod passes through the ring's plane
    const normal = Math.abs(d[2]) > 0.5 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
    const qr = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    const twist = new THREE.Quaternion().setFromAxisAngle(dir, e % 2 ? 0 : Math.PI / 2);
    qr.premultiply(twist);
    [0.36, 0.64].forEach((f, r) => {
      m.compose(new THREE.Vector3(lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)), qr, new THREE.Vector3(1, 1, 1));
      rings.setMatrixAt(e * 2 + r, m);
    });
  });
  group.add(zn, ox, rods, rings);

  // H₂ molecules
  const NH = 26;
  const h2Mat = std({ roughness: 0.3 });
  const h2 = instanced(sphere(1), h2Mat, NH * 2);
  const gas = Array.from({ length: NH }, () => ({
    p: new THREE.Vector3((R() * 2 - 1) * BOX, (R() * 2 - 1) * BOX, (R() * 2 - 1) * BOX),
    v: new THREE.Vector3(gauss(R), gauss(R), gauss(R)).multiplyScalar(0.5),
    axis: new THREE.Vector3(gauss(R), gauss(R), gauss(R)).normalize(),
    spin: new THREE.Vector3(gauss(R), gauss(R), gauss(R)).normalize(),
    stuck: 0,
  }));

  // Drug molecules: a small ring-and-tail cluster in each of the 8 pores
  const pores = [];
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) pores.push([x * L / 2, y * L / 2, z * L / 2]);
  const motif = [[0, 0, 0], [0.16, 0.05, 0], [-0.16, 0.05, 0], [0.08, -0.13, 0.06], [-0.08, -0.13, -0.06], [0, 0.2, 0.12]];
  const drugMat = std({ roughness: 0.35 });
  const drug = instanced(sphere(1), drugMat, pores.length * motif.length);
  const pulseMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, wireframe: true, depthWrite: false });
  const pulse = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), pulseMat);
  group.add(h2, drug, pulse);

  const caption = captionSetter(el);
  const tmp = new THREE.Vector3(), ax = new THREE.Vector3();
  const CYCLE = 17;

  stage.update = (dt, t) => {
    const s = t % CYCLE;
    const gasVis = 1 - smooth((s - 8) / 1) + smooth((s - 14.5) / 1.5);
    const drugIn = smooth((s - 8.3) / 1);
    const release = smooth((s - 11) / 3.2);

    gas.forEach((g, i) => {
      if (g.stuck > 0) {
        g.stuck -= dt;
        if (g.stuck <= 0) g.v.copy(g.p).normalize().multiplyScalar(0.5);
      } else {
        g.v.x += gauss(R) * dt * 1.4; g.v.y += gauss(R) * dt * 1.4; g.v.z += gauss(R) * dt * 1.4;
        g.v.clampLength(0.2, 0.75);
        g.p.addScaledVector(g.v, dt);
        for (const c of ['x', 'y', 'z']) if (Math.abs(g.p[c]) > BOX) { g.p[c] = Math.sign(g.p[c]) * BOX; g.v[c] *= -1; }
        // adsorb when passing close to a Zn₄O corner
        for (const nd of nodes) {
          tmp.set(g.p.x - nd[0], g.p.y - nd[1], g.p.z - nd[2]);
          if (tmp.lengthSq() < 0.34 * 0.34 && R() < 0.4) {
            g.stuck = 1.5 + R() * 3;
            g.p.set(nd[0], nd[1], nd[2]).addScaledVector(tmp.normalize(), 0.3);
            break;
          }
        }
      }
      g.axis.applyAxisAngle(g.spin, dt * (g.stuck > 0 ? 0.6 : 3));
      ax.copy(g.axis).multiplyScalar(0.055);
      const r = 0.05 * gasVis;
      setInst(h2, 2 * i, g.p.x + ax.x, g.p.y + ax.y, g.p.z + ax.z, r);
      setInst(h2, 2 * i + 1, g.p.x - ax.x, g.p.y - ax.y, g.p.z - ax.z, r);
    });
    h2.instanceMatrix.needsUpdate = true;

    pores.forEach((c, a) => {
      const out = 1 + release * 2.6;
      const fade = drugIn * (1 - smooth((release - 0.55) / 0.45));
      const spin = t * 0.6 + a;
      motif.forEach((v, b) => {
        const cx = Math.cos(spin), sx = Math.sin(spin);
        setInst(drug, a * motif.length + b,
          c[0] * out + v[0] * cx - v[2] * sx, c[1] * out + v[1], c[2] * out + v[0] * sx + v[2] * cx,
          0.07 * fade);
      });
    });
    drug.instanceMatrix.needsUpdate = true;

    // the light pulse that triggers release
    const pk = (s - 10.8) / 1.2;
    pulse.visible = pk > 0 && pk < 1;
    if (pulse.visible) { pulse.scale.setScalar(0.3 + pk * 3.4); pulseMat.opacity = 0.35 * (1 - pk); }

    group.rotation.set(0.42, t * 0.12 + 0.7, 0);
    caption(s >= 8 && s < 14.5 ? 'release' : 'h2');
  };

  return () => {
    const p = palette();
    znMat.color.set(p.muted);
    oMat.color.set(p.accent);
    rodMat.color.set(p.line);
    ringMat.color.set(p.muted);
    h2Mat.color.set(p.blue);
    drugMat.color.set(p.gold);
    pulseMat.color.set(p.gold);
  };
}

/* ---------------- HEA: FeNiCrCoCu composition being re-designed ---------------- */
const HEA_SPECIES = ['Fe', 'Ni', 'Cr', 'Co', 'Cu'];
// Illustrative targets only — not compositions from the paper.
const HEA_TARGETS = [
  [0.2, 0.2, 0.2, 0.2, 0.2],
  [0.3, 0.25, 0.1, 0.25, 0.1],
  [0.15, 0.3, 0.2, 0.3, 0.05],
  [0.25, 0.15, 0.25, 0.15, 0.2],
];
function sceneHEA(stage, el) {
  const { scene, camera } = stage;
  camera.position.set(0, 0, 10.2);
  const R = rng(21);
  const pts = fcc(4, 0.85);
  const n = pts.length;
  const group = new THREE.Group();
  scene.add(group);
  const mat = std({ metalness: 0.25, roughness: 0.4 });
  const mesh = instanced(sphere(2), mat, n);
  group.add(mesh);

  const kind = new Uint8Array(n);
  for (let i = 0; i < n; i++) kind[i] = i % 5;
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [kind[i], kind[j]] = [kind[j], kind[i]]; }
  const pop = new Float32Array(n);
  const counts = () => { const c = [0, 0, 0, 0, 0]; kind.forEach(k => c[k]++); return c; };
  const pctEls = HEA_SPECIES.map(s => el.querySelector(`[data-pct="${s}"]`));
  let colors = [];
  const paint = i => mesh.setColorAt(i, colors[kind[i]]);

  let acc = 0, hudAcc = 1;
  stage.update = (dt, t) => {
    const target = HEA_TARGETS[Math.floor(t / 6) % HEA_TARGETS.length];
    acc += dt;
    while (acc > 0.07) {
      acc -= 0.07;
      const c = counts();
      let hi = 0, lo = 0;
      for (let k = 1; k < 5; k++) {
        if (c[k] - target[k] * n > c[hi] - target[hi] * n) hi = k;
        if (c[k] - target[k] * n < c[lo] - target[lo] * n) lo = k;
      }
      if (c[hi] - target[hi] * n < 1) break; // reached the target
      const pool = [];
      for (let i = 0; i < n; i++) if (kind[i] === hi) pool.push(i);
      const i = pool[Math.floor(R() * pool.length)];
      kind[i] = lo; pop[i] = 1; paint(i);
      mesh.instanceColor.needsUpdate = true;
    }
    for (let i = 0; i < n; i++) {
      pop[i] = Math.max(0, pop[i] - dt * 2.5);
      const p = pts[i];
      setInst(mesh, i, p[0], p[1], p[2], 0.2 * (1 + 0.6 * pop[i]));
    }
    mesh.instanceMatrix.needsUpdate = true;
    group.rotation.set(0.5, t * 0.14 + 0.5, 0);

    hudAcc += dt;
    if (hudAcc > 0.25) {
      hudAcc = 0;
      const c = counts();
      pctEls.forEach((e, k) => { if (e) e.textContent = `${Math.round((100 * c[k]) / n)}%`; });
    }
  };

  return () => {
    const p = palette();
    colors = [p.accent, p.blue, p.green, p.gold, p.violet].map(c => new THREE.Color(c));
    for (let i = 0; i < n; i++) paint(i);
    mesh.instanceColor.needsUpdate = true;
    el.querySelectorAll('[data-swatch]').forEach(sw => (sw.style.background = colors[+sw.dataset.swatch].getStyle()));
  };
}

/* ---------------- Aerogel: fibre network inside a closed loop ---------------- */
function sceneAerogel(stage, el) {
  const { scene, camera } = stage;
  camera.position.set(0, 0.6, 11);
  camera.lookAt(0, 0, 0);
  const R = rng(5);
  // Open-cell network: junctions scattered through a ball, each joined to its
  // three nearest neighbours by a gently curved fibril.
  const nodes = [];
  for (let tries = 0; nodes.length < 64 && tries < 5000; tries++) {
    const p = new THREE.Vector3(R() * 2 - 1, R() * 2 - 1, R() * 2 - 1);
    if (p.lengthSq() > 1) continue;
    p.multiplyScalar(2.0);
    if (nodes.every(q => q.distanceToSquared(p) > 0.42 * 0.42)) nodes.push(p);
  }
  const seen = new Set(), tubes = [];
  nodes.forEach((a, i) => {
    nodes.map((b, j) => [a.distanceToSquared(b), j]).sort((x, y) => x[0] - y[0]).slice(1, 4).forEach(([, j]) => {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (seen.has(key)) return;
      seen.add(key);
      const b = nodes[j];
      const mid = a.clone().lerp(b, 0.5).add(new THREE.Vector3(gauss(R), gauss(R), gauss(R)).multiplyScalar(0.1));
      tubes.push(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, b), 10, 0.02, 5, false));
    });
  });
  const fiber = new THREE.Group();
  const fibMat = std({ roughness: 0.75 });
  fiber.add(new THREE.Mesh(mergeGeometries(tubes), fibMat));
  const nodeMat = std();
  const nodeMesh = instanced(sphere(1), nodeMat, nodes.length);
  nodes.forEach((p, i) => setInst(nodeMesh, i, p.x, p.y, p.z, 0.05));
  fiber.add(nodeMesh);
  scene.add(fiber);

  const loop = new THREE.Group();
  loop.rotation.x = 1.22;
  const RAD = 3.25;
  const ringMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.55 });
  loop.add(new THREE.Mesh(new THREE.TorusGeometry(RAD, 0.012, 6, 200), ringMat));
  const stepMat = std();
  const steps = instanced(sphere(2), stepMat, 4);
  const glowMat = std({ emissive: 0x000000, roughness: 0.3 });
  const glow = new THREE.Mesh(sphere(2), glowMat);
  glow.scale.setScalar(0.12);
  loop.add(steps, glow);
  scene.add(loop);

  const keys = ['design', 'make', 'measure', 'learn'];
  const caption = captionSetter(el);
  const pulse = new Float32Array(4);

  stage.update = (dt, t) => {
    const ang = t * 0.55;
    glow.position.set(Math.cos(ang) * RAD, Math.sin(ang) * RAD, 0);
    const lap = ((ang % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const idx = Math.floor(lap / (Math.PI / 2));
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2;
      let d = Math.abs(lap - a); d = Math.min(d, 2 * Math.PI - d);
      pulse[k] = Math.max(pulse[k] - dt * 1.5, d < 0.12 ? 1 : 0);
      setInst(steps, k, Math.cos(a) * RAD, Math.sin(a) * RAD, 0, 0.09 * (1 + 0.7 * pulse[k]));
    }
    steps.instanceMatrix.needsUpdate = true;
    fiber.rotation.set(0.3, t * 0.12, 0);
    fiber.scale.setScalar(1 + 0.025 * Math.sin(t * 0.9));
    caption(keys[idx]);
  };

  return () => {
    const p = palette();
    fibMat.color.set(p.accentSoft);
    nodeMat.color.set(p.accent);
    ringMat.color.set(p.line);
    stepMat.color.set(p.blue);
    glowMat.color.set(p.accent);
    glowMat.emissive.set(p.accent).multiplyScalar(0.4);
  };
}

/* ---------------- Water confined between graphene and MoS₂ ---------------- */
function sceneWater(stage, el) {
  const { scene, camera } = stage;
  camera.position.set(0, 0.5, 8.4);
  camera.lookAt(0, 0, 0);
  const R = rng(13);
  const H = 2.1, GAP = 0.85;
  const group = new THREE.Group();
  scene.add(group);

  // Graphene (top): honeycomb drawn as bonds plus small carbon atoms
  const b = 0.24, a1 = [Math.sqrt(3) * b, 0], a2 = [Math.sqrt(3) * b / 2, 1.5 * b];
  const cPts = [], bonds = [];
  for (let i = -14; i <= 14; i++) for (let j = -12; j <= 12; j++) {
    const ox = i * a1[0] + j * a2[0], oz = j * a2[1];
    const A = [ox, oz], B = [ox, oz + b];
    for (const p of [A, B]) if (Math.abs(p[0]) < H && Math.abs(p[1]) < H) cPts.push(p);
    // bonds from B to its three A neighbours: same cell, cell + a2, cell + a2 − a1
    for (const nb of [[ox, oz], [ox + a2[0], oz + a2[1]], [ox + a2[0] - a1[0], oz + a2[1]]]) {
      if (Math.abs(B[0]) < H && Math.abs(B[1]) < H && Math.abs(nb[0]) < H && Math.abs(nb[1]) < H) bonds.push(B[0], GAP, B[1], nb[0], GAP, nb[1]);
    }
  }
  const bondGeo = new THREE.BufferGeometry();
  bondGeo.setAttribute('position', new THREE.Float32BufferAttribute(bonds, 3));
  const bondMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.6 });
  const cMat = std({ roughness: 0.6 });
  const carbons = instanced(sphere(1), cMat, cPts.length);
  cPts.forEach((p, i) => setInst(carbons, i, p[0], GAP, p[1], 0.045));
  group.add(new THREE.LineSegments(bondGeo, bondMat), carbons);

  // MoS₂ (bottom): Mo triangular lattice sandwiched by two S layers
  const am = 0.42, mo = [], sl = [];
  for (let i = -10; i <= 10; i++) for (let j = -10; j <= 10; j++) {
    const x = i * am + j * am / 2, z = j * am * Math.sqrt(3) / 2;
    if (Math.abs(x) < H && Math.abs(z) < H) {
      mo.push([x, -GAP, z]);
      const sx = x + am / 2, sz = z + am * Math.sqrt(3) / 6;
      if (Math.abs(sx) < H && Math.abs(sz) < H) { sl.push([sx, -GAP + 0.14, sz]); sl.push([sx, -GAP - 0.14, sz]); }
    }
  }
  const moMat = std({ metalness: 0.3 }), sMat = std();
  const moMesh = instanced(sphere(1), moMat, mo.length);
  const sMesh = instanced(sphere(1), sMat, sl.length);
  mo.forEach((p, i) => setInst(moMesh, i, p[0], p[1], p[2], 0.075));
  sl.forEach((p, i) => setInst(sMesh, i, p[0], p[1], p[2], 0.06));
  group.add(moMesh, sMesh);

  // Water: two layers in the slit, diffusing in-plane with periodic wrap
  const NW = 34;
  const water = Array.from({ length: NW }, (_, i) => ({
    x: (R() * 2 - 1) * H, z: (R() * 2 - 1) * H,
    y: (i % 2 ? 1 : -1) * 0.27 + gauss(R) * 0.03,
    vx: gauss(R) * 0.2, vz: gauss(R) * 0.2,
    q: new THREE.Quaternion().setFromEuler(new THREE.Euler(R() * 6, R() * 6, R() * 6)),
    w: new THREE.Vector3(gauss(R), gauss(R), gauss(R)).normalize(),
  }));
  const oMat = std({ roughness: 0.3 }), hMat = std({ roughness: 0.3 });
  const oMesh = instanced(sphere(2), oMat, NW);
  const hMesh = instanced(sphere(1), hMat, NW * 2);
  group.add(oMesh, hMesh);
  const h1 = new THREE.Vector3(), h2 = new THREE.Vector3(), dq = new THREE.Quaternion();
  const caption = captionSetter(el);

  stage.update = (dt, t) => {
    water.forEach((w, i) => {
      w.vx += gauss(R) * dt * 0.6; w.vz += gauss(R) * dt * 0.6;
      w.vx *= 0.99; w.vz *= 0.99;
      w.x += w.vx * dt; w.z += w.vz * dt;
      if (w.x > H) w.x -= 2 * H; if (w.x < -H) w.x += 2 * H;
      if (w.z > H) w.z -= 2 * H; if (w.z < -H) w.z += 2 * H;
      dq.setFromAxisAngle(w.w, dt * 1.2);
      w.q.premultiply(dq);
      h1.set(0.078, 0.06, 0).applyQuaternion(w.q);
      h2.set(-0.078, 0.06, 0).applyQuaternion(w.q);
      const y = w.y + 0.02 * Math.sin(t * 2 + i);
      setInst(oMesh, i, w.x, y, w.z, 0.085);
      setInst(hMesh, 2 * i, w.x + h1.x, y + h1.y, w.z + h1.z, 0.05);
      setInst(hMesh, 2 * i + 1, w.x + h2.x, y + h2.y, w.z + h2.z, 0.05);
    });
    oMesh.instanceMatrix.needsUpdate = hMesh.instanceMatrix.needsUpdate = true;
    group.rotation.set(0.16, 0.55 + 0.35 * Math.sin(t * 0.2), 0);
    caption('water');
  };

  return () => {
    const p = palette();
    bondMat.color.set(p.ink);
    cMat.color.set(p.muted);
    moMat.color.set(p.blue);
    sMat.color.set(p.gold);
    oMat.color.set(p.accent);
    hMat.color.set(p.white);
  };
}

/* ---------------- boot (last, so every helper above is initialised) ---------------- */
const SCENES = { buq: sceneBUQ, mof: sceneMOF, hea: sceneHEA, aerogel: sceneAerogel, water: sceneWater };

document.querySelectorAll('.project-viz[data-viz]').forEach(el => {
  const build = SCENES[el.dataset.viz];
  const canvasBox = el.querySelector('.pv-canvas');
  if (!build || !canvasBox) return;
  const stage = createStage(canvasBox, { fov: 32, maxDpr: 2, staticTime: 6 });
  addLights(stage.scene);
  const recolor = build(stage, el);
  recolor();
  onThemeChange(() => { recolor(); stage.render(); });
  stage.run();
});
