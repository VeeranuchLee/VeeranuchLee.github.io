// Pure pose rules shared by the browser and Node tests.
export const POSE_DATASETS = Object.freeze({ standing: 'items', runway: 'runway' });

export function poseForDataset(dataset) {
  return dataset === 'runway' ? 'runway' : dataset === 'items' ? 'standing' : null;
}

export function choosePoseDoll(targetData, currentDoll) {
  return targetData.dolls.some((d) => d.id === currentDoll) ? currentDoll : targetData.dolls[0].id;
}

function counterpartId(sourceItem, targetItems) {
  if (!sourceItem) return null;
  if (sourceItem.poseCounterpart && targetItems.has(sourceItem.poseCounterpart)) return sourceItem.poseCounterpart;
  return targetItems.has(sourceItem.id) ? sourceItem.id : null;
}

// Slots the child can take off. The dress and the stage are never removed, only replaced.
const REMOVABLE_SLOTS = new Set(['crown', 'earrings', 'necklace', 'wings']);
const POSE_SLOTS = ['crown', 'earrings', 'necklace', 'wings', 'stage'];

const slotValue = (look, slot) => (look && look[slot]) || null;
const sameValue = (a, b) => {
  if (!a || !b) return !a && !b;
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (a[k] !== b[k]) return false;
  return true;
};

// Translate a look between poses, slot by slot:
//   - the slot is empty here -> it is empty there;
//   - the item has a counterpart -> wear it, with its shade and pattern;
//   - the item has no counterpart -> the slot is empty there. The dress and the stage
//     can never be empty, so they keep the target pose's own remembered choice (a
//     stale or missing one is repaired to a real dress, so a pose change can never
//     leave the doll bare or without legs).
// An item that cannot be carried is named in the returned `carry`: when the child
// switches back without touching that slot, the original item — shade and pattern
// included — is restored, so a round trip with no other taps returns exactly the
// starting look in every slot. `entered` is the look that was installed when the
// source pose was entered and `carried` the carry that came with it; together they
// tell a slot the child emptied apart from one the map itself emptied. Neither is
// persisted: after a reload the plain rules above still hold, only the way back can
// no longer restore an item the map left behind.
export function mapPoseLook(sourceData, targetData, sourceLook, rememberedTarget, doll, entered = null, carried = null) {
  const sourceItems = new Map(sourceData.items.map((item) => [item.id, item]));
  const targetItems = new Map(targetData.items.map((item) => [item.id, item]));
  const fallbackDress = targetData.items.find((item) => item.slot === 'dress');
  const next = rememberedTarget && typeof rememberedTarget === 'object'
    ? JSON.parse(JSON.stringify(rememberedTarget))
    : {};
  const carry = {};
  next.doll = doll;
  if (!next.dressColours) next.dressColours = {};
  if (!next.wingColours) next.wingColours = {};

  // a carried value came from the target pose itself, so it is safe to put back exactly
  const carriedValue = (slot, value) => {
    if (!value) return null;
    const id = typeof value === 'string' ? value : value.id;
    return targetItems.has(id) && targetItems.get(id).slot === slot ? value : null;
  };

  // ---- the dress: carried back, mapped, or this pose's own; never empty ----
  const rememberedDress = rememberedTarget && rememberedTarget.dress && targetItems.get(rememberedTarget.dress.id);
  if (!rememberedDress || rememberedDress.slot !== 'dress') {
    next.dress = { id: fallbackDress.id, shade: fallbackDress.defaultShade || 0, pattern: 'none' };
  }
  const backDress = carriedValue('dress', carried && carried.dress);
  const sourceDress = sourceLook && sourceLook.dress && sourceItems.get(sourceLook.dress.id);
  if (backDress && entered && sameValue(entered.dress, sourceLook && sourceLook.dress)) {
    next.dress = {
      id: backDress.id,
      shade: Number.isInteger(backDress.shade) ? backDress.shade : (targetItems.get(backDress.id).defaultShade || 0),
      pattern: targetData.patterns.includes(backDress.pattern) ? backDress.pattern : 'none',
    };
  } else if (sourceDress) {
    const mappedDress = counterpartId(sourceDress, targetItems);
    if (mappedDress && targetItems.get(mappedDress).slot === 'dress') {
      next.dress = {
        id: mappedDress,
        shade: Number.isInteger(sourceLook.dress.shade) ? sourceLook.dress.shade : (targetItems.get(mappedDress).defaultShade || 0),
        pattern: targetData.patterns.includes(sourceLook.dress.pattern) ? sourceLook.dress.pattern : 'none',
      };
    } else {
      carry.dress = {
        id: sourceLook.dress.id,
        shade: Number.isInteger(sourceLook.dress.shade) ? sourceLook.dress.shade : (sourceDress.defaultShade || 0),
        pattern: sourceData.patterns.includes(sourceLook.dress.pattern) ? sourceLook.dress.pattern : 'none',
      };
    }
  }
  next.dressColours[next.dress.id] = { shade: next.dress.shade, pattern: next.dress.pattern };

  // ---- crown, earrings, necklace, wings and the stage ----
  for (const slot of POSE_SLOTS) {
    const live = slotValue(sourceLook, slot);
    const back = carriedValue(slot, carried && carried[slot]);
    if (back && entered && sameValue(slotValue(entered, slot), live)) {
      next[slot] = typeof back === 'object' ? { ...back } : back; // untouched: the original comes back
      continue;
    }
    const liveItem = live && sourceItems.get(typeof live === 'string' ? live : live.id);
    const mapped = counterpartId(liveItem, targetItems);
    if (mapped && targetItems.get(mapped).slot === slot) {
      next[slot] = slot === 'wings'
        ? { id: mapped, shade: Number.isInteger(live.shade) ? live.shade : (targetItems.get(mapped).defaultShade || 0) }
        : mapped;
    } else if (!live) {
      next[slot] = null; // empty here: empty there
    } else if (REMOVABLE_SLOTS.has(slot)) {
      next[slot] = null; // no counterpart: the slot is empty there until the child returns
      carry[slot] = typeof live === 'object' ? { ...live } : live;
    }
    // a stage with no counterpart keeps the remembered stage cloned into next above
  }

  if (sourceLook && Number.isInteger(sourceLook.hairShade)) next.hairShade = sourceLook.hairShade;
  return { look: next, carry };
}

export function rememberPoseLook(poses, pose, doll, look) {
  poses[pose].doll = doll;
  poses[pose].looks[doll] = look;
  return look;
}

export function recalledPoseLook(poses, pose) {
  const memory = poses[pose];
  return memory.looks[memory.doll];
}

export function entryPose(entry, fallback = 'standing') {
  return entry && (entry.pose === 'standing' || entry.pose === 'runway') ? entry.pose : fallback;
}

export function tagAlbum(entries, pose) {
  return entries.filter((e) => e && e.look && typeof e.t === 'number')
    .map((e) => ({ id: e.id, t: e.t, pose: entryPose(e, pose), look: e.look }));
}

export function mergeLegacyAlbums(standing, runway) {
  return [...tagAlbum(standing, 'standing'), ...tagAlbum(runway, 'runway')]
    .sort((a, b) => b.t - a.t);
}
