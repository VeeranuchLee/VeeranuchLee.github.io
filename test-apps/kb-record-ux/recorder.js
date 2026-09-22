/* Keyboard — the shared recorder.
 *
 * V1 records what was PLAYED, not what was heard: a list of note events with
 * their times, the voice each note was played with, and whether the pedal
 * was down when it was let go. No audio is captured, nothing is encoded,
 * nothing is stored on disk. A minute of two-handed playing is a few hundred
 * small objects.
 *
 * It listens to the engine so any toy can record keys, laptop rows, drum
 * pads and Studio's arpeggiator through one event stream. Events from its own
 * playback carry source "play" and are ignored here, so pressing Play can
 * never quietly re-record a take on top of itself.
 *
 * A transport sits on every toy since the owner asked on 2026-09-14 for
 * "simple record for all piano too". That request reverses the line that
 * stood here saying the transport existed only in Studio Explorer — true
 * until the request, and nothing supersedes the request. The session take
 * still clears whenever the child switches toys, deliberately: whether a
 * song should survive its toy is an open owner decision (TOY-ARCHITECTURE
 * keeps durable song storage separate), and it is not made here.
 */
(function () {
  "use strict";

  const KB = (window.KB = window.KB || {});

  /* A take stops itself at two minutes. Long enough that no child playing a
     song runs into it, short enough that a Record button left on by accident
     cannot grow without end. */
  const MAX_SECONDS = 120;
  const MAX_EVENTS = 4000;

  let take = [];
  let mode = "idle";         /* idle | recording | playing */
  let startedAt = 0;         /* audio clock, when recording began */
  let duration = 0;          /* seconds of the take that exists */
  let timers = [];
  let openNotes = new Map(); /* notes recorded on but not yet off */
  const watchers = [];

  /* WHY `ended` EXISTS (owner, 2026-09-21: "the state is too hard for a child to
     understand"). idle-with-a-take is two different moments to a child -- the
     take they just made, and the song that just finished playing -- and the
     transport used to show the same words for both. `ended` tells the UI which
     idle face to wear: "stop" (a take waits), "finished" (playback just ended),
     or null (nothing has happened yet with this take). */
  let ended = null;

  function changed() {
    const snap = {
      mode: mode,
      hasTake: take.length > 0,
      duration: duration,
      ended: ended,
      elapsed: mode === "recording" ? KB.engine.time() - startedAt : 0,
    };
    watchers.forEach((fn) => { try { fn(snap); } catch (e) { /* keep going */ } });
  }

  KB.engine.onNote((e) => {
    if (mode !== "recording") return;
    /* "play" is this recorder's own playback — recording it would let a take
       overwrite itself. "metro" is Studio's metronome, which is a guide for
       the player and not part of what they are playing. */
    if (e.source === "play" || e.source === "metro") return;
    if (take.length >= MAX_EVENTS) return;
    const t = KB.engine.time() - startedAt;
    if (e.type === "hit") {
      take.push({ t: t, type: "hit", drum: e.drum });
      return;
    }
    const id = e.source + "#" + e.midi;
    if (e.type === "on") {
      take.push({ t: t, type: "on", midi: e.midi, patch: e.patch });
      openNotes.set(id, { midi: e.midi, patch: e.patch });
    } else {
      take.push({ t: t, type: "off", midi: e.midi, pedal: Boolean(e.pedal) });
      openNotes.delete(id);
    }
  });

  function clearTimers() {
    timers.forEach((id) => window.clearTimeout(id));
    timers = [];
  }

  function start() {
    KB.engine.ensureAudio();
    if (mode === "playing") stop();
    take = [];
    openNotes = new Map();
    duration = 0;
    ended = null;
    startedAt = KB.engine.time();
    mode = "recording";
    /* The cap, armed from the moment recording starts. */
    timers.push(window.setTimeout(() => { if (mode === "recording") stop(); }, MAX_SECONDS * 1000));
    changed();
  }

  function stop() {
    if (mode === "recording") {
      const t = KB.engine.time() - startedAt;
      /* A finger still on a key when Stop is pressed: the take needs that
         note let go, or playback would leave it sounding for ever. */
      openNotes.forEach((n) => take.push({ t: t, type: "off", midi: n.midi, pedal: false }));
      openNotes = new Map();
      duration = Math.max(t, take.length ? take[take.length - 1].t : 0);
      mode = "idle";
      ended = "stop";
      clearTimers();
      changed();
      return;
    }
    if (mode === "playing") {
      clearTimers();
      KB.engine.panic("play");
      mode = "idle";
      ended = "stop";
      changed();
    }
  }

  function play() {
    if (!take.length) return;
    KB.engine.ensureAudio();
    if (mode === "recording") stop();
    if (mode === "playing") stop();
    mode = "playing";
    ended = null;
    take.forEach((e) => {
      timers.push(window.setTimeout(() => {
        if (mode !== "playing") return;
        if (e.type === "on") KB.engine.noteOn(e.midi, { source: "play", patch: e.patch });
        else if (e.type === "off") KB.engine.noteOff(e.midi, { source: "play", pedal: e.pedal });
        else if (e.type === "hit") KB.engine.hit(e.drum, { source: "play" });
      }, Math.max(0, e.t * 1000)));
    });
    /* A short tail so the last note is let go before the buttons say the
       song has finished. */
    timers.push(window.setTimeout(() => {
      if (mode !== "playing") return;
      KB.engine.panic("play");
      mode = "idle";
      ended = "finished";
      changed();
    }, duration * 1000 + 400));
    changed();
  }

  function clear() {
    if (mode !== "idle") stop();
    take = [];
    openNotes = new Map();
    duration = 0;
    ended = null;
    changed();
  }

  KB.recorder = {
    start: start,
    stop: stop,
    play: play,
    clear: clear,
    getMode: () => mode,
    elapsed: () => (mode === "recording" ? KB.engine.time() - startedAt : 0),
    hasTake: () => take.length > 0,
    getDuration: () => duration,
    eventCount: () => take.length,
    onChange(fn) {
      watchers.push(fn);
      return () => {
        const i = watchers.indexOf(fn);
        if (i >= 0) watchers.splice(i, 1);
      };
    },
  };
})();
