/* Hair Salon -- owner, 2026-11-24: "Doll with long hair can turn it around. Can cut hair.
   And undo. Also able to change hair color. And straight/wavy."

   HOW THE HAIR WORKS. About 350 locks, each a thin tube. A lock's shape is SIMULATED ONCE
   at load: it starts at a root on the scalp and steps downward under gravity, pushed out of
   the head, the neck and the salon cape, and kept off the face, until it reaches its full
   length. That path is the lock's "comb line". A lock only ever shows a PREFIX of it --
   `len` -- so cutting is just a shorter prefix, undo is the old number, and growing back
   is the full one. Waves are an offset added on top of the comb line, so a cut lock waves
   and a wavy lock can still be cut. Nothing here is a physics engine; it is a shape. */
import * as THREE from "./vendor/three.module.min.js";

const V3 = THREE.Vector3;
const canvas = document.getElementById("view");
const stageEl = document.getElementById("stage");
const hintEl = document.getElementById("hint");
const undoBtn = document.getElementById("undo");

/* ---------- scene ---------- */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
const doll = new THREE.Group();
scene.add(doll);

scene.add(new THREE.HemisphereLight(0xfff4fb, 0xc9b6ee, 1.35));
const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(2.5, 4, 6); scene.add(key);
const rim = new THREE.DirectionalLight(0xffe2f2, 1.1); rim.position.set(-3, 3, -5); scene.add(rim);

/* ---------- the doll (original character: big round eyes, generic face) ---------- */
/* A PLASTIC FASHION DOLL, NOT A WOODEN ONE (owner, 2026-11-24): "my daughter prefer plastic
   dolls like Barbie type than wooden dolls. The one we have in the app looks like wooden
   type." So: glossy vinyl skin (clearcoat), a slimmer OVAL head, a made-up fashion-doll face
   -- eye whites, coloured irises, thick lashes, lilac eyeshadow, thin brows, a small nose,
   glossy pink lips -- a slim neck, and shiny nylon-like hair. It is an ORIGINAL generic
   doll: no brand's face, name, logo or signature look is copied. The face is built on a
   unit sphere inside `headGroup`, which is scaled to the oval; hair collides with the
   same oval (HEAD_S), so it hugs the head. */
const HEAD_S = new V3(0.87, 1.0, 0.9);
const headGroup = new THREE.Group(); headGroup.scale.copy(HEAD_S); doll.add(headGroup);
const skin = new THREE.MeshPhysicalMaterial({ color: 0xffd8c6, roughness: 0.42, clearcoat: 0.22, clearcoatRoughness: 0.45, sheen: 0.4, sheenColor: new THREE.Color(0xffc2c8) });
const head = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), skin);
headGroup.add(head);
function onFace(x, y, lift = 0.0) {          // a point on the unit head, facing +z
  const z = Math.sqrt(Math.max(0, 1 - x * x - y * y));
  const n = new V3(x, y, z).normalize();
  return { pos: n.clone().multiplyScalar(1 + lift), n };
}
function stick(mesh, x, y, lift) {           // place a face part on the surface, facing out
  const { pos, n } = onFace(x, y, lift);
  mesh.position.copy(pos);
  mesh.lookAt(pos.clone().add(n));
  headGroup.add(mesh);
  return mesh;
}
const gloss = (color, extra = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.12, ...extra });
const EYE_Y = -0.07, EYE_X = 0.37;
const white = gloss(0xffffff), irisM = gloss(0x3f86d8), pupilM = gloss(0x141024), lashM = new THREE.MeshStandardMaterial({ color: 0x1d1420, roughness: 0.5 });
const shine = new THREE.MeshBasicMaterial({ color: 0xffffff });
for (const sx of [-1, 1]) {
  const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.195, 32, 20), white);
  sclera.scale.set(1.22, 1.0, 0.28); stick(sclera, sx * EYE_X, EYE_Y, 0.0);
  const iris = new THREE.Mesh(new THREE.SphereGeometry(0.145, 28, 18), irisM);
  iris.scale.set(1, 1, 0.3); stick(iris, sx * EYE_X, EYE_Y - 0.01, 0.03);
  const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.065, 18, 12), pupilM);
  pupil.scale.set(1, 1, 0.3); stick(pupil, sx * EYE_X, EYE_Y - 0.01, 0.045);
  stick(new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), shine), sx * EYE_X - 0.055, EYE_Y + 0.06, 0.065);
  stick(new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), shine), sx * EYE_X + 0.05, EYE_Y - 0.05, 0.065);
  const lid = new THREE.Mesh(new THREE.TorusGeometry(0.235, 0.032, 8, 28, Math.PI * 0.92), lashM);
  lid.scale.set(1.08, 0.8, 1); lid.rotation.z = Math.PI * 0.04; stick(lid, sx * EYE_X, EYE_Y - 0.02, 0.03);
  for (let k = 0; k < 3; k++) {             // lashes fanning out at the outer corner
    const lash = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.075, 3, 6), lashM);
    const lp = onFace(sx * (EYE_X + 0.17 + k * 0.05), EYE_Y + 0.12 - k * 0.035, 0.04);
    lash.position.copy(lp.pos); lash.lookAt(lp.pos.clone().add(lp.n)); lash.rotateZ(sx * (0.5 + k * 0.35)); headGroup.add(lash);
  }
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.2, 28),
    new THREE.MeshBasicMaterial({ color: 0xc79be9, transparent: true, opacity: 0.42, depthWrite: false }));
  shadow.scale.set(1.3, 0.55, 1); stick(shadow, sx * EYE_X, EYE_Y + 0.19, 0.008);
  const brow = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.024, 6, 24, Math.PI * 0.7), new THREE.MeshStandardMaterial({ color: 0x5a3526, roughness: 0.6 }));
  brow.scale.set(1.15, 0.5, 1); brow.rotation.z = Math.PI * 0.15 + (sx < 0 ? 0 : 0); stick(brow, sx * (EYE_X + 0.02), EYE_Y + 0.28, 0.01);
  const blush = new THREE.Mesh(new THREE.CircleGeometry(0.15, 24),
    new THREE.MeshBasicMaterial({ color: 0xff95ad, transparent: true, opacity: 0.32, depthWrite: false }));
  blush.scale.set(1, 0.7, 1); stick(blush, sx * 0.55, -0.3, 0.01);
  const ear = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 14), skin);
  ear.scale.set(0.5, 1, 0.6); ear.position.set(sx * 0.98, -0.1, 0.02); headGroup.add(ear);
}
{ // a small nose and glossy lips
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), gloss(0xf6c3ad, { clearcoat: 0.5, roughness: 0.4 }));
  nose.scale.set(0.7, 1.1, 0.8); stick(nose, 0, -0.27, 0.0);
  const lipM = gloss(0xe9567f), lowM = gloss(0xf26d90);
  const upper = new THREE.Mesh(new THREE.SphereGeometry(0.075, 24, 14), lipM);
  upper.scale.set(1.75, 0.34, 0.36); stick(upper, 0, -0.44, 0.0);
  const lower = new THREE.Mesh(new THREE.SphereGeometry(0.075, 24, 14), lowM);
  lower.scale.set(1.5, 0.44, 0.4); stick(lower, 0, -0.495, 0.0);
}
const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.29, 0.55, 28), skin);
neck.position.y = -1.08; doll.add(neck);
/* The salon cape is lathed from a profile with SHOULDERS, so long hair has something to
   rest on and falls over it instead of hanging straight down beside a cone. The same
   profile is the collision surface below. */
const CAPE_TOP = -1.28, CAPE_R0 = 0.36;
const CAPE_PROFILE = [[0.36, -1.28], [0.72, -1.42], [1.1, -1.58], [1.34, -1.82], [1.45, -2.2], [1.55, -2.7], [1.64, -3.2]];
function capeRadius(y) {
  const pr = CAPE_PROFILE;
  if (y >= pr[0][1]) return 0;
  for (let k = 1; k < pr.length; k++) if (y >= pr[k][1]) {
    const f = (pr[k - 1][1] - y) / (pr[k - 1][1] - pr[k][1]);
    return pr[k - 1][0] + (pr[k][0] - pr[k - 1][0]) * f;
  }
  return pr[pr.length - 1][0];
}
const cape = new THREE.Mesh(new THREE.LatheGeometry(CAPE_PROFILE.map(([r, y]) => new THREE.Vector2(r, y)).reverse(), 72),
  new THREE.MeshPhysicalMaterial({ color: 0xf6a3cb, roughness: 0.45, clearcoat: 0.35, side: THREE.DoubleSide }));
doll.add(cape);
const collar = new THREE.Mesh(new THREE.TorusGeometry(CAPE_R0, 0.06, 10, 40),
  new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }));
collar.rotation.x = Math.PI / 2; collar.position.y = CAPE_TOP; doll.add(collar);

/* ---------- hair colour ---------- */
const COLOURS = [
  ["Brown", 0x7a4a2a], ["Black", 0x2c2326], ["Blonde", 0xf0cf82], ["Ginger", 0xd36a2c],
  ["Pink", 0xf59ac9], ["Purple", 0xa98ce8], ["Blue", 0x70b6f2], ["Mint", 0x7fd8b6],
];
// Shiny, like a doll's nylon hair.
const hairMat = new THREE.MeshPhysicalMaterial({ color: COLOURS[0][1], roughness: 0.3, clearcoat: 0.45, clearcoatRoughness: 0.25, sheen: 0.6, sheenColor: new THREE.Color(0xffffff), vertexColors: true, side: THREE.DoubleSide });

/* The scalp cap: a shell in hair colour so the gaps between locks never show skin. */
function scalpMask(p, margin = 0) {
  if (p.y < -0.34 + margin) return false;                       // back and side hairline
  if (p.z > 0.3 - margin && p.y < 0.5 + margin) return false;   // the face and forehead
  return true;
}
{
  const g = new THREE.SphereGeometry(1.03, 72, 54).toNonIndexed();
  const pos = g.attributes.position, keep = [];
  const a = new V3(), b = new V3(), c = new V3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
    const m = a.clone().add(b).add(c).divideScalar(3);
    if (scalpMask(m)) for (let k = 0; k < 3; k++) keep.push(pos.getX(i + k), pos.getY(i + k), pos.getZ(i + k));
  }
  const cg = new THREE.BufferGeometry();
  cg.setAttribute("position", new THREE.Float32BufferAttribute(keep, 3));
  cg.computeVertexNormals();
  const cols = new Float32Array(keep.length).fill(0.82);
  cg.setAttribute("color", new THREE.BufferAttribute(cols, 3));
  headGroup.add(new THREE.Mesh(cg, hairMat));
}

/* ---------- comb lines (simulated once) ---------- */
const STEP = 0.03, RINGS = 34, RADIAL = 6, MIN_LEN = 0.85;
// A fashion doll wears long hair with no fringe; the fringe code stays for a later style choice.
const WITH_BANGS = false;
function rand(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const rnd = rand(20261124);
function collide(p, layer, side, bang = false) {
  const rc = 1.035 + 0.03 * layer;            // the oval head, in its own unit space
  const qx = p.x / HEAD_S.x, qy = p.y / HEAD_S.y, qz = p.z / HEAD_S.z, r = Math.hypot(qx, qy, qz);
  if (r < rc) { const k = rc / r; p.set(qx * k * HEAD_S.x, qy * k * HEAD_S.y, qz * k * HEAD_S.z); }
  /* Keep the face clear with a smooth OVAL hairline (centre a little below the eyes),
     not a box: a box pushed locks out sideways all at one height and left a ledge at the
     temple. Locks inside the oval ease out along it, so they follow the face's curve. */
  if (!bang && p.z > 0.0 && p.y > -1.15) {
    const ax = (0.9 + 0.035 * layer) * HEAD_S.x, ay = (0.74 + 0.03 * layer) * HEAD_S.y, cy = -0.1;
    const ex = p.x / ax, ey = (p.y - cy) / ay, e = Math.hypot(ex, ey);
    if (e < 1) {
      const k = e < 1e-3 ? 0 : 1 / e;
      const tx = e < 1e-3 ? side * ax : p.x * k, ty = e < 1e-3 ? p.y : cy + (p.y - cy) * k;
      p.x += (tx - p.x) * 0.5; p.y += (ty - p.y) * 0.5;
      if (Math.sign(p.x) !== side && Math.abs(p.x) < 0.05) p.x = side * 0.05;
    }
  }
  const h = Math.hypot(p.x, p.z);
  let need = 0;
  if (p.y < CAPE_TOP) need = capeRadius(p.y);
  else if (p.y < -0.8) need = 0.3;
  need += 0.045 + 0.03 * layer;
  if (need > 0.05 && h < need) {
    const k = need / Math.max(h, 1e-4);
    if (h < 1e-4) { p.x = side * need; } else { p.x *= k; p.z *= k; }
  }
}
const locks = [];
{
  /* SYMMETRIC ROOTS (owner, 2026-11-24, on the iPad: "See the hair is uneven"). Roots are
     laid out on the right half of the scalp and MIRRORED to the left, with the same layer,
     length and shading, so the two sides of the face match. */
  const N = 920, golden = Math.PI * (3 - Math.sqrt(5)), roots = [];
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2, rr = Math.sqrt(1 - y * y), th = golden * i;
    const base = new V3(Math.cos(th) * rr, y, Math.sin(th) * rr);
    if (base.x < -0.02 || !scalpMask(base, 0.05)) continue;
    const params = { layer: roots.length % 3, endY: -2.3 + (rnd() - 0.5) * 0.14, jit: rnd() * 0.5, r0: 0.054 + rnd() * 0.016, shade: 0.82 + rnd() * 0.26 };
    if (base.x <= 0.02) { roots.push({ root: base, side: i % 2 ? 1 : -1, ...params }); continue; }
    roots.push({ root: base, side: 1, ...params });
    roots.push({ root: new V3(-base.x, base.y, base.z), side: -1, ...params });
  }
  /* BANGS: two rows of short locks along the front hairline that fall forward over the
     forehead and stop just above the eyes, a little longer toward the sides. They are
     mirrored like the rest and can be trimmed. */
  if (WITH_BANGS) for (let x = 0.03; x <= 0.63; x += 0.05) for (const [row, y] of [[0, 0.64], [1, 0.73]]) {
    const z = Math.sqrt(1 - x * x - y * y);
    const params = { layer: row, endY: 0.3 - 0.14 * Math.pow(x / 0.63, 2) + (rnd() - 0.5) * 0.02, jit: rnd() * 0.5, r0: 0.05 + rnd() * 0.012, shade: 0.86 + rnd() * 0.2, bang: true };
    roots.push({ root: new V3(x, y, z), side: 1, ...params });
    roots.push({ root: new V3(-x, y, z), side: -1, ...params });
  }
  for (const R of roots) {
    const { root, layer, side, endY } = R;
    const pts = [];
    const p = root.clone().multiplyScalar(1.035 + 0.03 * layer).multiply(HEAD_S);
    const n = root.clone().divide(HEAD_S).normalize();   // the oval's surface normal
    // Front and top locks sweep aside off the face; back locks fall straight down, so the
    // back of the head has no parting showing the cape through it.
    const front = THREE.MathUtils.smoothstep(root.z, -0.35, 0.25);
    // Right on the parting a lock combs straight back rather than picking a side, so the
    // parting is a clean line instead of a tuft.
    const partSide = Math.min(1, Math.abs(root.x) / 0.18);
    const d = R.bang ? new V3(side * 0.08, -1, 0.35)
      : new V3(side * (0.08 + 0.67 * front) * partSide, -0.55, root.z > 0.1 ? -0.55 : -0.12);
    d.addScaledVector(n, -d.dot(n)).normalize();
    pts.push(p.clone());
    const prev = new V3();
    for (let k = 0; k < 400 && p.y > endY; k++) {
      prev.copy(p);
      d.multiplyScalar(0.84).add(new V3(0, -0.16, 0)).normalize();
      p.addScaledVector(d, STEP);
      collide(p, layer, side, !!R.bang);
      d.subVectors(p, prev).normalize();
      pts.push(p.clone());
    }
    const cum = new Float32Array(pts.length);
    for (let k = 1; k < pts.length; k++) cum[k] = cum[k - 1] + pts[k].distanceTo(pts[k - 1]);
    const full = cum[pts.length - 1];
    /* Neighbouring locks share a wave phase (from where their root is), so the hair
       waves in soft bands like real wavy hair rather than each lock crinkling alone. */
    locks.push({ pts, cum, full, len: full, layer, side, phase: Math.abs(Math.atan2(root.x, root.z)) * 1.5 + root.y * 2 + R.jit,
      r0: R.r0, shade: R.shade, bang: !!R.bang, minLen: R.bang ? 0.12 : MIN_LEN });
  }
}

/* ---------- geometry: every lock in one mesh ---------- */
const VPL = RINGS * RADIAL;                         // vertices per lock
const geo = new THREE.BufferGeometry();
const P = new Float32Array(locks.length * VPL * 3);
const Nn = new Float32Array(locks.length * VPL * 3);
const C = new Float32Array(locks.length * VPL * 3);
const idx = [];
locks.forEach((L, li) => {
  const base = li * VPL;
  for (let r = 0; r < RINGS - 1; r++) for (let j = 0; j < RADIAL; j++) {
    const a = base + r * RADIAL + j, b = base + r * RADIAL + (j + 1) % RADIAL;
    const c = a + RADIAL, d = b + RADIAL;
    idx.push(a, c, b, b, c, d);
  }
  for (let r = 0; r < RINGS; r++) for (let j = 0; j < RADIAL; j++) {
    const o = (base + r * RADIAL + j) * 3, t = r / (RINGS - 1);
    const s = L.shade * (0.9 + 0.22 * t);           // a little lighter toward the tips
    C[o] = C[o + 1] = C[o + 2] = s;
  }
});
geo.setIndex(idx);
geo.setAttribute("position", new THREE.BufferAttribute(P, 3).setUsage(THREE.DynamicDrawUsage));
geo.setAttribute("normal", new THREE.BufferAttribute(Nn, 3).setUsage(THREE.DynamicDrawUsage));
geo.setAttribute("color", new THREE.BufferAttribute(C, 3));
const hairMesh = new THREE.Mesh(geo, hairMat);
hairMesh.frustumCulled = false;
doll.add(hairMesh);

let wave = 0, waveTarget = 0;                       // 0 straight .. 1 wavy
const tmp = new V3(), tA = new V3(), tB = new V3();
function combAt(L, s, out) {                        // the comb line at arc length s
  const cum = L.cum;
  let lo = 0, hi = cum.length - 1;
  if (s >= cum[hi]) return out.copy(L.pts[hi]);
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
  const f = (s - cum[lo]) / Math.max(cum[hi] - cum[lo], 1e-6);
  return out.copy(L.pts[lo]).lerp(L.pts[hi], f);
}
function waveOffset(L, s, p, tangent, out) {        // waves start once the lock leaves the scalp
  out.set(0, 0, 0);
  if (wave <= 0) return out;
  const amp = wave * 0.13 * THREE.MathUtils.smoothstep(s, 0.9, 1.8);
  if (amp <= 0) return out;
  const radial = tA.set(p.x, 0, p.z); if (radial.lengthSq() < 1e-6) radial.set(0, 0, 1); radial.normalize();
  const sideV = tB.crossVectors(tangent, radial); if (sideV.lengthSq() < 1e-6) sideV.set(1, 0, 0); sideV.normalize();
  const w = s * (Math.PI * 2 / 1.05) + L.phase;
  return out.addScaledVector(sideV, Math.sin(w) * amp).addScaledVector(radial, Math.cos(w) * amp * 0.55);
}
/* Ring centres for a lock at its current length (and the wave), into `centres`. */
function centresOf(L, len, from, rings, centres) {
  const span = len - from;
  for (let r = 0; r < rings; r++) {
    const s = from + span * (r / (rings - 1));
    const c = centres[r] || (centres[r] = new V3());
    combAt(L, s, c);
  }
  if (wave > 0) {
    const off = new V3(), tan = new V3();
    const saved = centres.slice(0, rings).map(v => v.clone());
    for (let r = 0; r < rings; r++) {
      const s = from + span * (r / (rings - 1));
      tan.subVectors(saved[Math.min(r + 1, rings - 1)], saved[Math.max(r - 1, 0)]).normalize();
      centres[r].add(waveOffset(L, s, saved[r], tan, off));
    }
  }
  return centres;
}
const scratch = [];
function writeTube(centres, rings, radiusAt, posArr, nrmArr, baseVert) {
  let nPrev = null;
  const T = new V3(), Nv = new V3(), Bv = new V3(), dir = new V3();
  for (let r = 0; r < rings; r++) {
    T.subVectors(centres[Math.min(r + 1, rings - 1)], centres[Math.max(r - 1, 0)]).normalize();
    if (!nPrev) { Nv.set(0, 0, 1); if (Math.abs(T.z) > 0.9) Nv.set(1, 0, 0); }
    else Nv.copy(nPrev);
    Nv.addScaledVector(T, -Nv.dot(T)).normalize();               // parallel transport
    nPrev = Nv.clone();
    Bv.crossVectors(T, Nv);
    const rad = radiusAt(r / (rings - 1));
    for (let j = 0; j < RADIAL; j++) {
      const a = (j / RADIAL) * Math.PI * 2;
      dir.copy(Nv).multiplyScalar(Math.cos(a)).addScaledVector(Bv, Math.sin(a));
      const o = (baseVert + r * RADIAL + j) * 3;
      posArr[o] = centres[r].x + dir.x * rad; posArr[o + 1] = centres[r].y + dir.y * rad; posArr[o + 2] = centres[r].z + dir.z * rad;
      nrmArr[o] = dir.x; nrmArr[o + 1] = dir.y; nrmArr[o + 2] = dir.z;
    }
  }
}
function updateLock(i) {
  const L = locks[i];
  const cut = L.len < L.full - 1e-3;
  centresOf(L, L.len, 0, RINGS, scratch);
  writeTube(scratch, RINGS, t => {
    const tip = cut ? 0.4 : 0.85;                   // a cut end is blunt; a grown end tapers
    return L.r0 * (t < 0.82 ? 1 : 1 - tip * ((t - 0.82) / 0.18));
  }, P, Nn, i * VPL);
}
function updateAll() {
  for (let i = 0; i < locks.length; i++) updateLock(i);
  geo.attributes.position.needsUpdate = true;
  geo.attributes.normal.needsUpdate = true;
}
updateAll();

/* ---------- sound: synthesised, no files (AUDIO-DIRECTION.md) ---------- */
let actx = null;
function ac() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!actx) actx = new AC();
  if (actx.state === "suspended") actx.resume();
  return actx;
}
function snip() {
  const c = ac(); if (!c) return;
  const t = c.currentTime, len = 0.07;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * len), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
  const src = c.createBufferSource(); src.buffer = buf;
  const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 3200;
  const g = c.createGain(); g.gain.value = 0.35;
  src.connect(hp).connect(g).connect(c.destination); src.start(t);
}
function blip(f0, f1, dur = 0.14, vol = 0.18) {
  const c = ac(); if (!c) return;
  const t = c.currentTime, o = c.createOscillator(), g = c.createGain();
  o.type = "sine"; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
}

/* ---------- undo ---------- */
let colourIdx = 0;
const undoStack = [];
function snapshot() { return { lens: locks.map(L => L.len), colourIdx, wave: waveTarget }; }
function pushUndo(s) { undoStack.push(s || snapshot()); if (undoStack.length > 60) undoStack.shift(); undoBtn.disabled = false; }
const lenAnims = [];                                // [{i, from, to}] eased over animT
let animT = 1, animDur = 0.45;
function animateLengths(targets, dur) {
  lenAnims.length = 0;
  locks.forEach((L, i) => { if (Math.abs(L.len - targets[i]) > 1e-4) lenAnims.push({ i, from: L.len, to: targets[i] }); });
  animT = 0; animDur = dur;
}
undoBtn.addEventListener("click", () => {
  const s = undoStack.pop(); if (!s) return;
  blip(700, 420);
  animateLengths(s.lens, 0.35);
  setColour(s.colourIdx, false);
  setWave(s.wave, false);
  undoBtn.disabled = undoStack.length === 0;
});
document.getElementById("grow").addEventListener("click", () => {
  if (locks.every(L => L.len >= L.full - 1e-3)) { blip(500, 700); return; }
  pushUndo();
  blip(330, 990, 0.5, 0.16);
  animateLengths(locks.map(L => L.full), 0.8);
});

/* ---------- colour pots ---------- */
const potsEl = document.getElementById("pots");
const colourNow = new THREE.Color(COLOURS[0][1]), colourTo = new THREE.Color(COLOURS[0][1]);
COLOURS.forEach(([name, hex], i) => {
  const b = document.createElement("button");
  b.type = "button"; b.className = "pot" + (i === 0 ? " on" : "");
  b.style.background = "#" + hex.toString(16).padStart(6, "0");
  b.setAttribute("aria-label", name + " hair"); b.setAttribute("aria-pressed", String(i === 0));
  b.addEventListener("click", () => { if (i === colourIdx) return; pushUndo(); blip(520 + i * 40, 880 + i * 40); setColour(i, true); });
  potsEl.appendChild(b);
});
function setColour(i) {
  colourIdx = i; colourTo.setHex(COLOURS[i][1]);
  potsEl.querySelectorAll(".pot").forEach((b, k) => { b.classList.toggle("on", k === i); b.setAttribute("aria-pressed", String(k === i)); });
}

/* ---------- straight / wavy ---------- */
const waveBtns = document.querySelectorAll("[data-wave]");
function setWave(w) {
  waveTarget = w;
  waveBtns.forEach(b => { const on = Number(b.dataset.wave) === w; b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)); });
}
waveBtns.forEach(b => b.addEventListener("click", () => {
  const w = Number(b.dataset.wave); if (w === waveTarget) return;
  pushUndo(); blip(w ? 440 : 660, w ? 660 : 440, 0.22); setWave(w);
}));

/* ---------- tools: turn / cut ---------- */
let tool = "turn";
const toolBtns = document.querySelectorAll("[data-tool]");
let hintShown = false;
function hint(text) { hintEl.textContent = text; hintEl.classList.add("show"); clearTimeout(hint.t); hint.t = setTimeout(() => hintEl.classList.remove("show"), 2600); }
toolBtns.forEach(b => b.addEventListener("click", () => {
  tool = b.dataset.tool; blip(600, 800, 0.1);
  toolBtns.forEach(x => { const on = x === b; x.classList.toggle("on", on); x.setAttribute("aria-pressed", String(on)); });
  stageEl.classList.toggle("cutting", tool === "cut");
  if (tool === "cut" && !hintShown) { hintShown = true; hint("Swipe across the hair to cut"); }
}));

let yaw = 0.2, yawVel = 0;
let dragging = false, lastX = 0, lastY = 0, swipeSnap = null, swipeCut = false;
canvas.addEventListener("pointerdown", e => {
  ac();
  dragging = true; lastX = e.clientX; lastY = e.clientY;
  canvas.setPointerCapture(e.pointerId);
  yawVel = 0;
  if (tool === "cut") { swipeSnap = snapshot(); swipeCut = false; }
});
canvas.addEventListener("pointermove", e => {
  if (!dragging) return;
  const x = e.clientX, y = e.clientY;
  if (tool === "turn") {
    const dx = x - lastX; yaw += dx * 0.011; yawVel = dx * 0.011;
  } else {
    cutAlong(lastX, lastY, x, y);
  }
  lastX = x; lastY = y;
});
function endDrag() {
  if (!dragging) return; dragging = false;
  if (tool === "cut" && swipeCut) pushUndo(swipeSnap);
  swipeSnap = null;
}
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);

/* ---------- cutting ---------- */
const proj = [], projV = new V3();
function toScreen(v, rect) {
  projV.copy(v).applyMatrix4(doll.matrixWorld).project(camera);
  return [rect.left + (projV.x + 1) / 2 * rect.width, rect.top + (1 - projV.y) / 2 * rect.height, projV.z];
}
function segHit(ax, ay, bx, by, cx, cy, dx, dy) {   // param along a->b where it crosses c->d
  const r1x = bx - ax, r1y = by - ay, r2x = dx - cx, r2y = dy - cy;
  const den = r1x * r2y - r1y * r2x;
  if (Math.abs(den) < 1e-9) return -1;
  const t = ((cx - ax) * r2y - (cy - ay) * r2x) / den;
  const u = ((cx - ax) * r1y - (cy - ay) * r1x) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? t : -1;
}
const falling = [];
function cutAlong(x0, y0, x1, y1) {
  if (Math.hypot(x1 - x0, y1 - y0) < 1) return;
  const rect = canvas.getBoundingClientRect();
  doll.updateMatrixWorld();
  const cuts = [];
  for (let i = 0; i < locks.length; i++) {
    const L = locks[i];
    if (L.len <= L.minLen + 0.02) continue;
    centresOf(L, L.len, 0, RINGS, scratch);
    let prevS = null;
    for (let r = 0; r < RINGS; r++) {
      const s = proj[r] = toScreen(scratch[r], rect);
      if (prevS) {
        const t = segHit(prevS[0], prevS[1], s[0], s[1], x0, y0, x1, y1);
        if (t >= 0) {
          const at = L.len * ((r - 1 + t) / (RINGS - 1));
          if (at >= L.minLen && at < L.len - 0.03) { cuts.push([i, at]); break; }
        }
      }
      prevS = s;
    }
  }
  if (!cuts.length) return;
  swipeCut = true;
  dropPieces(cuts);
  for (const [i, at] of cuts) { locks[i].len = at; updateLock(i); }
  geo.attributes.position.needsUpdate = true; geo.attributes.normal.needsUpdate = true;
  snip();
}
/* The cut-off ends fall: one small mesh per swipe step, in world space, fading out. */
function dropPieces(cuts) {
  const R2 = 8, per = R2 * RADIAL;
  const pos = new Float32Array(cuts.length * per * 3), nrm = new Float32Array(cuts.length * per * 3);
  const col = new Float32Array(cuts.length * per * 3);
  const ids = [];
  const centres = [];
  cuts.forEach(([i, at], k) => {
    const L = locks[i];
    centresOf(L, L.len, at, R2, centres);
    for (const c of centres.slice(0, R2)) c.applyMatrix4(doll.matrixWorld);
    writeTube(centres, R2, t => L.r0 * (t < 0.8 ? 1 : 0.4), pos, nrm, k * per);
    for (let v = 0; v < per; v++) col.fill(L.shade, (k * per + v) * 3, (k * per + v) * 3 + 3);
    for (let r = 0; r < R2 - 1; r++) for (let j = 0; j < RADIAL; j++) {
      const a = k * per + r * RADIAL + j, b = k * per + r * RADIAL + (j + 1) % RADIAL;
      ids.push(a, a + RADIAL, b, b, a + RADIAL, b + RADIAL);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setIndex(ids);
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(nrm, 3));
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const m = hairMat.clone(); m.transparent = true;
  const mesh = new THREE.Mesh(g, m);
  mesh.frustumCulled = false;
  scene.add(mesh);
  falling.push({ mesh, vy: 0, vx: (Math.random() - 0.5) * 0.6, spin: (Math.random() - 0.5) * 1.2, life: 0 });
  while (falling.length > 40) { const f = falling.shift(); scene.remove(f.mesh); f.mesh.geometry.dispose(); f.mesh.material.dispose(); }
}

/* ---------- layout & loop ---------- */
function resize() {
  const w = stageEl.clientWidth, h = stageEl.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // Fit the head-to-hair-ends box (about 4.6 tall, 4.2 wide) whichever way up the iPad is.
  const fitH = 4.7, fitW = 4.4, vf = THREE.MathUtils.degToRad(camera.fov);
  const dH = (fitH / 2) / Math.tan(vf / 2), dW = (fitW / 2) / (Math.tan(vf / 2) * camera.aspect);
  camera.position.set(0, -0.62, Math.max(dH, dW) + 1.2);
  camera.lookAt(0, -0.72, 0);
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (!dragging && Math.abs(yawVel) > 1e-4) { yaw += yawVel; yawVel *= 0.92; }
  doll.rotation.y = yaw;
  let changed = false;
  if (Math.abs(wave - waveTarget) > 1e-3) { wave += (waveTarget - wave) * Math.min(1, dt * 6); if (Math.abs(wave - waveTarget) < 2e-3) wave = waveTarget; changed = true; }
  if (animT < 1) {
    animT = Math.min(1, animT + dt / animDur);
    const e = 1 - Math.pow(1 - animT, 3);
    for (const a of lenAnims) locks[a.i].len = a.from + (a.to - a.from) * e;
    changed = true;
  }
  if (changed) updateAll();
  if (!colourNow.equals(colourTo)) { colourNow.lerp(colourTo, Math.min(1, dt * 8)); hairMat.color.copy(colourNow); for (const f of falling) f.mesh.material.color.copy(colourNow); }
  for (let k = falling.length - 1; k >= 0; k--) {
    const f = falling[k];
    f.life += dt; f.vy -= 6 * dt;
    f.mesh.position.y += f.vy * dt; f.mesh.position.x += f.vx * dt; f.mesh.rotation.z += f.spin * dt;
    f.mesh.material.opacity = Math.max(0, 1 - f.life / 1.1);
    if (f.life > 1.1) { scene.remove(f.mesh); f.mesh.geometry.dispose(); f.mesh.material.dispose(); falling.splice(k, 1); }
  }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
/* For checks and debugging only. */
window.__salon = { locks, setWave, setColour, cutAlong, camera, doll, renderer, get yaw() { return yaw; }, set yaw(v) { yaw = v; } };
