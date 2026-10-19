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
  var PREFIX = "celebration-house.v1.slot.";
  var UNDO_LIMIT = 60;

  function blankHouse(houseId, eventId, fixtures) {
    return {
      schema: SCHEMA, house: houseId, event: eventId,
      night: false, master: true,
      music: { on: true, vol: 0.5 },
      seq: 1, decorations: [], strands: [],
      fixtures: JSON.parse(JSON.stringify(fixtures || {})),
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
    var out = blankHouse(String(doc.house || "cottage"), String(doc.event || "christmas"), doc.fixtures);
    out.night = !!doc.night;
    out.master = doc.master !== false;
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
        on: s.on !== false
      });
      maxId = Math.max(maxId, parseInt(id.replace(/\D/g, ""), 10) || 0);
    });
    out.seq = Math.max(num(doc.seq, 1, 1e9, 1), maxId + 1);
    return out;
  }

  /* Scene settings (day/night, master switch, music) are not editing steps:
   * undoing a moved bauble must not also switch the night back off. */
  var CARRY = ["night", "master", "music"];
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

  var api = {
    SCHEMA: SCHEMA, PREFIX: PREFIX, blankHouse: blankHouse, sanitize: sanitize, clone: clone,
    Store: Store, readSlot: readSlot, writeSlot: writeSlot, clearSlot: clearSlot
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.CHState = api;
})(typeof window !== "undefined" ? window : globalThis);
