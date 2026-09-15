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
     leaves no listener behind. */
  function mountTransport(host, before) {
    const row = frag(
      '<div class="transport" role="group" aria-label="Record">' +
        '<button type="button" class="tbtn rec" data-record="start" aria-pressed="false">● <span>Record</span></button>' +
        '<button type="button" class="tbtn play" data-record="play" aria-pressed="false" disabled>▶ <span>Play</span></button>' +
        '<p class="record-status" aria-live="polite">Ready</p>' +
      '</div>');
    const recBtn = row.querySelector('[data-record="start"]');
    const playBtn = row.querySelector('[data-record="play"]');
    const status = row.querySelector(".record-status");
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
      /* And the lit Play button means Stop too: play() on its own would
         start the take over from the top. */
      if (KB.recorder.getMode() === "playing") KB.recorder.stop();
      else KB.recorder.play();
    });
    const unsubscribe = KB.recorder.onChange((snap) => {
      const recording = snap.mode === "recording";
      const playing = snap.mode === "playing";
      recBtn.setAttribute("aria-pressed", String(recording));
      playBtn.setAttribute("aria-pressed", String(playing));
      playBtn.disabled = !snap.hasTake || recording;
      status.textContent = recording ? "Recording" : playing ? "Playing" : snap.hasTake ? "Your song" : "Ready";
    });
    host.insertBefore(row, before || null);
    /* The idle face baked into the markup is not a guess: the shell stops and
       clears the take before any toy mounts, so the recorder is always idle
       and empty at the moment this row appears. */
    return unsubscribe;
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
    { drum: "kick", icon: "🦶", word: "Kick" },
    { drum: "snare", icon: "🥁", word: "Snare" },
    { drum: "tom", icon: "👊", word: "Tom" },
    { drum: "clap", icon: "👏", word: "Clap" },
  ];
  const PRESCHOOL_VOICES = [
    { id: "piano", patch: "toypiano", icon: "🎹", word: "Piano" },
    { id: "bells", icon: "🔔", word: "Bells" },
    { id: "stars", patch: "glow", icon: "⭐", word: "Stars" },
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
    { id: "piano", patch: "toypiano", icon: "🎹", word: "Piano" },
    { id: "musicbox", icon: "💫", word: "Music Box" },
    { id: "sparkle", patch: "bells", icon: "✨", word: "Sparkle" },
  ];

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
        destroy() { stopStar(); effects.destroy(); unsubscribeRecorder(); bed.destroy(); root.remove(); },
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
