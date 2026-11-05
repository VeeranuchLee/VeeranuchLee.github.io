// Colour helpers and the gradient map (PLAN.md 4.3): a white/grey drawing keeps its
// shading and shine while its fabric takes any shade.

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

export function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function luminance([r, g, b]) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

// Shadows lean toward a soft plum rather than grey/black, so even a white gown's folds
// read as pretty rather than dirty.
const SHADOW = [74, 52, 104];
const WHITE = [255, 255, 255];

// A 256-entry lookup from source luminance to colour. The placeholder fabric is drawn
// with greys around 0.55 (outline) .. 0.82 (shade) .. 0.93 (base) .. 1 (shine).
export function buildLut(hex) {
  const base = hexToRgb(hex);
  const stops = [
    [0.0, mix(base, SHADOW, 0.85)],
    [0.55, mix(base, SHADOW, 0.55)],
    [0.82, mix(base, SHADOW, 0.16)],
    [0.93, base],
    [1.0, mix(base, WHITE, 0.62)],
  ];
  const lut = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const L = i / 255;
    let k = 0;
    while (k < stops.length - 2 && L > stops[k + 1][0]) k++;
    const [l0, c0] = stops[k], [l1, c1] = stops[k + 1];
    const c = mix(c0, c1, Math.max(0, Math.min(1, (L - l0) / (l1 - l0))));
    lut[i * 3] = c[0]; lut[i * 3 + 1] = c[1]; lut[i * 3 + 2] = c[2];
  }
  return lut;
}

// Colour for a pattern drawn over a fabric shade: light on deep shades, deeper on pale.
export function patternInk(hex, pattern) {
  const base = hexToRgb(hex);
  const L = luminance(base);
  if (pattern === 'glitter') return L > 0.8 ? mix(base, [190, 150, 220], 0.35) : mix(base, WHITE, 0.85);
  if (L > 0.78) return mix(base, SHADOW, 0.38);
  return mix(base, WHITE, 0.78);
}
