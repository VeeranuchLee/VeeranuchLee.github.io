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
 *
 * `base` resolves every href. Empty here: the page sits beside index.html in children-apps/,
 * so the hrefs are the same relative ones the live cards use. The Test Hub copy sets it to the
 * live children-apps/ URL so its doors open the real apps (site/children-apps/tools/stage-playroom.sh).
 */
window.PLAYROOM = {
  base: "https://veeranuchlee.github.io/children-apps/",
  image: "./playroom/scene-concept.webp",
  width: 1448,
  height: 1086,
  /* The hub bed — the same file and the same remembered preference as index.html. */
  music: "https://veeranuchlee.github.io/children-apps/audio/hub-bed.m4a",
  destinations: [
    /* The bookshelf, top row */
    { id: "magic-math", name: "Magic Math", desc: "Pick your world and play",
      href: "../magic-math/", box: [6.3, 11, 12.5, 19.5] },
    { id: "word-book", name: "Our Word Book", desc: "Read, spell, write and discover words",
      href: "../word-book/", box: [18.8, 13, 11.7, 18] },
    /* The bookshelf, middle row */
    { id: "animal-book", name: "Our Animal Book", desc: "Tap an animal to hear its name",
      href: "../animal-book/", box: [3.5, 31.5, 14.8, 18] },
    /* Owner 2026-10-02: "I think for the 'homework' we should have the 'homework hub'" —
       one clipboard, one door, both homework apps behind it (homework.html). */
    { id: "homework", name: "การบ้านปิดเทอม", desc: "Holiday homework: maths and reading & writing",
      href: "./homework.html", box: [18.3, 31.5, 12.2, 18] },
    /* The bookshelf, bottom row */
    { id: "shadow-matching", name: "Shadow Matching", desc: "Look at the picture, find its shadow",
      href: "../shadow-matching/", box: [1, 50.5, 15.8, 14.5] },
    { id: "flags", name: "Flags", desc: "Explore flags and name the country",
      href: "../flags/", box: [16.8, 50.5, 10.2, 14.5] },
    /* The wall and the middle of the room */
    { id: "periodic-table", name: "Periodic Table",
      desc: "Explore every element, then play Find It, Symbol Match and Atomic Number",
      href: "../periodic-table/", box: [34, 18.5, 20, 20] },
    { id: "little-color-garden", name: "Little Color Garden", desc: "Colour in the pictures",
      href: "../little-color-garden/", box: [34, 38.5, 19, 27.5] },
    { id: "space", name: "Space", desc: "A story about the planets, and a game about where they go",
      href: "../space/", box: [56, 13, 16.5, 37] },
    /* The window and the piano */
    { id: "petal-kingdom", name: "Petal Kingdom", desc: "Pop the flowers and save the garden",
      href: "../flower-shooter/", box: [72.5, 22, 26.5, 19.5] },
    { id: "music", name: "Music", desc: "Play, listen & explore",
      href: "./music.html", box: [72.5, 42, 25.5, 18] },
    /* The floor */
    { id: "our-maze", name: "Our Maze", desc: "Walk the maze to the flag",
      href: "../our-maze/", box: [22, 68, 54, 25], shape: "ellipse" },
    { id: "nail-salon", name: "Nail Salon", desc: "Paint, decorate and sparkle your own nails",
      href: "../nail-salon/", box: [76, 60.5, 24, 27.5] }
  ]
};
