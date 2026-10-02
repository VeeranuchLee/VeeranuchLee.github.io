/* SPACE TRIVIA — the app shell (IMPLEMENTATION-PLAN.md §2, Phase 2), the
   LETTERS engine (Phase 3, PRODUCT-SPEC.md §5) and the MC + mission loop of
   Phase 4: mission selection and persistence (PRODUCT-SPEC.md §9), the
   question screen and both answer modes with their 1/2/3 scaffolding ladders
   (§5.4, §6.1), the after-correct sequence with its wait-for-voice beat and
   Mission Complete (§5.5, §8). The narration player is cloned from Planets &
   Moons (solar-system-game/app.js:576-614) over an EMPTY manifest -- no clip
   exists yet, and the player must stay quiet and correct when a line has no
   entry. */

/* ------------------------------------------------------------- the way out ---
   ONE constant holds the back-arrow destination because it is undecided:
   open owner decision #5, IMPLEMENTATION-PLAN.md §4 ("Space Trivia's
   destination" -- and with it, where the Space Hub it returns to lives).
   The recommendation is the shared Pages repo, subpath `space`, so the Space
   Hub sits at https://veeranuchlee.github.io/space/ and this arrow points
   there. When the owner decides, this line is the whole change on this side.

   It must publish together with the Space Hub itself (HUB-SPEC.md §4): an
   arrow live before the hub is a 404 where the way out should be. */
const HUB_URL = "https://veeranuchlee.github.io/space/";

/* ------------------------------------------------------------------ state ---
   The Spelling Exam shape (PRODUCT-SPEC.md §3): one state object, an `i`
   cursor over a `queue`, `attempts` and `hinted` per question, `locked` when
   correct. The shell owns `screen`; Phase 4 fills the queue and drives the
   rest; Phase 3 adds the LETTERS board's own four fields (tiles, slots,
   fixed, showWord -- the source engine's shape, spelling-exam-app/
   app.js:170). The persistence keys of spec §9 (space-trivia-progress-v1 /
   space-trivia-session-v1) are read in the persistence block below. */
const state = {
  screen: "start",
  queue: [],
  i: 0,
  attempts: 0,
  hinted: false,
  locked: false,
  /* Phase 3: the LETTERS board. dealTiles() resets these together with the
     ladder fields above, so a fresh deal is a fresh question. */
  tiles: [],
  slots: [],
  fixed: new Set(),
  showWord: false,
};

const $ = (sel) => document.querySelector(sel);

/* ---------------------------------------------------------------- screens ---
   The four screens of spec §3 are three containers: the after-correct state
   IS the question screen, locked. */
const SCREENS = ["start", "question", "complete"];

/* A double tap must not reach through. Every screen change happens inside a
   tap, and the second tap of a double tap lands a few milliseconds later on
   whatever the NEW screen has put under the finger: measured on a 768x1024
   screen, a double tap on Next answered the next question before the child
   had seen it, and a double tap on Back hit the Start screen's Space Hub
   link, which sits in the same corner, and took the child out of the app.
   So for a moment after any screen is shown -- about the time the question
   waits before it speaks (§4) -- taps are swallowed before they reach
   anything. */
const SETTLE_MS = 450;
let settleUntil = 0;

function swallowWhileSettling(e) {
  if (performance.now() < settleUntil) {
    e.preventDefault();
    e.stopPropagation();
  }
}

function showScreen(name) {
  state.screen = name;
  settleUntil = performance.now() + SETTLE_MS;
  for (const id of SCREENS) {
    const el = document.getElementById("screen-" + id);
    if (el) el.hidden = id !== name;
  }
}

/* ----------------------------------------------------------------- voice ---
   Cloned from solar-system-game/app.js:576-614, comments included where they
   carry the policy:

   Spoken lines are pre-rendered files named in narration/clips.json, never
   synthesised here: every built-in browser and OS voice is an adult, and this
   game is read to young children. Until the files are rendered the manifest
   is simply absent and the game plays its chime and shows the words -- it
   never falls back to speechSynthesis, which is the thing the audio policy
   exists to refuse (PIPELINE.md §3.1).

   `audioReady` says the manifest is real. Every line it lists has a clip on
   disk, so the game never asks for a file it knows is not there. A line
   absent from the map is not an error: `speak` returns quietly and the child
   gets the chime and the words on screen, the same as with sound off. That
   is the empty-manifest case this shell ships in, and it is the same code
   path as a line still waiting for its render. */
const voice = { lines: null, el: null, dead: false };

fetch("./narration/clips.json")
  .then((r) => (r.ok ? r.json() : null))
  .then((data) => { voice.lines = (data && data.audioReady && data.lines) || {}; })
  .catch(() => { voice.lines = {}; });

function speak(text) {
  /* No `state.sound` gate, unlike the source: spec §12 gives V1 no sound
     toggle beyond the OS, so there is no flag to consult. */
  if (voice.dead || !voice.lines) return;
  const file = voice.lines[String(text).trim()];
  if (!file) return;
  try {
    if (!voice.el) voice.el = new Audio();
    voice.el.pause();
    voice.el.src = "./narration/clips/" + file;
    /* One missing file means the set was never rendered; stop asking. */
    voice.el.onerror = () => { voice.dead = true; };
    const played = voice.el.play();
    if (played && played.catch) played.catch(() => {});
  } catch (e) { voice.dead = true; }
}

/* ------------------------------------------------------------------- sfx ---
   The interaction-sound bed, synthesised at runtime and never a file
   (spec §10 audio principles; the redistribution reasoning is
   solar-system-game/app.js:511-513). Two effects only, both wanted the
   moment a later phase first needs them: `ask` is the chime that plays
   whether or not the spoken line exists, so a question is never silent
   (spec §4); `no` is the soft two-note descend a wrong answer gets (spec
   §5.3, §6.1). The success arpeggio is the Spelling Exam's chime() and is
   Phase 3/4's to port with the celebration it belongs to. No sound flag
   here either -- no in-app toggle in V1 (spec §12). */
let audio = null;

function ac() {
  if (!audio) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audio = new Ctx();
  }
  if (audio.state === "suspended") audio.resume();
  return audio;
}

function tone(freq, when, dur, gain, type) {
  const ctx = ac();
  if (!ctx) return;
  const t = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type || "sine";
  osc.frequency.setValueAtTime(freq, t);
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(gain, t + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(amp).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

const sfx = {
  /* A rising fourth, which is what a question sounds like. It plays whether
     or not the spoken line exists, so the moment is never silent. */
  ask: () => { tone(523, 0, 0.16, 0.09); tone(698, 0.14, 0.26, 0.09); },
  /* Two soft descending tones, not a buzzer: a thinking sound. */
  no:  () => { tone(210, 0, 0.13, 0.1); tone(170, 0.09, 0.16, 0.08); },
};

/* ----------------------------------------------------------- the questions ---
   The bank a mission draws from. These are the pilot questions' own records
   (content/PILOT-QUESTIONS.md -- the authoring source), trimmed to the
   runtime field list of SCHEMA.md §5, because the pipeline that would carry
   them does not exist yet: questions/questions.json is authoring source and
   data/questions.json (generated, status:"live" records only, SCHEMA.md §1)
   is Phase 5's. The fetch below adopts that bundle the moment it is real;
   until then the pilot fifteen are the whole world. Spec §9's "live"
   eligibility is enforced where it lives, in that build's record filter --
   at runtime everything in the bank is eligible.

   Narration: every spoken line below is one of the records' own texts, keyed
   exactly. narration/clips.json is EMPTY today (audioReady:false), so every
   one of them plays silently and the chime and the on-screen words carry the
   moment -- the empty-manifest case this shell ships in. The voice runner's
   dispatch renders them on this exact text; nothing here may reword a line,
   because a reworded line is a line without a clip. */
const PILOT_QUESTIONS = [
  {
    id: "sun-001", topic: "sun", subtopic: "identity",
    difficulty: 1, factGroup: "sun-only-star",
    questionText: "Which star do all the planets travel around?",
    questionVoiceText: "Which star do all the planets travel around?",
    answerMode: "LETTERS", correctAnswer: "Sun", choices: null,
    letterBank: ["N", "S", "U"], letterSlotCount: 3, imageType: "contextual",
    correctVoiceText: "That's right! The planets all travel around the Sun. The Sun is the only star in our solar system.",
    retryVoiceText: "Almost! Try again.",
    teachingFactText: "The Sun is the only star in our solar system.",
  },
  {
    id: "solar-system-basics-001", topic: "solar-system-basics", subtopic: "planet-count",
    difficulty: 1, factGroup: "eight-planets",
    questionText: "How many planets travel around our Sun?",
    questionVoiceText: "How many planets travel around our Sun?",
    answerMode: "MC", correctAnswer: "8", choices: ["7", "8", "9", "10"],
    letterBank: null, letterSlotCount: null, imageType: "contextual",
    correctVoiceText: "You got it! Eight planets travel around our Sun. Our solar system has eight planets, and Pluto is a dwarf planet, not one of the eight.",
    retryVoiceText: "Not quite. Have another try.",
    teachingFactText: "Our solar system has eight planets, and Pluto is a dwarf planet, not one of the eight.",
  },
  {
    id: "mercury-venus-001", topic: "mercury-venus", subtopic: "mercury",
    difficulty: 2, factGroup: "mercury-closest-sun",
    questionText: "Which planet is closest to the Sun?",
    questionVoiceText: "Which planet is closest to the Sun?",
    answerMode: "LETTERS", correctAnswer: "Mercury", choices: null,
    letterBank: ["R", "U", "M", "E", "R", "C", "Y"], letterSlotCount: 7, imageType: "contextual",
    correctVoiceText: "Yes! Mercury is the planet closest to the Sun. As well as being nearest to the Sun, Mercury is the smallest of all eight planets.",
    retryVoiceText: "Nearly there. One more go.",
    teachingFactText: "As well as being nearest to the Sun, Mercury is the smallest of all eight planets.",
  },
  {
    id: "mercury-venus-002", topic: "mercury-venus", subtopic: "venus",
    difficulty: 2, factGroup: "venus-hottest",
    questionText: "The hottest planet is not the closest one to the Sun. Which planet is the hottest?",
    questionVoiceText: "The hottest planet is not the closest one to the Sun. Which planet is the hottest?",
    answerMode: "MC", correctAnswer: "Venus", choices: ["Mercury", "Venus", "Mars", "Jupiter"],
    letterBank: null, letterSlotCount: null, imageType: "contextual",
    correctVoiceText: "Spot on! Venus is the hottest planet in our solar system. Venus is hotter than every other planet — even Mercury, which is nearer to the Sun.",
    retryVoiceText: "Have another go.",
    teachingFactText: "Venus is hotter than every other planet — even Mercury, which is nearer to the Sun.",
  },
  {
    id: "earth-moon-001", topic: "earth-moon", subtopic: "earth",
    difficulty: 2, factGroup: "earth-third-planet",
    questionText: "Which planet is third from the Sun?",
    questionVoiceText: "Which planet is third from the Sun?",
    answerMode: "LETTERS", correctAnswer: "Earth", choices: null,
    letterBank: ["T", "H", "E", "A", "R"], letterSlotCount: 5, imageType: "contextual",
    correctVoiceText: "Well done! Earth is number three from the Sun. Earth is the third planet from the Sun, and the biggest of the four rocky planets.",
    retryVoiceText: "Almost! Try again.",
    teachingFactText: "Earth is the third planet from the Sun, and the biggest of the four rocky planets.",
  },
  {
    id: "earth-moon-002", topic: "earth-moon", subtopic: "moons",
    difficulty: 1, factGroup: "earth-one-moon",
    questionText: "How many natural moons does Earth have?",
    questionVoiceText: "How many natural moons does Earth have?",
    answerMode: "MC", correctAnswer: "1", choices: ["1", "2", "3", "4"],
    letterBank: null, letterSlotCount: null, imageType: "contextual",
    correctVoiceText: "You got it! Earth has one natural moon. Earth has one natural moon — the Moon we see shining in our night sky.",
    retryVoiceText: "Not quite. Have another try.",
    teachingFactText: "Earth has one natural moon — the Moon we see shining in our night sky.",
  },
  {
    id: "mars-001", topic: "mars", subtopic: "moons",
    difficulty: 2, factGroup: "mars-two-moons",
    questionText: "How many moons does Mars have?",
    questionVoiceText: "How many moons does Mars have?",
    answerMode: "MC", correctAnswer: "2", choices: ["1", "2", "3", "4"],
    letterBank: null, letterSlotCount: null, imageType: "contextual",
    correctVoiceText: "Brilliant! Mars has two moons. Mars has two small moons, called Phobos and Deimos.",
    retryVoiceText: "Nearly there. One more go.",
    teachingFactText: "Mars has two small moons, called Phobos and Deimos.",
  },
  {
    id: "mars-002", topic: "mars", subtopic: "moons",
    difficulty: 3, factGroup: "phobos-larger",
    questionText: "What is Mars's larger moon called?",
    questionVoiceText: "What is Mars's larger moon called?",
    answerMode: "LETTERS", correctAnswer: "Phobos", choices: null,
    letterBank: ["B", "O", "P", "S", "H", "O"], letterSlotCount: 6, imageType: "contextual",
    correctVoiceText: "Yes! Phobos is Mars's larger moon. Phobos is a little larger than Deimos, so it is the larger of Mars's two moons.",
    retryVoiceText: "Have another go.",
    teachingFactText: "Phobos is a little larger than Deimos, so it is the larger of Mars's two moons.",
  },
  {
    id: "jupiter-001", topic: "jupiter", subtopic: "size",
    difficulty: 2, factGroup: "jupiter-largest",
    questionText: "Which planet is the largest in our solar system?",
    questionVoiceText: "Which planet is the largest in our solar system?",
    answerMode: "MC", correctAnswer: "Jupiter", choices: ["Earth", "Mars", "Jupiter", "Neptune"],
    letterBank: null, letterSlotCount: null, imageType: "contextual",
    correctVoiceText: "That's it! Jupiter is the largest planet in our solar system. It is the biggest of all eight planets.",
    retryVoiceText: "Almost! Try again.",
    teachingFactText: "Jupiter is the largest planet in our solar system.",
  },
  {
    id: "saturn-001", topic: "saturn", subtopic: "rings",
    difficulty: 1, factGroup: "saturn-rings",
    questionText: "Which planet is known for its rings?",
    questionVoiceText: "Which planet is known for its rings?",
    answerMode: "MC", correctAnswer: "Saturn", choices: ["Mercury", "Venus", "Earth", "Saturn"],
    letterBank: null, letterSlotCount: null, imageType: "contextual",
    correctVoiceText: "Spot on! Saturn is the planet known for its rings. Other planets have rings too, but none are as spectacular or as complex as Saturn's.",
    retryVoiceText: "Not quite. Have another try.",
    teachingFactText: "Other planets have rings too, but none are as spectacular or as complex as Saturn's.",
  },
  {
    id: "uranus-neptune-001", topic: "uranus-neptune", subtopic: "uranus",
    difficulty: 3, factGroup: "uranus-sideways",
    questionText: "Which planet spins on its side, like a rolling ball?",
    questionVoiceText: "Which planet spins on its side, like a rolling ball?",
    answerMode: "LETTERS", correctAnswer: "Uranus", choices: null,
    letterBank: ["A", "N", "U", "S", "U", "R"], letterSlotCount: 6, imageType: "contextual",
    correctVoiceText: "You got it! Uranus is the planet that spins on its side. Uranus is tilted so steeply that it appears to spin sideways as it rolls around the Sun.",
    retryVoiceText: "Nearly there. One more go.",
    teachingFactText: "Uranus is tilted so steeply that it appears to spin sideways as it rolls around the Sun.",
  },
  {
    id: "uranus-neptune-002", topic: "uranus-neptune", subtopic: "neptune",
    difficulty: 2, factGroup: "neptune-farthest",
    questionText: "Which planet is the farthest from the Sun?",
    questionVoiceText: "Which planet is the farthest from the Sun?",
    answerMode: "LETTERS", correctAnswer: "Neptune", choices: null,
    letterBank: ["P", "T", "E", "N", "E", "U", "N"], letterSlotCount: 7, imageType: "contextual",
    correctVoiceText: "Yes! Neptune is the planet farthest from the Sun. Neptune is the eighth and most distant planet from the Sun.",
    retryVoiceText: "Have another go.",
    teachingFactText: "Neptune is the eighth and most distant planet from the Sun.",
  },
  {
    id: "earth-moon-003", topic: "earth-moon", subtopic: "moon",
    difficulty: 3, factGroup: "moon-same-side",
    questionText: "Do we ever see the far side of the Moon from Earth?",
    questionVoiceText: "Do we ever see the far side of the Moon from Earth?",
    answerMode: "MC", correctAnswer: "No — the Moon keeps its same face towards us",
    choices: ["No — the Moon keeps its same face towards us", "Yes — once every month", "Yes — every single night"],
    letterBank: null, letterSlotCount: null, imageType: "contextual",
    correctVoiceText: "That's right! We only ever see one side of the Moon. The Moon keeps the same face turned towards Earth, so we only ever see one side of it.",
    retryVoiceText: "Almost! Try again.",
    teachingFactText: "The Moon keeps the same face turned towards Earth, so we only ever see one side of it.",
  },
  {
    id: "wider-basics-001", topic: "wider-basics", subtopic: "asteroid-belt",
    difficulty: 3, factGroup: "asteroid-belt-location",
    questionText: "Most asteroids travel around the Sun between which two planets?",
    questionVoiceText: "Most asteroids travel around the Sun between which two planets?",
    answerMode: "MC", correctAnswer: "Mars and Jupiter",
    choices: ["Mars and Jupiter", "Earth and Mars", "Jupiter and Saturn", "Mercury and Venus"],
    letterBank: null, letterSlotCount: null, imageType: "contextual",
    correctVoiceText: "Well done! Asteroids gather between Mars and Jupiter. Most asteroids orbit our Sun in the main belt between Mars and Jupiter.",
    retryVoiceText: "Not quite. Have another try.",
    teachingFactText: "Most asteroids orbit our Sun in the main belt between Mars and Jupiter.",
  },
  {
    id: "wider-basics-002", topic: "wider-basics", subtopic: "dwarf-planets",
    difficulty: 3, factGroup: "ceres-largest-belt-object",
    questionText: "What is the largest object in the asteroid belt?",
    questionVoiceText: "What is the largest object in the asteroid belt?",
    answerMode: "MC", correctAnswer: "Ceres", choices: ["Ceres", "Pluto", "Titan", "Phobos"],
    letterBank: null, letterSlotCount: null, imageType: "contextual",
    correctVoiceText: "Brilliant! The answer is Ceres. Ceres is the largest object in the asteroid belt, and it is a dwarf planet too.",
    retryVoiceText: "Nearly there. One more go.",
    teachingFactText: "Ceres is the largest object in the asteroid belt, and it is a dwarf planet too.",
  },
];

let questionBank = null;

fetch("./data/questions.json")
  .then((r) => (r.ok ? r.json() : null))
  .then((data) => {
    /* Adopt the generated bundle only while nothing is playing: a slow fetch
       must not swap the bank under a child mid-mission. A missing file is not
       an error -- the pilot bank above is the fallback by design. */
    if (Array.isArray(data) && data.length && state.screen === "start") {
      questionBank = data;
    }
  })
  .catch(() => {});

function bankNow() {
  return (questionBank && questionBank.length) ? questionBank : PILOT_QUESTIONS;
}

/* ----------------------------------------------------------- persistence ---
   Spec §9's two keys, the STORE/SESSION naming shape (spelling-exam-app/
   app.js:15). `seen` weights the draw toward least-seen; `recent` carries the
   cooldown; `missions` counts completed missions. `help` is §8's internal
   unassisted/scaffolded pair -- persisted for the adaptive selection the
   architecture leaves room for (§9), never rendered. */
const STORE = "space-trivia-progress-v1";
const SESSION = "space-trivia-session-v1";

function loadProgress() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE));
    if (raw && typeof raw === "object") {
      return {
        seen: raw.seen || {},
        recent: Array.isArray(raw.recent) ? raw.recent : [],
        missions: raw.missions || 0,
        help: raw.help || {},
      };
    }
  } catch (e) { /* private mode or a record gone bad: start over, it is only a game */ }
  return { seen: {}, recent: [], missions: 0, help: {} };
}

function saveProgress(p) {
  try { localStorage.setItem(STORE, JSON.stringify(p)); } catch (e) {}
}

/* A fresh session id per mission (the spelling-exam shape, app.js:33). Nothing
   branches on it yet; it marks this run in the record for whoever reads it. */
function newSession() {
  try {
    sessionStorage.setItem(SESSION, Date.now().toString(36) + "-" +
                                 Math.random().toString(36).slice(2, 8));
  } catch (e) {}
}

/* §8: count the question internally -- unassisted when the child needed no
   miss and no ladder, scaffolded the moment either happened. Never shown. */
function recordResult(q) {
  const p = loadProgress();
  const h = p.help[q.id] || (p.help[q.id] = { unassisted: 0, scaffolded: 0 });
  if (state.hinted || state.attempts > 0) h.scaffolded += 1;
  else h.unassisted += 1;
  saveProgress(p);
}

/* ------------------------------------------------------------- selection ---
   Spec §9's controlled randomization: ten slots drawn round by round, each
   pick from the largest pool that satisfies every rule, weighted toward
   least-seen with a random tie-break. Relaxation is the spec's order and no
   other (cooldown → topic cap → difficulty caps); the same fact twice and
   the same answer twice running never relax. If even the standing mix rules
   cannot fill a slot, the mission completes anyway -- a small bank must never
   deadlock (the solar-system-game fallback precedent, app.js:698-705). */
const MISSION_SIZE = 10;

function shuffle(list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function drawMission(bank, seen, recent) {
  const size = Math.min(MISSION_SIZE, bank.length);
  /* The two-mission cooldown, one mission while the bank is under 30 (§9).
     `recent` is flat and newest-last, so the tail slice is the cooldown set. */
  const cooldownN = (bank.length >= 30 ? 2 : 1) * MISSION_SIZE;
  const cooldown = new Set(recent.slice(-cooldownN));

  const queue = [];
  const used = new Set();
  const topicN = new Map();
  const answerN = new Map();
  let letters = 0, easy = 0, hard = 0;

  for (let slot = 0; slot < size; slot++) {
    const lastQ = queue[queue.length - 1];
    const runLen = (match) => {
      let n = 0;
      for (let k = queue.length - 1; k >= 0 && match(queue[k]); k--) n += 1;
      return n;
    };

    /* Never relax (§9): no repeat, no fact twice, no same answer twice
       running. */
    const legal = bank.filter((q) =>
      !used.has(q.id) &&
      !queue.some((p) => p.factGroup === q.factGroup) &&
      !(lastQ && lastQ.correctAnswer === q.correctAnswer));
    if (!legal.length) break;

    /* The standing mix rules: ≤2 sharing an answer, no run over 3 of one
       mode, and the running LETTERS share inside 30–50%. The share band is
       read with a one-question tolerance because after one question the only
       shares possible are 0% and 100% -- the band cannot bind until the
       prefix is long enough to express it.

       The tolerance is dropped on the LAST slot, where the "mission so far"
       is the whole mission and the band is the band. Carrying ±1 to the end
       let a finished ten land on 2 LETTERS or on 6 -- 20% and 60% -- and
       over 5,000 simulated missions it did, in about 3 of every 100. Closing
       it on the final slot alone brings every mission inside 30–50% without
       narrowing the spread (3/4/5 LETTERS all stay common) and without
       pushing any other rule into its relaxation. */
    const byAnswer = (q) => (answerN.get(q.correctAnswer) || 0) < 2;
    const byModeRun = (q) => runLen((p) => p.answerMode === q.answerMode) < 3;
    const byShare = (q) => {
      const n = queue.length + 1;
      const l = letters + (q.answerMode === "LETTERS" ? 1 : 0);
      const slack = n >= size ? 0 : 1;
      return l >= 0.3 * n - slack && l <= 0.5 * n + slack;
    };
    /* The difficulty caps: open gently (≥2 of difficulty 1 among the first
       3), at most 3 of difficulty 3, never more than 2 of them running. */
    const byGentleOpen = (q) =>
      slot > 2 || q.difficulty === 1 || easy + (2 - slot) >= 2;
    const byHardCap = (q) => q.difficulty !== 3 || hard < 3;
    const byHardRun = (q) =>
      q.difficulty !== 3 || runLen((p) => p.difficulty === 3) < 2;

    const standing = (q) => byAnswer(q) && byModeRun(q) && byShare(q);
    let pool = legal.filter((q) =>
      standing(q) && !cooldown.has(q.id) &&
      (topicN.get(q.topic) || 0) < 2 && byGentleOpen(q) && byHardCap(q) && byHardRun(q));
    if (!pool.length) pool = legal.filter((q) =>        /* relax: cooldown */
      standing(q) && (topicN.get(q.topic) || 0) < 2 && byGentleOpen(q) && byHardCap(q) && byHardRun(q));
    if (!pool.length) pool = legal.filter((q) =>        /* relax: topic cap */
      standing(q) && byGentleOpen(q) && byHardCap(q) && byHardRun(q));
    if (!pool.length) pool = legal.filter(standing);    /* relax: difficulty caps */
    if (!pool.length) pool = legal;   /* too small a bank for the mix: play on */

    /* Least-seen first, random among the tied (§9). */
    const least = Math.min(...pool.map((q) => seen[q.id] || 0));
    const tied = pool.filter((q) => (seen[q.id] || 0) === least);
    const pick = tied[Math.floor(Math.random() * tied.length)];

    used.add(pick.id);
    queue.push(pick);
    topicN.set(pick.topic, (topicN.get(pick.topic) || 0) + 1);
    answerN.set(pick.correctAnswer, (answerN.get(pick.correctAnswer) || 0) + 1);
    if (pick.answerMode === "LETTERS") letters += 1;
    if (pick.difficulty === 1) easy += 1;
    if (pick.difficulty === 3) hard += 1;
  }
  return queue;
}

/* ------------------------------------------------------------------ seams ---
   Both halves are built: Phase 4 (MC + the mission loop) and Phase 3 (the
   LETTERS engine, below) live in the functions between here and the shell.
   The mount-first rule in renderQuestion() stays for the reason it arrived:
   a mount that throws leaves the question the child is looking at exactly as
   it was, with the error in the console where the builder is looking --
   never a half-drawn question in front of a child.

   Two controls are wired straight through: #play calls startMission() and
   #sound calls replayQuestionNarration(). */

/* --- Phase 4: MC + the mission loop (PRODUCT-SPEC.md §6, §8, §9) --- */

/* #play -> here. Draws the 10-question mission (selection per spec §9,
   persistence keys space-trivia-progress-v1 / space-trivia-session-v1),
   resets the cursor, and shows question 1. */
function startMission() {
  const bank = bankNow();
  if (!bank.length) return;          /* nothing to draw: stay on Start */
  const p = loadProgress();
  state.queue = drawMission(bank, p.seen, p.recent);
  state.i = 0;
  state.attempts = 0;
  state.hinted = false;
  state.locked = false;
  newSession();
  renderQuestion();
}

/* Renders state.queue[state.i] into #screen-question: question text into
   #q-text, the illustration into #q-art (assets/images/<id>.webp), the
   progress pill (#pill), then either mountLettersBoard() for LETTERS or the
   choice buttons for MC into #answer-area. The narration contract: sfx.ask()
   always, speak(questionVoiceText ?? questionText) once, ~450ms after
   render (spec §4). */
function renderQuestion() {
  const q = state.queue[state.i];
  if (!q) return;

  /* The answer UI mounts FIRST, before one pixel of this screen changes, and
     each mount owns clearing #answer-area. A mount that throws therefore
     leaves the question the child is looking at exactly as it was, with the
     error in the console where the builder is. Mounting it last did the
     opposite: the new question's text and art were already on screen when the
     throw landed, stranding a child in front of a question with an empty card
     and nothing to tap. */
  if (q.answerMode === "LETTERS") mountLettersBoard(q);
  else mountChoices(q);

  /* Seen counts weight the next mission's draw toward least-seen (§9). */
  const p = loadProgress();
  p.seen[q.id] = (p.seen[q.id] || 0) + 1;
  saveProgress(p);

  const pill = $("#pill");
  pill.hidden = false;
  pill.textContent = (state.i + 1) + " / " + state.queue.length;

  $("#q-text").textContent = q.questionText;
  mountArt(q);
  $("#q-feedback").textContent = "";

  /* The narration contract (§4): the chime always, the question spoken once,
     ~450ms after render. The timer re-checks the screen so a fast Back tap
     cannot speak a question over the Start screen. */
  sfx.ask();
  clearTimeout(askTimer);
  askTimer = setTimeout(() => {
    if (state.screen === "question") speak(q.questionVoiceText || q.questionText);
  }, 450);

  /* Last, on purpose: a throw above leaves the previous screen standing and
     the error in the console, never a half-drawn question in front of a
     child. */
  showScreen("question");
}

/* The after-correct advance: the Next button of spec §5.5, which waits for
   the voice (the beat) and never auto-advances. */
function nextQuestion() {
  clearTimeout(askTimer);
  clearTimeout(beatTimer);
  state.i += 1;
  state.attempts = 0;
  state.hinted = false;
  state.locked = false;
  if (state.i >= state.queue.length) finishMission();
  else renderQuestion();
}

/* Fills #screen-complete (spec §8): illustration, "Mission complete!",
   "You explored 10 questions.", the tappable Things we learned cards, and
   the New mission / Space Hub buttons -- the Space Hub one uses HUB_URL. */
function renderMissionComplete() {
  $("#done-sub").textContent =
    "You explored " + state.queue.length + " question" +
    (state.queue.length === 1 ? "" : "s") + ".";

  /* Up to three of this mission's teaching facts (§8): the first three the
     child met. Tapping a card speaks that question's correct line -- the one
     clip that carries the fact (SCHEMA.md §2: a fact is never rendered
     twice), so the card says its "You got it! ..." with it. */
  const cards = $("#learned-cards");
  cards.textContent = "";
  for (const q of state.queue.slice(0, 3)) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "fact-card";
    card.textContent = q.teachingFactText;
    card.onclick = () => speak(q.correctVoiceText);
    cards.appendChild(card);
  }
  showScreen("complete");
}

/* #sound -> here. Replays the current question's narration at any time,
   including mid-answer and after correct (spec §4): speak(questionVoiceText
   ?? questionText). */
function replayQuestionNarration() {
  const q = state.queue[state.i];
  if (q) speak(q.questionVoiceText || q.questionText);
}

/* The mission's end: count it, cool its questions down for the next draw
   (§9), and show the warm screen. `missions` and `recent` move together, at
   completion -- a mission quit partway is not resumed in V1, and its
   questions owe no cooldown (§8). */
function finishMission() {
  const p = loadProgress();
  p.missions += 1;
  p.recent = p.recent.concat(state.queue.map((q) => q.id))
                       .slice(-2 * MISSION_SIZE);
  saveProgress(p);
  renderMissionComplete();
}

/* --------------------------------------------- the MC answer area (spec §6) --- */

function choiceEls() {
  return document.querySelectorAll("#answer-area .choice");
}

/* The illustration well. imageType "none" is a deliberate omission
   (SCHEMA.md §4); the other two types show one image, named by the id
   convention assets/images/<id>.webp. A file not yet rendered (art is a later
   phase) hides the well and the question plays on -- the empty-manifest
   lesson, applied to pictures. It is context, never information (§4), so it
   carries no alt text to read the answer from. */
function mountArt(q) {
  const well = $("#q-art");
  well.textContent = "";
  well.hidden = false;
  if (q.imageType === "none") { well.hidden = true; return; }
  const img = document.createElement("img");
  img.alt = "";
  img.draggable = false;
  img.src = q.image || ("./assets/images/" + q.id + ".webp");
  img.onerror = () => { well.hidden = true; };
  well.appendChild(img);
}

function mountChoices(q) {
  const area = $("#answer-area");
  cancelDrag();              /* a letter still held from before must not float over the choices */
  area.textContent = "";     /* each mount clears its own ground */
  /* Numeric choices sit in a 2×2 grid; word choices stack full-width (§6). */
  const numeric = q.choices.every((c) => /^\d+$/.test(c));
  const wrap = document.createElement("div");
  wrap.className = "choices" + (numeric ? " numeric" : "");
  for (const choice of shuffle(q.choices)) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "choice";
    b.dataset.choice = choice;
    b.textContent = choice;
    b.onclick = () => pickChoice(b, q);
    wrap.appendChild(b);
  }
  area.appendChild(wrap);
}

function setFeedback(text) {
  const el = $("#q-feedback");
  if (el) el.textContent = text;
}

/* The shared retry pool (§10), the pilot's own four lines. Every pilot record
   carries its retryVoiceText, so this serves only a future record without
   one. TODO(owner-approval): these four await their one-time render with
   everything else -- narration/clips.json is empty today. */
const RETRY_POOL = [
  "Almost! Try again.",
  "Not quite. Have another try.",
  "Nearly there. One more go.",
  "Have another go.",
];

function retryLine(q) {
  return q.retryVoiceText ||
         RETRY_POOL[Math.floor(Math.random() * RETRY_POOL.length)];
}

/* §6.1's miss-2 line, the teach-by-elimination step's own words. It is in no
   pilot record (records carry only the miss-1 retry lines) and no clip exists.
   TODO(owner-approval): new clip needed — "Have another look." */
const TEACH_LINE = "Have another look.";

/* A wrong choice retires (§6): faded to 45%, untappable, still its own colour
   -- no red, no X, nothing taken away. The tapped one gets a single 300ms
   wobble; one retiring itself at miss 2 fades without it, so the only thing
   that ever wobbles is the child's own tap. */
function retire(btn, tapped) {
  btn.classList.add("retired");
  btn.disabled = true;
  if (tapped) btn.classList.add("wobble");
}

function retireOneWrong(q) {
  const standing = [], wrongs = [];
  choiceEls().forEach((b) => {
    if (b.disabled) return;
    standing.push(b);
    if (b.dataset.choice !== q.correctAnswer) wrongs.push(b);
  });
  /* §6.1 ends this step "leaving a final pair", and the pair is the point: on
     a four-choice question the child's own two misses have already retired
     two wrong answers, so retiring a third leaves the correct one alone on
     the card. That reveals the answer at two misses and makes the miss-3
     rung unreachable -- there is nothing wrong left to tap -- which is
     exactly what the project's two-threshold rule forbids (teach at two,
     reveal at three). So this retires only while a pair survives it. */
  if (wrongs.length && standing.length > 2) retire(shuffle(wrongs)[0], false);
}

/* §6.1 miss 3: the correct choice pulses gently ~4s and the narration gives
   the answer and the teaching fact. The child still taps it themselves -- the
   reveal points, the tap answers. */
function revealAnswer(q) {
  choiceEls().forEach((b) => {
    if (b.dataset.choice === q.correctAnswer) b.classList.add("reveal");
  });
  /* The reveal has to be readable without sound. §4's audio gating is
     explicit that a line with no rendered clip still shows its words, and
     narration/clips.json is empty today -- without this the third miss was a
     silent pulse and no words at all. The record's own teaching fact is the
     text: it names the answer, it is already what the after-correct feedback
     shows, and it adds no new wording, so it needs no new clip. */
  setFeedback(q.teachingFactText);
  /* TODO(owner-approval): the reveal has no line of its own, so it borrows
     the correct one -- which opens "That's right!" / "You got it!" at a child
     who has just missed three times. It is silent today (no clips exist), but
     rendering it as it stands would put a congratulation in the wrong mouth.
     The reveal wants its own line, carrying the answer and the teaching fact
     without the acknowledgement. Not invented here: a new spoken line is the
     owner's to approve and costs a paid render. */
  speak(q.correctVoiceText);
}

function pickChoice(btn, q) {
  if (state.locked || btn.disabled) return;
  clearTimeout(askTimer);   /* a late question-narration timer must not speak over this */
  if (btn.dataset.choice === q.correctAnswer) {
    btn.classList.remove("reveal");
    btn.classList.add("right");
    choiceEls().forEach((b) => {
      if (b !== btn) { b.disabled = true; b.classList.add("settled"); }
    });
    onCorrectAnswer(q);
    return;
  }

  state.attempts += 1;
  sfx.no();
  retire(btn, true);

  if (state.attempts === 1) {
    /* Miss 1 (§6.1): the retry line, then the question replays -- through the
       beat, because one Audio element means an immediate replay would silence
       the line mid-word. */
    const line = retryLine(q);
    setFeedback(line);
    speak(line);
    nextBeat(0, () => {
      /* The screen is re-checked for the same reason askTimer re-checks it: a
         child who taps Back during the beat must not hear the question spoken
         over the Start screen. */
      if (state.screen === "question") speak(q.questionVoiceText || q.questionText);
    });
  } else if (state.attempts === 2) {
    /* Miss 2 TEACHES by elimination: one more wrong choice retires itself,
       chosen at random among the remaining wrong ones, so the child learns a
       known-wrong without learning which of the rest is right. */
    state.hinted = true;
    retireOneWrong(q);
    setFeedback(TEACH_LINE);
    speak(TEACH_LINE);
  } else if (state.attempts === 3) {
    /* Miss 3 REVEALS (§6.1). */
    state.hinted = true;
    revealAnswer(q);
  } else {
    /* Past the reveal: the same gentle line, no further escalation and no
       dead end -- the pulsing choice is always there to tap. */
    const line = retryLine(q);
    setFeedback(line);
    speak(line);
  }
}

/* ------------------------------------ the after-correct sequence (spec §5.5) ---
   The owner's order, with no auto-advance. LETTERS (Phase 3) reaches the same
   sequence by locking its own row and calling onCorrectAnswer() -- one
   after-correct, both modes. */
function onCorrectAnswer(q) {
  state.locked = true;
  chime();                        /* the arpeggio */
  celebrate();                    /* a small calm sparkle of stars, ~2.2s */
  setFeedback(q.teachingFactText);  /* readable without sound (§5.5.4) */
  speak(q.correctVoiceText);
  recordResult(q);
  /* Next appears only when the voice is done (the beat): the child continues
     when they choose, never on a timer. */
  nextBeat(1400, mountNext);
}

function mountNext() {
  if (state.screen !== "question" || !state.locked) return;
  if ($("#next-btn")) return;
  const b = document.createElement("button");
  b.type = "button";
  b.className = "next";
  b.id = "next-btn";
  b.textContent = "Next";
  b.onclick = () => nextQuestion();
  $("#answer-area").appendChild(b);
}

/* The success arpeggio: the Spelling Exam's chime (app.js:141) on this file's
   own tone() bed -- three ascending notes, the sound of getting it right. */
function chime() {
  [523.25, 659.25, 783.99].forEach((f, i) =>
    tone(f, i * 0.09, 0.5, 0.12, "triangle"));
}

/* A small calm sparkle, not a particle storm: the Spelling Exam's celebrate()
   (app.js:142) with this app's sky -- stars in the family's gold, cyan and
   lavender, gone by itself in ~2.2s, and nothing at all under
   prefers-reduced-motion (§11). */
function celebrate() {
  if (window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const host = document.createElement("div");
  host.className = "celebration";
  host.setAttribute("aria-hidden", "true");
  const BITS = ["★", "✦", "✧"];
  const COLORS = ["#ffd479", "#7fe3ff", "#eaf1ff", "#aab4f2"];
  for (let i = 0; i < 36; i++) {
    const s = document.createElement("span");
    s.className = "confetti";
    s.textContent = BITS[i % BITS.length];
    s.style.left = (4 + Math.random() * 92) + "%";
    s.style.color = COLORS[i % COLORS.length];
    s.style.fontSize = (14 + Math.random() * 18) + "px";
    s.style.animationDuration = (0.9 + Math.random() * 0.9) + "s";
    s.style.animationDelay = (Math.random() * 0.25) + "s";
    host.appendChild(s);
  }
  document.body.appendChild(host);
  setTimeout(() => host.remove(), 2200);
}

/* ------------------------------------------------------------- the beat ---
   Anything scheduled after a spoken line waits for the voice (§5.5.3): the
   retry line must finish before the question replays, and Next does not
   appear until the correct line is done. Cloned from Planets & Moons
   (solar-system-game/app.js:616-662), policy intact: polling, not the
   `ended` event -- a clip that 404s, a device that refused playback and a
   backgrounded tab all leave `ended` unfired, and the game must never sit
   waiting for audio that is not coming. And it waits on whatever is speaking
   now, so a child tapping the speaker extends the wait instead of being
   talked over. With no clip (today) the floor carries the moment alone. */
const QUIET = 700;         /* silence between a line ending and the next thing */
const SPEAK_CAP = 15000;   /* a stalled clip must not hold the game up forever */
let askTimer = null;
let beatTimer = null;

function nextBeat(floor, fn) {
  clearTimeout(beatTimer);
  const from = performance.now();
  const tick = () => {
    const el = voice.el;
    const waited = performance.now() - from;
    if (el && el.src && !el.paused && !el.ended && !voice.dead &&
        waited < SPEAK_CAP) {
      beatTimer = setTimeout(tick, 150);
      return;
    }
    beatTimer = setTimeout(fn, Math.max(QUIET, floor - waited));
  };
  tick();
}

/* --- Phase 3: the LETTERS engine (PRODUCT-SPEC.md §5) --- */

/* The Spelling Exam's engine (spelling-exam-app/app.js:135-245), ported with
   the two §5.1 overrides the owner's 2026-09-14 ruling settles: the bank is
   EXACTLY the answer's letters (no distractors -- which also makes the bank
   the answer's length, an accepted leak), and slots = the answer's length
   (not a fixed nine). Together those make a full row always a complete
   arrangement of the answer's letters, so the row checks itself the moment it
   fills and no Check button exists. The board state rides on `state` in the
   source engine's own shape: `tiles` is the dealt bank (each {id, ch, at},
   `at` the slot index or null), `slots` maps slot index to tile id, `fixed`
   holds the hinted tile ids, `showWord` is the miss-3 reveal. */

function lettersAnswer() {
  const q = state.queue[state.i];
  return q ? q.correctAnswer.trim().toLowerCase() : "";
}

/* The deal: the answer's own letters, lowercase, shuffled with the shared
   shuffle(). The record's letterBank is the same multiset by construction
   (QA-PLAN.md §A1.3), so dealing from the answer keeps the engine and the
   record from ever drifting apart. A fresh deal also clears the per-question
   ladder fields, the same reset nextQuestion() performs for the fields it
   owns -- the headless harness depends on a deal being a clean question. */
function dealTiles(q) {
  const word = q.correctAnswer.trim().toLowerCase();
  state.tiles = shuffle(word.split("")).map((ch, id) => ({ id, ch, at: null }));
  state.slots = Array(word.length).fill(null);
  state.fixed = new Set();
  state.attempts = 0;
  state.hinted = false;
  state.locked = false;
  state.showWord = false;
}

function tile(id) {
  return state.tiles.find((t) => t.id === id);
}

/* Place, unplace, tap: the ported core (source app.js:176-186). Placing into
   an occupied slot swaps; a hinted tile is nailed down -- it can be neither
   moved nor pushed aside; and tap is the whole interaction, drag never
   required (§5.2). */
function place(id, slot) {
  const t = tile(id), from = t.at, occ = state.slots[slot];
  if (occ === id || state.fixed.has(id)) return;
  if (occ != null && state.fixed.has(occ)) return;
  if (from != null) state.slots[from] = null;
  if (occ != null) {
    const o = tile(occ);
    if (from != null) { state.slots[from] = occ; o.at = from; }
    else o.at = null;
  }
  state.slots[slot] = id;
  t.at = slot;
}

function unplace(id) {
  const t = tile(id);
  if (state.fixed.has(id)) return;
  if (t.at != null) { state.slots[t.at] = null; t.at = null; }
}

function tapTile(id) {
  if (state.locked) return;
  const t = tile(id);
  if (!t || state.fixed.has(id)) return;
  if (t.at != null) unplace(id);
  else {
    const s = state.slots.indexOf(null);
    if (s < 0) return;   /* exact letters: a bank tile exists only while a slot is empty */
    place(id, s);
  }
  lettersChanged();
}

/* Only the occupied slots are read, in order. The row is only ever compared
   once it is full -- with exact letters that is always a complete
   arrangement -- so the gaps a half-built row still has are never read. */
function built() {
  return state.slots.filter((id) => id != null).map((id) => tile(id).ch).join("");
}

function rowIsFull() {
  return state.slots.length > 0 && state.slots.every((id) => id != null);
}

/* The drag (§5.2), ported from the source's one pointer handler
   (app.js:190-210): pointer events because HTML5 drag-and-drop does not exist
   on the iPad; one handler serves tap and drag, an 8px move threshold decides
   which; the ghost is a clone; the drop target comes from elementFromPoint on
   .bslot/.pool; and pointercancel cleans up through the same end handler as
   pointerup, so a ghost can never be left on the screen. */
let drag = null;

/* One finger drags at a time. `drag` is a single slot, and a second finger
   landing on another tile used to overwrite it mid-drag: the first finger's
   lift then ended the SECOND finger's gesture -- placing a tile the child
   never moved -- and the first tile's ghost was orphaned, a letter left
   floating over the board for good. So a second pointer is ignored while a
   drag is live, and every drag handler answers only to its own pointer.
   A drag whose tile has left the page can never end (its pointerup has
   nowhere to land), so it is cleared rather than allowed to block every
   tile after it; a new board clears any drag outright. */
function cancelDrag() {
  if (!drag) return;
  const { el, ghost } = drag;
  el.onpointermove = el.onpointerup = el.onpointercancel = null;
  if (ghost) ghost.remove();
  el.classList.remove("lifted");
  document.querySelectorAll(".over").forEach((n) => n.classList.remove("over"));
  drag = null;
}

function startDrag(e, el) {
  const id = +el.dataset.tile;
  if (drag) {
    if (drag.el.isConnected) return;
    cancelDrag();
  }
  if (state.locked || state.fixed.has(id)) return;
  e.preventDefault();
  const r = el.getBoundingClientRect();
  drag = { el, id, pid: e.pointerId, x0: e.clientX, y0: e.clientY,
           dx: e.clientX - r.left, dy: e.clientY - r.top,
           w: r.width, h: r.height, moved: false, ghost: null };
  try { el.setPointerCapture(e.pointerId); } catch (err) {}
  el.onpointermove = dragMove;
  el.onpointerup = dragEnd;
  el.onpointercancel = dragEnd;
}

function dragMove(e) {
  if (!drag || e.pointerId !== drag.pid) return;
  if (!drag.moved) {
    if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 8) return;
    drag.moved = true;
    const g = drag.el.cloneNode(true);
    g.className = "tile ghost";
    g.style.width = drag.w + "px";
    g.style.height = drag.h + "px";
    document.body.appendChild(g);
    drag.ghost = g;
    drag.el.classList.add("lifted");
  }
  drag.ghost.style.left = (e.clientX - drag.dx) + "px";
  drag.ghost.style.top = (e.clientY - drag.dy) + "px";
  const t = dropTarget(e.clientX, e.clientY);
  document.querySelectorAll(".over").forEach((n) => n.classList.remove("over"));
  if (t) t.classList.add("over");
}

function dropTarget(x, y) {
  const el = document.elementFromPoint(x, y);
  return el ? el.closest(".bslot,.pool") : null;
}

function dragEnd(e) {
  if (!drag || e.pointerId !== drag.pid) return;
  const { id, moved } = drag;
  cancelDrag();
  /* A cancelled gesture is one the system took away -- a pinch, an edge
     swipe, the app going to the background. It cleans up and does nothing
     else: taken as a tap or a drop, it moved a letter the child had not
     let go of. */
  if (e.type === "pointercancel") return;
  if (!moved) return tapTile(id);
  const t = dropTarget(e.clientX, e.clientY);
  if (t && t.classList.contains("bslot")) place(id, +t.dataset.slot);
  else if (t && t.classList.contains("pool")) unplace(id);
  lettersChanged();
}

/* Every placement change re-renders, then re-checks: the row auto-checks the
   moment it fills, after a tap and after a drop alike (§5.1). */
function lettersChanged() {
  renderLettersBoard();
  checkLettersRow();
}

/* §5.1's auto-check: with exact letters a full row is always a complete
   arrangement, so it is checked the moment it fills -- there is no Check
   button for a young child to find. When it is right, this locks the row,
   plays the win pop, and hands the moment to the ONE after-correct sequence
   both modes share; nothing is tappable or draggable once locked. */
function checkLettersRow() {
  if (state.locked || !rowIsFull()) return;
  const q = state.queue[state.i];
  if (!q) return;
  if (built().toLowerCase() === q.correctAnswer.trim().toLowerCase()) {
    state.locked = true;
    const row = $("#letters-board .bslots");
    if (row) row.classList.add("win");
    onCorrectAnswer(q);
    return;
  }
  lettersMiss(q);
}

/* §5.3's reset, the owner's "preserve obviously correct placements": compare
   slot by slot against the answer, so a repeated letter is decided by
   position -- MERCURY keeps the R sitting in an R slot and returns the other.
   Every other tile goes back to the bank; nothing turns red, nothing is
   lost. */
function resetWrongTiles(q) {
  const answer = q.correctAnswer.trim().toLowerCase();
  state.slots.forEach((id, i) => {
    if (id == null) return;
    if (tile(id).ch === answer[i]) return;
    unplace(id);   /* refuses the fixed hint, which always sits in its own letter's slot */
  });
}

/* §5.4's miss-2 hint, the source's hintFirst() (app.js:215-218) with one
   addition our own rules ask for: a first letter the child already placed in
   slot 1 and a reset kept there is FIXED where it stands, not swapped out --
   keeping correct work is the whole point of §5.3's reset. */
function hintFirst(q) {
  const ch = q.correctAnswer.trim().toLowerCase().charAt(0);
  const occ = state.slots[0];
  if (occ != null) {
    if (state.fixed.has(occ)) return;
    if (tile(occ).ch === ch) { state.fixed.add(occ); return; }
    unplace(occ);
  }
  const t = state.tiles
    .filter((x) => x.ch === ch && !state.fixed.has(x.id))
    .sort((a, b) => (a.at == null ? 0 : 1) - (b.at == null ? 0 : 1))[0];
  if (!t) return;
  place(t.id, 0);
  state.fixed.add(t.id);
}

/* §5.4's miss-2 line, in the answer's own first letter. It is in no pilot
   record (records carry only the miss-1 retry lines) and no clip exists.
   TODO(owner-approval): new clip needed — "It starts with <LETTER>." */
function firstLetterLine(q) {
  return "It starts with " + q.correctAnswer.trim().charAt(0).toUpperCase() + ".";
}

/* The LETTERS ladder (§5.4), mirroring pickChoice()'s structure: the same
   attempts count, the same two thresholds -- TEACH the first letter at two
   misses, REVEAL the word at three, never the other way round -- and past
   the reveal the same gentle line and the same reset, no escalation and no
   dead end, because copying a shown word always works. */
function lettersMiss(q) {
  state.attempts += 1;
  sfx.no();
  resetWrongTiles(q);

  if (state.attempts === 1) {
    /* Miss 1 (§5.3): the retry line as text and voice, then the question
       replays through the beat -- one Audio element means an immediate
       replay would silence the line mid-word. */
    renderLettersBoard();
    const line = retryLine(q);
    setFeedback(line);
    speak(line);
    nextBeat(0, () => {
      /* The screen is re-checked for the same reason askTimer re-checks it:
         a child who taps Back during the beat must not hear the question
         spoken over the Start screen. */
      if (state.screen === "question") speak(q.questionVoiceText || q.questionText);
    });
    return;
  }

  if (state.attempts === 2) {
    /* Miss 2 TEACHES: the first letter, placed and fixed, and the line that
       says so. §5.4's table replays the question here too, so the same beat
       carries it. */
    state.hinted = true;
    hintFirst(q);
    renderLettersBoard();
    const line = firstLetterLine(q);
    setFeedback(line);
    speak(line);
    nextBeat(0, () => {
      if (state.screen === "question") speak(q.questionVoiceText || q.questionText);
    });
    return;
  }

  if (state.attempts === 3) {
    /* Miss 3 REVEALS: the whole word above the board, and it stays -- the
       child builds it by copying. The teaching fact is the feedback text for
       the same reason revealAnswer() uses it: the moment must read without
       sound, and the record's own fact adds no new wording. The reveal does
       NOT speak the correct line -- that would put "That's right!" in the
       mouth of a moment the child has just missed three times.
       TODO(owner-approval): the reveal needs its own spoken line — same open decision as revealAnswer() */
    state.hinted = true;
    state.showWord = true;
    renderLettersBoard();
    setFeedback(q.teachingFactText);
    return;
  }

  /* Past the reveal: the same gentle retry line over the same reset. */
  renderLettersBoard();
  const line = retryLine(q);
  setFeedback(line);
  speak(line);
}

/* The render: the reveal word (once miss 3 shows it, it stays), the slot row,
   the bank -- rebuilt from state on every change, exactly as the source
   rebuilds its board (app.js:173-174). The tiles are few and the state is
   the one truth, so there is no finer-grained update to keep honest. */
function tileEl(t) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "tile" + (state.fixed.has(t.id) ? " fixed" : "");
  b.dataset.tile = t.id;
  b.textContent = t.ch.toUpperCase();
  return b;
}

function renderLettersBoard() {
  const board = $("#letters-board");
  if (!board) return;
  board.textContent = "";
  if (state.showWord) {
    const w = document.createElement("div");
    w.className = "reveal-word";
    w.textContent = lettersAnswer().toUpperCase();
    board.appendChild(w);
  }
  const row = document.createElement("div");
  row.className = "bslots";
  row.setAttribute("role", "group");
  row.setAttribute("aria-label", "Your word");
  state.slots.forEach((id, i) => {
    const s = document.createElement("span");
    s.className = "bslot";
    s.dataset.slot = i;
    if (id != null) s.appendChild(tileEl(tile(id)));
    row.appendChild(s);
  });
  board.appendChild(row);
  const pool = document.createElement("div");
  pool.className = "pool";
  pool.setAttribute("aria-label", "Letter tiles");
  state.tiles.filter((t) => t.at === null).forEach((t) => pool.appendChild(tileEl(t)));
  board.appendChild(pool);
  wireLettersBoard();
}

function wireLettersBoard() {
  document.querySelectorAll("#answer-area .tile").forEach((el) =>
    el.addEventListener("pointerdown", (e) => startDrag(e, el)));
}

/* Called by renderQuestion() when answerMode is "LETTERS", before anything
   else on the screen changes; it clears #answer-area itself, exactly as
   mountChoices() does. */
function mountLettersBoard(q) {
  cancelDrag();
  dealTiles(q);
  const area = $("#answer-area");
  area.textContent = "";     /* each mount clears its own ground */
  const board = document.createElement("div");
  board.className = "letters";
  board.id = "letters-board";
  area.appendChild(board);
  renderLettersBoard();
}

/* --------------------------------------------------------------- the shell --- */

/* The way out. Set here, not in the markup, so HUB_URL is the one place the
   undecided destination lives. */
$("#hub-link").href = HUB_URL;

/* The double-tap shield (see showScreen): capture phase on the document, so
   it runs before any button, tile or link sees the tap. pointerdown is the
   letter tiles' way in; click is everything else's. */
document.addEventListener("pointerdown", swallowWhileSettling, true);
document.addEventListener("click", swallowWhileSettling, true);

/* Play starts a mission -- Phase 4's seam. The throw surfaces in the console
   for the builder; a child never sees a partial screen, because nothing
   switches until startMission() says so. */
$("#play").onclick = () => startMission();

/* Back is to Start, never out of the app mid-mission (spec §4): the way out
   is the arrow on the Start screen. Quitting is free -- nothing punitive, a
   fresh Play starts a new mission (spec §8). */
$("#back").onclick = () => {
  /* Leaving mid-question takes its pending sound with it: a beat scheduled by
     a miss would otherwise fire after the child had gone. */
  clearTimeout(askTimer);
  clearTimeout(beatTimer);
  /* ...and the line already playing. Clearing the timers stops the NEXT
     sound; a retry line or question still mid-word would otherwise talk on
     over the Start screen once clips exist (silent today, so unseen). */
  if (voice.el) voice.el.pause();
  cancelDrag();   /* a second finger on Back must not leave a letter floating over Start */
  showScreen("start");
};

/* The speaker button is live wiring over a Phase 4 seam. */
$("#sound").onclick = () => replayQuestionNarration();

/* Mission Complete's two ways on: again is a fresh draw -- quitting and
   replaying are free, nothing punitive (spec §8); the Hub link is the way
   out, the same HUB_URL as the Start screen's arrow, so the undecided
   destination still lives in exactly one place. */
$("#again").onclick = () => startMission();
$("#complete-hub").href = HUB_URL;

showScreen("start");
