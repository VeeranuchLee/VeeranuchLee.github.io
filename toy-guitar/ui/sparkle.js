// Toy Guitar — the little bursts that answer a pluck or a pad, themed per
// guitar. Toy Keyboard's press effects (toy-keyboard-app/effects.js) are the
// model: small DOM islands where only transform and opacity animate, a
// per-string cooldown, a cap on simultaneous bursts, and every island removes
// itself. The parent Effects switch turns them off at once; they never hide a
// string and take no touches (the layer is pointer-events: none).

const THEMES = {
  first: { count: 6, rise: 70, spread: 46, kinds: ['star', 'dot', 'star', 'dot', 'star', 'dot'], colours: ['#ff6b6b', '#ff9f43', '#ffd43b', '#51cf66', '#4dabf7', '#9775fa'] },
  classical: { count: 4, rise: 64, spread: 34, kinds: ['note', 'dot', 'note', 'dot'], colours: ['#fff1c9', '#f1c27a', '#ffe9b0', '#e8c46a'] },
  acoustic: { count: 5, rise: 66, spread: 40, kinds: ['leaf', 'dot', 'leaf', 'note', 'dot'], colours: ['#ffd27a', '#ff9e4a', '#ffe7a8', '#f4b860', '#fff1c9'] },
  electric: { count: 5, rise: 72, spread: 48, kinds: ['zap', 'dot', 'streak', 'zap', 'dot'], colours: ['#7df3ff', '#ffe14d', '#ffffff', '#5fd8ff', '#ffd23f'] },
  rock: { count: 6, rise: 84, spread: 52, kinds: ['flame', 'spark', 'flame', 'spark', 'streak', 'spark'], colours: ['#ff4d3d', '#ffb02e', '#ffe14d', '#ff7a2e', '#ffffff', '#ff3d6e'] }
};
const SPREAD = [-0.72, -0.38, -0.12, 0.22, 0.52, 0.76];
const LIFT = [0.72, 0.94, 0.82, 1.08, 0.88, 1.0];
const MAX_BURSTS = 8;
const COOLDOWN = 140;

export function mountSparkles(layer, toyId, enabled) {
  const theme = THEMES[toyId] || THEMES.first;
  const active = new Set(); const timers = new Set(); const last = new Map();
  let seq = 0; let dead = false;
  layer.dataset.toy = toyId;

  function remove(group) { if (active.delete(group)) group.remove(); }

  function burst(x, y, key, lane = 0) {
    if (dead || !enabled()) return false;
    const t = performance.now();
    if (t - (last.get(key) ?? -Infinity) < COOLDOWN || active.size >= MAX_BURSTS) return false;
    last.set(key, t);
    const group = document.createElement('i');
    group.className = 'burst';
    group.style.left = x + 'px'; group.style.top = y + 'px';
    let longest = 0;
    for (let i = 0; i < theme.count; i += 1) {
      const p = document.createElement('b');
      const life = 480 + ((i * 47 + seq * 31) % 180); const delay = (i % 3) * 16;
      p.className = 'spark spark-' + theme.kinds[i];
      p.style.color = theme.colours[(i + lane + seq) % theme.colours.length];
      p.style.setProperty('--dx', (SPREAD[i] * theme.spread) + 'px');
      p.style.setProperty('--dy', (-LIFT[i] * theme.rise) + 'px');
      p.style.setProperty('--turn', ((i % 2 ? 1 : -1) * (40 + i * 18)) + 'deg');
      p.style.setProperty('--life', life + 'ms');
      p.style.setProperty('--delay', delay + 'ms');
      group.appendChild(p);
      longest = Math.max(longest, life + delay);
    }
    seq += 1;
    layer.appendChild(group); active.add(group);
    const timer = setTimeout(() => { timers.delete(timer); remove(group); }, longest + 40);
    timers.add(timer);
    return true;
  }

  // A burst rising off a pad (or any element) inside the toy.
  function burstAt(el, key) {
    const r = el.getBoundingClientRect(); const box = layer.getBoundingClientRect();
    return burst(r.left - box.left + r.width / 2, r.top - box.top + r.height * 0.3, key, 0);
  }

  function clear() {
    timers.forEach((t) => clearTimeout(t)); timers.clear();
    active.forEach((g) => g.remove()); active.clear();
  }

  return { burst, burstAt, clear, destroy() { dead = true; clear(); last.clear(); }, get active() { return active.size; } };
}
