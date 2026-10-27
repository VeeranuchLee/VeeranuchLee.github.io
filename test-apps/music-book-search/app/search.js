// Song search for the Music Book's search panel (owner, 2026-10-27).
//
// Pure functions over the book's own data — no DOM, no window — so the exact
// code the app ships also runs in plain node (tools/test-search.mjs). Matching
// is case- and accent-insensitive across every name a child might know a song
// by:
//
//   the title, short title and alternate titles   (data/catalogue.js)
//   the composer's name                           (data/catalogue.js)
//   the room's title and key vocabulary, and the
//   wing's title                                   (data/rooms.js)
//   the curated idea words                         (data/search-ideas.js) —
//     a child's word for WHY they want a song ("christmas", "lullaby"), which
//     is rarely part of any title
//
// Ranking, best first: a title the query begins, then a title (or alternate
// title) the query sits inside, then every other way of matching — ideas,
// rooms, wings, vocabulary, composers. Words of five letters or more forgive
// one typo, so "chrismas" still finds Christmas. At most 24 results.

import { PIECES, COMPOSERS } from '../data/catalogue.js';
import { WINGS, ROOMS, PIECE_ROOMS } from '../data/rooms.js';
import { IDEAS, SUGGESTED_IDEAS } from '../data/search-ideas.js';

const MAX_RESULTS = 24;
const MIN_PARTIAL = 3;   // shorter query words match only whole words, or they
                         // would sit inside almost everything ("o", "an")
const MIN_TYPO = 5;      // one-typo forgiveness starts at five letters

// The case- and accent-insensitive form of a string: "Frère", "FRÈRE" and
// "frere" all fold to "frere", so an accent on either side of the search still
// meets the other.
const fold = (text) => text
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')   // the combining marks NFD split off
  .toLowerCase();

// After folding, words are the runs of letters and digits: punctuation,
// apostrophes and hyphens only ever join a title's words, never carry one
// ("Beethoven's" -> "beethoven" + "s").
const NON_WORD = /[^a-z0-9]+/;
const wordsOf = (text) => fold(text).split(NON_WORD).filter(Boolean);

// True when a and b differ by at most one edit: one replaced letter, or one
// letter added or removed. Length is checked first so words that cannot be one
// edit apart never walk their letters.
function withinOneEdit(a, b) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  if (a.length === b.length) {
    let differences = 0;
    for (let i = 0; i < a.length; i += 1) {
      if (a[i] !== b[i]) {
        differences += 1;
        if (differences > 1) return false;
      }
    }
    return true;
  }
  const [long, short] = a.length > b.length ? [a, b] : [b, a];
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < long.length && j < short.length) {
    if (long[i] === short[j]) { i += 1; j += 1; continue; }
    i += 1;                                  // the missing letter, stepped over
    edits += 1;
    if (edits > 1) return false;
  }
  return true;                               // any tail is that one added letter
}

// One searchable entry per piece. Only pieces with a home room are indexed:
// a result is opened through openSongFromIndex(), which needs the room.
function buildIndex() {
  const roomById = new Map(ROOMS.map((room) => [room.id, room]));
  const wingById = new Map(WINGS.map((wing) => [wing.id, wing]));
  const composerById = new Map(COMPOSERS.map((composer) => [composer.id, composer]));
  const ideaWordsByPiece = new Map();
  for (const idea of IDEAS) {
    for (const pieceId of idea.pieces) {
      if (!ideaWordsByPiece.has(pieceId)) ideaWordsByPiece.set(pieceId, []);
      ideaWordsByPiece.get(pieceId).push(...idea.words);
    }
  }
  return PIECES
    .filter((piece) => roomById.has(PIECE_ROOMS[piece.id]?.homeRoomId))
    .map((piece) => {
      const room = roomById.get(PIECE_ROOMS[piece.id].homeRoomId);
      const wing = wingById.get(room.wingId);
      const composer = composerById.get(piece.composerId);
      const names = [piece.title, piece.shortTitle, ...(piece.alternateTitles ?? [])].filter(Boolean);
      const clues = [
        ...names,
        ...(composer ? [composer.name, composer.shortName] : []),
        room.title,
        ...room.keyVocabulary,
        ...(wing ? [wing.title] : []),
        ...(ideaWordsByPiece.get(piece.id) ?? [])
      ];
      const foldedClues = clues.map(fold);
      return {
        id: piece.id,
        sortName: fold(piece.shortTitle || piece.title),
        titles: names.map(fold),
        ideaWords: new Set((ideaWordsByPiece.get(piece.id) ?? []).flatMap(wordsOf)),
        fields: foldedClues,
        words: new Set(foldedClues.flatMap(wordsOf))
      };
    });
}

const INDEX = buildIndex();

// Does one query word match this piece? Whole-word equality at any length
// (so "o" matches only the word "o"), substring from three letters, and the
// one-typo rule from five.
function wordMatches(word, entry) {
  if (entry.words.has(word)) return true;
  if (word.length >= MIN_PARTIAL) {
    for (const field of entry.fields) {
      if (field.includes(word)) return true;
    }
  }
  if (word.length >= MIN_TYPO) {
    for (const candidate of entry.words) {
      if (withinOneEdit(word, candidate)) return true;
    }
  }
  return false;
}

// 1 the query begins a title, 2 the query sits inside one (alternate titles
// count — a child who asks for "O Christmas Tree" knows that name), 3 a curated
// idea names it ("dance" -> the Dance songs), 4 matched some other way, e.g. a
// room's vocabulary. Idea songs must outrank vocabulary hits: "dance" also sits in
// rooms' "dance tune" vocabulary, and with the 24-result cap those weaker hits
// pushed real dance songs off the list.
function rankOf(query, words, entry) {
  for (const title of entry.titles) {
    if (title.startsWith(query)) return 1;
    if (title.includes(query)) return 2;
  }
  const isIdea = (word) => entry.ideaWords.has(word)
    || (word.length >= MIN_TYPO && [...entry.ideaWords].some((idea) => withinOneEdit(word, idea)));
  return words.every(isIdea) ? 3 : 4;
}

// Every piece every query word matches, best first. A multi-word query asks
// for all of its words somewhere ("o christmas tree" -> only O Tannenbaum).
export function searchSongs(query) {
  const words = wordsOf(query ?? '');
  if (!words.length) return [];
  const phrase = words.join(' ');
  const hits = [];
  for (const entry of INDEX) {
    if (!words.every((word) => wordMatches(word, entry))) continue;
    hits.push({ entry, rank: rankOf(phrase, words, entry) });
  }
  hits.sort((a, b) => a.rank - b.rank
    || a.entry.sortName.localeCompare(b.entry.sortName, 'en'));
  return hits.slice(0, MAX_RESULTS).map((hit) => hit.entry.id);
}

// The idea chips offered when nothing matched. The query's own word drops out
// so a chip never repeats what was just typed.
export function searchSuggestions(query = '') {
  const typed = fold(query).trim();
  return SUGGESTED_IDEAS.filter((word) => fold(word) !== typed);
}
