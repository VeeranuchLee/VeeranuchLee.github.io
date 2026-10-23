/* Keyboard — four of the five toys.
 *
 * The owner ruled on 2026-09-12 that these five physical toy models form a
 * developmental progression: Baby Rainbow, Chunky First Piano, Princess
 * Star Piano, Big-Kid Keyboard, then Studio Explorer. An earlier rescued
 * comment claimed the opposite and cited a 2026-09-11 specification that
 * does not exist anywhere in the repository; today's ruling supersedes it.
 *
 * A toy is { id, word, label, capabilities, mount(host) -> instance }.
 *   word       the short name printed under the ribbon chip. The chip itself
 *              is a CSS drawing of this toy, keyed off the button's data-toy
 *   label      the full name, for the ribbon's aria-label
 *   instance   { destroy(), sustain?, setSustain?(on) }
 *
 * A toy owns its own look, its own controls and its own choice of voice. It
 * does not own audio: every one of them plays through KB.engine, which is
 * what makes one recorder work in all four and what stops a toy switch from
 * tearing down an AudioContext iOS will not hand back without a gesture.
 */
(function () {
  "use strict";

  const KB = (window.KB = window.KB || {});
  KB.toys = KB.toys || {};

  function frag(html) {
    const t = document.createElement("div");
    t.innerHTML = html;
    return t.firstElementChild;
  }

  function addNaturalLetter(key, midi) {
    if (KB.isBlack(midi)) return;
    const label = document.createElement("span");
    label.className = "note-letter";
    label.setAttribute("aria-hidden", "true");
    label.textContent = KB.noteName(midi).charAt(0);
    key.appendChild(label);
  }

  /* ------------------------------------------------ the record buttons ---
     Owner, 2026-09-14: "can we also have simple record for all piano too?"
     Every toy in this file mounts the same two buttons over the one shared
     recorder, in the .transport / .tbtn structure Studio Explorer already
     uses, skinned per toy in toys.css. Two buttons, not Studio's four: the
     lit one is the one that stops it, and Record begins by throwing away
     the previous take, so Stop and Clear would be chrome on decks that are
     deliberately spare.

     The row draws itself from the recorder's own snapshots and asks the
     recorder for its mode at click time; nothing here caches state, and the
     unsubscribe it returns is called on destroy so a toy that unmounts
     leaves no listener behind.

     STATE WORDS (owner, 2026-09-21: "a working feature that appears broken to
     the child is still a UX failure"). Every state a child can be in now says
     what it is and what to do next, instead of the old four words where a
     fresh take, a stopped take and a finished song all said "Your song":
       Ready / Recording… <clock> / Your song — press ▶ / Playing… <clock of
       total> / Finished! press ▶ again. Recording pulses, finishing pops, and
     pressing Record over an existing take says the old song goes away. */
  function mountTransport(host, before) {
    const row = frag(
      '<div class="transport" role="group" aria-label="Record">' +
        '<button type="button" class="tbtn rec" data-record="start" aria-pressed="false">● <span>Record</span></button>' +
        '<button type="button" class="tbtn play not-ready" data-record="play" aria-pressed="false" aria-disabled="true">▶ <span>Play</span></button>' +
        '<p class="record-status" aria-live="polite">Ready <span class="record-time"></span></p>' +
      '</div>');
    const recBtn = row.querySelector('[data-record="start"]');
    const playBtn = row.querySelector('[data-record="play"]');
    const status = row.querySelector(".record-status");
    const clock = row.querySelector(".record-time");
    const fmt = (s) => {
      s = Math.max(0, Math.round(s));
      return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
    };
    let prevHadTake = false;
    let flash = null;
    let nudging = null;
    /* RECORD FIRST (owner, 2026-09-22: child-use evidence showed a dimmed Play
       that silently did nothing was confusing). Play before any take is NOT
       disabled: it stays tappable, looks dimmed (.not-ready + aria-disabled),
       and a tap answers with words, a glow on the Record button it points at,
       and a small shake of itself. Motion is dropped under reduced motion in
       toys.css; the glow stays, still, for the same moment. */
    const nudgeRecord = () => {
      window.clearTimeout(nudging);
      recBtn.classList.remove("nudge");
      playBtn.classList.remove("nudge");
      void recBtn.offsetWidth; // restart the animation on a repeat tap
      recBtn.classList.add("nudge");
      playBtn.classList.add("nudge");
      nudging = window.setTimeout(() => {
        recBtn.classList.remove("nudge");
        playBtn.classList.remove("nudge");
      }, 1600);
    };
    const say = (text, ms) => {
      window.clearTimeout(flash);
      status.dataset.words = text;
      paint();
      flash = window.setTimeout(() => { delete status.dataset.words; paint(); }, ms);
    };
    /* `words` in the dataset outranks the derived words while a transient
       message (New song! / Record first!) is on the line. */
    function paint() {
      const snap = lastSnap;
      if (!snap) return;
      const recording = snap.mode === "recording";
      const playing = snap.mode === "playing";
      recBtn.setAttribute("aria-pressed", String(recording));
      playBtn.setAttribute("aria-pressed", String(playing));
      /* Disabled only mid-recording (the lit Record button is the answer
         there). With no take yet Play stays tappable so a tap can say
         "Record a song first!" instead of silently doing nothing. */
      const notReady = !snap.hasTake && !recording && !playing;
      playBtn.disabled = recording;
      playBtn.classList.toggle("not-ready", notReady);
      if (notReady) playBtn.setAttribute("aria-disabled", "true");
      else playBtn.removeAttribute("aria-disabled");
      row.classList.toggle("is-recording", recording);
      row.classList.toggle("is-playing", playing);
      row.classList.toggle("is-finished", !recording && !playing && snap.hasTake && snap.ended === "finished");
      let words = "Ready";
      if (recording) words = "Recording…";
      else if (playing) words = "Playing…";
      else if (snap.hasTake) words = snap.ended === "finished" ? "Finished! press ▶ again" : "Your song — press ▶";
      if (status.dataset.words) words = status.dataset.words;
      const label = words + " ";
      if (status.textContent !== label + clock.textContent) status.firstChild.nodeValue = label;
    }
    let lastSnap = null;
    const unsubscribe = KB.recorder.onChange((snap) => {
      lastSnap = snap;
      if (snap.mode === "recording") {
        /* Record pressed over a take that existed a moment ago says so: the
           old song going away is the one surprise in the row. */
        if (prevHadTake) say("New song — the old one goes away!", 1800);
        KB.guidance && KB.guidance.play("recording");
      } else if (snap.hasTake && snap.ended === "stop") {
        KB.guidance && KB.guidance.play("stopped");
      } else if (snap.hasTake && snap.ended === "finished") {
        KB.guidance && KB.guidance.play("finished");
      }
      prevHadTake = snap.hasTake || snap.mode === "recording";
      paint();
    });
    /* onChange reports changes only, so a toy mounted on a fresh page has no
       snapshot until the first recording -- and paint() drew nothing, so a
       child's very first tap on Play got the glow but not "Record a song
       first!". Start from the recorder's current state instead. */
    if (!lastSnap) {
      lastSnap = { mode: KB.recorder.getMode(), hasTake: KB.recorder.hasTake(),
        duration: KB.recorder.getDuration(), ended: null, elapsed: 0 };
      paint();
    }
    /* The clock ticks on its own because snapshots only fire on state changes;
       4Hz is enough for a child to SEE time passing while recording. */
    const tick = window.setInterval(() => {
      if (!lastSnap) return;
      if (lastSnap.mode === "recording") clock.textContent = fmt(KB.recorder.elapsed());
      else if (lastSnap.mode === "playing") clock.textContent = fmt(KB.recorder.getDuration() - KB.recorder.elapsed()) + " left of " + fmt(KB.recorder.getDuration());
      else clock.textContent = "";
    }, 250);
    recBtn.addEventListener("click", () => {
      KB.engine.ensureAudio();
      /* The lit Record button means Stop. start() here would wipe the take
         mid-performance and roll a new one, which is not what a child
         pressing the glowing button is asking for. */
      if (KB.recorder.getMode() === "recording") KB.recorder.stop();
      else KB.recorder.start();
    });
    playBtn.addEventListener("click", () => {
      KB.engine.ensureAudio();
      if (KB.recorder.getMode() === "playing") { KB.recorder.stop(); return; }
      if (!KB.recorder.hasTake()) {
        /* The ordinary path for a child who taps Play before recording: Play
           is dimmed but tappable (see paint), so this answers with words, the
           Record glow and the "record-first" voice clip once it is rendered. */
        say("Record a song first!", 2000);
        nudgeRecord();
        KB.guidance && KB.guidance.play("record-first");
        return;
      }
      KB.recorder.play();
    });
    host.insertBefore(row, before || null);
    /* The idle face baked into the markup is not a guess: the shell stops and
       clears the take before any toy mounts, so the recorder is always idle
       and empty at the moment this row appears. */
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(flash);
      window.clearTimeout(nudging);
      unsubscribe();
    };
  }

  /* --------------------------------------------------------- 🌈 Rainbow ---
     Eight slabs of colour, one octave of a major scale, one soft voice, and
     as close to nothing else on the screen as this toy gets. A palm laid
     across the whole thing should sound good, which is what `glow` is shaped
     for. The record row is the one exception, and it is here because the
     owner asked for recording on every piano (2026-09-14), not because the
     slab stopped being bare: if the owner prefers the bare slab after seeing
     it, removing the row is one line in this mount plus turning the toy's
     recording capability back off. */

  const RAINBOW_NOTES = [60, 62, 64, 65, 67, 69, 71, 72];

  KB.toys.baby = {
    id: "baby",
    word: "Rainbow",
    label: "Baby Rainbow Keys",
    capabilities: { sustain: false, masterVolume: false, recording: true, computerKeyboard: false },
    mount(host) {
      const root = frag('<div class="toy toy-rainbow"><section class="keybed flat" aria-label="Keys"></section></div>');
      host.appendChild(root);
      KB.engine.setPatch("glow");
      KB.engine.setSustain(false);
      /* Under the handle, above the bars: the one thing this toy carries
         besides its keys. */
      const unsubscribeRecorder = mountTransport(root, root.querySelector(".keybed"));
      const effects = KB.mountPressEffects(root, "rainbow");
      const bed = KB.mountKeybed(root.querySelector(".keybed"), {
        layout: "flat",
        notes: RAINBOW_NOTES,
        computerKeyboard: false,
        decorate(d, m, i) {
          d.classList.add("hue" + i);
          d.dataset.effectColour = ["#ff7180", "#ff9d55", "#ffd85c", "#c7e457", "#5de0a5", "#57d8e7", "#72a3ff", "#b58aff"][i];
          d.appendChild(frag('<span class="blob" aria-hidden="true"></span>'));
          addNaturalLetter(d, m);
        },
        onInitialPress: effects.burst,
      });
      return {
        sustain: false,
        destroy() { effects.destroy(); unsubscribeRecorder(); bed.destroy(); root.remove(); },
      };
    },
  };

  /* ------------------------------------------------- the drawn icons ---
     Owner, 2026-10-20: no emoji in the UI. Every glyph a child picks a sound
     by — the picture buttons, the drum pads, the jewels, the special-sound
     pads — is a small drawing in this file's house style (one 24 x 24 box,
     rounded currentColor strokes, as pattern-blocks and magic-spelling
     already draw theirs), not an emoji-font glyph a tablet may render flat
     or not at all. The same thing keeps the same drawing wherever a child
     meets it: one bell, one drum, one set of keys, the way their emoji did
     double duty before. Each svg is 1em on a side, so the font-size rules
     that sized the emoji (toys.css) size the drawing too, and it sits in
     the same aria-hidden span, so a button still says its word and never
     its picture. */

  const drawIcon = (inner) =>
    '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" ' +
    'stroke="currentColor" stroke-width="2.2" stroke-linecap="round" ' +
    'stroke-linejoin="round" aria-hidden="true">' + inner + "</svg>";

  const ICONS = {
    /* First Piano's pad band: kick, snare, tom, clap. The fist and the
       clapping hand are the one part no drum photograph backs — the word
       under each pad settles it, as it did for the emoji before them. */
    footprint: drawIcon(
      '<ellipse cx="12" cy="14.9" rx="4.7" ry="6.1"/>' +
      '<circle cx="5.5" cy="6.3" r="1.2" fill="currentColor" stroke="none"/>' +
      '<circle cx="8.6" cy="4.2" r="1.2" fill="currentColor" stroke="none"/>' +
      '<circle cx="12" cy="3.5" r="1.2" fill="currentColor" stroke="none"/>' +
      '<circle cx="15.4" cy="4.2" r="1.2" fill="currentColor" stroke="none"/>' +
      '<circle cx="18.5" cy="6.3" r="1.2" fill="currentColor" stroke="none"/>'),
    drum: drawIcon(
      '<ellipse cx="12" cy="8.6" rx="7.8" ry="2.9"/>' +
      '<path d="M4.2 8.6v6.2c0 1.6 3.5 2.9 7.8 2.9s7.8-1.3 7.8-2.9V8.6"/>' +
      '<path d="M2.6 2.4l5 3.4M21.4 2.4l-5 3.4"/>'),
    fist: drawIcon(
      '<rect x="5.4" y="6.8" width="13.2" height="10.8" rx="4.6"/>' +
      '<path d="M9 6.8v3.4M12 6.8v3.4M15 6.8v3.4"/>' +
      '<path d="M7 15.6c1.7-1.5 8.3-1.5 10 0"/>'),
    hands: drawIcon(
      '<path d="M8.1 12.3V5.9a1.45 1.45 0 0 1 2.9 0v6.4"/>' +
      '<path d="M11 12.3V4.7a1.45 1.45 0 0 1 2.9 0v7.6"/>' +
      '<path d="M13.9 12.3V6.6a1.45 1.45 0 0 1 2.9 0v6.5c0 4-2.9 7.4-6.9 8.2"/>' +
      '<path d="M8.1 12.3c-2.2.4-3.2 2.2-2.5 4.2.7 2 2.2 3.6 4.2 4.2"/>' +
      '<path d="M3.6 5.4 2.2 4M20.4 5.4 21.8 4"/>'),
    /* The two voice rows. */
    keys: drawIcon(
      '<rect x="3" y="5.4" width="18" height="13.2" rx="2.2"/>' +
      '<path d="M8.7 5.4v13.2M15.3 5.4v13.2"/>' +
      '<path d="M6.6 5.4h3.2v5.2H6.6zM14.2 5.4h3.2v5.2h-3.2z" fill="currentColor" stroke="none"/>'),
    bell: drawIcon(
      '<path d="M12 3.4a1.35 1.35 0 0 1 1.35 1.35v.55c2.95.95 5 3.6 5 6.75 0 1.9.35 3.35 1.05 4.35H4.6c.7-1 1.05-2.45 1.05-4.35 0-3.15 2.05-5.8 5-6.75v-.55A1.35 1.35 0 0 1 12 3.4z"/>' +
      '<path d="M9.8 19.6a2.3 2.3 0 0 0 4.4 0"/>'),
    star: drawIcon(
      '<path d="M12 3l2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6L3.3 9.4l6-.9z"/>'),
    /* Princess: the three jeweled voices. */
    musicbox: drawIcon(
      '<rect x="4.4" y="9.8" width="15.2" height="9.4" rx="2"/>' +
      '<path d="M15 9.8V6h2.8"/>' +
      '<circle cx="9.4" cy="16.2" r="1.5" fill="currentColor" stroke="none"/>' +
      '<path d="M10.9 16.2v-5l3.6 1.1"/>'),
    sparkle: drawIcon(
      '<path d="M12 2.9c.75 3.9 2.5 5.65 6.4 6.4-3.9.75-5.65 2.5-6.4 6.4-.75-3.9-2.5-5.65-6.4-6.4 3.9-.75 5.65-2.5 6.4-6.4z"/>' +
      '<circle cx="5" cy="17.6" r="1.15" fill="currentColor" stroke="none"/>' +
      '<circle cx="18.9" cy="15" r="1.15" fill="currentColor" stroke="none"/>'),
    /* Princess: the six special sounds. */
    harp: drawIcon(
      '<path d="M6.4 4.6v14.8h12.2"/>' +
      '<path d="M18.6 19.4C18.6 11.4 13.6 5.4 6.4 4.6"/>' +
      '<path d="M11.3 6.6v12.8M15.2 9.8v9.6"/>'),
    wand: drawIcon(
      '<path d="M4 20l11.2-11.2"/>' +
      '<path d="M17 3.2c.55 2.2 1.55 3.2 3.75 3.75C18.55 7.5 17.55 8.5 17 10.7c-.55-2.2-1.55-3.2-3.75-3.75C15.45 6.4 16.45 5.4 17 3.2z" fill="currentColor" stroke="none"/>'),
    horn: drawIcon(
      '<path d="M3 12.1h8.6M11.6 12.1l6.6-6.3M11.6 12.1l6.3 1"/>' +
      '<path d="M18.2 5.8c2.3 2.1 2.4 5.1-.3 7.3"/>' +
      '<path d="M20.2 4.9l1.8-1.4M20.6 14.3l1.8 1"/>'),
    chime: drawIcon(
      '<path d="M5 5h14"/>' +
      '<circle cx="12" cy="3.1" r="1.2"/>' +
      '<path d="M7.6 5v9.8M12 5v12.2M16.4 5v9.8"/>' +
      '<circle cx="12" cy="20.6" r="1.5" fill="currentColor" stroke="none"/>'),
  };

  /* ----------------------------------------------------- 🧸 Preschool ---
     The Princess key arrangement at First Piano scale: eighteen keys C4-F5,
     eleven broad naturals and seven real raised accidentals — bigger and
     roomier than her bed, and carrying the rainbow where she stays pink and
     white. Where this toy's old five-button rear row used to sit there is
     now a band of four palm-sized drum pads, so it reads as the activity
     piano it is: keys to play, pads to hit.

     Owner, 2026-09-14, answering TOY-SOUND-EXPANSION-SPEC §8: "1: dark black
     keys + 4 pads first, close rear-gap issue". The eleven naturals carry
     the spectrum and the seven accidentals stay one dark plum — colour is
     redundant identity, never the hit-test input. Four pads, not five, is
     kick/snare/tom/clap: the set the engine already synthesises, so no new
     voice comes with this. The earlier fifteen-key C4-E5 build this replaces
     was arithmetic about a five-button rear-row budget, and the rear row it
     balanced is gone. */

  const PRESCHOOL_HUES = ["#ff8d99", "#ffa86f", "#ffe17a", "#d7eb74", "#79dfb1", "#75dce5", "#8bb2ff", "#bca0ff", "#ed9bd8", "#ffadc7"];
  /* Pictures before words, as the sound buttons above them already do. The
     word is the child-facing copy: names only. */
  const PRESCHOOL_PADS = [
    { drum: "kick", icon: ICONS.footprint, word: "Kick" },
    { drum: "snare", icon: ICONS.drum, word: "Snare" },
    { drum: "tom", icon: ICONS.fist, word: "Tom" },
    { drum: "clap", icon: ICONS.hands, word: "Clap" },
  ];
  const PRESCHOOL_VOICES = [
    { id: "piano", patch: "toypiano", icon: ICONS.keys, word: "Piano" },
    { id: "bells", icon: ICONS.bell, word: "Bells" },
    { id: "stars", patch: "glow", icon: ICONS.star, word: "Stars" },
  ];

  KB.toys.preschool = {
    id: "preschool",
    word: "First Piano",
    label: "Chunky First Piano",
    capabilities: { sustain: false, masterVolume: false, recording: true, computerKeyboard: false },
    mount(host) {
      const root = frag(
        '<div class="toy toy-preschool">' +
          '<div class="picture-sounds" role="group" aria-label="Sound">' +
            PRESCHOOL_VOICES.map((v) =>
              '<button type="button" class="picture-sound" data-voice="' + v.id + '" aria-label="' + v.word + '" aria-pressed="false">' +
              '<span aria-hidden="true">' + v.icon + '</span><span>' + v.word + '</span></button>').join("") +
          '</div>' +
          '<div class="padband" role="group" aria-label="Drums">' +
            PRESCHOOL_PADS.map((p) =>
              '<button type="button" class="pad" data-drum="' + p.drum + '" aria-label="' + p.word + '">' +
              '<span class="ico" aria-hidden="true">' + p.icon + '</span>' +
              '<span class="word">' + p.word + '</span></button>').join("") +
          '</div>' +
          '<section class="keybed piano" aria-label="Keys"></section>' +
        '</div>');
      host.appendChild(root);
      KB.engine.setSustain(false);
      let voice = KB.state.getToy("preschool", "sound");
      function setVoice(id) {
        voice = PRESCHOOL_VOICES.some((v) => v.id === id) ? id : "piano";
        const selected = PRESCHOOL_VOICES.find((v) => v.id === voice);
        KB.engine.setPatch(selected.patch || selected.id);
        root.querySelectorAll(".picture-sound").forEach((b) =>
          b.setAttribute("aria-pressed", String(b.dataset.voice === voice)));
        KB.state.setToy("preschool", "sound", voice);
      }
      root.querySelectorAll(".picture-sound").forEach((b) => b.addEventListener("click", () => {
        KB.engine.ensureAudio();
        setVoice(b.dataset.voice);
      }));
      setVoice(voice);
      /* Between the sound buttons and the pad band, styled in toys.css as
         one more of the case's own chunky buttons. */
      const unsubscribeRecorder = mountTransport(root, root.querySelector(".padband"));
      const effects = KB.mountPressEffects(root, "preschool");

      /* The pads. Drums, not notes: each fires a one-shot through
         KB.engine.hit, which the voice selection never touches, and the
         strike lands in any take exactly like a key press (recorder.js
         hears engine events, never toy DOM). The .lit flash is the same
         110ms Studio's pads use. */
      root.querySelectorAll(".padband .pad").forEach((b) => {
        const fire = () => {
          KB.engine.ensureAudio();
          KB.engine.hit(b.dataset.drum, { source: "touch" });
          b.classList.add("lit");
          window.setTimeout(() => b.classList.remove("lit"), 110);
        };
        /* Pointer first so a drummer can use both hands at once; the click
           is the fallback for engines that deliver only clicks. */
        let pointered = null;
        b.addEventListener("pointerdown", (e) => {
          pointered = window.performance.now();
          fire();
          if (e.preventDefault) e.preventDefault();
        });
        b.addEventListener("click", () => {
          if (pointered !== null && window.performance.now() - pointered < 800) return;
          fire();
        });
      });

      const bed = KB.mountKeybed(root.querySelector(".keybed"), {
        layout: "piano",
        first: 60,       /* C4 */
        last: 77,        /* F5 — 18 keys, the Princess span at this bed's scale */
        /* Fat, short, round accidentals, as on the Princess bed. Her bed's
           eleven whites are narrower than these; at this width 0.80 draws a
           black key near 51px, comfortably over the 44px floor. */
        blackWidth: 0.80,
        blackBand: 0.58,
        computerKeyboard: false,
        decorate(d, midi, i) {
          /* The rainbow lives on the naturals, one hue each in spectrum
             order. Ten hues, eleven naturals: the wheel wraps onto F5, the
             way a rainbow toy's colours start over. The accidentals take no
             hue at all — one dark plum is what makes the arrangement read.
             The hit test never reads any of this. */
          if (KB.isBlack(midi)) return;
          d.classList.add("hue" + (i % 10));
          d.dataset.effectColour = PRESCHOOL_HUES[i % PRESCHOOL_HUES.length];
          addNaturalLetter(d, midi);
        },
        onInitialPress: effects.burst,
      });
      return { sustain: false, destroy() { effects.destroy(); unsubscribeRecorder(); bed.destroy(); root.remove(); } };
    },
  };

  /* -------------------------------------------------------- 👑 Princess ---
     A pretend-play piano under a castle arch: eighteen short, round keys,
     two turrets, three jeweled voices that chime rather than thump, and one
     big star that plays a little tune by itself. Far fewer keys than the
     Classic console's 49 — a different instrument, not a cut-down one. */

  /* The star's flourish: a rising arpeggio and a chord to finish, in beats.
     Fixed, so it is the same little tune every time — that is the point of
     a button a child presses to hear something happen. */
  const PRINCESS_FLOURISH = [
    { m: 72, at: 0.00, len: 0.20 },
    { m: 76, at: 0.12, len: 0.20 },
    { m: 79, at: 0.24, len: 0.20 },
    { m: 84, at: 0.36, len: 0.45 },
    { m: 72, at: 0.52, len: 0.70 },
    { m: 76, at: 0.52, len: 0.70 },
    { m: 79, at: 0.52, len: 0.70 },
  ];

  const PRINCESS_VOICES = [
    { id: "piano", patch: "toypiano", icon: ICONS.keys, word: "Piano" },
    { id: "musicbox", icon: ICONS.musicbox, word: "Music Box" },
    { id: "sparkle", patch: "bells", icon: ICONS.sparkle, word: "Sparkle" },
  ];

  /* The six special sound buttons (owner, 2026-09-15; PRINCESS-SOUND-BUTTONS-
     SPEC.md §1). One-shot pads, not modes: each is a drum in KB.drums, fired
     through KB.engine.hit exactly like First Piano's pad band, so a strike
     lands in a take with no recorder change. The word is the short label the
     owner asked for; the pad's aria-label is the sound's own full name
     ("Royal Fanfare", not "Fanfare"). */
  const PRINCESS_PADS = [
    { drum: "princess-bell", icon: ICONS.bell, word: "Bell" },
    { drum: "princess-harp", icon: ICONS.harp, word: "Harp" },
    { drum: "princess-wand", icon: ICONS.wand, word: "Wand" },
    { drum: "princess-fanfare", icon: ICONS.horn, word: "Fanfare" },
    { drum: "princess-drum", icon: ICONS.drum, word: "Drum" },
    { drum: "princess-twinkle", icon: ICONS.chime, word: "Chime" },
  ];
  const padButton = (p) =>
    '<button type="button" class="spad" data-drum="' + p.drum +
    '" aria-label="' + KB.drums[p.drum].name + '">' +
      '<span class="ico" aria-hidden="true">' + p.icon + '</span>' +
      '<span class="word">' + p.word + '</span>' +
    '</button>';
  const padRail = (list) => '<div class="spad-rail">' + list.map(padButton).join("") + '</div>';

  KB.toys.princess = {
    id: "princess",
    word: "Princess",
    label: "Princess Star Piano",
    capabilities: { sustain: false, masterVolume: false, recording: true, computerKeyboard: false },
    mount(host) {
      const root = frag(
        '<div class="toy toy-princess">' +
          '<div class="vanity">' +
            '<div class="turret left" aria-hidden="true"></div>' +
            '<div class="turret right" aria-hidden="true"></div>' +
            /* Three pads up each wall of the castle, the arch's centre left
               open for the sparkles — the owner's layout, in the castle zone
               the top padding paints. */
            '<div class="soundpads" role="group" aria-label="Special sounds">' +
              padRail(PRINCESS_PADS.slice(0, 3)) +
              padRail(PRINCESS_PADS.slice(3)) +
            '</div>' +
            '<div class="lid">' +
              '<div class="jewels" role="group" aria-label="Sound">' +
                PRINCESS_VOICES.map((v) =>
                  '<button type="button" class="jewel" data-voice="' + v.id + '" aria-pressed="false">' +
                  '<span class="ico" aria-hidden="true">' + v.icon + '</span>' +
                  '<span class="word">' + v.word + '</span></button>').join("") +
              '</div>' +
              '<button type="button" class="starbtn" aria-label="Play a little tune">' +
                '<span class="star" aria-hidden="true">★</span>' +
                '<span class="word">Tune</span>' +
              '</button>' +
            '</div>' +
            '<section class="keybed piano" aria-label="Keys"></section>' +
          '</div>' +
        '</div>');
      host.appendChild(root);

      /* No pedal on this one. Every Princess voice rings on after the finger
         leaves it — a music box has no damper — so a pedal would be a
         control that changes almost nothing, on the toy that can least
         afford a control that does almost nothing. */
      KB.engine.setSustain(false);

      const saved = KB.state.getToy("princess", "sound");
      let voice = PRINCESS_VOICES.some((v) => v.id === saved) ? saved : "piano";

      function setVoice(id) {
        voice = id;
        const selected = PRINCESS_VOICES.find((v) => v.id === id);
        KB.engine.setPatch(selected.patch || selected.id);
        root.querySelectorAll(".jewel").forEach((b) => {
          b.setAttribute("aria-pressed", String(b.dataset.voice === id));
        });
        KB.state.setToy("princess", "sound", id);
      }
      root.querySelectorAll(".jewel").forEach((b) => {
        b.addEventListener("click", () => {
          KB.engine.ensureAudio();
          setVoice(b.dataset.voice);
        });
      });
      setVoice(voice);

      /* The star. One press plays the flourish through the engine, on the
         voice the child has chosen, at source "star" — so it lights the keys
         it touches, a take records it, and a toy switch releases it without
         reaching for the finger's notes. Pressing it again while it is
         playing starts it over rather than stacking a second copy. */
      const starBtn = root.querySelector(".starbtn");
      let starTimers = [];
      function stopStar() {
        starTimers.forEach((t) => window.clearTimeout(t));
        starTimers = [];
        KB.engine.panic("star");
        starBtn.classList.remove("ringing");
      }
      starBtn.addEventListener("click", () => {
        KB.engine.ensureAudio();
        stopStar();
        starBtn.classList.add("ringing");
        const beat = 0.62;   /* seconds — unhurried, a toy and not a metronome */
        PRINCESS_FLOURISH.forEach((n) => {
          starTimers.push(window.setTimeout(() => KB.engine.noteOn(n.m, { source: "star" }), n.at * beat * 1000));
          starTimers.push(window.setTimeout(() => KB.engine.noteOff(n.m, { source: "star" }), (n.at + n.len) * beat * 1000));
        });
        starTimers.push(window.setTimeout(() => starBtn.classList.remove("ringing"), 1.5 * beat * 1000));
      });

      /* Under the lid, over the keys: the record row, dressed in toys.css as
         one more jewel rather than as studio gear. */
      const unsubscribeRecorder = mountTransport(root.querySelector(".vanity"), root.querySelector(".keybed"));
      const effects = KB.mountPressEffects(root.querySelector(".vanity"), "princess");

      /* The special sound pads. Drums, not notes, and not modes: each fires a
         one-shot through KB.engine.hit — First Piano's pad band is the
         precedent — so a strike lands in any take exactly like a key press
         and the recorder needs to know nothing about pads. A tap also answers
         over the star: the tune stops first (stopStar is idempotent, so this
         is one call whether or not the star is ringing). During playback the
         pads stand down, which is the owner's "during playback, can be
         disabled to keep playback clean". */
      const pads = [...root.querySelectorAll(".soundpads .spad")];
      const unsubscribePads = KB.recorder.onChange((snap) => {
        const playing = snap.mode === "playing";
        pads.forEach((b) => { b.disabled = playing; });
      });
      pads.forEach((b, i) => {
        const fire = () => {
          /* The disabled attribute keeps a real finger off; the mode check
             keeps a tap this DOM still delivers — a synthesised one, or an
             engine that runs click listeners on disabled buttons — from
             firing a pad over its own take. */
          if (KB.recorder.getMode() === "playing") return;
          KB.engine.ensureAudio();
          stopStar();
          KB.engine.hit(b.dataset.drum, { source: "touch" });
          b.classList.add("lit");
          window.setTimeout(() => b.classList.remove("lit"), 110);
          /* The pad's own sparkle, rising off it into the castle. Keyed on
             numbers this bed never draws (60-77), so a pad never shares a
             key's burst cooldown. */
          effects.burst(100 + i, b);
        };
        /* Pointer first so both hands can drum at once; the click is the
           fallback for engines that deliver only clicks. As First Piano. */
        let pointered = null;
        b.addEventListener("pointerdown", (e) => {
          pointered = window.performance.now();
          fire();
          if (e.preventDefault) e.preventDefault();
        });
        b.addEventListener("click", () => {
          if (pointered !== null && window.performance.now() - pointered < 800) return;
          fire();
        });
      });

      const bed = KB.mountKeybed(root.querySelector(".keybed"), {
        layout: "piano",
        first: 60,       /* C4 */
        last: 77,        /* F5 — 18 keys */
        /* Fat, short accidentals: the document asks for keys "shorter and
           rounder than the big-kid model", and this is also what gets them
           over the 44px floor. Eleven whites across this bed put the white
           pitch at 56px, so 0.64 draws a 36px black key and 0.72 a 40px one
           — both measured, both under. 0.80 draws 44.8px. It costs the white
           keys some width in the upper band and nothing at all in the lower
           58%, which is where a small hand actually plays. */
        blackWidth: 0.80,
        blackBand: 0.58,
        computerKeyboard: false,
        /* Natural notes carry the early-reader letters. Accidentals stay
           unlettered: a lone C# is notation teaching, not letter learning. */
        decorate: addNaturalLetter,
        onInitialPress: effects.burst,
      });

      return {
        sustain: false,
        destroy() { stopStar(); effects.destroy(); unsubscribeRecorder(); unsubscribePads(); bed.destroy(); root.remove(); },
      };
    },
  };

  /* --------------------------------------------------------- 🎹 Classic ---
     The console as it was: 49 keys C3–C7, the same four patches with the
     same oscillators and the same envelopes, sustain, master volume, the
     LCD. Nothing was taken off it to make room for the other three, and the
     one Studio thing that has come onto it is the record transport, because
     the owner asked for recording on every piano (2026-09-14) — not the
     octave buttons, pads, tempo or arpeggiator, which the older instruction
     keeps off this console. */

  const CLASSIC_PATCHES = ["piano", "epiano", "organ", "synth"];

  KB.toys["big-kid"] = {
    id: "big-kid",
    word: "Classic",
    label: "Big-Kid Keyboard",
    capabilities: { sustain: true, masterVolume: true, recording: true, computerKeyboard: true },
    mount(host) {
      const root = frag(
        '<div class="toy toy-classic">' +
          '<div id="console">' +
            '<div id="edge" aria-hidden="true"></div>' +
            '<section id="deck" aria-label="Controls">' +
              '<div class="speaker" aria-hidden="true"><div class="grille"></div></div>' +
              '<div id="center">' +
                '<p id="brand" aria-hidden="true">KEYBOARD<span>49</span></p>' +
                '<div id="lcd" aria-live="polite">' +
                  '<p id="lcdName">Piano</p>' +
                  '<div id="lcdRow"><p id="lcdState">READY</p><div id="lcdVol" aria-hidden="true"></div></div>' +
                '</div>' +
                '<div id="sounds" role="group" aria-label="Sound">' +
                  CLASSIC_PATCHES.map((p) =>
                    '<button type="button" class="sound" data-patch="' + p + '" aria-pressed="false">' +
                    '<i class="led"></i>' + KB.voices[p].name + '</button>').join("") +
                '</div>' +
                '<div id="fx" aria-label="Effects and volume">' +
                  '<button type="button" id="sustain" aria-pressed="false"><i class="led"></i>Sustain</button>' +
                  '<label id="volWrap"><span id="volLabel">Master</span>' +
                  '<input type="range" id="vol" min="0" max="100" value="80" aria-label="Master volume"/></label>' +
                '</div>' +
              '</div>' +
              '<div class="speaker right" aria-hidden="true"><div class="grille"></div></div>' +
            '</section>' +
            '<section id="keybed" class="keybed piano" aria-label="Keys"></section>' +
          '</div>' +
        '</div>');
      host.appendChild(root);

      const lcdName = root.querySelector("#lcdName");
      const lcdState = root.querySelector("#lcdState");
      const lcdVol = root.querySelector("#lcdVol");
      const vol = root.querySelector("#vol");
      const sustainBtn = root.querySelector("#sustain");

      /* The LCD's volume meter. It ships as an empty div and drawLcd()
         lights its children, so without this the meter has no children to
         light and reads blank at every volume — styled in CSS, never built. */
      for (let i = 0; i < 12; i += 1) lcdVol.appendChild(document.createElement("i"));

      let sustain = Boolean(KB.state.getToy("big-kid", "sustain"));
      let patch = CLASSIC_PATCHES.indexOf(KB.state.getToy("big-kid", "sound")) >= 0 ? KB.state.getToy("big-kid", "sound") : "piano";
      let lcdTimer = 0;

      function drawLcd() {
        lcdName.textContent = KB.voices[patch].name;
        lcdState.textContent = sustain ? "SUSTAIN" : "READY";
        [...lcdVol.children].forEach((seg, i) => {
          seg.classList.toggle("on", i < Math.round(KB.engine.getVolume() * lcdVol.children.length));
        });
      }

      function setPatch(id) {
        patch = id;
        KB.engine.setPatch(id);
        root.querySelectorAll(".sound").forEach((b) => {
          b.setAttribute("aria-pressed", String(b.dataset.patch === id));
        });
        drawLcd();
        KB.state.setToy("big-kid", "sound", id);
      }

      function setSustain(on) {
        sustain = Boolean(on);
        KB.engine.setSustain(sustain);
        sustainBtn.setAttribute("aria-pressed", String(sustain));
        drawLcd();
        KB.state.setToy("big-kid", "sustain", sustain);
      }

      function setVolume(v) {
        KB.engine.setVolume(v);
        const pct = Math.round(KB.engine.getVolume() * 100);
        vol.value = pct;
        vol.style.setProperty("--fill", pct + "%");
        drawLcd();
        KB.state.setMasterVolume(KB.engine.getVolume());
      }

      root.querySelectorAll(".sound").forEach((b) => {
        b.addEventListener("click", () => {
          KB.engine.ensureAudio();
          setPatch(b.dataset.patch);
        });
      });
      sustainBtn.addEventListener("click", () => {
        KB.engine.ensureAudio();
        setSustain(!sustain);
      });
      vol.addEventListener("input", () => setVolume(vol.value / 100));

      /* Playing a key shows its name for a moment — orientation, not
         reading. It listens to the engine, so a take playing back reads out
         on the LCD too. */
      const unsubscribe = KB.engine.onNote((e) => {
        if (e.type !== "on") return;
        window.clearTimeout(lcdTimer);
        lcdState.textContent = KB.noteName(e.midi);
        lcdTimer = window.setTimeout(() => {
          lcdState.textContent = sustain ? "SUSTAIN" : "READY";
        }, 1200);
      });

      setPatch(patch);
      setSustain(sustain);
      setVolume(KB.engine.getVolume());

      /* Between the deck and the keys. Classic is the one toy that wears the
         shared transport exactly as Studio styles it: they are both dark
         gear, and a re-skinned one would look wrong here. */
      const unsubscribeRecorder = mountTransport(root.querySelector("#console"), root.querySelector("#keybed"));

      const bed = KB.mountKeybed(root.querySelector(".keybed"), {
        layout: "piano",
        first: 48,   /* C3 */
        last: 96,    /* C7 — 49 keys */
        computerKeyboard: true,
      });

      return {
        get sustain() { return sustain; },
        setSustain: setSustain,
        destroy() {
          window.clearTimeout(lcdTimer);
          unsubscribe();
          unsubscribeRecorder();
          bed.destroy();
          root.remove();
        },
      };
    },
  };
})();
