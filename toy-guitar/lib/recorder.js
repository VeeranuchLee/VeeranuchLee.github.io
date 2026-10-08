// Toy Guitar — the session recorder. Pure apart from the injected clock and
// timers, so Node can test it with a fake clock.
//
// It records what was PLAYED, not what was heard: string, fret, velocity and
// bend of every pluck, each strum crossing at its real time, slides and bends
// as retunes, mutes, held-fret changes, which guitar was sounding, every
// support-pad strike (`hit`, the pad's own id), and the toy's tone switch and
// amp effects (`tone`, `fx`) so a take replays on the sound it was made with.
// Nothing
// is flattened to anonymous note events, so playback keeps the articulation,
// and a strum is six plucks with their real spacing, never six at once.
//
// The transport has the same child-readable states as Toy Keyboard:
//   Ready | Recording… | Your song — press ▶ (take ready) | Playing… | Finished
// A take lives for the session only; nothing is saved or exported.

export const MAX_SECONDS = 120;
export const MAX_EVENTS = 6000;

export function createRecorder({ clock, setTimer = setTimeout, clearTimer = clearTimeout, target, currentModel, currentHeld, currentSettings }) {
  let take = [];
  let mode = 'idle';      // idle | recording | playing
  let startedAt = 0;
  let duration = 0;
  let timers = [];
  let ended = null;       // null | 'stop' | 'finished'
  const watchers = [];

  const snap = () => ({
    mode, hasTake: take.length > 0, duration, ended,
    elapsed: mode === 'recording' ? clock() - startedAt : 0
  });
  const changed = () => watchers.forEach((fn) => { try { fn(snap()); } catch (e) { /* keep going */ } });
  const clearTimers = () => { timers.forEach((id) => clearTimer(id)); timers = []; };

  // Called with every performer call while recording. `when` is the strum
  // offset in seconds, so crossing times survive into the take.
  function record(event, when = 0) {
    if (mode !== 'recording' || take.length >= MAX_EVENTS) return;
    take.push({ t: Math.max(0, clock() - startedAt + when), ...event });
  }

  function start() {
    if (mode === 'playing') stop();
    take = []; duration = 0; ended = null;
    startedAt = clock(); mode = 'recording';
    // a take must know the guitar it began on and what was already held
    const m = currentModel && currentModel();
    if (m) take.push({ t: 0, type: 'model', id: m });
    const set = currentSettings ? currentSettings() : null;
    if (set && set.tone) take.push({ t: 0, type: 'tone', id: set.tone });
    if (set && set.fx && Object.keys(set.fx).length) take.push({ t: 0, type: 'fx', state: { ...set.fx } });
    const held = currentHeld ? currentHeld() : [];
    held.forEach((h) => take.push({ t: 0, type: 'held', lane: h.lane, fret: h.fret }));
    timers.push(setTimer(() => { if (mode === 'recording') stop(); }, MAX_SECONDS * 1000));
    changed();
  }

  function stop() {
    if (mode === 'recording') {
      const t = clock() - startedAt;
      duration = Math.max(t, take.length ? take[take.length - 1].t : 0);
      mode = 'idle'; ended = 'stop';
      clearTimers(); changed();
    } else if (mode === 'playing') {
      clearTimers();
      target.mute(); target.heldReset();
      if (target.padsOff) target.padsOff();
      mode = 'idle'; ended = 'stop';
      changed();
    }
  }

  function play() {
    if (!take.length) return false;
    if (mode === 'recording') stop();
    if (mode === 'playing') stop();
    mode = 'playing'; ended = null;
    // the sorted order keeps same-time events (a model change then its first
    // pluck) in the sequence they were made
    take.forEach((e) => {
      timers.push(setTimer(() => {
        if (mode !== 'playing') return;
        if (e.type === 'pluck') target.pluck(e.lane, e.fret, { velocity: e.velocity, bend: e.bend, when: 0, via: e.via, source: 'play' });
        else if (e.type === 'retune') target.retune(e.lane, e.fret, { bend: e.bend, via: e.via, source: 'play' });
        else if (e.type === 'mute') target.mute({ source: 'play' });
        else if (e.type === 'held') target.held(e.lane, e.fret, e.fret === null ? [] : [e.fret], { source: 'play' });
        else if (e.type === 'model') target.setModel(e.id);
        else if (e.type === 'hit') target.hit(e.id, { velocity: e.velocity, source: 'play' });
        else if (e.type === 'tone') target.setTone(e.id, { source: 'play' });
        else if (e.type === 'fx') target.setFx(e.state, { source: 'play' });
      }, Math.max(0, e.t * 1000)));
    });
    timers.push(setTimer(() => {
      if (mode !== 'playing') return;
      target.heldReset();
      mode = 'idle'; ended = 'finished';
      changed();
    }, duration * 1000 + 400));
    changed();
    return true;
  }

  function clear() {
    if (mode !== 'idle') stop();
    take = []; duration = 0; ended = null; changed();
  }

  return {
    start, stop, play, clear, record,
    getMode: () => mode,
    getTake: () => take.slice(),
    snapshot: snap,
    onChange(fn) { watchers.push(fn); return () => { const i = watchers.indexOf(fn); if (i >= 0) watchers.splice(i, 1); }; }
  };
}

// The words each state wears — shared by the UI and the tests.
export function stateWords(s) {
  if (s.mode === 'recording') return 'Recording…';
  if (s.mode === 'playing') return 'Playing…';
  if (s.hasTake) return s.ended === 'finished' ? 'Finished! press ▶ again' : 'Your song — press ▶';
  return 'Ready';
}
