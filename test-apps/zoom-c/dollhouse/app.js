/* Dollhouse — bedroom play (pilot v2).
 *
 * THE ROOM IS A PLACE, NOT AN EDITOR. That is the whole of the v2 refactor.
 *
 * A doll is made in Make a Doll and arrives here as ONE object: the scene holds
 * `{type:"character", characterId}` and asks character.js to draw it. The room
 * has no idea what a dress is, cannot equip one, and never has to land a shoe on
 * a foot. Every bug that came out of the old design -- a shoe sticker that had
 * to be snapped by hand, a Change that hit the wrong layer, an outline that
 * swallowed taps meant for a worn item -- was a room being asked to do a
 * creator's job.
 *
 * What the room does:
 *   MOVE          drag anything anywhere; picked up comes to the front
 *   BATTERY       in / out, per placed object, from a small behaviour library
 *   ATMOSPHERE    day <-> night, which changes the light and NOTHING else
 *   START AGAIN   clears this room. It never touches My Dolls.
 *
 * There is deliberately no Change here any more. Object customisation belongs
 * in a maker screen -- Make a Doll today, a Toy Workshop later -- so the bed's
 * four bedspreads, the window's four views, the television's four channels, the
 * rug's four motifs and the lamp's three colours are currently fixed at their
 * first variant. That is a real, visible loss of content and it is recorded in
 * the README; restoring it means building the workshop, not re-adding a button.
 *
 * Still no sound of any kind: CONCEPT.md 10 wants a bed per room and that is an
 * open licence question, untouched.
 */

const KIT = window.KIT;
const C = window.Character;
const SAVE_KEY = "dollhouse.pilot.bedroom";
/* 1 room, 2 variants, 3 variants+worn, 4 wear slots, 5 -> objects are typed and
 * a doll is a reference into My Dolls rather than a sticker with clothes on. */
const SAVE_SCHEMA = 5;

const byId = Object.fromEntries(KIT.stickers.map((s) => [s.id, s]));
const ROOMS = KIT.rooms;
/* Only families with a `category` are placeable. Anything with a `slot` belongs
 * to a character and is unreachable from here by construction. */
const PLACEABLE = KIT.stickers.filter((s) => s.category);
const CATEGORIES = [
  { id: "dolls", label: "Dolls" },
  { id: "furniture", label: "Furniture" },
  { id: "toys", label: "Toys" },
  { id: "decor", label: "Decor" },
];

const stage = document.getElementById("stage");
const placed = document.getElementById("placed");
const tray = document.getElementById("tray");
const trayTabs = document.getElementById("trayTabs");
const trayWrap = document.getElementById("trayWrap");
const hintEl = document.getElementById("hint");

let tool = "move";
let scene = [];   // [{uid, type, characterId|assetId, x, y, on}]
let room = 0;
let seq = 1;
let category = "dolls";

/* ------------------------------------------------------------------ state */

function blank() { scene = []; seq = 1; room = 0; }

function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      schema: SAVE_SCHEMA, seq, environmentVariant: ROOMS[room].id, objects: scene,
    }));
  } catch (e) { /* private window, or storage off */ }
}

/* An object naming a character or an asset this app no longer has is dropped,
 * never guessed at. A doll deleted from My Dolls simply stops appearing. */
function sane(it) {
  if (it.type === "character") return !!C.get(it.characterId);
  if (it.type === "asset") {
    const a = byId[it.assetId];
    return !!a && !!a.category;
  }
  return false;
}

function load() {
  let raw;
  try { raw = localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
  if (!raw) return false;
  let d;
  try { d = JSON.parse(raw); } catch (e) { return false; }
  if (!d || d.schema !== SAVE_SCHEMA) return false;
  scene = (d.objects || []).filter(sane);
  seq = d.seq || scene.length + 1;
  const at = ROOMS.findIndex((r) => r.id === d.environmentVariant);
  room = at < 0 ? 0 : at;
  return true;
}

/* ------------------------------------------------------------------ layout
 * Percentages of the room, so a scene survives a resize, a rotation and the gap
 * between a laptop and an iPad. A doll is sized from the BODY, which is what
 * makes her one box however many layers she is made of. */

function boxOf(it) {
  if (it.type === "character") return C.bodySize();
  const a = byId[it.assetId];
  return { w: a.w, h: a.h };
}

const wPct = (it) => (boxOf(it).w / KIT.roomSize.w) * 100;
const hPct = (it) => (boxOf(it).h / KIT.roomSize.h) * 100;

/* --------------------------------------------------------------- rendering */

function behaviourLayers(it, el) {
  const a = byId[it.assetId];
  const b = a && a.battery;
  if (!b) return;
  if (b.behaviour === "spin") {
    const head = document.createElement("div");
    head.className = "spin-head";
    const [px, py] = b.pivot;
    head.style.clipPath = `circle(${b.radius}% at ${px}% ${py}%)`;
    head.style.transformOrigin = `${px}% ${py}%`;
    const img = document.createElement("img");
    img.src = a.variants[0].src;
    img.alt = "";
    head.appendChild(img);
    el.appendChild(head);
  } else {
    const halo = document.createElement("div");
    halo.className = "glow-halo";
    const [gx, gy] = b.at;
    halo.style.background =
      `radial-gradient(circle at ${gx}% ${gy}%, ${b.colour} 0%, ${b.colour}00 62%)`;
    el.appendChild(halo);
  }
  if (a.screen) {
    const off = document.createElement("div");
    off.className = "screen-off";
    const [l, t, w, h] = a.screen.rect;
    off.style.left = l + "%"; off.style.top = t + "%";
    off.style.width = w + "%"; off.style.height = h + "%";
    off.style.borderRadius = a.screen.radius + "%";
    el.appendChild(off);
  }
}

function draw() {
  placed.textContent = "";
  for (const it of scene) {
    const el = document.createElement("div");
    const a = it.type === "asset" ? byId[it.assetId] : null;
    el.className = "sticker" + (it.on && a ? " on beh-" + a.battery.behaviour : "");
    el.dataset.uid = it.uid;
    el.style.left = it.x + "%";
    el.style.top = it.y + "%";
    el.style.width = wPct(it) + "%";
    el.style.height = hPct(it) + "%";

    if (it.type === "character") {
      const ch = C.get(it.characterId);
      el.appendChild(C.element(ch, { className: "in-room" }));
    } else {
      const img = document.createElement("img");
      img.src = a.variants[0].src;
      img.alt = a.label || a.id;
      el.appendChild(img);
      behaviourLayers(it, el);
    }
    placed.appendChild(el);
  }
  markCandidates();
  drawTray();
}

/* ------------------------------------------------------------------- tray */

function buildTabs() {
  trayTabs.textContent = "";
  for (const c of CATEGORIES) {
    const b = document.createElement("button");
    b.className = "tray-tab" + (c.id === category ? " is-on" : "");
    b.setAttribute("role", "tab");
    b.setAttribute("aria-selected", String(c.id === category));
    b.dataset.cat = c.id;
    b.textContent = c.label;
    b.addEventListener("click", () => { category = c.id; buildTabs(); buildTray(); });
    trayTabs.appendChild(b);
  }
}

function buildTray() {
  tray.textContent = "";
  if (category === "dolls") {
    for (const ch of C.loadAll()) {
      const chip = document.createElement("button");
      chip.className = "chip doll-chip";
      chip.dataset.characterId = ch.id;
      chip.setAttribute("role", "listitem");
      /* The thumbnail is the assembled doll, rendered from her own layers --
         so no artwork has to exist for any particular combination. */
      const thumb = C.element(ch, { className: "thumb" });
      const size = C.bodySize();
      thumb.style.aspectRatio = `${size.w} / ${size.h}`;
      chip.appendChild(thumb);
      /* Two verbs on one chip: the doll places her, the footer changes her.
         The footer is the ONLY route to a dress colour once a doll is made, so
         it is a full-width 44px bar rather than the 17px corner pencil it was --
         a four-year-old cannot hit a 17px glyph, and the thing behind it was
         unreachable in practice. */
      const edit = document.createElement("a");
      edit.className = "chip-edit";
      edit.href = "make-doll.html?edit=" + encodeURIComponent(ch.id);
      edit.title = "Change this doll";
      const pen = document.createElement("b");
      pen.textContent = "✎";
      edit.append(pen, "Change");
      chip.appendChild(edit);
      tray.appendChild(chip);
    }
    const make = document.createElement("a");
    make.className = "chip make-chip";
    make.href = "make-doll.html";
    make.innerHTML = '<span class="plus">+</span>';
    const cap = document.createElement("span");
    cap.textContent = "Make a doll";
    make.appendChild(cap);
    tray.appendChild(make);
    return;
  }
  for (const a of PLACEABLE.filter((s) => s.category === category)) {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.dataset.id = a.id;
    chip.setAttribute("role", "listitem");
    const img = document.createElement("img");
    img.src = a.variants[0].src;
    img.alt = "";
    const cap = document.createElement("span");
    cap.textContent = a.label || a.id;
    chip.append(img, cap);
    tray.appendChild(chip);
  }
}

function drawTray() {
  if (category !== "dolls") return;
  /* A doll is one-of-a-kind in the room for the pilot: placing her twice would
     mean two of the same child in one bedroom, which reads as a bug. */
  const inRoom = new Set(scene.filter((i) => i.type === "character").map((i) => i.characterId));
  for (const chip of tray.querySelectorAll(".doll-chip")) {
    chip.classList.toggle("spent", inRoom.has(chip.dataset.characterId));
  }
}

/* ------------------------------------------------------------ environment */

function drawRoom() {
  const r = ROOMS[room];
  document.getElementById("room").src = r.src;
  placed.style.setProperty("--room-dim", r.dim);
  placed.style.setProperty("--room-drain", r.drain);
  const b = document.getElementById("atmos");
  const night = r.id.endsWith("night");
  b.innerHTML = (night ? MOON : SUN) + "<span></span>";
  b.lastChild.textContent = r.label;
  b.classList.toggle("is-on", night);
}

function cycleRoom() {
  room = (room + 1) % ROOMS.length;
  /* Nothing else is touched. Positions, layer order, battery states and every
     doll's appearance are untouched by construction: they are not stored here. */
  drawRoom();
  save();
  say(ROOMS[room].id.endsWith("night") ? "Now it is night time" : "Now it is day time");
}

/* ------------------------------------------------------------------- tools */

function canAct(it) {
  if (it.type !== "asset") return false;
  const a = byId[it.assetId];
  if (tool === "battery-in") return !!a.battery && !it.on;
  if (tool === "battery-out") return !!a.battery && it.on;
  return false;
}

function markCandidates() {
  for (const el of placed.children) {
    const it = scene.find((i) => i.uid === +el.dataset.uid);
    el.classList.toggle("candidate", !!it && canAct(it));
  }
}

let hintTimer = 0;
function say(text) {
  hintEl.textContent = text;
  hintEl.classList.add("show");
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => hintEl.classList.remove("show"), 1900);
}

function setTool(next) {
  tool = next;
  for (const b of document.querySelectorAll(".tool[data-tool]")) {
    const on = b.dataset.tool === next;
    b.classList.toggle("is-on", on);
    b.setAttribute("aria-pressed", String(on));
  }
  markCandidates();
  if (next === "battery-in") say("Tap a toy to put a battery in");
  if (next === "battery-out") say("Tap a toy to take its battery out");
}

function useTool(it) {
  if (it.type !== "asset") return false;
  const a = byId[it.assetId];
  if (!a.battery) return false;
  const want = tool === "battery-in";
  if (it.on === want) return false;
  it.on = want;   // per placed object, never per asset
  return true;
}

/* ------------------------------------------------------------------ moving */

let drag = null;
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

function stagePct(ev) {
  const r = stage.getBoundingClientRect();
  return {
    x: ((ev.clientX - r.left) / r.width) * 100,
    y: ((ev.clientY - r.top) / r.height) * 100,
    inside: ev.clientX >= r.left && ev.clientX <= r.right &&
            ev.clientY >= r.top && ev.clientY <= r.bottom,
  };
}

function flyer(it) {
  const r = stage.getBoundingClientRect();
  const el = document.createElement("div");
  el.id = "flying";
  el.style.width = (wPct(it) / 100) * r.width + "px";
  el.style.aspectRatio = `${boxOf(it).w} / ${boxOf(it).h}`;
  if (it.type === "character") el.appendChild(C.element(C.get(it.characterId)));
  else {
    const img = document.createElement("img");
    img.src = byId[it.assetId].variants[0].src;
    img.alt = "";
    el.appendChild(img);
  }
  document.body.appendChild(el);
  return el;
}

function moveFlyer(ev) {
  if (!drag || !drag.flying) return;
  drag.flying.style.left = ev.clientX + "px";
  drag.flying.style.top = ev.clientY + "px";
}

function onTrayDown(ev) {
  const chip = ev.target.closest(".chip");
  if (!chip || chip.classList.contains("spent")) return;
  if (chip.classList.contains("make-chip") || ev.target.closest(".chip-edit")) return;  // links
  ev.preventDefault();
  const proto = chip.dataset.characterId
    ? { type: "character", characterId: chip.dataset.characterId }
    : { type: "asset", assetId: chip.dataset.id };
  drag = { from: "tray", proto, moved: false, flying: flyer(proto) };
  moveFlyer(ev);
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp, { once: true });
}

function onStageDown(ev) {
  const el = ev.target.closest(".sticker");
  if (!el) return;
  ev.preventDefault();
  const it = scene.find((i) => i.uid === +el.dataset.uid);
  if (!it) return;
  if (tool !== "move") {
    if (useTool(it)) { draw(); save(); }
    return;
  }
  const p = stagePct(ev);
  drag = { from: "stage", uid: it.uid, dx: it.x - p.x, dy: it.y - p.y, el };
  scene.splice(scene.indexOf(it), 1);
  scene.push(it);           // picked up comes to the front
  el.classList.add("dragging");
  placed.appendChild(el);
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp, { once: true });
}

function onMove(ev) {
  if (!drag) return;
  drag.moved = true;
  if (drag.from === "tray") { moveFlyer(ev); return; }
  const p = stagePct(ev);
  const it = scene.find((i) => i.uid === drag.uid);
  if (!it) return;
  it.x = clamp(p.x + drag.dx, 0, 100);
  it.y = clamp(p.y + drag.dy, 0, 100);
  drag.el.style.left = it.x + "%";
  drag.el.style.top = it.y + "%";
  trayWrap.classList.toggle(
    "armed", trayWrap.contains(document.elementFromPoint(ev.clientX, ev.clientY)));
}

function onUp(ev) {
  window.removeEventListener("pointermove", onMove);
  trayWrap.classList.remove("armed");
  if (!drag) return;
  const d = drag;
  drag = null;

  if (d.from === "tray") {
    d.flying.remove();
    const p = stagePct(ev);
    if (d.moved && !p.inside) return;
    scene.push(Object.assign({}, d.proto, {
      uid: seq++, on: false,
      x: clamp(d.moved ? p.x : 50, 0, 100),
      y: clamp(d.moved ? p.y : 62, 0, 100),
    }));
    draw();
    save();
    return;
  }

  d.el.classList.remove("dragging");
  const it = scene.find((i) => i.uid === d.uid);
  if (!it) return;
  if (trayWrap.contains(document.elementFromPoint(ev.clientX, ev.clientY))) {
    scene.splice(scene.indexOf(it), 1);   // dropped on the tray: put it away
  }
  draw();
  save();
}

/* -------------------------------------------------------------------- boot */

const SUN = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.6"/>' +
  '<g stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
  '<path d="M12 1.6v2.6M12 19.8v2.6M1.6 12h2.6M19.8 12h2.6' +
  'M4.7 4.7 6.5 6.5M17.5 17.5l1.8 1.8M19.3 4.7 17.5 6.5M6.5 17.5 4.7 19.3"/></g></svg>';
const MOON = '<svg viewBox="0 0 24 24" aria-hidden="true">' +
  '<path d="M20.4 14.6A8.6 8.6 0 0 1 9.4 3.6a8.6 8.6 0 1 0 11 11z"/>' +
  '<circle cx="17.6" cy="5.4" r="1.5"/><circle cx="20.6" cy="9" r="1"/></svg>';

function start() {
  document.getElementById("room").src = ROOMS[0].src;
  buildTabs();
  if (!load()) { blank(); save(); }
  drawRoom();
  buildTray();
  draw();

  /* Straight back from the creator: show the Dolls shelf so the doll she just
     made is the first thing she sees. */
  const made = new URLSearchParams(location.search).get("doll");
  if (made) { category = "dolls"; buildTabs(); buildTray(); drawTray(); say("Your doll is ready"); }

  tray.addEventListener("pointerdown", onTrayDown);
  stage.addEventListener("pointerdown", onStageDown);
  for (const b of document.querySelectorAll(".tool[data-tool]")) {
    b.addEventListener("click", () => {
      const armed = b.dataset.tool === tool && tool !== "move";
      setTool(armed ? "move" : b.dataset.tool);
    });
  }
  document.getElementById("atmos").addEventListener("click", cycleRoom);
  document.getElementById("reset").addEventListener("click", () => {
    /* Clears THIS ROOM. My Dolls is a different persistence scope and is not
       touched -- a child who tidies the bedroom has not lost her dolls. */
    blank();
    drawRoom();
    buildTray();
    draw();
    save();
    setTool("move");
  });
}

start();

window.DOLLHOUSE = {
  get scene() { return scene; },
  get room() { return ROOMS[room].id; },
  get category() { return category; },
  setCategory: (c) => { category = c; buildTabs(); buildTray(); drawTray(); },
  characters: () => C.loadAll(),
};
