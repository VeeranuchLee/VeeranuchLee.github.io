/* Chemistry hub music bed (owner request 2026-11-23: "we also need bg music for this hub too").
   AUDIO-DIRECTION.md decision 10a: a hub gets a bed, a game does not. The Chemistry home and the
   Chemistry Around Us picker are the hub; the periodic table and every scene are where the
   narrator speaks, so the bed fades out there and comes back on the hub.
   One switch, remembered per device. Never chosen = on. Browsers (iPad Safari above all) refuse
   to start audio before a tap, so playback begins on the first tap anywhere on a hub screen. */
(function () {
  "use strict";

  const app = document.getElementById("app");
  if (!app) return;

  const HUB_SCREENS = new Set(["home", "scenes"]);
  const PREF_KEY = "chemistry:music";
  const VOLUME = 0.2;
  const FADE_MS = 700;

  const bed = new Audio("./audio/hub-bed.m4a");
  bed.loop = true;
  bed.preload = "auto";
  bed.volume = 0;

  const NOTE = '<path d="M9 18V6l10-2v12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<circle cx="6.5" cy="18" r="2.6" fill="currentColor"/><circle cx="16.5" cy="16" r="2.6" fill="currentColor"/>';
  const SLASH = '<path d="M4 4l16 16" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>';

  const button = document.createElement("button");
  button.type = "button";
  button.className = "cg-back chem-music";
  document.body.append(button);

  let fadeTimer = null;
  let unlocked = false;

  function wanted() {
    try { return localStorage.getItem(PREF_KEY) !== "off"; } catch (_) { return true; }
  }
  function remember(on) {
    try { localStorage.setItem(PREF_KEY, on ? "on" : "off"); } catch (_) {}
  }
  function onHub() {
    return HUB_SCREENS.has(app.dataset.screen);
  }
  function drawButton() {
    const on = wanted();
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + NOTE + (on ? "" : SLASH) + "</svg>";
    button.setAttribute("aria-label", on ? "Stop music" : "Play music");
    button.setAttribute("aria-pressed", on ? "true" : "false");
    button.classList.toggle("music-off", !on);
    button.hidden = !onHub();
  }
  function fadeTo(target, thenPause) {
    window.clearInterval(fadeTimer);
    const from = bed.volume;
    const steps = Math.max(1, Math.round(FADE_MS / 50));
    let step = 0;
    fadeTimer = window.setInterval(() => {
      step += 1;
      bed.volume = Math.max(0, Math.min(1, from + (target - from) * (step / steps)));
      if (step >= steps) {
        window.clearInterval(fadeTimer);
        fadeTimer = null;
        if (thenPause) bed.pause();
      }
    }, 50);
  }
  function start() {
    if (!unlocked || !wanted() || !onHub()) return;
    if (!bed.paused) { fadeTo(VOLUME, false); return; }
    bed.volume = 0;
    bed.play().then(() => fadeTo(VOLUME, false)).catch(() => {});
  }
  function stop() {
    if (bed.paused) return;
    fadeTo(0, true);
  }
  function sync() {
    drawButton();
    if (onHub() && wanted()) start(); else stop();
  }

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    unlocked = true;
    remember(!wanted());
    sync();
  });

  // First tap anywhere unlocks audio. Capture phase, so a tap on a door that leaves the hub
  // still unlocks; sync() then decides whether this screen should be playing.
  document.addEventListener("pointerdown", () => {
    if (unlocked) return;
    unlocked = true;
    sync();
  }, { capture: true, passive: true });

  new MutationObserver(sync).observe(app, { attributes: true, attributeFilter: ["data-screen"] });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { window.clearInterval(fadeTimer); bed.pause(); } else sync();
  });

  drawButton();
})();
