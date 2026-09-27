/* Keyboard — the shell.
 *
 * Five toys and one ribbon. This file owns none of the sound: it mounts a
 * toy into the stage and gets out of the way. Every toy records — the owner
 * asked on 2026-09-14 for "simple record for all piano too" — and each one
 * mounts its own buttons over the one shared recorder.
 *
 * The rule that outranks everything else here (roadmap, 2026-08-28):
 * essentially zero UI between opening the app and playing. The ribbon is the
 * only thing that was allowed to come between a child and the keys, it is
 * two rows of chrome at the top, and whichever toy opens, its keys are
 * already under a finger — no menu, no splash, no "choose a keyboard" screen
 * standing in front of the instrument.
 *
 * The fixed order is the developmental progression settled by the owner on
 * 2026-09-12.
 */
(function () {
  "use strict";

  const KB = (window.KB = window.KB || {});

  const ORDER = ["baby", "preschool", "princess", "big-kid", "advanced"];
  const DEFAULT_TOY = "big-kid";

  const ribbon = document.getElementById("ribbon");
  const stage = document.getElementById("stage");
  const effectsToggle = document.getElementById("effects-toggle");

  let current = null;
  let currentId = null;

  /* ---------------------------------------------------- parent effects ---
     The button reports the EFFECTIVE value. An unset preference follows the
     operating system; the first tap makes that value explicit, so ON can
     intentionally override reduced motion as the owner requested. */
  const reducedMotion = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;

  function drawEffectsToggle() {
    const enabled = KB.state.effectsEnabled();
    effectsToggle.setAttribute("aria-pressed", String(enabled));
    effectsToggle.querySelector("strong").textContent = enabled ? "ON" : "OFF";
    effectsToggle.setAttribute("aria-label", "Key sparkle effects " + (enabled ? "on" : "off"));
  }

  function announceEffectsChange() {
    window.dispatchEvent(new window.Event("kb-effects-change"));
  }

  effectsToggle.addEventListener("click", () => {
    KB.state.setEffectsPreference(!KB.state.effectsEnabled());
    drawEffectsToggle();
    announceEffectsChange();
  });

  function onReducedMotionChange() {
    if (KB.state.getEffectsPreference() !== null) return;
    drawEffectsToggle();
    announceEffectsChange();
  }
  if (reducedMotion) {
    if (reducedMotion.addEventListener) reducedMotion.addEventListener("change", onReducedMotionChange);
    else if (reducedMotion.addListener) reducedMotion.addListener(onReducedMotionChange);
  }
  drawEffectsToggle();

  /* ------------------------------------------------------------ ribbon --- */

  ORDER.forEach((id) => {
    const toy = KB.toys[id];
    const b = document.createElement("button");
    b.type = "button";
    b.className = "toytab";
    b.setAttribute("role", "tab");
    b.setAttribute("aria-selected", "false");
    b.dataset.toy = id;
    b.setAttribute("aria-label", toy.label);
    /* The chip is a small drawing of the toy it opens, built in CSS from
       these two empty boxes and their pseudo-elements — eight bars under a
       handle, broad slabs with three buttons, an arch with a star, a long
       keyboard with an LCD, a long keyboard with a pad bank. One shared
       glyph recoloured five times would fail the rule the whole
       architecture turns on: with the colour taken away, the picture still
       has to say which keyboard this is. The name is on the button for the
       reader in the house and on aria-label for the screen reader. */
    b.innerHTML = '<span class="chip" aria-hidden="true"><i></i><b></b></span>' +
      '<span class="word">' + toy.word + '</span>';
    b.addEventListener("click", () => {
      /* A tab tap is a gesture, so it is also a chance to get the audio
         context iOS only hands out on one. */
      KB.engine.ensureAudio();
      switchTo(id);
    });
    ribbon.appendChild(b);
  });

  /* One mount attempt. Returns the toy's instance, or null when its mount
     threw. Nothing is committed in here — not the tab, not the body, not the
     saved choice — so a toy that dies part-way through its own mount cannot
     leave the shell believing in a toy that never mounted. */
  function tryMount(id) {
    KB.state.beginMount();
    try {
      const instance = KB.toys[id].mount(stage);
      return instance || null;
    } catch (err) {
      console.error("Keyboard: the '" + id + "' toy failed to mount", err);
      return null;
    }
  }

  function switchTo(id) {
    if (!KB.toys[id] || id === currentId) return;
    /* Stop input, playback and pedal-held voices before any destination DOM
       mounts. The AudioContext itself survives the switch for iOS. This
       sequence is unchanged and comes first, so a mount that throws fails
       into silence rather than into a toy that is still sounding. */
    /* The take is cleared here too, deliberately. Now that every toy can
       record, this is the moment a child's song disappears on a toy switch,
       and it stays because whether a take should survive the switch is the
       owner's open call. Making it survive is these two lines: keep stop(),
       drop clear(). */
    KB.recorder.stop();
    KB.recorder.clear();
    KB.engine.setSustain(false);
    KB.engine.pedalOff();
    KB.engine.allNotesOff();
    if (current) {
      current.destroy();
      current = null;
    }
    stage.textContent = "";
    /* Everything that names the mounted toy is committed only once something
       has actually mounted. Committing before the mount used to leave the
       `id === currentId` guard holding an id whose stage never filled: one
       throwing toy made its own tab dead and every later tap on it a no-op.
       Now a failed mount falls back to the default toy — and if the default
       is what failed, the stage stays empty with every tab still tappable —
       and the ribbon, the body and the saved choice name whatever really is
       on the stage. */
    let mountedId = id;
    let instance = tryMount(id);
    if (!instance && id !== DEFAULT_TOY) {
      mountedId = DEFAULT_TOY;
      instance = tryMount(DEFAULT_TOY);
    }
    if (!instance) mountedId = null;
    current = instance;
    currentId = mountedId;
    if (mountedId) {
      document.body.dataset.toy = mountedId;
      KB.state.commitMount(mountedId);
    } else {
      /* Nothing mounted: no tab may look selected and no toy may own the
         body. currentId is null, so no tab's id equals it and none is
         guarded off. */
      document.body.removeAttribute("data-toy");
    }
    ribbon.querySelectorAll(".toytab").forEach((b) => {
      b.setAttribute("aria-selected", String(Boolean(mountedId) && b.dataset.toy === mountedId));
    });
  }

  /* -------------------------------------------------- laptop shortcuts --- */

  /* Space is the pedal, on the toys that have one. The keybed owns the note
     rows; this is the one key that belongs to the toy rather than the keys. */
  window.addEventListener("keydown", (e) => {
    if (e.code !== "Space") return;
    const target = e.target;
    if (target && (target.tagName === "BUTTON" || target.tagName === "INPUT" || target.tagName === "A")) return;
    const toy = KB.toys[currentId];
    if (!current || !toy || toy.capabilities.sustain !== true) return;
    e.preventDefault();
    KB.engine.ensureAudio();
    current.setSustain(!current.sustain);
  });

  /* -------------------------------------------------------------- boot --- */

  /* The migration has already loaded in engine.js. Neutralise sustain and
     every held voice before applying any migrated toy state. */
  KB.engine.setSustain(false);
  KB.engine.pedalOff();
  KB.engine.allNotesOff();
  const saved = KB.state.getActiveToy();
  switchTo(ORDER.indexOf(saved) >= 0 ? saved : DEFAULT_TOY);

  /* NOT registering the service worker is deliberate and is not new. This
     app has shipped a service-worker.js since its first build and has never
     had a line of code that registers it — so it has never actually been
     offline, and its cache has never served a byte. Turning it on here would
     be an unasked-for behaviour change on top of a refactor, and a
     cache-first worker is exactly the thing that makes an edit look like it
     had no effect. Recorded in work_progress_and_other_discussion.md as a
     finding for the owner to decide on. */
})();
