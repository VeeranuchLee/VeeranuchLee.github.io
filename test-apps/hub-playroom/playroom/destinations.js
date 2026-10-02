/* THE PLAYROOM'S DATA — the one file to edit when the room or the games change.
 *
 * Owner, 2026-10-02: redesign the main hub "into an interactive illustrated playroom scene",
 * built so it is "easy to maintain as new hubs/apps are added". Then, the same day, the room
 * became CATEGORY-based (owner: "yes, let's do that!" to: "objects in the room are categories,
 * not apps; each opens a small hub page like music.html/homework.html; a new app joins a
 * category page as a card; new art only for a new category; a Toy box object opens the card
 * view (everything)"). So there are two lists, and no page names a game:
 *
 *   CATEGORIES — the objects in the room, in keyboard order. `boxes` are
 *     [left, top, width, height] in percent of the picture, drawn round the object with a
 *     little padding; a fifth item "ellipse" makes that tap area the ellipse inside its box
 *     (the rug). One category may own several objects: one door, one keyboard stop, several
 *     tap areas. Boxes must NEVER overlap. Where a door goes is DERIVED, never written down:
 *       - exactly one app in the category -> straight to that app;
 *       - two or more                     -> its category page, ./<id>.html (a tiny shell
 *                                            page, rendered by playroom/category.js;
 *                                            tools/check-playroom.py fails if it is missing);
 *       - `view: "cards"`                 -> the toy box: opens the card view of every app.
 *   APPS — every game, in card-view order (index.html's card order). `category` places it in
 *     the room. Names and descriptions are the live hub card's, word for word. `tile` is the
 *     card art (./assets/ as on index.html; `cutout: true` for a sprite that is not a square
 *     tile); `tone` is the card's [edge, shadow, tint], from index.html's .c-* classes.
 *
 *   NEW APP: one APPS entry with an existing `category` — it appears in the card view and on
 *     that category's page (or turns a one-app category into a page). No new art.
 *   NEW CATEGORY: a CATEGORIES entry plus its object painted into a spare spot in the room
 *     (qa/playroom/ART-BRIEF.md keeps two free), plus its ./<id>.html shell once it has two apps.
 *   NEW BACKGROUND: change `image` (and `width`/`height`); the boxes are percent, so a 4:3
 *     master of any size keeps them, provided each object stays inside its box.
 *
 * `base` resolves app links and ./assets/ tiles. Empty here: this sits beside index.html in
 * children-apps/, so the links are the live cards' own relative ones. The Test Hub copy sets it
 * to the live children-apps/ URL (site/children-apps/tools/stage-playroom.sh), so its doors open
 * the real apps. Category pages and ./playroom/ files always resolve beside the page itself.
 */
window.PLAYROOM = {
  base: "https://veeranuchlee.github.io/children-apps/",
  image: "./playroom/scene-concept.webp",
  width: 1448,
  height: 1086,
  /* The hub bed — the same file and the same remembered preference as index.html. */
  music: "https://veeranuchlee.github.io/children-apps/audio/hub-bed.m4a",

  categories: [
    { id: "maths", name: "Maths", tagline: "Numbers, shapes and sums",
      boxes: [[6.3, 11, 12.5, 19.5]] },                           /* the purple book, top shelf */
    { id: "words", name: "Words", tagline: "Read, spell and write",
      boxes: [[18.8, 13, 11.7, 18]] },                            /* the pink book, top shelf */
    /* Two objects, one door: the open animal picture book on the floor stand, and (in the
       concept only) the tiger book on the middle shelf, which carries a painted dot and must
       not be a dead button. Owner 2026-10-02 on the staged page: "pls check all button, i
       can't get this one to work" — that was the floor book, before it had a door. */
    { id: "books", name: "Stories & Books", tagline: "Picture books to read and hear",
      boxes: [[53.5, 50.5, 18.5, 14.5], [3.5, 31.5, 14.8, 18]] },
    { id: "homework", name: "การบ้านปิดเทอม", tagline: "Holiday homework",
      boxes: [[18.3, 31.5, 12.2, 18]] },                          /* the clipboard */
    /* The maze rug, plus the Shadow Match box on the bottom shelf (it carries a painted dot). */
    { id: "puzzles", name: "Puzzles", tagline: "Mazes and matching",
      boxes: [[22, 68, 54, 25, "ellipse"], [1, 50.5, 15.8, 14.5]] },
    /* The periodic-table poster, plus the flags box on the bottom shelf (painted dot). */
    { id: "science-world", name: "Science & World", tagline: "Elements, flags and the world",
      boxes: [[34, 18.5, 20, 20], [16.8, 50.5, 10.2, 14.5]] },
    { id: "art", name: "Art", tagline: "Colour and paint",
      boxes: [[34, 38.5, 19, 27.5]] },                            /* the easel */
    { id: "space", name: "Space", tagline: "Planets, moons and stars",
      boxes: [[56, 13, 16.5, 37]] },                              /* the mobile + telescope */
    { id: "play", name: "Play", tagline: "Games to play",
      boxes: [[72.5, 22, 26.5, 19.5]] },                          /* the window flowers */
    { id: "music", name: "Music", tagline: "Play, listen & explore",
      boxes: [[72.5, 42, 25.5, 18]] },                            /* the toy piano */
    { id: "dress-up", name: "Dress-up", tagline: "Nails, sparkles and style",
      boxes: [[76, 60.5, 24, 27.5]] },                            /* the vanity */
    { id: "toy-box", name: "Toy box", tagline: "Every game", view: "cards",
      boxes: [[0.5, 82, 21.5, 18]] }                              /* the toy blocks (a toy chest in the final art) */
  ],

  apps: [
    { id: "magic-math", category: "maths", name: "Magic Math", desc: "Pick your world and play",
      href: "../magic-math/", tile: "./assets/magic-math.webp", tone: ["#a855c7", "#7b3a90", "#f8e8fb"] },
    { id: "word-book", category: "words", name: "Our Word Book", desc: "Read, spell, write and discover words",
      href: "../word-book/", tile: "./assets/our-word-book.webp", tone: ["#c2557d", "#93325a", "#ffe9f1"] },
    { id: "music", category: "music", name: "Music", desc: "Play, listen & explore",
      href: "./music.html", tile: "./assets/music.webp", tone: ["#17a2b8", "#0d7c8e", "#e2f7fa"] },
    { id: "petal-kingdom", category: "play", name: "Petal Kingdom", desc: "Pop the flowers and save the garden",
      href: "../flower-shooter/", tile: "./assets/petal-kingdom.webp", cutout: true, tone: ["#f0699b", "#c04574", "#ffecf3"] },
    { id: "little-color-garden", category: "art", name: "Little Color Garden", desc: "Colour in the pictures",
      href: "../little-color-garden/", tile: "./assets/little-color-garden.png", tone: ["#34a853", "#217a3a", "#e6f7ea"] },
    { id: "space", category: "space", name: "Space", desc: "A story about the planets, and a game about where they go",
      href: "../space/", tile: "./assets/space.png", tone: ["#26306e", "#151c46", "#e6eaff"] },
    { id: "animal-book", category: "books", name: "Our Animal Book", desc: "Tap an animal to hear its name",
      href: "../animal-book/", tile: "./assets/animal-book.webp", tone: ["#d97a16", "#a55606", "#fff1de"] },
    /* Live at /reading/ (Reading Tree) but not on the card hub; it joins the book corner. */
    { id: "bookshelf", category: "books", name: "Bookshelf", desc: "Picture books to read and listen to",
      href: "../reading/", tile: "./playroom/tiles/bookshelf.webp", cutout: true, tone: ["#5b64c9", "#3b429c", "#eceeff"] },
    { id: "shadow-matching", category: "puzzles", name: "Shadow Matching", desc: "Look at the picture, find its shadow",
      href: "../shadow-matching/", tile: "./assets/shadow-matching.webp", tone: ["#2d5d7c", "#1b3e56", "#e4eff6"] },
    { id: "our-maze", category: "puzzles", name: "Our Maze", desc: "Walk the maze to the flag",
      href: "../our-maze/", tile: "./assets/our-maze.webp", tone: ["#8a6d46", "#5c462b", "#f9f1e4"] },
    { id: "flags", category: "science-world", name: "Flags", desc: "Explore flags and name the country",
      href: "../flags/", tile: "./assets/flags.webp", tone: ["#c0392b", "#8e2a20", "#fdecea"] },
    { id: "periodic-table", category: "science-world", name: "Periodic Table",
      desc: "Explore every element, then play Find It, Symbol Match and Atomic Number",
      href: "../periodic-table/", tile: "./assets/periodic-table.webp", tone: ["#6a3fa0", "#4a2b73", "#f1e8fa"] },
    { id: "homework", category: "homework", name: "การบ้านปิดเทอม", desc: "Holiday homework: October maths + Read & Write",
      href: "./homework.html", tile: "./assets/october-homework.webp", tone: ["#d9a514", "#a67c06", "#fff6d8"] },
    { id: "nail-salon", category: "dress-up", name: "Nail Salon", desc: "Paint, decorate and sparkle your own nails",
      href: "../nail-salon/", tile: "./assets/nail-salon.webp", tone: ["#c8558a", "#9a3a63", "#fce8f1"] }
  ]
};

/* Shared by the room, the card view and the category pages: where each thing lives. */
window.PLAYROOM.lib = (function (R) {
  function abs(u, base) { try { return new URL(u, base || document.baseURI).href; } catch (e) { return u; } }
  /* An app link or an ./assets/ tile: against `base` (the live site, from the Test Hub copy). */
  function app(u) { return u.indexOf('./playroom/') === 0 ? abs(u) : abs(u, R.base); }
  function appsIn(id) { return R.apps.filter(function (a) { return a.category === id; }); }
  /* Where a category's door goes: one app -> the app, several -> its page, toy box -> cards. */
  function door(c) {
    if (c.view === 'cards') return { kind: 'cards', href: '#cards' };
    var list = appsIn(c.id);
    if (list.length === 1) return { kind: 'app', href: app(list[0].href), app: list[0] };
    return { kind: 'page', href: abs('./' + c.id + '.html'), apps: list };
  }
  return { abs: abs, app: app, appsIn: appsIn, door: door };
})(window.PLAYROOM);
