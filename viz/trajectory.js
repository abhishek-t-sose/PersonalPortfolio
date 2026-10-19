/* ============================================================
   trajectory.js — in-browser MD trajectory player for trajectory.html.
   Reads multi-frame XYZ / extended XYZ and LAMMPS dump files, then plays
   them back with instanced spheres. Nothing leaves the browser.

   Curated files committed to the repo can be opened directly:
     trajectory.html?src=assets/traj/my-run.xyz   (same-origin paths only)
   ============================================================ */

import { THREE, createStage, palette, onThemeChange, isDark, rng, gauss, fcc, addLights } from './viz-core.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* ---------- element table: approximate display radius (Å) + colour ---------- */
const ELEMENTS = {
  H: [0.32, '#EDEDED'], He: [0.6, '#D9FFFF'], Li: [0.9, '#9C6FCF'], B: [0.85, '#F0A0A0'], C: [0.75, '#5A5A5A'],
  N: [0.7, '#3B6FD0'], O: [0.7, '#D0453A'], F: [0.6, '#8FD06A'], Na: [1.1, '#8C6FD0'], Mg: [1.2, '#5FA05F'],
  Al: [1.2, '#A9A9B8'], Si: [1.1, '#C0A080'], P: [1.05, '#E8913A'], S: [1.0, '#E2BC3C'], Cl: [0.95, '#3FBF4F'],
  Ar: [1.3, '#80B8D0'], K: [1.3, '#7F5FC0'], Ca: [1.4, '#4FA04F'], Ti: [1.35, '#A0A0A8'], Cr: [1.3, '#8A99C7'],
  Fe: [1.3, '#B04A32'], Co: [1.25, '#D27AA0'], Ni: [1.25, '#50A050'], Cu: [1.3, '#C8803A'], Zn: [1.2, '#7D80B0'],
  Br: [1.15, '#A0522D'], Zr: [1.5, '#94C8C8'], Mo: [1.4, '#5B8DB8'], Pd: [1.35, '#6F8FA8'], Ag: [1.4, '#B8B8C8'],
  Pt: [1.35, '#A8A8B8'], Au: [1.4, '#D4AF37'],
};

/* ---------- parsers ---------- */
function parseXYZ(text) {
  const lines = text.split(/\r?\n/);
  const frames = [], boxes = [];
  let species = null, i = 0;
  while (i < lines.length) {
    const n = parseInt(lines[i], 10);
    if (!Number.isFinite(n) || n <= 0) { i++; continue; }
    const comment = lines[i + 1] || '';
    const pos = new Float32Array(n * 3);
    const sp = [];
    for (let a = 0; a < n; a++) {
      const t = (lines[i + 2 + a] || '').trim().split(/\s+/);
      sp.push(t[0]);
      pos[3 * a] = +t[1]; pos[3 * a + 1] = +t[2]; pos[3 * a + 2] = +t[3];
    }
    if (!species) species = sp;
    if (sp.length === species.length) {
      frames.push(pos);
      const lat = comment.match(/Lattice="([^"]+)"/i);
      if (lat) {
        const v = lat[1].trim().split(/\s+/).map(Number);
        boxes.push({ lo: [0, 0, 0], hi: [v[0], v[4], v[8]] }); // orthogonal part only
      } else boxes.push(null);
    }
    i += n + 2;
  }
  return { species: species || [], frames, boxes };
}

function parseLAMMPS(text) {
  const lines = text.split(/\r?\n/);
  const frames = [], boxes = [];
  let species = null, n = 0, box = null, i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('ITEM: NUMBER OF ATOMS')) { n = parseInt(lines[i + 1], 10); i += 2; continue; }
    if (line.startsWith('ITEM: BOX BOUNDS')) {
      const b = [1, 2, 3].map(k => lines[i + k].trim().split(/\s+/).map(Number));
      box = { lo: b.map(r => r[0]), hi: b.map(r => r[1]) };
      i += 4; continue;
    }
    if (line.startsWith('ITEM: ATOMS')) {
      const cols = line.slice(11).trim().split(/\s+/);
      const col = names => names.map(c => cols.indexOf(c)).find(k => k >= 0) ?? -1;
      const ix = col(['x', 'xu']), iy = col(['y', 'yu']), iz = col(['z', 'zu']);
      const sx = col(['xs', 'xsu']), sy = col(['ys', 'ysu']), sz = col(['zs', 'zsu']);
      const iid = cols.indexOf('id'), itype = cols.indexOf('type'), iel = cols.indexOf('element');
      const scaled = ix < 0 && sx >= 0;
      const rows = [];
      for (let a = 0; a < n; a++) rows.push(lines[i + 1 + a].trim().split(/\s+/));
      if (iid >= 0) rows.sort((p, q) => +p[iid] - +q[iid]); // atoms are not written in id order in parallel runs
      const pos = new Float32Array(n * 3);
      const sp = [];
      rows.forEach((t, a) => {
        if (scaled) {
          pos[3 * a] = box.lo[0] + +t[sx] * (box.hi[0] - box.lo[0]);
          pos[3 * a + 1] = box.lo[1] + +t[sy] * (box.hi[1] - box.lo[1]);
          pos[3 * a + 2] = box.lo[2] + +t[sz] * (box.hi[2] - box.lo[2]);
        } else {
          pos[3 * a] = +t[ix]; pos[3 * a + 1] = +t[iy]; pos[3 * a + 2] = +t[iz];
        }
        sp.push(iel >= 0 ? t[iel] : itype >= 0 ? `type ${t[itype]}` : 'atom');
      });
      if (!species) species = sp;
      if (sp.length === species.length) { frames.push(pos); boxes.push(box && { lo: [...box.lo], hi: [...box.hi] }); }
      i += n + 1; continue;
    }
    i++;
  }
  return { species: species || [], frames, boxes };
}

export function parseTrajectory(text, name = '') {
  const isDump = /\.(lammpstrj|dump)$/i.test(name) || text.startsWith('ITEM:');
  const traj = isDump ? parseLAMMPS(text) : parseXYZ(text);
  if (!traj.frames.length || !traj.species.length) throw new Error('No frames found. Expected XYZ or LAMMPS dump format.');
  if (traj.frames.some(f => f.some(v => !Number.isFinite(v)))) throw new Error('Some coordinates could not be read.');
  traj.name = name;
  return traj;
}

/* ---------- synthetic demo: a Lennard-Jones crystal heated until it melts ---------- */
function ljDemo() {
  const R = rng(2024);
  const n = 4, rho = 0.85, a = Math.cbrt(4 / rho), L = n * a, N = 4 * n ** 3;
  const x = new Float64Array(N * 3), v = new Float64Array(N * 3), f = new Float64Array(N * 3);
  fcc(n, a).forEach((p, i) => { for (let d = 0; d < 3; d++) x[3 * i + d] = ((p[d] + L / 2 + a / 4) % L + L) % L; });
  for (let i = 0; i < N * 3; i++) v[i] = gauss(R);
  const SIGMA = 3.4; // argon, Å
  const rc2 = 2.5 * 2.5, dt = 0.004;

  function forces() {
    f.fill(0);
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
      let dx = x[3 * i] - x[3 * j], dy = x[3 * i + 1] - x[3 * j + 1], dz = x[3 * i + 2] - x[3 * j + 2];
      dx -= L * Math.round(dx / L); dy -= L * Math.round(dy / L); dz -= L * Math.round(dz / L);
      const r2 = dx * dx + dy * dy + dz * dz;
      if (r2 > rc2) continue;
      const ir2 = 1 / r2, ir6 = ir2 * ir2 * ir2, ff = 24 * ir2 * ir6 * (2 * ir6 - 1);
      f[3 * i] += ff * dx; f[3 * i + 1] += ff * dy; f[3 * i + 2] += ff * dz;
      f[3 * j] -= ff * dx; f[3 * j + 1] -= ff * dy; f[3 * j + 2] -= ff * dz;
    }
  }
  const temp = () => { let k = 0; for (let i = 0; i < N * 3; i++) k += v[i] * v[i]; return k / (3 * N); };
  const rescale = T0 => { const s = Math.sqrt(T0 / temp()); for (let i = 0; i < N * 3; i++) v[i] *= s; };
  rescale(0.4);
  forces();

  const FRAMES = 160, STEPS = 14, frames = [];
  for (let fr = 0; fr < FRAMES; fr++) {
    const T0 = 0.4 + 1.8 * Math.min(1, Math.max(0, (fr - 25) / 90)); // hold, heat, hold
    for (let s = 0; s < STEPS; s++) {
      for (let i = 0; i < N * 3; i++) { v[i] += 0.5 * dt * f[i]; x[i] = ((x[i] + dt * v[i]) % L + L) % L; }
      forces();
      for (let i = 0; i < N * 3; i++) v[i] += 0.5 * dt * f[i];
      const lam = Math.sqrt(1 + (dt / 0.1) * (T0 / temp() - 1)); // Berendsen thermostat
      for (let i = 0; i < N * 3; i++) v[i] *= lam;
    }
    frames.push(Float32Array.from(x, c => c * SIGMA));
  }
  const box = { lo: [0, 0, 0], hi: [L * SIGMA, L * SIGMA, L * SIGMA] };
  return {
    name: 'Demo: Lennard-Jones argon crystal heated through melting (256 atoms, synthetic)',
    species: new Array(N).fill('Ar'), frames, boxes: frames.map(() => box),
  };
}

/* ---------- the player ---------- */
const host = document.getElementById('trajViz');
if (host) initPlayer();

function initPlayer() {
  const $ = id => document.getElementById(id);
  const ui = {
    drop: $('trajDrop'), file: $('trajFile'), demo: $('trajDemo'), empty: $('trajEmpty'), status: $('trajStatus'),
    play: $('trajPlay'), slider: $('trajSlider'), frame: $('trajFrame'), speed: $('trajSpeed'),
    size: $('trajSize'), boxToggle: $('trajBox'), snap: $('trajSnap'), legend: $('trajLegend'), info: $('trajInfo'),
  };

  const stage = createStage(host, { fov: 35, animate: true, preserveDrawingBuffer: true });
  const { scene, camera, renderer } = stage;
  addLights(scene);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  const root = new THREE.Group();
  scene.add(root);
  let traj = null, mesh = null, boxLines = null, baseR = null, frame = 0, playing = false, acc = 0;
  const boxMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.6 });

  function typeColors() {
    const p = palette();
    return [p.accent, p.blue, p.gold, p.green, p.violet, p.muted, p.accentSoft, p.ink];
  }

  // Nearest-neighbour spacing from a sample of frame 0 sets the size of
  // anything that isn't a known element (LAMMPS types, CG beads, …).
  function typicalSpacing(pos, n) {
    const m = Math.min(n, 1500), step = Math.max(1, Math.floor(n / 200));
    const d = [];
    for (let i = 0; i < m; i += step) {
      let best = Infinity;
      for (let j = 0; j < m; j++) {
        if (i === j) continue;
        const dx = pos[3 * i] - pos[3 * j], dy = pos[3 * i + 1] - pos[3 * j + 1], dz = pos[3 * i + 2] - pos[3 * j + 2];
        const r2 = dx * dx + dy * dy + dz * dz;
        if (r2 > 1e-8 && r2 < best) best = r2;
      }
      if (best < Infinity) d.push(Math.sqrt(best));
    }
    d.sort((a, b) => a - b);
    return d.length ? d[Math.floor(d.length / 2)] : 1;
  }

  function load(t) {
    traj = t;
    if (mesh) { root.remove(mesh); mesh.geometry.dispose(); }
    if (boxLines) { root.remove(boxLines); boxLines.geometry.dispose(); boxLines = null; }
    const n = t.species.length;
    const detail = n < 2000 ? 3 : n < 20000 ? 1 : 0;
    mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, detail), new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.1 }), n);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    root.add(mesh);

    const spacing = typicalSpacing(t.frames[0], n);
    const kinds = [...new Set(t.species)];
    baseR = new Float32Array(n);
    t.species.forEach((s, i) => { const el = ELEMENTS[s]; baseR[i] = el ? el[0] : 0.38 * spacing; });
    t.kinds = kinds;

    const b = t.boxes[0];
    let center, radius;
    if (b) {
      center = new THREE.Vector3((b.lo[0] + b.hi[0]) / 2, (b.lo[1] + b.hi[1]) / 2, (b.lo[2] + b.hi[2]) / 2);
      radius = 0.5 * Math.hypot(b.hi[0] - b.lo[0], b.hi[1] - b.lo[1], b.hi[2] - b.lo[2]);
      const g = new THREE.BoxGeometry(b.hi[0] - b.lo[0], b.hi[1] - b.lo[1], b.hi[2] - b.lo[2]);
      boxLines = new THREE.LineSegments(new THREE.EdgesGeometry(g), boxMat);
      g.dispose();
      boxLines.position.copy(center);
      boxLines.visible = ui.boxToggle.checked;
      root.add(boxLines);
    } else {
      const bb = new THREE.Box3();
      const v = new THREE.Vector3();
      for (let i = 0; i < n; i++) bb.expandByPoint(v.fromArray(t.frames[0], 3 * i));
      center = bb.getCenter(new THREE.Vector3());
      radius = Math.max(bb.getSize(new THREE.Vector3()).length() / 2, spacing);
    }
    root.position.copy(center).negate();
    const dist = radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.05;
    camera.position.set(dist * 0.55, dist * 0.35, dist * 0.76);
    camera.near = dist / 100; camera.far = dist * 10;
    camera.updateProjectionMatrix();
    controls.target.set(0, 0, 0);
    controls.update();

    recolor();
    ui.slider.max = t.frames.length - 1;
    ui.slider.disabled = ui.play.disabled = ui.snap.disabled = false;
    ui.empty.hidden = true;
    ui.info.textContent = `${t.name} · ${n.toLocaleString()} atoms · ${t.frames.length.toLocaleString()} frames`;
    setFrame(0);
    setPlaying(t.frames.length > 1);
  }

  function setFrame(k) {
    if (!traj) return;
    frame = k;
    const pos = traj.frames[k], a = mesh.instanceMatrix.array, s = +ui.size.value;
    for (let i = 0, n = traj.species.length; i < n; i++) {
      const o = i * 16, r = baseR[i] * s;
      a[o] = r; a[o + 1] = 0; a[o + 2] = 0; a[o + 3] = 0;
      a[o + 4] = 0; a[o + 5] = r; a[o + 6] = 0; a[o + 7] = 0;
      a[o + 8] = 0; a[o + 9] = 0; a[o + 10] = r; a[o + 11] = 0;
      a[o + 12] = pos[3 * i]; a[o + 13] = pos[3 * i + 1]; a[o + 14] = pos[3 * i + 2]; a[o + 15] = 1;
    }
    mesh.instanceMatrix.needsUpdate = true;
    const b = traj.boxes[k];
    if (boxLines && b) boxLines.scale.set(
      (b.hi[0] - b.lo[0]) / (traj.boxes[0].hi[0] - traj.boxes[0].lo[0]),
      (b.hi[1] - b.lo[1]) / (traj.boxes[0].hi[1] - traj.boxes[0].lo[1]),
      (b.hi[2] - b.lo[2]) / (traj.boxes[0].hi[2] - traj.boxes[0].lo[2]));
    ui.slider.value = k;
    ui.frame.textContent = `${k + 1} / ${traj.frames.length}`;
  }

  function recolor() {
    boxMat.color.set(palette().line);
    if (!traj) return;
    const tc = typeColors(), c = new THREE.Color();
    const colorOf = s => {
      const el = ELEMENTS[s];
      if (el) return el[1] === '#5A5A5A' && isDark() ? '#9A9A9A' : el[1]; // keep carbon visible on dark
      return tc[traj.kinds.indexOf(s) % tc.length];
    };
    traj.species.forEach((s, i) => mesh.setColorAt(i, c.set(colorOf(s))));
    mesh.instanceColor.needsUpdate = true;
    ui.legend.innerHTML = traj.kinds.slice(0, 12).map(s =>
      `<span><i style="background:${colorOf(s)}"></i>${s.replace(/[<>&]/g, '')}</span>`).join('') +
      (traj.kinds.length > 12 ? `<span>+${traj.kinds.length - 12} more</span>` : '');
  }
  onThemeChange(() => { recolor(); stage.render(); });

  function setPlaying(on) {
    playing = on && !!traj && traj.frames.length > 1;
    ui.play.textContent = playing ? 'Pause' : 'Play';
  }

  stage.update = dt => {
    controls.update();
    if (!playing) return;
    acc += dt * +ui.speed.value;
    if (acc >= 1) {
      const steps = Math.floor(acc);
      acc -= steps;
      setFrame((frame + steps) % traj.frames.length);
    }
  };

  function status(msg, isError = false) {
    ui.status.textContent = msg;
    ui.status.classList.toggle('error', isError);
  }

  async function loadFile(file) {
    status(`Reading ${file.name}…`);
    try {
      const t = parseTrajectory(await file.text(), file.name);
      load(t);
      status('');
    } catch (e) { status(e.message, true); }
  }

  ui.drop.addEventListener('click', () => ui.file.click());
  ui.drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ui.file.click(); } });
  ui.file.addEventListener('change', () => ui.file.files[0] && loadFile(ui.file.files[0]));
  ['dragover', 'dragleave', 'drop'].forEach(evt => ui.drop.addEventListener(evt, e => {
    e.preventDefault();
    ui.drop.classList.toggle('drag', evt === 'dragover');
  }));
  ui.drop.addEventListener('drop', e => e.dataTransfer.files[0] && loadFile(e.dataTransfer.files[0]));
  ui.demo.addEventListener('click', e => {
    e.preventDefault();
    status('Running a short Lennard-Jones simulation…');
    setTimeout(() => { load(ljDemo()); status(''); }, 30); // let the status paint first
  });
  ui.play.addEventListener('click', () => setPlaying(!playing));
  ui.slider.addEventListener('input', () => { setPlaying(false); setFrame(+ui.slider.value); });
  ui.size.addEventListener('input', () => setFrame(frame));
  ui.boxToggle.addEventListener('change', () => { if (boxLines) boxLines.visible = ui.boxToggle.checked; });
  ui.snap.addEventListener('click', () => {
    stage.render();
    const a = document.createElement('a');
    a.download = `frame-${frame + 1}.png`;
    a.href = renderer.domElement.toDataURL('image/png');
    a.click();
  });

  stage.run();
  recolor();

  // ?src=assets/traj/run.xyz — only relative, same-origin paths are accepted
  const src = new URLSearchParams(location.search).get('src');
  if (src && /^[\w\-./]+$/.test(src) && !src.includes('..') && !src.startsWith('/')) {
    status(`Loading ${src}…`);
    fetch(src).then(r => { if (!r.ok) throw new Error(`Could not load ${src} (${r.status})`); return r.text(); })
      .then(text => { load(parseTrajectory(text, src.split('/').pop())); status(''); })
      .catch(e => status(e.message, true));
  }
}
