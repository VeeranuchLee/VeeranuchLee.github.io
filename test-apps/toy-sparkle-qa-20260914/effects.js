/* Keyboard — key-press decoration for the three colourful toys.
 *
 * This helper is inert until Rainbow, First Piano or Princess mounts it.
 * Classic and Studio never call it, so they gain no layer, listener, timer or
 * per-press work. Bursts are small DOM islands clipped to the toy: only their
 * transform and opacity animate, and every island removes itself after its
 * longest particle has finished.
 */
(function () {
  "use strict";

  const KB = (window.KB = window.KB || {});
  const MAX_BURSTS = 8;
  const KEY_COOLDOWN = 180;
  const SPREAD = [-0.72, -0.38, -0.12, 0.22, 0.52, 0.76, -0.55];
  const LIFT = [0.72, 0.94, 0.82, 1.08, 0.88, 1.0, 0.78];
  const THEMES = {
    rainbow: {
      count: 6, rise: 104, spread: 58,
      kinds: ["star", "dot", "streak", "dot", "star", "dot"],
      colours: ["#ff6b7a", "#ffd35a", "#61e0ba", "#63c8ff", "#b58bff", "#ff8fc4"],
    },
    preschool: {
      count: 5, rise: 88, spread: 48,
      kinds: ["dot", "note", "dot", "shimmer", "dot"],
      colours: ["#fff5b8", "#ffffff", "#8edcff", "#ffd0e1", "#b9f2df"],
    },
    princess: {
      count: 7, rise: 190, spread: 70,
      kinds: ["diamond", "star", "dot", "diamond", "star", "dot", "shimmer"],
      colours: ["#ff8fc8", "#ffd86b", "#c6a2ff", "#fff2b6", "#f3a7dd", "#e4ccff", "#ffc65c"],
    },
  };

  KB.mountPressEffects = function mountPressEffects(root, name) {
    const theme = THEMES[name];
    if (!theme) throw new Error("Unknown key effect theme: " + name);

    const layer = document.createElement("div");
    layer.className = "press-effects effect-" + name;
    layer.setAttribute("aria-hidden", "true");
    layer.dataset.activeBursts = "0";
    layer.dataset.totalBursts = "0";
    root.appendChild(layer);

    const active = new Set();
    const timers = new Set();
    const lastByKey = new Map();
    let total = 0;
    let sequence = 0;
    let destroyed = false;

    function updateCount() { layer.dataset.activeBursts = String(active.size); }

    function removeBurst(burst) {
      if (!active.has(burst)) return;
      active.delete(burst);
      burst.remove();
      updateCount();
    }

    function clear() {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
      active.forEach((burst) => burst.remove());
      active.clear();
      updateCount();
    }

    function burst(midi, key) {
      if (destroyed || !key || !KB.state.effectsEnabled()) return false;
      const now = window.performance.now();
      if (now - (lastByKey.get(midi) || -Infinity) < KEY_COOLDOWN) return false;
      /* Eight simultaneous groups cover a whole palm. A ninth note still
         sounds and lights normally; only its decoration waits for room. */
      if (active.size >= MAX_BURSTS) return false;
      lastByKey.set(midi, now);

      const rootBox = root.getBoundingClientRect();
      const keyBox = key.getBoundingClientRect();
      const group = document.createElement("i");
      group.className = "key-burst";
      group.dataset.midi = String(midi);
      group.style.left = (keyBox.left - rootBox.left + keyBox.width / 2) + "px";
      group.style.top = (keyBox.top - rootBox.top + Math.min(24, keyBox.height * 0.12)) + "px";

      const keyColour = key.dataset.effectColour;
      const colourOffset = sequence % theme.colours.length;
      let longest = 0;
      for (let i = 0; i < theme.count; i += 1) {
        const particle = document.createElement("b");
        const life = 520 + ((i * 43 + sequence * 29) % 190);
        const delay = (i % 3) * 18;
        const dx = SPREAD[i] * theme.spread;
        const dy = -LIFT[i] * theme.rise;
        /* Princess crosses the centre line on the way up, making a small
           S-shaped swirl into the arch. The younger toys take a simpler arc. */
        const midX = name === "princess" ? -dx * 0.38 : dx * 0.45;
        const turnAmount = (i % 2 ? 1 : -1) * (38 + i * 19);
        particle.className = "press-particle particle-" + theme.kinds[i];
        particle.style.color = keyColour || theme.colours[(i + colourOffset) % theme.colours.length];
        particle.style.setProperty("--mx", midX + "px");
        particle.style.setProperty("--my", (dy * 0.52) + "px");
        particle.style.setProperty("--dx", dx + "px");
        particle.style.setProperty("--dy", dy + "px");
        particle.style.setProperty("--mid-turn", (-turnAmount * 0.35) + "deg");
        particle.style.setProperty("--turn", turnAmount + "deg");
        particle.style.setProperty("--life", life + "ms");
        particle.style.setProperty("--delay", delay + "ms");
        particle.style.setProperty("--end-scale", String(0.72 + (i % 3) * 0.13));
        group.appendChild(particle);
        longest = Math.max(longest, life + delay);
      }

      sequence += 1;
      total += 1;
      layer.dataset.totalBursts = String(total);
      layer.appendChild(group);
      active.add(group);
      updateCount();

      const timer = window.setTimeout(() => {
        timers.delete(timer);
        removeBurst(group);
      }, longest + 40);
      timers.add(timer);
      return true;
    }

    function onEffectsChange() {
      /* OFF is immediate: it prevents the next burst and removes any quiet
         tail already fading. Highlighting and voices live elsewhere. */
      if (!KB.state.effectsEnabled()) clear();
    }
    window.addEventListener("kb-effects-change", onEffectsChange);

    return {
      burst: burst,
      clear: clear,
      destroy() {
        destroyed = true;
        window.removeEventListener("kb-effects-change", onEffectsChange);
        clear();
        lastByKey.clear();
        layer.remove();
      },
    };
  };
})();
