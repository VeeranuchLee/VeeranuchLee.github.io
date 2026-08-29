/* Keyboard — the engine.
 *
 * One rule above the rest (roadmap, 2026-08-28): essentially zero UI between
 * opening the app and playing. The keys are the first thing under a finger,
 * every key is a real touch target including the black ones, and as many
 * fingers as the screen reports are as many notes as sound — chords are not a
 * feature here, they are the normal case.
 *
 * AUDIO-DIRECTION.md decision 6: instruments are runtime WebAudio synthesis.
 * No sample sets, no files, nothing to download. The four patches below are
 * built from oscillators and envelopes only.
 */
(function () {
  "use strict";

  /* ------------------------------------------------------------- keys --- */

  /* C3 to C7: four octaves and a top C — 49 keys, 29 white. That is the
     reference console's span and it is deliberately wide: the point of this
     toy (owner, 2026-08-29) is that it looks and plays like an older kid's
     keyboard, not a five-note preschool one. */
  const FIRST = 48;          /* MIDI C3 */
  const LAST = 84 + 12;      /* MIDI C7 */
  const IS_BLACK = new Set([1, 3, 6, 8, 10]);

  const keybed = document.getElementById("keybed");

  /* White keys are laid out in one row; black keys sit between their
     neighbours, overlapping the top of the row. The geometry is computed,
     not measured per element, so hit-testing during a slide is exact and
     cheap — a finger crossing the keybed asks "which key is under this
     point", not "which element did the browser decide to target". */
  const whites = [];
  for (let m = FIRST; m <= LAST; m++) {
    if (!IS_BLACK.has(m % 12)) whites.push(m);
  }

  /* A tap on a key with no pointer events behind it (engines that deliver
     clicks only — this repo's QA harness is one) still plays. Attached per
     key element, not delegated, because a synthetic click may not bubble;
     real pointer events keep the container-level path below. */
  let pointerDrove = 0;

  function tapFallback(m) {
    return function () {
      if (performance.now() - pointerDrove < 800) return;
      ensureAudio();
      noteOn(m);
      window.setTimeout(() => noteOff(m), 320);
    };
  }

  function buildKeys() {
    keybed.innerHTML = "";
    const r = keybed.getBoundingClientRect();
    const pad = 4;
    const w = (r.width - pad * 2) / whites.length;
    const h = r.height - pad * 2;

    const el = {};
    whites.forEach((m, i) => {
      const d = document.createElement("div");
      d.className = "white" + (m % 12 === 0 ? (m === 60 ? " c c4" : " c") : "");
      Object.assign(d.style, {
        left: (pad + i * w + 1) + "px",
        top: pad + "px",
        width: (w - 2) + "px",
        height: h + "px",
      });
      d.addEventListener("click", tapFallback(m));
      keybed.appendChild(d);
      el[m] = d;
    });
    for (let m = FIRST; m <= LAST; m++) {
      if (!IS_BLACK.has(m % 12)) continue;
      /* A black key sits over the boundary between the white key before it
         and the one after. Find that boundary from the white layout. */
      const prev = el[m - 1];
      if (!prev) continue;
      const px = parseFloat(prev.style.left) + parseFloat(prev.style.width) + 1;
      const d = document.createElement("div");
      d.className = "black";
      Object.assign(d.style, {
        left: (px - w * 0.32) + "px",
        top: pad + "px",
        width: (w * 0.64) + "px",
        height: (h * 0.62) + "px",
      });
      d.addEventListener("click", tapFallback(m));
      keybed.appendChild(d);
      el[m] = d;
    }
    return { el, pad, w, h };
  }

  let layout = null;

  /* Which key is under (x, y) in keybed coordinates. The upper 62% answers
     black where a black key exists; everything else answers white. This is
     the single source of truth for taps AND slides. */
  function keyAt(x, y) {
    if (!layout) return null;
    const { pad, w, h } = layout;
    const i = Math.floor((x - pad) / w);
    if (i < 0 || i >= whites.length) return null;
    const white = whites[i];
    if (y - pad > h * 0.62) return white;
    /* In the upper band a black key wins if the point is inside its box.
       Both neighbours are tested: a black key straddles the white-white
       boundary, so points in its left half floor to the white AFTER it —
       checking only that white's own next black misses them. Found by
       check-engine.mjs, not by eye. */
    for (const cand of [white + 1, white - 1]) {
      if (cand < FIRST || cand > LAST || !IS_BLACK.has(cand % 12)) continue;
      const box = layout.el[cand];
      if (!box) continue;
      const bl = parseFloat(box.style.left);
      const bw = parseFloat(box.style.width);
      if (x >= bl && x <= bl + bw) return cand;
    }
    return white;
  }

  /* ------------------------------------------------------------- audio --- */

  let ctx = null;            /* created on the first gesture, never before */
  let master = null;

  function ensureAudio() {
    if (ctx) {
      if (ctx.state === "suspended") ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    /* A gentle compressor keeps ten fingers from clipping the room. */
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 24;
    comp.ratio.value = 6;
    master = ctx.createGain();
    master.gain.value = state.volume;
    master.connect(comp);
    comp.connect(ctx.destination);
  }

  const now = () => (ctx ? ctx.currentTime : 0);

  /* The four patches. Each returns a voice: { stop(pedal) } — release with
     the pedal up damps the note; release with the pedal down lets gated
     patches ring and decaying patches keep decaying. Everything is
     oscillators, gains and one filter per voice. No samples anywhere. */

  function voicePiano(m) {
    const f = 440 * Math.pow(2, (m - 69) / 12);
    const t = now();
    const out = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(Math.min(f * 8, 9000), t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(f * 1.6, 500), t + 1.1);
    out.connect(lp);
    lp.connect(master);

    const parts = [
      [1, 0.5, "triangle"], [2.001, 0.14, "sine"], [3.003, 0.05, "sine"],
    ];
    const oscs = parts.map(([mult, g, type], i) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f * mult;
      o.detune.value = i === 0 ? 0 : (i === 1 ? 2 : -3);
      const og = ctx.createGain();
      og.gain.value = g;
      o.connect(og);
      og.connect(out);
      o.start(t);
      return o;
    });
    /* Higher notes ring shorter, as strings do. */
    const decay = Math.max(0.7, 3.4 - (m - 48) * 0.045);
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(1, t + 0.004);
    out.gain.setTargetAtTime(0.12, t + 0.004, 0.16);
    out.gain.setTargetAtTime(0.0001, t + 0.1, decay / 3);
    return {
      gated: false,
      stop(pedal) {
        const s = now() + 0.01;
        out.gain.cancelScheduledValues(s);
        out.gain.setTargetAtTime(0.0001, s, pedal ? 0.35 : 0.06);
        oscs.forEach((o) => o.stop(s + (pedal ? 1.4 : 0.4)));
      },
    };
  }

  function voiceEpiano(m) {
    const f = 440 * Math.pow(2, (m - 69) / 12);
    const t = now();
    const out = ctx.createGain();
    out.connect(master);

    /* A tine piano is close to one sine "carrier" whose frequency is nudged
       by a second sine "tine" — classic FM, three nodes, bell-like attack. */
    const carrier = ctx.createOscillator();
    carrier.type = "sine";
    carrier.frequency.value = f;
    const tine = ctx.createOscillator();
    tine.type = "sine";
    tine.frequency.value = f * 3.987;
    const mod = ctx.createGain();
    mod.gain.setValueAtTime(f * 2.4, t);
    mod.gain.exponentialRampToValueAtTime(f * 0.02, t + 0.5);
    tine.connect(mod);
    mod.connect(carrier.frequency);

    const strike = ctx.createOscillator();
    strike.type = "sine";
    strike.frequency.value = f * 2;
    const strikeGain = ctx.createGain();
    strikeGain.gain.setValueAtTime(0.18, t);
    strikeGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    strike.connect(strikeGain);
    strikeGain.connect(out);

    carrier.connect(out);
    carrier.start(t); tine.start(t); strike.start(t);
    strike.stop(t + 0.3);
    const decay = Math.max(0.9, 4 - (m - 48) * 0.05);
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(0.9, t + 0.003);
    out.gain.setTargetAtTime(0.0001, t + 0.05, decay / 3);
    return {
      gated: false,
      stop(pedal) {
        const s = now() + 0.01;
        out.gain.cancelScheduledValues(s);
        out.gain.setTargetAtTime(0.0001, s, pedal ? 0.4 : 0.07);
        carrier.stop(s + (pedal ? 1.6 : 0.5));
        tine.stop(s + (pedal ? 1.6 : 0.5));
      },
    };
  }

  function voiceOrgan(m) {
    const f = 440 * Math.pow(2, (m - 69) / 12);
    const t = now();
    const out = ctx.createGain();
    out.connect(master);
    /* Drawbars: fundamental plus three harmonics, one slightly detuned pair
       for the shimmer a spinning speaker gives. Sustains while held. */
    const bars = [
      [0.5, 0.12], [1, 0.42], [1.001, 0.3], [2, 0.2], [3, 0.09], [4, 0.05],
    ];
    const oscs = bars.map(([mult, g]) => {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f * mult;
      const og = ctx.createGain();
      og.gain.value = g;
      o.connect(og);
      og.connect(out);
      o.start(t);
      return o;
    });
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(0.5, t + 0.02);
    return {
      gated: true,
      stop(pedal) {
        const s = now() + 0.01;
        out.gain.cancelScheduledValues(s);
        out.gain.setTargetAtTime(0.0001, s, pedal ? 0.3 : 0.05);
        oscs.forEach((o) => o.stop(s + (pedal ? 1.2 : 0.3)));
      },
    };
  }

  function voiceSynth(m) {
    const f = 440 * Math.pow(2, (m - 69) / 12);
    const t = now();
    const out = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.Q.value = 6;
    lp.frequency.setValueAtTime(Math.max(f * 1.2, 220), t);
    lp.frequency.exponentialRampToValueAtTime(Math.min(f * 7, 7500), t + 0.16);
    out.connect(lp);
    lp.connect(master);
    const oscs = [-7, 7].map((cents) => {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = f;
      o.detune.value = cents;
      const og = ctx.createGain();
      og.gain.value = 0.24;
      o.connect(og);
      og.connect(out);
      o.start(t);
      return o;
    });
    const sub = ctx.createOscillator();
    sub.type = "square";
    sub.frequency.value = f / 2;
    const subG = ctx.createGain();
    subG.gain.value = 0.05;
    sub.connect(subG);
    subG.connect(out);
    sub.start(t);
    oscs.push(sub);
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(0.6, t + 0.01);
    return {
      gated: true,
      stop(pedal) {
        const s = now() + 0.01;
        out.gain.cancelScheduledValues(s);
        lp.frequency.cancelScheduledValues(s);
        out.gain.setTargetAtTime(0.0001, s, pedal ? 0.3 : 0.09);
        oscs.forEach((o) => o.stop(s + (pedal ? 1.3 : 0.6)));
      },
    };
  }

  const PATCHES = {
    piano: { name: "Piano", voice: voicePiano },
    epiano: { name: "E. Piano", voice: voiceEpiano },
    organ: { name: "Organ", voice: voiceOrgan },
    synth: { name: "Synth", voice: voiceSynth },
  };

  /* ------------------------------------------------------------ voices --- */

  /* Note names for the LCD: playing a key shows its name for a moment —
     orientation, not reading (the roadmap's optional note-name layer, one
     small honest slice of it). */
  const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const nameOf = (m) => NAMES[m % 12] + (Math.floor(m / 12) - 1);
  let lcdTimer = 0;

  const held = new Map();     /* midi -> voice, finger or computer key down */
  const sustained = new Map(); /* midi -> voice, released while pedal is down */
  const pointers = new Map();  /* pointerId -> midi */
  const MAX_VOICES = 14;

  function noteOn(m) {
    if (!ctx || held.has(m)) return;
    ensureAudio();
    /* Voice stealing: the oldest held or sustained note gives way, so a
       child leaning on the keyboard cannot grow a stack. */
    while (held.size + sustained.size >= MAX_VOICES) {
      const oldest = sustained.size ? sustained.keys().next().value : held.keys().next().value;
      if (oldest === undefined) break;
      const v = sustained.has(oldest) ? sustained.get(oldest) : held.get(oldest);
      (sustained.has(oldest) ? sustained : held).delete(oldest);
      if (v) v.stop(false);
    }
    const patch = PATCHES[state.patch];
    held.set(m, patch.voice(m));
    layout && layout.el[m] && layout.el[m].classList.add("down");
    /* Show the newest note on the LCD, then fall back to the steady state. */
    window.clearTimeout(lcdTimer);
    lcdState.textContent = nameOf(m);
    lcdTimer = window.setTimeout(() => {
      lcdState.textContent = state.sustain ? "SUSTAIN" : "READY";
    }, 1200);
  }

  function noteOff(m) {
    const v = held.get(m);
    if (!v) return;
    held.delete(m);
    layout && layout.el[m] && layout.el[m].classList.remove("down");
    if (state.sustain && !sustained.has(m)) sustained.set(m, v);
    else v.stop(false);
  }

  function pedalOff() {
    sustained.forEach((v) => v.stop(false));
    sustained.clear();
  }

  /* --------------------------------------------------------- pointers --- */

  function bedPoint(event) {
    const box = keybed.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  }

  keybed.addEventListener("pointerdown", (e) => {
    ensureAudio();
    pointerDrove = performance.now();   /* the pointer path owns this tap */
    keybed.setPointerCapture(e.pointerId);
    const { x, y } = bedPoint(e);
    const m = keyAt(x, y);
    if (m === null) return;
    pointers.set(e.pointerId, m);
    noteOn(m);
    e.preventDefault();
  });

  keybed.addEventListener("pointermove", (e) => {
    if (!pointers.has(e.pointerId)) return;
    const { x, y } = bedPoint(e);
    const m = keyAt(x, y);
    const was = pointers.get(e.pointerId);
    if (m !== null && m !== was) {
      /* A slide across the keys: the old note releases exactly as a lifted
         finger would, the new one strikes — glissando, chords-by-slide. */
      noteOff(was);
      pointers.set(e.pointerId, m);
      noteOn(m);
    }
  });

  function lift(e) {
    const m = pointers.get(e.pointerId);
    if (m === undefined) return;
    pointers.delete(e.pointerId);
    noteOff(m);
  }
  keybed.addEventListener("pointerup", lift);
  keybed.addEventListener("pointercancel", lift);

  /* ------------------------------------------------- computer keyboard ---
     For testing on a Mac and for the owner's laptop: two tracker rows, the
     classic layout. Space is the sustain pedal. */
  const ROW = "zsxdcvgbhnjm,l.;/";        /* C4 upward */
  const ROW_UP = "q2w3er5t6y7ui9o0p";     /* C5 upward */
  const codeToMidi = new Map();
  [...ROW].forEach((c, i) => codeToMidi.set(c, 60 + i));
  [...ROW_UP].forEach((c, i) => codeToMidi.set(c, 72 + i));

  window.addEventListener("keydown", (e) => {
    if (e.repeat) return;
    if (e.code === "Space") {
      e.preventDefault();
      setSustain(!state.sustain);
      return;
    }
    const m = codeToMidi.get(e.key.toLowerCase());
    if (m !== undefined && m <= LAST) {
      ensureAudio();
      noteOn(m);
      e.preventDefault();
    }
  });
  window.addEventListener("keyup", (e) => {
    const m = codeToMidi.get(e.key.toLowerCase());
    if (m !== undefined) noteOff(m);
  });

  /* ----------------------------------------------------------- controls --- */

  const lcdName = document.getElementById("lcdName");
  const lcdState = document.getElementById("lcdState");
  const lcdVol = document.getElementById("lcdVol");
  const vol = document.getElementById("vol");
  const sustainBtn = document.getElementById("sustain");

  function drawLcd() {
    lcdName.textContent = PATCHES[state.patch].name;
    lcdState.textContent = state.sustain ? "SUSTAIN" : "READY";
    [...lcdVol.children].forEach((seg, i) => {
      seg.classList.toggle("on", i < Math.round(state.volume * lcdVol.children.length));
    });
  }

  function setPatch(id) {
    state.patch = id;
    document.querySelectorAll(".sound").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.patch === id));
    });
    drawLcd();
    save();
  }

  function setSustain(on) {
    state.sustain = on;
    sustainBtn.setAttribute("aria-pressed", String(on));
    if (!on) pedalOff();
    drawLcd();
    save();
  }

  function setVolume(v) {
    state.volume = Math.max(0, Math.min(1, v));
    if (master) master.gain.value = state.volume;
    vol.value = Math.round(state.volume * 100);
    vol.style.setProperty("--fill", Math.round(state.volume * 100) + "%");
    drawLcd();
    save();
  }

  document.querySelectorAll(".sound").forEach((b) => {
    b.addEventListener("click", () => {
      ensureAudio();
      setPatch(b.dataset.patch);
    });
  });
  sustainBtn.addEventListener("click", () => {
    ensureAudio();
    setSustain(!state.sustain);
  });
  vol.addEventListener("input", () => setVolume(vol.value / 100));

  /* ------------------------------------------------------------ state --- */

  const KEY = "toy-keyboard";
  const state = { patch: "piano", sustain: false, volume: 0.8 };

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
  }
  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
      if (raw.patch && PATCHES[raw.patch]) state.patch = raw.patch;
      if (typeof raw.sustain === "boolean") state.sustain = raw.sustain;
      if (typeof raw.volume === "number") state.volume = Math.max(0, Math.min(1, raw.volume));
    } catch (e) { /* fresh start */ }
  }

  /* ------------------------------------------------------------- boot --- */

  function layoutKeys() {
    layout = buildKeys();
  }

  load();
  setPatch(state.patch);
  setSustain(state.sustain);
  setVolume(state.volume);

  /* Key geometry depends on the console's final size; recompute on resize
     (iPad rotation included). Voices in flight are untouched — only the
     pictures move. */
  if (window.ResizeObserver) new ResizeObserver(layoutKeys).observe(keybed);
  window.addEventListener("resize", layoutKeys);
  layoutKeys();
})();
