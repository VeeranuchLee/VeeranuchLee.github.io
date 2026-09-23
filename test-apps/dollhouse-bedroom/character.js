/* Characters: the data model, the layered renderer, and My Dolls.
 *
 * Shared by Make a Doll (which writes) and the room (which reads). This file is
 * the boundary the pilot-v2 refactor is really about:
 *
 *   A CHARACTER IS ASSEMBLED IN THE CREATOR AND PLACED IN THE ROOM AS ONE THING.
 *
 * The room never sees a dress or a shoe. It holds `{type:"character",
 * characterId}` and asks this file to draw it. That is what removed the whole
 * class of problem the old design kept producing -- a shoe sticker that had to
 * be snapped onto a foot by hand, in a room whose job is not dressing dolls.
 *
 * Nothing here knows what a dress IS. A slot names a family, a family has
 * variants, and `fit` says where the family sits on the body -- all of it read
 * from the generated kit, all of it measured off the art by
 * tools/check-variant-alignment.py. Adding a hairstyle is a data change.
 */

(function () {
  const KIT = window.KIT;

  /* Draw order, and therefore layering. The spec's order, with the layers this
   * art actually has; a slot with no art is simply absent, so hair-back and
   * hair-front already work the day split hair art arrives. */
  const LAYERS = ["hair-back", "body", "face", "outfit", "shoes", "hair-front", "accessory"];

  /* Which character slot each layer draws from. `body` currently carries the
   * skin, the eyes AND the hair, because they are one flat drawing -- so `face`,
   * `hair-back` and `hair-front` have nothing to draw yet and are listed above
   * for the day they do. */
  const LAYER_SLOT = {
    "hair-back": "hairBack",
    body: "body",
    face: "face",
    outfit: "outfit",
    shoes: "shoes",
    "hair-front": "hairFront",
    accessory: "accessory",
  };

  const bySlot = {};
  const byId = {};
  for (const f of KIT.stickers) {
    byId[f.id] = f;
    if (f.slot) (bySlot[f.slot] = bySlot[f.slot] || []).push(f);
  }

  const BODY = (bySlot.body || [])[0];

  /* The tabs the creator offers, in order.
   *
   * A tab has its own `id` because a SLOT can need TWO of them: one to choose
   * the design and one to choose its colourway. Hair has that pair, and Clothes
   * did not -- which made every dress colourway unreachable the moment the
   * creator replaced room-level Change. `id` is the tab's identity, `slot` is
   * the data it acts on, and the two are not the same thing.
   *
   *   pick "family"   choose WHICH design fills the slot
   *   pick "variant"  choose the colourway of whatever design is in it
   *   pick "many"     toggle several on and off (Extras)
   *
   * A tab with one option is drawn faded rather than hidden, so the child can
   * see the choice exists and is simply not stocked yet. */
  const CREATOR_SLOTS = [
    { id: "body", slot: "body", label: "Skin", pick: "variant" },
    { id: "eyes", slot: "eyes", label: "Eyes", pick: "variant" },
    { id: "hair", slot: "hair", label: "Hair", pick: "family" },
    { id: "hairColour", slot: "hair", label: "Hair colour", pick: "variant" },
    { id: "outfit", slot: "outfit", label: "Clothes", pick: "family" },
    { id: "outfitColour", slot: "outfit", label: "Colour", pick: "variant" },
    { id: "shoes", slot: "shoes", label: "Shoes", pick: "variant" },
    { id: "accessory", slot: "accessory", label: "Extras", pick: "many" },
  ];

  function familiesFor(slot) {
    return bySlot[slot] || [];
  }

  function variantsOf(id) {
    const f = byId[id];
    return f ? f.variants : [];
  }

  function srcOf(id, variantName) {
    const f = byId[id];
    if (!f) return null;
    const v = f.variants.find((x) => x.name === variantName) || f.variants[0];
    return v && v.src;
  }

  /* ------------------------------------------------------------- the model */

  function blankCharacter() {
    const outfit = familiesFor("outfit")[0];
    const shoes = familiesFor("shoes")[0];
    const hair = familiesFor("hair")[0];
    const eyes = familiesFor("eyes")[0];
    return {
      id: "character-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e4),
      appearance: {
        body: BODY ? BODY.variants[0].name : null,
        eyes: eyes ? { id: eyes.id, variant: eyes.variants[0].name } : null,
        hair: hair ? { id: hair.id, variant: hair.variants[0].name } : null,
        outfit: outfit ? { id: outfit.id, variant: outfit.variants[0].name } : null,
        shoes: shoes ? { id: shoes.id, variant: shoes.variants[0].name } : null,
        accessories: [],
      },
    };
  }

  /* Drop anything this kit no longer has rather than drawing a guess. A saved
   * doll outliving an asset rename must come back as a slightly plainer doll,
   * never as a broken one. */
  function sane(ch) {
    if (!ch || !ch.id || !ch.appearance) return null;
    const a = ch.appearance;
    const keepRef = (ref, slot) => {
      if (!ref || !byId[ref.id]) return null;
      if (byId[ref.id].slot !== slot) return null;
      const names = variantsOf(ref.id).map((v) => v.name);
      return { id: ref.id, variant: names.includes(ref.variant) ? ref.variant : names[0] };
    };
    /* Rebuilt, not patched. A record saved by an earlier shape of this model
     * carries keys that no longer mean anything (an old `face`, an old
     * `hairColor`), and mutating in place leaves them in localStorage forever.
     * Listing the fields here is the only place the record's shape is stated. */
    const body = BODY
      ? (BODY.variants.map((v) => v.name).includes(a.body) ? a.body : BODY.variants[0].name)
      : a.body;
    ch.appearance = {
      body: body,
      eyes: keepRef(a.eyes, "eyes"),
      hair: keepRef(a.hair, "hair"),
      outfit: keepRef(a.outfit, "outfit"),
      shoes: keepRef(a.shoes, "shoes"),
      accessories: (a.accessories || [])
        .map((r) => keepRef(r, "accessory"))
        .filter(Boolean)
        // One per family: she has one head and one hand.
        .filter((r, i, all) => all.findIndex((o) => o.id === r.id) === i),
    };
    return ch;
  }

  /* --------------------------------------------------------- the renderer */

  function fitOf(family) {
    return family.fit || KIT.wearFit;
  }

  /* Every layer this character is made of, as {family, variant}, in draw order. */
  function layersOf(ch) {
    const a = ch.appearance;
    const out = [];
    if (BODY && a.body) out.push({ family: BODY, variant: a.body, layer: "body" });
    for (const ref of [a.eyes, a.hair, a.outfit, a.shoes]) {
      if (ref && byId[ref.id]) {
        out.push({ family: byId[ref.id], variant: ref.variant, layer: byId[ref.id].slot });
      }
    }
    for (const ref of a.accessories || []) {
      if (byId[ref.id]) out.push({ family: byId[ref.id], variant: ref.variant, layer: "accessory" });
    }
    return out;
  }

  /* Build the character as a DOM element sized in percentages of the BODY, so a
   * placed doll is one box the room positions and scales as a unit. */
  function element(ch, opts) {
    const o = opts || {};
    const el = document.createElement("div");
    el.className = "character" + (o.className ? " " + o.className : "");
    const body = BODY;
    if (!body) return el;

    for (const L of layersOf(ch)) {
      const img = document.createElement("img");
      img.src = srcOf(L.family.id, L.variant);
      img.alt = "";
      img.className = "ch-layer ch-" + L.layer;
      if (L.layer === "body") {
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.left = "0";
        img.style.top = "0";
      } else {
        const f = fitOf(L.family);
        const wPct = (L.family.w * f.scale) / body.w * 100;
        const hPct = (L.family.h * f.scale) / body.h * 100;
        img.style.width = wPct + "%";
        img.style.height = hPct + "%";
        img.style.left = f.cx - wPct / 2 + "%";
        img.style.top = (f.bottom !== undefined ? f.bottom * 100 - hPct : f.top * 100) + "%";
      }
      el.appendChild(img);
    }
    return el;
  }

  function bodySize() {
    return BODY ? { w: BODY.w, h: BODY.h } : { w: 1, h: 1 };
  }

  /* -------------------------------------------------------- My Dolls store */

  const KEY = "dollhouse.characters";
  const SCHEMA = 1;

  function loadAll() {
    let raw;
    try {
      raw = localStorage.getItem(KEY);
    } catch (e) {
      return [];
    }
    if (!raw) return [];
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      return [];
    }
    if (!data || data.schema !== SCHEMA) return [];
    return (data.characters || []).map(sane).filter(Boolean);
  }

  function saveAll(list) {
    try {
      localStorage.setItem(KEY, JSON.stringify({ schema: SCHEMA, characters: list }));
    } catch (e) {
      /* private window, or storage off. The session still works. */
    }
  }

  /* Upsert: the creator edits in place when reopening an existing doll, so
   * editing one character can never touch another. */
  function put(ch) {
    const list = loadAll();
    const at = list.findIndex((c) => c.id === ch.id);
    if (at < 0) list.push(ch);
    else list[at] = ch;
    saveAll(list);
    return ch;
  }

  function get(id) {
    return loadAll().find((c) => c.id === id) || null;
  }

  window.Character = {
    LAYERS, LAYER_SLOT, CREATOR_SLOTS,
    familiesFor, variantsOf, srcOf, byId, BODY,
    blank: blankCharacter, sane, element, layersOf, bodySize,
    loadAll, saveAll, put, get,
    SCHEMA,
  };
})();
