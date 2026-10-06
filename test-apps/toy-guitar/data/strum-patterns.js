export const STRUM_PATTERNS = {
  'down-quarter': {
    id: 'down-quarter', beats: 1,
    steps: [{ at: 0, direction: 'down' }]
  },
  folk: {
    id: 'folk', beats: 4,
    steps: [
      { at: 0, direction: 'down' }, { at: 1, direction: 'down' },
      { at: 1.5, direction: 'up' }, { at: 2.5, direction: 'up' },
      { at: 3, direction: 'down' }, { at: 3.5, direction: 'up' }
    ]
  }
};

export function strumOrder(direction, frets) {
  const playable = frets.map((fret, index) => fret == null ? null : index).filter((index) => index != null);
  return direction === 'up' ? playable.reverse() : playable;
}

// Pointer events can jump over lanes during a fast flick. Return every crossed
// lane, in physical crossing order, so no string disappears between frames.
export function crossedLanes(from, to) {
  if (!Number.isInteger(to) || to < 0 || to > 5) return [];
  if (!Number.isInteger(from)) return [to];
  if (from === to) return [];
  const step = to > from ? 1 : -1;
  const lanes = [];
  for (let lane = from + step; lane !== to + step; lane += step) lanes.push(lane);
  return lanes;
}
