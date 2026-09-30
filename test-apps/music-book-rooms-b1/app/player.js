// Score playback and note following.
//
// Audio is scheduled once, up front, on the AudioContext clock — that is the
// only clock that does not drift. The moving highlight is driven separately by
// requestAnimationFrame reading that same clock, so the picture cannot slide
// out of step with the sound even if the page stutters.
//
// A score is either a single `notes` line or
// `{ tracks: [{ id, notes, gain?, offsetBeats? }] }`.
// A note's `n` may be a pitch, an array of simultaneous pitches, or null (rest).
//
// `offsetBeats` delays a track's entry against the others. It exists so a round
// can be a real round: the same melody scheduled twice on one clock, the second
// entry late by a stated number of beats. Two ribbons drawn over one performance
// would only look like a canon; this makes the second voice actually sound.

export function pitchesOf(note) {
  if (!note || note.n === null || note.n === undefined) return [];
  return Array.isArray(note.n) ? note.n : [note.n];
}

export function tracksOf(score) {
  if (!score) return [];
  if (Array.isArray(score.tracks) && score.tracks.length) return score.tracks;
  if (Array.isArray(score.notes) && score.notes.length) return [{ id: 'melody', notes: score.notes }];
  return [];
}

export function trackBeats(notes) {
  return notes.reduce((total, note) => total + note.d, 0);
}

export class Player {
  constructor(engine) {
    this.engine = engine;
    this.score = null;
    this.tempoScale = 1;
    this.timeline = [];
    this.finishAt = 0;
    this.startedAt = 0;
    this.playing = false;
    this.rafId = null;
    this.finishTimer = null;
    this.currentIndex = -1;
    this.onNote = () => {};
    this.onFinish = () => {};
  }

  /** Seconds per beat, after the slow-mode multiplier. */
  _secondsPerBeat() {
    return 60 / (this.score.tempo * this.tempoScale);
  }

  load(score) {
    this.stop();
    this.score = score;
  }

  setTempoScale(scale) {
    const wasPlaying = this.playing;
    this.tempoScale = scale;
    if (wasPlaying) {
      this.stop();
      this.play();
    }
  }

  get duration() {
    if (!this.score) return 0;
    const beats = Math.max(
      0,
      ...tracksOf(this.score).map((track) => (track.offsetBeats ?? 0) + trackBeats(track.notes))
    );
    return beats * this._secondsPerBeat();
  }

  play() {
    if (!this.score || this.playing) return;
    const tracks = tracksOf(this.score);
    if (!tracks.length) return;
    const ctx = this.engine.start();
    const spb = this._secondsPerBeat();

    // A small lead-in so the first note is scheduled in the future, not in the
    // past. Scheduling at exactly currentTime makes the first note click.
    const begin = ctx.currentTime + 0.08;
    const timeline = [];
    let finishAt = begin;

    for (const track of tracks) {
      let cursor = track.offsetBeats ?? 0;
      const gain = track.gain ?? 1;
      track.notes.forEach((note, index) => {
        const at = begin + cursor * spb;
        const seconds = note.d * spb;
        cursor += note.d;
        const pitches = pitchesOf(note);
        pitches.forEach((pitch) => this.engine.playNote(pitch, at, seconds, gain));
        timeline.push({ index, at, until: at + seconds, rest: pitches.length === 0, track: track.id });
        finishAt = Math.max(finishAt, at + seconds);
      });
    }

    timeline.sort((a, b) => a.at - b.at || a.until - b.until);
    this.timeline = timeline;
    this.finishAt = finishAt;
    this.startedAt = begin;
    this.playing = true;
    this.currentIndex = -1;
    this._follow();

    // rAF is not a reliable end-of-performance signal: a backgrounded tab (and
    // the preview pane, which keeps pages hidden) can pause frames entirely
    // while the audio clock runs on. The highlight freezing is cosmetic, but
    // Read Together advances its story on onFinish -- so without this the music
    // would end and the chapter would sit there waiting for a frame that never
    // comes. A timer is throttled in the background; it is not stopped.
    const remaining = (this.finishAt - ctx.currentTime + 0.05) * 1000;
    this.finishTimer = setTimeout(() => this._finish(), Math.max(0, remaining));
    this.finishTimer?.unref?.();   // node only: never hold a check open
  }

  _follow() {
    const ctx = this.engine.ctx;
    const tick = () => {
      if (!this.playing) return;
      const now = ctx.currentTime;
      const active = this.timeline.findIndex((slot) => now >= slot.at && now < slot.until);

      if (active !== this.currentIndex) {
        this.currentIndex = active;
        this.onNote(active, this.timeline[active] || null);
      }

      if (now >= this.finishAt) {
        this._finish();
        return;
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  /** End of performance, from whichever of the two signals arrives first. */
  _finish() {
    if (!this.playing) return;
    this.playing = false;
    this.currentIndex = -1;
    if (this.finishTimer) { clearTimeout(this.finishTimer); this.finishTimer = null; }
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.onNote(-1, null);
    this.onFinish();
  }

  pause() {
    if (!this.playing) return;
    this.stop();
  }

  stop() {
    this.playing = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    if (this.finishTimer) { clearTimeout(this.finishTimer); this.finishTimer = null; }
    this.currentIndex = -1;
    this.engine.stopAll();
    this.onNote(-1, null);
  }

  /** Sound one note on its own, for tapping a note in the strip. */
  pluck(noteName) {
    if (!noteName) return;
    const ctx = this.engine.start();
    this.engine.playNote(noteName, ctx.currentTime + 0.02, 0.6);
  }
}
