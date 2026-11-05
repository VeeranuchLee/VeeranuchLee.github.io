// The look: a small JSON recipe per doll (PLAN.md 6.4), and the wardrobe rules (3.3).
// Pure functions, no DOM, so tools/test-rules.mjs can run them in Node.
//
// look = { doll, dress: {id, shade, pattern}, hairShade, crown, earrings, necklace,
//          wings: {id, shade} | null, stage, dressColours: {id: {shade, pattern}},
//          wingColours: {id: shade} }

export function index(data) {
  const byId = new Map(data.items.map((it) => [it.id, it]));
  const dolls = new Map(data.dolls.map((d) => [d.id, d]));
  return { byId, dolls };
}

const clone = (x) => JSON.parse(JSON.stringify(x));

export function defaultLook(data, dollId) {
  const doll = data.dolls.find((d) => d.id === dollId) || data.dolls[0];
  const L = doll.look;
  const look = {
    doll: doll.id,
    dress: { id: L.dress.id, shade: L.dress.shade, pattern: L.dress.pattern || 'none' },
    hairShade: doll.hairShade,
    crown: L.crown || null,
    earrings: L.earrings || null,
    necklace: L.necklace || null,
    wings: null,
    stage: L.stage,
    dressColours: {},
    wingColours: {},
  };
  look.dressColours[look.dress.id] = { shade: look.dress.shade, pattern: look.dress.pattern };
  if (L.wings) {
    const w = data.items.find((i) => i.id === L.wings);
    look.wings = { id: L.wings, shade: w ? w.defaultShade || 0 : 0 };
  }
  return look;
}

// A stored look may name an item that no longer exists: it still loads, minus that item.
// The dress and stage can never be empty, so they fall back to the doll's default.
export function sanitize(data, raw, dollId) {
  const { byId, dolls } = index(data);
  const doll = dolls.has(dollId) ? dollId : data.dolls[0].id;
  const base = defaultLook(data, doll);
  if (!raw || typeof raw !== 'object') return base;
  const ok = (id, slot) => typeof id === 'string' && byId.has(id) && byId.get(id).slot === slot;
  const nShade = (v, pal) => (Number.isInteger(v) && v >= 0 && v < data.palettes[pal].length ? v : null);
  const nPat = (p) => (data.patterns.includes(p) ? p : 'none');
  const look = clone(base);
  look.doll = doll;
  if (raw.dress && ok(raw.dress.id, 'dress')) {
    look.dress = { id: raw.dress.id, shade: nShade(raw.dress.shade, 'dress') ?? byId.get(raw.dress.id).defaultShade ?? 0, pattern: nPat(raw.dress.pattern) };
  }
  if (nShade(raw.hairShade, 'hair') !== null) look.hairShade = raw.hairShade;
  for (const slot of ['crown', 'earrings', 'necklace']) {
    if (raw[slot] === null) look[slot] = null;
    else if (ok(raw[slot], slot)) look[slot] = raw[slot];
  }
  if (raw.wings === null) look.wings = null;
  else if (raw.wings && ok(raw.wings.id, 'wings')) look.wings = { id: raw.wings.id, shade: nShade(raw.wings.shade, 'dress') ?? 0 };
  if (ok(raw.stage, 'stage')) look.stage = raw.stage;
  look.dressColours = {};
  if (raw.dressColours && typeof raw.dressColours === 'object') {
    for (const [id, c] of Object.entries(raw.dressColours)) {
      if (ok(id, 'dress') && c) look.dressColours[id] = { shade: nShade(c.shade, 'dress') ?? 0, pattern: nPat(c.pattern) };
    }
  }
  look.dressColours[look.dress.id] = { shade: look.dress.shade, pattern: look.dress.pattern };
  look.wingColours = {};
  if (raw.wingColours && typeof raw.wingColours === 'object') {
    for (const [id, v] of Object.entries(raw.wingColours)) if (ok(id, 'wings') && nShade(v, 'dress') !== null) look.wingColours[id] = v;
  }
  return look;
}

// What wearing an item would do. Returns { look, change } where change is
// 'wear' | 'remove' | 'same'. A dress or stage is never removed, only replaced;
// tapping a worn accessory takes it off; one item per slot.
export function applyItem(data, look, item, { removable = true } = {}) {
  const next = clone(look);
  const slot = item.slot;
  if (slot === 'dress') {
    if (look.dress.id === item.id) return { look: next, change: 'same' };
    const keep = look.dressColours[item.id] || { shade: item.defaultShade ?? 0, pattern: 'none' };
    next.dress = { id: item.id, shade: keep.shade, pattern: keep.pattern };
    next.dressColours[item.id] = { ...keep };
    return { look: next, change: 'wear' };
  }
  if (slot === 'hair') {
    if (look.hairShade === item.shade) return { look: next, change: 'same' };
    next.hairShade = item.shade;
    return { look: next, change: 'wear' };
  }
  if (slot === 'stage') {
    if (look.stage === item.id) return { look: next, change: 'same' };
    next.stage = item.id;
    return { look: next, change: 'wear' };
  }
  if (slot === 'wings') {
    if (look.wings && look.wings.id === item.id) {
      if (!removable) return { look: next, change: 'same' };
      next.wings = null;
      return { look: next, change: 'remove' };
    }
    next.wings = { id: item.id, shade: look.wingColours[item.id] ?? item.defaultShade ?? 0 };
    return { look: next, change: 'wear' };
  }
  // crown, earrings, necklace
  if (look[slot] === item.id) {
    if (!removable) return { look: next, change: 'same' };
    next[slot] = null;
    return { look: next, change: 'remove' };
  }
  next[slot] = item.id;
  return { look: next, change: 'wear' };
}

export function isWorn(look, item) {
  switch (item.slot) {
    case 'dress': return look.dress.id === item.id;
    case 'hair': return look.hairShade === item.shade;
    case 'wings': return !!look.wings && look.wings.id === item.id;
    default: return look[item.slot] === item.id;
  }
}

// Colour and pattern change only the selected item (the Minnie failure, PLAN.md 3.3).
export function setShade(look, target, shade) {
  const next = clone(look);
  if (target === 'dress') {
    if (next.dress.shade === shade) return null;
    next.dress.shade = shade;
    next.dressColours[next.dress.id] = { shade, pattern: next.dress.pattern };
  } else if (target === 'hair') {
    if (next.hairShade === shade) return null;
    next.hairShade = shade;
  } else if (target === 'wings') {
    if (!next.wings || next.wings.shade === shade) return null;
    next.wings.shade = shade;
    next.wingColours[next.wings.id] = shade;
  } else return null;
  return next;
}

export function setPattern(look, pattern) {
  if (look.dress.pattern === pattern) return null;
  const next = clone(look);
  next.dress.pattern = pattern;
  next.dressColours[next.dress.id] = { shade: next.dress.shade, pattern };
  return next;
}

export function currentShade(look, target) {
  if (target === 'dress') return look.dress.shade;
  if (target === 'hair') return look.hairShade;
  if (target === 'wings') return look.wings ? look.wings.shade : null;
  return null;
}

// "Surprise me" only ever produces a curated theme look (QA-PLAN 3.1). The doll keeps
// her own hair so she stays herself.
export function surprise(data, look, rand = Math.random, avoidTheme = null) {
  const others = data.themes.filter((t) => t.id !== avoidTheme);
  const pool = others.length ? others : data.themes;
  const theme = pool[Math.floor(rand() * pool.length) % pool.length];
  const col = theme.colourings[Math.floor(rand() * theme.colourings.length) % theme.colourings.length];
  const next = clone(look);
  next.dress = { id: theme.dress, shade: col.shade, pattern: col.pattern || 'none' };
  next.dressColours[theme.dress] = { shade: col.shade, pattern: next.dress.pattern };
  next.crown = theme.crown || null;
  next.earrings = theme.earrings || null;
  next.necklace = theme.necklace || null;
  if (theme.wings) {
    const shade = col.wingShade ?? 0;
    next.wings = { id: theme.wings, shade };
    next.wingColours[theme.wings] = shade;
  } else next.wings = null;
  next.stage = theme.stage;
  return { look: next, theme };
}

// A complete theme set ("full coord") earns the finale's crown of stars.
export function matchedTheme(data, look) {
  return data.themes.find((t) =>
    t.dress === look.dress.id && (t.crown || null) === look.crown && (t.earrings || null) === look.earrings &&
    (t.necklace || null) === look.necklace && (t.wings || null) === (look.wings ? look.wings.id : null) && t.stage === look.stage) || null;
}

export function sameLook(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
