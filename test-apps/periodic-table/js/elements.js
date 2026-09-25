/*
 * The one Periodic Table dataset.
 *
 * Row order is atomic-number order. The map below turns each row into the full
 * object consumed by Explore and every game: atomicNumber, symbol, name,
 * category, group, period, series, fact, icon, difficultySets, audioId, source.
 *
 * Category convention: common IUPAC-style school chart. Nh, Mc, Ts, and Og are
 * "unknown" because their chemistry is not yet confirmed; Fl and Lv are shown
 * as post-transition metals. La/Ac use null group because the separate f-block
 * rows are the table's placement, while main-table group 3 shows the owner's
 * 57-71 and 89-103 placeholders.
 */
(function () {
  "use strict";

  const STARTER_SYMBOLS = new Set(["H", "C", "N", "O", "Na", "Ca", "Fe", "Cu", "Ag", "Au"]);
  const COMMON_SYMBOLS = new Set([
    "H", "He", "Li", "C", "N", "O", "F", "Ne", "Na", "Mg", "Al", "Si", "P", "S",
    "Cl", "Ar", "K", "Ca", "Fe", "Cu", "Zn", "Br", "Ag", "Sn", "I", "Xe", "Au",
    "Hg", "Pb", "U"
  ]);

  // atomicNumber, symbol, name, category, group, period, series, fact, icon
  const ELEMENT_ROWS = [
    [1, "H", "Hydrogen", "reactive nonmetal", 1, 1, "main", "Hydrogen is part of water, and it is the lightest element.", "💧"],
    [2, "He", "Helium", "noble gas", 18, 1, "main", "Helium is lighter than air, so it makes balloons float upward.", "🎈"],
    [3, "Li", "Lithium", "alkali metal", 1, 2, "main", "Lithium is used in rechargeable batteries in phones and toys.", "🔋"],
    [4, "Be", "Beryllium", "alkaline earth metal", 2, 2, "main", "Beryllium is part of beryl, the mineral family that includes emeralds.", "💎"],
    [5, "B", "Boron", "metalloid", 13, 2, "main", "Boron is part of borax, a cleaner used on household surfaces.", "🧽"],
    [6, "C", "Carbon", "reactive nonmetal", 14, 2, "main", "The graphite in pencils is a form of carbon.", "✏️"],
    [7, "N", "Nitrogen", "reactive nonmetal", 15, 2, "main", "Nitrogen makes up most of the air around us.", "🌬️"],
    [8, "O", "Oxygen", "reactive nonmetal", 16, 2, "main", "People and animals need oxygen to breathe.", "☁️"],
    [9, "F", "Fluorine", "halogen", 17, 2, "main", "Fluorine is part of the fluoride in toothpaste that protects teeth.", "🪥"],
    [10, "Ne", "Neon", "noble gas", 18, 2, "main", "Neon makes bright signs glow.", "💡"],
    [11, "Na", "Sodium", "alkali metal", 1, 3, "main", "Sodium is part of table salt.", "🧂"],
    [12, "Mg", "Magnesium", "alkaline earth metal", 2, 3, "main", "Plants need magnesium to help make their green colour.", "🌿"],
    [13, "Al", "Aluminium", "post-transition metal", 13, 3, "main", "Aluminium is used to make drink cans and kitchen foil.", "🥫"],
    [14, "Si", "Silicon", "metalloid", 14, 3, "main", "Silicon is part of the sand on many beaches.", "🏖️"],
    [15, "P", "Phosphorus", "reactive nonmetal", 15, 3, "main", "Phosphorus helps bones and teeth grow strong.", "🦷"],
    [16, "S", "Sulfur", "reactive nonmetal", 16, 3, "main", "Sulfur is part of the smelly gas that gives rotten eggs their smell.", "🥚"],
    [17, "Cl", "Chlorine", "halogen", 17, 3, "main", "Chlorine is used in swimming-pool water to kill germs.", "🏊"],
    [18, "Ar", "Argon", "noble gas", 18, 3, "main", "Argon is the gas inside glowing light bulbs.", "💡"],
    [19, "K", "Potassium", "alkali metal", 1, 4, "main", "Potassium is found in bananas and helps muscles work.", "🍌"],
    [20, "Ca", "Calcium", "alkaline earth metal", 2, 4, "main", "Calcium helps bones and teeth stay strong.", "🦴"],
    [21, "Sc", "Scandium", "transition metal", 3, 4, "main", "Scandium is used to make strong, light bicycle frames.", "🚲"],
    [22, "Ti", "Titanium", "transition metal", 4, 4, "main", "Titanium is strong and light, so it is used in aeroplanes.", "✈️"],
    [23, "V", "Vanadium", "transition metal", 5, 4, "main", "Vanadium is added to steel to make tools tougher.", "🔧"],
    [24, "Cr", "Chromium", "transition metal", 6, 4, "main", "A tiny amount of chromium gives rubies their red colour.", "💎"],
    [25, "Mn", "Manganese", "transition metal", 7, 4, "main", "Manganese is added to steel to make it stronger.", "🔋"],
    [26, "Fe", "Iron", "transition metal", 8, 4, "main", "Iron is the metal in nails, bridges, and tools.", "🔩"],
    [27, "Co", "Cobalt", "transition metal", 9, 4, "main", "Cobalt is used in batteries for electric cars.", "🚗"],
    [28, "Ni", "Nickel", "transition metal", 10, 4, "main", "Nickel is used in rechargeable batteries and shiny metal coatings.", "🪙"],
    [29, "Cu", "Copper", "transition metal", 11, 4, "main", "Copper carries electricity along wires.", "🧶"],
    [30, "Zn", "Zinc", "transition metal", 12, 4, "main", "Zinc is added to metal parts to help stop rust.", "🧴"],
    [31, "Ga", "Gallium", "post-transition metal", 13, 4, "main", "Gallium helps make electronics and LED lights work.", "💡"],
    [32, "Ge", "Germanium", "metalloid", 14, 4, "main", "Germanium is used in fibre-optic cables and computer chips.", "🔌"],
    [33, "As", "Arsenic", "metalloid", 15, 4, "main", "Arsenic was used in older pressure-treated wood to help it last longer.", "🪵"],
    [34, "Se", "Selenium", "reactive nonmetal", 16, 4, "main", "Selenium is found in tiny amounts in foods such as eggs and nuts.", "🥜"],
    [35, "Br", "Bromine", "halogen", 17, 4, "main", "Bromine is used in flame-resistant materials.", "🧯"],
    [36, "Kr", "Krypton", "noble gas", 18, 4, "main", "Krypton is used in bright lamps and camera flashes.", "💡"],
    [37, "Rb", "Rubidium", "alkali metal", 1, 5, "main", "Rubidium gives fireworks a bright violet colour.", "🎆"],
    [38, "Sr", "Strontium", "alkaline earth metal", 2, 5, "main", "Strontium gives fireworks a bright red colour.", "🎆"],
    [39, "Y", "Yttrium", "transition metal", 3, 5, "main", "Yttrium is used in bright lights and camera lenses.", "📷"],
    [40, "Zr", "Zirconium", "transition metal", 4, 5, "main", "Zirconium dioxide is used to make strong, sparkly costume jewels.", "💎"],
    [41, "Nb", "Niobium", "transition metal", 5, 5, "main", "Niobium is used in jet engines because it stays strong when it is hot.", "✈️"],
    [42, "Mo", "Molybdenum", "transition metal", 6, 5, "main", "Molybdenum is added to steel to make it tougher.", "🔧"],
    [43, "Tc", "Technetium", "transition metal", 7, 5, "main", "Scientists made technetium in a laboratory, and it has no stable form.", "🧪"],
    [44, "Ru", "Ruthenium", "transition metal", 8, 5, "main", "Ruthenium is used in hard coatings and electrical contacts.", "💻"],
    [45, "Rh", "Rhodium", "transition metal", 9, 5, "main", "Rhodium helps clean car exhaust gas in a catalytic converter.", "🚗"],
    [46, "Pd", "Palladium", "transition metal", 10, 5, "main", "Palladium is used in catalytic converters, which help clean car exhaust.", "🚗"],
    [47, "Ag", "Silver", "transition metal", 11, 5, "main", "Silver is used in spoons, jewellery, and solar panels.", "🥄"],
    [48, "Cd", "Cadmium", "transition metal", 12, 5, "main", "Cadmium is used in rechargeable batteries and yellow paints.", "🔋"],
    [49, "In", "Indium", "post-transition metal", 13, 5, "main", "Indium is used in touchscreens and flat-screen displays.", "📱"],
    [50, "Sn", "Tin", "post-transition metal", 14, 5, "main", "Tin is part of the metal coating on steel food cans.", "🥫"],
    [51, "Sb", "Antimony", "metalloid", 15, 5, "main", "Antimony is used in flame-resistant materials.", "🔥"],
    [52, "Te", "Tellurium", "metalloid", 16, 5, "main", "Tellurium is used in electronics and solar-cell materials.", "🔆"],
    [53, "I", "Iodine", "halogen", 17, 5, "main", "Iodine is added to table salt to help our bodies stay healthy.", "🧴"],
    [54, "Xe", "Xenon", "noble gas", 18, 5, "main", "Xenon gives camera flash lights their bright white glow.", "💡"],
    [55, "Cs", "Caesium", "alkali metal", 1, 6, "main", "Caesium is used in atomic clocks that keep very accurate time.", "⏱️"],
    [56, "Ba", "Barium", "alkaline earth metal", 2, 6, "main", "Barium helps give fireworks a bright green colour.", "🎆"],
    [57, "La", "Lanthanum", "lanthanide", null, 6, "lanthanide", "Lanthanum is used in camera lenses that need sharp colours.", "📷"],
    [58, "Ce", "Cerium", "lanthanide", null, 6, "lanthanide", "Cerium helps clean car exhaust gas in a catalytic converter.", "🚗"],
    [59, "Pr", "Praseodymium", "lanthanide", null, 6, "lanthanide", "Praseodymium is used in protective glasses and camera lenses.", "🥽"],
    [60, "Nd", "Neodymium", "lanthanide", null, 6, "lanthanide", "Neodymium makes very strong magnets.", "🧲"],
    [61, "Pm", "Promethium", "lanthanide", null, 6, "lanthanide", "Scientists made promethium in a laboratory, and it has no stable form.", "🧪"],
    [62, "Sm", "Samarium", "lanthanide", null, 6, "lanthanide", "Samarium helps make strong magnets.", "🧲"],
    [63, "Eu", "Europium", "lanthanide", null, 6, "lanthanide", "Europium is used in the glowing parts of screens and lamps.", "💡"],
    [64, "Gd", "Gadolinium", "lanthanide", null, 6, "lanthanide", "Gadolinium is used in medical scans to make images clearer.", "🏥"],
    [65, "Tb", "Terbium", "lanthanide", null, 6, "lanthanide", "Terbium helps make the green lights in screens.", "📺"],
    [66, "Dy", "Dysprosium", "lanthanide", null, 6, "lanthanide", "Dysprosium helps make high-temperature magnets stronger.", "🚗"],
    [67, "Ho", "Holmium", "lanthanide", null, 6, "lanthanide", "Holmium is used in lasers and strong magnets.", "🧲"],
    [68, "Er", "Erbium", "lanthanide", null, 6, "lanthanide", "Erbium is used in optical-fibre cables that send data by light.", "💡"],
    [69, "Tm", "Thulium", "lanthanide", null, 6, "lanthanide", "Thulium is used in portable X-ray machines.", "🩻"],
    [70, "Yb", "Ytterbium", "lanthanide", null, 6, "lanthanide", "Ytterbium is used in lasers and metal parts.", "🔦"],
    [71, "Lu", "Lutetium", "lanthanide", null, 6, "lanthanide", "Lutetium is used in screens and medical scans.", "💡"],
    [72, "Hf", "Hafnium", "transition metal", 4, 6, "main", "Hafnium helps nuclear reactors control their very hot fuel rods.", "🛡️"],
    [73, "Ta", "Tantalum", "transition metal", 5, 6, "main", "Tantalum is used in tough metal parts and small electronic capacitors.", "⚙️"],
    [74, "W", "Tungsten", "transition metal", 6, 6, "main", "Tungsten is used for the thin wires inside old light bulbs.", "💡"],
    [75, "Re", "Rhenium", "transition metal", 7, 6, "main", "Rhenium is used in jet engines that work at very high heat.", "✈️"],
    [76, "Os", "Osmium", "transition metal", 8, 6, "main", "Osmium is used to make very hard pen tips.", "🖋️"],
    [77, "Ir", "Iridium", "transition metal", 9, 6, "main", "Iridium is used in very hard metal parts for strong engines.", "⚙️"],
    [78, "Pt", "Platinum", "transition metal", 10, 6, "main", "Platinum is used in jewellery and catalysts.", "💍"],
    [79, "Au", "Gold", "transition metal", 11, 6, "main", "Gold is used in jewellery, coins, and electronics.", "💍"],
    [80, "Hg", "Mercury", "transition metal", 12, 6, "main", "Mercury is the metal that moves inside a thermometer.", "🌡️"],
    [81, "Tl", "Thallium", "post-transition metal", 13, 6, "main", "Thallium is used in electronics, but it is poisonous.", "🔋"],
    [82, "Pb", "Lead", "post-transition metal", 14, 6, "main", "Lead is used in car batteries.", "🔋"],
    [83, "Bi", "Bismuth", "post-transition metal", 15, 6, "main", "Bismuth is used in stomach medicines and colourful paints.", "💊"],
    [84, "Po", "Polonium", "metalloid", 16, 6, "main", "Tiny amounts of polonium occur naturally in uranium ores, and it has no stable form.", "⚛️"],
    [85, "At", "Astatine", "halogen", 17, 6, "main", "Scientists made astatine in a laboratory, and it lasts only a short time.", "☢️"],
    [86, "Rn", "Radon", "noble gas", 18, 6, "main", "Radon is a radioactive gas that can collect inside buildings.", "☁️"],
    [87, "Fr", "Francium", "alkali metal", 1, 7, "main", "Scientists made francium in a laboratory, and it lasts only a short time.", "🧪"],
    [88, "Ra", "Radium", "alkaline earth metal", 2, 7, "main", "Radium was used in old glowing paints, but it is radioactive.", "🕰️"],
    [89, "Ac", "Actinium", "actinide", null, 7, "actinide", "Scientists first made actinium in a laboratory, and it glows in the dark.", "⚛️"],
    [90, "Th", "Thorium", "actinide", null, 7, "actinide", "Thorium is a radioactive metal found in rocks.", "⚛️"],
    [91, "Pa", "Protactinium", "actinide", null, 7, "actinide", "Protactinium is a rare, radioactive metal found in uranium ores.", "⚛️"],
    [92, "U", "Uranium", "actinide", null, 7, "actinide", "Uranium helps make electricity in nuclear power stations.", "☢️"],
    [93, "Np", "Neptunium", "actinide", null, 7, "actinide", "Scientists first made neptunium in a laboratory, and tiny amounts occur in uranium ores.", "⚛️"],
    [94, "Pu", "Plutonium", "actinide", null, 7, "actinide", "Scientists first made plutonium in a laboratory, and it can power spacecraft.", "🛰️"],
    [95, "Am", "Americium", "actinide", null, 7, "actinide", "Scientists first made americium in a laboratory, and it is used in smoke detectors.", "🚨"],
    [96, "Cm", "Curium", "actinide", null, 7, "actinide", "Scientists first made curium in a laboratory, and it is used as a power source in space.", "🚀"],
    [97, "Bk", "Berkelium", "actinide", null, 7, "actinide", "Scientists first made berkelium in a laboratory, and it is used to make other elements.", "⚛️"],
    [98, "Cf", "Californium", "actinide", null, 7, "actinide", "Scientists first made californium in a laboratory, and it helps start nuclear reactors.", "⚛️"],
    [99, "Es", "Einsteinium", "actinide", null, 7, "actinide", "Scientists first made einsteinium in a laboratory, and it is one of Earth's rarest elements.", "⚛️"],
    [100, "Fm", "Fermium", "actinide", null, 7, "actinide", "Scientists made fermium in a laboratory, and it lasts only a short time.", "🚀"],
    [101, "Md", "Mendelevium", "actinide", null, 7, "actinide", "Scientists made mendelevium in a laboratory, and it lasts only a short time.", "🎯"],
    [102, "No", "Nobelium", "actinide", null, 7, "actinide", "Scientists made nobelium in a laboratory, and it lasts only a very short time.", "🚀"],
    [103, "Lr", "Lawrencium", "actinide", null, 7, "actinide", "Scientists made lawrencium in a laboratory, and it lasts only a very short time.", "🎯"],
    [104, "Rf", "Rutherfordium", "transition metal", 4, 7, "main", "Scientists made rutherfordium in a laboratory, and it lasts only a very short time.", "🧪"],
    [105, "Db", "Dubnium", "transition metal", 5, 7, "main", "Scientists made dubnium in a laboratory, and it lasts only a very short time.", "🧪"],
    [106, "Sg", "Seaborgium", "transition metal", 6, 7, "main", "Scientists made seaborgium in a laboratory, and it lasts only a very short time.", "🧪"],
    [107, "Bh", "Bohrium", "transition metal", 7, 7, "main", "Scientists made bohrium in a laboratory, and it lasts only a very short time.", "🧪"],
    [108, "Hs", "Hassium", "transition metal", 8, 7, "main", "Scientists made hassium in a laboratory, and it lasts only a very short time.", "🔬"],
    [109, "Mt", "Meitnerium", "transition metal", 9, 7, "main", "Scientists made meitnerium in a laboratory, and it lasts only a very short time.", "🧬"],
    [110, "Ds", "Darmstadtium", "transition metal", 10, 7, "main", "Scientists made darmstadtium in a laboratory, and it lasts only a very short time.", "🔭"],
    [111, "Rg", "Roentgenium", "transition metal", 11, 7, "main", "Scientists made roentgenium in a laboratory, and it lasts only a very short time.", "⚛️"],
    [112, "Cn", "Copernicium", "transition metal", 12, 7, "main", "Scientists made copernicium in a laboratory, and it lasts only a very short time.", "🧪"],
    [113, "Nh", "Nihonium", "unknown", 13, 7, "main", "Scientists made nihonium in a laboratory, and it lasts only a very short time.", "❓"],
    [114, "Fl", "Flerovium", "post-transition metal", 14, 7, "main", "Scientists made flerovium in a laboratory, and it lasts only a very short time.", "🧪"],
    [115, "Mc", "Moscovium", "unknown", 15, 7, "main", "Scientists made moscovium in a laboratory, and it lasts only a very short time.", "❓"],
    [116, "Lv", "Livermorium", "post-transition metal", 16, 7, "main", "Scientists made livermorium in a laboratory, and it lasts only a very short time.", "🧪"],
    [117, "Ts", "Tennessine", "unknown", 17, 7, "main", "Scientists made tennessine in a laboratory, and it lasts only a very short time.", "⚡"],
    [118, "Og", "Oganesson", "unknown", 18, 7, "main", "Scientists made oganesson in a laboratory, and it lasts only a very short time.", "⚫"]
  ];

  function memberships(atomicNumber, symbol) {
    const sets = [];
    if (STARTER_SYMBOLS.has(symbol)) sets.push("starter");
    if (atomicNumber <= 20) sets.push("first20");
    if (COMMON_SYMBOLS.has(symbol)) sets.push("common");
    sets.push("all");
    return sets;
  }

  function sourceFor(name) {
    if (name === "Mercury") return "https://en.wikipedia.org/wiki/Mercury_(element)";
    return `https://en.wikipedia.org/wiki/${encodeURIComponent(name.replace(/ /g, "_"))}`;
  }

  globalThis.PERIODIC_ELEMENTS = Object.freeze(ELEMENT_ROWS.map(([
    atomicNumber, symbol, name, category, group, period, series, secondSentence, icon
  ]) => Object.freeze({
    atomicNumber,
    symbol,
    name,
    category,
    group,
    period,
    series,
    fact: `${name} is element number ${atomicNumber}. ${secondSentence}`,
    icon,
    difficultySets: Object.freeze(memberships(atomicNumber, symbol)),
    audioId: `element-${String(atomicNumber).padStart(3, "0")}`,
    source: sourceFor(name)
  })));
})();
