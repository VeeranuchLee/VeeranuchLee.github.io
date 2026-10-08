/* THE PLAYROOM'S DATA — the one file to edit when the room or the games change.
 *
 * Owner, 2026-10-02: redesign the main hub "into an interactive illustrated playroom scene",
 * built so it is "easy to maintain as new hubs/apps are added". Then, the same day, the room
 * became CATEGORY-based (owner: "yes, let's do that!" to: "objects in the room are categories,
 * not apps; each opens a small hub page like music.html/homework.html; a new app joins a
 * category page as a card; new art only for a new category; a Toy box object opens the card
 * view (everything)"). So there are two lists, and no page names a game:
 *
 *   CATEGORIES — the category objects in the room, in keyboard order. `boxes` are
 *     [left, top, width, height] in percent of the picture, drawn round the object with a
 *     little padding; a fifth item "ellipse" makes that tap area the ellipse inside its box
 *     (the rug). One category may own several objects: one door, one keyboard stop, several
 *     tap areas. Boxes must NEVER overlap. Where a door goes is DERIVED, never written down:
 *       - exactly one app in the category -> straight to that app;
 *       - two or more                     -> its category page, ./<id>.html (a tiny shell
 *                                            page, rendered by playroom/category.js;
 *                                            tools/check-playroom.py fails if it is missing);
 *       - `view: "cards"`                 -> the toy box: opens the card view of every app.
 *   DIRECT DOORS — room objects that open one named app even when that app also belongs to a
 *     multi-app category. `app` is an APPS id; its name, description and href come from there.
 *   APPS — every game, in card-view order (index.html's card order). `category` places it in
 *     the room. Names and descriptions are the live hub card's, word for word. `tile` is the
 *     card art (./assets/ as on index.html; `cutout: true` for a sprite that is not a square
 *     tile); `tone` is the card's [edge, shadow, tint], from index.html's .c-* classes.
 *
 *   NEW APP: one APPS entry with an existing `category` — it appears in the card view and on
 *     that category's page (or turns a one-app category into a page). No new art.
 *   NEW CATEGORY: a CATEGORIES entry plus its object painted into a spare spot in the room
 *     (qa/playroom/ART-BRIEF.md notes the free spots), plus its ./<id>.html shell once it has two apps.
 *   NEW BACKGROUND: change `image` (and `width`/`height`); the boxes are percent, so a 4:3
 *     master of any size keeps them, provided each object stays inside its box.
 *
 * `base` resolves app links and ./assets/ tiles. Empty here: this sits beside index.html in
 * children-apps/, so the links are the live cards' own relative ones. The Test Hub copy sets it
 * to the live children-apps/ URL (site/children-apps/tools/stage-playroom.sh), so its doors open
 * the real apps. Category pages and ./playroom/ files always resolve beside the page itself.
 */
window.PLAYROOM = {
  base: "",
  image: "./playroom/scene.webp",
  width: 1448,
  height: 1086,
  /* The hub bed — the same file and the same remembered preference as index.html. */
  music: "./audio/hub-bed.m4a",

  categories: [
    { id: "maths", name: "Maths", tagline: "Numbers, shapes and sums",
      boxes: [[6.6, 11.8, 12.1, 16.6]] },                         /* the MAGIC MATH book, top shelf */
    { id: "words", name: "Words", tagline: "Read, spell and write",
      boxes: [[19.2, 15.2, 10.8, 15.9]] },                        /* the OUR WORD BOOK, top shelf */
    /* The row of spines on the middle shelf (Knowledge ... Sciences) is the Books hub. The open
       floor book is a separate, direct Our Animal Book door below. */
    { id: "books", name: "Books", tagline: "Picture books to read and hear",
      boxes: [[4.1, 32.4, 13.8, 16.6]] },
    { id: "homework", name: "การบ้านปิดเทอม", tagline: "Holiday homework",
      boxes: [[18.8, 33.6, 10.6, 15.2]] },                        /* the "20 MISSIONS" clipboard */
    /* The maze rug (with the toy car), plus the SHADOW MATCH box on the bottom shelf. */
    { id: "puzzles", name: "Puzzles", tagline: "Mazes and matching",
      boxes: [[23.5, 68.1, 51.1, 22.6, "ellipse"], [2.1, 52.9, 14.0, 11.6]] },
    /* The PERIODIC TABLE poster, plus the flags box on the bottom shelf. */
    { id: "science-world", name: "Science & World", tagline: "Elements, flags and the world",
      boxes: [[34.4, 19.2, 19.1, 18.8], [16.4, 51.7, 9.3, 11.6]] },
    { id: "art", name: "Art", tagline: "Colour and paint",
      boxes: [[34.5, 38.2, 15.2, 22.6]] },                        /* the easel with the rainbow */
    { id: "space", name: "Space", tagline: "Planets, moons and stars",
      boxes: [[58.0, 17.0, 14.8, 13.8], [57.2, 31.1, 11.0, 18.9]] }, /* the planet mobile + the telescope */
    { id: "play", name: "Play", tagline: "Games to play",
      boxes: [[73.2, 26.2, 23.8, 14.3]] },                        /* the window flower box + watering can */
    { id: "music", name: "Music", tagline: "Play, listen & explore",
      boxes: [[71.1, 42.5, 26.2, 18.4]] },                        /* the pink toy piano */
    { id: "dress-up", name: "Dress-up", tagline: "Nails, sparkles and style",
      boxes: [[75.3, 61.2, 23.5, 27.6]] },                        /* the vanity: mirror + nail polish */
    /* The toy blocks, bottom-left. The only object with no painted dot: a tap lifts it like the
       others and opens the card view of every game. */
    { id: "toy-box", name: "Toy box", tagline: "Every game", view: "cards",
      boxes: [[1.4, 82.4, 21.4, 17.6]] }
  ],

  /* Painted category rooms (owner art, 2026-10-04). `category.js` draws both the
     shaped object doors and the fallback Cards view from this one list. Points are
     percentages in the 1672x941 source picture; polygons follow the painted object,
     rather than turning a mostly-empty bounding box into a tap target. */
  categoryRooms: {
    books: {
      image: "./books-room/scene.webp",
      objects: [
        { id: "animal-book", name: "Our Animal Book", desc: "Tap an animal to hear its name",
          href: "../animal-book/", tile: "./assets/animal-book.webp", tone: ["#d97a16", "#a55606", "#fff1de"],
          points: [[7.0,80.0],[11.5,58.0],[18.0,42.0],[26.0,32.0],[38.5,33.0],[49.5,48.0],[49.8,85.5],[42.0,83.0],[31.0,78.0],[17.0,83.0]] },
        { id: "bookshelf", name: "Bookshelf", desc: "Picture books to read and listen to",
          href: "../reading/", tile: "./playroom/tiles/bookshelf.webp", cutout: true, tone: ["#5b64c9", "#3b429c", "#eceeff"],
          points: [[50.2,48.0],[58.0,38.0],[67.0,30.5],[79.0,30.0],[88.0,43.0],[94.0,62.0],[94.2,80.0],[82.0,82.0],[69.0,77.0],[58.0,83.0],[50.2,85.5]] }
      ]
    },
    homework: {
      image: "./homework-room/scene.webp",
      objects: [
        { id: "october-homework", name: "การบ้านปิดเทอม ป.2", desc: "October homework: 20 missions, 200 answers",
          href: "../magic-math/october-homework.html", tile: "./assets/october-homework.webp", tone: ["#5a6fd6", "#3a4aa0", "#e8ecff"],
          points: [[3.0,44.0],[8.5,40.0],[20.5,41.0],[23.5,48.5],[22.0,70.0],[18.0,73.0],[5.0,70.0],[2.5,63.0]] },
        { id: "read-write", name: "การบ้านปิดเทอม Read & Write", desc: "School-break homework: 20 days of reading and writing",
          href: "../read-write/", tile: "./assets/read-write.webp", tone: ["#2f8f9d", "#1d6570", "#e3f5f7"],
          points: [[40.0,49.0],[44.0,47.0],[58.5,47.5],[60.0,53.0],[59.0,68.0],[55.0,71.0],[41.0,69.0],[39.5,63.0]] }
      ],
      unmatched: ["C-A-T blocks", "checklist clipboard", "book rack"]
    },
    music: {
      image: "./music-room/scene.webp",
      objects: [
        { id: "classical-music", name: "Classical Music", desc: "Listen and guess",
          href: "../magic-math/classical-music.html", tile: "./assets/classical-music.webp", tone: ["#17a2b8", "#0d7c8e", "#e2f7fa"],
          points: [[3.3, 36.3], [6.5, 36.3], [9.6, 37.9], [24.0, 37.9], [24.0, 53.2], [20.7, 68.6], [13.3, 69.1], [11.7, 71.3], [2.2, 71.3], [2.5, 55.4]] },
        { id: "toy-keyboard", name: "Toy Keyboard", desc: "Play and make music",
          href: "../toy-keyboard/", tile: "./assets/toy-keyboard.webp", tone: ["#8b6bd9", "#6046aa", "#f0ebff"],
          points: [[28.4, 49.9], [49.9, 49.4], [49.9, 57.1], [47.5, 65.5], [44.4, 65.5], [44.1, 71.9], [33.6, 72.1], [33.3, 65.5], [29.3, 65.5], [28.4, 57.6]] },
        { id: "toy-guitar", name: "Toy Guitar", desc: "Strum, pick and drum",
          href: "../toy-guitar/", tile: "./assets/toy-guitar.webp", tone: ["#ef6b69", "#b9474b", "#fff0df"],
          points: [[58.0, 33.0], [62.0, 33.0], [63.8, 42.3], [69.4, 32.4], [72.7, 33.5], [71.2, 46.7], [72.1, 51.6], [76.8, 58.2], [76.8, 66.9], [69.4, 68.6], [63.2, 67.5], [54.3, 65.8], [53.9, 55.4], [57.0, 45.6]] },
        { id: "music-book", name: "Music Book", desc: "Explore songs",
          href: "../music-book/", tile: "./assets/music-book.webp", cutout: true, tone: ["#e280a6", "#b35279", "#fff0f6"],
          points: [[81.1, 41.7], [88.5, 38.4], [90.9, 40.6], [99.6, 42.3], [98.6, 64.2], [94.6, 69.1], [79.2, 68.6], [78.3, 62.0]] }
      ]
    },
    puzzles: {
      image: "./puzzles-room/scene.webp",
      objects: [
        { id: "shadow-matching", name: "Shadow Matching", desc: "Look at the picture, find its shadow",
          href: "../shadow-matching/", tile: "./assets/shadow-matching.webp", tone: ["#2d5d7c", "#1b3e56", "#e4eff6"],
          points: [[65.5,28.7],[82.3,28.8],[85.0,31.5],[84.8,56.5],[82.5,60.5],[64.0,59.0],[61.7,56.0]] },
        { id: "our-maze", name: "Our Maze", desc: "Walk the maze to the flag",
          href: "../our-maze/", tile: "./assets/our-maze.webp", tone: ["#8a6d46", "#5c462b", "#f9f1e4"],
          points: [[1.0,76.0],[5.0,68.0],[14.0,60.0],[28.0,55.0],[45.0,52.5],[62.0,53.5],[73.0,57.0],[77.0,63.0],[76.0,71.0],[79.0,78.0],[73.0,85.0],[61.0,90.5],[46.0,94.0],[31.0,92.5],[20.0,88.0],[11.0,86.0],[5.0,82.0]] }
      ],
      unmatched: ["jigsaw tray", "shape sorter", "dinosaur card", "teddy", "shelves"]
    },
    "science-world": {
      image: "./science-world-room/scene.webp",
      objects: [
        { id: "flags", name: "Flags", desc: "Explore flags and name the country",
          href: "../flags/", tile: "./assets/flags.webp", tone: ["#c0392b", "#8e2a20", "#fdecea"],
          points: [[23.0,34.5],[29.0,35.5],[34.0,40.5],[37.0,48.0],[38.0,57.0],[37.0,65.0],[34.0,71.5],[29.5,75.5],[23.5,76.0],[19.0,72.5],[16.5,71.0],[13.5,73.5],[5.0,73.5],[2.0,70.0],[2.0,59.0],[5.0,56.5],[7.0,60.0],[9.0,56.0],[11.0,60.5],[13.0,56.5],[15.5,61.0],[15.0,51.0],[14.0,45.0],[15.5,39.5],[19.0,36.0]] },
        { id: "periodic-table", name: "Periodic Table",
          desc: "Explore every element, then play Find It, Symbol Match and Atomic Number",
          href: "../periodic-table/", tile: "./assets/periodic-table.webp", tone: ["#6a3fa0", "#4a2b73", "#f1e8fa"],
          points: [[79.0,22.0],[100.0,18.5],[100.0,43.0],[97.0,43.5],[95.0,41.0],[93.0,44.0],[92.0,49.5],[79.0,51.0]] }
      ],
      unmatched: ["microscope", "test tubes", "map rug", "bunting", "rocket"]
    }
  },

  directDoors: [
    { id: "animal-book", app: "animal-book",
      boxes: [[54.6, 50.5, 16.4, 14.5]] }                       /* the open parrot-and-elephant book on the floor stand */
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
