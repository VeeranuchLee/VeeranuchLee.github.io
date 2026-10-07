// Toy Guitar — wraps the sound/visual performer so every call is also given to
// the recorder. The board talks only to this; playback talks to the inner one.

export function recordingPerformer(inner, recorder) {
  return {
    pluck(lane, fret, o = {}) {
      recorder.record({ type: 'pluck', lane, fret, velocity: o.velocity ?? 0.8, bend: o.bend || 0, via: o.via || 'pick' }, o.when || 0);
      inner.pluck(lane, fret, o);
    },
    retune(lane, fret, o = {}) {
      recorder.record({ type: 'retune', lane, fret, bend: o.bend || 0, via: o.via || 'slide' });
      inner.retune(lane, fret, o);
    },
    mute(o) { recorder.record({ type: 'mute' }); inner.mute(o); },
    held(lane, fret, frets) { recorder.record({ type: 'held', lane, fret }); inner.held(lane, fret, frets); },
    // a support pad: the pad's own id, so the take knows the exact sound
    hit(id, o = {}) { recorder.record({ type: 'hit', id, velocity: o.velocity ?? 1 }); inner.hit(id, o); }
  };
}
