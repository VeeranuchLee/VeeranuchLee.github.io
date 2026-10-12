(() => {
  "use strict";
  const E = BeadEngine,
    families = ["round", "pearl", "crystal", "heart", "flower", "star"],
    icons = {
      round: "●",
      pearl: "◉",
      crystal: "◆",
      heart: "♥",
      flower: "✿",
      star: "★",
    },
    colors = [
      ["ruby", "#d93455"],
      ["tangerine", "#ec7b3c"],
      ["gold", "#e5b83f"],
      ["emerald", "#2f9b72"],
      ["aqua", "#35aeb5"],
      ["sapphire", "#356dcc"],
      ["lavender", "#9b79c9"],
      ["rose", "#e889a3"],
      ["cream", "#f5e7c8"],
      ["cocoa", "#9a6046"],
    ],
    charms = [
      "daisy",
      "butterfly",
      "strawberry",
      "cat",
      "bow",
      "heart",
      "moon",
      "seashell",
    ],
    charmIcons = ["✿", "🦋", "🍓", "🐱", "🎀", "♥", "☾", "🐚"];
  let state = E.create("necklace"),
    selected = null,
    family = "round",
    muted = false,
    audio = null,
    gift = { paper: "#d98f9c", ribbon: "#d3a43b" };
  const $ = (s) => document.querySelector(s),
    $$ = (s) => [...document.querySelectorAll(s)];
  function sound(kind) {
    if (muted) return;
    try {
      audio = audio || new AudioContext();
      const t = audio.currentTime,
        o = audio.createOscillator(),
        g = audio.createGain();
      o.connect(g).connect(audio.destination);
      o.frequency.value =
        { click: 360, snap: 620, ding: 880, rustle: 170 }[kind] || 440;
      o.type = kind === "rustle" ? "sawtooth" : "sine";
      g.gain.setValueAtTime(0.06, t);
      g.gain.exponentialRampToValueAtTime(
        0.001,
        t + (kind === "ding" ? 0.5 : 0.12),
      );
      o.start(t);
      o.stop(t + (kind === "ding" ? 0.5 : 0.12));
    } catch {}
  }
  function screen(id) {
    $$(".screen").forEach((x) => x.classList.toggle("active", x.id === id));
    if (id === "tryon") renderTry();
    if (id === "gallery") renderGallery();
  }
  function bubble(text) {
    const b = $("#bubble");
    b.textContent = text;
    b.classList.add("show");
    setTimeout(() => b.classList.remove("show"), 1100);
  }
  function svgPiece(target, data, mode = "editor") {
    const ns = "http://www.w3.org/2000/svg";
    target.replaceChildren();
    const defs = document.createElementNS(ns, "defs");
    defs.innerHTML =
      '<linearGradient id="rainbow"><stop stop-color="#d93455"/><stop offset=".25" stop-color="#e5b83f"/><stop offset=".5" stop-color="#35aeb5"/><stop offset=".75" stop-color="#356dcc"/><stop offset="1" stop-color="#9b79c9"/></linearGradient><radialGradient id="pearl"><stop stop-color="#fff"/><stop offset=".42" stop-color="var(--bead)"/><stop offset="1" stop-color="#a9848c"/></radialGradient><linearGradient id="crystal" x2="1" y2="1"><stop stop-color="#fff" stop-opacity=".9"/><stop offset=".45" stop-color="var(--bead)" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity=".2"/></linearGradient>';
    target.append(defs);
    const cord = document.createElementNS(ns, "path");
    cord.setAttribute("fill", "none");
    cord.setAttribute(
      "stroke",
      data.cord === "gold"
        ? "#d7a52b"
        : data.cord === "silver"
          ? "#b8bec8"
          : "url(#rainbow)",
    );
    cord.setAttribute("stroke-width", "1.2");
    cord.setAttribute(
      "d",
      data.type === "bracelet"
        ? "M20 50 A30 27 0 1 1 80 50 A30 27 0 1 1 20 50"
        : data.type === "earrings"
          ? "M28 17 L38 72 M72 17 L62 72"
          : "M18 22 Q50 84 82 22",
    );
    target.append(cord);
    data.items.forEach((p) => {
      const g = document.createElementNS(ns, "g");
      g.setAttribute(
        "class",
        "slot" + (p.index === selected ? " selected" : ""),
      );
      g.dataset.index = p.index;
      if (p.item) g.style.setProperty("--bead", p.item.color);
      const c = document.createElementNS(ns, "circle");
      c.setAttribute("cx", p.x);
      c.setAttribute("cy", p.y);
      c.setAttribute("r", p.item ? 4.1 : 3.4);
      c.setAttribute(
        "fill",
        p.item?.family === "pearl"
          ? "url(#pearl)"
          : p.item?.family === "crystal"
            ? "url(#crystal)"
            : p.item
              ? p.item.color
              : "#fff8",
      );
      c.setAttribute(
        "stroke",
        p.item?.family === "pearl"
          ? "#fff"
          : p.item?.family === "crystal"
            ? "#aef"
            : "#7d5948",
      );
      c.setAttribute("stroke-width", p.item ? 1 : 0.6);
      g.append(c);
      if (p.item && p.item.family !== "round" && p.item.family !== "pearl") {
        const t = document.createElementNS(ns, "text");
        t.setAttribute("x", p.x);
        t.setAttribute("y", p.y + 2);
        t.setAttribute("text-anchor", "middle");
        t.setAttribute("font-size", "6");
        t.setAttribute("fill", "#fff");
        t.textContent = icons[p.item.family] || "◆";
        g.append(t);
      }
      if (mode === "editor")
        g.addEventListener("click", () => {
          selected = p.index;
          render();
          sound("click");
        });
      target.append(g);
    });
    if (data.centrepiece) {
      const t = document.createElementNS(ns, "text");
      t.setAttribute("x", "50");
      t.setAttribute("y", data.type === "bracelet" ? "54" : "72");
      t.setAttribute("text-anchor", "middle");
      t.setAttribute("font-size", "12");
      t.textContent = charmIcons[charms.indexOf(data.centrepiece)] || "♥";
      target.append(t);
    }
  }
  function render() {
    svgPiece($("#cord"), E.renderData(state));
    $("#mirror").setAttribute("aria-pressed", state.mirror);
    $("#mirror").classList.toggle("selected", state.mirror);
  }
  function choose(item) {
    state = E.place(state, item, selected);
    selected = null;
    render();
    sound("snap");
  }
  function buildTray() {
    const fam = $("#families");
    families.forEach((f) => {
      const b = document.createElement("button");
      b.className = "family";
      b.textContent = icons[f];
      b.title = f;
      b.onclick = () => {
        family = f;
        $$(".family").forEach((x) => x.classList.toggle("selected", x === b));
        sound("click");
      };
      fam.append(b);
    });
    fam.firstChild.classList.add("selected");
    const cols = $("#colors");
    colors.forEach(([name, color]) => {
      const b = document.createElement("button");
      b.className = "swatch";
      b.style.background = color;
      b.title = name;
      b.onclick = () => choose({ family, color, name });
      cols.append(b);
    });
    const cs = $("#charms");
    charms.forEach((c, i) => {
      const b = document.createElement("button");
      b.className = "charm";
      b.textContent = charmIcons[i];
      b.title = c;
      b.onclick = () => {
        state = E.setOption(state, "centrepiece", c);
        render();
        sound("snap");
      };
      cs.append(b);
    });
    const grid = $("#collection-grid");
  families.forEach((f) =>
    colors.forEach(([n, c]) => {
      const d = document.createElement("div");
      d.className = `bead-preview ${f}`;
      d.style.background = c;
      d.title = `${n} ${f}`;
      grid.append(d);
    }),
  );
  }
  function save() {
    const record = E.deserialize(E.serialize(state));
    record.id = record.id || `${Date.now()}`;
    const all = loadAll();
    try {
      const ix = all.findIndex((x) => x.id === record.id);
      if (ix >= 0) all[ix] = record;
      else all.unshift(record);
      localStorage.setItem(
        "little-charm-designs",
        JSON.stringify(all.slice(0, 12)),
      );
      state = record;
      state.history = [];
    } catch {}
    sound("ding");
    bubble("Saved in your jewellery box!");
  }
  function loadAll() {
    try {
      const parsed = JSON.parse(
        localStorage.getItem("little-charm-designs") || "[]",
      );
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter(
          (record) =>
            record &&
            E.TYPES[record.type] &&
            Array.isArray(record.slots) &&
            record.slots.length === E.TYPES[record.type],
        )
        .map((record) => E.deserialize(record));
    } catch {
      return [];
    }
  }
  function renderTry() {
    svgPiece($(".overlay-jewel"), E.renderData(state), "display");
  }
  function renderGallery() {
    const box = $("#saved-grid"),
      all = loadAll();
    box.replaceChildren();
    $("#empty").hidden = all.length > 0;
    all.slice(0, 6).forEach((d) => {
      const b = document.createElement("button"),
        s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      s.setAttribute("viewBox", "0 0 100 100");
      svgPiece(s, E.renderData(d), "display");
      b.append(s);
      b.onclick = () => {
        state = E.deserialize(d);
        screen("workshop");
        render();
      };
      box.append(b);
    });
  }
  $$("[data-open]").forEach(
    (b) =>
      (b.onclick = () => {
        state = E.create(b.dataset.open);
        screen("workshop");
        render();
        sound("click");
      }),
  );
  $$("[data-screen]").forEach(
    (b) =>
      (b.onclick = () => {
        screen(b.dataset.screen);
        sound("click");
      }),
  );
  $$(".type-tabs button").forEach(
    (b) =>
      (b.onclick = () => {
        state = E.create(b.dataset.type);
        selected = null;
        render();
      }),
  );
  $("#undo").onclick = () => {
    state = E.undo(state);
    render();
    sound("click");
  };
  $("#remove").onclick = () => {
    if (selected !== null) {
      state = E.remove(state, selected);
      selected = null;
      render();
      sound("click");
    }
  };
  $("#mirror").onclick = () => {
    state = E.setOption(state, "mirror", !state.mirror);
    render();
    sound("click");
  };
  $$(".cord-choice").forEach(
    (b) =>
      (b.onclick = () => {
        state = E.setOption(state, "cord", b.dataset.cord);
        render();
        sound("click");
      }),
  );
  $$(".finish").forEach((b) => (b.onclick = () => screen("tryon")));
  $("#save").onclick = save;
  $("#display").onclick = () => {
    const img = $("#try-bg");
    img.src = img.src.includes("display-stand")
      ? "assets/try-on-character.webp"
      : "assets/display-stand.webp";
    renderTry();
  };
  $("#home").onclick = () => screen("shop");
  $("#mute").onclick = () => {
    muted = !muted;
    $("#mute").textContent = muted ? "♪̸" : "♪";
  };
  $("#register").onclick = () => {
    $("#gift").hidden = false;
    $("#receipt-piece").textContent = `One ${state.type}`;
    $("#receipt-card").textContent = $("#card").value;
    sound("ding");
    setTimeout(() => sound("rustle"), 180);
  };
  $$("[data-paper]").forEach(
    (b) =>
      (b.onclick = () => {
        gift.paper = b.dataset.paper;
        $(".gift-box").style.setProperty("--paper", gift.paper);
        sound("rustle");
      }),
  );
  const ribbonColors = { rose: "#b85d73", gold: "#d3a43b", sage: "#718c68" };
  $$("[data-ribbon]").forEach(
    (b) =>
      (b.onclick = () => {
        gift.ribbon = ribbonColors[b.dataset.ribbon];
        $(".gift-box").style.setProperty("--ribbon", gift.ribbon);
        sound("rustle");
      }),
  );
  $$(".hotspots button").forEach((b) =>
    b.addEventListener("pointerdown", () =>
      bubble(b.getAttribute("aria-label")),
    ),
  );
  buildTray();
  render();
})();
