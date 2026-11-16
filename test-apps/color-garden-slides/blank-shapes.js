"use strict";

// Shapes, boxes and arrows for the Blank Page sticker picker (owner idea,
// 2026-11-15: "Check whether there are plenty of shapes, box styles and arrows
// like those in PowerPoint"). This file is only a list of drawings: each item
// is { id, group, label, viewBox, body }, where `body` is the inner markup of
// an SVG whose strokes and fills use `currentColor`. blank-page.js colours a
// shape at the moment it is placed by swapping `currentColor` for the palette's
// colour inside a data: URL image, so the drawings carry no colour of their own.
//
// House rules for every drawing: one friendly style (thick ~10-weight strokes,
// round caps and joins); boxes and plain shapes are OUTLINES with nothing
// inside, so a child can draw or write in them with the brush on the paper
// beneath; arrows are solid. No text, no emoji, no external references, and
// the viewBox is "0 0 200 200" or a wider box where the shape is naturally
// wide (arrows, banner, the wide boxes) -- blank-page.js reads the viewBox to
// give wide items a wider default size on the page.
window.BLANK_SHAPES = [
  // ---- Arrows (8): all point right; the child turns or flips them. -------
  {
    id: "arrow-straight", group: "arrows", label: "Straight arrow", viewBox: "0 0 320 200",
    body: '<rect x="14" y="83" width="208" height="34" rx="17" fill="currentColor"/>' +
      '<path d="M222 42L305 100L222 158Z" fill="currentColor" stroke="currentColor" stroke-width="10" stroke-linejoin="round"/>'
  },
  {
    id: "arrow-thin", group: "arrows", label: "Thin arrow", viewBox: "0 0 320 200",
    body: '<rect x="14" y="91" width="212" height="18" rx="9" fill="currentColor"/>' +
      '<path d="M224 58L302 100L224 142Z" fill="currentColor" stroke="currentColor" stroke-width="10" stroke-linejoin="round"/>'
  },
  {
    id: "arrow-block", group: "arrows", label: "Block arrow", viewBox: "0 0 320 200",
    body: '<path d="M20 56H198V26L306 100L198 174V144H20Z" fill="currentColor" stroke="currentColor" stroke-width="10" stroke-linejoin="round"/>'
  },
  {
    id: "arrow-double", group: "arrows", label: "Double arrow", viewBox: "0 0 320 200",
    body: '<rect x="58" y="83" width="204" height="34" rx="17" fill="currentColor"/>' +
      '<path d="M112 44L18 100L112 156Z" fill="currentColor" stroke="currentColor" stroke-width="10" stroke-linejoin="round"/>' +
      '<path d="M208 44L302 100L208 156Z" fill="currentColor" stroke="currentColor" stroke-width="10" stroke-linejoin="round"/>'
  },
  {
    id: "arrow-curved", group: "arrows", label: "Curved arrow", viewBox: "0 0 200 200",
    body: '<path d="M32 174C32 86 88 32 152 32" fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round"/>' +
      '<path d="M150 8L192 32L150 56Z" fill="currentColor" stroke="currentColor" stroke-width="10" stroke-linejoin="round"/>'
  },
  {
    id: "arrow-uturn", group: "arrows", label: "U-turn arrow", viewBox: "0 0 200 200",
    body: '<path d="M150 40H96C58 40 58 72 58 96C58 136 92 154 126 154" fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round"/>' +
      '<path d="M120 128L188 154L120 180Z" fill="currentColor" stroke="currentColor" stroke-width="10" stroke-linejoin="round"/>'
  },
  {
    id: "arrow-bent", group: "arrows", label: "Bent arrow", viewBox: "0 0 200 200",
    body: '<path d="M22 52H112L164 100" fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M147 117L190 126L181 83Z" fill="currentColor" stroke="currentColor" stroke-width="10" stroke-linejoin="round"/>'
  },
  {
    id: "arrow-wiggly", group: "arrows", label: "Wiggly arrow", viewBox: "0 0 320 200",
    body: '<path d="M14 100C44 54 78 54 106 100C134 148 170 100 206 100" fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round"/>' +
      '<path d="M204 72L298 100L204 128Z" fill="currentColor" stroke="currentColor" stroke-width="10" stroke-linejoin="round"/>'
  },

  // ---- Boxes (10): outlines with a transparent inside, ready to draw in. --
  {
    id: "box-rectangle", group: "boxes", label: "Rectangle", viewBox: "0 0 320 200",
    body: '<g fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"><rect x="22" y="22" width="276" height="156" rx="10"/></g>'
  },
  {
    id: "box-rounded", group: "boxes", label: "Rounded rectangle", viewBox: "0 0 320 200",
    body: '<g fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"><rect x="26" y="26" width="268" height="148" rx="44"/></g>'
  },
  {
    id: "box-oval", group: "boxes", label: "Oval", viewBox: "0 0 320 200",
    body: '<g fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="160" cy="100" rx="138" ry="76"/></g>'
  },
  {
    id: "box-cloud", group: "boxes", label: "Cloud", viewBox: "0 0 320 200",
    body: '<g fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M96 170C52 170 34 138 52 114C38 82 66 54 96 66C108 34 164 28 186 56C224 40 262 66 254 100C284 106 290 148 262 164C248 170 240 170 232 170Z"/></g>'
  },
  {
    id: "box-speech", group: "boxes", label: "Speech bubble", viewBox: "0 0 320 200",
    body: '<g fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M48 22H272C288 22 300 34 300 50V110C300 126 288 138 272 138H150L74 182C84 152 92 138 96 138H48C32 138 20 126 20 110V50C20 34 32 22 48 22Z"/></g>'
  },
  {
    id: "box-thought", group: "boxes", label: "Thought bubble", viewBox: "0 0 320 200",
    body: '<g fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">' +
      '<ellipse cx="160" cy="74" rx="128" ry="58"/><circle cx="100" cy="148" r="12"/><circle cx="70" cy="170" r="9"/><circle cx="48" cy="188" r="5"/></g>'
  },
  {
    id: "box-banner", group: "boxes", label: "Banner", viewBox: "0 0 320 200",
    body: '<g fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M46 48H274L240 100L274 152H46L80 100Z"/></g>'
  },
  {
    id: "box-tag", group: "boxes", label: "Label tag", viewBox: "0 0 320 200",
    body: '<g fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M40 64L188 30L292 100L188 170L40 136Z"/><circle cx="78" cy="100" r="13"/></g>'
  },
  {
    id: "box-frame", group: "boxes", label: "Picture frame", viewBox: "0 0 320 200",
    body: '<g fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="20" y="20" width="280" height="160" rx="12"/><rect x="46" y="44" width="228" height="112" rx="8"/></g>'
  },
  {
    id: "box-starburst", group: "boxes", label: "Starburst", viewBox: "0 0 200 200",
    body: '<g fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">' +
      '<polygon points="100,12 114,48 144,24 138,62 176,56 152,86 188,100 152,114 176,144 138,138 144,176 114,152 100,188 86,152 56,176 62,138 24,144 48,114 12,100 48,86 24,56 62,62 86,48"/></g>'
  },

  // ---- Shapes (6): plain outlines to frame a drawing or a word. ----------
  {
    id: "shape-circle", group: "shapes", label: "Circle", viewBox: "0 0 200 200",
    body: '<g fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"><circle cx="100" cy="100" r="82"/></g>'
  },
  {
    id: "shape-triangle", group: "shapes", label: "Triangle", viewBox: "0 0 200 200",
    body: '<g fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"><path d="M100 22L182 164H18Z"/></g>'
  },
  {
    id: "shape-square", group: "shapes", label: "Square", viewBox: "0 0 200 200",
    body: '<g fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"><rect x="24" y="24" width="152" height="152" rx="12"/></g>'
  },
  {
    id: "shape-star", group: "shapes", label: "Star", viewBox: "0 0 200 200",
    body: '<g fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M100 16L122 69L180 74L136 112L149 168L100 138L51 168L64 112L20 74L78 69Z"/></g>'
  },
  {
    id: "shape-heart", group: "shapes", label: "Heart", viewBox: "0 0 200 200",
    body: '<g fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M100 172C40 128 20 96 20 70C20 42 42 26 64 26C82 26 94 36 100 50C106 36 118 26 136 26C158 26 180 42 180 70C180 96 160 128 100 172Z"/></g>'
  },
  {
    id: "shape-diamond", group: "shapes", label: "Diamond", viewBox: "0 0 200 200",
    body: '<g fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"><path d="M100 16L184 100L100 184L16 100Z"/></g>'
  }
];
