/*
 * Periodic Table voice boundary.
 *
 * Every Explore/game call goes through speak(audioId, text). A rendered AAC clip wins
 * when data/clips.json says audioReady is true; browser speech is the owner's temporary
 * build-time fallback only. No cloud call and no API key ever live in this app.
 */
(function () {
  "use strict";

  const clips = Object.create(null);
  let ready = false;
  let currentAudio = null;
  const scriptBase = document.currentScript && document.currentScript.src;

  function playBrowserVoice(text) {
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      return Promise.resolve(false);
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const british = voices.find((voice) => /^en-GB$/i.test(voice.lang));
    if (british) utterance.voice = british;
    utterance.lang = british ? "en-GB" : "en-GB";
    utterance.rate = 0.92;
    utterance.pitch = 1.03;
    utterance.volume = 1;
    return new Promise((resolve) => {
      utterance.onend = () => resolve(true);
      utterance.onerror = () => resolve(false);
      window.speechSynthesis.speak(utterance);
    });
  }

  function playRenderedClip(audioId, text) {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.removeAttribute("src");
      currentAudio = null;
    }
    const base = new URL("../audio/", scriptBase || document.baseURI);
    const source = new URL(`${encodeURIComponent(audioId)}.m4a`, base);
    const audio = new Audio(source.href);
    currentAudio = audio;
    return new Promise((resolve) => {
      audio.addEventListener("ended", () => resolve(true), { once: true });
      audio.addEventListener("error", () => {
        if (currentAudio === audio) currentAudio = null;
        resolve(playBrowserVoice(text));
      }, { once: true });
      const played = audio.play();
      if (played && typeof played.catch === "function") {
        played.catch(() => {
          if (currentAudio === audio) currentAudio = null;
          resolve(playBrowserVoice(text));
        });
      }
    });
  }

  async function speak(audioId, text) {
    const entry = clips[audioId];
    if (ready && entry && entry.audioReady === true) {
      return playRenderedClip(audioId, text);
    }
    return playBrowserVoice(text);
  }

  async function load() {
    try {
      const response = await fetch("./data/clips.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`clip map HTTP ${response.status}`);
      const data = await response.json();
      Object.assign(clips, data.clips || {});
      ready = true;
    } catch (_error) {
      // A missing map must not stop the child-facing temporary voice.
      ready = true;
    }
    return ready;
  }

  window.PeriodicVoice = Object.freeze({
    speak,
    load,
    isClipReady(audioId) {
      return Boolean(clips[audioId] && clips[audioId].audioReady === true);
    }
  });
})();
