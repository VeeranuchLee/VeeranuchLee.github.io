/* Dollhouse — bedroom pilot.
 *
 * What this is for: to find out whether the three verbs in CONCEPT.md 24 --
 * MOVE IT, POWER IT, CHANGE IT -- are understood by a child without being
 * explained.
 *
 * THE INVARIANT THIS FILE EXISTS TO PROTECT: Change alters appearance, never
 * placement. Every variant of a family is registered onto one shared canvas by
 * tools/cut-sheet.py, so a sprite swap physically cannot move, resize or shift
 * anything -- the geometry lives in the asset pipeline, not in per-object
 * positioning code here. tools/check-variant-alignment.py is the proof, and it
 * fails the build if a future sheet drifts.
 *
 * Because of that, there is exactly one Change implementation for every object
 * in the app. A television, a bed and a dress all cycle through
 * `variants[variantIndex]` and nothing knows what any of them is.
 *
 * NOT IN THE PILOT, ON PURPOSE:
 *   - Sound of any kind. CONCEPT.md 10 wants a music bed per room and that is
 *     an open licence question (see README.md); a silent pilot does not
 *     prejudge it, and the three verbs can be judged without it.
 *   - Screenshot capture, more rooms, resize and flip.
 *   - Layer reordering beyond "what you last touched comes to the front",
 *     which is what a sticker book does anyway.
 */

const KIT = window.KIT;
const SAVE_KEY = "dollhouse.pilot.bedroom";
/* Bump when the shape of a saved scene changes; old saves are then dropped
 * rather than half-read, and replaced. A child's scene is the most valuable
 * thing this app holds, so this went in on day one -- it costs nothing then and
 * cannot be retrofitted. 1 -> 2 added the room, 2 -> 3 added variants. */
const SAVE_SCHEMA = 4;

const byId = Object.fromEntries(KIT.stickers.map((s) => [s.id, s]));
const ROOMS = KIT.rooms;
const DOLL = KIT.stickers.find((s) => s.role === "doll");
/* The order the doll's worn things are drawn in, which is also their layering:
 * the outfit over her body, the shoes over her feet, the bag over the outfit's
 * edge, the bow on top of everything. A slot holds at most one thing, so
 * dropping a second pair of shoes on her replaces the first -- which is what a
 * child expects and what makes "one of each" need no explaining. */
const SLOTS = ["outfit", "feet", "hand", "hair"];

const stage = document.getElementById("stage");
const placed = document.getElementById("placed");
const tray = document.getElementById("tray");
const trayWrap = document.getElementById("trayWrap");
const hintEl = document.getElementById("hint");

let tool = "move";
let scene = [];          // [{ uid, assetId, variantIndex, x, y, on, worn: {slot: ref} }]
let room = 0;
let seq = 1;

/* ----------------------------------------------------------------- variants
 * A "ref" is anything that names an asset and a chosen variant: a placed
 * instance, or the garment a doll is wearing. Everything below works on refs,
 * which is what keeps one implementation for every object type.
 */

function assetOf(ref) {
  return byId[ref.assetId];
}

function srcOf(ref) {
  const a = assetOf(ref);
  return a.variants[ref.variantIndex % a.variants.length].src;
}

function variantName(ref) {
  const a = assetOf(ref);
  return a.variants[ref.variantIndex % a.variants.length].name;
}

/* WHICH ref a Change acts on. The doll herself has one variant, so tapping her
 * has to mean something she is wearing -- and now that she can wear four things
 * at once, it means the one you actually touched. `slot` comes from the layer
 * under the finger; without one (her body, her hair) it falls back to the
 * outfit, which keeps "tap the girl, the dress changes" true.
 *
 * This is still the only place the doll is special, and it is only about which
 * ref to hand over. cycleVariant below does not know a dress from a duvet. */
function changeTarget(item, slot) {
  if (!item.worn) return item;
  if (slot && item.worn[slot]) return item.worn[slot];
  if (item.worn.outfit) return item.worn.outfit;
  for (const s of SLOTS) if (item.worn[s]) return item.worn[s];
  return item;
}

function cycleVariant(ref) {
  const n = assetOf(ref).variants.length;
  if (n < 2) return false;
  ref.variantIndex = (ref.variantIndex + 1) % n;
  return true;
}

function newRef(assetId, variantIndex) {
  return { assetId, variantIndex: variantIndex || 0 };
}

/* Where a worn thing sits on the doll. The garments share one measured fit
 * because they are drawn to one scale on the sheet; the shoes, bag and bow each
 * carry their own, because they attach to her feet, her hand and her crown. */
function fitOf(asset) {
  return asset.fit || KIT.wearFit;
}

/* ------------------------------------------------------------------ state */

function blank() {
  scene = [];
  seq = 1;
  room = 0;
}

function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(
      { schema: SAVE_SCHEMA, seq, room: ROOMS[room].id, scene }));
  } catch (e) {
    /* A private window, or storage turned off. The scene still works while the
       page is open; losing it later beats failing now. */
  }
}

function clampVariant(ref) {
  const a = byId[ref.assetId];
  if (!a) return false;
  ref.variantIndex = Math.min(Math.max(ref.variantIndex | 0, 0), a.variants.length - 1);
  return true;
}

function sane(item) {
  if (!clampVariant(item)) return false;
  if (assetOf(item).role === "doll") {
    const worn = {};
    for (const slot of SLOTS) {
      const ref = item.worn && item.worn[slot];
      // A slot naming an asset this kit no longer has, or a thing whose family
      // has moved to a different slot, is dropped rather than drawn somewhere
      // nobody chose.
      if (ref && clampVariant(ref) && byId[ref.assetId].wear === slot) worn[slot] = ref;
    }
    item.worn = worn;
  } else {
    delete item.worn;
  }
  return true;
}

function load() {
  let raw;
  try {
    raw = localStorage.getItem(SAVE_KEY);
  } catch (e) {
    return false;
  }
  if (!raw) return false;
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    return false;
  }
  if (!data || data.schema !== SAVE_SCHEMA) return false;
  // Anything naming an asset or variant this kit no longer has is dropped or
  // clamped, never guessed at.
  scene = (data.scene || []).filter(sane);
  seq = data.seq || scene.length + 1;
  // Saved by name, not by index, so inserting a room in the middle of the list
  // cannot silently move somebody's scene to a different time of day.
  const at = ROOMS.findIndex((r) => r.id === data.room);
  room = at < 0 ? 0 : at;
  return true;
}

/* ------------------------------------------------------------------ layout
 * Stickers are positioned and sized in percentages of the room, so a scene
 * survives a resize, a rotation, and the gap between this screen and an iPad's.
 * A sticker's width is its family's registered canvas width as a share of the
 * room's -- one number for every variant, which is the other half of why a
 * Change cannot resize anything.
 */

function widthPct(a) {
  return (a.w / KIT.roomSize.w) * 100;
}

function heightPct(a) {
  return (a.h / KIT.roomSize.h) * 100;
}

/* --------------------------------------------------------------- rendering */

function behaviourLayers(item, el) {
  const a = assetOf(item);
  const b = a.battery;
  if (b) {
    if (b.behaviour === "spin") {
      const head = document.createElement("div");
      head.className = "spin-head";
      const [px, py] = b.pivot;
      head.style.clipPath = `circle(${b.radius}% at ${px}% ${py}%)`;
      head.style.transformOrigin = `${px}% ${py}%`;
      const img = document.createElement("img");
      img.src = srcOf(item);
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
  }
  // A screen goes dark when the battery is out and KEEPS ITS CHANNEL: the
  // channel is the variant, the power is a separate flag, and neither touches
  // the other. The rectangle was measured off the art -- it is exactly where
  // the four channels differ from each other -- and because all four are
  // registered onto one canvas, one rectangle serves every channel.
  if (a.screen) {
    const off = document.createElement("div");
    off.className = "screen-off";
    const [l, t, w, h] = a.screen.rect;
    off.style.left = l + "%";
    off.style.top = t + "%";
    off.style.width = w + "%";
    off.style.height = h + "%";
    off.style.borderRadius = a.screen.radius + "%";
    el.appendChild(off);
  }
}

function draw() {
  placed.textContent = "";
  for (const item of scene) {
    const a = assetOf(item);
    const el = document.createElement("div");
    el.className = "sticker" + (item.on ? " on beh-" + a.battery.behaviour : "");
    el.dataset.uid = item.uid;
    el.style.left = item.x + "%";
    el.style.top = item.y + "%";
    el.style.width = widthPct(a) + "%";
    el.style.height = heightPct(a) + "%";

    const img = document.createElement("img");
    img.src = srcOf(item);
    img.alt = a.label || a.id;
    el.appendChild(img);

    behaviourLayers(item, el);

    // A worn garment is drawn inside the doll's own box, so she and her clothes
    // are one thing to pick up, to drag and to save. Because every colourway of
    // a garment shares one registered canvas, this fit serves all of them and a
    // Change cannot move a hem.
    if (item.worn) {
      for (const slot of SLOTS) {
        const ref = item.worn[slot];
        if (!ref) continue;
        const g = assetOf(ref);
        const f = fitOf(g);
        const worn = document.createElement("img");
        worn.className = "worn";
        worn.dataset.slot = slot;
        worn.src = srcOf(ref);
        worn.alt = g.label;
        const wPct = (g.w * f.scale) / a.w * 100;
        const hPct = (g.h * f.scale) / a.h * 100;
        worn.style.width = wPct + "%";
        worn.style.height = hPct + "%";
        worn.style.left = f.cx - wPct / 2 + "%";
        if (f.bottom !== undefined) worn.style.top = f.bottom * 100 - hPct + "%";
        else worn.style.top = f.top * 100 + "%";
        el.appendChild(worn);
      }
    }
    placed.appendChild(el);
  }
  markCandidates();
  drawTray();
}

function drawTray() {
  const wornIds = new Set();
  for (const it of scene) {
    for (const slot of SLOTS) {
      if (it.worn && it.worn[slot]) wornIds.add(it.worn[slot].assetId);
    }
  }
  for (const chip of tray.children) {
    const id = chip.dataset.id;
    const used = scene.some((i) => i.assetId === id) || wornIds.has(id);
    // The doll and her clothes are one-of-a-kind. The furniture is not, and a
    // dollhouse with unlimited copies is one of the reasons to be digital --
    // it is also what lets two televisions show two different channels.
    const unique = id === DOLL.id || !!byId[id].wear;
    // Boolean() rather than a bare `&&`: `wear` is absent on furniture, and
    // classList.toggle(c, undefined) counts as "no second argument" and FLIPS
    // the class instead of clearing it.
    chip.classList.toggle("spent", Boolean(unique && used));
  }
}

function buildTray() {
  for (const a of KIT.stickers) {
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
    if (a.variants.length > 1) {
      const dot = document.createElement("b");
      dot.className = "many";
      dot.textContent = a.variants.length;
      chip.appendChild(dot);
    }
    tray.appendChild(chip);
  }
}

/* ------------------------------------------------------------------ rooms */

function drawRoom() {
  const r = ROOMS[room];
  document.getElementById("room").src = r.src;
  // The room lights the things standing in it. A toy that is switched on lights
  // itself and is exempt (see styles.css), which is the reward for the Battery
  // verb after dark.
  placed.style.setProperty("--room-dim", r.dim);
  placed.style.setProperty("--room-drain", r.drain);
  for (const b of document.querySelectorAll(".room-pick")) {
    const on = +b.dataset.room === room;
    b.classList.toggle("is-on", on);
    b.setAttribute("aria-pressed", String(on));
  }
}

function setRoom(next) {
  if (next === room) return;
  room = next;
  // Nothing else is touched. CONCEPT.md 9: the environment changes around the
  // child's story, and every sticker, position, layer, outfit, variant and
  // battery keeps exactly what it had.
  drawRoom();
  save();
  say(ROOMS[room].id.endsWith("night") ? "Now it is night time" : "Now it is day time");
}

/* ------------------------------------------------------------------- tools */

function canAct(item) {
  const a = assetOf(item);
  if (tool === "battery-in") return !!a.battery && !item.on;
  if (tool === "battery-out") return !!a.battery && item.on;
  if (tool === "change") {
    // She is a candidate if ANY of the things on her can change, not just the
    // one a default tap would reach.
    if (item.worn) {
      for (const slot of SLOTS) {
        const r = item.worn[slot];
        if (r && assetOf(r).variants.length > 1) return true;
      }
    }
    return assetOf(changeTarget(item)).variants.length > 1;
  }
  return false;
}

function markCandidates() {
  for (const el of placed.children) {
    const item = scene.find((i) => i.uid === +el.dataset.uid);
    el.classList.toggle("candidate", !!item && canAct(item));
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
  placed.classList.toggle("picking", next === "change");
  if (next === "battery-in") say("Tap a toy to put a battery in");
  if (next === "battery-out") say("Tap a toy to take its battery out");
  if (next === "change") say("Tap something to change how it looks");
}

function useTool(item, slot) {
  const a = assetOf(item);
  if (tool === "battery-in" || tool === "battery-out") {
    if (!a.battery) return false;
    const want = tool === "battery-in";
    if (item.on === want) return false;
    item.on = want;
    return true;
  }
  if (tool === "change") {
    // One implementation, every object. Nothing here knows whether it is
    // changing a dress, a duvet, a television channel or the weather.
    return cycleVariant(changeTarget(item, slot));
  }
  return false;
}

/* ------------------------------------------------------------------ moving */

let drag = null;

function stagePct(ev) {
  const r = stage.getBoundingClientRect();
  return {
    x: ((ev.clientX - r.left) / r.width) * 100,
    y: ((ev.clientY - r.top) / r.height) * 100,
    inside: ev.clientX >= r.left && ev.clientX <= r.right &&
            ev.clientY >= r.top && ev.clientY <= r.bottom,
  };
}

function flyer(a) {
  const r = stage.getBoundingClientRect();
  const el = document.createElement("img");
  el.id = "flying";
  el.src = a.variants[0].src;
  el.alt = "";
  el.style.width = (widthPct(a) / 100) * r.width + "px";
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
  ev.preventDefault();
  const a = byId[chip.dataset.id];
  drag = { from: "tray", assetId: a.id, moved: false, flying: flyer(a) };
  moveFlyer(ev);
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp, { once: true });
}

function onStageDown(ev) {
  const el = ev.target.closest(".sticker");
  if (!el) return;
  ev.preventDefault();
  const item = scene.find((i) => i.uid === +el.dataset.uid);
  if (!item) return;

  if (tool !== "move") {
    // `.worn` layers only accept the pointer while Change is armed (styles.css),
    // so in Move mode she and her clothes stay one thing to pick up.
    const layer = ev.target.closest(".worn");
    if (useTool(item, layer && layer.dataset.slot)) {
      draw();
      save();
    }
    return;
  }
  const p = stagePct(ev);
  drag = { from: "stage", uid: item.uid, moved: false,
           dx: item.x - p.x, dy: item.y - p.y, el };
  // Picked up means on top, which is what a sticker book does.
  scene.splice(scene.indexOf(item), 1);
  scene.push(item);
  el.classList.add("dragging");
  placed.appendChild(el);
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp, { once: true });
}

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

function onMove(ev) {
  if (!drag) return;
  drag.moved = true;
  if (drag.from === "tray") {
    moveFlyer(ev);
    return;
  }
  const p = stagePct(ev);
  const item = scene.find((i) => i.uid === drag.uid);
  if (!item) return;
  item.x = clamp(p.x + drag.dx, 0, 100);
  item.y = clamp(p.y + drag.dy, 0, 100);
  drag.el.style.left = item.x + "%";
  drag.el.style.top = item.y + "%";
  trayWrap.classList.toggle(
    "armed", trayWrap.contains(document.elementFromPoint(ev.clientX, ev.clientY)));
}

/* Where a garment is dropped decides what happens to it: on the girl, she puts
   it on; anywhere else it lies on the floor like any other sticker. */
function dollUnder(x, y, skipUid) {
  for (let i = scene.length - 1; i >= 0; i--) {
    const it = scene[i];
    if (it.uid === skipUid || assetOf(it).role !== "doll") continue;
    const a = assetOf(it);
    if (Math.abs(x - it.x) <= widthPct(a) / 2 && Math.abs(y - it.y) <= heightPct(a) / 2) {
      return it;
    }
  }
  return null;
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
    if (d.moved && !p.inside) return;          // dropped outside: put it back
    // A tap, rather than a drag, still puts the sticker somewhere sensible.
    const x = d.moved ? p.x : 50;
    const y = d.moved ? p.y : 62;
    const a = byId[d.assetId];
    const host = a.wear ? dollUnder(x, y, null) : null;
    if (host) {
      host.worn[a.wear] = newRef(a.id, 0);
    } else {
      scene.push({
        uid: seq++, assetId: a.id, variantIndex: 0,
        x: clamp(x, 0, 100), y: clamp(y, 0, 100),
        on: false, worn: a.role === "doll" ? {} : undefined,
      });
    }
    draw();
    save();
    return;
  }

  d.el.classList.remove("dragging");
  const item = scene.find((i) => i.uid === d.uid);
  if (!item) return;

  // Dropped on the tray: put it away.
  if (trayWrap.contains(document.elementFromPoint(ev.clientX, ev.clientY))) {
    scene.splice(scene.indexOf(item), 1);
    draw();
    save();
    return;
  }
  // Anything she can wear, dropped on her, is worn -- and keeps the colour it
  // had. Shoes, the bag and the bow snap exactly the way a garment does; that
  // they did not was the whole point of this change.
  const dropped = assetOf(item);
  if (dropped.wear) {
    const host = dollUnder(item.x, item.y, item.uid);
    if (host) {
      host.worn[dropped.wear] = newRef(item.assetId, item.variantIndex);
      scene.splice(scene.indexOf(item), 1);
    }
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

function buildRooms() {
  const host = document.getElementById("rooms");
  ROOMS.forEach((r, i) => {
    const b = document.createElement("button");
    b.className = "tool room-pick";
    b.dataset.room = i;
    b.setAttribute("aria-pressed", "false");
    b.innerHTML = (r.id.endsWith("night") ? MOON : SUN) + "<span></span>";
    b.lastChild.textContent = r.label;
    host.appendChild(b);
  });
}

function start() {
  buildRooms();
  buildTray();
  if (!load()) {
    // Either nothing was saved, or what was saved is from an older schema and
    // was dropped rather than half-read. Write the empty scene back either way,
    // so storage never holds a record the app has already refused.
    blank();
    save();
  }
  drawRoom();
  draw();

  tray.addEventListener("pointerdown", onTrayDown);
  stage.addEventListener("pointerdown", onStageDown);
  for (const b of document.querySelectorAll(".tool[data-tool]")) {
    b.addEventListener("click", () => setTool(b.dataset.tool));
  }
  for (const b of document.querySelectorAll(".room-pick")) {
    b.addEventListener("click", () => setRoom(+b.dataset.room));
  }
  document.getElementById("reset").addEventListener("click", () => {
    blank();
    drawRoom();
    draw();
    save();
    setTool("move");
  });
  /* THERE IS DELIBERATELY NO `gesturestart` PREVENTDEFAULT HERE.
   *
   * There was, to stop the page pinch-zooming mid-drag, and on a real iPad it
   * made the app a trap: once it had zoomed in by any other route the child
   * could never pinch back out, because every following pinch was cancelled at
   * gesturestart. You could get in and not out, which is the worst shape a bug
   * can have on a device handed to a seven-year-old.
   *
   * iOS has ignored `user-scalable=no` and `maximum-scale` since iOS 10, on
   * purpose -- zoom is an accessibility feature and a page does not get to take
   * it away. So zoom WILL happen, and the only safe design is one where it is
   * symmetric: whatever gets you in gets you out.
   *
   * What replaces it is narrower and is in styles.css: `touch-action:
   * manipulation` kills double-tap-to-zoom, which is what a child rapidly
   * tapping stickers actually triggers by accident, while leaving pinch alone
   * in both directions. The drag surfaces keep `touch-action: none`, which stops
   * the browser panning or zooming for a touch that STARTS on a sticker -- that
   * is what protects a drag, and it never blocks a pinch elsewhere.
   */

  // Handy in the console, and what the acceptance run drives.
  window.DOLLHOUSE = {
    get scene() { return scene; },
    get room() { return ROOMS[room].id; },
    variantOf: (uid, slot) => {
      const it = scene.find((i) => i.uid === uid);
      return it && variantName(changeTarget(it, slot));
    },
    wornOn: (uid) => {
      const it = scene.find((i) => i.uid === uid);
      if (!it || !it.worn) return null;
      const out = {};
      for (const slot of SLOTS) {
        if (it.worn[slot]) out[slot] = it.worn[slot].assetId + ":" + variantName(it.worn[slot]);
      }
      return out;
    },
  };
}

start();
