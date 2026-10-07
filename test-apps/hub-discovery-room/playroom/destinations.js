/* THE PLAYROOM'S DATA — the one file to edit when the room or the games change.
 *
 * THE DISCOVERY ROOM (owner, 2026-10-07). The main menu is one painted room whose objects are
 * LANDMARKS — Math, Words & Books, Space, Nature ... — not apps, plus a Cards view that lists
 * every app flat. The owner keeps BOTH on purpose: the 7-year-old prefers the room, the 4-year-old
 * prefers the cards, so they are two equal ways in and neither is the "old" one. Both are drawn
 * from this file, so a link or a name cannot differ between them.
 *
 *   APPS — every destination, in card-view order (index.html's old card order). The Cards view
 *     is this list, minus entries with `cards: false`. `landmark` says where the app lives in the
 *     room. Names and descriptions are the hub cards', word for word. `tile` is the card art
 *     (./assets/ as on index.html; `cutout: true` for a sprite that is not a square tile); `tone`
 *     is the card's [edge, shadow, tint].
 *   LANDMARKS — the room, in keyboard order. `boxes` are [left, top, width, height] in percent of
 *     the picture, drawn round the whole object so a tap anywhere on it counts; a fifth item
 *     "ellipse" makes a tap area the ellipse inside its box. One landmark may own several
 *     objects: one door, one keyboard stop, several tap areas. Boxes must NEVER overlap. The
 *     geometry, the label and the state live here and never in the artwork: the picture carries
 *     no names, no hotspot graphics and no "coming soon".
 *       active: true   a landmark with something to open. Where it goes is DERIVED, never written:
 *                      - an explicit `hub: "./x.html"`  -> that category page (a landmark that
 *                                                          outgrew "opens the app" moves here
 *                                                          without the landmark moving);
 *                      - exactly one app                -> straight to that app;
 *                      - two or more apps               -> a picker panel in the room: the same
 *                                                          cards as the Cards view, one tap each;
 *                      - `view: "cards"`                -> the Cards view.
 *       active: false  a future area. It stays in the picture and in this list (so its box is
 *                      ready) but is NOT drawn at all: no link, no hover, no glow, no cursor, no
 *                      focus stop, no label. TO TURN ONE ON: set `active: true` and give an app
 *                      `landmark: "<id>"`. No repainting.
 *
 *   NEW APP: one APPS entry with a `landmark`. It appears in the Cards view and at that landmark
 *     (a one-app landmark becomes a picker by itself).
 *   NEW BACKGROUND: change `image` (and `width`/`height`); the boxes are percent, so a 4:3 master
 *     of any size keeps them, provided each object stays inside its box.
 *
 * `base` resolves app links and ./assets/ tiles. Empty here: this sits beside index.html in
 * children-apps/, so the links are the live cards' own relative ones. The Test Hub copy sets it
 * to the live children-apps/ URL (site/children-apps/tools/stage-playroom.sh), so its doors open
 * the real apps. Category pages and ./playroom/ files always resolve beside the page itself.
 */
window.PLAYROOM = {
  base: "https://veeranuchlee.github.io/children-apps/",
  /* The owner's Discovery Room, supplied 2026-10-07 (ChatGPT image; original kept outside the repo at
     ~/.local/state/children-games/owner-inputs/discovery-room-2026-10-07.png). It paints no title, label or hotspot. */
  image: "./playroom/discovery-room.webp",
  width: 1448,
  height: 1086,
  /* The hub bed — the same file and the same remembered preference as index.html. */
  music: "https://veeranuchlee.github.io/children-apps/audio/hub-bed.m4a",

  landmarks: [
    { id: "math", name: "Math", tagline: "Numbers, shapes and sums", active: true,
      boxes: [[20.2, 13.8, 13.2, 26.7]] },   /* the shelf of number blocks, the abacus and the 100-chart */
    { id: "words", name: "Words & Books", tagline: "Read, spell and write", active: true,
      boxes: [[0.0, 6.1, 18.1, 31.7], [0.8, 37.8, 19.3, 15.8]] },   /* the bookshelves and the armchair with the sleeping cat */
    { id: "space", name: "Space", tagline: "Planets, moons and stars", active: true,
      boxes: [[33.4, 11.6, 8.0, 13.1], [69.1, 0.0, 12.8, 12.9], [80.5, 14.7, 10.8, 17.0]] },   /* the planet mobile, the telescope and the rocket on the shelf */
    { id: "nature", name: "Nature", tagline: "Plants, animals and the outdoors", active: true,
      boxes: [[68.2, 20.1, 11.4, 10.9], [91.6, 12.9, 8.4, 19.3]] },   /* the terrarium with the butterfly, and the owl and flowers at the window */
    { id: "science", name: "Science & Invention", tagline: "Experiments, elements and inventions", active: true,
      boxes: [[55.0, 25.3, 13.1, 14.7]] },   /* the microscope, the flasks and the gear pegboard */
    { id: "world", name: "Our World", tagline: "Maps, flags and places", active: true,
      boxes: [[41.4, 15.5, 16.0, 9.2], [38.4, 24.7, 16.6, 12.5]] },   /* the world map, the globe and the landmark models */
    { id: "computer", name: "Computer", tagline: "Computers and coding", active: false,
      boxes: [[68.2, 32.2, 14.2, 22.3]] },   /* the desk with the monitor */
    { id: "art", name: "Art & Design", tagline: "Colour, paint and style", active: true,
      boxes: [[0.0, 53.9, 11.9, 17.5], [0.0, 71.4, 33.3, 19.3]] },   /* the easel with the rainbow and the art table */
    { id: "music", name: "Music", tagline: "Play, listen & explore", active: true,
      boxes: [[82.5, 35.5, 6.6, 20.3], [89.2, 38.2, 10.8, 12.0], [92.9, 50.2, 7.1, 9.2]] },   /* the piano with its sheet music and the two guitars */
    { id: "arcade", name: "Arcade", tagline: "Games to play", active: true,
      boxes: [[56.6, 55.2, 18.4, 21.6], [55.2, 76.9, 11.9, 12.4]] },   /* the star arcade cabinet and its stool */
    { id: "toy-box", name: "Toy Box", tagline: "Blocks, toys and building", active: false,
      boxes: [[21.1, 40.5, 15.0, 9.9], [67.2, 77.2, 8.3, 12.6]] },   /* the toy blocks and stacking toy on the low shelf, and the dinosaur */
    { id: "shop", name: "Shop / Business", tagline: "Shops, money and making things", active: false,
      boxes: [[75.5, 60.0, 24.5, 31.6]] }   /* the market stall with the striped awning and cash register */
  ],

  /* The painted category rooms' own titles (their pages are ./<id>.html, drawn by category.js).
     These pages are not landmarks: nothing in the room links to books, puzzles or science-world
     any more (their apps live at Words & Books, Arcade, Nature, Our World and Science & Invention),
     but the pages stay working, and the homework and music hubs are still reached from the cards. */
  hubPages: {
    books:           { name: "Books",           tagline: "Picture books to read and hear" },
    homework:        { name: "การบ้านปิดเทอม",   tagline: "Holiday homework" },
    music:           { name: "Music",           tagline: "Play, listen & explore" },
    puzzles:         { name: "Puzzles",         tagline: "Mazes and matching" },
    "science-world": { name: "Science & World", tagline: "Elements, flags and the world" }
  },

  /* Painted category rooms (owner art, 2026-10-04). `category.js` draws both the
     shaped object doors and the fallback Cards view from this one list. Points are
     percentages in the 1672x941 source picture; polygons follow the painted object,
     rather than turning a mostly-empty bounding box into a tap target. */
  categoryRooms: {
    books: {
      image: "./playroom/books-room/scene.webp",
      objects: [
        { app: "animal-book",
          points: [[7.0,80.0],[11.5,58.0],[18.0,42.0],[26.0,32.0],[38.5,33.0],[49.5,48.0],[49.8,85.5],[42.0,83.0],[31.0,78.0],[17.0,83.0]] },
        { app: "bookshelf",
          points: [[50.2,48.0],[58.0,38.0],[67.0,30.5],[79.0,30.0],[88.0,43.0],[94.0,62.0],[94.2,80.0],[82.0,82.0],[69.0,77.0],[58.0,83.0],[50.2,85.5]] }
      ]
    },
    homework: {
      image: "./playroom/homework-room/scene.webp",
      objects: [
        { app: "october-homework",
          points: [[3.0,44.0],[8.5,40.0],[20.5,41.0],[23.5,48.5],[22.0,70.0],[18.0,73.0],[5.0,70.0],[2.5,63.0]] },
        { app: "read-write",
          points: [[40.0,49.0],[44.0,47.0],[58.5,47.5],[60.0,53.0],[59.0,68.0],[55.0,71.0],[41.0,69.0],[39.5,63.0]] }
      ],
      unmatched: ["C-A-T blocks", "checklist clipboard", "book rack"]
    },
    music: {
      /* The owner's "Whimsical Pastel Music Studio" plate, supplied 2026-10-07 (4:3, 1448x1086;
         original kept outside the repo at ~/.local/state/children-games/owner-inputs/music-room-2026-10-07.png).
         Shipped as music-room/scene.webp (WebP, quality 85). `fit: true` = the page keeps the picture's own
         shape (width x height) and shows it whole, with a blurred copy of it filling the sides, so the
         percent polygons below can never drift off the art. `tag` is where the name bubble sits (a point
         on the floor beside the instrument, never over it).
         FUTURE objects carry `active: false`: geometry only, no href. category.js draws nothing for them
         (no link, cursor, focus, glow or label), so switching one on later is data only. */
      image: "./playroom/music-room/scene.webp",
      width: 1448, height: 1086, fit: true,
      objects: [
        { id: "classical-music", name: "Classical Music", desc: "Listen and guess",
          href: "../magic-math/classical-music.html", tile: "./assets/classical-music.webp", tone: ["#17a2b8", "#0d7c8e", "#e2f7fa"],
          tag: [22.8, 51.7],   /* the grand piano, music stand, violin and cello on the curtained stage */
          points: [[2.8, 6.4], [16.6, 5.7], [20.7, 16.1], [30.4, 17.5], [34.5, 13.8], [40.1, 17.0], [42.3, 27.6], [42.3, 44.2], [37.3, 48.8], [26.2, 50.5], [8.3, 46.5], [2.8, 36.8]] },
        { id: "toy-keyboard", name: "Toy Keyboard", desc: "Play and make music",
          href: "../toy-keyboard/", tile: "./assets/toy-keyboard.webp", tone: ["#8b6bd9", "#6046aa", "#f0ebff"],
          tag: [78.7, 50.5],   /* the purple keyboard with its stool, speaker and headphones */
          points: [[61.5, 31.8], [64.9, 27.6], [83.6, 24.9], [88.4, 24.1], [92.9, 24.1], [96.1, 29.0], [96.3, 43.3], [92.5, 45.3], [82.9, 45.6], [69.1, 47.4], [61.5, 40.5]] },
        { id: "music-book", name: "Music Book", desc: "Explore songs",
          href: "../music-book/", tile: "./assets/music-book.webp", cutout: true, tone: ["#e280a6", "#b35279", "#fff0f6"],
          tag: [27.6, 86.6],   /* the giant open song book and the cushions round it */
          points: [[0.0, 67.7], [7.6, 63.5], [11.4, 54.8], [21.4, 53.9], [26.2, 58.0], [35.9, 58.9], [41.4, 63.5], [47.7, 68.1], [48.3, 76.4], [44.2, 81.0], [41.4, 79.2], [29.0, 82.4], [15.9, 83.3], [7.6, 83.3], [0.7, 83.3]] },
        { id: "toy-guitar", name: "Toy Guitar", desc: "Strum, pick and drum",
          href: "../toy-guitar/", tile: "./assets/toy-guitar.webp", tone: ["#e08a00", "#a85f00", "#fff1d6"],
          tag: [73.2, 86.6],   /* the red guitar with its stool, amp and pick box */
          points: [[76.0, 58.9], [81.5, 58.9], [86.0, 46.5], [87.4, 46.0], [89.1, 47.9], [89.1, 63.5], [96.3, 64.0], [96.3, 76.4], [99.1, 77.3], [99.1, 85.2], [91.2, 85.2], [88.4, 83.3], [78.0, 83.3], [75.3, 81.0], [68.0, 80.1], [67.7, 68.1], [73.9, 67.2]] },
        /* FUTURE, inert: painted into the room, nothing to open yet. */
        { id: "drums", name: "Drums", active: false, points: [[97.0, 15.7], [100.0, 15.7], [100.0, 30.8], [97.0, 30.8]] },            /* the djembe and drums on the top-right shelf */
        { id: "microphone", name: "Microphone", active: false, points: [[97.0, 50.2], [100.0, 50.2], [100.0, 72.7], [97.0, 72.7]] },   /* the microphone stand at the right edge */
        { id: "record-player", name: "Record Player", active: false, points: [[89.8, 51.6], [96.1, 51.6], [96.1, 62.6], [89.8, 62.6]] }
      ]
    },
    puzzles: {
      image: "./playroom/puzzles-room/scene.webp",
      objects: [
        { app: "shadow-matching",
          points: [[65.5,28.7],[82.3,28.8],[85.0,31.5],[84.8,56.5],[82.5,60.5],[64.0,59.0],[61.7,56.0]] },
        { app: "our-maze",
          points: [[1.0,76.0],[5.0,68.0],[14.0,60.0],[28.0,55.0],[45.0,52.5],[62.0,53.5],[73.0,57.0],[77.0,63.0],[76.0,71.0],[79.0,78.0],[73.0,85.0],[61.0,90.5],[46.0,94.0],[31.0,92.5],[20.0,88.0],[11.0,86.0],[5.0,82.0]] }
      ],
      unmatched: ["jigsaw tray", "shape sorter", "dinosaur card", "teddy", "shelves"]
    },
    "science-world": {
      image: "./playroom/science-world-room/scene.webp",
      objects: [
        { app: "flags",
          points: [[23.0,34.5],[29.0,35.5],[34.0,40.5],[37.0,48.0],[38.0,57.0],[37.0,65.0],[34.0,71.5],[29.5,75.5],[23.5,76.0],[19.0,72.5],[16.5,71.0],[13.5,73.5],[5.0,73.5],[2.0,70.0],[2.0,59.0],[5.0,56.5],[7.0,60.0],[9.0,56.0],[11.0,60.5],[13.0,56.5],[15.5,61.0],[15.0,51.0],[14.0,45.0],[15.5,39.5],[19.0,36.0]] },
        { app: "periodic-table",
          points: [[79.0,22.0],[100.0,18.5],[100.0,43.0],[97.0,43.5],[95.0,41.0],[93.0,44.0],[92.0,49.5],[79.0,51.0]] }
      ],
      unmatched: ["microscope", "test tubes", "map rug", "bunting", "rocket"]
    }
  },

  apps: [
    { id: "magic-math", landmark: "math", name: "Magic Math", desc: "Pick your world and play",
      href: "../magic-math/", tile: "./assets/magic-math.webp", tone: ["#a855c7", "#7b3a90", "#f8e8fb"] },
    { id: "word-book", landmark: "words", name: "Our Word Book", desc: "Read, spell, write and discover words",
      href: "../word-book/", tile: "./assets/our-word-book.webp", tone: ["#c2557d", "#93325a", "#ffe9f1"] },
    { id: "music", landmark: "music", name: "Music", desc: "Play, listen & explore",
      href: "https://veeranuchlee.github.io/test-apps/hub-discovery-room/music.html", tile: "./assets/music.webp", tone: ["#17a2b8", "#0d7c8e", "#e2f7fa"] },
    { id: "petal-kingdom", landmark: "arcade", name: "Petal Kingdom", desc: "Pop the flowers and save the garden",
      href: "../flower-shooter/", tile: "./assets/petal-kingdom.webp", cutout: true, tone: ["#f0699b", "#c04574", "#ffecf3"] },
    { id: "little-color-garden", landmark: "art", name: "Little Color Garden", desc: "Colour in the pictures",
      href: "../little-color-garden/", tile: "./assets/little-color-garden.png", tone: ["#34a853", "#217a3a", "#e6f7ea"] },
    { id: "space", landmark: "space", name: "Space", desc: "A story about the planets, and a game about where they go",
      href: "https://veeranuchlee.github.io/test-apps/space-hub/", tile: "./assets/space.png", tone: ["#26306e", "#151c46", "#e6eaff"] },
    { id: "animal-book", landmark: "nature", name: "Our Animal Book", desc: "Tap an animal to hear its name",
      href: "../animal-book/", tile: "./assets/animal-book.webp", tone: ["#d97a16", "#a55606", "#fff1de"] },
    /* Live at /reading/ (Reading Tree) but not on the card hub; it joins the book corner. */
    { id: "bookshelf", landmark: "words", name: "Bookshelf", desc: "Picture books to read and listen to",
      href: "../reading/", tile: "./playroom/tiles/bookshelf.webp", cutout: true, tone: ["#5b64c9", "#3b429c", "#eceeff"] },
    { id: "shadow-matching", landmark: "arcade", name: "Shadow Matching", desc: "Look at the picture, find its shadow",
      href: "../shadow-matching/", tile: "./assets/shadow-matching.webp", tone: ["#2d5d7c", "#1b3e56", "#e4eff6"] },
    { id: "our-maze", landmark: "arcade", name: "Our Maze", desc: "Walk the maze to the flag",
      href: "../our-maze/", tile: "./assets/our-maze.webp", tone: ["#8a6d46", "#5c462b", "#f9f1e4"] },
    { id: "flags", landmark: "world", name: "Flags", desc: "Explore flags and name the country",
      href: "../flags/", tile: "./assets/flags.webp", tone: ["#c0392b", "#8e2a20", "#fdecea"] },
    { id: "periodic-table", landmark: "science", name: "Periodic Table",
      desc: "Explore every element, then play Find It, Symbol Match and Atomic Number",
      href: "../periodic-table/", tile: "./assets/periodic-table.webp", tone: ["#6a3fa0", "#4a2b73", "#f1e8fa"] },
    { id: "homework", name: "การบ้านปิดเทอม", desc: "Holiday homework: October maths + Read & Write",
      href: "https://veeranuchlee.github.io/test-apps/hub-discovery-room/homework.html", tile: "./assets/october-homework.webp", tone: ["#d9a514", "#a67c06", "#fff6d8"] },
    { id: "nail-salon", landmark: "art", name: "Nail Salon", desc: "Paint, decorate and sparkle your own nails",
      href: "../nail-salon/", tile: "./assets/nail-salon.webp", tone: ["#c8558a", "#9a3a63", "#fce8f1"] },
    /* Room-only entries (cards: false): the two items inside the homework hub, each at the
       landmark where it belongs. The Cards view still shows the one "การบ้านปิดเทอม" card above,
       exactly as before, so these are never drawn there. */
    { id: "october-homework", landmark: "math", cards: false, name: "การบ้านปิดเทอม ป.2", desc: "October homework: 20 missions, 200 answers",
      href: "../magic-math/october-homework.html", tile: "./assets/october-homework.webp", tone: ["#5a6fd6", "#3a4aa0", "#e8ecff"] },
    { id: "read-write", landmark: "words", cards: false, name: "การบ้านปิดเทอม Read & Write", desc: "School-break homework: 20 days of reading and writing",
      href: "../read-write/", tile: "./assets/read-write.webp", tone: ["#2f8f9d", "#1d6570", "#e3f5f7"] }
  ]
};

/* Shared by the room, the card view and the category pages: where each thing lives. */
window.PLAYROOM.lib = (function (R) {
  function abs(u, base) { try { return new URL(u, base || document.baseURI).href; } catch (e) { return u; } }
  /* An app link or an ./assets/ tile: against `base` (the live site, from the Test Hub copy). */
  function app(u) { return u.indexOf('./playroom/') === 0 ? abs(u) : abs(u, R.base); }
  function appById(id) { return R.apps.filter(function (a) { return a.id === id; })[0]; }
  /* The apps a landmark holds, in APPS order. */
  function appsAt(id) { return R.apps.filter(function (a) { return a.landmark === id; }); }
  /* The Cards view: every app except the room-only entries. */
  function cards() { return R.apps.filter(function (a) { return a.cards !== false; }); }
  /* Where a landmark's door goes. null = no door at all (an inactive landmark is not drawn). */
  function door(l) {
    if (!l.active) return null;
    if (l.view === 'cards') return { kind: 'cards', href: '#cards' };
    var list = appsAt(l.id);
    if (l.hub) return { kind: 'page', href: abs(l.hub), apps: list };
    if (list.length === 1) return { kind: 'app', href: app(list[0].href), app: list[0] };
    if (list.length > 1) return { kind: 'picker', apps: list };
    return null;
  }
  return { abs: abs, app: app, appById: appById, appsAt: appsAt, cards: cards, door: door };
})(window.PLAYROOM);

/* The painted category rooms borrow an object's words, link and tile from APPS (`app: "<id>"`),
   keeping only their own shape (`points`) — the one place a name or a link lives. */
(function (R) {
  Object.keys(R.categoryRooms || {}).forEach(function (id) {
    var room = R.categoryRooms[id];
    room.objects = room.objects.map(function (o) {
      var a = o.app && R.lib.appById(o.app);
      if (!a) return o;
      var m = { id: a.id, name: a.name, desc: a.desc, href: a.href, tile: a.tile, tone: a.tone, points: o.points };
      if (a.cutout) m.cutout = true;
      return m;
    });
  });
})(window.PLAYROOM);
