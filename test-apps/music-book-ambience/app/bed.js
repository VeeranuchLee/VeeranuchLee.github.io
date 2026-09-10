// The background tune, on the companion-selection page and in the Music World.
//
// AUDIO-DIRECTION.md decision 9. Synthesised, not a file, and the reason is not
// weight or licensing: the bed has to be played BY THE COMPANION THE CHILD
// CHOSE. Six rendered files would be six recordings of the same tune, and a
// child who picked the glockenspiel and hears a piano bed has been told that
// their choice did not mean anything.
//
// The tune below is written for this book. It is not an arrangement of anything,
// which matters twice over: nothing in the catalogue gets pre-empted by hearing
// it as wallpaper first, and there is no third-party work sitting under a page
// that has no way to credit one.
//
// It is deliberately plain — stepwise, diatonic, no leaps a small voice could
// not sing, and it comes to rest rather than hanging. Six four-beat phrases,
// each answering the one before, which is also what makes it work as the
// parade: hand one phrase to each companion and the tune is passed around the
// six of them like a question going down a row of friends.

const PHRASES = [
  [{ n: 'C5', d: 1 }, { n: 'B4', d: 0.5 }, { n: 'A4', d: 0.5 }, { n: 'G4', d: 2 }],
  [{ n: 'A4', d: 1 }, { n: 'G4', d: 0.5 }, { n: 'F4', d: 0.5 }, { n: 'E4', d: 2 }],
  [{ n: 'F4', d: 1 }, { n: 'G4', d: 1 }, { n: 'A4', d: 1 }, { n: 'G4', d: 1 }],
  [{ n: 'E4', d: 1 }, { n: 'F4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'C5', d: 2 }],
  [{ n: 'D5', d: 1 }, { n: 'C5', d: 0.5 }, { n: 'B4', d: 0.5 }, { n: 'A4', d: 2 }],
  [{ n: 'G4', d: 1 }, { n: 'E4', d: 1 }, { n: 'D4', d: 0.5 }, { n: 'C4', d: 1.5 }]
];

// The parade is a little quicker and leaves a beat of silence between one
// companion and the next. Without that gap the timbres run together and the
// page stops teaching the thing it exists to teach — which of the six you are
// listening to. The Music World bed is slower, quieter and rests longer, because
// there the tune is the room rather than the subject.
const PARADE = { tempo: 78, level: 0.62, breath: 1, rest: 3 };
const WORLD = { tempo: 66, level: 0.4, breath: 0, rest: 4 };

// The whole loop is handed to the audio clock at once — twenty-four notes is
// nothing, and it means the tune cannot drift or stutter if the page is busy
// drawing. This only checks four times a second whether the NEXT loop is due.
const TICK_MS = 250;
const HANDOVER = 1.5;

export class Bed {
  constructor(engine) {
    this.engine = engine;
    this.playing = false;
    this.timer = null;
    this.cues = [];
    this.plan = null;
    this.nextLoopAt = 0;
  }

  /**
   * @param {object}   opts
   * @param {object[]} opts.instruments  one per phrase; six different ones is the parade
   * @param {number}   opts.tempo
   * @param {number}   opts.level
   * @param {function} [opts.onVoice]    called as each phrase begins, with its index
   */
  start(opts) {
    this.stop();
    const ctx = this.engine.ctx;
    if (!ctx || !opts.instruments || !opts.instruments.length) return;
    this.plan = opts;
    this.playing = true;
    // A beat of lead-in for the same reason the score player has one: a note
    // scheduled at exactly currentTime clicks.
    this.nextLoopAt = ctx.currentTime + 0.2;
    this._scheduleLoop();
    this.timer = setInterval(() => this._maybeScheduleNext(), TICK_MS);
  }

  /** The parade: the tune passed around all six companions in order. */
  startParade(companions, onVoice) {
    this.start({
      instruments: companions,
      tempo: PARADE.tempo,
      level: PARADE.level,
      breath: PARADE.breath,
      rest: PARADE.rest,
      onVoice
    });
  }

  /** The Music World bed: every phrase on the one companion the child chose. */
  startWorld(instrument) {
    this.start({
      instruments: PHRASES.map(() => instrument),
      tempo: WORLD.tempo,
      level: WORLD.level,
      breath: WORLD.breath,
      rest: WORLD.rest
    });
  }

  stop() {
    this.playing = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.cues.forEach((id) => clearTimeout(id));
    this.cues = [];
    // Only the bed's own notes. A piece the child is listening to is on the
    // music bus and is none of this file's business.
    this.engine.stopAll('bed');
    if (this.plan && this.plan.onVoice) this.plan.onVoice(-1);
  }

  _maybeScheduleNext() {
    if (!this.playing) return;
    const ctx = this.engine.ctx;
    if (!ctx) return;
    if (this.nextLoopAt - ctx.currentTime <= HANDOVER) this._scheduleLoop();
  }

  _scheduleLoop() {
    const { instruments, tempo, level, breath, rest, onVoice } = this.plan;
    const ctx = this.engine.ctx;
    const spb = 60 / tempo;
    const start = this.nextLoopAt;
    let beat = 0;

    PHRASES.forEach((phrase, phraseIndex) => {
      const phraseAt = start + beat * spb;
      if (onVoice) {
        // The glow is driven off the audio clock, not off a fixed interval, so
        // the card that lights up is the card you are hearing even if the page
        // stuttered while the notes were being scheduled.
        const delay = Math.max(0, (phraseAt - ctx.currentTime) * 1000);
        this.cues.push(setTimeout(() => { if (this.playing) onVoice(phraseIndex); }, delay));
      }
      let inPhrase = 0;
      phrase.forEach((note) => {
        if (note.n) {
          this.engine.playNote(note.n, phraseAt + inPhrase * spb, note.d * spb, {
            instrument: instruments[phraseIndex % instruments.length],
            bus: 'bed',
            level
          });
        }
        inPhrase += note.d;
      });
      beat += inPhrase + breath;
    });

    this.nextLoopAt = start + (beat + rest) * spb;
  }
}
