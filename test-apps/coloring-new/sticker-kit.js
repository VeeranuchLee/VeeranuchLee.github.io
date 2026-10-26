"use strict";

// The sticker kit shared by Blank Page and Stamping: the themed sticker packs
// (one list, read by both modes -- the art lives once, in assets/blank-stamps/),
// the letter and number tiles, and turn/mirror.
//
// Letter and number tiles, drawn once and shared by Blank Page stickers and
// Stamping stamps (owner request 2026-10-25: "with number and letter
// stamping"). One painter means a placed "A" looks the same in both modes, in
// the tray, on the page and in a saved picture: a rounded lemon-to-pink tile
// with a purple rim and a big purple glyph. Tiles are painted on a canvas (not
// an SVG image) so a stamp canvas that draws them can still be saved.
(() => {
  const SIZE = 256;
  const cache = new Map();

  function roundedRect(context, x, y, width, height, radius) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.arcTo(x + width, y, x + width, y + height, radius);
    context.arcTo(x + width, y + height, x, y + height, radius);
    context.arcTo(x, y + height, x, y, radius);
    context.arcTo(x, y, x + width, y, radius);
    context.closePath();
  }

  function paint(value) {
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const context = canvas.getContext("2d");
    const rim = Math.round(SIZE * 0.045);
    roundedRect(context, rim / 2, rim / 2, SIZE - rim, SIZE - rim, SIZE * 0.16);
    const fill = context.createLinearGradient(0, 0, 0, SIZE);
    fill.addColorStop(0, "#fff7ad");
    fill.addColorStop(1, "#ffb8dc");
    context.fillStyle = fill;
    context.fill();
    context.lineWidth = rim;
    context.strokeStyle = "#7453bd";
    context.stroke();

    // One character fills the tile; a cover such as "ABC" shrinks to fit.
    let fontSize = SIZE * 0.66;
    const font = (size) => `800 ${Math.round(size)}px ui-rounded, "SF Pro Rounded", system-ui, -apple-system, "Segoe UI", sans-serif`;
    context.font = font(fontSize);
    const maxWidth = SIZE * 0.78;
    const measured = context.measureText(value).width;
    if (measured > maxWidth) {
      fontSize *= maxWidth / measured;
      context.font = font(fontSize);
    }
    context.fillStyle = "#7148ad";
    context.textAlign = "center";
    context.textBaseline = "middle";
    // "middle" sits a little high for capitals and digits; nudge to optical centre.
    context.fillText(value, SIZE / 2, SIZE / 2 + fontSize * 0.04);
    return canvas;
  }

  function tileCanvas(value) {
    const key = String(value);
    if (!cache.has(key)) cache.set(key, { canvas: paint(key), url: null });
    return cache.get(key).canvas;
  }

  function tileUrl(value) {
    const key = String(value);
    tileCanvas(key);
    const entry = cache.get(key);
    if (!entry.url) entry.url = entry.canvas.toDataURL("image/png");
    return entry.url;
  }

  // Turn and mirror for a placed stamp or sticker (owner request 2026-10-25:
  // "add ability to rotate /mirror flip"). One tap turns it 45 degrees
  // clockwise: a single tap already shows a clear tilt (a rocket flying up and
  // away, a fish swimming downhill), four taps is upside down and eight is home
  // again. Quarter turns only offered "lying on its side", and a free-angle
  // dial is a fine-motor job for a 7-year-old. The mirror is applied first, in
  // the item's own frame, then the turn -- the same order on the stamp canvas
  // and in the sticker's CSS, so what is shown is what is saved.
  const TURN_STEP = 45;
  function normaliseTurn(value) {
    const number = Math.round(Number(value) / TURN_STEP) * TURN_STEP;
    return Number.isFinite(number) ? ((number % 360) + 360) % 360 : 0;
  }
  window.cgTurn = {
    STEP: TURN_STEP,
    normalise: normaliseTurn,
    next: (value) => normaliseTurn(normaliseTurn(value) + TURN_STEP),
    // The box a turned item really covers, so it can be kept whole on the page.
    box(width, height, degrees) {
      const radians = normaliseTurn(degrees) * Math.PI / 180;
      const cos = Math.abs(Math.cos(radians));
      const sin = Math.abs(Math.sin(radians));
      return { width: width * cos + height * sin, height: width * sin + height * cos };
    },
    css: (degrees, flip) => `rotate(${normaliseTurn(degrees)}deg)${flip ? " scaleX(-1)" : ""}`
  };

  // Blank Page's sticker packs, file assets/blank-stamps/<pack>-<name>.webp.
  // Stamping reuses these same files for its Space, Princess, Under the Sea
  // and Magic Castle groups (controller decision 2026-10-25: reuse before
  // making new art).
  window.cgStickerPacks = {
    space: ["ringed-planet", "smiling-star", "rocket", "crescent-moon", "blue-planet", "comet", "astronaut-helmet", "ufo", "sun", "constellation", "satellite", "telescope", "galaxy", "astronaut-boot", "lunar-rover"],
    princess: ["crown", "wand", "glass-slipper", "gown", "heart-tiara", "carriage", "royal-kitten", "rose-bouquet", "gem-heart", "mirror", "sceptre", "pearl-necklace", "hand-fan", "royal-pony", "teacup"],
    mermaid: ["tail", "seashell", "pearl-oyster", "seahorse", "coral", "starfish", "treasure-chest", "dolphin", "tropical-fish", "sea-crown", "trident", "hair-comb", "harp", "kelp", "anchor"],
    castle: ["rainbow-castle", "turret", "magic-door", "magic-key", "crystal-ball", "dragon", "unicorn", "potion", "spell-book", "crystal", "wizard-hat", "cauldron", "broom", "shield", "lantern"],
    animals: ["cat", "puppy", "bunny", "panda", "fox", "owl", "hamster", "turtle", "duck", "koala"],
    ocean: ["fish", "octopus", "whale", "starfish", "shell", "crab", "seahorse", "dolphin", "jellyfish", "coral"],
    food: ["cupcake", "ice-cream", "donut", "strawberry", "lollipop", "cookie", "cake-slice", "watermelon", "cherries", "candy"],
    vehicles: ["car", "bus", "train", "plane", "boat", "bicycle", "fire-truck", "tractor", "hot-air-balloon", "scooter"],
    home: ["teapot", "teacup-saucer", "tea-table", "sofa", "armchair", "pink-princess-castle", "cupcake-stand", "lamp", "cushion", "bookshelf"],
    dinosaurs: ["t-rex", "triceratops", "stegosaurus", "brachiosaurus", "diplodocus", "ankylosaurus", "pteranodon", "parasaurolophus", "spinosaurus", "velociraptor", "egg", "baby-hatching"],
    effects: ["campfire-flames", "candle-flame", "ice-block", "icicles", "snowflakes", "water-splash", "rain-drops", "waves", "bubbles", "smoke-puff", "steam-swirl", "sparkles", "lightning-bolt", "rainbow", "wind-swirl"]
  };

  window.cgTileArt = {
    LETTERS: [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"],
    NUMBERS: [..."0123456789"],
    canvas: tileCanvas,
    url: tileUrl,
    size: SIZE
  };
})();
