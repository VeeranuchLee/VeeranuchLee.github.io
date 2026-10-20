/*
 * Pattern Pegs — bead drawing and rule icons.
 *
 * Pure strings: no DOM, no storage. Loadable by Node so tools/check-sort-rules.mjs can
 * prove, for every generated Sort by Rule puzzle, that each rule icon carries exactly
 * ONE property.
 *
 * Why this file exists (owner, 2026-10-20, on Sort by Rule): "this is also confusing.
 * should i select circle or blue." The rule used to be drawn as a real bead — a blue
 * circle — and a bead always has a colour AND a shape, so the picture could never say
 * which one it meant. Now:
 *   - a COLOUR rule is a paint splash of that colour (a blob no child reads as a shape);
 *   - a SHAPE rule is a plain grey outline of that shape (no colour fill at all);
 *   - a rule that needs both shows both icons, joined by a "+".
 * Beads (the things a child picks) still carry both properties, as they must.
 */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory();
  } else {
    root.RuleIcons = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var COLOUR_HEX = {
    red: "#e86262",
    yellow: "#f4be4e",
    blue: "#5b8dd9",
    green: "#6fbf73",
    purple: "#9a6ad6",
  };

  var SHAPES_SVG = {
    circle: '<circle cx="50" cy="50" r="42"/>',
    square: '<rect x="12" y="12" width="76" height="76" rx="14"/>',
    triangle: '<polygon points="50,10 89,82 11,82" stroke-linejoin="round"/>',
    star: '<polygon points="50,7 61.8,35.5 92,38.2 69,58.6 75.6,88.3 50,72.8 24.4,88.3 31,58.6 8,38.2 38.2,35.5" stroke-linejoin="round"/>',
    heart: '<path d="M50 84 C22 62 12 44 22 30 C30 18 46 20 50 32 C54 20 70 18 78 30 C88 44 78 62 50 84 Z"/>',
  };

  // Neutral ink for shape outlines: the app's brown-grey text colour family, which is
  // not one of the five bead colours and so cannot be read as "the colour to pick".
  var OUTLINE_INK = "#7f726b";

  // An irregular paint splash with droplets. Deliberately lumpy on every side so it is
  // not a circle, heart or star — it is "this colour", nothing else.
  var SPLASH_PATH =
    "M50 16 C58 9 64 22 72 20 C84 17 88 30 82 40 C78 47 90 52 85 62 " +
    "C80 73 68 68 63 80 C58 90 44 88 41 79 C37 69 24 77 17 67 C10 57 22 51 18 42 " +
    "C14 31 27 26 33 22 C39 17 43 21 50 16 Z";
  var SPLASH_DROPS = [
    [90, 22, 5], [12, 26, 4], [90, 82, 4.5], [16, 84, 6], [52, 95, 3.5],
  ];

  function beadSVG(shape, colour, extra) {
    return (
      '<svg viewBox="0 0 100 100" role="img" aria-label="bead" xmlns="http://www.w3.org/2000/svg"' +
      (extra || "") + ">" +
      '<g fill="' + COLOUR_HEX[colour] + '" stroke="rgba(90,60,50,.25)" stroke-width="2">' +
      SHAPES_SVG[shape] +
      "</g>" +
      '<ellipse cx="38" cy="28" rx="15" ry="10" fill="rgba(255,255,255,.55)"/>' +
      "</svg>"
    );
  }

  function colourSplash(colour) {
    var hex = COLOUR_HEX[colour];
    var drops = SPLASH_DROPS.map(function (d) {
      return '<circle cx="' + d[0] + '" cy="' + d[1] + '" r="' + d[2] + '"/>';
    }).join("");
    return (
      '<svg class="rule-icon" data-attr="colour" data-val="' + colour + '" viewBox="0 0 100 100" ' +
      'role="img" aria-label="' + colour + ' colour" xmlns="http://www.w3.org/2000/svg">' +
      '<g fill="' + hex + '"><path d="' + SPLASH_PATH + '"/>' + drops + "</g>" +
      "</svg>"
    );
  }

  function shapeOutline(shape) {
    return (
      '<svg class="rule-icon" data-attr="shape" data-val="' + shape + '" viewBox="0 0 100 100" ' +
      'role="img" aria-label="' + shape + ' shape" xmlns="http://www.w3.org/2000/svg">' +
      '<g fill="#ffffff" stroke="' + OUTLINE_INK + '" stroke-width="6" stroke-dasharray="none">' +
      SHAPES_SVG[shape] +
      "</g></svg>"
    );
  }

  function iconFor(attr, val) {
    if (attr === "colour") return colourSplash(val);
    if (attr === "shape") return shapeOutline(val);
    throw new Error("unknown attribute " + attr);
  }

  // "NOT": a dark circle-and-slash drawn over the icon. Dark ink, not red, so the
  // sign itself cannot be mistaken for a colour rule.
  var NOT_MARK =
    '<svg class="not-mark" viewBox="0 0 100 100" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">' +
    '<g fill="none" stroke="#57443f" stroke-width="5" stroke-linecap="round">' +
    '<circle cx="50" cy="50" r="46"/><line x1="18" y1="82" x2="82" y2="18"/></g></svg>';

  /* A rule as a list of single-property icons — the shape the data check reads. */
  function ruleParts(rule) {
    function list(obj) {
      // colour first, then shape: the reading order is fixed so "+" always joins the
      // same way round.
      var out = [];
      ["colour", "shape"].forEach(function (a) { if (obj[a]) out.push({ attr: a, val: obj[a] }); });
      return out;
    }
    if (rule.bins) {
      return {
        kind: "bins",
        bins: Object.keys(rule.bins).map(function (k) { return { key: k, parts: list(rule.bins[k]) }; }),
      };
    }
    if (rule.exclude) return { kind: "exclude", parts: list(rule.exclude) };
    var parts = list(rule.include);
    return { kind: parts.length > 1 ? "and" : "include", parts: parts };
  }

  function partsHTML(parts) {
    return parts.map(function (p) {
      return '<span class="rule-chip">' + iconFor(p.attr, p.val) + "</span>";
    }).join('<span class="rule-plus" aria-hidden="true">+</span>');
  }

  /* The banner's inner HTML for include / and / exclude rules (bins are drawn by the
     app, as two tappable boxes, using binIconHTML). */
  function bannerHTML(rule) {
    var r = ruleParts(rule);
    if (r.kind === "include") {
      return '<span class="rule-text">Pick all</span>' + '<span class="rule-group">' + partsHTML(r.parts) + "</span>";
    }
    if (r.kind === "and") {
      return '<span class="rule-text">Pick</span>' + '<span class="rule-group both">' + partsHTML(r.parts) + "</span>";
    }
    if (r.kind === "exclude") {
      return (
        '<span class="rule-text">Pick all that are NOT</span>' +
        '<span class="rule-group"><span class="rule-chip not">' +
        iconFor(r.parts[0].attr, r.parts[0].val) + NOT_MARK + "</span></span>"
      );
    }
    return "";
  }

  function binIconHTML(binParts) { return partsHTML(binParts); }

  return {
    COLOUR_HEX: COLOUR_HEX,
    SHAPES_SVG: SHAPES_SVG,
    OUTLINE_INK: OUTLINE_INK,
    beadSVG: beadSVG,
    colourSplash: colourSplash,
    shapeOutline: shapeOutline,
    iconFor: iconFor,
    ruleParts: ruleParts,
    bannerHTML: bannerHTML,
    binIconHTML: binIconHTML,
  };
});
