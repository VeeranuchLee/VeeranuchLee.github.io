(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NailSalonState = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const NAIL_COUNT = 5;
  const freshNail = () => ({ shape: 'round', length: 'short', polish: '#ef7caf', finish: 'solid', pattern: 'none', patternColor: '#ffffff', stickers: [], gems: [], sparkle: 'none' });
  const clone = value => JSON.parse(JSON.stringify(value));
  function createState() { return { selected: 2, nails: Array.from({ length: NAIL_COUNT }, freshNail), accessories: [], history: [] }; }
  function snapshot(state) { state.history.push(clone({ selected: state.selected, nails: state.nails, accessories: state.accessories })); if (state.history.length > 40) state.history.shift(); }
  function select(state, index) { if (index >= 0 && index < NAIL_COUNT) state.selected = index; return state; }
  function update(state, patch) { snapshot(state); Object.assign(state.nails[state.selected], patch); return state; }
  function addDecoration(state, kind, id) {
    const key = kind === 'gem' ? 'gems' : 'stickers';
    const list = state.nails[state.selected][key];
    snapshot(state);
    if (!list.length || list[0] !== id) state.nails[state.selected][key] = [id];
    else if (list.length < 4) list.push(id);
    else state.nails[state.selected][key] = [];
    return state;
  }
  function applyAll(state) { snapshot(state); const design = clone(state.nails[state.selected]); state.nails = state.nails.map(() => clone(design)); return state; }
  function resetNail(state) { snapshot(state); state.nails[state.selected] = freshNail(); return state; }
  function resetAll(state) { snapshot(state); state.nails = Array.from({ length: NAIL_COUNT }, freshNail); state.accessories = []; state.history = []; return state; }
  function setAccessories(state, id) { snapshot(state); state.accessories = state.accessories.includes(id) ? state.accessories.filter(x => x !== id) : state.accessories.concat(id); return state; }
  /* Saved designs ("My nails") store polish as #rrggbb, whether it came from the quick 12 or
     the colour wall (2026-10-20), so any valid hex is accepted; anything else falls back. */
  const HEX = /^#[0-9a-f]{6}$/i;
  function sanitizeColour(value, fallback) { return typeof value === 'string' && HEX.test(value) ? value.toLowerCase() : fallback; }
  function sanitizeNail(n) {
    const base = freshNail(), src = n && typeof n === 'object' ? n : {};
    const text = (v, d) => typeof v === 'string' && v ? v : d;
    return {
      shape: text(src.shape, base.shape), length: text(src.length, base.length),
      polish: sanitizeColour(src.polish, base.polish), finish: text(src.finish, base.finish),
      pattern: text(src.pattern, base.pattern), patternColor: sanitizeColour(src.patternColor, base.patternColor),
      stickers: Array.isArray(src.stickers) ? src.stickers.filter(x => typeof x === 'string').slice(0, 4) : [],
      gems: Array.isArray(src.gems) ? src.gems.filter(x => typeof x === 'string').slice(0, 4) : [],
      sparkle: text(src.sparkle, base.sparkle)
    };
  }
  function sanitizeDesign(d) {
    if (!d || !Array.isArray(d.nails) || d.nails.length !== NAIL_COUNT) return null;
    return { nails: d.nails.map(sanitizeNail), accessories: Array.isArray(d.accessories) ? d.accessories.filter(x => typeof x === 'string') : [] };
  }
  function undo(state) { const previous = state.history.pop(); if (previous) { state.selected = previous.selected; state.nails = previous.nails; state.accessories = previous.accessories; } return state; }
  return { NAIL_COUNT, createState, sanitizeColour, sanitizeNail, sanitizeDesign, select, update, addDecoration, applyAll, resetNail, resetAll, setAccessories, undo, clone };
}));