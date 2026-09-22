/* Keyboard — 🎛 Studio.
 *
 * The hobby MIDI-keyboard face: piano keys with octave and transpose under
 * them, eight voices, six drum pads, a metronome, a tempo, four rhythms, an
 * arpeggiator and a pedal.
 *
 * Studio Explorer is the advanced end of the five-toy developmental
 * progression settled by the owner on 2026-09-12.
 *
 * EVERYTHING HERE STAYS HERE. The owner's instruction is that Classic must
 * not get cluttered: no octave buttons, no pads, no tempo and no arpeggiator
 * may be added to the Classic console. If a control needs to exist, it needs
 * to exist on this screen. One exception since 2026-09-14: the record
 * transport itself crossed to every toy on the owner's ask, and this screen
 * keeps the full four-button version of it.
 *
 * One step clock drives the metronome, the rhythm and the arpeggiator, and
 * it re-aims itself at the audio clock after every step rather than trusting
 * setInterval, which drifts audibly inside half a minute.
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

  const VOICES = ["piano", "epiano", "organ", "synth", "strings", "brass", "bass", "bells"];
  const PADS = ["kick", "snare", "hat", "clap", "tom", "bell", "kick", "snare"];
  const RHYTHM_DRUMS = ["kick", "snare", "hat", "clap", "tom", "bell"];

  /* Sixteenth-note grids. A rhythm a child starts is part of the song, so
     its hits go through the engine like any other drum and land in a take. */
  const RHYTHMS = {
    rock: { steps: 16, kick: [0, 8], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14] },
    pop: { steps: 16, kick: [0, 6, 10], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14] },
    waltz: { steps: 12, kick: [0], snare: [4, 8], hat: [0, 2, 4, 6, 8, 10] },
    samba: { steps: 16, kick: [0, 6, 8, 14], clap: [4, 12], tom: [11], hat: [0, 2, 4, 6, 8, 10, 12, 14] },
  };
  const RHYTHM_ORDER = ["off", "rock", "pop", "waltz", "samba"];
  const RHYTHM_WORDS = { off: "Off", rock: "Rock", pop: "Pop", waltz: "Waltz", samba: "Samba" };

  const OCT_MIN = -2;
  const OCT_MAX = 2;
  const TRANS_MIN = -6;
  const TRANS_MAX = 6;

  KB.toys.advanced = {
    id: "advanced",
    word: "Studio",
    label: "Studio Explorer",
    capabilities: { sustain: true, masterVolume: true, recording: true, computerKeyboard: true },
    mount(host) {
      const root = frag(
        '<div class="toy toy-studio">' +
          '<div class="rack">' +
            '<div class="bank voices" role="group" aria-label="Sound">' +
              VOICES.map((v) =>
                '<button type="button" class="gear voice" data-voice="' + v + '" aria-pressed="false">' +
                '<i class="led"></i>' + KB.voices[v].name + '</button>').join("") +
            '</div>' +
            '<div class="bank pads" role="group" aria-label="Drums">' +
              PADS.map((p, i) =>
                '<button type="button" class="pad" data-drum="' + p + '" aria-label="Pad ' + (i + 1) + ', ' + KB.drums[p].name + '">' + KB.drums[p].name + '</button>').join("") +
            '</div>' +
          '</div>' +
          '<div class="strip">' +
            '<div class="stepper" role="group" aria-label="Octave">' +
              '<span class="cap">Octave</span>' +
              '<button type="button" class="step" data-oct="-1" aria-label="Octave down">−</button>' +
              '<b class="read octRead">0</b>' +
              '<button type="button" class="step" data-oct="1" aria-label="Octave up">+</button>' +
            '</div>' +
            '<div class="stepper" role="group" aria-label="Transpose">' +
              '<span class="cap">Transpose</span>' +
              '<button type="button" class="step" data-trans="-1" aria-label="Transpose down">−</button>' +
              '<b class="read transRead">0</b>' +
              '<button type="button" class="step" data-trans="1" aria-label="Transpose up">+</button>' +
            '</div>' +
            '<button type="button" class="gear tog" data-tog="sustain" aria-pressed="false"><i class="led"></i>Sustain</button>' +
            '<button type="button" class="gear tog" data-tog="arp" aria-pressed="false"><i class="led"></i>Arpeggio</button>' +
          '</div>' +
          '<div class="strip">' +
            '<button type="button" class="gear tog" data-tog="metro" aria-pressed="false"><i class="led"></i>Metronome</button>' +
            '<label class="tempo"><span class="cap">Tempo</span>' +
              '<input type="range" class="tempoRange" min="40" max="200" step="1" value="110" aria-label="Tempo"/>' +
              '<b class="read tempoRead">110</b></label>' +
            '<div class="rhythms" role="group" aria-label="Rhythm">' +
              RHYTHM_ORDER.map((r) =>
                '<button type="button" class="gear rhythm" data-rhythm="' + r + '" aria-pressed="false">' +
                RHYTHM_WORDS[r] + '</button>').join("") +
            '</div>' +
            '<label class="studio-volume"><span class="cap">Master</span>' +
              '<input type="range" class="masterRange" min="0" max="100" value="80" aria-label="Master volume"/></label>' +
          '</div>' +
          '<div class="transport" role="group" aria-label="Record">' +
            '<button type="button" class="tbtn rec" data-record="start" aria-pressed="false">● <span>Record</span></button>' +
            '<button type="button" class="tbtn" data-record="stop" disabled>■ <span>Stop</span></button>' +
            '<button type="button" class="tbtn play" data-record="play" aria-pressed="false" disabled>▶ <span>Play</span></button>' +
            '<button type="button" class="tbtn" data-record="clear" disabled>✕ <span>Clear</span></button>' +
            '<p class="record-status" aria-live="polite">Ready</p>' +
          '</div>' +
          '<section class="keybed piano" aria-label="Keys"></section>' +
        '</div>');
      host.appendChild(root);

      const st = {
        voice: VOICES.indexOf(KB.state.getToy("advanced", "sound")) >= 0 ? KB.state.getToy("advanced", "sound") : "piano",
        octave: 0,
        transpose: 0,
        sustain: Boolean(KB.state.getToy("advanced", "sustain")),
        arp: false,          /* never remembered: a keyboard that arpeggiates
                                on open, with nobody having asked it to, reads
                                as broken */
        metro: false,
        rhythm: "off",
        tempo: 110,
      };

      function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

      /* ------------------------------------------------------- the keys --- */

      const bedEl = root.querySelector(".keybed");
      let bed = null;

      /* Held keys, as DRAWN note numbers, for the arpeggiator to walk. */
      const arpHeld = [];

      function sounding(m) { return m; }  /* offset() does the shifting */

      function play(m) {
        if (st.arp) {
          /* With the arpeggiator on, a pressed key joins the pattern instead
             of sounding on its own — that is what an arpeggiator is. The key
             still lights, because the keybed lights on the press. */
          const drawn = m - st.transpose - st.octave * 12;
          if (arpHeld.indexOf(drawn) < 0) { arpHeld.push(drawn); arpHeld.sort((a, b) => a - b); }
          startClock();
          return;
        }
        KB.engine.noteOn(m, { source: "touch" });
      }

      function releaseNote(m) {
        if (st.arp) {
          const drawn = m - st.transpose - st.octave * 12;
          const i = arpHeld.indexOf(drawn);
          if (i >= 0) arpHeld.splice(i, 1);
          return;
        }
        KB.engine.noteOff(m, { source: "touch" });
      }

      function buildBed() {
        if (bed) bed.destroy();
        bed = KB.mountKeybed(bedEl, {
          layout: "piano",
          first: 36,                         /* C2 */
          last: 96,                          /* C7 — 61 keys */
          offset: () => st.transpose + st.octave * 12,
          play: play,
          release: releaseNote,
          computerKeyboard: true,
        });
      }

      /* ----------------------------------------------------- the clock --- */

      let clockTimer = 0;
      let step = 0;
      let nextAt = 0;
      let arpIndex = 0;

      function stepSeconds() { return (60 / st.tempo) / 4; }
      function barSteps() { return st.rhythm !== "off" ? RHYTHMS[st.rhythm].steps : 16; }

      function clockWanted() { return st.metro || st.rhythm !== "off" || (st.arp && arpHeld.length > 0); }

      function startClock() {
        if (clockTimer || !clockWanted()) return;
        KB.engine.ensureAudio();
        step = 0;
        arpIndex = 0;
        nextAt = KB.engine.time();
        tick();
      }

      function stopClock() {
        if (clockTimer) window.clearTimeout(clockTimer);
        clockTimer = 0;
        KB.engine.panic("arp");
      }

      function tick() {
        clockTimer = 0;
        if (!clockWanted()) { KB.engine.panic("arp"); return; }
        const bar = barSteps();
        const s = step % bar;

        /* The metronome is a guide, not part of the song: source "metro" is
           the one thing the recorder throws away. */
        if (st.metro && s % 4 === 0) KB.engine.hit(s === 0 ? "tock" : "tick", { source: "metro" });

        if (st.rhythm !== "off") {
          const pat = RHYTHMS[st.rhythm];
          RHYTHM_DRUMS.forEach((d) => {
            if (pat[d] && pat[d].indexOf(s) >= 0) KB.engine.hit(d, { source: "rhythm" });
          });
        }

        if (st.arp && arpHeld.length && step % 2 === 0) {
          const drawn = arpHeld[arpIndex % arpHeld.length];
          arpIndex += 1;
          const note = drawn + st.transpose + st.octave * 12;
          KB.engine.noteOn(note, { source: "arp" });
          const off = stepSeconds() * 2 * 0.85 * 1000;
          window.setTimeout(() => KB.engine.noteOff(note, { source: "arp" }), off);
        }

        step += 1;
        nextAt += stepSeconds();
        /* Re-aimed at the audio clock every step, so a slow frame costs one
           late hit instead of shifting the whole bar for ever. */
        const delay = Math.max(0, (nextAt - KB.engine.time()) * 1000);
        clockTimer = window.setTimeout(tick, delay);
      }

      function syncClock() {
        if (clockWanted()) startClock();
        else stopClock();
      }

      /* ---------------------------------------------------- the panel --- */

      const octRead = root.querySelector(".octRead");
      const transRead = root.querySelector(".transRead");
      const tempoRead = root.querySelector(".tempoRead");
      const tempoRange = root.querySelector(".tempoRange");

      function drawVoice() {
        root.querySelectorAll(".voice").forEach((b) => {
          b.setAttribute("aria-pressed", String(b.dataset.voice === st.voice));
        });
      }
      function drawTogs() {
        root.querySelectorAll(".tog").forEach((b) => {
          b.setAttribute("aria-pressed", String(Boolean(st[b.dataset.tog])));
        });
        root.querySelectorAll(".rhythm").forEach((b) => {
          b.setAttribute("aria-pressed", String(b.dataset.rhythm === st.rhythm));
        });
      }
      function drawReads() {
        octRead.textContent = st.octave > 0 ? "+" + st.octave : String(st.octave);
        transRead.textContent = st.transpose > 0 ? "+" + st.transpose : String(st.transpose);
        tempoRead.textContent = String(st.tempo);
        tempoRange.value = String(st.tempo);
      }

      root.querySelectorAll(".voice").forEach((b) => {
        b.addEventListener("click", () => {
          KB.engine.ensureAudio();
          st.voice = b.dataset.voice;
          KB.engine.setPatch(st.voice);
          KB.state.setToy("advanced", "sound", st.voice);
          drawVoice();
        });
      });

      root.querySelectorAll(".pad").forEach((b) => {
        const fire = () => {
          KB.engine.ensureAudio();
          KB.engine.hit(b.dataset.drum, { source: "touch" });
          b.classList.add("lit");
          window.setTimeout(() => b.classList.remove("lit"), 110);
        };
        /* Pointer first so a drummer can use several fingers at once; the
           click is the fallback for engines that deliver only clicks. */
        let pointered = 0;
        b.addEventListener("pointerdown", (e) => {
          pointered = window.performance.now();
          fire();
          if (e.preventDefault) e.preventDefault();
        });
        b.addEventListener("click", () => {
          if (window.performance.now() - pointered < 800) return;
          fire();
        });
      });

      root.querySelectorAll("[data-oct]").forEach((b) => {
        b.addEventListener("click", () => {
          KB.engine.ensureAudio();
          const next = clamp(st.octave + Number(b.dataset.oct), OCT_MIN, OCT_MAX);
          if (next === st.octave) return;
          st.octave = next;
          arpHeld.length = 0;
          KB.engine.panic("touch");
          KB.engine.panic("kbd");
          drawReads();
        });
      });

      root.querySelectorAll("[data-trans]").forEach((b) => {
        b.addEventListener("click", () => {
          KB.engine.ensureAudio();
          const next = clamp(st.transpose + Number(b.dataset.trans), TRANS_MIN, TRANS_MAX);
          if (next === st.transpose) return;
          /* Whatever is sounding was started at the old shift and would
             never be released at the new one. */
          KB.engine.panic("touch");
          KB.engine.panic("arp");
          st.transpose = next;
          drawReads();
        });
      });

      root.querySelectorAll(".tog").forEach((b) => {
        b.addEventListener("click", () => {
          KB.engine.ensureAudio();
          const which = b.dataset.tog;
          st[which] = !st[which];
          if (which === "sustain") {
            KB.engine.setSustain(st.sustain);
            KB.state.setToy("advanced", "sustain", st.sustain);
          }
          if (which === "arp" && !st.arp) {
            arpHeld.length = 0;
            KB.engine.panic("arp");
          }
          drawTogs();
          syncClock();
        });
      });

      root.querySelectorAll(".rhythm").forEach((b) => {
        b.addEventListener("click", () => {
          KB.engine.ensureAudio();
          st.rhythm = b.dataset.rhythm;
          drawTogs();
          syncClock();
        });
      });

      tempoRange.addEventListener("input", () => {
        st.tempo = clamp(Number(tempoRange.value) || 110, 40, 200);
        drawReads();
      });

      const masterRange = root.querySelector(".masterRange");
      masterRange.value = String(Math.round(KB.engine.getVolume() * 100));
      masterRange.addEventListener("input", () => {
        KB.engine.setVolume(Number(masterRange.value) / 100);
        KB.state.setMasterVolume(KB.engine.getVolume());
      });

      const recordButtons = {
        start: root.querySelector('[data-record="start"]'),
        stop: root.querySelector('[data-record="stop"]'),
        play: root.querySelector('[data-record="play"]'),
        clear: root.querySelector('[data-record="clear"]'),
      };
      const recordStatus = root.querySelector(".record-status");
      Object.keys(recordButtons).forEach((command) => recordButtons[command].addEventListener("click", () => {
        KB.engine.ensureAudio();
        if (command === "start") KB.recorder.start();
        else KB.recorder[command]();
      }));
      /* The same state vocabulary the young toys wear (owner, 2026-09-21): a
         finished song says so, a waiting take says what to press, and a take
         that just ended is not the same words as one never played. Studio keeps
         its four buttons — this is the advanced face. */
      const transport = root.querySelector(".transport");
      const unsubscribeRecorder = KB.recorder.onChange((snap) => {
        const recording = snap.mode === "recording";
        const playing = snap.mode === "playing";
        recordButtons.start.setAttribute("aria-pressed", String(recording));
        recordButtons.play.setAttribute("aria-pressed", String(playing));
        recordButtons.stop.disabled = !recording && !playing;
        recordButtons.play.disabled = !snap.hasTake || recording;
        recordButtons.clear.disabled = !snap.hasTake || recording || playing;
        transport.classList.toggle("is-recording", recording);
        transport.classList.toggle("is-playing", playing);
        transport.classList.toggle("is-finished", !recording && !playing && snap.hasTake && snap.ended === "finished");
        recordStatus.textContent = recording
          ? "Recording…"
          : playing
            ? "Playing…"
            : snap.hasTake
              ? (snap.ended === "finished" ? "Finished! press ▶ again" : "Your song — press ▶")
              : "Ready";
        if (recording) KB.guidance && KB.guidance.play("recording");
        else if (snap.hasTake && snap.ended === "stop") KB.guidance && KB.guidance.play("stopped");
        else if (snap.hasTake && snap.ended === "finished") KB.guidance && KB.guidance.play("finished");
        prevHadTake = snap.hasTake || recording;
      });

      KB.engine.setPatch(st.voice);
      KB.engine.setSustain(st.sustain);
      drawVoice();
      drawTogs();
      drawReads();
      buildBed();

      return {
        get sustain() { return st.sustain; },
        setSustain(on) {
          st.sustain = Boolean(on);
          KB.engine.setSustain(st.sustain);
          KB.state.setToy("advanced", "sustain", st.sustain);
          drawTogs();
        },
        destroy() {
          stopClock();
          unsubscribeRecorder();
          if (bed) bed.destroy();
          KB.engine.panic("arp");
          root.remove();
        },
      };
    },
  };
})();
