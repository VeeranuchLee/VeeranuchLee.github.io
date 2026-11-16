/*
 * My Table — a child's first spreadsheet (first-sheet pilot, 2026-11-16).
 * Plain HTML/CSS/JS, no libraries, works offline from file-relative paths.
 * The table maths and the mission rules are pure functions at the top, exported
 * when `module` exists for tools/test-logic.mjs; everything from FirstSheetUI()
 * down touches the DOM and never runs under node.
 */
"use strict";

/* ------------------------------ pure data ------------------------------ */
var MAX = 9;              // biggest number one cell can hold
var GRAND_MIN_EQUAL = 4;  // "every row the same total" must not be an empty table

var DAYS = [
  { letter: "A", short: "Mon", long: "Monday" },   { letter: "B", short: "Tue", long: "Tuesday" },
  { letter: "C", short: "Wed", long: "Wednesday" }, { letter: "D", short: "Thu", long: "Thursday" }
];

var THINGS = [
  { key: "apple", many: "Apples" },  { key: "cupcake", many: "Cupcakes" },
  { key: "flower", many: "Flowers" }, { key: "fish", many: "Fish" }
];

/* Twelve missions in rising order. The child answers by using the table:
 * tap questions finish on the right tap, make questions on the right numbers. */
var MISSIONS = [
  { id: "tap-b2",     kind: "tap-cell",   r: 1, c: 1,        prompt: "Tap cell B2." },
  { id: "apples-3",   kind: "set-cell",   r: 0, c: 0, value: 3, prompt: "Put 3 apples on Monday." },
  { id: "cakes-5",    kind: "set-cell",   r: 1, c: 1, value: 5, prompt: "Put 5 cupcakes on Tuesday." },
  { id: "find-r1",    kind: "tap-total",  total: "row", r: 0, prompt: "Tap the apple row's Total box." },
  { id: "flowers-6",  kind: "row-total",  r: 2, value: 6,   prompt: "Make the flower row total 6." },
  { id: "fish-4",     kind: "set-cell",   r: 3, c: 3, value: 4, prompt: "Put 4 fish on Thursday." },
  { id: "wed-8",      kind: "col-total",  c: 2, value: 8,   prompt: "Make the Wed column total 8." },
  { id: "find-grand", kind: "tap-total",  total: "grand",   prompt: "Tap the corner Total box." },
  { id: "most-day",   kind: "pick-col",                    prompt: "Which day has the most? Tap its letter." },
  { id: "fewest-row", kind: "pick-row",                    prompt: "Which row has the fewest? Tap its number." },
  { id: "same-rows",  kind: "equal-rows",                  prompt: "Make every row the same total." },
  { id: "grand-20",   kind: "grand-total", value: 20,       prompt: "Make the grand total 20." }
];

/* ------------------------------ table maths ------------------------------ */
function idx(r, c) { return r * 4 + c; }
function emptyCells() { return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; }

function rowTotals(cells) {
  var out = [];
  for (var r = 0; r < 4; r++) out.push(cells[idx(r, 0)] + cells[idx(r, 1)] + cells[idx(r, 2)] + cells[idx(r, 3)]);
  return out;
}

function colTotals(cells) {
  var out = [];
  for (var c = 0; c < 4; c++) out.push(cells[idx(0, c)] + cells[idx(1, c)] + cells[idx(2, c)] + cells[idx(3, c)]);
  return out;
}

function grandTotal(cells) {
  var sum = 0;
  for (var i = 0; i < 16; i++) sum += cells[i];
  return sum;
}

function cellName(r, c) { return DAYS[c].letter + (r + 1); }
function rowExpr(cells, r) {
  return cells[idx(r, 0)] + " + " + cells[idx(r, 1)] + " + " + cells[idx(r, 2)] + " + " + cells[idx(r, 3)];
}

function colExpr(cells, c) {
  return cells[idx(0, c)] + " + " + cells[idx(1, c)] + " + " + cells[idx(2, c)] + " + " + cells[idx(3, c)];
}

function isColMax(cells, c) {
  var t = colTotals(cells);
  return t[c] === Math.max(t[0], t[1], t[2], t[3]);
}
function isRowMin(cells, r) {
  var t = rowTotals(cells);
  return t[r] === Math.min(t[0], t[1], t[2], t[3]);
}

/* ------------------------------ mission rules ------------------------------ */
/* Is the mission's goal already satisfied by the table? Tap missions are
 * finished by the right tap, never by the table alone. */
function goalMet(m, cells) {
  var t;
  switch (m.kind) {
    case "set-cell":    return cells[idx(m.r, m.c)] === m.value;
    case "row-total":   return rowTotals(cells)[m.r] === m.value;
    case "col-total":   return colTotals(cells)[m.c] === m.value;
    case "equal-rows":
      t = rowTotals(cells);
      return t[0] === t[1] && t[1] === t[2] && t[2] === t[3] && grandTotal(cells) >= GRAND_MIN_EQUAL;
    case "grand-total": return grandTotal(cells) === m.value;
    default:            return false;
  }
}

/* How far the table is from the mission's goal; 0 means met. Used to tell a
 * step towards the goal (quiet) from a step away from it (a miss). */
function distance(m, cells) {
  var t, spread;
  switch (m.kind) {
    case "set-cell":    return Math.abs(cells[idx(m.r, m.c)] - m.value);
    case "row-total":   return Math.abs(rowTotals(cells)[m.r] - m.value);
    case "col-total":   return Math.abs(colTotals(cells)[m.c] - m.value);
    case "equal-rows":
      t = rowTotals(cells);
      spread = Math.max(t[0], t[1], t[2], t[3]) - Math.min(t[0], t[1], t[2], t[3]);
      return spread + Math.max(0, GRAND_MIN_EQUAL - grandTotal(cells));
    case "grand-total": return Math.abs(grandTotal(cells) - m.value);
    default:            return Infinity;
  }
}

/* A tap on the table: { kind: "cell", r, c } | { kind: "total", total: "row"|"col"|"grand",
 * r?, c? } | { kind: "colHead", c } | { kind: "rowHead", r }.
 * Returns "done", "miss" (a wrong answer attempt) or "none" (not an attempt). */
function tapOutcome(m, cells, tap) {
  var onBox = tap.kind === "cell" || tap.kind === "total";
  switch (m.kind) {
    case "tap-cell":
      if (!onBox) return "none";
      return (tap.kind === "cell" && tap.r === m.r && tap.c === m.c) ? "done" : "miss";
    case "tap-total":
      if (!onBox) return "none";
      if (tap.kind !== "total") return "miss";
      if (m.total === "grand") return tap.total === "grand" ? "done" : "miss";
      return (tap.total === "row" && tap.r === m.r) ? "done" : "miss";
    case "pick-col":
      if (tap.kind !== "colHead") return "none";
      return (grandTotal(cells) > 0 && isColMax(cells, tap.c)) ? "done" : "miss";
    case "pick-row":
      if (tap.kind !== "rowHead") return "none";
      return (grandTotal(cells) > 0 && isRowMin(cells, tap.r)) ? "done" : "miss";
    default:
      return "none"; /* make missions are judged on +/− presses */
  }
}

/* A +/− press changed one cell from `before` to `after`. Closer is quiet,
 * further or nowhere is one miss, reaching the goal is done. */
function changeOutcome(m, before, after, changed) {
  if (goalMet(m, after)) return "done";
  if (!changed) return "none";
  return distance(m, after) < distance(m, before) ? "none" : "miss";
}

/* The repo's two hint thresholds: a nudge at two misses, the answer at three. */
function hintLevel(misses) {
  return misses >= 3 ? "answer" : misses >= 2 ? "hint" : "none";
}

/* Where the hint flashes and where the revealed answer glows, as descriptors:
 * {t:"cell",r,c} | {t:"row",r} | {t:"col",c} | {t:"rTotal",r} | {t:"cTotal",c} | {t:"grand"} */
function missionFocus(m, cells) {
  var flash = [], glow = [], r, c, t, best;
  switch (m.kind) {
    case "tap-cell":
    case "set-cell":
      flash = [{ t: "row", r: m.r }, { t: "col", c: m.c }];
      glow = [{ t: "cell", r: m.r, c: m.c }];
      break;
    case "tap-total":
      if (m.total === "grand") {
        flash = [{ t: "grand" }];
        glow = [{ t: "grand" }];
      } else {
        flash = [{ t: "row", r: m.r }, { t: "rTotal", r: m.r }];
        glow = [{ t: "rTotal", r: m.r }];
      }
      break;
    case "row-total":
      flash = [{ t: "row", r: m.r }];
      glow = [{ t: "rTotal", r: m.r }];
      for (c = 0; c < 4; c++) glow.push({ t: "cell", r: m.r, c: c });
      break;
    case "col-total":
      flash = [{ t: "col", c: m.c }];
      glow = [{ t: "cTotal", c: m.c }];
      for (r = 0; r < 4; r++) glow.push({ t: "cell", r: r, c: m.c });
      break;
    case "pick-col":
      for (c = 0; c < 4; c++) flash.push({ t: "col", c: c });
      t = colTotals(cells);
      best = 0;
      for (c = 1; c < 4; c++) if (t[c] > t[best]) best = c;
      glow = [{ t: "col", c: best }];
      break;
    case "pick-row":
      for (r = 0; r < 4; r++) flash.push({ t: "row", r: r });
      t = rowTotals(cells);
      best = 0;
      for (r = 1; r < 4; r++) if (t[r] < t[best]) best = r;
      glow = [{ t: "row", r: best }];
      break;
    case "equal-rows":
      for (r = 0; r < 4; r++) { flash.push({ t: "row", r: r }); glow.push({ t: "rTotal", r: r }); }
      break;
    case "grand-total":
      flash = [{ t: "grand" }];
      glow = [{ t: "grand" }];
      for (r = 0; r < 4; r++) glow.push({ t: "rTotal", r: r });
      break;
  }
  return { flash: flash, glow: glow };
}

/* ------------------------------ saved state ------------------------------ */
function defaultState() {
  return { cells: emptyCells(), missionIdx: 0, misses: 0, freePlay: false, sound: true };
}

/* Parse one safe-storage string. Junk or a wrong shape gives null; a valid
 * object with missing pieces gives the defaults for those pieces. */
function isCount(v) { return typeof v === "number" && isFinite(v) && Math.floor(v) === v; }

function parseState(raw) {
  if (typeof raw !== "string" || raw === "") return null;
  var data;
  try { data = JSON.parse(raw); } catch (e) { return null; }
  if (!data || typeof data !== "object") return null;
  var out = defaultState();
  if (Array.isArray(data.cells) && data.cells.length === 16 &&
      data.cells.every(function (v) { return isCount(v) && v >= 0 && v <= MAX; })) {
    out.cells = data.cells.slice();
  }
  if (isCount(data.missionIdx)) out.missionIdx = Math.max(0, Math.min(MISSIONS.length, Math.floor(data.missionIdx)));
  if (isCount(data.misses)) out.misses = Math.max(0, Math.min(99, Math.floor(data.misses)));
  if (typeof data.freePlay === "boolean") out.freePlay = data.freePlay;
  if (typeof data.sound === "boolean") out.sound = data.sound;
  return out;
}

var FirstSheet = {
  MAX: MAX, GRAND_MIN_EQUAL: GRAND_MIN_EQUAL, DAYS: DAYS, THINGS: THINGS, MISSIONS: MISSIONS,
  idx: idx, emptyCells: emptyCells, rowTotals: rowTotals, colTotals: colTotals, grandTotal: grandTotal,
  cellName: cellName, rowExpr: rowExpr, colExpr: colExpr, isColMax: isColMax, isRowMin: isRowMin,
  goalMet: goalMet, distance: distance, tapOutcome: tapOutcome, changeOutcome: changeOutcome,
  hintLevel: hintLevel, missionFocus: missionFocus, defaultState: defaultState, parseState: parseState
};
if (typeof module !== "undefined" && module.exports) module.exports = FirstSheet;

/* ------------------------------ browser app ------------------------------ */
function FirstSheetUI() {
  var KEY = "first-sheet.v1";
  var store = (typeof SafeStorage !== "undefined") ? SafeStorage.local : null;

  var saved = store ? parseState(store.getItem(KEY)) : null;
  var st = saved || defaultState();

  var sel = { kind: "cell", r: 0, c: 0 };
  var selEl = null, armTimer = null, againArmed = false;
  var $ = function (id) { return document.getElementById(id); };
  var sheet = $("sheet"), chart = $("chart"), starsBox = $("stars");
  var addrEl = $("addr"), addrPic = $("addrPic"), addrNote = $("addrNote");
  var missionText = $("missionText"), againBtn = $("againBtn");
  var plusBtn = $("plusBtn"), minusBtn = $("minusBtn");
  var freeBtn = $("freeBtn"), soundBtn = $("soundBtn");

  var cellEls = [], cellNums = [], cellDots = [];
  var colHeadEls = [], rowHeadEls = [], rTotalNums = [], cTotalNums = [], grandNum = null;
  var barFills = [], barCounts = [], starEls = [];

  function el(tag, cls) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    return n;
  }

  function mkBtn(cls, html, label) {
    var b = el("button", cls);
    if (html) b.innerHTML = html;
    if (label) b.setAttribute("aria-label", label);
    return b;
  }

  function picSvg(r) {
    return '<svg viewBox="0 0 64 64" aria-hidden="true"><use href="#p-' + THINGS[r].key + '"/></svg>';
  }

  var STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9Z"/></svg>';

  /* ---- build the table, the chart and the stars once ---- */
  function buildSheet() {
    var r, c, b;
    sheet.appendChild(el("div", "head corner"));
    for (c = 0; c < 4; c++) {
      b = mkBtn("head colhead", "<b>" + DAYS[c].letter + "</b><small>" + DAYS[c].short + "</small>", DAYS[c].long + " column");
      b.dataset.c = c;
      sheet.appendChild(b);
      colHeadEls.push(b);
    }
    var th = el("div", "head totalhead");
    th.textContent = "Total";
    sheet.appendChild(th);

    for (r = 0; r < 4; r++) {
      var rh = mkBtn("head rowhead", "<b>" + (r + 1) + "</b>" + picSvg(r), "Row " + (r + 1) + ", " + THINGS[r].many.toLowerCase());
      rh.dataset.r = r;
      sheet.appendChild(rh);
      rowHeadEls.push(rh);

      cellEls.push([]); cellNums.push([]); cellDots.push([]);
      for (c = 0; c < 4; c++) {
        b = mkBtn("cell", '<span class="dots" aria-hidden="true"></span><span class="num">0</span>', "");
        b.dataset.r = r; b.dataset.c = c;
        sheet.appendChild(b);
        cellEls[r].push(b);
        cellNums[r].push(b.querySelector(".num"));
        cellDots[r].push(b.querySelector(".dots"));
      }
      b = mkBtn("totalcell rtotal", '<span class="num">0</span>', "Row " + (r + 1) + " total");
      b.dataset.r = r;
      sheet.appendChild(b);
      rTotalNums.push(b.querySelector(".num"));
    }

    var bl = el("div", "head totalhead");
    bl.textContent = "Total";
    sheet.appendChild(bl);
    for (c = 0; c < 4; c++) {
      b = mkBtn("totalcell ctotal", '<span class="num">0</span>', DAYS[c].short + " total");
      b.dataset.c = c;
      sheet.appendChild(b);
      cTotalNums.push(b.querySelector(".num"));
    }
    var g = mkBtn("totalcell grand", '<span class="num">0</span>', "Grand total");
    sheet.appendChild(g);
    grandNum = g.querySelector(".num");

    sheet.addEventListener("click", function (e) {
      var t = e.target.closest("button");
      if (!t || !sheet.contains(t)) return;
      if (t.classList.contains("cell")) onCellTap(+t.dataset.r, +t.dataset.c);
      else if (t.classList.contains("colhead")) onColHeadTap(+t.dataset.c);
      else if (t.classList.contains("rowhead")) onRowHeadTap(+t.dataset.r);
      else if (t.classList.contains("rtotal")) onTotalTap({ kind: "total", total: "row", r: +t.dataset.r });
      else if (t.classList.contains("ctotal")) onTotalTap({ kind: "total", total: "col", c: +t.dataset.c });
      else if (t.classList.contains("grand")) onTotalTap({ kind: "total", total: "grand" });
    });
  }

  function buildChart() {
    for (var r = 0; r < 4; r++) {
      var b = mkBtn("barcol", '<span class="barstack"><span class="barfill"></span></span>' +
        '<span class="barlabel">' + picSvg(r) + "<b>0</b></span>", THINGS[r].many + " bar");
      b.dataset.r = r;
      chart.appendChild(b);
      barFills.push(b.querySelector(".barfill"));
      barCounts.push(b.querySelector("b"));
      b.addEventListener("click", function () { onRowHeadTap(+this.dataset.r); });
    }
  }

  function buildStars() {
    for (var i = 0; i < MISSIONS.length; i++) {
      starsBox.insertAdjacentHTML("beforeend", STAR);
      starEls.push(starsBox.lastChild);
    }
  }

  /* ---- rendering ---- */
  function bump(node) {
    node.classList.remove("bump");
    void node.offsetWidth;
    node.classList.add("bump"); /* the reflow above restarts the animation */
  }

  function renderCell(r, c) {
    var v = st.cells[idx(r, c)];
    cellNums[r][c].textContent = v;
    cellDots[r][c].innerHTML = "<i></i>".repeat(v);
    cellEls[r][c].setAttribute("aria-label", cellName(r, c) + ", " + v + " " + THINGS[r].many.toLowerCase());
  }

  function renderTotals(before) {
    var rt = rowTotals(st.cells), ct = colTotals(st.cells), g = grandTotal(st.cells);
    var brt = before ? rowTotals(before) : null, bct = before ? colTotals(before) : null;
    var bg = before ? grandTotal(before) : null;
    var any = false, i;
    for (i = 0; i < 4; i++) {
      rTotalNums[i].textContent = rt[i];
      if (brt && brt[i] !== rt[i]) { bump(rTotalNums[i]); any = true; }
      cTotalNums[i].textContent = ct[i];
      if (bct && bct[i] !== ct[i]) { bump(cTotalNums[i]); any = true; }
    }
    grandNum.textContent = g;
    if (bg !== null && bg !== g) { bump(grandNum); any = true; }
    if (any) sTotal();
  }

  function renderChart() {
    var rt = rowTotals(st.cells);
    for (var r = 0; r < 4; r++) { barFills[r].style.setProperty("--n", rt[r]); barCounts[r].textContent = rt[r]; }
  }

  function renderStars() {
    for (var i = 0; i < starEls.length; i++) starEls[i].classList.toggle("earned", i < st.missionIdx);
  }

  function renderMissions() {
    missionText.textContent = st.missionIdx >= MISSIONS.length
      ? "All done! Enjoy free play."
      : MISSIONS[st.missionIdx].prompt;
  }

  function elFor(d) {
    if (d.t === "cell") return cellEls[d.r][d.c];
    if (d.t === "row") return rowHeadEls[d.r];
    if (d.t === "col") return colHeadEls[d.c];
    if (d.t === "rTotal") return rTotalNums[d.r].parentNode;
    if (d.t === "cTotal") return cTotalNums[d.c].parentNode;
    return grandNum.parentNode; /* "grand" */
  }

  function setSel(node) {
    if (selEl) selEl.classList.remove("sel");
    selEl = node;
    if (selEl) selEl.classList.add("sel");
  }

  function renderSelection() {
    if (sel.kind === "cell") setSel(cellEls[sel.r][sel.c]);
    else if (sel.kind === "total" && sel.total === "row") setSel(rTotalNums[sel.r].parentNode);
    else if (sel.kind === "total" && sel.total === "col") setSel(cTotalNums[sel.c].parentNode);
    else if (sel.kind === "total") setSel(grandNum.parentNode);
    else if (sel.kind === "rowHead") setSel(rowHeadEls[sel.r]);
    else if (sel.kind === "colHead") setSel(colHeadEls[sel.c]);
  }

  /* The name tag: big address, the row picture, and a short note ("B2 — Cupcakes
   * on Tue"; totals spell the sum they add up). */
  function renderTag() {
    var tag;
    if (sel.kind === "cell") tag = [cellName(sel.r, sel.c), picSvg(sel.r), THINGS[sel.r].many + " on " + DAYS[sel.c].short];
    else if (sel.kind === "total" && sel.total === "row") tag = ["Row " + (sel.r + 1), picSvg(sel.r), "total = " + rowExpr(st.cells, sel.r)];
    else if (sel.kind === "total" && sel.total === "col") tag = [DAYS[sel.c].short, "", "total = " + colExpr(st.cells, sel.c)];
    else if (sel.kind === "total") tag = ["Grand", "", "total = " + rowTotals(st.cells).join(" + ")];
    else if (sel.kind === "rowHead") tag = ["Row " + (sel.r + 1), picSvg(sel.r), THINGS[sel.r].many + " row"];
    else tag = [DAYS[sel.c].letter, "", DAYS[sel.c].long + " column"];
    addrEl.textContent = tag[0];
    addrPic.innerHTML = tag[1];
    addrNote.textContent = tag[2];
  }

  function clearClass(cls, root) {
    var list = (root || document).querySelectorAll("." + cls), i;
    for (i = 0; i < list.length; i++) list[i].classList.remove(cls);
  }

  function litDescs(list) {
    clearClass("lit", sheet);
    for (var i = 0; i < list.length; i++) {
      var node = elFor(list[i]);
      if (node) node.classList.add("lit");
    }
  }

  /* Tapping a total box or a row/column header lights the cells it adds up. */
  function litForSel() {
    var out = [], r, c;
    var rowMode = sel.kind === "rowHead" || (sel.kind === "total" && sel.total === "row");
    var colMode = sel.kind === "colHead" || (sel.kind === "total" && sel.total === "col");
    if (rowMode) {
      for (c = 0; c < 4; c++) out.push({ t: "cell", r: sel.r, c: c });
    } else if (colMode) {
      for (r = 0; r < 4; r++) out.push({ t: "cell", r: r, c: sel.c });
    } else if (sel.kind === "total") {
      for (r = 0; r < 4; r++) for (c = 0; c < 4; c++) out.push({ t: "cell", r: r, c: c });
    }
    litDescs(out);
  }

  /* ---- missions ---- */
  function currentMission() {
    return st.freePlay ? null : MISSIONS[st.missionIdx] || null;
  }

  function missionTap(tap) {
    var m = currentMission();
    if (m) judge(tapOutcome(m, st.cells, tap), m);
  }

  function missionChange(before) {
    var m = currentMission();
    if (m) judge(changeOutcome(m, before, st.cells, true), m);
  }

  function judge(out, m) {
    if (out === "done") missionDone();
    else if (out === "miss") missionMiss(m);
  }

  function missionDone() {
    st.missionIdx++;
    st.misses = 0;
    clearClass("answerglow");
    sDone();
    renderStars();
    syncMission();
  }

  function missionMiss(m) {
    st.misses++;
    var level = hintLevel(st.misses);
    if (level === "hint") flashFocus(m);
    if (level === "answer") glowFocus(m);
    save();
  }

  /* A mission that is already satisfied the moment it appears is done at once. */
  function syncMission() {
    var guard = 0;
    while (!st.freePlay && st.missionIdx < MISSIONS.length &&
           goalMet(MISSIONS[st.missionIdx], st.cells) && guard++ < MISSIONS.length) {
      st.missionIdx++;
      st.misses = 0;
      renderStars();
    }
    renderMissions();
    save();
  }

  function renderAll() {
    for (var r = 0; r < 4; r++) for (var c = 0; c < 4; c++) renderCell(r, c);
    renderTotals(null);
    renderChart();
    renderStars();
    renderSelection();
    renderTag();
    renderMissions();
  }

  function flashFocus(m) {
    var focus = missionFocus(m, st.cells);
    for (var i = 0; i < focus.flash.length; i++) {
      var node = elFor(focus.flash[i]);
      if (!node) continue;
      node.classList.remove("flash");
      void node.offsetWidth; /* restart the animation */
      node.classList.add("flash");
    }
    setTimeout(function () { clearClass("flash"); }, 1600);
  }

  function glowFocus(m) {
    clearClass("answerglow");
    var focus = missionFocus(m, st.cells);
    for (var i = 0; i < focus.glow.length; i++) {
      var node = elFor(focus.glow[i]);
      if (node) node.classList.add("answerglow");
    }
  }

  /* ---- taps on the table: select, light what a total adds up, judge the mission ---- */
  function onSelect(selDesc, tap) {
    sel = selDesc;
    renderSelection();
    if (tap.kind === "cell") clearClass("lit", sheet); else litForSel();
    renderTag();
    sTap();
    missionTap(tap);
  }

  function onCellTap(r, c) { var d = { kind: "cell", r: r, c: c }; onSelect(d, d); }
  function onTotalTap(d) { onSelect(d, d); }
  function onRowHeadTap(r) { var d = { kind: "rowHead", r: r }; onSelect(d, d); }
  function onColHeadTap(c) { var d = { kind: "colHead", c: c }; onSelect(d, d); }

  /* ---- + and − ---- */
  function onChange(dir) {
    if (sel.kind !== "cell") return; /* total boxes cannot be edited */
    var i = idx(sel.r, sel.c);
    var v = st.cells[i] + dir;
    if (v < 0 || v > MAX) { dir > 0 ? sPlus() : sMinus(); return; }
    var before = st.cells.slice();
    st.cells[i] = v;
    dir > 0 ? sPlus() : sMinus();
    renderCell(sel.r, sel.c);
    renderTotals(before);
    renderChart();
    missionChange(before);
    save();
  }

  /* ---- top-bar buttons ---- */
  function disarmAgain() {
    againArmed = false;
    clearTimeout(armTimer);
    againBtn.classList.remove("arm");
    againBtn.textContent = "Start again";
  }

  function onAgain() {
    if (!againArmed) {
      againArmed = true;
      againBtn.classList.add("arm");
      againBtn.textContent = "Tap again to clear";
      armTimer = setTimeout(disarmAgain, 2600);
      sTap();
      return;
    }
    disarmAgain();
    st.cells = emptyCells();
    st.missionIdx = 0;
    st.misses = 0;
    clearClass("answerglow");
    clearClass("lit", sheet);
    sel = { kind: "cell", r: 0, c: 0 };
    renderAll();
    save();
    sTap();
  }

  function onFreePlay() {
    st.freePlay = !st.freePlay;
    document.body.classList.toggle("free", st.freePlay);
    freeBtn.setAttribute("aria-pressed", st.freePlay ? "true" : "false");
    if (!st.freePlay) syncMission();
    save();
    sTap();
  }

  function onSound() {
    st.sound = !st.sound;
    soundBtn.setAttribute("aria-pressed", st.sound ? "true" : "false");
    soundBtn.setAttribute("aria-label", st.sound ? "Sound on" : "Sound off");
    save();
    if (st.sound) sTap();
  }

  /* ---- tiny WebAudio blips, no audio files ---- */
  var actx = null;

  function ensureAudio() {
    if (!st.sound) return null;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!actx) {
      try { actx = new AC(); } catch (e) { actx = null; }
    }
    if (actx && actx.state === "suspended") actx.resume();
    return actx;
  }

  function blip(freq, dur, type, gain, delay) {
    var c = ensureAudio();
    if (!c) return;
    var t = c.currentTime + (delay || 0);
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || "sine";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain || 0.12, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.09));
    o.connect(g);
    g.connect(c.destination);
    o.start(t);
    o.stop(t + (dur || 0.09) + 0.03);
  }

  function sTap()   { blip(540, 0.06, "sine", 0.1); }
  function sPlus()  { blip(660, 0.07); blip(880, 0.08, "sine", 0.1, 0.06); }
  function sMinus() { blip(440, 0.07); blip(330, 0.09, "sine", 0.1, 0.06); }
  function sTotal() { blip(784, 0.08, "triangle", 0.09); }
  function sDone()  { blip(523, 0.12, "sine", 0.12, 0); blip(659, 0.12, "sine", 0.12, 0.09); blip(784, 0.16, "sine", 0.12, 0.18); }

  /* Sound starts on the first touch, when the browser allows it. */
  ["pointerdown", "touchstart", "keydown"].forEach(function (ev) {
    document.addEventListener(ev, ensureAudio, { once: true, capture: true, passive: true });
  });

  /* ---- saving ---- */
  function save() {
    if (!store) return;
    store.setItem(KEY, JSON.stringify({ cells: st.cells, missionIdx: st.missionIdx, misses: st.misses, freePlay: st.freePlay, sound: st.sound }));
  }

  /* ---- wire up and first paint ---- */
  buildSheet();
  buildChart();
  buildStars();
  renderAll();
  document.body.classList.toggle("free", st.freePlay);
  freeBtn.setAttribute("aria-pressed", st.freePlay ? "true" : "false");
  soundBtn.setAttribute("aria-pressed", st.sound ? "true" : "false");

  plusBtn.addEventListener("click", function () { onChange(1); });
  minusBtn.addEventListener("click", function () { onChange(-1); });
  againBtn.addEventListener("click", onAgain);
  freeBtn.addEventListener("click", onFreePlay);
  soundBtn.addEventListener("click", onSound);
  document.addEventListener("pointerdown", function (e) {
    if (againArmed && !againBtn.contains(e.target)) disarmAgain();
  });

  syncMission();
}

if (typeof document !== "undefined" && typeof window !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", FirstSheetUI);
  else FirstSheetUI();
}
