// Background tune for the landing parade and Music World.
// It is runtime WebAudio so the Music World bed can be played by the companion
// the child chose, not by a pre-rendered fixed instrument.

const PHRASES = [
  [{ n: 'C5', d: 1 }, { n: 'B4', d: 0.5 }, { n: 'A4', d: 0.5 }, { n: 'G4', d: 2 }],
  [{ n: 'A4', d: 1 }, { n: 'G4', d: 0.5 }, { n: 'F4', d: 0.5 }, { n: 'E4', d: 2 }],
  [{ n: 'F4', d: 1 }, { n: 'G4', d: 1 }, { n: 'A4', d: 1 }, { n: 'G4', d: 1 }],
  [{ n: 'E4', d: 1 }, { n: 'F4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'C5', d: 2 }],
  [{ n: 'D5', d: 1 }, { n: 'C5', d: 0.5 }, { n: 'B4', d: 0.5 }, { n: 'A4', d: 2 }],
  [{ n: 'G4', d: 1 }, { n: 'E4', d: 1 }, { n: 'D4', d: 0.5 }, { n: 'C4', d: 1.5 }]
];

const PARADE = { tempo: 78, level: 0.62, breath: 1, rest: 3 };
const WORLD = { tempo: 66, level: 0.4, breath: 0, rest: 4 };
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

  start(opts) {
    this.stop();
    const ctx = this.engine.ctx;
    if (!ctx || !opts.instruments?.length) return;
    this.plan = opts;
    this.playing = true;
    this.nextLoopAt = ctx.currentTime + 0.2;
    this._scheduleLoop();
    this.timer = setInterval(() => this._maybeScheduleNext(), TICK_MS);
  }

  startParade(companions, onVoice) {
    this.start({ ...PARADE, instruments: companions, onVoice });
  }

  startWorld(instrument) {
    this.start({ ...WORLD, instruments: PHRASES.map(() => instrument) });
  }

  stop() {
    this.playing = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.cues.forEach((id) => clearTimeout(id));
    this.cues = [];
    this.engine.stopAll('bed');
    if (this.plan?.onVoice) this.plan.onVoice(-1);
  }

  _maybeScheduleNext() {
    if (!this.playing || !this.engine.ctx) return;
    if (this.nextLoopAt - this.engine.ctx.currentTime <= HANDOVER) this._scheduleLoop();
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
        const delay = Math.max(0, (phraseAt - ctx.currentTime) * 1000);
        this.cues.push(setTimeout(() => { if (this.playing) onVoice(phraseIndex); }, delay));
      }
      let inPhrase = 0;
      phrase.forEach((note) => {
        this.engine.playNote(note.n, phraseAt + inPhrase * spb, note.d * spb, {
          instrument: instruments[phraseIndex % instruments.length],
          bus: 'bed',
          level
        });
        inPhrase += note.d;
      });
      beat += inPhrase + breath;
    });

    this.nextLoopAt = start + (beat + rest) * spb;
  }
}
