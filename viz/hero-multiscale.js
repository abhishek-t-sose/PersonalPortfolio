/* ============================================================
   hero-multiscale.js — the faint background loop behind the homepage hero.
   One set of particles tells a multiscale story on a 24 s cycle:
     atomistic FCC lattice → coarse-grained beads (centroid mapping)
     → a fibrous, aerogel-like network → back to the lattice.
   ============================================================ */

import {
  THREE, createStage, palette, onThemeChange, rng, fcc, fiberNetwork,
  setInst, instanced, addLights, smooth, lerp,
} from './viz-core.js';

const container = document.getElementById('heroViz');
const labels = [...document.querySelectorAll('[data-hero-stage]')];
if (container) init();

function init() {
  const stage = createStage(container, { fov: 30, maxDpr: 1.75, staticTime: 17 });
  const { scene, camera } = stage;
  camera.position.set(0, 0, 17);
  addLights(scene);
  scene.fog = new THREE.Fog(0xffffff, 13, 21);

  const R = rng(11);
  const group = new THREE.Group();
  scene.add(group);

  /* ---- atomistic: 4×4×4 FCC cells = 256 atoms ---- */
  const A = 0.95;
  const atoms = fcc(4, A);
  const N = atoms.length;

  /* ---- coarse-grained: map atoms onto a coarser FCC grid, bead = centroid ---- */
  const sites = fcc(2, 2 * A);
  const owner = atoms.map(p => {
    let best = 0, bd = Infinity;
    sites.forEach((s, i) => {
      const d = (p[0] - s[0]) ** 2 + (p[1] - s[1]) ** 2 + (p[2] - s[2]) ** 2;
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  });
  const used = [...new Set(owner)];
  const beadIndex = new Map(used.map((s, i) => [s, i]));
  const beads = used.map(s => {
    const members = atoms.filter((_, i) => owner[i] === s);
    return [0, 1, 2].map(d => members.reduce((acc, m) => acc + m[d], 0) / members.length);
  });
  const atomBead = owner.map(s => beadIndex.get(s));
  const B = beads.length;

  /* ---- network: points strung along interconnected fibres ---- */
  const net = fiberNetwork(R, { junctions: 11, fibers: 15, radius: 3.9 });
  const lens = net.curves.map(c => c.getLength());
  const total = lens.reduce((a, b) => a + b, 0);
  const netPts = [];
  net.curves.forEach((c, ci) => {
    const n = ci === net.curves.length - 1 ? N - netPts.length : Math.round(N * lens[ci] / total);
    for (let k = 0; k < n; k++) {
      const p = c.getPointAt((k + 0.5) / n);
      netPts.push([p.x, p.y, p.z]);
    }
  });
  // Each bead's atoms take the free network points closest to that bead, so the
  // unfolding reads as "beads spinning out into fibres", not a random scatter.
  const target = new Array(N);
  const taken = new Uint8Array(N);
  const order = [...Array(N).keys()].sort((a, b) => atomBead[a] - atomBead[b]);
  for (const i of order) {
    const c = beads[atomBead[i]].map(v => v * 1.9);
    let best = -1, bd = Infinity;
    for (let j = 0; j < N; j++) {
      if (taken[j]) continue;
      const d = (netPts[j][0] - c[0]) ** 2 + (netPts[j][1] - c[1]) ** 2 + (netPts[j][2] - c[2]) ** 2;
      if (d < bd) { bd = d; best = j; }
    }
    taken[best] = 1;
    target[i] = netPts[best];
  }

  /* ---- meshes ---- */
  const atomMat = new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.15 });
  const atomMesh = instanced(new THREE.IcosahedronGeometry(1, 2), atomMat, N);
  const beadMat = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.05 });
  const beadMesh = instanced(new THREE.IcosahedronGeometry(1, 3), beadMat, B);
  const tubeMat = new THREE.MeshStandardMaterial({ roughness: 0.8, transparent: true, opacity: 0, depthWrite: false });
  const tubes = net.curves.map(c => new THREE.Mesh(new THREE.TubeGeometry(c, 96, 0.035, 6, false), tubeMat));
  group.add(atomMesh, beadMesh, ...tubes);

  const phase = Float32Array.from({ length: N }, () => R() * Math.PI * 2);
  const beadPhase = Float32Array.from({ length: B }, () => R() * Math.PI * 2);

  function recolor() {
    const p = palette();
    atomMat.color.set(p.accent);
    beadMat.color.set(p.blue);
    tubeMat.color.set(p.accentSoft);
    scene.fog.color.set(p.bg);
    if (!stage.running) stage.render();
  }
  recolor();
  onThemeChange(recolor);

  /* ---- layout: sit to the right on wide screens, centred on narrow ones ---- */
  stage.onResize = (w, h) => {
    const halfW = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z * (w / h);
    group.position.x = w > 900 ? halfW * 0.6 : 0;
    group.scale.setScalar(w > 900 ? 0.9 : Math.min(0.8, halfW / 3.2));
  };

  let mx = 0, my = 0, sx = 0, sy = 0;
  window.addEventListener('pointermove', e => {
    mx = e.clientX / window.innerWidth - 0.5;
    my = e.clientY / window.innerHeight - 0.5;
  }, { passive: true });

  const CYCLE = 24, rA = 0.19, rN = 0.11, rB = 0.58;
  let activeLabel = -1;

  stage.update = (dt, t) => {
    const s = t % CYCLE;
    const toCG = smooth((s - 5) / 2.5);
    const toNet = smooth((s - 12) / 3);
    const toLat = smooth((s - 21) / 3);
    const beadScale = smooth((s - 6) / 2) * (1 - smooth((s - 12) / 1.8));
    const tubeAlpha = smooth((s - 13) / 2) * (1 - toLat) * 0.85;

    for (let i = 0; i < N; i++) {
      const a = atoms[i], b = beads[atomBead[i]], n = target[i];
      const bp = beadPhase[atomBead[i]];
      const bj = 0.06 * Math.sin(t * 1.3 + bp); // beads jiggle as a unit
      let x, y, z, r;
      if (s < 12) {
        x = lerp(a[0], b[0] + bj, toCG); y = lerp(a[1], b[1], toCG); z = lerp(a[2], b[2] - bj, toCG);
        r = lerp(rA, 0, smooth((s - 5.5) / 2));
      } else if (s < 21) {
        x = lerp(b[0], n[0], toNet); y = lerp(b[1], n[1], toNet); z = lerp(b[2], n[2], toNet);
        r = lerp(0, rN, smooth((s - 12.5) / 2.5));
      } else {
        x = lerp(n[0], a[0], toLat); y = lerp(n[1], a[1], toLat); z = lerp(n[2], a[2], toLat);
        r = lerp(rN, rA, toLat);
      }
      const j = 0.025 * Math.sin(t * 2.1 + phase[i]); // thermal vibration
      setInst(atomMesh, i, x + j, y - j, z + j * 0.5, r);
    }
    atomMesh.instanceMatrix.needsUpdate = true;

    for (let k = 0; k < B; k++) {
      const b = beads[k], bj = 0.06 * Math.sin(t * 1.3 + beadPhase[k]);
      setInst(beadMesh, k, b[0] + bj, b[1], b[2] - bj, rB * beadScale);
    }
    beadMesh.instanceMatrix.needsUpdate = true;
    tubeMat.opacity = tubeAlpha;
    tubes.forEach(m => (m.visible = tubeAlpha > 0.01));

    sx += (mx - sx) * Math.min(1, dt * 2);
    sy += (my - sy) * Math.min(1, dt * 2);
    group.rotation.y = t * 0.09 + sx * 0.5;
    group.rotation.x = 0.35 + sy * 0.3;

    const label = s < 6.25 ? 0 : s < 13.5 ? 1 : s < 22.5 ? 2 : 0;
    if (label !== activeLabel) {
      labels.forEach((el, i) => el.classList.toggle('on', i === label));
      activeLabel = label;
    }
  };

  stage.run();
}
