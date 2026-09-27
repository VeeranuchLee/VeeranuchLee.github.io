/* Make a Doll — the character creator.
 *
 * The child picks from fixed slots and never positions anything. That is the
 * whole reason this screen exists: alignment is a property of the art, measured
 * once by tools/check-variant-alignment.py, and a four-year-old should not be
 * asked to land a shoe on a foot.
 *
 * Every tab, every option and every layer is read from the generated kit. This
 * file contains no list of hairstyles, no list of colours and no knowledge of
 * what a dress is.
 *
 * TABS ARE NOT SLOTS. A garment has two questions -- which design, and which
 * colourway -- and they cannot share one strip of buttons, because picking
 * "pyjamas" has to leave four colours still to choose from. So Character.js
 * declares one tab per QUESTION (`id`), each naming the slot it edits (`slot`),
 * and two tabs may name the same slot. Keying anything here on `def.slot` makes
 * Clothes and Colour the same tab, which is exactly the bug that hid every
 * dress colourway when this screen first replaced the room's Change tool.
 *
 * A tab with nothing behind it is not drawn. Eyes and hair are still baked into
 * the single flat `doll-girl` drawing, so those tabs are absent rather than
 * empty; the day the art is split they appear with no code change here.
 */

const C = window.Character;
const dollStage = document.getElementById("dollStage");
const slotBar = document.getElementById("slotBar");
const options = document.getElementById("options");

/* Editing an existing doll rather than making a new one: `?edit=<id>`. The
 * creator writes back to that same id, so editing one doll can never alter
 * another -- which is one of the spec's named failure conditions. */
const editing = new URLSearchParams(location.search).get("edit");
let ch = (editing && C.get(editing)) || C.blank();
let activeTab = null; // set once the kit is known, in firstTab() below

/* ------------------------------------------------------------------- doll */

function drawDoll() {
  const size = C.bodySize();
  dollStage.style.aspectRatio = `${size.w} / ${size.h}`;
  dollStage.textContent = "";
  dollStage.appendChild(C.element(ch));
}

/* ------------------------------------------------------------------ slots */

/* Which reference in the character record this tab edits. One place, so the
 * option builders below never special-case a slot name. */
function refFor(slot) {
  const a = ch.appearance;
  return slot === "outfit" ? a.outfit
    : slot === "shoes" ? a.shoes
    : slot === "hair" ? a.hair
    : slot === "eyes" ? a.eyes
    : null;
}

function setRef(slot, ref) {
  const a = ch.appearance;
  if (slot === "outfit") a.outfit = ref;
  else if (slot === "shoes") a.shoes = ref;
  else if (slot === "hair") a.hair = ref;
  else if (slot === "eyes") a.eyes = ref;
}

function currentFamily(slot) {
  const ref = refFor(slot);
  return (ref && C.byId[ref.id]) || C.familiesFor(slot)[0] || null;
}

function optionCount(def) {
  if (def.slot === "body") return C.BODY ? C.BODY.variants.length : 0;
  if (def.pick === "family" || def.pick === "many") return C.familiesFor(def.slot).length;
  const fam = currentFamily(def.slot);
  return fam ? C.variantsOf(fam.id).length : 0;
}

function shownTabs() {
  return C.CREATOR_SLOTS.filter((d) => optionCount(d) > 0);
}

function buildSlotBar() {
  slotBar.textContent = "";
  for (const def of shownTabs()) {
    const n = optionCount(def);
    const b = document.createElement("button");
    b.className = "slot-tab" + (def.id === activeTab ? " is-on" : "") + (n <= 1 ? " thin" : "");
    b.setAttribute("role", "tab");
    b.setAttribute("aria-selected", String(def.id === activeTab));
    b.dataset.tab = def.id;
    b.textContent = def.label;
    if (n > 1) {
      const dot = document.createElement("b");
      dot.className = "many";
      dot.textContent = n;
      b.appendChild(dot);
    }
    b.addEventListener("click", () => {
      activeTab = def.id;
      buildSlotBar();
      buildOptions();
    });
    slotBar.appendChild(b);
  }
}

/* ---------------------------------------------------------------- options */

function optionButton({ src, on, label, onPick }) {
  const b = document.createElement("button");
  b.className = "option" + (on ? " is-on" : "");
  b.setAttribute("role", "listitem");
  const img = document.createElement("img");
  img.src = src;
  img.alt = "";
  b.appendChild(img);
  if (label) {
    const cap = document.createElement("span");
    cap.textContent = label;
    b.appendChild(cap);
  }
  b.addEventListener("click", () => {
    onPick();
    C.sane(ch);
    drawDoll();
    buildSlotBar();
    buildOptions();
  });
  return b;
}

function buildOptions() {
  options.textContent = "";
  const def = C.CREATOR_SLOTS.find((d) => d.id === activeTab) || shownTabs()[0];
  if (!def) {
    options.appendChild(note("No art in the kit yet."));
    return;
  }
  // Read through a function, never a captured object: C.sane() REPLACES
  // ch.appearance, so a reference held from render time is stale by the time a
  // button is pressed.
  const a = () => ch.appearance;
  const fams = C.familiesFor(def.slot);

  if (def.slot === "body") {
    for (const v of (C.BODY ? C.BODY.variants : [])) {
      options.appendChild(optionButton({
        src: v.src, on: a().body === v.name,
        onPick: () => { a().body = v.name; },
      }));
    }
  } else if (def.pick === "family") {
    // WHICH design. Its colourway is the next tab along.
    for (const f of fams) {
      const cur = refFor(def.slot);
      options.appendChild(optionButton({
        src: f.variants[0].src, on: !!cur && cur.id === f.id, label: f.label,
        onPick: () => setRef(def.slot, { id: f.id, variant: f.variants[0].name }),
      }));
    }
  } else if (def.pick === "many") {
    for (const f of fams) {
      const worn = (a().accessories || []).find((r) => r.id === f.id);
      options.appendChild(optionButton({
        src: worn ? C.srcOf(f.id, worn.variant) : f.variants[0].src,
        on: !!worn, label: f.label,
        onPick: () => {
          const acc = a().accessories || (a().accessories = []);
          const at = acc.findIndex((r) => r.id === f.id);
          if (at >= 0) {
            // Tapping a worn extra cycles its colour and takes it off at the end
            // of the run, so one button both puts on and takes off -- there is no
            // separate remove gesture to teach.
            const names = C.variantsOf(f.id).map((v) => v.name);
            const next = names.indexOf(acc[at].variant) + 1;
            if (next >= names.length) acc.splice(at, 1);
            else acc[at].variant = names[next];
          } else {
            acc.push({ id: f.id, variant: f.variants[0].name });
          }
        },
      }));
    }
  } else {
    // The colourway of whatever design is in this slot.
    const fam = currentFamily(def.slot);
    if (!fam) {
      options.appendChild(note("Choose a design first."));
      return;
    }
    const cur = refFor(def.slot);
    for (const v of fam.variants) {
      options.appendChild(optionButton({
        src: v.src, on: !!cur && cur.variant === v.name,
        onPick: () => setRef(def.slot, { id: fam.id, variant: v.name }),
      }));
    }
  }

  if (!options.children.length) {
    options.appendChild(note("Nothing to choose from yet — this one needs new art."));
  } else if (options.children.length === 1) {
    options.appendChild(note("Only one for now."));
  }
}

function note(text) {
  const p = document.createElement("p");
  p.className = "option-note";
  p.textContent = text;
  return p;
}

/* ------------------------------------------------------------------- done */

document.getElementById("done").addEventListener("click", () => {
  C.put(C.sane(ch));
  // Straight back to the room, with the new doll ready in the tray.
  location.href = "./?doll=" + encodeURIComponent(ch.id);
});

C.sane(ch);
activeTab = (shownTabs()[0] || C.CREATOR_SLOTS[0]).id;
drawDoll();
buildSlotBar();
buildOptions();

window.MAKEDOLL = {
  get character() { return ch; },
  pickTab: (id) => { activeTab = id; buildSlotBar(); buildOptions(); },
  tabs: () => shownTabs().map((d) => d.id),
  optionEls: () => [...options.querySelectorAll(".option")],
  slotEls: () => [...slotBar.querySelectorAll(".slot-tab")],
};
