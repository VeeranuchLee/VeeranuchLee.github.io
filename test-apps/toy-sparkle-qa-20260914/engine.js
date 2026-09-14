/* Keyboard — the shared engine.
 *
 * One audio graph for the whole app. The five toys are five faces on this;
 * none of them owns a context, a master gain or a note map, and none of them
 * may create one. That matters for more than tidiness: on iOS an
 * AudioContext is granted on a gesture and is not given back if you throw it
 * away, so switching toys must never tear this down. Switching releases the
 * notes a finger was holding (`panic`) and nothing else.
 *
 * Everything that sounds goes through `noteOn` / `noteOff` / `hit`, which is
 * also why the recorder can be shared: it listens here, so a note played by
 * a finger, by the laptop keyboard, by the arpeggiator or by a drum pad is
 * recorded the same way, in every toy, with no toy knowing the recorder
 * exists.
 *
 * Notes carry a `source`. "touch" and "kbd" are a child playing; "arp" is
 * Studio's arpeggiator; "play" is the recorder replaying a take. The source
 * is what lets `panic("touch")` release the fingers without cutting off a
 * recording that is playing back.
 */
(function () {
  "use strict";

  const KB = (window.KB = window.KB || {});

  let ctx = null;
  let master = null;

  /* Fourteen was the cap in the single-file app and it was chosen for ten
     fingers plus a little slack. Studio's arpeggiator and a rhythm can be
     sounding at the same time now, so it is a little higher — still a hard
     cap, because a child leaning on the keys must not be able to grow a
     stack of voices without end. */
  const MAX_VOICES = 18;

  const held = new Map();       /* "source#midi" -> record, finger still down */
  const sustained = new Map();  /* "source#midi" -> record, let go under the pedal */
  const listeners = [];

  const st = {
    volume: 0.8,
    sustain: false,
    patch: "piano",
  };

  const key = (source, m) => source + "#" + m;

  function ensureAudio() {
    if (ctx) {
      if (ctx.state === "suspended") ctx.resume();
      return ctx;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    /* A gentle compressor keeps ten fingers from clipping the room. */
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 24;
    comp.ratio.value = 6;
    master = ctx.createGain();
    master.gain.value = st.volume;
    master.connect(comp);
    comp.connect(ctx.destination);
    return ctx;
  }

  const now = () => (ctx ? ctx.currentTime : 0);

  function emit(event) {
    for (let i = 0; i < listeners.length; i += 1) {
      try { listeners[i](event); } catch (e) { /* one bad listener is not a dead note */ }
    }
  }

  /* The oldest thing sounding gives way. Notes released under the pedal go
     first — they are already on their way out — and only then held ones. */
  function steal() {
    while (held.size + sustained.size >= MAX_VOICES) {
      const from = sustained.size ? sustained : held;
      const k = from.keys().next().value;
      if (k === undefined) return;
      const rec = from.get(k);
      from.delete(k);
      if (rec && rec.voice) rec.voice.stop(false);
      if (rec) emit({ type: "off", midi: rec.midi, source: rec.source, patch: rec.patch });
    }
  }

  /* opts: { source, patch } — patch defaults to the engine's current one, so
     a toy that never sets a patch still sounds. */
  function noteOn(m, opts) {
    const o = opts || {};
    const source = o.source || "touch";
    if (!ensureAudio()) return;
    const k = key(source, m);
    if (held.has(k)) return;
    /* Re-striking a note that is ringing under the pedal damps the old one
       first, the way a second strike on a real string does. */
    if (sustained.has(k)) {
      const old = sustained.get(k);
      sustained.delete(k);
      if (old && old.voice) old.voice.stop(false);
    }
    steal();
    const patchId = o.patch && KB.voices[o.patch] ? o.patch : st.patch;
    const patch = KB.voices[patchId] || KB.voices.piano;
    const voice = patch.make({ ctx, dest: master, t: now(), now }, m);
    held.set(k, { voice: voice, midi: m, source: source, patch: patchId });
    emit({ type: "on", midi: m, source: source, patch: patchId });
  }

  /* opts: { source, pedal } — pedal overrides the live pedal state, which is
     how playback reproduces what was heard rather than what is switched on
     now. */
  function noteOff(m, opts) {
    const o = opts || {};
    const source = o.source || "touch";
    const k = key(source, m);
    const rec = held.get(k);
    if (!rec) return;
    held.delete(k);
    const pedal = typeof o.pedal === "boolean" ? o.pedal : st.sustain;
    if (pedal) sustained.set(k, rec);
    else rec.voice.stop(false);
    emit({ type: "off", midi: m, source: source, patch: rec.patch, pedal: pedal });
  }

  /* The pedal lifting: everything let go under it is damped now. */
  function pedalUp() {
    sustained.forEach((rec) => rec.voice.stop(false));
    sustained.clear();
  }

  function hit(id, opts) {
    const o = opts || {};
    if (!ensureAudio()) return;
    const drum = KB.drums[id];
    if (!drum) return;
    drum.make({ ctx, dest: master, t: now(), now });
    emit({ type: "hit", drum: id, source: o.source || "touch" });
  }

  /* Release everything one source is holding. Used when a toy is swapped
     out: the finger that was on a key is, from the app's point of view,
     lifted — no note may survive into a toy that has no key to release it. */
  function panic(source) {
    [held, sustained].forEach((map) => {
      [...map.keys()].forEach((k) => {
        const rec = map.get(k);
        if (source && rec.source !== source) return;
        map.delete(k);
        if (rec.voice) rec.voice.stop(false);
        emit({ type: "off", midi: rec.midi, source: rec.source, patch: rec.patch });
      });
    });
  }

  function allNotesOff() { panic(); }

  /* ------------------------------------------------------------- state ---
     One small store for everything a toy wants to find as it left it. It
     lives next to the engine rather than in the shell because the toys read
     it while they mount, which is before the shell has finished booting. */

  const KEY = "toy-keyboard";
  const SKIN_KEY = "toy-keyboard-skin";
  const TOY_IDS = ["baby", "preschool", "princess", "big-kid", "advanced"];
  const PATCHES = ["piano", "epiano", "organ", "synth"];
  const SOUNDS = {
    baby: ["soft-bell-piano"],
    preschool: ["piano", "bells", "stars"],
    princess: ["piano", "musicbox", "sparkle"],
    "big-kid": PATCHES,
    advanced: ["piano", "epiano", "organ", "synth", "strings", "brass", "bass", "bells"],
  };
  const SKIN_TO_TOY = {
    "moon-bunny": "baby",
    "strawberry-picnic": "preschool",
    "coral-whale": "princess",
    classic: "big-kid",
    "woodland-mushroom": "advanced",
  };
  const defaults = () => ({
    version: 2,
    activeToy: "big-kid",
    masterVolume: 0.8,
    /* null means the parent has never chosen. That third state is what lets
       reduced-motion default the decoration off without overruling a later,
       explicit ON. */
    effects: null,
    toys: {
      baby: { sound: "soft-bell-piano" },
      preschool: { sound: "piano" },
      princess: { sound: "piano" },
      "big-kid": { sound: "piano", sustain: false },
      advanced: { sound: "piano", sustain: false },
    },
  });
  const clamp01 = (v, fallback) => typeof v === "number" && Number.isFinite(v)
    ? Math.max(0, Math.min(1, v)) : fallback;

  function readJson(keyName) {
    try {
      const value = JSON.parse(window.localStorage.getItem(keyName) || "null");
      return value && typeof value === "object" && !Array.isArray(value) ? value : null;
    } catch (e) { return null; }
  }

  function validSound(toyId, value, fallback) {
    return SOUNDS[toyId].indexOf(value) >= 0 ? value : fallback;
  }

  function loadState() {
    const base = defaults();
    const raw = readJson(KEY);
    if (raw && raw.version === 2) {
      base.activeToy = TOY_IDS.indexOf(raw.activeToy) >= 0 ? raw.activeToy : base.activeToy;
      base.masterVolume = clamp01(raw.masterVolume, base.masterVolume);
      base.effects = typeof raw.effects === "boolean" ? raw.effects : null;
      TOY_IDS.forEach((id) => {
        const saved = raw.toys && raw.toys[id] && typeof raw.toys[id] === "object" ? raw.toys[id] : {};
        base.toys[id].sound = validSound(id, saved.sound, base.toys[id].sound);
        if (id === "big-kid" || id === "advanced") base.toys[id].sustain = Boolean(saved.sustain);
      });
      return base;
    }

    /* Legacy console state. Sustain belongs only to Big-Kid. Advanced may
       inherit a valid sound, but always starts with its pedal up. */
    if (raw) {
      base.masterVolume = clamp01(raw.volume, base.masterVolume);
      const patch = PATCHES.indexOf(raw.patch) >= 0 ? raw.patch : "piano";
      base.toys["big-kid"].sound = patch;
      base.toys["big-kid"].sustain = Boolean(raw.sustain);
      base.toys.advanced.sound = patch;
      base.toys.advanced.sustain = false;
    }
    let legacySkin = null;
    try { legacySkin = window.localStorage.getItem(SKIN_KEY); } catch (e) { /* private mode */ }
    base.activeToy = SKIN_TO_TOY[legacySkin] || "big-kid";
    return base;
  }

  const store = loadState();
  let mountPending = false;
  function persist() {
    try { window.localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* private mode */ }
  }

  KB.state = {
    snapshot: () => JSON.parse(JSON.stringify(store)),
    getActiveToy: () => store.activeToy,
    beginMount() { mountPending = true; },
    commitMount(id) {
      if (TOY_IDS.indexOf(id) < 0) return;
      store.activeToy = id;
      mountPending = false;
      persist();
    },
    getMasterVolume: () => store.masterVolume,
    setMasterVolume(v) { store.masterVolume = clamp01(v, store.masterVolume); if (!mountPending) persist(); },
    getEffectsPreference: () => store.effects,
    effectsEnabled() {
      if (typeof store.effects === "boolean") return store.effects;
      /* matchMedia is absent in the DOM-only harness and a few embedded web
         views. Those are the ordinary-motion default, not a reason to hide a
         feature the parent has never switched off. */
      return !(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    },
    setEffectsPreference(on) {
      store.effects = typeof on === "boolean" ? on : null;
      if (!mountPending) persist();
    },
    getToy(id, keyName) { return store.toys[id] ? store.toys[id][keyName] : undefined; },
    setToy(id, keyName, value) {
      if (!store.toys[id]) return;
      if (keyName === "sound") store.toys[id].sound = validSound(id, value, store.toys[id].sound);
      else if (keyName === "sustain" && (id === "big-kid" || id === "advanced")) store.toys[id].sustain = Boolean(value);
      else return;
      if (!mountPending) persist();
    },
    persist: persist,
  };

  st.volume = store.masterVolume;

  KB.engine = {
    ensureAudio: ensureAudio,
    ready: () => Boolean(ctx),
    time: now,
    noteOn: noteOn,
    noteOff: noteOff,
    hit: hit,
    panic: panic,
    allNotesOff: allNotesOff,
    pedalOff: pedalUp,

    onNote(fn) {
      listeners.push(fn);
      return () => {
        const i = listeners.indexOf(fn);
        if (i >= 0) listeners.splice(i, 1);
      };
    },

    setPatch(id) { if (KB.voices[id]) st.patch = id; },
    getPatch: () => st.patch,

    setSustain(on) {
      st.sustain = Boolean(on);
      if (!st.sustain) pedalUp();
    },
    getSustain: () => st.sustain,

    setVolume(v) {
      st.volume = Math.max(0, Math.min(1, v));
      if (master) master.gain.value = st.volume;
    },
    getVolume: () => st.volume,

    /* For the harness and for anything that wants to know what is sounding
       without reaching into the maps. */
    voiceCount: () => held.size + sustained.size,
    heldCount: () => held.size,

    /* Which notes are sounding right now, as plain MIDI numbers — held by a
       player and ringing under the pedal alike. A keybed that has just
       rebuilt its elements re-lights from this instead of every ringing key
       going dark until its next event. Read-only: it answers a question
       about the maps and never touches the DOM. */
    soundingNotes() {
      const out = [];
      held.forEach((rec) => out.push(rec.midi));
      sustained.forEach((rec) => out.push(rec.midi));
      return out;
    },
  };
})();
