(function (root) {
  "use strict";

  /* Silence used to hold the page's audio session in the playback category on iPad:
     mono 16-bit PCM at 8000 Hz, about half a second, all zero samples. */
  var KEEPER_RATE = 8000;
  var KEEPER_SECONDS = 0.5;

  function buildSilentWav() {
    var samples = Math.round(KEEPER_RATE * KEEPER_SECONDS);
    var dataLength = samples * 2;
    var buffer = new ArrayBuffer(44 + dataLength);
    var view = new DataView(buffer);
    function text(offset, value) {
      for (var i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
    }
    text(0, "RIFF");
    view.setUint32(4, 36 + dataLength, true);
    text(8, "WAVE");
    text(12, "fmt ");
    view.setUint32(16, 16, true);              /* size of this fmt chunk */
    view.setUint16(20, 1, true);               /* PCM */
    view.setUint16(22, 1, true);               /* mono */
    view.setUint32(24, KEEPER_RATE, true);     /* sample rate */
    view.setUint32(28, KEEPER_RATE * 2, true); /* byte rate: 1 channel * 2 bytes */
    view.setUint16(32, 2, true);               /* block align */
    view.setUint16(34, 16, true);              /* bits per sample */
    text(36, "data");
    view.setUint32(40, dataLength, true);
    /* ArrayBuffer starts zeroed, so the samples themselves need no writes. */
    return buffer;
  }

  function attach(getContext, onClosed, options) {
    if (typeof getContext !== "function") return function () {};
    var watched = null;
    var rebuilding = false;
    var keepPlayback = !!(options && options.keepPlayback === true);
    var keeper = null; /* { element, url } for the silent looping <audio>, once created */

    function rebuild() {
      if (rebuilding || typeof onClosed !== "function") return;
      rebuilding = true;
      try { onClosed(); } catch (_) { /* app recovery is best-effort */ }
      rebuilding = false;
    }

    function wake() {
      var ctx = null;
      try { ctx = getContext(); } catch (_) { return; }
      if (!ctx) return;
      if (ctx !== watched) {
        watched = ctx;
        try {
          if (typeof ctx.addEventListener === "function") ctx.addEventListener("statechange", wake);
          else {
            var previous = ctx.onstatechange;
            ctx.onstatechange = function (event) {
              try { if (typeof previous === "function") previous.call(ctx, event); } catch (_) {}
              wake();
            };
          }
        } catch (_) {}
      }
      if (ctx.state === "closed") { rebuild(); return; }
      if (ctx.state !== "running") {
        try {
          var result = ctx.resume();
          if (result && typeof result.catch === "function") result.catch(function () {});
        } catch (_) {}
      }
    }

    function startKeeper() {
      if (keeper) {
        /* Safari may have paused it (hidden tab); a play() outside a gesture is
           refused, so restart here from the next gesture. Never a second element. */
        if (keeper.element.paused) {
          try {
            var again = keeper.element.play();
            if (again && typeof again.catch === "function") again.catch(function () {});
          } catch (_) {}
        }
        return;
      }
      try {
        var url = URL.createObjectURL(new Blob([buildSilentWav()], { type: "audio/wav" }));
        var element = document.createElement("audio");
        keeper = { element: element, url: url };
        element.loop = true;
        element.preload = "auto";
        element.playsInline = true; /* also as an attribute, for old Safari */
        element.setAttribute("playsinline", "");
        element.src = url; /* never muted: a muted element does not hold the session */
        var played = element.play();
        if (played && typeof played.catch === "function") played.catch(function () {});
      } catch (_) { /* best-effort: without a keeper only Silent Mode suffers */ }
    }

    function stopKeeper() {
      var held = keeper;
      keeper = null;
      if (!held) return;
      try { held.element.pause(); } catch (_) {}
      try { held.element.removeAttribute("src"); } catch (_) {}
      try { URL.revokeObjectURL(held.url); } catch (_) {}
    }

    function gesture() {
      /* No navigator.audioSession.type change (owner 2026-10-20: crackly/hissy sound in
         every app, voice broken even in a private window). Switching the iPad session
         category after audio has started can change the hardware sample rate under a
         running AudioContext/media element; leave Safari's default session alone. */
      if (keepPlayback) startKeeper(); /* before wake(): the <audio> session must exist first */
      wake();
      try { Promise.resolve().then(wake); } catch (_) {}
    }

    function visible() {
      if (document.hidden) {
        /* Hidden: pause so nothing lingers in "Now Playing" and the battery is spared. */
        if (keeper) { try { keeper.element.pause(); } catch (_) {} }
        return;
      }
      /* Visible: no play() here, Safari refuses it outside a gesture; the next
         gesture restarts the keeper through startKeeper()'s paused branch. */
      wake();
    }
    var events = ["pointerdown", "touchend", "keydown"];
    events.forEach(function (name) { document.addEventListener(name, gesture, { capture: true, passive: true }); });
    document.addEventListener("visibilitychange", visible, { passive: true });
    root.addEventListener("pageshow", wake, { passive: true });
    wake();

    return function detach() {
      events.forEach(function (name) { document.removeEventListener(name, gesture, true); });
      document.removeEventListener("visibilitychange", visible);
      root.removeEventListener("pageshow", wake);
      stopKeeper();
    };
  }

  root.AudioWake = { attach: attach, _silentWav: buildSilentWav };
})(window);
