/* Pattern Blocks — a standalone Toy Box app, the shelf's first linked toy.
 *
 * Flat 2D pattern blocks on a printed-sheet board: a big board, a bottom tray
 * of the six classic shapes (dragging from the tray spawns a new copy — the
 * tray never runs out), tap to select, one-button 30-degree rotation, delete,
 * a guarded clear, and two modes — Free Build and outline Pattern Cards.
 *
 * Everything geometric lives in geometry.js (exact maths) and cards.js (the
 * data-driven cards); this file is interaction and rendering only.
 *
 * Interaction invariants the brief asks for and this file keeps:
 *  - one active pointer at a time (a second finger never yanks the piece);
 *  - pieces never resize — geometry comes only from (shape, x, y, rot);
 *  - the grab offset is fixed at pointerdown, so a piece never jumps under
 *    the finger;
 *  - snapping happens on DROP, within a radius, and a live dashed ghost shows
 *    where the piece will land while it is still in the hand;
 *  - rotate/delete remain in the fixed bar; selection also gets a large
 *    contextual Turn target beside the piece, kept inside the board.
 */
(function () {
  'use strict';

  /* geometry.js and cards.js load before this file (static order in
     index.html) — the standalone app has no lazy loading and no registry:
     app.js calls window.PatternBlocks.mount(root, { sound }). */

  /* ------------------------------------------------------------------ */

  var STORE_KEY = 'toybox.pattern-blocks.v1';
  var MAX_PIECES = 300;

  function mount(root, ctx) {
    reallyMount(root, ctx);
  }

  function reallyMount(root, ctx) {
    var G = window.PatternBlocksGeometry;
    var CARDS = window.PatternBlocksCards;
    var sound = ctx.sound;

    /* --- state ------------------------------------------------------------ */
    var pieces = [];          /* {id, shape, x, y, rot} in board (maths) units */
    var selected = null;
    var mode = 'free';        /* 'free' | 'cards' */
    var cardId = null;
    var done = {};            /* cardId -> true, once achieved, stays achieved */
    var uid = 1;
    var drag = null;          /* {piece, grabDX, grabDY, moved, sx, sy} */
    var pendingDeselect = false;
    var snapCandidates = null;
    var view = { w: 10, h: 10, unitPx: 52 };
    var outlineOffset = { dx: 0, dy: 0 };
    var saveTimer = null;
    var clearTimer = null;
    var ro = null;
    var dead = false;

    /* --- dom --------------------------------------------------------------- */
    root.innerHTML =
      '<div class="pb-rows">' +
        '<div class="pb-controls">' +
          '<div class="pb-modes" role="tablist">' +
            '<button type="button" class="pb-mode" data-mode="free">Free</button>' +
            '<button type="button" class="pb-mode" data-mode="cards">Cards</button>' +
          '</div>' +
          '<div class="pb-spacer"></div>' +
          '<button type="button" class="btn pb-act" id="pb-rotate" disabled>' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 12a10 10 0 1 1-2.9-7.1" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M22 3v5h-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            '<span>Turn</span></button>' +
          '<button type="button" class="btn pb-act" id="pb-delete" disabled>' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 4h4a1 1 0 0 1 1 1v2H9V5a1 1 0 0 1 1-1zm-3 3h14l-1 13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L7 10z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            '<span>Delete</span></button>' +
          '<button type="button" class="btn pb-act" id="pb-clear">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h16M7 20V9m5 11V9m5 11V9M3 9l9-5 9 5H3z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            '<span>Clear</span></button>' +
        '</div>' +
        '<div class="pb-cards" id="pb-cards"></div>' +
        '<div class="pb-board-wrap" id="pb-board-wrap">' +
          '<svg class="pb-board" id="pb-board" preserveAspectRatio="xMidYMid meet">' +
            '<g id="pb-flip">' +
              /* one dot on every point of the blocks' triangular lattice —
                 see drawDots(). Was an SVG <pattern> tile that clipped the
                 corner dot to a quarter, so the lattice read as a square grid
                 with faint ticks between (owner, 2026-10-20). */
              '<g id="pb-dots" class="pb-dots" aria-hidden="true"></g>' +
              '<g id="pb-outline" class="pb-outline" transform="translate(0 0)"></g>' +
              '<g id="pb-pieces"></g>' +
              '<path id="pb-ghost" class="pb-snap-ghost" d="" style="display:none"/>' +
              '<g id="pb-fx"></g>' +
            '</g>' +
          '</svg>' +
          '<button type="button" class="pb-piece-turn" id="pb-piece-turn" hidden aria-label="Turn selected piece">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 12a10 10 0 1 1-2.9-7.1" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M22 3v5h-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="pb-tray" id="pb-tray"></div>' +
      '</div>';

    var wrap = root.querySelector('#pb-board-wrap');
    var svg = root.querySelector('#pb-board');
    var flip = root.querySelector('#pb-flip');
    var gDots = root.querySelector('#pb-dots');
    var gOutline = root.querySelector('#pb-outline');
    var gPieces = root.querySelector('#pb-pieces');
    var ghost = root.querySelector('#pb-ghost');
    var gFx = root.querySelector('#pb-fx');
    var tray = root.querySelector('#pb-tray');
    var cardsRow = root.querySelector('#pb-cards');
    var btnRotate = root.querySelector('#pb-rotate');
    var btnPieceTurn = root.querySelector('#pb-piece-turn');
    var btnDelete = root.querySelector('#pb-delete');
    var btnClear = root.querySelector('#pb-clear');
    var modeBtns = {};
    root.querySelectorAll('.pb-mode').forEach(function (b) {
      modeBtns[b.dataset.mode] = b;
      b.addEventListener('click', function () { setMode(b.dataset.mode); sound.play('tap'); });
    });

    /* --- view / sizing ------------------------------------------------------ */
    function resize() {
      var r = wrap.getBoundingClientRect();
      if (r.width < 10 || r.height < 10) return;
      view.unitPx = Math.min(64, Math.max(40, r.width / 15));
      view.w = r.width / view.unitPx;
      view.h = r.height / view.unitPx;
      svg.setAttribute('viewBox', '0 0 ' + view.w + ' ' + view.h);
      flip.setAttribute('transform', 'matrix(1 0 0 -1 0 ' + view.h + ')');
      drawDots();
      centerOutline();
      positionPieceTurn();
    }

    /* A dot on every lattice point i*(1,0) + j*(1/2, sqrt3/2) inside the
       board — the same points geometry.js settles pieces onto, so a placed
       hexagon, triangle, blue rhombus or trapezoid has every corner on a dot. */
    function drawDots() {
      var h = G.SQ3 / 2;
      var out = '';
      var jMax = Math.ceil(view.h / h) + 1;
      for (var j = -1; j <= jMax; j++) {
        var y = j * h;
        var x0 = j / 2 - Math.ceil(j / 2) - 1;
        for (var x = x0; x <= view.w + 1; x += 1) {
          out += '<circle cx="' + x.toFixed(6) + '" cy="' + y.toFixed(6) + '" r="0.045"/>';
        }
      }
      gDots.innerHTML = out;
    }

    function toMath(e) {
      var pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      var m = flip.getScreenCTM();
      if (!m) return { x: 0, y: 0 };
      return pt.matrixTransform(m.inverse());
    }

    /* --- piece rendering ------------------------------------------------------ */
    /* Everything on the board sits inside #pb-flip, which already turns maths
       (y up) into screen (y down) — so board paths come from G.boardPath and
       must not negate y themselves. Doing both drew every piece mirrored about
       its own centre until 2026-10-20: the Flower card's triangles crossed its
       rhombi on screen while the data was perfect. Unflipped thumbnails (tray,
       card chips) use G.screenPath. tools/check-geometry.mjs checks both. */
    var localPath = G.boardPath;

    function pieceEl(piece) {
      var s = G.SHAPES[piece.shape];
      var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'pb-piece');
      g.dataset.id = piece.id;
      var halo = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      halo.setAttribute('class', 'pb-halo');
      halo.setAttribute('d', localPath(piece));
      halo.setAttribute('fill', 'none');
      halo.setAttribute('stroke', s.stroke);
      halo.setAttribute('stroke-width', '0.16');
      halo.setAttribute('opacity', '0.35');
      var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', localPath(piece));
      p.setAttribute('fill', s.color);
      p.setAttribute('stroke', s.stroke);
      p.setAttribute('stroke-width', '0.05');
      g.appendChild(halo);
      g.appendChild(p);
      place(g, piece);
      return g;
    }

    function place(el, piece) {
      el.setAttribute('transform', 'translate(' + piece.x + ' ' + piece.y + ')');
    }

    function redraw(piece) {
      var el = gPieces.querySelector('.pb-piece[data-id="' + piece.id + '"]');
      if (!el) return;
      el.querySelectorAll('path').forEach(function (p) { p.setAttribute('d', localPath(piece)); });
      place(el, piece);
      if (piece === selected && !drag) positionPieceTurn();
    }

    function raise(piece) {
      var el = gPieces.querySelector('.pb-piece[data-id="' + piece.id + '"]');
      if (el && el.nextSibling) gPieces.appendChild(el); /* top of z-order */
      var i = pieces.indexOf(piece);
      if (i >= 0 && i < pieces.length - 1) { pieces.splice(i, 1); pieces.push(piece); }
    }

    function select(piece) {
      if (selected === piece) return;
      deselect();
      selected = piece;
      var el = gPieces.querySelector('.pb-piece[data-id="' + piece.id + '"]');
      if (el) el.classList.add('is-selected');
      syncActions();
    }

    function deselect() {
      if (!selected) return;
      var el = gPieces.querySelector('.pb-piece[data-id="' + selected.id + '"]');
      if (el) el.classList.remove('is-selected');
      selected = null;
      syncActions();
    }

    /* A hexagon turned 60 degrees looks exactly the same (owner 2026-10-20:
       "no need to turn"), so it offers no Turn at all. */
    function canTurn(piece) { return !!piece && piece.shape !== 'hexagon'; }

    function syncActions() {
      btnRotate.disabled = !canTurn(selected);
      btnDelete.disabled = !selected;
      positionPieceTurn();
    }

    /* Put the contextual control beside the selected piece. Prefer its right,
       then left, then above/below; reject board-edge candidates and choose the
       first position that does not cover another block. If a crowded board
       leaves no clear option, use the candidate with the least overlap. */
    function positionPieceTurn() {
      if (!canTurn(selected) || drag) { btnPieceTurn.hidden = true; return; }
      var selectedEl = gPieces.querySelector('.pb-piece[data-id="' + selected.id + '"]');
      if (!selectedEl) { btnPieceTurn.hidden = true; return; }
      var boardRect = svg.getBoundingClientRect();
      var wrapRect = wrap.getBoundingClientRect();
      var pieceRect = selectedEl.getBoundingClientRect();
      var size = 48;
      var gap = 8;
      var candidates = [
        { x: pieceRect.right + gap, y: pieceRect.top + (pieceRect.height - size) / 2 },
        { x: pieceRect.left - gap - size, y: pieceRect.top + (pieceRect.height - size) / 2 },
        { x: pieceRect.left + (pieceRect.width - size) / 2, y: pieceRect.top - gap - size },
        { x: pieceRect.left + (pieceRect.width - size) / 2, y: pieceRect.bottom + gap },
      ];
      var otherRects = Array.from(gPieces.querySelectorAll('.pb-piece')).filter(function (el) {
        return el !== selectedEl;
      }).map(function (el) { return el.getBoundingClientRect(); });
      var best = null;
      candidates.forEach(function (c, order) {
        if (c.x < boardRect.left + 4 || c.y < boardRect.top + 4 ||
            c.x + size > boardRect.right - 4 || c.y + size > boardRect.bottom - 4) return;
        var overlap = otherRects.reduce(function (sum, r) {
          var w = Math.max(0, Math.min(c.x + size, r.right) - Math.max(c.x, r.left));
          var h = Math.max(0, Math.min(c.y + size, r.bottom) - Math.max(c.y, r.top));
          return sum + w * h;
        }, 0);
        if (!best || overlap < best.overlap || (overlap === best.overlap && order < best.order)) {
          best = { x: c.x, y: c.y, overlap: overlap, order: order };
        }
      });
      if (!best) { btnPieceTurn.hidden = true; return; }
      btnPieceTurn.style.left = (best.x - wrapRect.left) + 'px';
      btnPieceTurn.style.top = (best.y - wrapRect.top) + 'px';
      btnPieceTurn.hidden = false;
    }

    /* --- drag --------------------------------------------------------------- */
    function candidatesFor(movingPiece) {
      var others = pieces.filter(function (p) { return p !== movingPiece; });
      var pts = G.snapPoints(others);
      var t = effTargets();
      if (t) {
        var cardPts = G.snapPoints(t);
        for (var i = 0; i < cardPts.length; i++) pts.push(cardPts[i]);
      }
      return pts;
    }

    function beginDrag(e, piece, grabDX, grabDY) {
      drag = {
        piece: piece, grabDX: grabDX, grabDY: grabDY,
        pointerId: e.pointerId, moved: false, sx: 0, sy: 0,
      };
      var p = toMath(e);
      drag.sx = p.x; drag.sy = p.y;
      snapCandidates = candidatesFor(piece);
      btnPieceTurn.hidden = true;
      try { svg.setPointerCapture(e.pointerId); } catch (err) { /* best effort */ }
    }

    function onBoardDown(e) {
      if (e.button && e.button > 0) return;
      if (drag) return; /* a second finger never grabs */
      var p = toMath(e);
      var tol = Math.max(0.1, 7 / view.unitPx);
      var hit = G.pieceAt(pieces, p, tol);
      if (hit) {
        raise(hit);
        select(hit);
        beginDrag(e, hit, p.x - hit.x, p.y - hit.y);
        sound.play('tap');
      } else {
        pendingDeselect = true;
      }
      e.preventDefault();
    }

    function onPointerMove(e) {
      if (!drag) return;
      if (e.pointerId !== drag.pointerId) return; /* one pointer owns the drag */
      var p = toMath(e);
      if (!drag.moved) {
        var ddx = p.x - drag.sx, ddy = p.y - drag.sy;
        if (ddx * ddx + ddy * ddy > 0.0064) drag.moved = true; /* ~0.08 units */
      }
      if (!drag.moved) return;
      pendingDeselect = false;
      drag.piece.x = p.x - drag.grabDX;
      drag.piece.y = p.y - drag.grabDY;
      redraw(drag.piece);
      updateGhost();
      e.preventDefault();
    }

    function updateGhost() {
      if (!drag || !drag.moved) { ghost.style.display = 'none'; return; }
      var best = G.settle(drag.piece, snapCandidates, G.SNAP_RADIUS);
      if (best.kind !== 'none') {
        var tmp = {
          shape: drag.piece.shape,
          x: drag.piece.x + best.dx, y: drag.piece.y + best.dy,
          rot: drag.piece.rot,
        };
        ghost.setAttribute('d', localPath(tmp));
        ghost.setAttribute('transform', 'translate(' + tmp.x + ' ' + tmp.y + ')');
        ghost.style.display = 'block';
      } else {
        ghost.style.display = 'none';
      }
    }

    function endDrag(e) {
      if (!drag) { if (pendingDeselect) { deselect(); pendingDeselect = false; } return; }
      var piece = drag.piece;
      var moved = drag.moved;
      drag = null;
      ghost.style.display = 'none';
      snapCandidates = null;
      if (moved) {
        clampIn(piece);
        settlePiece(piece);
        redraw(piece);
        save();
        checkCard();
      }
      positionPieceTurn();
      pendingDeselect = false;
    }

    /* Settle onto the dots (or edge-to-edge onto a neighbour, for the square
       and thin rhombus) — geometry.js settle(). A 'snap' click when the piece
       now touches another piece or the card outline, a softer 'place' when it
       only met the dots. */
    function settlePiece(piece) {
      var pts = candidatesFor(piece);
      var s = G.settle(piece, pts, G.SNAP_RADIUS);
      piece.x += s.dx; piece.y += s.dy;
      var vs = G.worldVerts(piece);
      var touches = vs.some(function (v) {
        return pts.some(function (t) { return Math.abs(t.x - v.x) < 1e-6 && Math.abs(t.y - v.y) < 1e-6; });
      });
      sound.play(touches ? 'snap' : 'place');
    }

    function clampIn(piece) {
      var m = 0.7;
      piece.x = Math.min(Math.max(piece.x, m), view.w - m);
      piece.y = Math.min(Math.max(piece.y, m), view.h - m);
    }

    /* --- tray --------------------------------------------------------------- */
    G.TRAY_ORDER.forEach(function (shapeName) {
      var slot = document.createElement('div');
      slot.className = 'pb-tray-slot';
      var s = G.SHAPES[shapeName];
      var mini = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      /* generous viewBox so every shape draws at the same visual scale */
      var VB = 2.6;
      mini.setAttribute('viewBox', (-VB / 2) + ' ' + (-VB / 2) + ' ' + VB + ' ' + VB);
      var pv = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pv.setAttribute('d', G.screenPath({ shape: shapeName, x: 0, y: 0, rot: 0 }));
      pv.setAttribute('fill', s.color);
      pv.setAttribute('stroke', s.stroke);
      pv.setAttribute('stroke-width', '0.07');
      pv.setAttribute('stroke-linejoin', 'round');
      mini.appendChild(pv);
      slot.appendChild(mini);
      slot.addEventListener('pointerdown', function (e) {
        if (e.button && e.button > 0) return;
        if (drag) return;
        if (pieces.length >= MAX_PIECES) return;
        var p = toMath(e);
        var piece = { id: uid++, shape: shapeName, x: p.x, y: p.y + 0.55, rot: 0 };
        pieces.push(piece);
        gPieces.appendChild(pieceEl(piece));
        raise(piece);
        select(piece);
        beginDrag(e, piece, 0, 0.55);
        drag.moved = true; /* a spawned piece is already being carried */
        e.preventDefault();
      });
      tray.appendChild(slot);
    });

    /* --- board wiring ---------------------------------------------------------- */
    svg.addEventListener('pointerdown', onBoardDown);
    svg.addEventListener('pointermove', onPointerMove);
    svg.addEventListener('pointerup', endDrag);
    svg.addEventListener('pointercancel', endDrag);
    svg.addEventListener('lostpointercapture', function () { if (drag) endDrag({}); });

    /* --- actions ---------------------------------------------------------------- */
    function turnSelected() {
      if (!canTurn(selected)) return;
      turnPiece(selected);
      sound.play('rotate');
      save();
      checkCard();
      positionPieceTurn();
    }

    btnRotate.addEventListener('click', turnSelected);
    btnPieceTurn.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    btnPieceTurn.addEventListener('click', turnSelected);

    /* Turn: 60 degrees for the hexagon, triangle, blue rhombus and trapezoid
       (any other angle takes their corners off the dots), 30 degrees for the
       square and thin rhombus. Then re-settle — a triangle turned about its
       centre lands between dots, so it steps to the nearest dotted spot. */
    function turnPiece(piece) {
      piece.rot = (piece.rot + G.turnStep(piece.shape)) % 12;
      var s = G.settle(piece, candidatesFor(piece), G.SNAP_RADIUS);
      piece.x += s.dx; piece.y += s.dy;
      redraw(piece);
    }

    btnDelete.addEventListener('click', function () {
      if (!selected) return;
      removePiece(selected);
      sound.play('delete');
      save();
    });

    function removePiece(piece) {
      var el = gPieces.querySelector('.pb-piece[data-id="' + piece.id + '"]');
      if (el) el.remove();
      var i = pieces.indexOf(piece);
      if (i >= 0) pieces.splice(i, 1);
      if (selected === piece) deselect();
    }

    btnClear.addEventListener('click', function () {
      if (btnClear.classList.contains('is-armed')) {
        disarmClear();
        for (var i = pieces.length - 1; i >= 0; i--) removePiece(pieces[i]);
        sound.play('clear');
        save();
      } else {
        btnClear.classList.add('is-armed');
        btnClear.querySelector('span').textContent = 'Sure?';
        sound.play('tap');
        clearTimer = setTimeout(disarmClear, 2500);
      }
    });

    function disarmClear() {
      if (clearTimer) { clearTimeout(clearTimer); clearTimer = null; }
      btnClear.classList.remove('is-armed');
      btnClear.querySelector('span').textContent = 'Clear';
    }

    /* --- modes & cards ------------------------------------------------------------ */
    function setMode(m) {
      mode = m;
      Object.keys(modeBtns).forEach(function (k) {
        modeBtns[k].classList.toggle('is-active', k === m);
      });
      cardsRow.classList.toggle('is-shown', m === 'cards');
      if (m === 'cards' && !cardId && CARDS.CARDS.length) selectCard(CARDS.CARDS[0].id);
      renderOutline();
    }

    function effTargets() {
      if (mode !== 'cards' || !cardId) return null;
      var ts = CARDS.targets(cardId);
      return ts.map(function (t) {
        return { shape: t.shape, x: t.x + outlineOffset.dx, y: t.y + outlineOffset.dy, rot: t.rot };
      });
    }

    function centerOutline() {
      if (!cardId) return;
      var ts = CARDS.targets(cardId);
      var bb = G.bounds(ts);
      /* centre the card, then round the shift to a whole lattice step so the
         outline's corners stay on the dots (cards.js builds them on dots) */
      var off = G.nearestLattice({ x: view.w / 2 - (bb.minX + bb.w / 2),
                                   y: view.h / 2 - (bb.minY + bb.h / 2) });
      outlineOffset.dx = off.x;
      outlineOffset.dy = off.y;
      renderOutline();
    }

    function renderOutline() {
      gOutline.innerHTML = '';
      if (mode !== 'cards' || !cardId) return;
      var ts = CARDS.targets(cardId);
      gOutline.setAttribute('transform',
        'translate(' + outlineOffset.dx + ' ' + outlineOffset.dy + ')');
      ts.forEach(function (t) {
        var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        p.setAttribute('d', localPath(t));
        p.setAttribute('transform', 'translate(' + t.x + ' ' + t.y + ')');
        gOutline.appendChild(p);
      });
    }

    function chipThumb(card) {
      var ts = CARDS.targets(card.id);
      var bb = G.bounds(ts);
      var pad = 0.35;
      var vb = (bb.minX - pad) + ' ' + (-(bb.maxY + pad)) + ' ' +
               (bb.w + 2 * pad) + ' ' + (bb.h + 2 * pad);
      var svgStr = '<svg viewBox="' + vb + '" aria-hidden="true">';
      ts.forEach(function (t) {
        svgStr += '<path transform="translate(' + t.x + ' ' + (-t.y) + ')" d="' + G.screenPath(t) +
                  '" fill="rgba(120,116,130,0.10)" stroke="#8d8698" stroke-width="' +
                  Math.min(bb.w, bb.h) * 0.045 + '" stroke-linejoin="round"/>';
      });
      return svgStr + '</svg>';
    }

    function buildChips() {
      cardsRow.innerHTML = '';
      CARDS.CARDS.forEach(function (card) {
        var chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'pb-card-chip';
        chip.dataset.card = card.id;
        chip.innerHTML =
          chipThumb(card) +
          '<span class="pb-chip-label">' + card.label + '</span>' +
          '<span class="pb-chip-done" aria-hidden="true">&#10003;</span>';
        chip.addEventListener('click', function () {
          selectCard(card.id);
          sound.play('tap');
        });
        cardsRow.appendChild(chip);
      });
      syncChips();
    }

    function syncChips() {
      cardsRow.querySelectorAll('.pb-card-chip').forEach(function (chip) {
        chip.classList.toggle('is-active', chip.dataset.card === cardId);
        chip.classList.toggle('is-done', !!done[chip.dataset.card]);
      });
    }

    function selectCard(id) {
      cardId = id;
      centerOutline();
      syncChips();
      save();
    }

    function checkCard() {
      if (mode !== 'cards' || !cardId || done[cardId]) return;
      var t = effTargets();
      if (t && G.cardComplete(pieces, t)) {
        done[cardId] = true;
        syncChips();
        celebrate();
        save();
      }
    }

    function celebrate() {
      sound.play('success');
      var n = 9;
      for (var i = 0; i < n; i++) {
        var ang = (Math.PI * 2 * i) / n + Math.random() * 0.4;
        var rad = 1.6 + Math.random() * 1.1;
        var cx = view.w / 2 + Math.cos(ang) * rad * 1.4;
        var cy = view.h / 2 + Math.sin(ang) * rad;
        var star = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        var s = 0.16 + Math.random() * 0.12;
        star.setAttribute('d', 'M0 -1 L0.22 -0.22 L1 0 L0.22 0.22 L0 1 L-0.22 0.22 L-1 0 L-0.22 -0.22 Z');
        star.setAttribute('transform',
          'translate(' + cx + ' ' + cy + ') scale(' + s + ') matrix(1 0 0 -1 0 0)');
        star.setAttribute('class', 'pb-spark');
        star.style.animationDelay = (i * 0.045) + 's';
        gFx.appendChild(star);
      }
      setTimeout(function () {
        if (!dead) gFx.innerHTML = '';
      }, 1400);
    }

    /* --- persistence ---------------------------------------------------------------- */
    function save() {
      if (saveTimer) return;
      saveTimer = setTimeout(function () {
        saveTimer = null;
        flushSave();
      }, 180);
    }

    function flushSave() {
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify({
          v: 1,
          pieces: pieces.map(function (p) { return { s: p.shape, x: p.x, y: p.y, r: p.rot }; }),
          mode: mode, cardId: cardId, done: done,
        }));
      } catch (e) { /* private mode etc. — play on without saving */ }
    }

    function restore() {
      var raw = null;
      try { raw = localStorage.getItem(STORE_KEY); } catch (e) { return; }
      if (!raw) return;
      try {
        var d = JSON.parse(raw);
        if (d && d.v === 1 && Array.isArray(d.pieces)) {
          d.pieces.forEach(function (p) {
            if (!G.SHAPES[p.s]) return;
            var r = ((+p.r | 0) % 12 + 12) % 12;
            /* boards saved before the dot lattice (2026-10-20) may hold a
               60-degree piece at a 30-degree turn; settle() below puts it back
               on the dots once the view exists */
            if (G.LATTICE_SHAPES[p.s] && r % 2) r = (r + 1) % 12;
            pieces.push({ id: uid++, shape: p.s, x: +p.x || 0, y: +p.y || 0, rot: r });
          });
          if (d.mode === 'cards' || d.mode === 'free') mode = d.mode;
          if (d.cardId && CARDS.targets(d.cardId)) cardId = d.cardId;
          if (d.done && typeof d.done === 'object') done = d.done;
        }
      } catch (e) { /* unreadable save — start fresh */ }
    }

    function renderPieces() {
      gPieces.innerHTML = '';
      pieces.forEach(function (p) { gPieces.appendChild(pieceEl(p)); });
    }

    /* --- keyboard (a freebie for desktop use) ------------------------------------------ */
    function onKey(e) {
      if (e.key === 'Escape') deselect();
      else if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
        removePiece(selected); sound.play('delete'); save();
      } else if ((e.key === 'r' || e.key === 'R') && selected) {
        turnPiece(selected);
        sound.play('rotate'); save(); checkCard();
      }
    }
    window.addEventListener('keydown', onKey);

    /* --- go ---------------------------------------------------------------------------- */
    restore();
    /* settle restored pieces onto the dots (quietly — no sound at load) */
    pieces.forEach(function (p) {
      var others = G.snapPoints(pieces.filter(function (q) { return q !== p; }));
      var s = G.settle(p, others, G.SNAP_RADIUS);
      p.x += s.dx; p.y += s.dy;
    });
    buildChips();
    setMode(mode);
    renderPieces();
    resize();
    ro = new ResizeObserver(resize);
    ro.observe(wrap);

    function onHidden() { flushSave(); }
    document.addEventListener('visibilitychange', onHidden);

    window.PatternBlocks.destroy = function () {
      dead = true;
      flushSave();
      if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
      if (clearTimer) { clearTimeout(clearTimer); clearTimer = null; }
      disarmClear();
      if (ro) ro.disconnect();
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('keydown', onKey);
      root.innerHTML = '';
    };
  }

  window.PatternBlocks = { mount: mount, destroy: function () {} };
})();
