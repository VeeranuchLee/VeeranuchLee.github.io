/* Celebration House — the editor.
 *
 * One continuous house in one scene-coordinate system. The camera (view) is
 * the only thing pan and zoom change; decorations and light strings are
 * stored in scene units, so they cannot drift however the child zooms.
 *
 * Gesture grammar (touch first):
 *   one finger on a decoration .......... select + move it
 *   one finger on a light string ......... select + move it
 *   one finger on empty house ............ pan; a quick tap visits that room
 *   two fingers anywhere ................. pinch-zoom / pan the house
 *   lights mode (Lights tab, a style on) . one finger hangs or draws lights
 * Handles (rotate, resize, light points) sit in a screen-space overlay so
 * they stay finger-sized at every zoom level.
 */
(function () {
  "use strict";
  var G = window.CHGeom, S = window.CHState, A = window.CHAudio;
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function icon(name) { return '<svg><use href="#i-' + name + '"/></svg>'; }

  var viewport = $("viewport"), world = $("world"), decosEl = $("decos"), overlay = $("overlay");
  var house = null, packs = {}, pack = null, decoIndex = {}, houseSvgText = "";
  var store = null, slot = 0;
  var view = { k: 1, tx: 0, ty: 0 }, vw = 0, vh = 0, overviewView = null;
  var currentArea = "overview";
  var sel = null;                     // { type: "deco" | "strand" | "topper", id }
  var placing = null;                 // { style, mode: "hang" | "draw" }
  var lastStrand = { style: "fairy", colorMode: "multi", color: "#ffd36b", effect: "twinkle", size: 1, spacing: 1 };
  var activeTab = "decorations";
  var renderer = new window.CHLights.Renderer($("lights"));
  var preview = null;
  var pointers = new Map(), gesture = null;
  var decoEls = new Map();
  var dirty = true, rafOn = false, lastFrame = 0, t0 = performance.now();

  function fetchJSON(u) { return fetch(u).then(function (r) { if (!r.ok) throw new Error(u + " " + r.status); return r.json(); }); }
  function known(p, k) { return !!decoIndex[(p || "christmas") + "/" + k]; }
  function defOf(d) { return decoIndex[d.pack + "/" + d.kind]; }
  function clampN(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ------------------------------------------------------------ boot */
  function boot() {
    return Promise.all([fetchJSON("data/house-cottage.json"), fetchJSON("packs/index.json")]).then(function (r) {
      house = r[0];
      var idx = r[1];
      return Promise.all(idx.packs.map(function (p) {
        return fetchJSON(p.path).then(function (pk) {
          pk._base = p.path.replace(/[^/]+$/, "");
          packs[pk.id] = pk;
          pk.decorations.forEach(function (d) { decoIndex[pk.id + "/" + d.id] = Object.assign({ pack: pk.id, src: pk._base + d.art }, d); });
        });
      })).then(function () {
        pack = packs[idx.defaultEvent];
        // A placeholder plate is inline SVG (its windows are styleable); a painted plate is
        // a raster image and must be an <img> -- fetching it as text inlines binary noise.
        if (!/\.svg(\?|$)/i.test(house.art)) return null;
        return fetch(house.art).then(function (r) { return r.text(); });
      });
    }).then(function (svg) {
      houseSvgText = svg || "";
      if (svg) $("house").innerHTML = svg;
      else { $("house").innerHTML = ""; var plate = el("img", "plate"); plate.alt = ""; plate.draggable = false; plate.src = house.art; $("house").appendChild(plate); }
      renderHome();
    }).catch(function (err) {
      document.body.innerHTML = '<p style="color:#fff;padding:30px;font:20px system-ui">Celebration House could not load (' + String(err && err.message || err) + ').</p>';
    });
  }

  function packFixtures(pk) { return (pk.fixtures || []); }
  function defaultFixtureState(pk) {
    var out = {};
    packFixtures(pk).forEach(function (f) { if (f.topper) out[f.id] = { topper: S.clone(f.topper.default) }; });
    return out;
  }

  /* ------------------------------------------------------------ home */
  function slotSummary(n) { return S.readSlot(n, known); }

  function renderHome() {
    var wrap = $("slots");
    wrap.innerHTML = "";
    [0, 1].forEach(function (n) {
      var doc = slotSummary(n);
      var used = doc && (doc.decorations.length || doc.strands.length);
      var card = el("button", "slot");
      card.setAttribute("aria-label", "House " + (n + 1));
      card.dataset.slot = n;
      card.innerHTML =
        '<div class="pic"><img alt="" src="' + house.art + '"><span class="roof-badge" style="background:' + (n ? "#3a6fd1" : "#c4303e") + '">' + (n + 1) + "</span></div>" +
        '<div class="counts">' + (used
          ? "<span>" + icon("deco") + doc.decorations.length + "</span><span>" + icon("bulb") + doc.strands.length + "</span>"
          : icon("plus")) + "</div>";
      card.addEventListener("click", function () { openSlot(n); });
      if (used) {
        var reset = el("span", "btn reset", icon("trash"));
        reset.setAttribute("role", "button");
        reset.setAttribute("aria-label", "Start this house again");
        reset.addEventListener("click", function (e) {
          e.stopPropagation();
          confirmBox(icon("house") + icon("trash"), function () { S.clearSlot(n); A.play("swish"); renderHome(); });
        });
        card.appendChild(reset);
      }
      wrap.appendChild(card);
    });
  }

  function confirmBox(picHtml, yes) {
    var box = $("confirm");
    box.querySelector(".modal-pic").innerHTML = picHtml;
    box.hidden = false;
    function close() { box.hidden = true; $("confirm-yes").onclick = $("confirm-no").onclick = null; }
    $("confirm-yes").onclick = function () { close(); yes(); };
    $("confirm-no").onclick = close;
  }

  /* ------------------------------------------------------------ open a house */
  function openSlot(n) {
    A.kick();
    slot = n;
    var doc = S.readSlot(n, known) || S.blankHouse(house.id, pack.id, defaultFixtureState(pack));
    var defaults = defaultFixtureState(packs[doc.event] || pack);
    Object.keys(defaults).forEach(function (k) { if (!doc.fixtures[k] || !doc.fixtures[k].topper) doc.fixtures[k] = defaults[k]; });
    pack = packs[doc.event] || pack;
    store = new S.Store(doc, onChange);
    sel = null; placing = null; preview = null;
    decoEls.forEach(function (e) { e.remove(); }); decoEls.clear();
    $("home").hidden = true;
    $("app").hidden = false;
    renderFixtures();
    applySkin();
    setTab("decorations");
    layout();
    view = Object.assign({}, overviewView);
    currentArea = "";
    applyView();
    setArea("overview");
    onChange(store.doc, true);
    showHint(store.doc.decorations.length ? null : "deco");
  }

  function goHome() {
    saveNow();
    A.switchTo(null, "home");
    $("app").hidden = true;
    $("panel").hidden = true;
    $("home").hidden = false;
    renderHome();
  }

  /* The event pack owns the atmosphere: sky colours and how dark night is. */
  function applySkin() {
    var sk = pack.skin || {}, st = document.documentElement.style;
    if (sk.skyDay) { st.setProperty("--sky-day-1", sk.skyDay[0]); st.setProperty("--sky-day-2", sk.skyDay[1]); }
    if (sk.skyNight) { st.setProperty("--sky-night-1", sk.skyNight[0]); st.setProperty("--sky-night-2", sk.skyNight[1]); }
    if (sk.nightTint) $("night").style.background = sk.nightTint;
  }

  function renderFixtures() {
    var fx = $("fixtures");
    fx.innerHTML = "";
    packFixtures(pack).forEach(function (f) {
      var img = el("img", "fixture");
      img.src = pack._base + f.art;
      img.alt = "";
      img.style.width = f.rect[2] + "px";
      img.style.height = f.rect[3] + "px";
      img.style.transform = "translate(" + f.rect[0] + "px," + f.rect[1] + "px)";
      fx.appendChild(img);
    });
  }

  /* ------------------------------------------------------------ change + save */
  var saveTimer = 0;
  function saveNow() { clearTimeout(saveTimer); if (store) S.writeSlot(slot, store.doc); }
  function onChange(doc, initial) {
    if (sel && !selected()) sel = null;
    document.body.classList.toggle("night", !!doc.night);
    $("btn-lightup").setAttribute("aria-pressed", doc.night ? "true" : "false");
    $("btn-master").setAttribute("aria-pressed", doc.master ? "true" : "false");
    $("btn-undo").disabled = !store.canUndo();
    $("btn-redo").disabled = !store.canRedo();
    A.setMusic(doc.music.on, doc.music.vol);
    renderDecos();
    renderOverlay();
    renderPanel();
    if (activeTab === "music" || activeTab === "scene") renderTray();
    requestDraw();
    if (!initial) { clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 300); }
  }
  window.addEventListener("pagehide", saveNow);
  document.addEventListener("visibilitychange", function () { if (document.hidden) saveNow(); });

  function edit(fn) {           // one undoable step
    store.checkpoint();
    fn(store.doc);
    store.commit();
  }

  /* ------------------------------------------------------------ view */
  function layout() {
    var r = viewport.getBoundingClientRect();
    var oldCenter = vw ? G.toScene(view, vw / 2, vh / 2) : null;
    vw = r.width; vh = r.height;
    renderer.resize(vw, vh);
    overviewView = G.fitRect(house.world, vw, vh, house.overviewPad || 0);
    document.documentElement.style.setProperty("--dock-h", $("dock").offsetHeight + "px");
    if (!store) return;
    var a = areaById(currentArea);
    if (a) view = G.fitRect(a.rect, vw, vh, 16);
    else if (currentArea === "overview" || !oldCenter) view = Object.assign({}, overviewView);
    else view = clampView({ k: view.k, tx: vw / 2 - oldCenter[0] * view.k, ty: vh / 2 - oldCenter[1] * view.k });
    applyView();
  }
  window.addEventListener("resize", function () { if (store && !$("app").hidden) layout(); });

  function kLimits() { return [overviewView.k * 0.8, Math.max(overviewView.k * 7, 2.4)]; }
  function clampView(v) {
    var lim = kLimits(), k = clampN(v.k, lim[0], lim[1]);
    var W = house.world[2] * k, H = house.world[3] * k, x0 = house.world[0] * k, y0 = house.world[1] * k;
    /* Never let the house leave the screen: at least a quarter of the view
     * always shows house, so a child cannot "lose" it with a fling. */
    var tx = clampN(v.tx, vw * 0.25 - W - x0, vw * 0.75 - x0);
    var ty = clampN(v.ty, vh * 0.25 - H - y0, vh * 0.75 - y0);
    return { k: k, tx: tx, ty: ty };
  }

  function applyView() {
    world.style.transform = "translate(" + view.tx + "px," + view.ty + "px) scale(" + view.k + ")";
    renderOverlay();
    requestDraw();
  }

  var anim = 0;
  function animateView(target, ms) {
    cancelAnimationFrame(anim);
    var from = Object.assign({}, view), start = performance.now(), dur = ms || 520;
    target = clampView(target);
    (function step(now) {
      var t = Math.min(1, (now - start) / dur), e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      var k = from.k * Math.pow(target.k / from.k, e);
      /* Interpolate the scene point at the screen centre so the move is a glide, not a swoop. */
      var c0 = G.toScene(from, vw / 2, vh / 2), c1 = G.toScene(target, vw / 2, vh / 2);
      var cx = c0[0] + (c1[0] - c0[0]) * e, cy = c0[1] + (c1[1] - c0[1]) * e;
      view = { k: k, tx: vw / 2 - cx * k, ty: vh / 2 - cy * k };
      applyView();
      if (t < 1) anim = requestAnimationFrame(step); else { view = target; applyView(); }
    })(start);
  }

  function areaById(id) { return house.areas.filter(function (a) { return a.id === id; })[0] || null; }
  function areaAt(p) {
    return house.areas.filter(function (a) { return a.open && p[0] >= a.rect[0] && p[0] <= a.rect[0] + a.rect[2] && p[1] >= a.rect[1] && p[1] <= a.rect[1] + a.rect[3]; })[0] || null;
  }

  var nameTimer = 0;
  function setArea(id) {
    if (id === currentArea) return;
    currentArea = id;
    var m = pack.music || {};
    A.switchTo(m[id] || m.overview || null, pack.id + "/" + (m[id] ? id : "overview"));
    var a = areaById(id), tag = $("area-name");
    tag.textContent = a ? a.name : house.name;
    tag.classList.add("show");
    clearTimeout(nameTimer);
    nameTimer = setTimeout(function () { tag.classList.remove("show"); }, 1600);
    if (activeTab === "lights") renderTray();
  }

  function settleArea() {
    if (view.k < overviewView.k * 1.35) { setArea("overview"); return; }
    var a = areaAt(G.toScene(view, vw / 2, vh / 2));
    if (a) setArea(a.id);
  }

  function zoomToArea(a) {
    animateView(G.fitRect(a.rect, vw, vh, 16));
    setArea(a.id);
  }
  function zoomOverview() { animateView(overviewView); setArea("overview"); }

  /* ------------------------------------------------------------ decorations */
  function renderDecos() {
    var doc = store.doc, seen = new Set();
    doc.decorations.forEach(function (d) {
      var def = defOf(d); if (!def) return;
      seen.add(d.id);
      var img = decoEls.get(d.id);
      if (!img) {
        img = el("img", "deco"); img.alt = ""; img.draggable = false; img.dataset.id = d.id;
        decoEls.set(d.id, img); decosEl.appendChild(img);
      }
      if (img.getAttribute("src") !== def.src) img.src = def.src;
      img.style.width = def.w + "px";
      img.style.height = def.h + "px";
      img.style.zIndex = String(d.z);
      img.style.transform = "translate(" + (d.x - def.w / 2) + "px," + (d.y - def.h / 2) + "px) rotate(" + d.r + "deg) scale(" + (d.flip ? -d.s : d.s) + "," + d.s + ")";
      img.classList.toggle("is-sel", !!(sel && sel.type === "deco" && sel.id === d.id));
    });
    decoEls.forEach(function (img, id) { if (!seen.has(id)) { img.remove(); decoEls.delete(id); } });
  }

  function maxZ() { return store.doc.decorations.reduce(function (m, d) { return Math.max(m, d.z); }, 0); }
  function findDeco(id) { return store.doc.decorations.filter(function (d) { return d.id === id; })[0]; }
  function findStrand(id) { return store.doc.strands.filter(function (s) { return s.id === id; })[0]; }
  function selected() {
    if (!sel) return null;
    if (sel.type === "deco") return findDeco(sel.id) || null;
    if (sel.type === "strand") return findStrand(sel.id) || null;
    if (sel.type === "topper") return store.doc.fixtures[sel.id] ? sel : null;
    return null;
  }
  function select(next) {
    sel = next;
    renderDecos(); renderOverlay(); renderPanel(); requestDraw();
  }

  function placeDecoration(key, at) {
    var def = decoIndex[key]; if (!def) return;
    var p = at || (function () {
      var c = G.toScene(view, vw / 2, vh / 2), j = function () { return (Math.random() - 0.5) * 80; };
      return [c[0] + j(), c[1] + j()];
    })();
    var id;
    edit(function (doc) {
      id = store.nextId("d");
      doc.decorations.push({ id: id, pack: def.pack, kind: def.id, x: Math.round(p[0]), y: Math.round(p[1]), s: 1, r: 0, z: maxZ() + 1, flip: false });
    });
    A.play("pop");
    showHint(null);
    select({ type: "deco", id: id });
  }

  function decoAction(what) {
    var d = selected(); if (!d || sel.type !== "deco") return;
    if (what === "copy") {
      var nid;
      edit(function (doc) {
        nid = store.nextId("d");
        var c = S.clone(d); c.id = nid; c.x += 40; c.y += 30; c.z = maxZ() + 1;
        doc.decorations.push(c);
      });
      A.play("pop");
      select({ type: "deco", id: nid });
    } else if (what === "delete") {
      edit(function (doc) { doc.decorations = doc.decorations.filter(function (x) { return x.id !== d.id; }); });
      A.play("swish");
      select(null);
    } else if (what === "front" || what === "back") {
      edit(function (doc) {
        var order = doc.decorations.slice().sort(function (a, b) { return a.z - b.z; }).filter(function (x) { return x.id !== d.id; });
        var me = findDeco(d.id);
        if (what === "front") order.push(me); else order.unshift(me);
        order.forEach(function (x, i) { x.z = i + 1; });
      });
      A.play("tick");
    } else if (what === "flip") {
      edit(function () { findDeco(d.id).flip = !findDeco(d.id).flip; });
      A.play("tick");
    }
  }

  /* ------------------------------------------------------------ lights */
  function newStrand(mode, pts, sag) {
    var id;
    edit(function (doc) {
      id = store.nextId("s");
      doc.strands.push({
        id: id, mode: mode, pts: pts.map(function (p) { return [Math.round(p[0]), Math.round(p[1])]; }), sag: Math.round(sag || 0),
        style: placing ? placing.style : lastStrand.style, colorMode: lastStrand.colorMode, color: lastStrand.color, palette: null,
        size: lastStrand.size, spacing: lastStrand.spacing, effect: lastStrand.effect, on: true
      });
    });
    A.play("sparkle");
    select({ type: "strand", id: id });
  }

  function wrapTree() {
    var tree = packFixtures(pack).filter(function (f) { return f.wrap; })[0];
    if (!tree) return;
    var a = areaById(tree.area);
    if (a && currentArea !== a.id) zoomToArea(a);
    var keepPlacing = placing;
    placing = { style: (placing && placing.style) || lastStrand.style, mode: "draw" };
    newStrand("path", G.treeWrap(tree.wrap), 0);
    placing = keepPlacing;
  }

  function selectTopper() {
    var tree = packFixtures(pack).filter(function (f) { return f.topper; })[0];
    if (!tree) return;
    var a = areaById(tree.area);
    if (a && currentArea !== a.id) zoomToArea(a);
    select({ type: "topper", id: tree.id });
  }

  function strandSet(fn, remember) {
    var s = selected(); if (!s || sel.type !== "strand") return;
    edit(function () { fn(findStrand(s.id)); });
    if (remember) {
      var f = findStrand(s.id);
      ["style", "colorMode", "color", "effect", "size", "spacing"].forEach(function (k) { lastStrand[k] = f[k]; });
    }
  }

  function decoGlows() {
    var out = [];
    store.doc.decorations.forEach(function (d) {
      var def = defOf(d); if (!def || !def.glow) return;
      var r = d.r * Math.PI / 180, ax = def.glow.at[0] * d.s * (d.flip ? -1 : 1), ay = def.glow.at[1] * d.s;
      out.push({ x: d.x + ax * Math.cos(r) - ay * Math.sin(r), y: d.y + ax * Math.sin(r) + ay * Math.cos(r), r: def.glow.r * d.s, color: def.glow.color });
    });
    return out;
  }

  function toppers() {
    return packFixtures(pack).filter(function (f) { return f.topper && store.doc.fixtures[f.id]; }).map(function (f) {
      return { id: f.id, anchor: f.topper.anchor, size: f.topper.size, state: store.doc.fixtures[f.id].topper, selected: !!(sel && sel.type === "topper" && sel.id === f.id) };
    });
  }

  /* ------------------------------------------------------------ drawing loop */
  function animated() {
    var d = store && store.doc;
    if (!d || !d.master || $("app").hidden) return false;
    return d.strands.some(function (s) { return s.on && s.effect !== "steady"; }) ||
      toppers().some(function (t) { return t.state.on; }) || decoGlows().length > 0;
  }
  function requestDraw() { dirty = true; if (!rafOn) { rafOn = true; requestAnimationFrame(frame); } }
  function frame(ts) {
    var anim = animated();
    if (dirty || (anim && ts - lastFrame > 32)) {      // ~30 fps for effects: gentle on older iPads
      lastFrame = ts; dirty = false;
      renderer.draw({
        view: view, doc: store.doc, time: (ts - t0) / 1000, multi: pack.lights.multi,
        preview: preview, selectedId: sel && sel.type === "strand" ? sel.id : null,
        decoGlows: decoGlows(), toppers: toppers(), windows: house.nightWindows
      });
    }
    if (anim || dirty) requestAnimationFrame(frame); else rafOn = false;
  }

  /* ------------------------------------------------------------ overlay (handles) */
  function renderOverlay() {
    overlay.innerHTML = "";
    var it = selected(); if (!it || !store) return;
    if (sel.type === "deco") {
      var def = defOf(it); if (!def) return;
      var c = G.toScreen(view, it.x, it.y), w = def.w * it.s * view.k, h = def.h * it.s * view.k;
      var box = el("div", "sel-box");
      box.style.left = (c[0] - w / 2) + "px"; box.style.top = (c[1] - h / 2) + "px";
      box.style.width = w + "px"; box.style.height = h + "px";
      box.style.transform = "rotate(" + it.r + "deg)";
      overlay.appendChild(box);
      var r = it.r * Math.PI / 180, hw = Math.max(w, 70) / 2, hh = Math.max(h, 70) / 2;
      function rot(x, y) { return [c[0] + x * Math.cos(r) - y * Math.sin(r), c[1] + x * Math.sin(r) + y * Math.cos(r)]; }
      addHandle("rotate", rot(0, -hh - 40), "rotate");
      addHandle("resize", rot(hw, hh), "resize");
      /* The little toolbar sits above the item, or below it near the top edge. */
      var bar = el("div", "minibar");
      [["copy", "copy", "Copy"], ["front", "front", "To the front"], ["back", "back", "To the back"], ["flip", "flip", "Flip"], ["delete", "trash", "Remove"]].forEach(function (b) {
        var btn = el("button", "btn" + (b[0] === "delete" ? " danger" : ""), icon(b[1]));
        btn.setAttribute("aria-label", b[2]); btn.dataset.act = b[0];
        btn.addEventListener("click", function (e) { e.stopPropagation(); decoAction(b[0]); });
        bar.appendChild(btn);
      });
      overlay.appendChild(bar);
      var bw = 5 * 60 + 12, bh = 64, ext = Math.max(hw, hh) + 50;
      var top = c[1] - ext - bh; if (top < 6) top = c[1] + ext;
      if (top + bh > vh - 6) top = Math.max(6, c[1] - bh / 2 - ext * 0.2);
      bar.style.left = clampN(c[0] - bw / 2, 6, Math.max(6, vw - bw - 6)) + "px";
      bar.style.top = clampN(top, 6, Math.max(6, vh - bh - 6)) + "px";
    } else if (sel.type === "strand") {
      if (it.mode === "hang") {
        addHandle("pt", G.toScreen(view, it.pts[0][0], it.pts[0][1]), null, 0, "end");
        addHandle("pt", G.toScreen(view, it.pts[1][0], it.pts[1][1]), null, 1, "end");
        var mid = [(it.pts[0][0] + it.pts[1][0]) / 2, (it.pts[0][1] + it.pts[1][1]) / 2 + (it.sag || 0)];
        addHandle("sag", G.toScreen(view, mid[0], mid[1]), null, null, "sag");
      } else {
        it.pts.forEach(function (p, i) { addHandle("pt", G.toScreen(view, p[0], p[1]), null, i, i === 0 || i === it.pts.length - 1 ? "end" : ""); });
      }
    }
  }
  function addHandle(kind, p, ic, idx, extra) {
    var h = el("div", "handle" + (ic ? "" : " point") + (extra ? " " + extra : ""), ic ? icon(ic) : "");
    h.dataset.h = kind;
    if (idx != null) h.dataset.i = idx;
    h.style.left = p[0] + "px"; h.style.top = p[1] + "px";
    overlay.appendChild(h);
  }

  /* ------------------------------------------------------------ hit testing */
  function hitTest(p) {
    var sp = G.toScene(view, p[0], p[1]), doc = store.doc;
    for (var i = doc.strands.length - 1; i >= 0; i--) {
      var s = doc.strands[i], line = renderer.layout(s).line.map(function (q) { return G.toScreen(view, q[0], q[1]); });
      var probes = s.style === "icicle" ? [p, [p[0], p[1] - 30 * view.k * s.size], [p[0], p[1] - 60 * view.k * s.size]] : [p];
      var tol = Math.max(20, window.CHLights.STYLE[s.style].r * s.size * view.k * 1.6);
      if (probes.some(function (q) { return G.polyDist(q, line) < tol; })) return { type: "strand", id: s.id };
    }
    var tp = toppers();
    for (var j = 0; j < tp.length; j++) {
      var a = G.toScreen(view, tp[j].anchor[0], tp[j].anchor[1]);
      if (G.dist(a, p) < Math.max(30, tp[j].size / 2 * view.k * 1.3)) return { type: "topper", id: tp[j].id };
    }
    var ds = doc.decorations.slice().sort(function (a, b) { return b.z - a.z; });
    for (var k = 0; k < ds.length; k++) {
      var def = defOf(ds[k]);
      if (def && G.hitBox(sp, ds[k], def.w, def.h, 10 / view.k)) return { type: "deco", id: ds[k].id };
    }
    return null;
  }

  /* ------------------------------------------------------------ pointer gestures */
  function local(e) { var r = viewport.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }

  viewport.addEventListener("pointerdown", function (e) {
    if (!store) return;
    A.kick();
    if (e.target.closest(".minibar")) return;      // its buttons handle themselves
    e.preventDefault();
    var p = local(e);
    pointers.set(e.pointerId, { p: p, start: p, t: performance.now() });
    try { viewport.setPointerCapture(e.pointerId); } catch (_) {}
    if (pointers.size === 2) { beginPinch(); return; }
    if (pointers.size > 2) return;
    cancelAnimationFrame(anim);
    var sp = G.toScene(view, p[0], p[1]);
    var h = e.target.closest("[data-h]");
    var it = selected();
    if (h && it) {
      store.checkpoint();
      gesture = { type: h.dataset.h, i: h.dataset.i != null ? +h.dataset.i : null, start: p, sp: sp, orig: S.clone(it) };
      return;
    }
    if (placing) {
      if (placing.mode === "hang") preview = { mode: "hang", pts: [sp, sp.slice()], sag: 0, style: placing.style, colorMode: lastStrand.colorMode, color: lastStrand.color, size: lastStrand.size, spacing: lastStrand.spacing, effect: lastStrand.effect, on: true };
      else preview = { mode: "path", pts: [sp], style: placing.style, colorMode: lastStrand.colorMode, color: lastStrand.color, size: lastStrand.size, spacing: lastStrand.spacing, effect: lastStrand.effect, on: true };
      gesture = { type: placing.mode, start: p, raw: [sp] };
      if (sel) select(null);
      requestDraw();
      return;
    }
    var hit = hitTest(p);
    if (hit && hit.type === "deco") {
      if (!sel || sel.id !== hit.id) { select(hit); A.play("tick"); }
      store.checkpoint();
      gesture = { type: "move-deco", start: p, orig: S.clone(findDeco(hit.id)), moved: false };
    } else if (hit && hit.type === "strand") {
      if (!sel || sel.id !== hit.id) { select(hit); A.play("tick"); }
      store.checkpoint();
      gesture = { type: "move-strand", start: p, orig: S.clone(findStrand(hit.id)), moved: false };
    } else if (hit && hit.type === "topper") {
      select(hit); A.play("tick");
      gesture = { type: "none" };
    } else {
      gesture = { type: "pan", start: p, sv: Object.assign({}, view), moved: false, t: performance.now() };
    }
  });

  function beginPinch() {
    /* A second finger always means "move the camera". Whatever one finger
     * was doing is finished first: a drag keeps where it got to, a light
     * being drawn is dropped (it was not finished). */
    finishGesture(true);
    var ps = Array.from(pointers.values()).map(function (v) { return v.p; });
    gesture = { type: "pinch", sv: Object.assign({}, view), m0: [(ps[0][0] + ps[1][0]) / 2, (ps[0][1] + ps[1][1]) / 2], d0: Math.max(10, G.dist(ps[0], ps[1])) };
  }

  window.addEventListener("pointermove", function (e) {
    var rec = pointers.get(e.pointerId);
    if (!rec || !gesture) return;
    rec.p = local(e);
    var p = rec.p, g = gesture;
    if (g.type === "pinch") {
      if (pointers.size < 2) return;
      var ps = Array.from(pointers.values()).map(function (v) { return v.p; });
      var m = [(ps[0][0] + ps[1][0]) / 2, (ps[0][1] + ps[1][1]) / 2], d = Math.max(10, G.dist(ps[0], ps[1]));
      var lim = kLimits(), k = clampN(g.sv.k * d / g.d0, lim[0], lim[1]);
      var w = G.toScene(g.sv, g.m0[0], g.m0[1]);
      view = clampView({ k: k, tx: m[0] - w[0] * k, ty: m[1] - w[1] * k });
      applyView();
      return;
    }
    var dx = p[0] - g.start[0], dy = p[1] - g.start[1], far = Math.hypot(dx, dy) > 6;
    var sp = G.toScene(view, p[0], p[1]);
    if (g.type === "pan") {
      if (far) g.moved = true;
      if (!g.moved) return;
      view = clampView({ k: g.sv.k, tx: g.sv.tx + dx, ty: g.sv.ty + dy });
      applyView();
    } else if (g.type === "move-deco") {
      if (far) g.moved = true;
      if (!g.moved) return;
      var d = findDeco(g.orig.id); if (!d) return;
      d.x = Math.round(g.orig.x + dx / view.k); d.y = Math.round(g.orig.y + dy / view.k);
      renderDecos(); renderOverlay(); requestDraw();
    } else if (g.type === "move-strand") {
      if (far) g.moved = true;
      if (!g.moved) return;
      var s = findStrand(g.orig.id); if (!s) return;
      s.pts = g.orig.pts.map(function (q) { return [Math.round(q[0] + dx / view.k), Math.round(q[1] + dy / view.k)]; });
      renderOverlay(); requestDraw();
    } else if (g.type === "rotate" || g.type === "resize") {
      var it = findDeco(g.orig.id); if (!it) return;
      var c = G.toScreen(view, it.x, it.y);
      if (g.type === "rotate") {
        var ang = Math.atan2(p[1] - c[1], p[0] - c[0]) * 180 / Math.PI + 90;
        ang = ((ang % 360) + 540) % 360 - 180;
        if (Math.abs(ang) < 7) ang = 0;                 // a gentle notch at upright
        it.r = Math.round(ang);
      } else {
        var r0 = Math.max(12, G.dist(c, g.start)), r1 = G.dist(c, p);
        it.s = Math.round(clampN(g.orig.s * r1 / r0, 0.3, 4) * 100) / 100;
      }
      renderDecos(); renderOverlay(); requestDraw();
    } else if (g.type === "pt" || g.type === "sag") {
      var st = findStrand(g.orig.id); if (!st) return;
      if (g.type === "pt") st.pts[g.i] = [Math.round(sp[0]), Math.round(sp[1])];
      else st.sag = Math.round(clampN(sp[1] - (st.pts[0][1] + st.pts[1][1]) / 2, -400, 800));
      renderOverlay(); requestDraw();
    } else if (g.type === "hang") {
      preview.pts[1] = sp;
      preview.sag = G.dist(preview.pts[0], sp) * 0.16;
      requestDraw();
    } else if (g.type === "draw") {
      var last = g.raw[g.raw.length - 1];
      if (G.dist(last, sp) * view.k > 5) {
        g.raw.push(sp);
        preview.pts = g.raw.length > 1 ? G.simplify(g.raw, 3 / view.k) : g.raw;
        requestDraw();
      }
    }
  });

  function finishGesture(cancelled) {
    var g = gesture; gesture = null;
    if (!g) return;
    if (g.type === "pan") {
      if (!g.moved && !cancelled && performance.now() - g.t < 600) onTap(g.start);
      else settleArea();
    } else if (g.type === "pinch") {
      settleArea();
    } else if (g.type === "hang") {
      var pv = preview; preview = null;
      if (!cancelled && pv && G.dist(pv.pts[0], pv.pts[1]) * view.k > 28) newStrand("hang", pv.pts, pv.sag);
      requestDraw();
    } else if (g.type === "draw") {
      preview = null;
      if (!cancelled && g.raw.length > 1) {
        var eps = 6 / view.k, pts = G.simplify(g.raw, eps);
        while (pts.length > 16) { eps *= 1.5; pts = G.simplify(g.raw, eps); }
        if (G.lineLength(pts) * view.k > 28) newStrand("path", pts, 0);
      }
      requestDraw();
    } else if (g.type !== "none") {
      if (!store.discardIfUnchanged()) store.commit();
    }
  }

  function endPointer(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (gesture && gesture.type === "pinch") {
      if (pointers.size === 1) {
        /* One finger left after a pinch keeps panning — never a tap. */
        var rest = Array.from(pointers.values())[0];
        settleArea();
        gesture = { type: "pan", start: rest.p, sv: Object.assign({}, view), moved: true, t: 0 };
      } else if (pointers.size === 0) finishGesture(false);
      return;
    }
    if (pointers.size === 0) finishGesture(e.type === "pointercancel");
  }
  window.addEventListener("pointerup", endPointer);
  window.addEventListener("pointercancel", endPointer);

  function onTap(p) {
    if (sel) { select(null); return; }
    var a = areaAt(G.toScene(view, p[0], p[1]));
    if (a && a.id !== currentArea) { A.play("tick"); zoomToArea(a); }
  }

  viewport.addEventListener("wheel", function (e) {
    if (!store) return;
    e.preventDefault();
    var p = local(e), f = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
    var lim = kLimits(), k = clampN(view.k * f, lim[0], lim[1]);
    view = clampView(G.zoomAbout(view, p[0], p[1], k));
    applyView();
    clearTimeout(wheelTimer); wheelTimer = setTimeout(settleArea, 250);
  }, { passive: false });
  var wheelTimer = 0;

  /* The page itself zoomed (should never happen with the guard, but iPadOS
   * has surprised us before): give pinch back to Safari so the child can
   * always pinch out. INTERACTION-DIRECTION.md — whatever gets in gets out. */
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", function () {
      viewport.classList.toggle("page-zoomed", window.visualViewport.scale > 1.01);
    });
  }

  document.addEventListener("keydown", function (e) {
    if (!store || $("app").hidden) return;
    var mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? doRedo() : doUndo(); }
    else if ((e.key === "Delete" || e.key === "Backspace") && sel) {
      e.preventDefault();
      if (sel.type === "deco") decoAction("delete");
      else if (sel.type === "strand") { var id = sel.id; edit(function (doc) { doc.strands = doc.strands.filter(function (s) { return s.id !== id; }); }); select(null); }
    } else if (e.key === "Escape") select(null);
  });

  /* ------------------------------------------------------------ top bar */
  function doUndo() { if (store.undo()) { A.play("undo"); renderer.cache.clear(); } }
  function doRedo() { if (store.redo()) { A.play("undo"); renderer.cache.clear(); } }
  $("btn-undo").addEventListener("click", doUndo);
  $("btn-redo").addEventListener("click", doRedo);
  $("btn-home").addEventListener("click", goHome);
  $("btn-overview").addEventListener("click", function () { select(null); zoomOverview(); });
  function toggleNight() {
    var d = store.doc;
    d.night = !d.night;
    if (d.night) d.master = true;           // "Light Up My House!" means the lights come on
    A.play(d.night ? "chime" : "dim");
    store.commit();
  }
  function toggleMaster() {
    store.doc.master = !store.doc.master;
    A.play(store.doc.master ? "sparkle" : "dim");
    store.commit();
  }
  $("btn-lightup").addEventListener("click", toggleNight);
  $("btn-master").addEventListener("click", toggleMaster);

  /* ------------------------------------------------------------ dock + trays */
  Array.prototype.forEach.call(document.querySelectorAll(".tab"), function (b) {
    b.addEventListener("click", function () { setTab(b.dataset.tab); A.play("tick"); });
  });
  function setTab(t) {
    activeTab = t;
    if (t !== "lights") placing = null;
    showHint(null);
    Array.prototype.forEach.call(document.querySelectorAll(".tab"), function (b) { b.classList.toggle("is-on", b.dataset.tab === t); });
    renderTray();
    document.documentElement.style.setProperty("--dock-h", $("dock").offsetHeight + "px");
  }

  function stylePic(style) {
    var bulbs = "", xs = [10, 24, 38, 52], ys = [14, 22, 22, 14];
    xs.forEach(function (x, i) {
      var y = ys[i], c = ["#ff4f5e", "#ffd36b", "#4fd47a", "#4fa8ff"][i];
      if (style === "fairy") bulbs += '<ellipse cx="' + x + '" cy="' + y + '" rx="4" ry="2.6" fill="' + c + '" stroke="#24402c"/>';
      else if (style === "globe") bulbs += '<circle cx="' + x + '" cy="' + (y + 7) + '" r="7" fill="' + c + '" stroke="#24402c"/>';
      else if (style === "star") bulbs += '<path transform="translate(' + x + " " + y + ')" d="M0-7l2 5 5 .4-4 3.4 1.4 5L0 4 -4.4 6.8-3 1.8-7-1.6l5-.4z" fill="' + c + '" stroke="#24402c" stroke-width=".8"/>';
      else bulbs += '<path d="M' + x + " " + y + "v" + (8 + (i % 2) * 10) + '" stroke="#24402c"/><ellipse cx="' + x + '" cy="' + (y + 10 + (i % 2) * 10) + '" rx="2.4" ry="4" fill="' + c + '" stroke="#24402c"/>';
    });
    return '<svg class="stylepic" viewBox="0 0 64 44"><path d="M2 8 Q32 34 62 8" fill="none" stroke="#24402c" stroke-width="2"/>' + bulbs + "</svg>";
  }

  function renderTray() {
    var tray = $("tray");
    tray.innerHTML = "";
    if (!store) return;
    if (activeTab === "decorations") {
      pack.categories.forEach(function (cat) {
        var g = el("div", "cat");
        pack.decorations.filter(function (d) { return d.cat === cat.id; }).forEach(function (d) {
          var b = el("button", "item", '<img alt="" src="' + pack._base + d.art + '">');
          b.setAttribute("aria-label", d.name);
          b.dataset.key = pack.id + "/" + d.id;
          wireTrayItem(b);
          g.appendChild(b);
        });
        tray.appendChild(g);
      });
    } else if (activeTab === "lights") {
      var g1 = el("div", "tray-group");
      var hand = el("button", "btn" + (placing ? "" : " is-on"), icon("hand"));
      hand.setAttribute("aria-label", "Move and pick");
      hand.addEventListener("click", function () { placing = null; showHint(null); renderTray(); });
      g1.appendChild(hand);
      pack.lights.styles.forEach(function (st) {
        var b = el("button", "btn" + (placing && placing.style === st ? " is-on" : ""), stylePic(st));
        b.setAttribute("aria-label", st + " lights"); b.dataset.style = st;
        b.addEventListener("click", function () {
          placing = { style: st, mode: placing ? placing.mode : "hang" };
          lastStrand.style = st;
          /* Picking a style in the tray starts NEW lights; restyling an
           * existing string is done from its own panel. */
          if (sel) select(null);
          showHint(placing.mode); renderTray(); A.play("tick");
        });
        g1.appendChild(b);
      });
      tray.appendChild(g1);
      var g2 = el("div", "tray-group");
      [["hang", "Hang between two points"], ["draw", "Draw a line of lights"]].forEach(function (m) {
        var b = el("button", "btn" + (placing && placing.mode === m[0] ? " is-on" : ""), icon(m[0]));
        b.setAttribute("aria-label", m[1]); b.dataset.mode = m[0];
        b.addEventListener("click", function () {
          placing = { style: (placing && placing.style) || lastStrand.style, mode: m[0] };
          showHint(m[0]); renderTray(); A.play("tick");
        });
        g2.appendChild(b);
      });
      tray.appendChild(g2);
      var g3 = el("div", "tray-group");
      if (packFixtures(pack).some(function (f) { return f.wrap; })) {
        var wrapB = el("button", "btn", icon("treewrap"));
        wrapB.setAttribute("aria-label", "Wrap the tree in lights"); wrapB.id = "btn-wrap";
        wrapB.addEventListener("click", wrapTree);
        g3.appendChild(wrapB);
      }
      if (packFixtures(pack).some(function (f) { return f.topper; })) {
        var starB = el("button", "btn", icon("star"));
        starB.style.color = "#e0a400";
        starB.setAttribute("aria-label", "Tree star"); starB.id = "btn-topper";
        starB.addEventListener("click", selectTopper);
        g3.appendChild(starB);
      }
      tray.appendChild(g3);
    } else if (activeTab === "music") {
      var m = store.doc.music, gm = el("div", "tray-group");
      var on = el("button", "btn" + (m.on ? " is-on" : ""), icon("music"));
      on.setAttribute("aria-label", "Music on or off"); on.setAttribute("aria-pressed", m.on ? "true" : "false");
      on.addEventListener("click", function () { store.doc.music.on = !store.doc.music.on; store.commit(); A.kick(); });
      gm.appendChild(on);
      var vol = el("input", "vol");
      vol.type = "range"; vol.min = 0; vol.max = 1; vol.step = 0.05; vol.value = m.vol;
      vol.setAttribute("aria-label", "Music volume");
      vol.addEventListener("input", function () { store.doc.music.vol = +vol.value; A.setMusic(store.doc.music.on, +vol.value); });
      vol.addEventListener("change", function () { store.commit(); });
      gm.appendChild(el("span", "", icon("speaker").replace("<svg>", '<svg style="width:40px;height:40px">')));
      gm.appendChild(vol);
      tray.appendChild(gm);
    } else if (activeTab === "scene") {
      var gs = el("div", "tray-group");
      var day = el("button", "btn" + (store.doc.night ? "" : " is-on"), icon("sun"));
      day.setAttribute("aria-label", "Daytime");
      day.addEventListener("click", function () { if (store.doc.night) toggleNight(); });
      var night = el("button", "btn" + (store.doc.night ? " is-on" : ""), icon("moon"));
      night.setAttribute("aria-label", "Night time");
      night.addEventListener("click", function () { if (!store.doc.night) toggleNight(); });
      var master = el("button", "btn" + (store.doc.master ? " is-on" : ""), icon("power"));
      master.setAttribute("aria-label", "All lights on or off");
      master.addEventListener("click", toggleMaster);
      [day, night, master].forEach(function (b) { gs.appendChild(b); });
      tray.appendChild(gs);
      var gh = el("div", "tray-group");
      var whole = el("button", "btn", icon("house"));
      whole.setAttribute("aria-label", "Whole house");
      whole.addEventListener("click", function () { select(null); zoomOverview(); });
      var homeB = el("button", "btn", icon("home"));
      homeB.setAttribute("aria-label", "My houses");
      homeB.addEventListener("click", goHome);
      gh.appendChild(whole); gh.appendChild(homeB);
      tray.appendChild(gh);
    }
  }

  /* Tray items: a TAP drops the decoration in the middle of the view; a drag
   * UP out of the tray carries it to exactly where the finger lets go. A
   * sideways drag scrolls the tray (touch-action: pan-x). */
  function wireTrayItem(b) {
    b.addEventListener("pointerdown", function (e) {
      A.kick();
      delete b.dataset.dragged;
      var st = { x: e.clientX, y: e.clientY, id: e.pointerId, ghost: null };
      /* Listen on window, not the button: once the finger leaves the tray
       * the button stops receiving moves in some engines. */
      function move(ev) {
        if (ev.pointerId !== st.id) return;
        var dx = ev.clientX - st.x, dy = ev.clientY - st.y;
        if (!st.ghost && dy < -20 && Math.abs(dy) > Math.abs(dx) * 0.5) {
          st.ghost = el("img", "ghost"); st.ghost.src = b.querySelector("img").src; st.ghost.alt = "";
          document.body.appendChild(st.ghost);
        }
        if (st.ghost) { st.ghost.style.left = ev.clientX + "px"; st.ghost.style.top = ev.clientY + "px"; }
      }
      function end(ev) {
        if (ev.pointerId !== st.id) return;
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", end);
        window.removeEventListener("pointercancel", end);
        if (!st.ghost) return;
        st.ghost.remove();
        b.dataset.dragged = "1";
        if (ev.type === "pointercancel") return;
        var r = viewport.getBoundingClientRect();
        if (ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) {
          placeDecoration(b.dataset.key, G.toScene(view, ev.clientX - r.left, ev.clientY - r.top));
        }
      }
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", end);
      window.addEventListener("pointercancel", end);
    });
    b.addEventListener("click", function () {
      if (b.dataset.dragged) { delete b.dataset.dragged; return; }
      placeDecoration(b.dataset.key);
    });
  }

  /* ------------------------------------------------------------ panel (strand / topper) */
  function swatchRow(current, isMulti, onPick, withMulti) {
    var row = el("div", "prow");
    if (withMulti) {
      var rb = el("button", "swatch rainbow" + (isMulti ? " is-on" : ""));
      rb.setAttribute("aria-label", "Many colours"); rb.dataset.colour = "multi";
      rb.addEventListener("click", function () { onPick("multi"); });
      row.appendChild(rb);
    }
    pack.lights.swatches.forEach(function (c) {
      var b = el("button", "swatch" + (!isMulti && current === c ? " is-on" : ""));
      b.style.background = c; b.setAttribute("aria-label", "Colour " + c); b.dataset.colour = c;
      b.addEventListener("click", function () { onPick(c); });
      row.appendChild(b);
    });
    var cc = el("label", "custom-colour");
    cc.setAttribute("aria-label", "Any colour");
    var inp = el("input"); inp.type = "color"; inp.value = current;
    /* The native picker reports colours continuously while it is open, so
     * those are applied live (one undo step) and the panel is only rebuilt
     * when the picker closes — rebuilding would destroy the open picker. */
    var started = false;
    inp.addEventListener("input", function () {
      if (!started) { store.checkpoint(); started = true; }
      onPick(inp.value, true);
      requestDraw();
    });
    inp.addEventListener("change", function () { if (started) { started = false; store.commit(); } });
    cc.appendChild(inp);
    row.appendChild(cc);
    return row;
  }

  function renderPanel() {
    var panel = $("panel");
    var it = selected();
    if (!it || sel.type === "deco") { panel.hidden = true; panel.innerHTML = ""; return; }
    panel.hidden = false;
    panel.innerHTML = "";
    if (sel.type === "strand") {
      var s = it;
      var r1 = el("div", "prow");
      pack.lights.styles.forEach(function (st) {
        var b = el("button", "btn" + (s.style === st ? " is-on" : ""), stylePic(st));
        b.setAttribute("aria-label", st + " lights"); b.dataset.style = st;
        b.addEventListener("click", function () { strandSet(function (x) { x.style = st; }, true); });
        r1.appendChild(b);
      });
      r1.appendChild(el("span", "gap"));
      var pw = el("button", "btn" + (s.on ? " is-on" : ""), icon("power"));
      pw.setAttribute("aria-label", "This string on or off"); pw.dataset.act = "power";
      pw.addEventListener("click", function () { strandSet(function (x) { x.on = !x.on; }); A.play(s.on ? "dim" : "sparkle"); });
      var cp = el("button", "btn", icon("copy"));
      cp.setAttribute("aria-label", "Copy this string"); cp.dataset.act = "copy";
      cp.addEventListener("click", function () {
        var nid;
        edit(function (doc) { nid = store.nextId("s"); var c = S.clone(findStrand(s.id)); c.id = nid; c.pts = c.pts.map(function (q) { return [q[0] + 40, q[1] + 40]; }); doc.strands.push(c); });
        A.play("sparkle"); select({ type: "strand", id: nid });
      });
      var del = el("button", "btn", icon("trash"));
      del.style.color = "#c4303e"; del.setAttribute("aria-label", "Remove this string"); del.dataset.act = "delete";
      del.addEventListener("click", function () {
        edit(function (doc) { doc.strands = doc.strands.filter(function (x) { return x.id !== s.id; }); });
        renderer.forget(s.id); A.play("swish"); select(null);
      });
      var cl = el("button", "btn close", icon("close"));
      cl.setAttribute("aria-label", "Done"); cl.addEventListener("click", function () { select(null); });
      [pw, cp, del, cl].forEach(function (b) { r1.appendChild(b); });
      panel.appendChild(r1);
      panel.appendChild(swatchRow(s.color, s.colorMode === "multi", function (c, continuing) {
        if (continuing) { var f = findStrand(s.id); f.colorMode = "single"; f.color = c; lastStrand.color = c; lastStrand.colorMode = "single"; return; }
        strandSet(function (x) { if (c === "multi") x.colorMode = "multi"; else { x.colorMode = "single"; x.color = c; } }, true);
      }, true));
      var r3 = el("div", "prow");
      [["steady", "Steady"], ["twinkle", "Twinkle"], ["fade", "Slow colour change"]].forEach(function (fx) {
        var b = el("button", "btn" + (s.effect === fx[0] ? " is-on" : ""), icon(fx[0]));
        b.setAttribute("aria-label", fx[1]); b.dataset.effect = fx[0];
        b.addEventListener("click", function () { strandSet(function (x) { x.effect = fx[0]; }, true); });
        r3.appendChild(b);
      });
      r3.appendChild(el("span", "gap"));
      r3.appendChild(stepper("size", s.size, 0.5, 2.5, 0.25, function (v) { strandSet(function (x) { x.size = v; }, true); }));
      r3.appendChild(stepper("spacing", s.spacing, 0.5, 3, 0.25, function (v) { strandSet(function (x) { x.spacing = v; }, true); }));
      panel.appendChild(r3);
    } else if (sel.type === "topper") {
      var f = packFixtures(pack).filter(function (x) { return x.id === sel.id; })[0];
      var tp = store.doc.fixtures[sel.id].topper;
      var t1 = el("div", "prow");
      f.topper.designs.forEach(function (dz) {
        var pts = dz === "burst" ? 8 : dz === "snowstar" ? 6 : 5, inner = dz === "burst" ? 0.5 : dz === "snowstar" ? 0.38 : 0.46, path = "";
        for (var i = 0; i < pts * 2; i++) { var rr = i % 2 ? 20 * inner : 20, a = i * Math.PI / pts - Math.PI / 2; path += (i ? "L" : "M") + (24 + Math.cos(a) * rr).toFixed(1) + " " + (24 + Math.sin(a) * rr).toFixed(1); }
        var b = el("button", "btn" + (tp.design === dz ? " is-on" : ""), '<svg viewBox="0 0 48 48"><path d="' + path + 'Z" fill="' + tp.color + '" stroke="#4a3426" stroke-width="2"/></svg>');
        b.setAttribute("aria-label", "Star " + dz); b.dataset.design = dz;
        b.addEventListener("click", function () { edit(function (doc) { doc.fixtures[sel.id].topper.design = dz; }); A.play("sparkle"); });
        t1.appendChild(b);
      });
      t1.appendChild(el("span", "gap"));
      var tpw = el("button", "btn" + (tp.on ? " is-on" : ""), icon("power"));
      tpw.setAttribute("aria-label", "Star light on or off"); tpw.dataset.act = "power";
      tpw.addEventListener("click", function () { edit(function (doc) { doc.fixtures[sel.id].topper.on = !doc.fixtures[sel.id].topper.on; }); A.play(tp.on ? "dim" : "sparkle"); });
      var tcl = el("button", "btn close", icon("close"));
      tcl.setAttribute("aria-label", "Done"); tcl.addEventListener("click", function () { select(null); });
      t1.appendChild(tpw); t1.appendChild(tcl);
      panel.appendChild(t1);
      panel.appendChild(swatchRow(tp.color, false, function (c, continuing) {
        if (continuing) { store.doc.fixtures[sel.id].topper.color = c; return; }
        edit(function (doc) { doc.fixtures[sel.id].topper.color = c; });
      }, false));
    }
    document.documentElement.style.setProperty("--dock-h", $("dock").offsetHeight + "px");
  }

  function stepper(ic, value, lo, hi, step, set) {
    var w = el("span", "stepper");
    var minus = el("button", "btn", icon("minus")), plus = el("button", "btn", icon("plus"));
    minus.setAttribute("aria-label", "Less " + ic); plus.setAttribute("aria-label", "More " + ic);
    minus.dataset.step = ic + "-"; plus.dataset.step = ic + "+";
    minus.disabled = value <= lo; plus.disabled = value >= hi;
    minus.addEventListener("click", function () { set(clampN(Math.round((value - step) * 100) / 100, lo, hi)); A.play("tick"); });
    plus.addEventListener("click", function () { set(clampN(Math.round((value + step) * 100) / 100, lo, hi)); A.play("tick"); });
    w.appendChild(minus); w.insertAdjacentHTML("beforeend", icon(ic)); w.appendChild(plus);
    return w;
  }

  /* ------------------------------------------------------------ hints */
  function showHint(kind) {
    var h = $("hint");
    if (!kind) { h.hidden = true; return; }
    var txt = { deco: [icon("deco"), "Tap a decoration below"], hang: [icon("hang"), "Drag from here to there"], draw: [icon("draw"), "Draw a line for the lights"] }[kind];
    h.innerHTML = txt[0] + "<span>" + txt[1] + "</span>";
    h.hidden = false;
  }

  /* Test hook for tools/drive-slice.mjs — read-only views of state. */
  window.CH = {
    doc: function () { return store && store.doc; },
    view: function () { return Object.assign({}, view); },
    area: function () { return currentArea; },
    sel: function () { return sel; },
    toScreen: function (x, y) { var r = viewport.getBoundingClientRect(), p = G.toScreen(view, x, y); return [p[0] + r.left, p[1] + r.top]; },
    audio: function () { return A.debug(); },
    undoDepth: function () { return store ? store.undoStack.length : 0; }
  };

  boot();
})();
