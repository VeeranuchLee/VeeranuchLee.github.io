/*
 * Reading Tree Bookshelf. Reads books/index.json and each book's book.json, and stands every
 * book on a shelf as its cover (the book's cover page art) with its title beneath.
 * Tap a book -> reader/?book=<id>. Rows hold 3 books in portrait, 4 in landscape, and the page
 * scrolls vertically as the library grows.
 *
 * ?from=wordbook: the back arrow returns to Our Word Book's hub (the Test Hub copy when this
 * page is served under /test-apps/), and the flag is carried into the reader and back, so the
 * reader's "Back to bookshelf" lands here with the same back arrow. Otherwise the back arrow
 * returns to the Children Games hub.
 */
(function () {
  "use strict";

  var BOOKS = "./books/";
  var HUB = "https://veeranuchlee.github.io/children-apps/";
  var WORD_BOOK = "https://veeranuchlee.github.io/word-book/";
  var WORD_BOOK_STAGING = "https://veeranuchlee.github.io/test-apps/word-book-next/";
  var MIN_SHELVES = 2;      // an empty shelf or two keeps one book looking like a bookshelf

  var shelves = document.getElementById("shelves");
  var back = document.getElementById("back");
  var error = document.getElementById("load-error");

  var params = new URLSearchParams(location.search);
  var from = params.get("from") === "wordbook" ? "wordbook" : "";
  var staged = /\/test-apps\//.test(location.pathname);

  if (from === "wordbook") {
    back.href = staged ? WORD_BOOK_STAGING : WORD_BOOK;
    back.setAttribute("aria-label", "Back to Our Word Book");
  } else {
    back.href = HUB;
    back.setAttribute("aria-label", "Back to Children Games");
  }

  var books = [];           // [{id, title, cover}]

  function perRow() {
    if (window.matchMedia("(max-width: 560px)").matches) return 2;
    return window.matchMedia("(orientation: landscape)").matches ? 4 : 3;
  }

  function readerHref(id) {
    return "./reader/?book=" + encodeURIComponent(id) + (from ? "&from=" + from : "");
  }

  function tile(b) {
    var a = document.createElement("a");
    a.className = "book";
    a.href = readerHref(b.id);
    a.setAttribute("data-book", b.id);
    var cover = document.createElement("span");
    cover.className = "cover";
    if (b.cover) {
      var img = document.createElement("img");
      img.alt = "";
      img.decoding = "async";
      img.onload = function () { img.classList.add("loaded"); };
      img.onerror = function () { img.classList.remove("loaded"); };  // the cream board stays
      img.src = b.cover;
      cover.appendChild(img);
    }
    var title = document.createElement("span");
    title.className = "book-title";
    title.textContent = b.title;
    a.appendChild(cover);
    a.appendChild(title);
    return a;
  }

  var shown = 0;
  function render() {
    var n = perRow();
    if (n === shown && shelves.childNodes.length) return;
    shown = n;
    shelves.textContent = "";
    var rows = Math.max(MIN_SHELVES, Math.ceil(books.length / n));
    for (var r = 0; r < rows; r++) {
      var shelf = document.createElement("div");
      shelf.className = "shelf";
      books.slice(r * n, r * n + n).forEach(function (b) { shelf.appendChild(tile(b)); });
      shelves.appendChild(shelf);
    }
  }

  function fail(why) {
    console.error("Reading Tree bookshelf:", why);
    shelves.hidden = true;
    error.hidden = false;
  }

  fetch(BOOKS + "index.json")
    .then(function (r) { if (!r.ok) throw new Error("books/index.json " + r.status); return r.json(); })
    .then(function (list) {
      var entries = (list.books || []).filter(function (b) { return b && b.id; });
      if (!entries.length) throw new Error("no books listed");
      // One book.json each, for the cover art. A book whose book.json fails still stands on
      // the shelf, under its index title, as a plain cream cover.
      return Promise.all(entries.map(function (e) {
        var dir = BOOKS + e.id + "/";
        return fetch(dir + "book.json")
          .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
          .then(function (b) {
            var first = (b.pages || [])[0];
            var cover = (b.pages || []).filter(function (p) { return p.kind === "cover"; })[0] || first;
            return { id: e.id, title: b.title || e.title || e.id, cover: cover && cover.art ? dir + cover.art : "" };
          })
          .catch(function (err) {
            console.error("Reading Tree bookshelf: " + e.id + "/book.json", err);
            return { id: e.id, title: e.title || e.id, cover: "" };
          });
      }));
    })
    .then(function (list) {
      books = list;
      render();
      window.addEventListener("resize", render);
    })
    .catch(fail);
})();
