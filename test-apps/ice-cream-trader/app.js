(() => {
  "use strict";
  const R = window.IceCreamRules;
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const STORE_KEY = "ice-cream-trader-pilot-v1";
  const storage = window.SafeStorage.local;
  const SVG = (body) => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${body}</svg>`;
  const ICONS = {
    recipe: SVG('<path d="M5 4c3-1 5 0 7 2 2-2 4-3 7-2v15c-3-1-5 0-7 2-2-2-4-3-7-2Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 6v15" stroke="currentColor" stroke-width="2"/>'),
    satchel: SVG('<path d="M5 9h14l-1 11H6Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 9V7a4 4 0 0 1 8 0v2" fill="none" stroke="currentColor" stroke-width="2"/>'),
    sound: SVG('<path d="M4 10h4l5-4v12l-5-4H4Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M17 9c2 2 2 4 0 6" fill="none" stroke="currentColor" stroke-width="2"/>'),
    soundOff: SVG('<path d="M4 10h4l5-4v12l-5-4H4Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="m17 9 4 6m0-6-4 6" stroke="currentColor" stroke-width="2"/>'),
    close: SVG('<path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>'),
    map: SVG('<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 3v15m6-12v15" stroke="currentColor" stroke-width="2"/>'),
    info: SVG('<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 11v6m0-10h.01" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>'),
    coin: SVG('<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v10m-2-8h3a2 2 0 0 1 0 4h-3 3a2 2 0 0 1 0 4h-3" fill="none" stroke="currentColor" stroke-width="1.8"/>'),
    churn: SVG('<circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2v5m0 0 3-3m-3 3L9 4" fill="none" stroke="currentColor" stroke-width="2"/>'),
    scoop: SVG('<path d="M6 10a6 6 0 1 1 12 0c0 3-2 5-6 5s-6-2-6-5Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 15v7" stroke="currentColor" stroke-width="2"/>')
  };

  let saved = { muted: false, mode: "calm", game: null };
  try { saved = { ...saved, ...JSON.parse(storage.getItem(STORE_KEY) || "{}") }; } catch (_) {}
  let state = saved.game && saved.game.version === 1 ? saved.game : R.createGame(saved.mode);
  let audioContext = null;
  let currentPlace = null;
  let autoTimer = null;
  let drag = null;

  function persist() { saved.game = state; saved.mode = state.mode; storage.setItem(STORE_KEY, JSON.stringify(saved)); }
  function tone(kind = "tap") {
    if (saved.muted) return;
    try {
      audioContext = audioContext || new AudioContext();
      const now = audioContext.currentTime;
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const filter = audioContext.createBiquadFilter();
      const table = { tap: [430, 0.09], coin: [620, 0.13], pour: [260, 0.18], churn: [120, 0.16], frost: [760, 0.18], good: [660, 0.28] };
      const spec = table[kind] || table.tap;
      osc.type = kind === "churn" ? "triangle" : "sine";
      osc.frequency.setValueAtTime(spec[0], now);
      if (kind === "good") osc.frequency.exponentialRampToValueAtTime(990, now + spec[1]);
      filter.type = "lowpass"; filter.frequency.value = kind === "churn" ? 900 : 2200;
      gain.gain.setValueAtTime(0.045, now); gain.gain.exponentialRampToValueAtTime(0.001, now + spec[1]);
      osc.connect(filter).connect(gain).connect(audioContext.destination); osc.start(now); osc.stop(now + spec[1]);
    } catch (_) {}
  }
  const notify = (text) => { const n = $("#notice"); n.textContent = text; n.classList.add("show"); setTimeout(() => n.classList.remove("show"), 1200); };
  const ingredient = (id) => R.byId(R.INGREDIENTS, id);
  const recipe = () => R.recipeFor(state);
  const customer = () => R.customerFor(state);
  const coinStack = (count, cls = "coin-mini") => Array.from({ length: count }, () => `<span class="${cls}" aria-hidden="true"></span>`).join("");
  const ingredientCard = (id, count, options = "") => { const item = ingredient(id); return `<div class="ingredient-card" ${options}><img src="${item.art}" alt="${item.name}"><strong>${item.name}</strong><span class="count-mark">${count}</span></div>`; };

  function setIcons() {
    $("#recipeButton").innerHTML = ICONS.recipe;
    $("#pantryButton").innerHTML = ICONS.satchel;
    $("#soundButton").innerHTML = saved.muted ? ICONS.soundOff : ICONS.sound;
    $$(".dialog-close").forEach((button) => { button.innerHTML = ICONS.close; });
  }
  function renderHud() {
    const needed = R.missing(state);
    $("#hud").innerHTML = `<div class="hud-wallet"><img src="assets/items/coin.webp" alt=""><span>${state.wallet}</span></div><div class="hud-order"><img src="${customer().waiting}" alt="${customer().name}"><span>${recipe().name}</span></div><div class="hud-needed">${Object.entries(needed).slice(0, 4).map(([id, count]) => `<span><img src="${ingredient(id).art}" alt=""><b>${count}</b></span>`).join("") || '<span class="ready-mark">Ready to churn</span>'}</div>`;
  }
  function screen(html, name) { $("#screen").className = `screen ${name}`; $("#screen").innerHTML = html; renderHud(); }

  function renderOrder() {
    state.phase = "order"; persist();
    const r = recipe(), c = customer();
    screen(`<div class="painted shop-scene"><div class="customer-panel"><img class="customer" src="${c.waiting}" alt="${c.name} waiting"><div class="order-card"><h2>${c.name} would like</h2><img class="serve-preview" src="assets/items/${r.colour}-serve.webp" alt="${r.name}"><h3>${r.name}</h3><div class="recipe-row">${Object.entries(R.portions(r)).map(([id, count]) => ingredientCard(id, count)).join("")}</div><div class="mode-row"><button class="mode-choice ${state.mode === "calm" ? "selected" : ""}" data-mode="calm"><span class="guide-ring"></span><b>Calm</b><small>Guide stays</small></button><button class="mode-choice ${state.mode === "challenge" ? "selected" : ""}" data-mode="challenge"><span class="guide-ring fading"></span><b>Challenge</b><small>Guide fades</small></button></div><button id="openMap" class="picture-action">${ICONS.map}<span>Find the ingredients</span></button></div></div>`, "order-screen");
    $$("[data-mode]").forEach((button) => button.onclick = () => { state.mode = button.dataset.mode; persist(); renderOrder(); tone(); });
    $("#openMap").onclick = () => { tone(); renderMap(); };
  }

  function renderMap() {
    state.phase = "map"; persist();
    const need = R.missing(state);
    screen(`<div class="painted map-scene"><img class="scene-plate" src="assets/scenes/world-map.webp" alt="Painted world map with three ingredient places"><div class="map-title"><h2>Where should we go?</h2><p>Choose a place that has something in the recipe.</p></div><div class="map-places">${R.PLACES.map((place) => { const ids = R.INGREDIENTS.filter((x) => x.place === place.id && need[x.id]).map((x) => x.id); return `<button class="place-target ${ids.length ? "needed" : ""}" data-place="${place.id}" ${ids.length ? "" : "disabled"}><img src="${place.scene}" alt="${place.name}"><span>${place.name}</span><i>${ids.map((id) => `<img src="${ingredient(id).art}" alt="">`).join("")}</i></button>`; }).join("")}</div>${R.readyToChurn(state) ? `<button id="toStudio" class="picture-action studio-action">${ICONS.churn}<span>Return to the churn bowl</span></button>` : ""}</div>`, "map-screen");
    $$("[data-place]").forEach((button) => button.onclick = () => { currentPlace = button.dataset.place; tone(); renderPlace(currentPlace); });
    if ($("#toStudio")) $("#toStudio").onclick = () => { R.createChurn(state); persist(); renderChurn(); };
  }

  function renderPlace(placeId) {
    const place = R.byId(R.PLACES, placeId); currentPlace = placeId; state.phase = "place"; persist();
    const need = R.missing(state); const goods = R.INGREDIENTS.filter((item) => item.place === placeId);
    screen(`<div class="painted place-scene" style="--place:url('${place.scene}')"><div class="place-heading"><button id="backMap" class="round-button" aria-label="Back to the map">${ICONS.map}</button><h2>${place.name}</h2><button id="placeFact" class="round-button" aria-label="Open the picture fact">${ICONS.info}</button></div><div class="market-stall">${goods.map((item) => `<button class="product-card ${need[item.id] ? "needed" : ""}" data-buy="${item.id}" ${need[item.id] ? "" : "disabled"}><img src="${item.art}" alt="${item.name}"><strong>${item.name}</strong><span class="price">${coinStack(item.price)}</span><small>${need[item.id] ? `${need[item.id]} needed` : "Packed"}</small></button>`).join("")}</div><div id="payTray" class="pay-tray" hidden></div></div>`, "place-screen");
    $("#backMap").onclick = renderMap;
    $("#placeFact").onclick = () => { $("#factContent").innerHTML = `<img src="${place.scene}" alt=""><h2>${place.name}</h2><p>${place.fact}</p>`; $("#factDialog").showModal(); tone("frost"); };
    $$("[data-buy]").forEach((button) => button.onclick = () => { if (R.beginPurchase(state, button.dataset.buy)) renderPayTray(); });
  }

  function renderPayTray() {
    const pay = state.activePurchase, item = ingredient(pay.ingredientId), tray = $("#payTray");
    tray.hidden = false; tray.innerHTML = `<button id="closePay" class="dialog-close" aria-label="Close coin tray">${ICONS.close}</button><img src="${item.art}" alt="${item.name}"><div><h3>Tap ${pay.price} coin${pay.price === 1 ? "" : "s"}</h3><div class="paid-coins">${coinStack(pay.paid, "coin-paid")}</div><p>${pay.paid} of ${pay.price}</p></div><button id="payCoin" class="coin-button" aria-label="Pay one coin"></button>`;
    $("#closePay").onclick = () => { if (state.activePurchase) state.wallet += state.activePurchase.paid; state.activePurchase = null; tray.hidden = true; renderHud(); };
    $("#payCoin").onclick = () => { const before = state.activePurchase; if (!R.tapPurchaseCoin(state)) return; tone("coin"); persist(); if (!state.activePurchase) { notify(`${item.name} is in the satchel.`); setTimeout(() => renderPlace(currentPlace), 280); } else { renderPayTray(); renderHud(); } if (before && state.gentleRefills) renderHud(); };
  }

  function renderChurn() {
    const churn = state.churn || R.createChurn(state); if (!churn) return renderMap();
    const r = recipe();
    screen(`<div class="painted churn-scene"><div class="churn-heading"><h2>Churn &amp; Change</h2><p>${churn.phase === "cups" ? "Tap each measuring cup and watch its portion land." : churn.phase === "churn" ? "Make gentle circles anywhere on the wide lane." : churn.phase === "mix-in" ? "Tap the late mix-in." : churn.phase === "fold" ? "Make two final gentle circles to fold it through." : "Tap to scoop."}</p></div><div id="bowl" class="bowl colour-${r.colour} state-${churn.mixtureState}" aria-label="Churn bowl"><img class="machine" src="assets/items/churn-machine.webp" alt="Painted churn bowl and paddle"><div class="mixture ${churn.phase === "cups" ? "filling" : ""}"><img src="assets/items/mixture-${r.colour}-${churn.mixtureState}.webp" alt="Mixture changing as it freezes"><div class="base-blobs">${churn.cups.filter((cup) => cup.added).map((cup) => `<span class="base-blob"><img src="${ingredient(cup.id).art}" alt=""></span>`).join("")}</div></div><div id="churnLane" class="churn-lane ${state.mode === "challenge" && churn.progress > .22 ? "guide-faded" : ""}" aria-label="Wide circular churn lane"><span class="ghost-arrow"></span><div class="paddle"></div></div><div class="frost-overlay"></div></div><div class="churn-controls">${churn.phase === "cups" ? churn.cups.map((cup, index) => `<button class="cup-button ${cup.added ? "added" : ""}" data-cup="${index}" ${cup.added ? "disabled" : ""}><img src="${ingredient(cup.id).art}" alt="${ingredient(cup.id).name}"><span>${ingredient(cup.id).name}</span></button>`).join("") : ""}${["churn", "fold"].includes(churn.phase) ? `<button id="autoChurn" class="picture-action">${ICONS.churn}<span>${churn.phase === "fold" ? "Tap paddle to fold" : "Tap paddle to turn"}</span></button>` : ""}${churn.phase === "mix-in" ? churn.late.map((item, index) => `<button class="mix-button" data-mix="${index}"><img src="${ingredient(item.id).art}" alt="${ingredient(item.id).name}"><span>Add near the end</span></button>`).join("") : ""}${churn.phase === "scoop" ? `<button id="scoopButton" class="picture-action">${ICONS.scoop}<span>Scoop the ice cream</span></button>` : ""}</div></div>`, "churn-screen");
    $$("[data-cup]").forEach((button) => button.onclick = () => { R.tapCup(state, Number(button.dataset.cup)); tone("pour"); persist(); renderChurn(); });
    $$("[data-mix]").forEach((button) => button.onclick = () => { R.tapMixIn(state, Number(button.dataset.mix)); tone("pour"); persist(); renderChurn(); });
    if ($("#autoChurn")) $("#autoChurn").onclick = startAutoChurn;
    if ($("#scoopButton")) $("#scoopButton").onclick = () => { R.tapScoop(state); tone("good"); persist(); renderServe(); };
    bindChurnLane();
  }

  function startAutoChurn() {
    if (autoTimer) return; tone("churn");
    const startingPhase = state.churn.phase;
    autoTimer = setInterval(() => { if (!R.advanceChurn(state, 0.125) || state.churn.phase !== startingPhase) { clearInterval(autoTimer); autoTimer = null; tone("frost"); } persist(); renderChurn(); }, 180);
  }
  function bindChurnLane() {
    const lane = $("#churnLane"); if (!lane || !state.churn || !["churn", "fold"].includes(state.churn.phase)) return;
    lane.onpointerdown = (event) => { if (drag) return; const rect = lane.getBoundingClientRect(); const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2; drag = { id: event.pointerId, angle: Math.atan2(event.clientY - cy, event.clientX - cx), arc: 0, cx, cy }; lane.setPointerCapture?.(event.pointerId); };
    lane.onpointermove = (event) => { if (!drag || drag.id !== event.pointerId) return; const angle = Math.atan2(event.clientY - drag.cy, event.clientX - drag.cx); let delta = angle - drag.angle; while (delta > Math.PI) delta -= Math.PI * 2; while (delta < -Math.PI) delta += Math.PI * 2; drag.angle = angle; drag.arc += Math.abs(delta); if (drag.arc >= Math.PI * 0.55) { drag = null; R.advanceChurn(state, 0.25); tone("churn"); persist(); renderChurn(); } };
    const end = (event) => { if (drag && drag.id === event.pointerId) drag = null; };
    lane.onpointerup = end; lane.onpointercancel = end;
  }

  function renderServe() {
    const r = recipe(), c = customer();
    screen(`<div class="painted serve-scene"><div class="serve-card"><img class="customer" src="${c.waiting}" alt="${c.name}"><div class="finished"><img src="assets/items/${r.colour}-serve.webp" alt="${r.name}"><h2>${r.name}</h2></div><button id="serveButton" class="picture-action"><img src="assets/items/serve-tray.webp" alt=""><span>Serve ${c.name}</span></button></div></div>`, "serve-screen");
    $("#serveButton").onclick = () => { R.serve(state); tone("good"); persist(); renderPayment(); };
  }
  function renderPayment() {
    const pay = state.payment, c = customer();
    screen(`<div class="painted payment-scene"><div class="payment-card"><img class="customer happy" src="${c.happy}" alt="Happy ${c.name}"><div><h2>${c.name} pays exactly ${pay.due}</h2><p>Tap each coin to count the payment.</p><div class="counted">${coinStack(pay.counted, "coin-paid")}</div><strong>${pay.counted} of ${pay.due}</strong></div><button id="customerCoin" class="coin-button large" aria-label="Count one coin"></button></div></div>`, "payment-screen");
    $("#customerCoin").onclick = () => { R.tapCustomerCoin(state); tone("coin"); persist(); state.phase === "reward" ? renderReward() : renderPayment(); };
  }
  function renderReward() {
    const r = recipe();
    screen(`<div class="painted reward-scene"><div class="reward-card"><h2>The picnic collection grows</h2><div class="reward-pictures"><div><img src="assets/rewards/recipe-book.webp" alt="Recipe book"><span>${r.name} page</span></div><div><img src="assets/rewards/stamp-${r.placeStamp}.webp" alt="Place stamp"><span>Place stamp</span></div><div><img src="${R.byId(R.PLACES, r.placeStamp).postcard}" alt="Postcard"><span>Postcard</span></div></div><button id="nextOrder" class="picture-action"><img src="assets/rewards/picnic-table.webp" alt="Picnic table"><span>${state.orderIndex === 2 ? "Go to the picnic" : "Meet the next customer"}</span></button></div></div>`, "reward-screen");
    $("#nextOrder").onclick = () => { R.nextOrder(state); tone("good"); persist(); state.phase === "picnic" ? renderPicnic() : renderOrder(); };
  }
  function renderPicnic() {
    screen(`<div class="painted picnic-scene"><img class="picnic-art" src="assets/rewards/picnic-table.webp" alt="Bunny, Duckling and Hedgehog sharing three ice creams at the picnic table"><div class="picnic-copy"><h2>World Ice Cream Picnic</h2><p>Three recipes, three place stamps and three postcards are in the book.</p><button id="playAgain" class="picture-action">${ICONS.recipe}<span>Make the picnic again</span></button></div></div>`, "picnic-screen");
    $("#playAgain").onclick = () => { state = R.createGame(state.mode); persist(); renderOrder(); };
  }

  function renderBook() {
    $("#bookContent").innerHTML = `<h2>Recipe book</h2><div class="book-grid">${R.RECIPES.map((r) => `<article class="${state.recipes.includes(r.id) ? "earned" : ""}"><img src="assets/items/${r.colour}-serve.webp" alt="${r.name}"><h3>${r.name}</h3><div>${Object.entries(R.portions(r)).map(([id, count]) => `<span><img src="${ingredient(id).art}" alt="${ingredient(id).name}"><b>${count}</b></span>`).join("")}</div></article>`).join("")}</div>`;
  }
  function renderPantry() {
    $("#pantryContent").innerHTML = `<h2>Satchel</h2><div class="pantry-grid">${R.INGREDIENTS.map((item) => ingredientCard(item.id, state.pantry[item.id] || 0)).join("")}</div><div class="wallet-large"><img src="assets/items/coin.webp" alt=""><strong>${state.wallet}</strong><span>Coins for this order</span></div>`;
  }
  $("#recipeButton").onclick = () => { renderBook(); $("#bookDialog").showModal(); tone(); };
  $("#pantryButton").onclick = () => { renderPantry(); $("#pantryDialog").showModal(); tone(); };
  $("#soundButton").onclick = () => { saved.muted = !saved.muted; persist(); setIcons(); if (!saved.muted) tone(); };
  $$("[data-close]").forEach((button) => button.onclick = () => document.getElementById(button.dataset.close).close());
  setIcons();
  const renderers = { order: renderOrder, map: renderMap, place: () => renderMap(), cups: renderChurn, churn: renderChurn, "mix-in": renderChurn, fold: renderChurn, scoop: renderChurn, serve: renderServe, payment: renderPayment, reward: renderReward, picnic: renderPicnic };
  (renderers[state.phase] || renderOrder)();
  window.__iceCreamTrader = { getState: () => state, reset: () => { state = R.createGame(state.mode); persist(); renderOrder(); } };
})();
