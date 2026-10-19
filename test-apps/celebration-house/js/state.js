/* Celebration House — the house document, undo/redo, and save slots.
 *
 * One plain JSON document describes a whole decorated house. Undo is a stack
 * of whole-document snapshots: a house is a few kilobytes, so snapshotting is
 * simpler and far harder to get wrong than inverse operations.
 *
 * Storage is localStorage behind try/catch everywhere: a private window or a
 * full quota must cost the child their autosave, never the app.
 */
(function (root) {
  "use strict";

  var SCHEMA = 1;
  /* v2: the grand mansion (2026-10-19). v1 slots held the retired cottage; they
 * are left untouched in storage (never overwritten), just no longer listed. */
  var PREFIX = "celebration-house.v2.slot.";
  var UNDO_LIMIT = 60;
  var MAX_SLOTS = 8;
  /* A house's NAME is a picture and a colour — chosen, never typed, so a
   * five-year-old can tell their house from a sibling's. */
  var BADGE_COLOURS = ["#c4303e", "#3a6fd1", "#2f8a4f", "#e0a400", "#8a4dc9", "#e8618c"];

  function blankHouse(houseId, eventId, fixtures) {
    return {
      schema: SCHEMA, house: houseId, event: eventId,
      night: false, master: true, snap: true, dream: false,
      music: { on: true, vol: 0.5 },
      badge: { pic: "", color: BADGE_COLOURS[0] },
      seq: 1, decorations: [], strands: [],
      fixtures: JSON.parse(JSON.stringify(fixtures || {})),
      others: {},     /* the houses of the OTHER holidays, parked: { eventId: {decorations, strands, fixtures, night, master, dream} } */
      updated: 0
    };
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function num(v, lo, hi, dflt) {
    var n = Number(v);
    if (!isFinite(n)) return dflt;
    return Math.max(lo, Math.min(hi, n));
  }
  function isPt(p) { return Array.isArray(p) && p.length === 2 && isFinite(p[0]) && isFinite(p[1]); }
  var HEX = /^#[0-9a-fA-F]{6}$/;
  var STYLES = ["fairy", "globe", "star", "icicle"];
  var EFFECTS = ["steady", "twinkle", "fade"];

  /* A save written by an older or newer build, or edited by hand, must load
   * as much as is sane and drop the rest — never throw on a child's house. */
  function sanitize(doc, known) {
    if (!doc || typeof doc !== "object") return null;
    var out = blankHouse(String(doc.house || "mansion"), String(doc.event || "christmas"), doc.fixtures);
    out.night = !!doc.night;
    out.master = doc.master !== false;
    out.snap = doc.snap !== false;
    out.dream = !!doc.dream;
    if (doc.badge && typeof doc.badge === "object") {
      out.badge = {
        pic: typeof doc.badge.pic === "string" && doc.badge.pic.length <= 80 ? doc.badge.pic : "",
        color: HEX.test(doc.badge.color) ? doc.badge.color : BADGE_COLOURS[0]
      };
    }
    if (doc.music) out.music = { on: doc.music.on !== false, vol: num(doc.music.vol, 0, 1, 0.5) };
    out.updated = num(doc.updated, 0, 1e15, 0);
    var maxId = 0;
    (Array.isArray(doc.decorations) ? doc.decorations : []).forEach(function (d) {
      if (!d || typeof d.kind !== "string") return;
      if (known && !known(d.pack, d.kind)) return;
      var id = String(d.id || "");
      out.decorations.push({
        id: id, pack: String(d.pack || "christmas"), kind: d.kind,
        x: num(d.x, -5000, 20000, 0), y: num(d.y, -5000, 20000, 0),
        s: num(d.s, 0.2, 5, 1), r: num(d.r, -3600, 3600, 0), z: num(d.z, 0, 1e6, 0),
        flip: !!d.flip
      });
      if (d.layer === "dream") out.decorations[out.decorations.length - 1].layer = "dream";
      maxId = Math.max(maxId, parseInt(id.replace(/\D/g, ""), 10) || 0);
    });
    (Array.isArray(doc.strands) ? doc.strands : []).forEach(function (s) {
      if (!s || !Array.isArray(s.pts) || !s.pts.every(isPt)) return;
      var mode = s.mode === "hang" ? "hang" : "path";
      if (mode === "hang" && s.pts.length !== 2) return;
      if (mode === "path" && s.pts.length < 2) return;
      var id = String(s.id || "");
      out.strands.push({
        id: id, mode: mode, pts: s.pts.map(function (p) { return [Number(p[0]), Number(p[1])]; }),
        sag: num(s.sag, -400, 800, 0),
        style: STYLES.indexOf(s.style) >= 0 ? s.style : "fairy",
        colorMode: s.colorMode === "single" ? "single" : "multi",
        color: HEX.test(s.color) ? s.color : "#ffd36b",
        palette: Array.isArray(s.palette) && s.palette.every(function (c) { return HEX.test(c); }) && s.palette.length ? s.palette.slice(0, 8) : null,
        size: num(s.size, 0.5, 2.5, 1), spacing: num(s.spacing, 0.5, 3, 1),
        effect: EFFECTS.indexOf(s.effect) >= 0 ? s.effect : "steady",
        on: s.on !== false,
        behind: !!s.behind
      });
      if (s.layer === "dream") out.strands[out.strands.length - 1].layer = "dream";
      maxId = Math.max(maxId, parseInt(id.replace(/\D/g, ""), 10) || 0);
    });
    out.seq = Math.max(num(doc.seq, 1, 1e9, 1), maxId + 1);
    /* Each holiday keeps its OWN house inside the slot. The top-level lists
     * are the current holiday's; the others wait here until it is chosen again.
     * Older saves have no "others": their decorations belong to the holiday
     * they were made in (doc.event), which is exactly where they already are. */
    if (doc.others && typeof doc.others === "object" && !Array.isArray(doc.others)) {
      Object.keys(doc.others).slice(0, 12).forEach(function (ev) {
        var o = doc.others[ev];
        if (ev === out.event || !/^[a-z0-9-]{1,40}$/.test(ev) || !o || typeof o !== "object") return;
        var sub = sanitize({ house: out.house, event: ev, night: o.night, master: o.master, dream: o.dream,
          decorations: o.decorations, strands: o.strands, fixtures: o.fixtures, seq: out.seq }, known);
        out.others[ev] = { decorations: sub.decorations, strands: sub.strands, fixtures: sub.fixtures,
          night: sub.night, master: sub.master, dream: sub.dream };
        out.seq = Math.max(out.seq, sub.seq);
      });
    }
    return out;
  }

  /* Choose another holiday: park the current holiday's house and bring up that
   * holiday's own (or a fresh empty one). Nothing is deleted. The caller resets
   * undo history (a new Store) and supplies the new holiday's default fixtures. */
  function switchEvent(doc, eventId, defaultFixtures) {
    if (doc.event === eventId) return doc;
    doc.others = doc.others || {};
    doc.others[doc.event] = {
      decorations: doc.decorations, strands: doc.strands, fixtures: doc.fixtures,
      night: doc.night, master: doc.master, dream: doc.dream
    };
    var next = doc.others[eventId];
    delete doc.others[eventId];
    if (!next) next = { decorations: [], strands: [], fixtures: clone(defaultFixtures || {}), night: false, master: true, dream: false };
    doc.event = eventId;
    doc.decorations = next.decorations; doc.strands = next.strands; doc.fixtures = next.fixtures;
    doc.night = next.night; doc.master = next.master; doc.dream = next.dream;
    return doc;
  }

  /* Scene settings (day/night, master switch, music) are not editing steps:
   * undoing a moved bauble must not also switch the night back off. */
  var CARRY = ["night", "master", "music", "snap", "dream", "badge", "event", "others"];
  function carry(from, to) { CARRY.forEach(function (k) { to[k] = from[k]; }); return to; }

  function Store(doc, onChange) {
    this.doc = doc;
    this.undoStack = [];
    this.redoStack = [];
    this.onChange = onChange || function () {};
  }
  Store.prototype.nextId = function (prefix) { return prefix + (this.doc.seq++); };
  /* Call BEFORE mutating: records the state to return to. */
  Store.prototype.checkpoint = function () {
    this.undoStack.push(JSON.stringify(this.doc));
    if (this.undoStack.length > UNDO_LIMIT) this.undoStack.shift();
    this.redoStack.length = 0;
  };
  /* Drop a checkpoint whose gesture turned out to change nothing (a tap). */
  Store.prototype.discardIfUnchanged = function () {
    var top = this.undoStack[this.undoStack.length - 1];
    if (top && top === JSON.stringify(this.doc)) { this.undoStack.pop(); return true; }
    return false;
  };
  Store.prototype.commit = function () { this.doc.updated = Date.now(); this.onChange(this.doc); };
  Store.prototype.canUndo = function () { return this.undoStack.length > 0; };
  Store.prototype.canRedo = function () { return this.redoStack.length > 0; };
  Store.prototype.undo = function () {
    if (!this.undoStack.length) return false;
    this.redoStack.push(JSON.stringify(this.doc));
    this.doc = carry(this.doc, JSON.parse(this.undoStack.pop()));
    this.commit();
    return true;
  };
  Store.prototype.redo = function () {
    if (!this.redoStack.length) return false;
    this.undoStack.push(JSON.stringify(this.doc));
    this.doc = carry(this.doc, JSON.parse(this.redoStack.pop()));
    this.commit();
    return true;
  };

  function storage() {
    try { return root.localStorage || null; } catch (_) { return null; }
  }
  function readSlot(n, known) {
    var ls = storage(); if (!ls) return null;
    try { return sanitize(JSON.parse(ls.getItem(PREFIX + n)), known); } catch (_) { return null; }
  }
  function writeSlot(n, doc) {
    var ls = storage(); if (!ls) return false;
    try { ls.setItem(PREFIX + n, JSON.stringify(doc)); return true; } catch (_) { return false; }
  }
  function clearSlot(n) {
    var ls = storage(); if (!ls) return false;
    try { ls.removeItem(PREFIX + n); return true; } catch (_) { return false; }
  }

  /* Every saved house, by slot number, in order. */
  function listSlots() {
    var ls = storage(), out = [];
    if (!ls) return out;
    try {
      for (var i = 0; i < ls.length; i++) {
        var k = ls.key(i);
        if (k && k.indexOf(PREFIX) === 0) {
          var n = parseInt(k.slice(PREFIX.length), 10);
          if (n >= 0 && n < MAX_SLOTS && String(n) === k.slice(PREFIX.length)) out.push(n);
        }
      }
    } catch (_) { return []; }
    return out.sort(function (a, b) { return a - b; });
  }
  function freeSlot() {
    var used = listSlots();
    for (var n = 0; n < MAX_SLOTS; n++) if (used.indexOf(n) < 0) return n;
    return -1;
  }
  /* Copy a house into a free slot. Never overwrites: returns -1 when full. */
  function duplicateSlot(n, known) {
    var doc = readSlot(n, known), to = freeSlot();
    if (!doc || to < 0) return -1;
    var i = BADGE_COLOURS.indexOf(doc.badge.color);
    doc.badge = { pic: doc.badge.pic, color: BADGE_COLOURS[(i + 1) % BADGE_COLOURS.length] };
    doc.updated = Date.now();
    return writeSlot(to, doc) ? to : -1;
  }

  var api = {
    SCHEMA: SCHEMA, PREFIX: PREFIX, blankHouse: blankHouse, switchEvent: switchEvent, sanitize: sanitize, clone: clone,
    Store: Store, readSlot: readSlot, writeSlot: writeSlot, clearSlot: clearSlot,
    listSlots: listSlots, freeSlot: freeSlot, duplicateSlot: duplicateSlot,
    MAX_SLOTS: MAX_SLOTS, BADGE_COLOURS: BADGE_COLOURS
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.CHState = api;
})(typeof window !== "undefined" ? window : globalThis);
