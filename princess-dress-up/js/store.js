// Saved state through the shared SafeStorage helper: with Safari storage blocked the app
// still plays and simply forgets (PLAN.md 3.3). Looks are tiny recipes; album cards are
// recipes too and are re-drawn from them, never stored as images (PLAN.md 6.2).
let KEY = 'dress-up-room.v1';
const SCHEMA = 1;

// Each art set keeps its own looks and album (their item ids differ).
export function useDataset(name) { KEY = name && name !== 'items' ? `dress-up-room.v1.${name}` : 'dress-up-room.v1'; }

function storage() {
  try { return window.SafeStorage ? window.SafeStorage.local : null; } catch (e) { return null; }
}

export function load() {
  const st = storage();
  let raw = null;
  try { raw = st ? st.getItem(KEY) : null; } catch (e) { raw = null; }
  let parsed = null;
  try { parsed = raw ? JSON.parse(raw) : null; } catch (e) { parsed = null; }
  if (!parsed || parsed.schema !== SCHEMA) return { schema: SCHEMA, doll: null, looks: {}, album: [], sound: true };
  return {
    schema: SCHEMA,
    doll: typeof parsed.doll === 'string' ? parsed.doll : null,
    looks: parsed.looks && typeof parsed.looks === 'object' ? parsed.looks : {},
    album: Array.isArray(parsed.album) ? parsed.album : [],
    sound: parsed.sound !== false,
  };
}

export function save(state) {
  const st = storage();
  if (!st) return false;
  try { return st.setItem(KEY, JSON.stringify({ ...state, schema: SCHEMA })); } catch (e) { return false; }
}
