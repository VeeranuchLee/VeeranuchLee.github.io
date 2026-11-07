"use strict";

/* Color & Write (pilot, 2026-11-07) — the writing strip on the coloring
 * screen, plus the two gallery sections that open it.
 *
 * WHAT THIS IS. A word page (PAGES kind "write") is a normal coloring page —
 * the same tools, fill, undo, clear and finished-picture reference as every
 * other page, untouched — with one more thing under the art: a strip that
 * teaches the page's word with the Writing Book's own engine. The strip is
 * two rows side by side. The small row is the model: the finished word, and a
 * tap writes it again, slowly, exactly as the Writing Book's play row does.
 * The big row is the trace row the Writing Book practices on: dotted guides,
 * a green start dot, and a stroke graded one at a time by handwriting/
 * strokes.js, ported byte-identical from writing-book by
 * tools/port-handwriting.js.
 *
 * HOW IT ATTACHES. app.js owns the screen, so app.js owns the doors: openPage
 * calls window.openColorWrite(page) inside its image-load callback (instead
 * of speaking the greeting) and window.closeColorWrite() on every open and on
 * goHome. Everything here — the strip, its surfaces, its audio — is behind
 * those two doors, and this file redefines no name app.js already declares
 * (both files are classic scripts sharing one global scope).
 *
 * VOICE. No line was recorded for this pilot. The word pages speak the word
 * itself (the Word Book's own clip, assets/audio/words/<word>.m4a) and then
 * the existing generic directions line the page's `greeting` id names; the
 * friends pages speak that greeting on open, as every coloring page speaks
 * its own record. tools/test-color-write.js checks every greeting id exists
 * in VOICE_LINES, keeping the guarantee check-voice-lines.py holds for the
 * other pages.
 *
 * GRACEFUL DECLINE. If the engine has not loaded, or a word ever names a
 * letter the letterform table has no geometry for, the strip simply does not
 * appear and the page is an ordinary coloring page. The word still plays and
 * the greeting still speaks; a missing scaffold must never take the coloring
 * down with it.
 */
(function () {
  var SVG_NS = "http://www.w3.org/2000/svg";

  /* app.js helpers, reached by name the way blank-page.js and mosaic-mode.js
     reach them. typeof first: this file must not throw while loading even if
     app.js somehow did not. */
  var appSpeak = typeof speak === "function" ? speak : null;
  var appTinyPop = typeof tinyPop === "function" ? tinyPop : null;
  var appCelebrate = typeof celebrate === "function" ? celebrate : null;
  var appShowMessage = typeof showMessage === "function" ? showMessage : null;
  var appOpenPage = typeof openPage === "function" ? openPage : null;

  /* Drawn icons only — the owner's rule is no emoji anywhere, so the pencil,
     the speaker and the again arrow are inline SVG in the app's own weight
     (rounded 2.2–2.4 strokes, currentColor). */
  var SPEAKER_ICON =
    '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor" stroke="none"/><path d="M15.5 8.5a5 5 0 0 1 0 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M18.5 6a9 9 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
  var AGAIN_ICON =
    '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 12a8 8 0 1 1-2.4-5.7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M20 4.2v4.6h-4.6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var PENCIL_ICON =
    '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M15 4l5 5L9 20H4v-5z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M13 6l5 5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  var strip = null;          /* the one strip element, reused across pages */
  var modelSvg = null;
  var traceSvg = null;
  var hearButton = null;
  var againButton = null;
  var modelRow = null;
  var traceSurface = null;   /* the engine's trace surface for the open page */
  var modelSurface = null;
  var activePage = null;     /* the write page the strip is showing */
  var stripToken = 0;        /* cancels audio/demo callbacks from a closed strip */
  var wordClip = null;       /* one element, like app.js's voiceClip */
  var strokeFails = 0;

  function tone(frequency, duration) {
    if (appTinyPop) appTinyPop(frequency, duration);
  }

  /* ── the word clip ──────────────────────────────────────────────────────
     The Word Book's own recording of the word. One element reused, the shape
     of app.js's speak(): pause whatever played before, duck the menu bed,
     restore it after. `after` runs once when the clip finishes OR fails — the
     greeting that follows must not depend on the file being there. */
  function playWordClip(page, after) {
    var settled = false;
    var finish = function () {
      if (settled) return;
      settled = true;
      if (wordClip) {
        wordClip.onended = null;
        wordClip.onerror = null;
      }
      if (after) after();
    };
    try {
      if (!wordClip) wordClip = new Audio();
      wordClip.pause();
      wordClip.onended = finish;
      wordClip.onerror = finish;
      wordClip.src = "./assets/audio/words/" + page.word + ".m4a";
      if (typeof duckMenuMusic === "function") duckMenuMusic();
      var played = wordClip.play();
      if (played && played.catch) played.catch(finish);
    } catch (_) {
      // No audio element, no clip, no permission: the word is silent and the
      // chain moves straight on to whatever followed it.
      finish();
    }
  }

  /* ── building the strip once ─────────────────────────────────────────── */

  function buildStrip() {
    strip = document.createElement("div");
    strip.className = "write-strip";
    strip.hidden = true;

    var actions = document.createElement("div");
    actions.className = "write-actions";

    hearButton = document.createElement("button");
    hearButton.type = "button";
    hearButton.className = "write-round write-round--hear";
    hearButton.innerHTML = SPEAKER_ICON;
    actions.appendChild(hearButton);

    againButton = document.createElement("button");
    againButton.type = "button";
    againButton.className = "write-round write-round--again";
    againButton.innerHTML = AGAIN_ICON;
    actions.appendChild(againButton);

    var paper = document.createElement("div");
    paper.className = "write-paper";

    modelRow = document.createElement("button");
    modelRow.type = "button";
    modelRow.className = "write-row write-row--model";
    modelSvg = document.createElementNS(SVG_NS, "svg");
    modelRow.appendChild(modelSvg);

    var traceRow = document.createElement("div");
    traceRow.className = "write-row write-row--trace";
    traceSvg = document.createElementNS(SVG_NS, "svg");
    traceRow.appendChild(traceSvg);

    paper.appendChild(modelRow);
    paper.appendChild(traceRow);

    strip.appendChild(actions);
    strip.appendChild(paper);

    /* The model row is the play row: it writes the word, slowly, every tap —
       the Writing Book's own answer to a child who cannot read buttons. */
    modelRow.addEventListener("click", function () {
      tone(500, 0.05);
      if (modelSurface) modelSurface.demoWord("slow");
    });

    hearButton.addEventListener("click", function () {
      if (!activePage) return;
      tone(560, 0.05);
      playWordClip(activePage, null);
    });

    againButton.addEventListener("click", function () {
      if (!traceSurface) return;
      /* clear() takes the strip back to the first dotted stroke, finished
         state and all — the celebration's glow goes with it. */
      traceSurface.clear();
      strokeFails = 0;
      againButton.classList.remove("is-ready");
      tone(520, 0.06);
    });

    return strip;
  }

  /* ── opening and closing ─────────────────────────────────────────────── */

  function closeColorWrite() {
    stripToken += 1;
    if (wordClip) {
      wordClip.pause();
      wordClip.onended = null;
      wordClip.onerror = null;
    }
    if (traceSurface) {
      try { traceSurface.destroy(); } catch (_) {}
      traceSurface = null;
    }
    if (modelSurface) {
      try { modelSurface.destroy(); } catch (_) {}
      modelSurface = null;
    }
    if (strip) strip.hidden = true;
    activePage = null;
    strokeFails = 0;
  }

  function openColorWrite(page) {
    closeColorWrite();
    if (!page || page.kind !== "write" || !page.word) return;
    activePage = page;
    var myToken = stripToken;

    var speakGreeting = function () {
      if (myToken !== stripToken) return;
      if (page.greeting && appSpeak) appSpeak(page.greeting);
    };

    /* The engine is a plain script; if it never loaded (or the word names a
       letter it has no geometry for), the page stays a coloring page. The
       word and the greeting still play, so the page is never silent. */
    var engineReady = typeof WritingStrokes === "object" && WritingStrokes !== null
      && typeof WritingStrokes.create === "function"
      && typeof WritingLetters === "object" && WritingLetters !== null
      && WritingLetters.missing(page.word).length === 0;
    if (!engineReady) {
      playWordClip(page, speakGreeting);
      return;
    }

    if (!strip) buildStrip();
    var coloringScreen = document.getElementById("coloringScreen");
    if (coloringScreen && !strip.parentNode) {
      coloringScreen.insertBefore(strip, coloringScreen.querySelector(".studio-tools"));
    }

    /* Fresh engine children in the persistent svgs: destroy() was already
       called by closeColorWrite, so only leftovers of an old word remain. */
    modelSvg.replaceChildren();
    traceSvg.replaceChildren();
    strip.setAttribute("aria-label", "Write the word " + page.word);
    hearButton.setAttribute("aria-label", "Hear the word " + page.word);
    againButton.setAttribute("aria-label", "Write " + page.word + " again");
    modelRow.setAttribute("aria-label", "Watch how to write " + page.word);
    againButton.classList.remove("is-ready");
    strip.hidden = false;

    modelSurface = WritingStrokes.create({
      svg: modelSvg,
      word: page.word,
      mode: "model"
    });

    traceSurface = WritingStrokes.create({
      svg: traceSvg,
      word: page.word,
      level: 1,
      mode: "trace",
      /* Same responses as the Writing Book's trace row: a rising tone for a
         stroke that passed, a low one plus the engine's own start-dot nudge
         for a miss, and after two misses on the same stroke the app shows the
         child how — slowly — instead of repeating words at them. */
      onStroke: function (result) {
        if (result.pass) {
          strokeFails = 0;
          tone(660, 0.07);
        } else {
          strokeFails += 1;
          tone(300, 0.06);
          if (strokeFails >= 2) {
            strokeFails = 0;
            window.setTimeout(function () {
              if (myToken !== stripToken || !traceSurface) return;
              traceSurface.demo("slow");
            }, 500);
          }
        }
      },
      onLetter: function () {
        tone(760, 0.07);
      },
      onWord: function (word) {
        if (myToken !== stripToken) return;
        againButton.classList.add("is-ready");
        if (appShowMessage) appShowMessage("You wrote " + word + "!");
        /* The app's own celebration: confetti over the screen, the rising
           trio of tones and the finish-praise line. */
        if (appCelebrate) appCelebrate();
      }
    });

    /* Word first, then the writing shown once, then the directions — the
       word-then-guidance order the owner set for the Spelling Exam. The demo
       and the greeting both wait for the clip, and the token tears the whole
       chain down if the child leaves before it runs. */
    playWordClip(page, function () {
      if (myToken !== stripToken) return;
      if (modelSurface) modelSurface.demoWord("slow");
      speakGreeting();
    });
  }

  /* ── the pilot gallery ──────────────────────────────────────────────────
     Two sections under the coloring cards: the six friends, then the six
     Color & Write word pages. buildGallery (app.js) skips every grouped page,
     so these are the only copies. Word cards wear a small drawn pencil badge
     and the word itself under the thumbnail — the word is the point of the
     page, and a child who cannot read it yet has the badge and the picture. */
  function buildPilotCard(page) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "page-card" + (page.kind === "write" ? " page-card--write" : "");
    button.style.setProperty("--card-color", page.card);
    if (page.kind === "write") {
      button.setAttribute("aria-label", "Color the picture and write " + page.word);
    } else {
      button.setAttribute("aria-label", "Color " + (page.label || page.id));
    }

    var image = document.createElement("img");
    image.src = "./assets/pages/" + page.file;
    image.alt = "";
    image.draggable = false;
    image.loading = "lazy";
    button.appendChild(image);

    if (page.kind === "write") {
      var badge = document.createElement("span");
      badge.className = "page-card-pencil";
      badge.setAttribute("aria-hidden", "true");
      badge.innerHTML = PENCIL_ICON;
      button.appendChild(badge);

      var word = document.createElement("b");
      word.className = "page-card-word";
      word.textContent = page.word;
      button.appendChild(word);
    }

    button.addEventListener("click", function () {
      if (appOpenPage) appOpenPage(page);
    });
    return button;
  }

  function buildPilotGallery() {
    var gallery = document.getElementById("pageGallery");
    if (!gallery || typeof PAGES === "undefined") return;
    var fragment = document.createDocumentFragment();
    var sections = [
      { heading: "Our friends", group: "friends" },
      { heading: "Color & Write", group: "write" }
    ];
    sections.forEach(function (section) {
      var pages = PAGES.filter(function (page) { return page.group === section.group; });
      if (!pages.length) return;
      var heading = document.createElement("h2");
      heading.className = "page-gallery-heading";
      heading.textContent = section.heading;
      fragment.appendChild(heading);
      pages.forEach(function (page) {
        fragment.appendChild(buildPilotCard(page));
      });
    });
    gallery.appendChild(fragment);
  }

  window.openColorWrite = openColorWrite;
  window.closeColorWrite = closeColorWrite;

  buildPilotGallery();
})();
