// Read Together — the guided chapter mode.
//
// The architecture's non-negotiable position is that Read Together is the
// default and Explore is the return mode, unlocked after the chapter has been
// completed once. Only Room 1 has an authored chapter so far
// (`curation/ROOM-01-READ-TOGETHER.md`); every other room still opens straight
// into Explore, which is why `chapterFor()` returns null for them rather than
// this module inventing a chapter shape for 23 rooms nobody has designed.
//
// Spread A ("The Doorway") is painted: a 4:3 plate with the lens, tags, plaque
// and ribbon laid over it in plate percentages (owner concept, 2026-09-24).
// Spreads B-D are STILL WIREFRAMES — CSS shapes standing in for their plates.
// What is never a placeholder is the teaching layer: contours, the round, the
// surprise, and the note-following all read the real scores in
// `data/catalogue.js`. That split is the point — the art can be replaced without
// touching a single musical claim, and no musical claim depends on a generated
// image being counted correctly. The painted plate carries no ribbon, no notes
// and no words: the ribbon over it is the same score-derived contour.

import { chapterFor } from '../data/read-together-room-01.js';
import { trackBeats } from './player.js';
import { noteToFrequency } from './audio-engine.js';

// ── deriving the teaching layer from the scores ──────────────────────────────

// Pitch as a vertical position. Using the engine's own frequency table rather
// than a second semitone map means a contour can never disagree with the sound:
// there is only one place a pitch becomes a number.
function pitchHeight(note) {
  if (!note || note.n === null || note.n === undefined) return null;
  const name = Array.isArray(note.n) ? note.n[0] : note.n;
  return Math.log2(noteToFrequency(name));
}

/**
 * A melody's contour as SVG polyline points, straight from its note events.
 * Nothing here is authored: if the score changes, the drawing changes with it.
 */
export function contourPoints(notes, width, height, pad = 6) {
  const heights = notes.map(pitchHeight);
  const real = heights.filter((h) => h !== null);
  if (!real.length) return '';
  const lo = Math.min(...real);
  const hi = Math.max(...real);
  const span = hi - lo || 1;
  const total = trackBeats(notes) || 1;

  const pts = [];
  let beat = 0;
  notes.forEach((note, i) => {
    const h = heights[i];
    if (h !== null) {
      const x = pad + (beat / total) * (width - pad * 2);
      const y = height - pad - ((h - lo) / span) * (height - pad * 2);
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    beat += note.d;
  });
  return pts.join(' ');
}

/** Where each note sits along the contour, so a highlight can ride it. */
function contourStops(notes, width, height, pad = 6) {
  const heights = notes.map(pitchHeight);
  const real = heights.filter((h) => h !== null);
  const lo = Math.min(...real);
  const hi = Math.max(...real);
  const span = hi - lo || 1;
  const total = trackBeats(notes) || 1;
  const stops = [];
  let beat = 0;
  notes.forEach((note, i) => {
    const h = heights[i];
    stops.push(
      h === null
        ? null
        : {
            x: pad + (beat / total) * (width - pad * 2),
            y: height - pad - ((h - lo) / span) * (height - pad * 2)
          }
    );
    beat += note.d;
  });
  return stops;
}

/**
 * The index of the score's highest note — Pop Goes the Weasel's "pop".
 *
 * Derived, never typed in. The alternative is an animator picking a timestamp
 * by ear, which is exactly how a surprise ends up landing half a beat after the
 * sound it is meant to belong to.
 */
export function highestNoteIndex(notes) {
  let best = -1;
  let bestH = -Infinity;
  notes.forEach((note, i) => {
    const h = pitchHeight(note);
    if (h !== null && h > bestH) { bestH = h; best = i; }
  });
  return best;
}

/**
 * How far apart two voices of a round should enter, in beats.
 *
 * Read out of the score's own shape rather than asserted: find the shortest
 * block length the melody divides into evenly where each block is itself a
 * repeated half. Frère Jacques as encoded is four 8-beat sections, each a
 * 4-beat phrase sung twice, so this returns 8 — the classic canon distance.
 *
 * Returns null when the score has no such structure, and the caller then
 * declines to offer a round rather than inventing one. Blocker 5 in the spec
 * still stands: this is derived from our own unverified transcription, and the
 * entry point wants confirming against a source edition before release.
 */
export function roundEntryBeats(notes) {
  const total = trackBeats(notes);
  const sig = [];
  let beat = 0;
  for (const note of notes) { sig.push({ beat, key: `${note.n}:${note.d}` }); beat += note.d; }
  const sliceKey = (from, to) =>
    sig.filter((s) => s.beat >= from && s.beat < to).map((s) => `${(s.beat - from).toFixed(3)}${s.key}`).join('|');

  for (let block = 2; block <= total / 2; block += 1) {
    if (total % block !== 0) continue;
    let ok = true;
    for (let start = 0; start < total && ok; start += block) {
      if (sliceKey(start, start + block / 2) !== sliceKey(start + block / 2, start + block)) ok = false;
    }
    if (ok) return block;
  }
  return null;
}

/** The same melody twice on one clock, the second entry genuinely late. */
export function buildRoundScore(score) {
  const entry = roundEntryBeats(score.notes);
  if (entry === null) return null;
  return {
    tempo: score.tempo,
    tracks: [
      { id: 'voice-1', notes: score.notes },
      { id: 'voice-2', notes: score.notes, offsetBeats: entry, gain: 0.82 }
    ]
  };
}

// ── the chapter ──────────────────────────────────────────────────────────────

const W = 240;
const H = 78;

// Painted plates, by scene. Every position is a percentage of the 4:3 plate
// (== the 4:3 stage), so the overlays track the painting at any stage size.
// Measured off the plate itself; re-measure if the plate is ever replaced.
const PLATES = {
  doorway: {
    art: 'assets/backgrounds/r01-doorway-plate.webp',
    // The painted lens: centre and radius (radius in % of plate WIDTH).
    lens: { x: 50.8, y: 41, r: 11.6 },
    // The score's contour: a band that enters from the doorway and runs
    // through the lens glass (viewBox units: 1000 x 750).
    ribbon: { x: 185, y: 262, w: 420, h: 96 },
    // Where the ribbon leaves the glass (viewBox units).
    exit: { x: 640, y: 308 },
    // The three painted brass hooks, top to bottom (viewBox units). A tag
    // hangs from each; the ribbon's branch meets the tag's eyelet.
    hooks: [{ x: 884, y: 176 }, { x: 884, y: 296 }, { x: 884, y: 400 }]
  }
};

const GUIDE_PORTRAITS = {
  curious: 'assets/guides/mouse-curious.webp',
  knowing: 'assets/guides/owl-knowing.webp'
};

// Small tag charms, drawn rather than typed so they read as pictures on the
// parchment. Keyed by label id; anything unlisted falls back to its data charm.
const TAG_ICONS = {
  twinkle: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.7 6.1 6.6.6-5 4.4 1.5 6.5L12 16.7 6.2 20.1l1.5-6.5-5-4.4 6.6-.6z" fill="#f2c230" stroke="#b8860b" stroke-width="1.2" stroke-linejoin="round"/></svg>',
  baa: '<svg viewBox="0 0 32 24" aria-hidden="true"><g fill="#fffdf6" stroke="#6b5a45" stroke-width="1.1"><circle cx="11" cy="10" r="4.2"/><circle cx="16" cy="8.6" r="4.4"/><circle cx="21" cy="10.4" r="4"/><circle cx="13.5" cy="13.6" r="4"/><circle cx="19" cy="13.8" r="4"/></g><ellipse cx="25.6" cy="11.2" rx="3.2" ry="2.7" fill="#3b3430"/><g stroke="#3b3430" stroke-width="1.8" stroke-linecap="round"><path d="M12 17v4.5M15.5 17.4v4.2M19 17.4v4.2M22 17v4.5"/></g></svg>',
  abc: '<span class="rt-tag__abc" aria-hidden="true"><b>A</b><b>B</b><b>C</b></span>'
};

export function createChapter(deps) {
  const { stage, engine, player, journey, pieceById, companionById, exitToExplore, exitToWing,
    canPlaySound = () => true, atmosphere = () => {} } = deps;

  let chapter = null;
  let spreadIndex = 0;
  let state = null;
  let playing = null;   // { pieceId, which, trackStops }

  const freshState = () => ({
    labelsTried: new Set(),
    activeLabel: null,
    stationsHeard: new Set(),
    roundHeard: false,
    cardPlaced: false,
    heardOnce: new Set(),
    noteFor: null
  });

  const spread = () => chapter.spreads[spreadIndex];

  function scoreFor(p, which) {
    if (which === 'excerpt') return p.excerpt || p.full;
    return p.full || p.excerpt;
  }

  // ── playback ───────────────────────────────────────────────────────────────

  function stop() {
    player.stop();
    engine.duck('piece', false);
    playing = null;
    paintPlaying();
    atmosphere();               // the page's tune comes back
  }

  function play(pieceId, which, opts = {}) {
    const p = pieceById(pieceId);
    const score = opts.score || scoreFor(p, which);
    if (!score) return;
    if (!canPlaySound()) return;

    // Same tap twice is a stop. A child who taps the box again expects the box
    // to stop, not to start a second box.
    if (playing && playing.pieceId === pieceId && playing.which === which && player.playing) {
      stop();
      return;
    }

    stop();
    engine.setInstrument(companionById(journey.companionId));
    engine.duck('piece', true);

    playing = { pieceId, which, popIndex: opts.popIndex ?? -1, popped: false };
    player.onNote = (_i, slot) => onNote(slot);
    player.onFinish = () => {
      const finished = playing;
      playing = null;
      engine.duck('piece', false);
      atmosphere();
      if (finished) {
        state.heardOnce.add(`${finished.pieceId}:${finished.which}`);
        opts.onFinish?.();
      }
      render();
    };
    player.load(score);
    player.play();
    paintPlaying();
    atmosphere();               // the page's tune steps aside for the piece
  }

  // The moving highlight. Driven by the player's own AudioContext-derived
  // timeline, so the picture cannot slide out of step with the sound.
  function onNote(slot) {
    const host = stage.querySelector('[data-live-contour]');
    if (host) {
      const dot = host.querySelector('.rt-contour__dot');
      const stops = host.__stops || [];
      const at = slot && slot.track !== 'voice-2' ? stops[slot.index] : null;
      if (dot) {
        if (at) { dot.setAttribute('cx', at.x); dot.setAttribute('cy', at.y); dot.style.opacity = '1'; }
        else dot.style.opacity = '0';
      }
    }
    // The second voice lights its own ribbon, which is what makes a round look
    // like one melody twice instead of two different tunes.
    const echo = stage.querySelector('[data-echo-ribbon]');
    if (echo) echo.classList.toggle('is-lit', !!slot && slot.track === 'voice-2');
    const lead = stage.querySelector('[data-lead-ribbon]');
    if (lead) lead.classList.toggle('is-lit', !!slot && slot.track !== 'voice-2');

    if (playing && playing.popIndex >= 0 && slot && slot.index === playing.popIndex && !playing.popped) {
      playing.popped = true;
      stage.querySelector('[data-popbox]')?.classList.add('is-open');
    }
  }

  function paintPlaying() {
    stage.querySelectorAll('[data-rt-play]').forEach((el) => {
      const [id, which] = el.dataset.rtPlay.split(':');
      el.classList.toggle('is-playing', !!playing && playing.pieceId === id && playing.which === which);
    });
    stage.classList.toggle('is-listening', !!playing);
  }

  // ── progress ───────────────────────────────────────────────────────────────

  function spreadDone() {
    const need = spread().requires || {};
    if (need.labelsTried && state.labelsTried.size < need.labelsTried) return false;
    if (need.stationsHeard && state.stationsHeard.size < need.stationsHeard) return false;
    if (need.roundHeard && !state.roundHeard) return false;
    if (need.cardPlaced && !state.cardPlaced) return false;
    return true;
  }

  // ── drawing ────────────────────────────────────────────────────────────────

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function dialogueMarkup(lines) {
    return lines.map((d) => `
      <p class="rt-line rt-line--${d.who}"><span class="rt-who">${d.who === 'curious' ? 'Curious' : 'Knowing'}</span>${esc(d.line)}</p>`).join('');
  }

  // Painted spreads: a painted portrait and a speech bubble per line. The mouse
  // and the owl come from the owner's Doorway concept (2026-09-24); the
  // permanent guide cast is still formally open, so they live only here.
  function paintedDialogueMarkup(lines) {
    return lines.map((d) => `
      <div class="rt-say rt-say--${d.who}">
        <span class="rt-portrait" aria-hidden="true">
          <img class="rt-portrait__img" src="${GUIDE_PORTRAITS[d.who]}" alt="">
          <small>${d.who === 'curious' ? 'curious' : 'knowing'}</small>
        </span>
        <p class="rt-bubble"><span class="rt-sr">${d.who === 'curious' ? 'Curious' : 'Knowing'}: </span>${esc(d.line)}</p>
      </div>`).join('');
  }

  function contourMarkup(pieceId, which, { live = false, small = false } = {}) {
    const p = pieceById(pieceId);
    const score = scoreFor(p, which);
    if (!score) return '';
    const w = small ? 120 : W;
    const h = small ? 44 : H;
    const pts = contourPoints(score.notes, w, h);
    const stops = contourStops(score.notes, w, h);
    const id = `c-${pieceId}-${which}`;
    return `
      <svg class="rt-contour${small ? ' rt-contour--small' : ''}" viewBox="0 0 ${w} ${h}" role="img"
           aria-label="The shape of ${esc(p.shortTitle || p.title)}, drawn from its notes"
           ${live ? `data-live-contour="${id}"` : ''}>
        <polyline class="rt-contour__line" points="${pts}"></polyline>
        ${live ? '<circle class="rt-contour__dot" r="5" cx="-20" cy="-20"></circle>' : ''}
      </svg>`;
  }

  // Attach the stop tables after innerHTML, since they are data not markup.
  function bindContours() {
    stage.querySelectorAll('[data-live-contour]').forEach((svg) => {
      const [, pieceId, which] = svg.dataset.liveContour.match(/^c-(.+)-([^-]+)$/) || [];
      if (!pieceId) return;
      const p = pieceById(pieceId);
      const score = scoreFor(p, which);
      if (!score) return;
      const d = svg.dataset;
      if (d.cw) {
        // A ribbon laid over a painted plate: same derivation, offset into place.
        const ox = +d.cx0; const oy = +d.cy0;
        svg.__stops = contourStops(score.notes, +d.cw, +d.ch)
          .map((at) => (at ? { x: at.x + ox, y: at.y + oy } : null));
      } else {
        svg.__stops = contourStops(score.notes, W, H);
      }
    });
  }

  function guidesMarkup(spr) {
    // Two reserved zones, no identities. The permanent cast is unresolved, so
    // the wireframe holds the composition open rather than casting it by
    // accident: whatever is drawn here first is what everyone argues from.
    return `
      <div class="rt-guide rt-guide--curious" aria-hidden="true"><span>?</span><small>curious</small></div>
      <div class="rt-guide rt-guide--knowing" aria-hidden="true"><span>!</span><small>knowing</small></div>`;
  }

  function spreadA(spr) {
    const heard = state.heardOnce.has(`${spr.invite.pieceId}:${spr.invite.which}`);
    const active = spr.labels.find((l) => l.id === state.activeLabel);
    const plate = PLATES[spr.scene];
    if (!plate) return spreadAWireframe(spr, heard, active);

    const p = pieceById(spr.invite.pieceId);
    const score = scoreFor(p, spr.invite.which);
    const rb = plate.ribbon;
    const pts = score ? contourPoints(score.notes, rb.w, rb.h) : '';
    const first = pts.split(' ')[0]?.split(',') || [0, 0];
    const last = pts.split(' ').pop()?.split(',') || [0, 0];
    const ex = plate.exit;
    // From the doorway to the tune's first note, and from its last note out of
    // the glass — decorative leads only; every bend between them is the score.
    const leadIn = `M 60 ${rb.y + rb.h * 0.62} C 100 ${rb.y + rb.h * 0.62}, ${rb.x - 30} ${+first[1] + rb.y}, ${rb.x + +first[0]} ${+first[1] + rb.y}`;
    const leadOut = `M ${rb.x + +last[0]} ${+last[1] + rb.y} C ${rb.x + +last[0] + 12} ${+last[1] + rb.y}, ${ex.x - 12} ${ex.y}, ${ex.x} ${ex.y}`;
    const branches = plate.hooks.map((h, i) => {
      const l = spr.labels[i];
      const lit = heard && (!state.activeLabel || state.activeLabel === l?.id);
      // The eyelet: the tag is 17% of the plate wide (170 units), centred on
      // its hook, with its point at mid-height (12% of the plate tall, so 45).
      const ey = h.y + 45;
      const exx = h.x - 78;
      return `<path class="rt-flow__branch${lit ? ' is-lit' : ''}" d="M ${ex.x} ${ex.y} C ${ex.x + 70} ${ex.y}, ${exx - 80} ${ey}, ${exx} ${ey}"></path>`;
    }).join('');
    const lens = plate.lens;

    return `
      <div class="rt-scene rt-scene--doorway rt-scene--painted${heard ? ' is-heard' : ''}" style="background-image:url(${plate.art})">
        <svg class="rt-flow" viewBox="0 0 1000 750" aria-hidden="true">
          <defs>
            <filter id="rt-glow" x="-20%" y="-60%" width="140%" height="220%">
              <feGaussianBlur stdDeviation="5" result="b"></feGaussianBlur>
              <feMerge><feMergeNode in="b"></feMergeNode><feMergeNode in="SourceGraphic"></feMergeNode></feMerge>
            </filter>
          </defs>
          <g class="rt-flow__branches">${branches}</g>
          <path class="rt-flow__lead" d="${leadIn}"></path>
          <path class="rt-flow__lead" d="${leadOut}"></path>
        </svg>
        <svg class="rt-flow rt-flow--ribbon" viewBox="0 0 1000 750" role="img" data-lead-ribbon
             aria-label="The shape of ${esc(p.shortTitle || p.title)}, drawn from its notes"
             data-live-contour="c-${spr.invite.pieceId}-${spr.invite.which}"
             data-cx0="${rb.x}" data-cy0="${rb.y}" data-cw="${rb.w}" data-ch="${rb.h}">
          <g transform="translate(${rb.x} ${rb.y})">
            <polyline class="rt-contour__halo" points="${pts}"></polyline>
            <polyline class="rt-contour__line" points="${pts}"></polyline>
          </g>
          <circle class="rt-contour__dot" r="9" cx="-40" cy="-40"></circle>
        </svg>

        <button class="rt-lens rt-lens--painted" data-rt-invite data-rt-play="${spr.invite.pieceId}:${spr.invite.which}"
                aria-label="${esc(spr.invite.label)}"
                style="--lx:${lens.x}%;--ly:${lens.y}%;--lr:${lens.r}%">
          <span class="rt-lens__glass"></span>
          <span class="rt-lens__cap">${esc(spr.invite.label)}</span>
        </button>

        <div class="rt-tagrail" ${heard ? 'role="group" aria-label="Names for this tune"' : 'aria-hidden="true"'}>
          ${plate.hooks.map((h, i) => {
            const l = spr.labels[i];
            const pos = `style="--tx:${h.x / 10}%;--ty:${h.y / 7.5}%"`;
            if (!heard || !l) return `<span class="rt-hang rt-tagslot" ${pos}><span class="rt-hang__card"></span></span>`;
            return `
              <button class="rt-hang rt-tag${state.activeLabel === l.id ? ' is-current' : ''}" data-rt-label="${l.id}" ${pos}>
                <span class="rt-hang__card">
                  <span class="rt-tag__text">${esc(l.text)}</span>
                  <span class="rt-tag__charm" aria-hidden="true">${TAG_ICONS[l.id] || l.charm}</span>
                </span>
              </button>`;
          }).join('')}
        </div>
        ${active?.note ? `<p class="rt-note rt-note--slip">${esc(active.note)}</p>` : ''}
      </div>`;
  }

  // The pre-plate layout, kept for a scene whose plate is not painted yet.
  function spreadAWireframe(spr, heard, active) {
    return `
      <div class="rt-scene rt-scene--doorway">
        <div class="rt-door" aria-hidden="true"></div>
        <div class="rt-bench" aria-hidden="true"></div>
        <button class="rt-lens" data-rt-invite data-rt-play="${spr.invite.pieceId}:${spr.invite.which}"
                aria-label="${esc(spr.invite.label)}">
          <span class="rt-lens__glass"></span>
          <span class="rt-lens__cap">${esc(spr.invite.label)}</span>
        </button>
        <div class="rt-ribbon" data-lead-ribbon>
          ${contourMarkup(spr.invite.pieceId, spr.invite.which, { live: true })}
        </div>
        ${heard ? `
          <div class="rt-tags" role="group" aria-label="Names for this tune">
            ${spr.labels.map((l) => `
              <button class="rt-tag${state.activeLabel === l.id ? ' is-current' : ''}" data-rt-label="${l.id}">
                <span class="rt-tag__charm" aria-hidden="true">${l.charm}</span>${esc(l.text)}
              </button>`).join('')}
          </div>` : ''}
        ${active?.note ? `<p class="rt-note">${esc(active.note)}</p>` : ''}
        ${guidesMarkup(spr)}
      </div>`;
  }

  function stationMarkup(st, extra = '') {
    const done = state.stationsHeard.has(st.id);
    return `
      <div class="rt-station${done ? ' is-done' : ''}">
        <button class="rt-station__hit" data-rt-station="${st.id}" data-rt-play="${st.pieceId}:${st.which}">
          <span class="rt-station__shape rt-station__shape--${st.id}" aria-hidden="true"></span>
          <span class="rt-station__label">${esc(st.label)}</span>
        </button>
        ${done ? `<p class="rt-note">${esc(st.note)}</p>` : ''}
        ${extra}
      </div>`;
  }

  function spreadB(spr) {
    return `
      <div class="rt-scene rt-scene--lane">
        <div class="rt-channel" aria-hidden="true"></div>
        <div class="rt-stations">
          ${spr.stations.map((st) => stationMarkup(st)).join('')}
        </div>
        <div class="rt-rail" aria-label="What you have noticed so far">
          ${spr.stations.filter((st) => state.stationsHeard.has(st.id)).map((st) => `
            <button class="rt-strip" data-rt-play="${st.pieceId}:${st.which}">
              ${contourMarkup(st.pieceId, st.which, { small: true })}
              <span>${esc(st.label)}</span>
            </button>`).join('')}
        </div>
        ${guidesMarkup(spr)}
      </div>`;
  }

  function spreadC(spr) {
    const crank = spr.stations[0];
    const turn = spr.stations[1];
    const p = pieceById(turn.pieceId);
    const canRound = !!buildRoundScore(scoreFor(p, turn.which));
    const offerRound = state.stationsHeard.has(turn.id) && canRound;
    return `
      <div class="rt-scene rt-scene--machines">
        <div class="rt-machines">
          ${stationMarkup(crank, `<div class="rt-popbox" data-popbox aria-hidden="true"><span class="rt-popbox__lid"></span><span class="rt-popbox__pop">!</span></div>`)}
          ${stationMarkup(turn, `
            <div class="rt-turntable" aria-hidden="true">
              <span class="rt-groove rt-groove--lead" data-lead-ribbon></span>
              <span class="rt-groove rt-groove--echo${state.roundHeard ? '' : ' is-dim'}" data-echo-ribbon></span>
            </div>
            ${offerRound ? `<button class="rt-echo-tab${state.roundHeard ? ' is-done' : ''}" data-rt-round>${esc(spr.round.tab)}</button>` : ''}
            ${state.roundHeard ? `<p class="rt-note">${esc(spr.round.note)}</p>` : ''}`)}
        </div>
        ${guidesMarkup(spr)}
      </div>`;
  }

  function spreadD(spr) {
    return `
      <div class="rt-scene rt-scene--mapdesk">
        <div class="rt-desk" aria-hidden="true"></div>
        <div class="rt-card${state.cardPlaced ? ' is-placed' : ''}">
          <p class="rt-card__line">${esc(spr.card.line)}</p>
          <ul class="rt-card__cues">
            ${spr.card.cues.map((c) => `<li data-rt-cue="${c.id}">${esc(c.text)}</li>`).join('')}
          </ul>
          ${state.cardPlaced ? '' : `<button class="rt-card__place" data-rt-place>Put the card on the map</button>`}
        </div>
        <div class="rt-tokens" aria-label="Everything you heard in this room">
          ${spr.tokens.map((t) => `
            <button class="rt-token" data-rt-play="${t.pieceId}:${t.which}" data-rt-token="${t.pieceId}">
              ${contourMarkup(t.pieceId, t.which, { small: true })}
              <span>${esc(t.text)}</span>
            </button>`).join('')}
        </div>
        ${state.cardPlaced ? `
          <div class="rt-routes">
            <button class="rt-route" data-rt-exit="explore">Explore this workshop</button>
            <button class="rt-route" data-rt-exit="wing">Back to the map</button>
          </div>` : ''}
        ${guidesMarkup(spr)}
      </div>`;
  }

  function render() {
    const spr = spread();
    const done = spreadDone();
    const body = { A: spreadA, B: spreadB, C: spreadC, D: spreadD }[spr.id](spr);

    const plate = PLATES[spr.scene];
    const talk = done ? [...spr.dialogue.open, ...spr.dialogue.done] : spr.dialogue.open;

    stage.className = `stage stage--chapter${plate ? ' stage--painted' : ''}`;
    // The plate is painted on the scene box, not the stage: in landscape the box
    // IS the stage; in portrait the stage fills the screen and the box is a 4:3
    // band across it, so the overlays still track the painting (styles.css).
    stage.style.backgroundImage = '';
    document.body.classList.toggle('rt-painted', !!plate);
    stage.innerHTML = `
      <div class="rt${plate ? ' rt--painted' : ''}">
        <div class="rt-top">
          <button class="round-btn" data-rt-back aria-label="Back">←</button>
          <div class="rt-head">
            <h1>${esc(spr.title)}</h1>
            <p>${esc(spr.opening)}</p>
          </div>
          ${plate ? '<span class="rt-top__balance" aria-hidden="true"></span>'
            : '<span class="rt-flag" title="Placeholder scenes: the painted plates are not made yet">wireframe</span>'}
        </div>

        <ol class="rt-marks" aria-label="Where you are in this chapter">
          ${chapter.markers.map((m, i) => `
            <li class="rt-mark${i === spreadIndex ? ' is-current' : ''}${i < spreadIndex ? ' is-done' : ''}">
              <span>${esc(m)}</span>
            </li>`).join('')}
        </ol>

        ${body}

        <div class="rt-talk">
          ${plate ? paintedDialogueMarkup(talk) : dialogueMarkup(talk)}
        </div>

        <div class="rt-foot">
          <button class="rt-btn rt-btn--quiet" data-rt-explore>Skip to Explore</button>
          ${spreadIndex < chapter.spreads.length - 1
            ? `<button class="rt-btn${done ? ' is-ready' : ''}" data-rt-next>Continue</button>`
            : ''}
        </div>
      </div>`;
    bindContours();
    paintPlaying();
  }

  // ── clicks ─────────────────────────────────────────────────────────────────

  function click(target) {
    const spr = spread();

    if (target.closest('[data-rt-back]')) {
      stop();
      if (spreadIndex === 0) { exitToWing(); return true; }
      spreadIndex -= 1; render(); return true;
    }
    if (target.closest('[data-rt-next]')) { stop(); spreadIndex += 1; render(); return true; }
    if (target.closest('[data-rt-explore]')) { stop(); exitToExplore(); return true; }

    const exit = target.closest('[data-rt-exit]');
    if (exit) {
      stop();
      // The chapter has a visible end, and reaching it is what opens Explore.
      // Only this route counts: the "Skip to Explore" escape hatch above is for
      // an adult in a hurry and must not quietly mark the chapter as read.
      journey.finishChapter(chapter.roomId);
      if (exit.dataset.rtExit === 'explore') exitToExplore(); else exitToWing();
      return true;
    }

    const label = target.closest('[data-rt-label]');
    if (label) {
      const id = label.dataset.rtLabel;
      state.activeLabel = id;
      state.labelsTried.add(id);
      // Same score, every time. Being the same tune is the lesson.
      play(spr.invite.pieceId, spr.invite.which, { onFinish: () => {} });
      render();
      return true;
    }

    const round = target.closest('[data-rt-round]');
    if (round) {
      const st = spr.stations.find((s) => s.id === spr.round.stationId);
      const p = pieceById(st.pieceId);
      const score = buildRoundScore(scoreFor(p, st.which));
      if (score) {
        play(st.pieceId, 'round', { score, onFinish: () => { state.roundHeard = true; } });
      }
      render();
      return true;
    }

    if (target.closest('[data-rt-place]')) { state.cardPlaced = true; render(); return true; }

    const cue = target.closest('[data-rt-cue]');
    if (cue) {
      const c = spr.card.cues.find((x) => x.id === cue.dataset.rtCue);
      stage.querySelectorAll('[data-rt-token]').forEach((el) => {
        el.classList.toggle('is-cued', c.pieceIds.includes(el.dataset.rtToken));
      });
      return true;
    }

    const hit = target.closest('[data-rt-play]');
    if (hit) {
      const [pieceId, which] = hit.dataset.rtPlay.split(':');
      const station = hit.closest('[data-rt-station]') || target.closest('[data-rt-station]');
      const stationId = station?.dataset.rtStation || hit.dataset.rtStation;
      const opts = {};
      if (stationId) {
        const st = spr.stations?.find((s) => s.id === stationId);
        if (st?.popsOnHighestNote) {
          const score = scoreFor(pieceById(pieceId), which);
          opts.popIndex = highestNoteIndex(score.notes);
        }
        opts.onFinish = () => { state.stationsHeard.add(stationId); };
      }
      play(pieceId, which, opts);
      return true;
    }
    return false;
  }

  // ── api ────────────────────────────────────────────────────────────────────

  return {
    /** True when this room has an authored chapter the child has not finished. */
    isFor(roomId) {
      return !!chapterFor(roomId) && !journey.hasFinishedChapter(roomId);
    },
    open(roomId) {
      chapter = chapterFor(roomId);
      if (!chapter) return false;
      spreadIndex = 0;
      state = freshState();
      render();
      return true;
    },
    active() { return !!chapter; },
    close() { stop(); chapter = null; document.body.classList.remove('rt-painted'); },
    click,
    render
  };
}
