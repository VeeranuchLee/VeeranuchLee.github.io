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
  function setAccessories(state, id) { snapshot(state); state.accessories = state.accessories.includes(id) ? state.accessories.filter(x => x !== id) : state.accessories.concat(id); return state; }
  function undo(state) { const previous = state.history.pop(); if (previous) { state.selected = previous.selected; state.nails = previous.nails; state.accessories = previous.accessories; } return state; }
  return { NAIL_COUNT, createState, select, update, addDecoration, applyAll, resetNail, setAccessories, undo, clone };
}));
