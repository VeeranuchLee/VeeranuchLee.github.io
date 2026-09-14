/* Keyboard — the keys.
 *
 * This is the part of the old single-file app that must not change, so it
 * moved here whole rather than being rewritten: the keybed is GEOMETRY, not
 * elements. One computed layout answers "which key is under this point", and
 * that single answer serves taps and slides alike. Because of it, every
 * finger the screen reports is its own note, and a finger dragged across the
 * keys plays across them instead of holding the key it started on.
 *
 * Three layouts sit on the same machinery:
 *   piano  — white keys in a row, black keys straddling the boundaries and
 *            winning in the upper band, exactly where they are painted.
 *   flat   — one row of equal keys, no blacks. Rainbow's eight slabs.
 *   chunky — two rows that do not touch: broad slabs along the bottom and a
 *            short rear row of accidental buttons above them, with a dead
 *            band between. TOY-ARCHITECTURE calls for "five short raised
 *            accidental buttons in a clearly separate rear row", and a rear
 *            row drawn as a separate row has to be hit-tested as one.
 *
 * Two classes light a key, and they are not the same thing:
 *   .down  a finger (or a laptop key) is physically on it
 *   .on    a note is sounding for it — which includes notes the child is not
 *          touching at all, because a take playing back lights the keys it
 *          plays. That is why the lighting listens to the engine rather than
 *          being set inside the press handler.
 */
(function () {
  "use strict";

  const KB = (window.KB = window.KB || {});

  const IS_BLACK = new Set([1, 3, 6, 8, 10]);
  const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

  KB.noteName = (m) => NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
  KB.isBlack = (m) => IS_BLACK.has(((m % 12) + 12) % 12);

  /* The laptop rows. Not a child feature — the owner's laptop and this
     environment's checks both need a way to play without a touchscreen. */
  const ROW = "zsxdcvgbhnjm,l.;/";
  const ROW_UP = "q2w3er5t6y7ui9o0p";
  const FLAT_ROW = "asdfghjkl;'";

  KB.mountKeybed = function mountKeybed(el, opts) {
    const o = opts || {};
    const source = o.source || "touch";
    const flat = o.layout === "flat";
    const chunky = o.layout === "chunky";
    const blackBand = o.blackBand || 0.62;
    /* How wide a black key is drawn, as a fraction of a white one. The piano
       reference is 0.64 and does not move. A toy with few, wide keys can
       afford fatter accidentals, and needs them: on an 18-key bed 0.64 puts
       the black keys under this repository's 44px floor. */
    const blackWidth = o.blackWidth || 0.64;
    /* The rear row's share of the bed height, and the dead band under it. */
    const REAR_BAND = 0.34;
    const REAR_GAP = 0.07;
    const rearSet = new Set(o.rear || []);
    const offset = o.offset || (() => 0);
    const play = o.play || ((m) => KB.engine.noteOn(m, { source: source }));
    const release = o.release || ((m) => KB.engine.noteOff(m, { source: source }));
    const onInitialPress = typeof o.onInitialPress === "function" ? o.onInitialPress : null;
    const computerKeyboard = Boolean(o.computerKeyboard);

    /* The drawn notes. `piano` spans a MIDI range; `flat` takes the list it
       is given, which is how Rainbow gets eight notes of a scale and no
       sharps between them. */
    const notes = (flat || chunky)
      ? (o.notes || []).slice()
      : (() => {
          const all = [];
          for (let m = o.first; m <= o.last; m += 1) all.push(m);
          return all;
        })();
    /* `front` is the row along the bottom — the one a palm lands on. `rears`
       is the chunky layout's separate upper row and is empty everywhere
       else. */
    const front = flat ? notes
      : chunky ? notes.filter((m) => !rearSet.has(m))
      : notes.filter((m) => !IS_BLACK.has(m % 12));
    const rears = chunky ? notes.filter((m) => rearSet.has(m)) : [];
    const whites = front;

    let elements = {};       /* drawn midi -> element */
    let geom = null;
    let pointerDrove = 0;
    const pointers = new Map();
    const downKeys = new Set();

    /* A tap on a key with no pointer events behind it (engines that deliver
       clicks only — this repo's QA harness is one) still plays. Attached per
       key element, not delegated, because a synthetic click may not bubble;
       real pointer events keep the container-level path below. */
    function tapFallback(m) {
      return function () {
        if (window.performance.now() - pointerDrove < 800) return;
        KB.engine.ensureAudio();
        play(m + offset());
        /* The note call is deliberately before decorative work. A click-only
           browser still gets the same sound-first ordering as pointerdown. */
        if (onInitialPress) onInitialPress(m, elements[m]);
        window.setTimeout(() => release(m + offset()), 320);
      };
    }

    function build() {
      el.innerHTML = "";
      elements = {};
      const r = el.getBoundingClientRect();
      const pad = flat ? 6 : chunky ? 8 : 4;
      const gap = flat ? 6 : chunky ? 8 : 2;
      const w = (r.width - pad * 2) / whites.length;
      const h = r.height - pad * 2;
      /* The chunky bed's two rows and the untouchable band between them. */
      const rearH = chunky ? h * REAR_BAND : 0;
      const rearGap = chunky ? h * REAR_GAP : 0;
      const frontTop = pad + rearH + rearGap;
      const frontH = h - rearH - rearGap;
      const rw = rears.length ? (r.width - pad * 2) / rears.length : 0;

      whites.forEach((m, i) => {
        const d = document.createElement("div");
        d.className = (flat || chunky) ? "pad" : ("white" + (m % 12 === 0 ? (m === 60 ? " c c4" : " c") : ""));
        d.setAttribute("role", "button");
        d.setAttribute("aria-label", KB.noteName(m));
        Object.assign(d.style, {
          left: (pad + i * w + gap / 2) + "px",
          top: (chunky ? frontTop : pad) + "px",
          width: (w - gap) + "px",
          height: (chunky ? frontH : h) + "px",
        });
        if (o.decorate) o.decorate(d, m, i);
        d.addEventListener("click", tapFallback(m));
        el.appendChild(d);
        elements[m] = d;
      });

      rears.forEach((m, i) => {
        const d = document.createElement("div");
        d.className = "pad rear";
        d.setAttribute("role", "button");
        d.setAttribute("aria-label", KB.noteName(m));
        Object.assign(d.style, {
          left: (pad + i * rw + gap / 2) + "px",
          top: pad + "px",
          width: (rw - gap) + "px",
          height: rearH + "px",
        });
        if (o.decorate) o.decorate(d, m, -1);
        d.addEventListener("click", tapFallback(m));
        el.appendChild(d);
        elements[m] = d;
      });

      if (!flat && !chunky) {
        notes.forEach((m) => {
          if (!IS_BLACK.has(m % 12)) return;
          /* A black key sits over the boundary between the white key before
             it and the one after. Find that boundary from the white layout. */
          const prev = elements[m - 1];
          if (!prev) return;
          const px = parseFloat(prev.style.left) + parseFloat(prev.style.width) + gap / 2;
          const d = document.createElement("div");
          d.className = "black";
          d.setAttribute("role", "button");
          d.setAttribute("aria-label", KB.noteName(m));
          Object.assign(d.style, {
            left: (px - w * blackWidth / 2) + "px",
            top: pad + "px",
            width: (w * blackWidth) + "px",
            height: (h * blackBand) + "px",
          });
          if (o.decorate) o.decorate(d, m, -1);
          d.addEventListener("click", tapFallback(m));
          el.appendChild(d);
          elements[m] = d;
        });
      }

      geom = { pad: pad, w: w, h: h, rw: rw, rearH: rearH, rearGap: rearGap };
      /* Anything that was down is a stale picture after a rebuild. */
      downKeys.forEach((m) => { if (elements[m]) elements[m].classList.add("down"); });
      /* And anything still sounding has to be lit again: the elements are
         new and start unlit, so without this every note ringing through a
         resize or a rotation goes dark until its next event. The engine is
         asked rather than the press handlers because a sounding note may
         belong to nobody's finger at all — the pedal, a take, the star. */
      KB.engine.soundingNotes().forEach((m) => {
        const drawn = m - offset();
        if (elements[drawn]) elements[drawn].classList.add("on");
      });
    }

    /* Which key is under (x, y) in keybed coordinates. On a piano bed the
       upper band answers black where a black key exists; everything else
       answers white. This is the single source of truth for taps AND
       slides. */
    function keyAt(x, y) {
      if (!geom) return null;
      const { pad, w, h } = geom;

      /* The chunky bed answers its two rows separately, and answers nothing
         in the band between them. A rear button is a button: the point has
         to be inside the drawn one, not merely in its column, or the gaps
         between five wide buttons would silently play a note the child can
         see they did not touch. */
      if (chunky) {
        const yy = y - pad;
        if (yy < 0 || yy > h) return null;
        if (yy <= geom.rearH) {
          const ri = Math.floor((x - pad) / geom.rw);
          if (ri < 0 || ri >= rears.length) return null;
          const box = elements[rears[ri]];
          if (!box) return null;
          const bl = parseFloat(box.style.left);
          const bw = parseFloat(box.style.width);
          return (x >= bl && x <= bl + bw) ? rears[ri] : null;
        }
        if (yy < geom.rearH + geom.rearGap) return null;
        /* The front row is different, on purpose. Owner, 2026-09-13: the gaps between the big
           keys "play neighbor" — a palm landing between two slabs sounds one of them rather than
           nothing. That overrides TOY-ARCHITECTURE.md's "null outside every playable surface" for
           the front rows of the young toys. Do not "fix" it back to silent. */
        const fi = Math.floor((x - pad) / w);
        return (fi < 0 || fi >= whites.length) ? null : whites[fi];
      }

      const i = Math.floor((x - pad) / w);
      if (i < 0 || i >= whites.length) return null;
      const white = whites[i];
      if (flat) return white;
      if (y - pad > h * blackBand) return white;
      /* In the upper band a black key wins if the point is inside its box.
         Both neighbours are tested: a black key straddles the white-white
         boundary, so points in its left half floor to the white AFTER it —
         checking only that white's own next black misses them. Found by
         check-engine.mjs, not by eye. */
      for (const cand of [white + 1, white - 1]) {
        if (!IS_BLACK.has(((cand % 12) + 12) % 12)) continue;
        const box = elements[cand];
        if (!box) continue;
        const bl = parseFloat(box.style.left);
        const bw = parseFloat(box.style.width);
        if (x >= bl && x <= bl + bw) return cand;
      }
      return white;
    }

    function pressKey(m, initialPress) {
      if (downKeys.has(m)) return;
      downKeys.add(m);
      /* Audio wins the gesture. Pressed paint and particles follow only after
         noteOn has built the voice, so a slower iPad never waits on DOM work
         before it sounds. */
      play(m + offset());
      if (elements[m]) elements[m].classList.add("down");
      if (initialPress && onInitialPress) onInitialPress(m, elements[m]);
    }

    function releaseKey(m) {
      if (!downKeys.has(m)) return;
      downKeys.delete(m);
      if (elements[m]) elements[m].classList.remove("down");
      release(m + offset());
    }

    function bedPoint(event) {
      const box = el.getBoundingClientRect();
      return { x: event.clientX - box.left, y: event.clientY - box.top };
    }

    function onDown(e) {
      KB.engine.ensureAudio();
      pointerDrove = window.performance.now();   /* the pointer path owns this tap */
      if (typeof el.setPointerCapture === "function") el.setPointerCapture(e.pointerId);
      const { x, y } = bedPoint(e);
      const m = keyAt(x, y);
      if (m === null) return;
      pointers.set(e.pointerId, m);
      pressKey(m, true);
      if (e.preventDefault) e.preventDefault();
    }

    function onMove(e) {
      if (!pointers.has(e.pointerId)) return;
      const { x, y } = bedPoint(e);
      const m = keyAt(x, y);
      const was = pointers.get(e.pointerId);
      if (m !== null && m !== was) {
        /* A slide across the keys: the old note releases exactly as a lifted
           finger would, the new one strikes — glissando, chords-by-slide. */
        releaseKey(was);
        pointers.set(e.pointerId, m);
        /* A glissando still strikes its new note, but only the finger's first
           landing earns a burst. Dragging across the bed must not paint a
           continuous decorative trail. */
        pressKey(m, false);
      }
    }

    function onUp(e) {
      const m = pointers.get(e.pointerId);
      if (m === undefined) return;
      pointers.delete(e.pointerId);
      releaseKey(m);
    }

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);

    /* ------------------------------------------------ the laptop rows --- */

    const codeToNote = new Map();
    if (flat || chunky) {
      /* A bed built from a note list, not a range: the row walks the list.
         `front` first so the letters land on the slabs a child would use. */
      [...FLAT_ROW].forEach((c, i) => { if (front[i] !== undefined) codeToNote.set(c, front[i]); });
    } else {
      /* Anchor the rows on the C nearest the middle of whatever range this
         bed draws, so every toy's laptop row starts somewhere sensible
         instead of always at middle C. */
      const mid = Math.round((o.first + o.last) / 2);
      let home = mid - (((mid % 12) + 12) % 12);
      if (home + 16 > o.last) home -= 12;
      if (home < o.first) home = o.first;
      [...ROW].forEach((c, i) => { if (home + i <= o.last) codeToNote.set(c, home + i); });
      [...ROW_UP].forEach((c, i) => { if (home + 12 + i <= o.last) codeToNote.set(c, home + 12 + i); });
    }

    function onKeyDown(e) {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const m = codeToNote.get(String(e.key).toLowerCase());
      if (m === undefined) return;
      KB.engine.ensureAudio();
      pressKey(m, true);
      if (e.preventDefault) e.preventDefault();
    }
    function onKeyUp(e) {
      const m = codeToNote.get(String(e.key).toLowerCase());
      if (m !== undefined) releaseKey(m);
    }
    if (computerKeyboard) {
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);
    }

    /* ------------------------------------------------------ the lights --- */

    /* Every sounding note lights its key, whoever played it. A take playing
       back in another toy lights whichever of its notes this bed happens to
       draw and quietly skips the rest. */
    const unsubscribe = KB.engine.onNote((ev) => {
      if (ev.type === "hit") return;
      const drawn = ev.midi - offset();
      const node = elements[drawn];
      if (!node) return;
      node.classList.toggle("on", ev.type === "on");
    });

    /* Key geometry depends on the toy's final size; recompute on resize
       (iPad rotation included). Voices in flight are untouched — only the
       pictures move. */
    let ro = null;
    if (window.ResizeObserver) {
      ro = new window.ResizeObserver(build);
      ro.observe(el);
    }
    window.addEventListener("resize", build);

    build();

    return {
      el: el,
      notes: notes,
      keyAt: keyAt,
      relayout: build,
      element: (m) => elements[m],
      destroy() {
        el.removeEventListener("pointerdown", onDown);
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerup", onUp);
        el.removeEventListener("pointercancel", onUp);
        if (computerKeyboard) {
          window.removeEventListener("keydown", onKeyDown);
          window.removeEventListener("keyup", onKeyUp);
        }
        window.removeEventListener("resize", build);
        if (ro) ro.disconnect();
        unsubscribe();
        /* Whatever this bed was holding is let go. Nothing it played may
           outlive it into the next toy. */
        downKeys.forEach((m) => release(m + offset()));
        downKeys.clear();
        pointers.clear();
        KB.engine.panic(source);
      },
    };
  };
})();
