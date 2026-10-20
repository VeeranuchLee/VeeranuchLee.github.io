/* Nail Salon — the salon colour wall.
   Owner, 2026-10-20, verbatim: "Nail app. I want more color. My daughter pass by nail salon
   and she wow by the pink, purple, blue color display (on each display they have like 100
   shades, arranged in gradients style showing lot of fake nails)".

   The wall is a salon tip display: every family is a shelf of little drawn nail tips, rows
   step across hue and columns run light -> deep. Shades are generated in OKLCH so the
   gradient is perceptually even, mapped into sRGB by reducing chroma only (never a clipped
   channel), and checked for near-duplicates by tools/check-colour-wall.mjs.

   The tips on the full wall are too small to tap one by one, so a tap on the wall frames ten
   shades of that row and takes them back to the Polish tray, where the child paints as
   usual (owner, same day, after trying it: the TRAY is where you pick). Each shelf is ONE
   canvas (540 tips in total), not thousands of nodes.

   UMD like state-core.js: Node imports the palette for the checks; the browser gets
   window.NailColourWall. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NailColourWall = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const COLS = 25;        /* tips per row on the three big shelves */
  const SMALL_COLS = 20;  /* tips per row on the smaller shelves */
  /* rows: one [hue, chroma scale] per row, so a family's rows differ in hue AND in
     vividness (bright, soft, dusty) -- at the pale end sRGB is too narrow for hue alone to
     keep 100 shades apart. L runs light -> deep along each row. chroma: [at the
     light end, peak, at the deep end]; peakAt is the column fraction where chroma peaks.
     Chroma is reduced further wherever sRGB cannot hold it. */
  const FAMILIES = [
    { id:'pink',   label:'Pinks',   big:true, rows:[[337,0.99],[351,0.64],[11,0.72],[348,0.28]], L:[0.904,0.350], chroma:[0.121,0.251,0.085], peakAt:0.39 },
    { id:'purple', label:'Purples', big:true, rows:[[319,0.98],[304,0.82],[286,0.5],[315,0.28]], L:[0.884,0.280], chroma:[0.154,0.288,0.137], peakAt:0.39 },
    { id:'blue',   label:'Blues',   big:true, rows:[[264,0.84],[243,0.84],[224,0.61],[205,0.86]], L:[0.892,0.300], chroma:[0.119,0.178,0.213], peakAt:0.64 },
    { id:'red',    label:'Reds',    rows:[[23,0.96],[34,0.68]],  L:[0.800,0.350], chroma:[0.154,0.237,0.108], peakAt:0.36 },
    { id:'orange', label:'Oranges', rows:[[47,0.93],[75,0.81]],   L:[0.950,0.530], chroma:[0.042,0.196,0.124], peakAt:0.58 },
    { id:'yellow', label:'Yellows', rows:[[92,0.98],[111,0.59]], L:[0.989,0.590], chroma:[0.098,0.298,0.060], peakAt:0.64 },
    { id:'green',  label:'Greens',  rows:[[152,0.86],[173,0.86]], L:[0.940,0.414], chroma:[0.248,0.198,0.282], peakAt:0.42 },
    { id:'nude',   label:'Nudes',   rows:[[61,0.71],[35,0.45]],   L:[0.880,0.406], chroma:[0.057,0.062,0.071], peakAt:0.34 },
    { id:'mono',   label:'Black, grey and white', rows:[[0,0],[263,0.73]], L:[0.976,0.125], chroma:[0.019,0.047,0.074] }
  ];

  /* ── OKLCH -> sRGB (Björn Ottosson's OKLab) ── */
  function oklabToLinear(L, a, b) {
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
    const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
    return [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    ];
  }
  const encode = v => v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  function oklch(L, C, h) {
    const r = h * Math.PI / 180;
    return [L, C * Math.cos(r), C * Math.sin(r)];
  }
  function inGamut(lin) { return lin.every(v => v >= -1e-4 && v <= 1 + 1e-4); }
  /* Keep L and hue, lower chroma until the colour fits sRGB (binary search). */
  function fitChroma(L, C, h) {
    if (inGamut(oklabToLinear(...oklch(L, C, h)))) return C;
    let lo = 0, hi = C;
    for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; if (inGamut(oklabToLinear(...oklch(L, mid, h)))) lo = mid; else hi = mid; }
    return lo;
  }
  function hex(lin) {
    return '#' + lin.map(v => Math.round(Math.min(1, Math.max(0, encode(Math.min(1, Math.max(0, v))))) * 255).toString(16).padStart(2, '0')).join('');
  }
  function chromaAt(f, t) {
    const [c0, cp, c1] = f.chroma, p = f.peakAt || .5;
    return t <= p ? c0 + (cp - c0) * Math.sin((t / p) * Math.PI / 2) : cp + (c1 - cp) * ((t - p) / (1 - p)) ** 1.4;
  }
  /* Each family is rows x 25 shades. Rows are offset by a fraction of an L step so that two
     rows never land on the same lightness at the pale end, where hue alone is too faint
     to tell shades apart. */
  function buildPalette() {
    return FAMILIES.map(f => {
      const rows = f.rows.map(([hue, scale], r) => {
        const cols = f.big ? COLS : SMALL_COLS;
        const step = (f.L[0] - f.L[1]) / (cols - 1), n = f.rows.length, offset = (r / n - .5 + .5 / n) * step;
        return Array.from({ length: cols }, (_, c) => {
          const t = c / (cols - 1);
          const L = Math.min(.99, f.L[0] - (f.L[0] - f.L[1]) * t + offset);
          const h = hue;
          const want = chromaAt(f, t) * scale;
          const C = fitChroma(L, want, h);
          return { id: `${f.id}-${r}-${c}`, hex: hex(oklabToLinear(...oklch(L, C, h))), L, C, h };
        });
      });
      return { id: f.id, label: f.label, big: !!f.big, cols: f.big ? COLS : SMALL_COLS, rows };
    });
  }
  function hexToOklab(value) {
    const n = parseInt(value.slice(1), 16), ch = [n >> 16 & 255, n >> 8 & 255, n & 255].map(v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    const [r, g, b] = ch;
    const l = Math.cbrt(0.4122214708 * r + 0.5363015253 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
  }

  /* ── browser UI ── */
  const RECENT_KEY = 'ns_recent_colours_v1';
  const MAX_RECENT = 8;
  const LENS = 10;
  function loadRecent() {
    try { const v = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); return Array.isArray(v) ? v.filter(x => /^#[0-9a-f]{6}$/.test(x)).slice(0, MAX_RECENT) : []; }
    catch (e) { return []; }
  }
  function rememberRecent(value) {
    const list = [value].concat(loadRecent().filter(x => x !== value)).slice(0, MAX_RECENT);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch (e) {}
    return list;
  }

  /* A press-on tip, base at the bottom, rounded free edge at the top. */
  function tipPath(ctx, x, y, w, h) {
    const r = w / 2;
    ctx.beginPath();
    ctx.moveTo(x + w * .06, y + h * .93);
    ctx.bezierCurveTo(x - w * .02, y + h * .6, x, y + r * 1.1, x + w * .1, y + r * .55);
    ctx.bezierCurveTo(x + w * .26, y - h * .01, x + w * .74, y - h * .01, x + w * .9, y + r * .55);
    ctx.bezierCurveTo(x + w, y + r * 1.1, x + w * 1.02, y + h * .6, x + w * .94, y + h * .93);
    ctx.quadraticCurveTo(x + w * .5, y + h * .82, x + w * .06, y + h * .93);
    ctx.closePath();
  }
  function drawTip(ctx, x, y, w, h, colour) {
    tipPath(ctx, x, y, w, h);
    ctx.fillStyle = colour; ctx.fill();
    ctx.save(); ctx.clip();
    /* soft side shading + a curved gloss highlight */
    const side = ctx.createLinearGradient(x, 0, x + w, 0);
    side.addColorStop(0, 'rgba(255,255,255,.26)'); side.addColorStop(.35, 'rgba(255,255,255,0)');
    side.addColorStop(.75, 'rgba(0,0,0,0)'); side.addColorStop(1, 'rgba(40,10,40,.2)');
    ctx.fillStyle = side; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.beginPath();
    ctx.ellipse(x + w * .34, y + h * .36, w * .1, h * .25, -.12, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,.62)'; ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + w * .63, y + h * .17, w * .06, h * .05, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fill();
    ctx.restore();
    tipPath(ctx, x, y, w, h);
    ctx.lineWidth = Math.max(.6, w * .035); ctx.strokeStyle = 'rgba(90,40,80,.28)'; ctx.stroke();
  }
  function tipSvg(colour) {
    return `<svg viewBox="0 0 40 56" aria-hidden="true"><path d="M2.4 52 C-.8 34 0 13 4 8 C10 -.6 30 -.6 36 8 C40 13 40.8 34 37.6 52 Q20 46 2.4 52Z" fill="${colour}" stroke="#5a285047" stroke-width="1.4"/><path d="M2.4 52 C-.8 34 0 13 4 8 C10 -.6 30 -.6 36 8 C40 13 40.8 34 37.6 52 Q20 46 2.4 52Z" fill="url(#wallTipShade)"/><ellipse cx="13.6" cy="20" rx="4" ry="13" fill="#fff" opacity=".6" transform="rotate(-7 13.6 20)"/><ellipse cx="25" cy="9.5" rx="2.4" ry="2.6" fill="#fff" opacity=".5"/></svg>`;
  }

  /* The stretch the child last chose on the wall lives in the Polish tray (owner,
     2026-10-20: "when we select range of color, maybe we get to replace 8-10 of color in
     the bottom with the range of color"). Remembered per device so it survives a reload. */
  const GROUP_KEY = 'ns_wall_group_v1';
  function loadGroup() {
    try {
      const g = JSON.parse(localStorage.getItem(GROUP_KEY) || 'null');
      if (!g || !Array.isArray(g.colours)) return null;
      const colours = g.colours.filter(x => /^#[0-9a-f]{6}$/.test(x)).slice(0, LENS);
      return colours.length ? { colours, source: g.source || null } : null;
    } catch (e) { return null; }
  }
  function saveGroup(g) { try { if (g) localStorage.setItem(GROUP_KEY, JSON.stringify(g)); else localStorage.removeItem(GROUP_KEY); } catch (e) {} }

  function mount(ctx) {
    const palette = buildPalette();
    const all = new Map();
    palette.forEach(f => f.rows.forEach((row, r) => row.forEach((s, c) => all.set(s.hex, { family: f, r, c }))));
    let lens = null; /* {family, r, c0} */
    let open = false, closing = null;

    const overlay = document.createElement('div');
    overlay.className = 'colour-wall';
    overlay.hidden = true;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Colour wall');
    overlay.innerHTML = `
      <svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><linearGradient id="wallTipShade" x1="0" x2="1"><stop stop-color="#fff" stop-opacity=".25"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/><stop offset=".75" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#28082a" stop-opacity=".2"/></linearGradient></defs></svg>
      <div class="wall-top">
        <button class="wall-recent" type="button" aria-label="Put the colours you used in the tray" hidden></button>
        <button class="wall-close" type="button" aria-label="Back to the hand"><span aria-hidden="true">✓</span></button>
      </div>
      <div class="wall-board"><div class="wall-columns"></div><div class="wall-lens" aria-hidden="true"></div></div>`;
    document.body.append(overlay);
    const recentButton = overlay.querySelector('.wall-recent');
    const board = overlay.querySelector('.wall-board');
    const columns = overlay.querySelector('.wall-columns');
    const lensBox = overlay.querySelector('.wall-lens');
    const shelves = [];

    palette.forEach(f => {
      const shelf = document.createElement('div');
      shelf.className = 'wall-shelf' + (f.big ? ' wall-shelf--big' : '');
      shelf.dataset.family = f.id;
      shelf.style.setProperty('--rows', f.rows.length);
      const canvas = document.createElement('canvas');
      canvas.setAttribute('role', 'button');
      canvas.setAttribute('aria-label', `${f.label}: ${f.rows.length * f.cols} colours. Tap a row to put ten of them in the tray.`);
      shelf.append(canvas);
      shelves.push({ family: f, shelf, canvas });
      canvas.addEventListener('click', e => {
        const box = canvas.getBoundingClientRect();
        const c = Math.min(f.cols - 1, Math.max(0, Math.floor((e.clientX - box.left) / box.width * f.cols)));
        const r = Math.min(f.rows.length - 1, Math.max(0, Math.floor((e.clientY - box.top) / box.height * f.rows.length)));
        choose(f, r, c);
      });
    });
    function layoutColumns() {
      const landscape = innerWidth > innerHeight;
      columns.replaceChildren();
      const groups = landscape ? [shelves.filter(s => s.family.big), shelves.filter(s => !s.family.big)] : [shelves];
      groups.forEach(g => { const col = document.createElement('div'); col.className = 'wall-column'; g.forEach(s => col.append(s.shelf)); columns.append(col); });
      columns.dataset.layout = landscape ? 'two' : 'one';
    }
    function drawShelves() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      shelves.forEach(({ family, canvas }) => {
        const box = canvas.getBoundingClientRect();
        if (!box.width || !box.height) return;
        canvas.width = Math.round(box.width * dpr); canvas.height = Math.round(box.height * dpr);
        const g = canvas.getContext('2d');
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.clearRect(0, 0, box.width, box.height);
        const rows = family.rows.length, cw = box.width / family.cols, rh = box.height / rows;
        const h = Math.min(rh * .84, cw * 1.75), w = Math.min(cw * .86, h * .66);
        family.rows.forEach((row, r) => {
          /* the little acrylic rail each row of tips stands on */
          const railY = r * rh + rh * .5 + h * .5;
          g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(0, railY - 1, box.width, Math.max(2, rh * .07));
          g.fillStyle = 'rgba(176,112,150,.18)'; g.fillRect(0, railY - 1 + Math.max(2, rh * .07), box.width, 1.5);
          row.forEach((s, c) => drawTip(g, c * cw + (cw - w) / 2, railY - h, w, h, s.hex));
        });
      });
      placeLens();
    }
    function placeLens() {
      if (!lens) { lensBox.hidden = true; return; }
      const s = shelves.find(x => x.family === lens.family);
      const b = board.getBoundingClientRect(), box = s.canvas.getBoundingClientRect();
      const cw = box.width / lens.family.cols, rh = box.height / lens.family.rows.length;
      lensBox.hidden = false;
      lensBox.style.left = (box.left - b.left + lens.c0 * cw - 3) + 'px';
      lensBox.style.top = (box.top - b.top + lens.r * rh - 3) + 'px';
      lensBox.style.width = (cw * LENS + 6) + 'px';
      lensBox.style.height = (rh + 6) + 'px';
    }
    function setLens(family, r, c) {
      const c0 = Math.min(family.cols - LENS, Math.max(0, c - Math.floor(LENS / 2)));
      lens = { family, r, c0 };
      placeLens();
      return c0;
    }
    /* One tap on the wall: frame the stretch, let the child see the frame land, then go
       back to the hand with those ten shades at the front of the tray. */
    function choose(family, r, c) {
      if (closing) return;
      const c0 = setLens(family, r, c);
      lensBox.classList.remove('chosen'); void lensBox.offsetWidth; lensBox.classList.add('chosen');
      const group = { colours: family.rows[r].slice(c0, c0 + LENS).map(s => s.hex), source: { family: family.id, r, c0 } };
      saveGroup(group);
      closing = setTimeout(() => { closing = null; hide(group); }, 420);
    }
    function renderTop() {
      const recent = loadRecent();
      recentButton.hidden = recent.length < 2;
      recentButton.innerHTML = recent.slice(0, LENS).map(tipSvg).join('');
    }
    recentButton.addEventListener('click', () => {
      if (closing) return;
      const group = { colours: loadRecent().slice(0, LENS), source: 'recent' };
      saveGroup(group);
      lens = null; placeLens();
      hide(group);
    });
    function show() {
      open = true;
      overlay.hidden = false;
      document.documentElement.classList.add('wall-open');
      layoutColumns(); renderTop();
      const g = loadGroup(), src = g && g.source && g.source.family && palette.find(f => f.id === g.source.family);
      lens = src && src.rows[g.source.r] ? { family: src, r: g.source.r, c0: g.source.c0 } : null;
      requestAnimationFrame(drawShelves);
      overlay.querySelector('.wall-close').focus({ preventScroll: true });
    }
    function hide(group) {
      open = false;
      overlay.hidden = true;
      lensBox.classList.remove('chosen');
      document.documentElement.classList.remove('wall-open');
      ctx.closed(group || null);
    }
    overlay.querySelector('.wall-close').addEventListener('click', () => { if (!closing) hide(null); });
    overlay.addEventListener('keydown', e => { if (e.key === 'Escape' && !closing) hide(null); });
    let resizeTimer = null;
    addEventListener('resize', () => { if (!open) return; clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { layoutColumns(); drawShelves(); }, 120); });
    return { show, hide, isOpen: () => open, palette, recent: loadRecent, remember: rememberRecent, group: loadGroup, clearGroup: () => saveGroup(null), isWallColour: v => all.has(v) };
  }

  return { COLS, SMALL_COLS, LENS, FAMILIES, buildPalette, hexToOklab, mount, loadRecent, tipSvg, RECENT_KEY, GROUP_KEY };
}));
