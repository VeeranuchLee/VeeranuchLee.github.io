// Pure pose rules shared by the browser and Node tests.
export const POSE_DATASETS = Object.freeze({ standing: 'items', runway: 'runway' });

export function poseForDataset(dataset) {
  return dataset === 'runway' ? 'runway' : dataset === 'items' ? 'standing' : null;
}

export function choosePoseDoll(targetData, currentDoll) {
  return targetData.dolls.some((d) => d.id === currentDoll) ? currentDoll : targetData.dolls[0].id;
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
