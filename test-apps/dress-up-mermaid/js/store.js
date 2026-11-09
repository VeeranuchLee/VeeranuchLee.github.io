// Saved state through the shared SafeStorage helper: with Safari storage blocked the app
// still plays and simply forgets (PLAN.md 3.3). Looks are tiny recipes; album cards are
// recipes too and are re-drawn from them, never stored as images (PLAN.md 6.2).
const SCHEMA = 1;
const POSE_KEY = 'dress-up-room.v2.poses';
const POSE_SCHEMA = 2;

function datasetKey(name) { return name && name !== 'items' ? `dress-up-room.v1.${name}` : 'dress-up-room.v1'; }

function storage() {
  try { return window.SafeStorage ? window.SafeStorage.local : null; } catch (e) { return null; }
}

function read(key) {
  const st = storage();
  let raw = null;
  try { raw = st ? st.getItem(key) : null; } catch (e) { raw = null; }
  let parsed = null;
  try { parsed = raw ? JSON.parse(raw) : null; } catch (e) { parsed = null; }
  return parsed;
}

function write(key, value) {
  const st = storage();
  if (!st) return false;
  try { return st.setItem(key, JSON.stringify(value)); } catch (e) { return false; }
}

// Plate B and the placeholder prototype remain URL-only sets with their original storage.
export function loadDataset(name) {
  const parsed = read(datasetKey(name));
  if (!parsed || parsed.schema !== SCHEMA) return { schema: SCHEMA, doll: null, looks: {}, album: [], sound: true };
  return {
    schema: SCHEMA,
    doll: typeof parsed.doll === 'string' ? parsed.doll : null,
    looks: parsed.looks && typeof parsed.looks === 'object' ? parsed.looks : {},
    album: Array.isArray(parsed.album) ? parsed.album : [],
    sound: parsed.sound !== false,
  };
}

export function saveDataset(name, state) {
  return write(datasetKey(name), { ...state, schema: SCHEMA });
}

// Standing and Runway share one album, while each pose owns its doll looks. A missing v2
// value tells app.js to migrate the two v1 dataset records without deleting them.
export function loadPoseRoom() {
  const parsed = read(POSE_KEY);
  if (!parsed || parsed.schema !== POSE_SCHEMA) return null;
  return {
    schema: POSE_SCHEMA,
    pose: parsed.pose === 'runway' ? 'runway' : 'standing',
    poses: parsed.poses && typeof parsed.poses === 'object' ? parsed.poses : {},
    album: Array.isArray(parsed.album) ? parsed.album : [],
    sound: parsed.sound !== false,
  };
}

export function savePoseRoom(state) {
  return write(POSE_KEY, { ...state, schema: POSE_SCHEMA });
}
