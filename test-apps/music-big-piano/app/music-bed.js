// The page's own tune, played by the child's own companion.
//
// AUDIO-DIRECTION.md decision 12, both halves of it:
//
//     page/theme  -> determines melody/composition   (data/motifs.js)
//     companion   -> determines instrument/timbre    (data/instruments.js)
//
// This file is the join. It knows how to schedule a motif ahead on the audio
// clock and nothing at all about which tune or which instrument — both arrive
// as arguments. That is why it is runtime WebAudio rather than a rendered
// loop: a recording would fix the instrument, and the instrument is the child's
// choice.
//
// It plays on the `musicBed` bus, which is ducked under spoken titles and
// stopped outright under a piece the child started. See the `ambientBed` bus
// next to it: the Music Book's background is musical, so that one stays silent
// here and waits for a book whose pages are places.

const TICK_MS = 250;
// Schedule the next pass this many seconds before the current one runs out, so
// there is never a gap while the timer catches up.
const HANDOVER = 1.5;

export class MusicBed {
  constructor(engine) {
    this.engine = engine;
    this.playing = false;
    this.timer = null;
    this.cues = [];
    this.plan = null;
    this.nextLoopAt = 0;
  }

  /**
   * Play a motif.
   *
   * @param {object} motif        from data/motifs.js — phrases, tempo, level, breath, rest
   * @param {object|object[]} by  the instrument that performs it. An array hands
   *                              successive phrases to successive instruments,
   *                              which is how the landing page introduces all six.
   * @param {function} [onPhrase] called with the phrase index as each phrase
   *                              starts, and with -1 when the tune stops
   */
  play(motif, by, onPhrase) {
    this.stop();
    const ctx = this.engine.ctx;
    const instruments = Array.isArray(by) ? by : [by];
    if (!ctx || !motif || !instruments.length || !instruments[0]) return;
    this.plan = { motif, instruments, onPhrase };
    this.playing = true;
    this.nextLoopAt = ctx.currentTime + 0.2;
    this._scheduleLoop();
    this.timer = setInterval(() => this._maybeScheduleNext(), TICK_MS);
  }

  stop() {
    this.playing = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.cues.forEach((id) => clearTimeout(id));
    this.cues = [];
    this.engine.stopAll('musicBed');
    if (this.plan?.onPhrase) this.plan.onPhrase(-1);
  }

  _maybeScheduleNext() {
    if (!this.playing || !this.engine.ctx) return;
    if (this.nextLoopAt - this.engine.ctx.currentTime <= HANDOVER) this._scheduleLoop();
  }

  _scheduleLoop() {
    const { motif, instruments, onPhrase } = this.plan;
    const { phrases, tempo, level, breath, rest } = motif;
    const ctx = this.engine.ctx;
    const spb = 60 / tempo;
    const start = this.nextLoopAt;
    let beat = 0;

    phrases.forEach((phrase, phraseIndex) => {
      const phraseAt = start + beat * spb;
      if (onPhrase) {
        const delay = Math.max(0, (phraseAt - ctx.currentTime) * 1000);
        this.cues.push(setTimeout(() => { if (this.playing) onPhrase(phraseIndex); }, delay));
      }
      let inPhrase = 0;
      phrase.forEach((note) => {
        this.engine.playNote(note.n, phraseAt + inPhrase * spb, note.d * spb, {
          instrument: instruments[phraseIndex % instruments.length],
          bus: 'musicBed',
          level
        });
        inPhrase += note.d;
      });
      beat += inPhrase + breath;
    });

    this.nextLoopAt = start + (beat + rest) * spb;
  }
}
