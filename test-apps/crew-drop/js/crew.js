// The crew loads from assets/crew/<id>.webp (plus <id>-happy.webp in the party
// overlay). If the art is missing, the code draws the placeholder itself: the
// personified object in the character's colour, two simple eyes, and the one
// tell. No text inside art.
export const CREW = Object.freeze({
  ram: { colour: "#8FDCC2", accent: "#F2C14E", tell: "gold contacts" },
  storage: { colour: "#C7B5EE", accent: "#E9E1F8", tell: "drawers" },
  cpu: { colour: "#5CC3C0", warm: "#F5927A", tell: "core lights" },
  gpu: { colour: "#E06AB8", accent: "#F2C14E", tell: "paint dots" },
  token: { colour: "#F6CB57", tell: "bean" },
  bug: { colour: "#9C86C9", tell: "wire tangle" }
});

const eyesOpen = (y) => `<circle cx="38" cy="${y}" r="8.5" fill="#FFF"/><circle cx="62" cy="${y}" r="8.5" fill="#FFF"/><circle cx="40" cy="${y + 2}" r="3.6" fill="#3A2E27"/><circle cx="64" cy="${y + 2}" r="3.6" fill="#3A2E27"/>`;
const eyesSleepy = (y) => `<path d="M31 ${y}q7 6 14 0M55 ${y}q7 6 14 0" fill="none" stroke="#3A2E27" stroke-width="3.4" stroke-linecap="round"/>`;
const wrap = (inner) => `<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">${inner}</svg>`;

export function crewPlaceholderSVG(id, colour = CREW[id]?.colour) {
  if (id === "ram") return wrap(`
    <rect x="24" y="12" width="52" height="64" rx="14" fill="${colour}"/>
    <g fill="#F2C14E"><rect x="29" y="70" width="7" height="18" rx="3"/><rect x="41" y="70" width="7" height="18" rx="3"/><rect x="53" y="70" width="7" height="18" rx="3"/><rect x="65" y="70" width="7" height="18" rx="3"/></g>
    ${eyesOpen(42)}<path d="M44 54q6 5 12 0" stroke="#2F5D4E" stroke-width="3" fill="none" stroke-linecap="round"/>`);
  if (id === "storage") return wrap(`
    <rect x="22" y="10" width="56" height="80" rx="12" fill="${colour}"/>
    ${eyesSleepy(38)}
    <rect x="30" y="50" width="40" height="11" rx="4" fill="#E9E1F8" stroke="#9C86C9" stroke-width="1.6"/>
    <rect x="30" y="64" width="40" height="11" rx="4" fill="#E9E1F8" stroke="#9C86C9" stroke-width="1.6"/>
    <rect x="30" y="78" width="40" height="11" rx="4" fill="#E9E1F8" stroke="#9C86C9" stroke-width="1.6"/>
    <circle cx="50" cy="55.5" r="1.8" fill="#7D68A8"/><circle cx="50" cy="69.5" r="1.8" fill="#7D68A8"/><circle cx="50" cy="83.5" r="1.8" fill="#7D68A8"/>`);
  if (id === "cpu") return wrap(`
    <rect x="20" y="16" width="60" height="66" rx="12" fill="${colour}"/>
    <circle cx="33" cy="30" r="4.5" fill="#F2C14E"/><circle cx="44.3" cy="30" r="4.5" fill="#F2C14E"/><circle cx="55.7" cy="30" r="4.5" fill="#F2C14E"/><circle cx="67" cy="30" r="4.5" fill="#F2C14E"/>
    ${eyesOpen(52)}<path d="M44 64q6 5 12 0" stroke="#254E4C" stroke-width="3" fill="none" stroke-linecap="round"/>`);
  if (id === "gpu") return wrap(`
    <ellipse cx="50" cy="52" rx="33" ry="29" fill="${colour}"/>
    <circle cx="35" cy="38" r="5" fill="#8FDCC2"/><circle cx="47" cy="32" r="5" fill="#9CC7EE"/><circle cx="59" cy="34" r="5" fill="#F2C14E"/><circle cx="68" cy="43" r="5" fill="#F5927A"/>
    ${eyesOpen(56)}<path d="M44 67q6 5 12 0" stroke="#8A2F66" stroke-width="3" fill="none" stroke-linecap="round"/>`);
  if (id === "token") return wrap(`
    <ellipse cx="50" cy="54" rx="36" ry="30" fill="none" stroke="${colour}" stroke-width="4" opacity=".45"/>
    <ellipse cx="50" cy="56" rx="30" ry="25" fill="${colour}" stroke="#D9A93F" stroke-width="3"/>
    ${eyesSleepy(48)}<circle cx="50" cy="66" r="2.6" fill="#8A6A2F"/>
    <ellipse cx="38" cy="46" rx="6" ry="3" fill="#FFF" opacity=".65"/>`);
  // bug (a lilac tangle of wire; board bugs draw their own piece colour instead)
  return wrap(`
    <g fill="none" stroke="#9C86C9" stroke-width="5.5" stroke-linecap="round">
      <circle cx="41" cy="48" r="17"/><circle cx="59" cy="44" r="14"/><circle cx="52" cy="61" r="13"/><circle cx="35" cy="61" r="11"/>
    </g>
    ${eyesOpen(50)}
    <path d="M42 62q8 7 16 0" fill="none" stroke="#3A2E27" stroke-width="3" stroke-linecap="round"/>`);
}

export function crewSlot(id, { cls = "", alt = "", happy = false } = {}) {
  const slot = document.createElement("span");
  slot.className = `crew-slot crew-${id}${cls ? " " + cls : ""}`;
  if (alt) {
    slot.setAttribute("role", "img");
    slot.setAttribute("aria-label", alt);
  } else slot.setAttribute("aria-hidden", "true");
  const img = document.createElement("img");
  const calm = `./assets/crew/${id}.webp`;
  let src = happy ? `./assets/crew/${id}-happy.webp` : calm;
  img.src = src;
  img.alt = "";
  img.draggable = false;
  img.decoding = "async";
  img.addEventListener("error", () => {
    if (src !== calm) { src = calm; img.src = calm; return; } // no happy pose yet — the calm art will do
    slot.innerHTML = crewPlaceholderSVG(id);
  });
  slot.append(img);
  return slot;
}
