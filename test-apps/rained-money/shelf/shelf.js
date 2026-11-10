/*
 * Reading Tree Bookshelf. Reads books/index.json and each book's book.json, and stands every
 * shelf object on wooden shelves as a face-out cover with its title beneath. Rows hold 3 objects
 * in portrait, 4 in landscape, and the page scrolls vertically as the library grows.
 *
 * Two kinds of shelf object (owner, 2026-10-06):
 *   - a BOOK: one cover. Tap -> reader/?book=<id>.
 *   - a BOOK SET: one boxed set -- an open case with three real member covers standing inside
 *     it and the book count on its front. Tap -> ?set=<id>, the set's own shelf, which shows
 *     every member book face-out (optionally under plain section headings). One level only:
 *     a set never holds a set, and a heading is never a link.
 * A book opened from a set carries &set=<id> into the reader, so the reader's back button
 * returns to that set's shelf, and the set's back arrow returns here.
 *
 * books/index.json (format 2; format 1 still works):
 *   books   [{id, title, draft?, next?}]   every book, the only place a book is listed
 *   sets    [{id, title, books: [ids], previewBooks?: [ids], sections?: [{title, books}], colour?}]
 *   shelf   [{type: "book"|"set", id}]     top-level order. Absent -> every book, in order.
 * A set's count and preview use only its SHELVED (non-draft) members in production, and a set
 * with none is not drawn. Test Hub staging includes drafts so the owner can review them in their
 * real shelf/set context. A shelved book that is in no set and not in `shelf` is appended rather
 * than lost.
 *
 * ?from=wordbook: the back arrow returns to Our Word Book's hub (the Test Hub copy when this
 * page is served under /test-apps/), and the flag is carried into sets, the reader and back.
 * Otherwise the back arrow returns to the Children Games hub.
 */
(function () {
  "use strict";

  var BOOKS = "./books/";
  var HUB = "https://veeranuchlee.github.io/children-apps/";
  var WORD_BOOK = "https://veeranuchlee.github.io/word-book/";
  var WORD_BOOK_STAGING = "https://veeranuchlee.github.io/test-apps/word-book-next/";
  var MIN_SHELVES = 2;      // an empty shelf or two keeps one book looking like a bookshelf
  // Landscape (4 per row) keeps just one: the landscape wall's floor sits high enough that a
  // second, empty plank ran straight across the sleeping Vanilla on the rug (seen 1024x768,
  // 2026-10-01). A full second row still draws, in front of the room, as it should.
  var MIN_SHELVES_LANDSCAPE = 1;
  var PREVIEW = 3;          // member covers shown in a set's case, however big the set

  var shelves = document.getElementById("shelves");
  var back = document.getElementById("back");
  var heading = document.getElementById("shelf-title");
  var countLine = document.getElementById("shelf-count");
  var error = document.getElementById("load-error");

  var params = new URLSearchParams(location.search);
  var from = params.get("from") === "wordbook" ? "wordbook" : "";
  var fromQuery = from ? "&from=" + from : "";
  var wantSet = params.get("set") || "";
  var staged = /\/test-apps\//.test(location.pathname);

  function topBack() {
    if (from === "wordbook") {
      back.href = staged ? WORD_BOOK_STAGING : WORD_BOOK;
      back.setAttribute("aria-label", "Back to Our Word Book");
    } else {
      back.href = HUB;
      back.setAttribute("aria-label", "Back to Children Games");
    }
  }

  var groups = [];          // [{title|null, items: [shelf object]}] -- what render() draws

  function perRow() {
    if (window.matchMedia("(max-width: 560px)").matches) return 2;
    return window.matchMedia("(orientation: landscape)").matches ? 4 : 3;
  }

  function readerHref(id, setId) {
    return "./reader/?book=" + encodeURIComponent(id) + (setId ? "&set=" + encodeURIComponent(setId) : "") + fromQuery;
  }

  function coverImg(src) {
    var img = document.createElement("img");
    img.alt = "";
    img.decoding = "async";
    img.onload = function () { img.classList.add("loaded"); };
    img.onerror = function () { img.classList.remove("loaded"); };  // the cream board stays
    img.src = src;
    return img;
  }

  function label(text) {
    var t = document.createElement("span");
    t.className = "book-title";
    t.textContent = text;
    return t;
  }

  function bookTile(b) {
    var a = document.createElement("a");
    a.className = "book";
    a.href = readerHref(b.id, b.inSet);
    a.setAttribute("data-book", b.id);
    var cover = document.createElement("span");
    cover.className = "cover";
    if (b.cover) cover.appendChild(coverImg(b.cover));
    a.appendChild(cover);
    a.appendChild(label(b.title));
    return a;
  }

  // The boxed set. Built from CSS and the members' own covers, so a new set needs no art; an
  // optional `colour` tints the case. Separate books stand in an open case, their tops showing
  // above its front, and the front carries the count -- it reads as "several books in one box"
  // before a word of it is read.
  function setTile(s) {
    var a = document.createElement("a");
    a.className = "book set";
    a.href = "./?set=" + encodeURIComponent(s.id) + fromQuery;
    a.setAttribute("data-set", s.id);
    a.setAttribute("aria-label", s.title + ", " + s.count + (s.count === 1 ? " book" : " books"));
    var c = document.createElement("span");
    c.className = "case";
    if (s.colour) c.style.setProperty("--case", s.colour);
    var backPanel = document.createElement("span");
    backPanel.className = "case-back";
    c.appendChild(backPanel);
    s.preview.forEach(function (b, i) {
      var m = document.createElement("span");
      m.className = "member m" + (i + 1) + " of" + s.preview.length;
      if (b.cover) m.appendChild(coverImg(b.cover));
      c.appendChild(m);
    });
    var front = document.createElement("span");
    front.className = "case-front";
    var n = document.createElement("span");
    n.className = "case-count";
    n.textContent = s.count + (s.count === 1 ? " book" : " books");
    front.appendChild(n);
    c.appendChild(front);
    a.appendChild(c);
    a.appendChild(label(s.title));
    return a;
  }

  var shown = 0;
  function render() {
    var n = perRow();
    if (n === shown && shelves.childNodes.length) return;
    shown = n;
    shelves.textContent = "";
    var minRows = groups.length > 1 ? 0 : (n === 4 ? MIN_SHELVES_LANDSCAPE : MIN_SHELVES);
    groups.forEach(function (g) {
      if (g.title) {
        var h = document.createElement("h2");
        h.className = "section-heading";
        h.textContent = g.title;
        shelves.appendChild(h);
      }
      var rows = Math.max(minRows, Math.ceil(g.items.length / n));
      for (var r = 0; r < rows; r++) {
        var shelf = document.createElement("div");
        shelf.className = "shelf";
        g.items.slice(r * n, r * n + n).forEach(function (o) {
          shelf.appendChild(o.kind === "set" ? setTile(o) : bookTile(o));
        });
        shelves.appendChild(shelf);
      }
    });
  }

  function fail(why) {
    console.error("Reading Tree bookshelf:", why);
    shelves.hidden = true;
    error.hidden = false;
  }

  // One book.json per book that will be drawn, for the cover art. A book whose book.json
  // fails still stands, under its index title, as a plain cream cover.
  var covers = {};
  function loadBook(e) {
    if (covers[e.id]) return covers[e.id];
    var dir = BOOKS + e.id + "/";
    covers[e.id] = fetch(dir + "book.json")
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (b) {
        var pages = b.pages || [];
        var cover = pages.filter(function (p) { return p.kind === "cover"; })[0] || pages[0];
        return { id: e.id, title: b.title || e.title || e.id, cover: cover && cover.art ? dir + cover.art : "" };
      })
      .catch(function (err) {
        console.error("Reading Tree bookshelf: " + e.id + "/book.json", err);
        return { id: e.id, title: e.title || e.id, cover: "" };
      });
    return covers[e.id];
  }

  function asBook(b, setId) {
    return { kind: "book", id: b.id, title: b.title, cover: b.cover, inSet: setId || "" };
  }

  function build(list) {
    var byId = {};
    (list.books || []).forEach(function (b) {
      if (b && b.id && (staged || b.draft !== true)) byId[b.id] = b;
    });
    var sets = {};
    var inSomeSet = {};
    (list.sets || []).forEach(function (s) {
      if (!s || !s.id || !s.title) return;
      var members = (s.books || []).filter(function (id) { return byId[id]; });
      members.forEach(function (id) { inSomeSet[id] = s.id; });
      var preview = (s.previewBooks || []).filter(function (id) { return members.indexOf(id) >= 0; });
      members.forEach(function (id) { if (preview.length < PREVIEW && preview.indexOf(id) < 0) preview.push(id); });
      sets[s.id] = { def: s, members: members, preview: preview.slice(0, PREVIEW) };
    });

    // A set's own shelf.
    var open = sets[wantSet];
    if (open && open.members.length) {
      var s = open.def;
      document.title = s.title;
      document.body.classList.add("in-set");
      heading.textContent = s.title;
      countLine.textContent = open.members.length + (open.members.length === 1 ? " book" : " books");
      countLine.hidden = false;
      back.href = "./" + (from ? "?from=" + from : "");
      back.setAttribute("aria-label", "Back to the bookshelf");
      var placed = {};
      var parts = (s.sections || []).map(function (sec) {
        var ids = (sec.books || []).filter(function (id) { return open.members.indexOf(id) >= 0 && !placed[id]; });
        ids.forEach(function (id) { placed[id] = true; });
        return { title: sec.title || null, ids: ids };
      }).filter(function (p) { return p.ids.length; });
      var rest = open.members.filter(function (id) { return !placed[id]; });
      if (rest.length) parts.push({ title: parts.length ? "More books" : null, ids: rest });
      return Promise.all(parts.map(function (p) {
        return Promise.all(p.ids.map(function (id) {
          return loadBook(byId[id]).then(function (b) { return asBook(b, s.id); });
        })).then(function (items) { return { title: p.title, items: items }; });
      }));
    }

    // The top shelf. An unknown or empty ?set= lands here rather than on a blank page.
    topBack();
    var order = list.shelf && list.shelf.length ? list.shelf.slice()
      : Object.keys(byId).map(function (id) { return { type: "book", id: id }; });
    var listed = {};
    order.forEach(function (o) { if (o && o.type === "book") listed[o.id] = true; });
    (list.books || []).forEach(function (b) {
      if (b && byId[b.id] && !listed[b.id] && !inSomeSet[b.id]) {
        console.warn("Reading Tree bookshelf: " + b.id + " is in no set and not in shelf; appended");
        order.push({ type: "book", id: b.id });
      }
    });
    return Promise.all(order.map(function (o) {
      if (!o) return null;
      if (o.type === "set") {
        var st = sets[o.id];
        if (!st || !st.members.length) return null;            // an empty set is not drawn
        return Promise.all(st.preview.map(function (id) { return loadBook(byId[id]); }))
          .then(function (preview) {
            return { kind: "set", id: o.id, title: st.def.title, colour: st.def.colour || "",
                     count: st.members.length, preview: preview };
          });
      }
      if (!byId[o.id]) return null;
      return loadBook(byId[o.id]).then(function (b) { return asBook(b); });
    })).then(function (items) {
      items = items.filter(Boolean);
      if (!items.length) throw new Error("no books listed");
      return [{ title: null, items: items }];
    });
  }

  fetch(BOOKS + "index.json")
    .then(function (r) { if (!r.ok) throw new Error("books/index.json " + r.status); return r.json(); })
    .then(build)
    .then(function (g) {
      groups = g;
      render();
      window.addEventListener("resize", render);
    })
    .catch(fail);
})();
