/* THE PLAYROOM'S DATA — the one file to edit when the room changes.
 *
 * Owner, 2026-10-02: redesign the main hub "into an interactive illustrated playroom scene"
 * where "existing destinations become natural objects in the scene", built so it is "easy to
 * maintain as new hubs/apps are added". So the page itself knows nothing about any game: it
 * draws whatever is listed here.
 *
 *   - NEW BACKGROUND (e.g. the final text-free art replacing the concept): change `image`
 *     (and `width`/`height` if the master differs — the hotspots are in PERCENT, so a 4:3
 *     master of any resolution keeps them). Nothing else changes, provided the new art keeps
 *     each object where its box below says it is (qa/playroom/ART-BRIEF.md asks for exactly that).
 *   - NEW APP: one entry below plus its object in the art. `box` is [left, top, width, height]
 *     in percent of the image, drawn round the object's real extent with a little padding.
 *     Boxes must NEVER overlap — one tap must mean one destination. `shape: "ellipse"` makes
 *     the tap area the ellipse inside the box (the rug), so the box corners stay free.
 *   - Names and descriptions are the live hub card's, word for word, so the two hubs never
 *     disagree about what a game is called.
 *   - CARD VIEW (owner, 2026-10-02: "add the 'card view' too pls."). The same list also draws the
 *     familiar card grid, so a new entry appears in both views. `tile` is the card's art (from
 *     ./assets/, as on index.html; `cutout: true` for a sprite that is not a square tile) and
 *     `tone` is the card's [edge, shadow, tint] colours, copied from index.html's .c-* classes.
 *     Cards appear in list order, which is index.html's card order.
 *
 * `base` resolves every href. Empty here: the page sits beside index.html in children-apps/,
 * so the hrefs (and tiles) are the same relative ones the live cards use. The Test Hub copy sets it
 * to the live children-apps/ URL so its doors open the real apps and its cards show the live tiles (site/children-apps/tools/stage-playroom.sh).
 */
window.PLAYROOM = {
  base: "https://veeranuchlee.github.io/children-apps/",
  image: "./playroom/scene-concept.webp",
  width: 1448,
  height: 1086,
  /* The hub bed — the same file and the same remembered preference as index.html. */
  music: "https://veeranuchlee.github.io/children-apps/audio/hub-bed.m4a",
  destinations: [
    { id: "magic-math", name: "Magic Math", desc: "Pick your world and play",
      href: "../magic-math/", box: [6.3, 11, 12.5, 19.5],
      tile: "./assets/magic-math.webp", tone: ["#a855c7", "#7b3a90", "#f8e8fb"] },
    { id: "word-book", name: "Our Word Book", desc: "Read, spell, write and discover words",
      href: "../word-book/", box: [18.8, 13, 11.7, 18],
      tile: "./assets/our-word-book.webp", tone: ["#c2557d", "#93325a", "#ffe9f1"] },
    { id: "music", name: "Music", desc: "Play, listen & explore",
      href: "./music.html", box: [72.5, 42, 25.5, 18],
      tile: "./assets/music.webp", tone: ["#17a2b8", "#0d7c8e", "#e2f7fa"] },
    { id: "petal-kingdom", name: "Petal Kingdom", desc: "Pop the flowers and save the garden",
      href: "../flower-shooter/", box: [72.5, 22, 26.5, 19.5],
      tile: "./assets/petal-kingdom.webp", cutout: true, tone: ["#f0699b", "#c04574", "#ffecf3"] },
    { id: "little-color-garden", name: "Little Color Garden", desc: "Colour in the pictures",
      href: "../little-color-garden/", box: [34, 38.5, 19, 27.5],
      tile: "./assets/little-color-garden.png", tone: ["#34a853", "#217a3a", "#e6f7ea"] },
    { id: "space", name: "Space", desc: "A story about the planets, and a game about where they go",
      href: "../space/", box: [56, 13, 16.5, 37],
      tile: "./assets/space.png", tone: ["#26306e", "#151c46", "#e6eaff"] },
    { id: "animal-book", name: "Our Animal Book", desc: "Tap an animal to hear its name",
      href: "../animal-book/", box: [3.5, 31.5, 14.8, 18],
      tile: "./assets/animal-book.webp", tone: ["#d97a16", "#a55606", "#fff1de"] },
    { id: "shadow-matching", name: "Shadow Matching", desc: "Look at the picture, find its shadow",
      href: "../shadow-matching/", box: [1, 50.5, 15.8, 14.5],
      tile: "./assets/shadow-matching.webp", tone: ["#2d5d7c", "#1b3e56", "#e4eff6"] },
    /* The rug: the tap area is the ellipse inside the box. */
    { id: "our-maze", name: "Our Maze", desc: "Walk the maze to the flag",
      href: "../our-maze/", box: [22, 68, 54, 25], shape: "ellipse",
      tile: "./assets/our-maze.webp", tone: ["#8a6d46", "#5c462b", "#f9f1e4"] },
    { id: "flags", name: "Flags", desc: "Explore flags and name the country",
      href: "../flags/", box: [16.8, 50.5, 10.2, 14.5],
      tile: "./assets/flags.webp", tone: ["#c0392b", "#8e2a20", "#fdecea"] },
    { id: "periodic-table", name: "Periodic Table",
      desc: "Explore every element, then play Find It, Symbol Match and Atomic Number",
      href: "../periodic-table/", box: [34, 18.5, 20, 20],
      tile: "./assets/periodic-table.webp", tone: ["#6a3fa0", "#4a2b73", "#f1e8fa"] },
    /* Owner 2026-10-02: "I think for the 'homework' we should have the 'homework hub'" —
       one clipboard, one door, both homework apps behind it (homework.html). */
    { id: "homework", name: "การบ้านปิดเทอม", desc: "Holiday homework: October maths + Read & Write",
      href: "./homework.html", box: [18.3, 31.5, 12.2, 18],
      tile: "./assets/october-homework.webp", tone: ["#d9a514", "#a67c06", "#fff6d8"] },
    { id: "nail-salon", name: "Nail Salon", desc: "Paint, decorate and sparkle your own nails",
      href: "../nail-salon/", box: [76, 60.5, 24, 27.5],
      tile: "./assets/nail-salon.webp", tone: ["#c8558a", "#9a3a63", "#fce8f1"] }
  ]
};
