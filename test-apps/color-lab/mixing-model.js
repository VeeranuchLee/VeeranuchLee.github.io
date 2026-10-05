(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.ColorLabMixing = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var PIGMENT_HEX = {
    red: "#DF493F",
    yellow: "#E8B92C",
    blue: "#3866BC",
  };

  function clamp(value, low, high) {
    return Math.max(low, Math.min(high, value));
  }

  function hexToSrgb(hex) {
    return [1, 3, 5].map(function (index) {
      return parseInt(hex.slice(index, index + 2), 16) / 255;
    });
  }

  function srgbToLinear(channel) {
    return channel <= 0.04045
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
  }

  function linearToSrgb(channel) {
    return channel <= 0.0031308
      ? 12.92 * channel
      : 1.055 * Math.pow(channel, 1 / 2.4) - 0.055;
  }

  function srgbToOklab(rgb) {
    var r = srgbToLinear(rgb[0]);
    var g = srgbToLinear(rgb[1]);
    var b = srgbToLinear(rgb[2]);
    var l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    var m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    var s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [
      0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
      1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
      0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    ];
  }

  function oklabToSrgb(lab) {
    var l = Math.pow(lab[0] + 0.3963377774 * lab[1] + 0.2158037573 * lab[2], 3);
    var m = Math.pow(lab[0] - 0.1055613458 * lab[1] - 0.0638541728 * lab[2], 3);
    var s = Math.pow(lab[0] - 0.0894841775 * lab[1] - 1.291485548 * lab[2], 3);
    return [
      linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
      linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
      linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
    ];
  }

  function rgbToHex(rgb) {
    return "#" + rgb.map(function (channel) {
      return Math.round(clamp(channel, 0, 1) * 255).toString(16).padStart(2, "0");
    }).join("").toUpperCase();
  }

  var pigments = {};
  Object.keys(PIGMENT_HEX).forEach(function (name) {
    pigments[name] = srgbToOklab(hexToSrgb(PIGMENT_HEX[name]));
  });

  function pairAmount(a, b, total) {
    return total ? Math.sqrt(a * b) / total : 0;
  }

  function mixDrops(input) {
    var drops = {
      red: Math.max(0, Number(input.red) || 0),
      yellow: Math.max(0, Number(input.yellow) || 0),
      blue: Math.max(0, Number(input.blue) || 0),
    };
    var total = drops.red + drops.yellow + drops.blue;
    if (!total) return null;

    var names = ["red", "yellow", "blue"];
    var lab = [0, 0, 0];
    names.forEach(function (name) {
      var weight = drops[name] / total;
      lab[0] += pigments[name][0] * weight;
      lab[1] += pigments[name][1] * weight;
      lab[2] += pigments[name][2] * weight;
    });

    // Pairwise biases give familiar R/Y/B directions. This is interaction design,
    // deliberately not a claim about physical pigments or how real paint works.
    var ry = pairAmount(drops.red, drops.yellow, total);
    var yb = pairAmount(drops.yellow, drops.blue, total);
    var rb = pairAmount(drops.red, drops.blue, total);
    lab[1] += 0.028 * ry - 0.18 * yb + 0.09 * rb;
    lab[2] += 0.07 * ry + 0.08 * yb - 0.11 * rb;

    var active = names.filter(function (name) { return drops[name] > 0; }).length;
    var maximumShare = Math.max(drops.red, drops.yellow, drops.blue) / total;
    var diversity = active === 1 ? 0 : (1 - maximumShare) / (1 - 1 / active);
    var chromaScale = clamp(1 - 0.10 * (active - 1) - 0.16 * diversity, 0.48, 1);
    lab[1] *= chromaScale;
    lab[2] *= chromaScale;

    var rgb = oklabToSrgb(lab);
    return {
      drops: drops,
      totalDrops: total,
      activePigments: active,
      chromaScale: chromaScale,
      oklab: lab,
      srgb: rgb.map(function (channel) { return clamp(channel, 0, 1); }),
      hex: rgbToHex(rgb),
    };
  }

  function distance(left, right) {
    return Math.hypot(left[0] - right[0], left[1] - right[1], left[2] - right[2]);
  }

  function nearestName(lab, colors) {
    if (!lab || !colors || !colors.length) return null;
    return colors.reduce(function (best, color) {
      var score = distance(lab, color.oklabCentroid);
      return !best || score < best.distance ? { color: color, distance: score } : best;
    }, null);
  }

  return {
    pigmentHex: PIGMENT_HEX,
    mixDrops: mixDrops,
    nearestName: nearestName,
    srgbToOklab: srgbToOklab,
    oklabToSrgb: oklabToSrgb,
  };
});
