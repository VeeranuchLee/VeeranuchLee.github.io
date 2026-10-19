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

  var viewport = $("viewport"), worlds = [$("world"), $("world-front")], decosEl = $("decos"), overlay = $("overlay");
  var house = null, packs = {}, pack = null, decoIndex = {};
  var store = null, slot = 0;
  var view = { k: 1, tx: 0, ty: 0 }, vw = 0, vh = 0, overviewView = null;
  var currentArea = "overview";
  var sel = null;                     // { type: "deco" | "strand" | "topper", id }
  var placing = null;                 // { style, mode: "hang" | "draw" }
  var lastStrand = { style: "fairy", colorMode: "multi", color: "#ffd36b", effect: "twinkle", size: 1, spacing: 1 };
  var activeTab = "decorations";
  var trayPack = null;                // which event's library the tray shows (mixing is allowed)
  var renderer = new window.CHLights.Renderer($("lights"));          // lights in front of decorations
  var rendererBack = new window.CHLights.Renderer($("lights-back")); // lights behind them
  rendererBack.cache = renderer.cache;                                // one bulb-layout cache
  var snapHit = null, snapCue = null, snapCache = null;
  var preview = null;
  var pointers = new Map(), gesture = null;
  var decoEls = new Map();
  var dirty = true, rafOn = false, lastFrame = 0, t0 = performance.now();

  /* Every file the app loads carries the build version (index.html CH_V), so
   * a Test Hub redeploy can never hide behind Safari's cache — JSON included. */
  var V = window.CH_V || "";
  function vurl(u) { return V && !/^data:/.test(u) ? u + (u.indexOf("?") < 0 ? "?" : "&") + "v=" + encodeURIComponent(V) : u; }
  function fetchJSON(u) { return fetch(vurl(u)).then(function (r) { if (!r.ok) throw new Error(u + " " + r.status); return r.json(); }); }
  function known(p, k) { return !!decoIndex[(p || "christmas") + "/" + k]; }
  function defOf(d) { return decoIndex[d.pack + "/" + d.kind]; }
  function clampN(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ------------------------------------------------------------ boot */
  function boot() {
    return fetchJSON("packs/index.json").then(function (idx) {
      return fetchJSON(idx.house || "data/house-mansion.json").then(function (h) { return [h, idx]; });
    }).then(function (r) {
      house = r[0];
      var idx = r[1];
      return Promise.all(idx.packs.map(function (p) {
        return fetchJSON(p.path).then(function (pk) {
          pk._base = p.path.replace(/[^/]+$/, "");
          packs[pk.id] = pk;
          pk.decorations.forEach(function (d) { decoIndex[pk.id + "/" + d.id] = Object.assign({ pack: pk.id, src: vurl(pk._base + d.art) }, d); });
        });
      })).then(function () {
        pack = packs[idx.defaultEvent];
        return renderPlates();
      });
    }).then(function () {
      renderHome();
    }).catch(function (err) {
      document.body.innerHTML = '<p style="color:#fff;padding:30px;font:20px system-ui">Celebration House could not load (' + String(err && err.message || err) + ').</p>';
    });
  }

  /* The house is drawn as plates, each covering its own scene rectangle, in
   * order: e.g. the ground, the painted house, an extension. A painted plate is
   * an <img>; a placeholder plate is inline SVG (its windows are styleable).
   * An area may also carry a sharper DETAIL plate, shown only when zoomed in
   * far enough that the overview plate would be upscaled (see updateDetail). */
  function housePlates() { return house.plates || [{ id: "house", art: house.art, rect: house.world }]; }
  function renderPlates() {
    var host = $("house");
    host.innerHTML = "";
    var jobs = housePlates().map(function (pl) {
      var box = el("div", "plate");
      box.dataset.plate = pl.id;
      placeRect(box, pl.rect);
      host.appendChild(box);
      if (/\.svg(\?|$)/i.test(pl.art)) {
        return fetch(vurl(pl.art)).then(function (r) { return r.text(); }).then(function (t) { box.innerHTML = t; });
      }
      var img = el("img"); img.alt = ""; img.draggable = false; img.src = vurl(pl.art);
      img.style.width = "100%"; img.style.height = "100%";
      box.appendChild(img);
      return null;
    });
    if (house.dream) {
      /* The bedroom's dream (Land of Sweets): a plate over the bedroom that
       * fades in while the child is dreaming (doc.dream). */
      var dp = el("div", "plate dream");
      dp.dataset.plate = "dream";
      placeRect(dp, house.dream.rect);
      host.appendChild(dp);
      jobs.push(/\.svg(\?|$)/i.test(house.dream.art)
        ? fetch(vurl(house.dream.art)).then(function (r) { return r.text(); }).then(function (t) { dp.innerHTML = t; })
        : (dp.innerHTML = '<img alt="" draggable="false" style="width:100%;height:100%" src="' + vurl(house.dream.art) + '">', null));
    }
    house.areas.forEach(function (a) {
      if (!a.detail) return;
      var img = el("img", "plate detail"); img.alt = ""; img.draggable = false;
      img.dataset.detail = a.id;
      placeRect(img, a.detail.rect || a.rect);
      host.appendChild(img);
    });
    return Promise.all(jobs);
  }
  function placeRect(node, r) {
    node.style.width = r[2] + "px"; node.style.height = r[3] + "px";
    node.style.transform = "translate(" + r[0] + "px," + r[1] + "px)";
  }
  /* Show an area's detail plate only when it is on screen and the overview
   * plate would be magnified (more than ~1.15 device pixels per plate pixel). */
  function updateDetail() {
    var imgs = document.querySelectorAll("img.plate.detail");
    if (!imgs.length) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1), sharp = view.k * dpr > 1.15;
    var a0 = G.toScene(view, 0, 0), a1 = G.toScene(view, vw, vh);
    Array.prototype.forEach.call(imgs, function (img) {
      var a = areaById(img.dataset.detail), r = a && (a.detail.rect || a.rect);
      var on = !!(r && sharp && r[0] < a1[0] && r[0] + r[2] > a0[0] && r[1] < a1[1] && r[1] + r[3] > a0[1]);
      if (on && !img.getAttribute("src")) img.src = vurl(a.detail.art);
      img.classList.toggle("show", on);
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

  /* Each saved house is a card named by its picture badge. A "+" card starts a
   * new house (pick a picture first); each card can be renamed (tap the
   * badge), copied, or removed (with a picture-only yes/no). Never overwrites. */
  function badgeHtml(b, cls) {
    var def = b && decoIndex[b.pic];
    return '<span class="badge ' + (cls || "") + '" style="background:' + ((b && b.color) || S.BADGE_COLOURS[0]) + '">' +
      (def ? '<img alt="" src="' + def.src + '">' : icon("house")) + "</span>";
  }
  function renderHome() {
    var wrap = $("slots");
    wrap.innerHTML = "";
    S.listSlots().forEach(function (n) {
      var doc = slotSummary(n);
      if (!doc) return;
      var card = el("div", "slot");
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", "Open this house");
      card.dataset.slot = n;
      card.innerHTML =
        '<div class="pic"><img alt="" src="' + vurl(house.thumb || house.art) + '"></div>' +
        '<div class="counts"><span>' + icon("deco") + doc.decorations.length + "</span><span>" + icon("bulb") + doc.strands.length + "</span></div>";
      card.addEventListener("click", function () { openSlot(n); });
      var name = el("button", "name-btn", badgeHtml(doc.badge));
      name.setAttribute("aria-label", "Change this house's picture"); name.dataset.act = "rename";
      name.addEventListener("click", function (e) {
        e.stopPropagation();
        pickBadge(doc.badge, function (b) { var d = S.readSlot(n, known); if (d) { d.badge = b; S.writeSlot(n, d); } A.play("pop"); renderHome(); });
      });
      card.appendChild(name);
      var tools = el("div", "slot-tools");
      var dup = el("button", "btn", icon("copy"));
      dup.setAttribute("aria-label", "Copy this house"); dup.dataset.act = "duplicate";
      dup.disabled = S.freeSlot() < 0;
      dup.addEventListener("click", function (e) { e.stopPropagation(); if (S.duplicateSlot(n, known) >= 0) { A.play("sparkle"); renderHome(); } });
      var del = el("button", "btn danger", icon("trash"));
      del.setAttribute("aria-label", "Remove this house"); del.dataset.act = "delete";
      del.addEventListener("click", function (e) {
        e.stopPropagation();
        confirmBox(badgeHtml(doc.badge) + icon("trash"), function () { S.clearSlot(n); A.play("swish"); renderHome(); });
      });
      tools.appendChild(dup); tools.appendChild(del);
      card.appendChild(tools);
      wrap.appendChild(card);
    });
    if (S.freeSlot() >= 0) {
      var add = el("button", "slot new", '<div class="pic plus">' + icon("plus") + "</div>");
      add.setAttribute("aria-label", "A new house");
      add.addEventListener("click", function () {
        A.kick();
        var used = S.listSlots().length;
        pickBadge({ pic: "", color: S.BADGE_COLOURS[used % S.BADGE_COLOURS.length] }, function (b) {
          var n = S.freeSlot(); if (n < 0) return;
          var doc = S.blankHouse(house.id, pack.id, defaultFixtureState(pack));
          doc.badge = b;
          S.writeSlot(n, doc);
          openSlot(n);
        });
      });
      wrap.appendChild(add);
    }
  }

  /* The picture picker: a row of colours and a grid of pictures. Tapping a
   * picture chooses it (with the colour showing). No typing anywhere. */
  function badgePictures() {
    var out = [];
    Object.keys(packs).forEach(function (id) {
      packs[id].decorations.forEach(function (d) { if (!d.placeholder || id !== "christmas") out.push(id + "/" + d.id); });
    });
    return out.slice(0, 24);
  }
  function pickBadge(current, done) {
    var box = $("picker"), colour = (current && current.color) || S.BADGE_COLOURS[0];
    function draw() {
      var cols = S.BADGE_COLOURS.map(function (c) {
        return '<button class="swatch' + (c === colour ? " is-on" : "") + '" data-colour="' + c + '" style="background:' + c + '" aria-label="Colour"></button>';
      }).join("");
      var pics = badgePictures().map(function (k) {
        return '<button class="pick' + (current && current.pic === k ? " is-on" : "") + '" data-pic="' + k + '" aria-label="' + decoIndex[k].name + '" style="background:' + colour + '"><img alt="" src="' + decoIndex[k].src + '"></button>';
      }).join("");
      box.querySelector(".picker-colours").innerHTML = cols;
      box.querySelector(".picker-grid").innerHTML = pics;
    }
    draw();
    box.hidden = false;
    box.onclick = function (e) {
      var c = e.target.closest("[data-colour]"), p = e.target.closest("[data-pic]");
      if (c) { colour = c.dataset.colour; A.play("tick"); draw(); }
      else if (p) { box.hidden = true; box.onclick = null; done({ pic: p.dataset.pic, color: colour }); }
      else if (e.target.closest("#picker-close") || e.target === box) { box.hidden = true; box.onclick = null; }
    };
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
    if (!doc.badge.pic) doc.badge.pic = badgePictures()[0] || "";
    var defaults = defaultFixtureState(packs[doc.event] || pack);
    Object.keys(defaults).forEach(function (k) { if (!doc.fixtures[k] || !doc.fixtures[k].topper) doc.fixtures[k] = defaults[k]; });
    pack = packs[doc.event] || pack;
    trayPack = pack.id;
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
    if (sk.decoNight) st.setProperty("--deco-night", sk.decoNight); else st.removeProperty("--deco-night");
  }

  function renderFixtures() {
    var fx = $("fixtures");
    fx.innerHTML = "";
    packFixtures(pack).forEach(function (f) {
      var img = el("img", "fixture");
      img.src = vurl(pack._base + f.art);
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
    document.body.classList.toggle("dreaming", !!doc.dream);
    updateDreamButton();
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
    rendererBack.resize(vw, vh);
    /* The whole-house view frames the house and garden (house.overview); the
     * sky above stays reachable by panning or by tapping it. */
    overviewView = G.fitRect(house.overview || house.world, vw, vh, house.overviewPad || 0);
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
    var tf = "translate(" + view.tx + "px," + view.ty + "px) scale(" + view.k + ")";
    worlds.forEach(function (w) { w.style.transform = tf; });
    updateDetail();
    updateDreamButton();
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
  function inRect(p, r) { return p[0] >= r[0] && p[0] <= r[0] + r[2] && p[1] >= r[1] && p[1] <= r[1] + r[3]; }
  /* Areas may overlap (the roof area contains the upstairs rooms): the first
   * listed area containing the point wins, so rooms are listed before roof. */
  function areaAt(p) {
    return house.areas.filter(function (a) { return a.open && inRect(p, a.tap || a.rect); })[0] || null;
  }

  /* ------------------------------------------------------------ the dream */
  /* The bedroom can turn into the child's dream (a Land of Sweets). Things
   * placed while dreaming, inside the bedroom, belong to the dream (layer
   * "dream") and show only while dreaming; the bedroom's own things hide while
   * the dream is showing. One tap on the cloud button dreams; one tap wakes. */
  function inDream(x, y) { return !!(house.dream && inRect([x, y], house.dream.rect)); }
  function layerAt(x, y) { return store.doc.dream && inDream(x, y) ? "dream" : null; }
  function setLayer(o, x, y) { var l = layerAt(x, y); if (l) o.layer = l; else delete o.layer; }
  function strandMid(s) {
    var xs = s.pts.map(function (p) { return p[0]; }), ys = s.pts.map(function (p) { return p[1]; });
    return [(Math.min.apply(null, xs) + Math.max.apply(null, xs)) / 2, (Math.min.apply(null, ys) + Math.max.apply(null, ys)) / 2];
  }
  function visibleAt(layer, x, y) {
    var dreaming = !!(store && store.doc.dream);
    return layer === "dream" ? dreaming : !(dreaming && inDream(x, y));
  }
  function decoVisible(d) { return visibleAt(d.layer, d.x, d.y); }
  function strandVisible(s) { var m = strandMid(s); return visibleAt(s.layer, m[0], m[1]); }
  function musicKey(id) {
    var m = pack.music || {};
    if (store && store.doc.dream && house.dream && id === house.dream.area && m.dream) return "dream";
    return m[id] ? id : "overview";
  }
  function playAreaMusic() {
    var k = musicKey(currentArea), m = pack.music || {};
    A.switchTo(m[k] || null, pack.id + "/" + k);
  }
  /* Switch the house's holiday: each holiday has its OWN house inside the save
   * slot (decorations, lights, tree, night). Choosing another parks this one and
   * brings up that holiday's — a fresh empty house the first time, the old one
   * when you come back. Nothing is deleted. Undo history starts over. The tray
   * can still browse any holiday's library. */
  function setEvent(id) {
    if (!packs[id] || store.doc.event === id) return;
    saveNow();
    var doc = S.switchEvent(store.doc, id, defaultFixtureState(packs[id]));
    pack = packs[id];
    trayPack = id;
    store = new S.Store(doc, onChange);
    sel = null; placing = null; preview = null;
    decoEls.forEach(function (e) { e.remove(); }); decoEls.clear();
    applySkin();
    renderFixtures();
    A.play("chime");
    onChange(store.doc, true);
    store.commit();
    playAreaMusic();
    renderTray();
  }
  function packIcon(pk) {
    var c = pk.categories && pk.categories[0], d = c && decoIndex[pk.id + "/" + c.icon];
    return d ? '<img alt="" src="' + d.src + '">' : icon("star");
  }

  function toggleDream() {
    if (!house.dream) return;
    store.doc.dream = !store.doc.dream;
    if (sel && !selected()) sel = null;
    A.play(store.doc.dream ? "chime" : "dim");
    store.commit();
    playAreaMusic();
  }
  function updateDreamButton() {
    var b = $("btn-dream"); if (!b) return;
    var on = !!(house && house.dream && store && currentArea === house.dream.area);
    b.hidden = !on;
    if (!on) return;
    var p = G.toScreen(view, house.dream.button[0], house.dream.button[1]);
    b.style.left = clampN(p[0], 46, vw - 46) + "px"; b.style.top = clampN(p[1], 46, vh - 46) + "px";
    b.setAttribute("aria-pressed", store.doc.dream ? "true" : "false");
  }

  var nameTimer = 0;
  function setArea(id) {
    if (id === currentArea) return;
    currentArea = id;
    playAreaMusic();
    updateDreamButton();
    var a = areaById(id), tag = $("area-name");
    tag.textContent = a ? a.name : house.name;
    tag.classList.add("show");
    clearTimeout(nameTimer);
    nameTimer = setTimeout(function () { tag.classList.remove("show"); }, 1600);
    if (activeTab === "lights") renderTray();
  }

  function settleArea() {
    if (view.k < overviewView.k * 1.35) { setArea("overview"); return; }
    var c = G.toScene(view, vw / 2, vh / 2), cur = areaById(currentArea);
    if (cur && inRect(c, cur.rect)) return;            // still in the same room: stay
    var a = areaAt(c);
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
      img.style.display = decoVisible(d) ? "" : "none";
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
    if (sel.type === "deco") { var d = findDeco(sel.id); return d && decoVisible(d) ? d : null; }
    if (sel.type === "strand") { var s = findStrand(sel.id); return s && strandVisible(s) ? s : null; }
    if (sel.type === "topper") return store.doc.fixtures[sel.id] ? sel : null;
    return null;
  }
  function select(next) {
    sel = next;
    renderDecos(); renderOverlay(); renderPanel(); requestDraw();
  }

  function placeDecoration(key, at, trySnap) {
    var def = decoIndex[key]; if (!def) return;
    var p = at || (function () {
      var c = G.toScene(view, vw / 2, vh / 2), j = function () { return (Math.random() - 0.5) * 80; };
      return [c[0] + j(), c[1] + j()];
    })();
    var id;
    edit(function (doc) {
      id = store.nextId("d");
      var d = { id: id, pack: def.pack, kind: def.id, x: Math.round(p[0]), y: Math.round(p[1]), s: 1, r: 0, z: maxZ() + 1, flip: false };
      var sn = trySnap ? snapFor(d, def) : null;
      if (sn) { d.x = sn.x; d.y = sn.y; d.r = sn.r; }
      setLayer(d, d.x, d.y);
      doc.decorations.push(d);
    });
    snapCue = null;
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
        var c = S.clone(d); c.id = nid; c.x += 40; c.y += 30; c.z = maxZ() + 1; setLayer(c, c.x, c.y);
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

  /* ------------------------------------------------------------ snapping */
  /* Snap targets: the house's own (floors, mantel/shelves, sills, wall hooks)
   * plus branch tips of any tree the current event brings. Optional — the
   * magnet in the Scene tab turns it off — and gentle: only within a finger's
   * reach of a target, and a cue shows where it will settle before the lift. */
  function snapTargets() {
    if (snapCache && snapCache.pack === pack.id) return snapCache.list;
    var list = (house.snaps || []).slice();
    packFixtures(pack).forEach(function (f) {
      if (f.wrap) G.treeBranchPoints(f.wrap, f.branchSpacing || 64).forEach(function (p) { list.push({ type: "tree", point: p }); });
    });
    snapCache = { pack: pack.id, list: list };
    return list;
  }
  function snapTol() { return clampN(30 / view.k, 14, 90); }
  function snapFor(d, def) {
    if (!store.doc.snap) return null;
    return G.findSnap(d, def, snapTargets(), snapTol());
  }

  /* ------------------------------------------------------------ lights */
  function newStrand(mode, pts, sag, extra) {
    var id;
    edit(function (doc) {
      id = store.nextId("s");
      doc.strands.push({
        id: id, mode: mode, pts: pts.map(function (p) { return [Math.round(p[0]), Math.round(p[1])]; }), sag: Math.round(sag || 0),
        style: placing ? placing.style : lastStrand.style, colorMode: lastStrand.colorMode, color: lastStrand.color, palette: null,
        size: lastStrand.size, spacing: lastStrand.spacing, effect: lastStrand.effect, on: true, behind: false
      });
      var ns = doc.strands[doc.strands.length - 1];
      if (extra) Object.assign(ns, extra);
      var mid = strandMid(ns); setLayer(ns, mid[0], mid[1]);
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
    /* A wrap goes BEHIND decorations: ornaments hang in front of the lights. */
    newStrand("path", G.treeWrap(tree.wrap), 0, { behind: true });
    placing = keepPlacing;
  }

  function lightAlong(lp) {
    var a = areaById(lp.area);
    if (a && currentArea !== a.id) zoomToArea(a);
    var keep = placing;
    placing = { style: lp.style || lastStrand.style, mode: "draw" };
    newStrand("path", lp.pts, 0);
    placing = keep;
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
      var def = defOf(d); if (!def || !def.glow || !decoVisible(d)) return;
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
      var o = {
        view: view, doc: store.doc, time: (ts - t0) / 1000, multi: pack.lights.multi,
        preview: preview, selectedId: sel && sel.type === "strand" ? sel.id : null,
        decoGlows: decoGlows(), toppers: toppers(), windows: house.nightWindows,
        strands: store.doc.strands.filter(strandVisible)
      };
      rendererBack.draw(Object.assign({ layer: "back" }, o));
      renderer.draw(Object.assign({ layer: "front" }, o));
    }
    if (anim || dirty) requestAnimationFrame(frame); else rafOn = false;
  }

  /* ------------------------------------------------------------ overlay (handles) */
  function renderOverlay() {
    overlay.innerHTML = "";
    if (snapCue && store) drawSnapCue(snapCue);
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
  function drawSnapCue(c) {
    var n = el("div", "snap-cue " + c.kind);
    if (c.kind === "rect") {
      var q0 = G.toScreen(view, c.rect[0], c.rect[1]), q1 = G.toScreen(view, c.rect[0] + c.rect[2], c.rect[1] + c.rect[3]);
      n.style.left = q0[0] + "px"; n.style.top = q0[1] + "px"; n.style.width = (q1[0] - q0[0]) + "px"; n.style.height = (q1[1] - q0[1]) + "px";
    } else if (c.kind === "point") {
      var p = G.toScreen(view, c.at[0], c.at[1]);
      n.style.left = p[0] + "px"; n.style.top = p[1] + "px";
    } else {
      var a = G.toScreen(view, c.from[0], c.from[1]), b = G.toScreen(view, c.to[0], c.to[1]);
      n.style.left = a[0] + "px"; n.style.top = (a[1] - 1) + "px"; n.style.width = Math.max(24, b[0] - a[0]) + "px";
    }
    overlay.appendChild(n);
  }
  function addHandle(kind, p, ic, idx, extra) {
    var h = el("div", "handle" + (ic ? "" : " point") + (extra ? " " + extra : ""), ic ? icon(ic) : "");
    h.dataset.h = kind;
    if (idx != null) h.dataset.i = idx;
    h.style.left = p[0] + "px"; h.style.top = p[1] + "px";
    overlay.appendChild(h);
  }

  /* ------------------------------------------------------------ hit testing */
  /* Top to bottom, as drawn: front strands, toppers, decorations, then the
   * strands that hang behind the decorations. */
  function strandHit(p, behind) {
    var doc = store.doc;
    for (var i = doc.strands.length - 1; i >= 0; i--) {
      var s = doc.strands[i];
      if (!!s.behind !== behind || !strandVisible(s)) continue;
      var line = renderer.layout(s).line.map(function (q) { return G.toScreen(view, q[0], q[1]); });
      var probes = s.style === "icicle" ? [p, [p[0], p[1] - 30 * view.k * s.size], [p[0], p[1] - 60 * view.k * s.size]] : [p];
      var tol = Math.max(20, window.CHLights.STYLE[s.style].r * s.size * view.k * 1.6);
      if (probes.some(function (q) { return G.polyDist(q, line) < tol; })) return { type: "strand", id: s.id };
    }
    return null;
  }
  function hitTest(p) {
    var sp = G.toScene(view, p[0], p[1]), doc = store.doc;
    var front = strandHit(p, false); if (front) return front;
    var tp = toppers();
    for (var j = 0; j < tp.length; j++) {
      var a = G.toScreen(view, tp[j].anchor[0], tp[j].anchor[1]);
      if (G.dist(a, p) < Math.max(30, tp[j].size / 2 * view.k * 1.3)) return { type: "topper", id: tp[j].id };
    }
    var ds = doc.decorations.slice().sort(function (a, b) { return b.z - a.z; });
    for (var k = 0; k < ds.length; k++) {
      var def = defOf(ds[k]);
      if (def && decoVisible(ds[k]) && G.hitBox(sp, ds[k], def.w, def.h, 10 / view.k)) return { type: "deco", id: ds[k].id };
    }
    return strandHit(p, true);
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
      snapHit = snapFor(d, defOf(d)); snapCue = snapHit && snapHit.cue;
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
      if (g.type === "move-deco") {
        var sh = snapHit; snapHit = null; snapCue = null;
        var dd = findDeco(g.orig.id);
        if (sh && dd && g.moved && !cancelled) { dd.x = sh.x; dd.y = sh.y; dd.r = sh.r; A.play("snap"); }
        if (dd && g.moved) setLayer(dd, dd.x, dd.y);
      }
      if (g.type === "move-strand" && g.moved) { var ms = findStrand(g.orig.id); if (ms) { var mm = strandMid(ms); setLayer(ms, mm[0], mm[1]); } }
      if (!store.discardIfUnchanged()) store.commit();
      renderOverlay();
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
      var ids = Object.keys(packs);
      if (ids.length > 1) {
        /* Library chips: browse any event's decorations, whatever the house's event. */
        var gp = el("div", "cat packs");
        ids.forEach(function (id) {
          var c = el("button", "pack-chip" + (id === trayPack ? " is-on" : ""), packIcon(packs[id]));
          c.setAttribute("aria-label", packs[id].name); c.dataset.pack = id;
          c.addEventListener("click", function () { trayPack = id; A.play("tick"); renderTray(); });
          gp.appendChild(c);
        });
        tray.appendChild(gp);
      }
      var tp = packs[trayPack] || pack;
      tp.categories.forEach(function (cat) {
        var g = el("div", "cat");
        tp.decorations.filter(function (d) { return d.cat === cat.id; }).forEach(function (d) {
          var b = el("button", "item", '<img alt="" src="' + decoIndex[tp.id + "/" + d.id].src + '">');
          b.setAttribute("aria-label", d.name);
          b.dataset.key = tp.id + "/" + d.id;
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
      /* House light paths (e.g. the roof's eaves): one tap hangs a whole
       * editable strand along the architecture. */
      (house.lightPaths || []).forEach(function (lp) {
        var lb = el("button", "btn", icon(lp.icon || "hang"));
        lb.setAttribute("aria-label", "Lights along the " + lp.id); lb.dataset.path = lp.id;
        lb.addEventListener("click", function () { lightAlong(lp); });
        g3.appendChild(lb);
      });
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
      var mag = el("button", "btn" + (store.doc.snap ? " is-on" : ""), icon("magnet"));
      mag.setAttribute("aria-label", "Snap into place"); mag.setAttribute("aria-pressed", store.doc.snap ? "true" : "false");
      mag.dataset.act = "snap";
      mag.addEventListener("click", function () { store.doc.snap = !store.doc.snap; A.play("tick"); store.commit(); });
      [day, night, master, mag].forEach(function (b) { gs.appendChild(b); });
      tray.appendChild(gs);
      if (Object.keys(packs).length > 1) {
        /* The event the whole house celebrates. */
        var ge = el("div", "tray-group");
        Object.keys(packs).forEach(function (id) {
          var eb = el("button", "btn event" + (store.doc.event === id ? " is-on" : ""), packIcon(packs[id]));
          eb.setAttribute("aria-label", packs[id].name); eb.setAttribute("aria-pressed", store.doc.event === id ? "true" : "false");
          eb.dataset.event = id;
          eb.addEventListener("click", function () { setEvent(id); });
          ge.appendChild(eb);
        });
        tray.appendChild(ge);
      }
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
        if (st.ghost) {
          st.ghost.style.left = ev.clientX + "px"; st.ghost.style.top = ev.clientY + "px";
          /* Show where it would settle, before the finger lifts. */
          var r0 = viewport.getBoundingClientRect(), def0 = decoIndex[b.dataset.key];
          var q = G.toScene(view, ev.clientX - r0.left, ev.clientY - r0.top);
          var probe = { x: q[0], y: q[1], s: 1, r: 0 };
          var sn = def0 && ev.clientY < r0.bottom ? snapFor(probe, def0) : null;
          var cue = sn ? sn.cue : null;
          if (JSON.stringify(cue) !== JSON.stringify(snapCue)) { snapCue = cue; renderOverlay(); }
        }
      }
      function end(ev) {
        if (ev.pointerId !== st.id) return;
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", end);
        window.removeEventListener("pointercancel", end);
        if (!st.ghost) return;
        st.ghost.remove();
        if (snapCue) { snapCue = null; renderOverlay(); }
        b.dataset.dragged = "1";
        if (ev.type === "pointercancel") return;
        var r = viewport.getBoundingClientRect();
        if (ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) {
          placeDecoration(b.dataset.key, G.toScene(view, ev.clientX - r.left, ev.clientY - r.top), true);
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
      /* Lights in front of the decorations, or behind them (ornaments in front). */
      var lay = el("button", "btn" + (s.behind ? " is-on" : ""), icon(s.behind ? "lights-back" : "lights-front"));
      lay.setAttribute("aria-label", s.behind ? "Lights behind the decorations" : "Lights in front of the decorations");
      lay.setAttribute("aria-pressed", s.behind ? "true" : "false"); lay.dataset.act = "behind";
      lay.addEventListener("click", function () { strandSet(function (x) { x.behind = !x.behind; }); A.play("tick"); });
      [pw, lay, cp, del, cl].forEach(function (b) { r1.appendChild(b); });
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

  $("btn-dream").addEventListener("click", function (e) { e.stopPropagation(); toggleDream(); });
  $("btn-dream").addEventListener("pointerdown", function (e) { e.stopPropagation(); A.kick(); });

  /* Test hook for tools/drive-slice.mjs — read-only views of state. */
  window.CH = {
    doc: function () { return store && store.doc; },
    view: function () { return Object.assign({}, view); },
    area: function () { return currentArea; },
    sel: function () { return sel; },
    slot: function () { return slot; },
    toScreen: function (x, y) { var r = viewport.getBoundingClientRect(), p = G.toScreen(view, x, y); return [p[0] + r.left, p[1] + r.top]; },
    audio: function () { return A.debug(); },
    undoDepth: function () { return store ? store.undoStack.length : 0; },
    snapTargets: function () { return snapTargets(); },
    house: function () { return house; },
    version: V,
    visible: function (id) { var d = findDeco(id); return !!(d && decoVisible(d)); }
  };

  boot();
})();
