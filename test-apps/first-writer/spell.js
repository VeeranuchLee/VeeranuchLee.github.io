/* spell.js -- pure spelling logic for My Writing (first-writer-app).

   No DOM, no storage, no audio: everything here is a pure function over words,
   so the browser page (window.Spell) and tools/test-spell.mjs (require) run the
   SAME code, the way word-book/word-audio.js is the one resolver for both its
   page and its coverage gate.

   What lives here and why:

     normalise(word)            one canonical lowercasing (letters only)
     isKnown(word, knownSet)    "we know this is a real word" -- the bank's known
                                list plus the simple ending rules (-s/-es/-ed/
                                -ing/-er/-est/-ly, doubled consonant, dropped e,
                                y->i). A known word is never questioned.
     damerauLevenshtein(a,b)    edit distance with transpositions (optimal string
                                alignment), the plain distance the tests pin
     candidates(word, list, n)  up to n (default 3) teach words for a typed
                                word, best first: a sound-aware weighted
                                distance (vowel-for-vowel and c/k-style pairs
                                0.5, digraph and silent-e swaps 0.6, doubled
                                letters 0.5, vowels in/out 0.7) plus a
                                first/last-letter penalty, accepted within 1.2
                                (typed word up to 4 letters) or 2.2 (longer),
                                ties broken by the list's own order (the builder
                                writes the CSV's frequency order first). Never
                                the typed word itself.
     nearestTeach(word, list)   the old single-answer name, kept for
                                compatibility: candidates(word, list, 1)[0] with
                                the plain edit distance it used to report
     align(typed, target)       the edit alignment as tile ops: same / sub /
                                missing / extra / swap. The ops carry the target
                                letters (op.b) for computing, but the card only
                                ever RENDERS the typed side -- the correct word is
                                not shown until the reveal step.
     hintFor(ops)               the plain-words hint line. It never says "wrong".

   Loaded by index.html as a plain <script> (defines window.Spell) and by Node
   as CommonJS. */
(function (root) {
  'use strict';

  /* Lowercase and keep only a-z. "Cat!" -> "cat", "don't" -> "dont".
     Punctuation and spaces are stripped anywhere in the string, so the same
     rule serves typed words, card retypes and teach-list entries. */
  function normalise(word) {
    return String(word == null ? '' : word).toLowerCase().replace(/[^a-z]/g, '');
  }

  /* ---- simple endings ------------------------------------------------ */

  var SUFFIXES = ['ing', 'est', 'es', 'ed', 'er', 'ly', 's']; /* longest first */

  function finalDoubleConsonant(stem) {
    var n = stem.length;
    if (n < 2) return false;
    var last = stem.charAt(n - 1);
    if (last !== stem.charAt(n - 2)) return false;
    return 'aeiou'.indexOf(last) === -1; /* "runn", "bigg" -- not "bee" */
  }

  /* Candidate base words for w under the ending rules, or [] when w has no
     known suffix. Only the longest matching suffix is considered, so "boxes"
     tries "box" (via -es) rather than "boxe" (via -s). */
  function endingBases(w) {
    var out = [];
    for (var i = 0; i < SUFFIXES.length; i++) {
      var suf = SUFFIXES[i];
      if (w.length > suf.length && w.slice(w.length - suf.length) === suf) {
        var stem = w.slice(0, w.length - suf.length);
        out.push(stem);
        if (finalDoubleConsonant(stem)) out.push(stem.slice(0, -1));      /* running -> run   */
        if (suf === 'ed' || suf === 'ing' || suf === 'er' || suf === 'est') {
          out.push(stem + 'e');                                          /* coming  -> come  */
        }
        if ((suf === 'ly' || suf === 'er' || suf === 'est') && stem.slice(-1) === 'i') {
          out.push(stem.slice(0, -1) + 'y');                             /* happily -> happy */
        }
        return out;
      }
    }
    return out;
  }

  function inSet(set, w) {
    return set && (typeof set.has === 'function' ? set.has(w)
      : Object.prototype.hasOwnProperty.call(set, w));
  }

  /* Case-insensitive: a capital first letter (or anything else normalise
     lowercases) is accepted, then the ending rules. */
  function isKnown(word, knownSet) {
    var w = normalise(word);
    if (!w) return false;
    if (inSet(knownSet, w)) return true;
    var bases = endingBases(w);
    for (var i = 0; i < bases.length; i++) {
      if (inSet(knownSet, bases[i])) return true;
    }
    return false;
  }

  /* ---- distance and alignment ---------------------------------------- */

  /* Damerau-Levenshtein (optimal string alignment): insert, delete,
     substitute and transpose two adjacent letters, each costing 1. */
  function damerauLevenshtein(a, b) {
    a = String(a == null ? '' : a);
    b = String(b == null ? '' : b);
    var m = a.length, n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    var d = [];
    for (var i = 0; i <= m; i++) {
      d[i] = new Array(n + 1);
      d[i][0] = i;
    }
    for (var j = 0; j <= n; j++) d[0][j] = j;
    for (i = 1; i <= m; i++) {
      for (j = 1; j <= n; j++) {
        var cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
        var best = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
        if (i > 1 && j > 1 &&
            a.charAt(i - 1) === b.charAt(j - 2) &&
            a.charAt(i - 2) === b.charAt(j - 1)) {
          best = Math.min(best, d[i - 2][j - 2] + 1);
        }
        d[i][j] = best;
      }
    }
    return d[m][n];
  }

  /* The shared DP matrix, kept so align() can backtrack through the exact
     distances damerauLevenshtein() reports. */
  function distanceMatrix(a, b) {
    var m = a.length, n = b.length;
    var d = [];
    for (var i = 0; i <= m; i++) {
      d[i] = new Array(n + 1);
      d[i][0] = i;
    }
    for (var j = 0; j <= n; j++) d[0][j] = j;
    for (i = 1; i <= m; i++) {
      for (j = 1; j <= n; j++) {
        var cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
        var best = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
        if (i > 1 && j > 1 &&
            a.charAt(i - 1) === b.charAt(j - 2) &&
            a.charAt(i - 2) === b.charAt(j - 1)) {
          best = Math.min(best, d[i - 2][j - 2] + 1);
        }
        d[i][j] = best;
      }
    }
    return d;
  }

  /* Align typed to target and return the tile ops, in reading order:

       {op:'same',    a:'f'}            letter the child got
       {op:'sub',     a:'r', b:'t'}     wrong letter (a = typed, b = target; the
                                        card renders a only, never b)
       {op:'missing', b:'i'}            a letter the child left out (gap tile)
       {op:'extra',   a:'x'}            a letter the child added (crossed tile)
       {op:'swap',    a:'e', a2:'h'}    two adjacent letters exchanged

     Backtrack priority: same, then swap, then sub, then missing, then extra --
     so "teh"/"the" is one swap, not two substitutions, and "frend"/"friend"
     is one missing letter. */
  function align(typed, target) {
    typed = normalise(typed);
    target = normalise(target);
    var d = distanceMatrix(typed, target);
    var i = typed.length, j = target.length;
    var ops = [];
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 &&
          typed.charAt(i - 1) === target.charAt(j - 1) &&
          d[i][j] === d[i - 1][j - 1]) {
        ops.push({ op: 'same', a: typed.charAt(i - 1) });
        i--; j--;
      } else if (i > 1 && j > 1 &&
                 typed.charAt(i - 1) === target.charAt(j - 2) &&
                 typed.charAt(i - 2) === target.charAt(j - 1) &&
                 d[i][j] === d[i - 2][j - 2] + 1) {
        ops.push({ op: 'swap', a: typed.charAt(i - 2), a2: typed.charAt(i - 1) });
        i -= 2; j -= 2;
      } else if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + 1) {
        ops.push({ op: 'sub', a: typed.charAt(i - 1), b: target.charAt(j - 1) });
        i--; j--;
      } else if (j > 0 && d[i][j] === d[i][j - 1] + 1) {
        ops.push({ op: 'missing', b: target.charAt(j - 1) });
        j--;
      } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) {
        ops.push({ op: 'extra', a: typed.charAt(i - 1) });
        i--;
      } else {
        break; /* unreachable while the matrix is well-formed */
      }
    }
    ops.reverse();
    return ops;
  }

  /* The hint line, in plain words a young child reads. It names the change,
     never a mistake: no "wrong", no "error". */
  function hintFor(ops) {
    var changes = [];
    for (var i = 0; i < ops.length; i++) {
      if (ops[i].op !== 'same') changes.push(ops[i].op);
    }
    if (changes.length === 0) return '';
    if (changes.length === 1) {
      if (changes[0] === 'missing') return 'One letter is missing.';
      if (changes[0] === 'extra') return 'There is an extra letter.';
      if (changes[0] === 'sub') return 'One letter is different.';
      if (changes[0] === 'swap') return 'Two letters have swapped places.';
    }
    if (changes.length === 2) return 'Two letters need a small change.';
    return 'A few letters need a small change.';
  }

  /* ---- the teach match ------------------------------------------------ */

  /* Children misspell by sound, not by edit count, so the round-2 match is a
     weighted, sound-aware distance rather than a plain count. Costs, from
     the brief:

       vowel for vowel (a e i o u y)            0.5 to substitute
       same-sound pairs c/k c/s s/z k/q j/g     0.5 to substitute
                                                 (i/y and u/o are vowels, so
                                                 already 0.5; f/v stays 1)
       inserting or deleting a vowel            0.7
       a doubled letter added or removed        0.5   (t <-> tt)
       digraph swaps, one edit                  0.6   (sh/ch f/ph w/wh k/ck
                                                       ee/ea ai/ay oo/u or/aw
                                                       er/ur/ir)
       trailing silent e added or removed       0.6
       anything else                            1.0

     On top of the alignment:
       a different FIRST letter adds 1 (children nearly always get the first
       sound right), except c/k, k/q, w/wh, f/ph, j/g, which add 0;
       a different LAST letter adds 0.3 -- unless the difference IS the
       ending edit: trailing letters the target adds (wen -> went, cum ->
       come, luv -> love), a final swap (teh -> the), a digraph ending
       (blak -> black) or a same-sound final pair (wuz -> was, z/s). Those
       endings have already paid for their edit; piling 0.3 on top would
       reject exactly the child spellings this scorer exists to catch. The
       penalty still lands on plain final substitutions, which is what kills
       the old wrong guesses thay->than, wat->was, hav->had, sed->see,
       cum->cut. */

  var VOWELS = 'aeiouy';

  function isVowel(ch) { return VOWELS.indexOf(ch) !== -1; }

  function pairKey(x, y) { return x < y ? x + '|' + y : y + '|' + x; }

  /* Same-sound single-letter pairs, keyed as pairKey writes them (f/v
     deliberately absent). */
  var SOUND_PAIRS = { 'c|k': 1, 'c|s': 1, 's|z': 1, 'k|q': 1, 'g|j': 1 };
  /* Pairs that keep the FIRST sound, so a first-letter change costs nothing. */
  var FIRST_PAIRS = { 'c|k': 1, 'k|q': 1, 'g|j': 1 };
  /* Multi-letter units that swap for one 0.6 edit. */
  var DIGRAPHS = {
    'ch|sh': 1, 'f|ph': 1, 'w|wh': 1, 'ck|k': 1, 'ea|ee': 1, 'ai|ay': 1,
    'oo|u': 1, 'aw|or': 1, 'er|ur': 1, 'er|ir': 1, 'ir|ur': 1
  };

  function subCost(x, y) {
    if (isVowel(x) && isVowel(y)) return 0.5;
    return SOUND_PAIRS[pairKey(x, y)] ? 0.5 : 1.0;
  }

  /* Cost of matching one edit unit -- 0, 1 or 2 letters of a against 0, 1 or
     2 of b -- or -1 when those slices are not a single edit. aEnds/bEnds say
     whether the slice ends its word: the silent-e rule is only for a
     trailing e. */
  function unitCost(sa, sb, aEnds, bEnds) {
    if (!sa || !sb) {                        /* a plain insert or delete */
      var ch = sa || sb;
      if (ch.length !== 1) return -1;
      return isVowel(ch) ? 0.7 : 1.0;
    }
    if (sa === sb) return 0;
    if (sa.length === 1 && sb.length === 1) return subCost(sa, sb);
    if (sb.length === 2 && sb === sa + sa) return 0.5;            /* t -> tt  */
    if (sa.length === 2 && sa === sb + sb) return 0.5;            /* tt -> t  */
    if (bEnds && sb.length === 2 && sb === sa + 'e') return 0.6;  /* m -> me  */
    if (aEnds && sa.length === 2 && sa === sb + 'e') return 0.6;
    return DIGRAPHS[pairKey(sa, sb)] ? 0.6 : -1;
  }

  /* Damerau-Levenshtein generalised to the units above: every cell may be
     reached by one 0x1..2x2 unit (or an adjacent transposition at 1), so
     "wat" -> "what" is one w/wh edit (0.6), not an inserted letter (1.0). */
  function weightedDistance(a, b) {
    var m = a.length, n = b.length;
    if (!m) return n;
    if (!n) return m;
    var d = [];
    d[0] = new Array(n + 1);
    d[0][0] = 0;
    for (var j = 1; j <= n; j++) {
      d[0][j] = d[0][j - 1] + (isVowel(b.charAt(j - 1)) ? 0.7 : 1.0);
    }
    for (var i = 1; i <= m; i++) {
      d[i] = new Array(n + 1);
      d[i][0] = d[i - 1][0] + (isVowel(a.charAt(i - 1)) ? 0.7 : 1.0);
      for (j = 1; j <= n; j++) {
        var best = Infinity;
        for (var la = 0; la <= 2; la++) {
          for (var lb = 0; lb <= 2; lb++) {
            if ((la === 0 && lb === 0) || i < la || j < lb) continue;
            var c = unitCost(a.substr(i - la, la), b.substr(j - lb, lb),
                             i === m, j === n);
            if (c < 0) continue;
            var v = d[i - la][j - lb] + c;
            if (v < best) best = v;
          }
        }
        if (i > 1 && j > 1 &&
            a.charAt(i - 1) === b.charAt(j - 2) &&
            a.charAt(i - 2) === b.charAt(j - 1)) {
          best = Math.min(best, d[i - 2][j - 2] + 1);    /* adjacent swap */
        }
        d[i][j] = best;
      }
    }
    return d[m][n];
  }

  function firstPenalty(a, b) {
    if (a.charAt(0) === b.charAt(0)) return 0;
    if (FIRST_PAIRS[pairKey(a.charAt(0), b.charAt(0))]) return 0;
    if ((a.charAt(0) === 'f' && b.slice(0, 2) === 'ph') ||
        (b.charAt(0) === 'f' && a.slice(0, 2) === 'ph')) return 0;
    if ((a.charAt(0) === 'w' && b.slice(0, 2) === 'wh') ||
        (b.charAt(0) === 'w' && a.slice(0, 2) === 'wh')) return 0;
    return 1;
  }

  function lastPenalty(a, b) {
    var m = a.length, n = b.length;
    var la = a.charAt(m - 1), lb = b.charAt(n - 1);
    if (la === lb) return 0;
    if (isVowel(la) && isVowel(lb)) return 0;                 /* thay->the */
    if (SOUND_PAIRS[pairKey(la, lb)]) return 0;               /* wuz->was  */
    if (m > 1 && n > 1 && la === b.charAt(n - 2) &&
        lb === a.charAt(m - 2)) return 0;                     /* teh->the  */
    for (var pa = 1; pa <= 2; pa++) {                         /* blak->black */
      for (var pb = 1; pb <= 2; pb++) {
        if (pa > m || pb > n) continue;
        if (DIGRAPHS[pairKey(a.substr(m - pa, pa), b.substr(n - pb, pb))]) return 0;
      }
    }
    if (n > m && la === b.charAt(n - 2)) return 0;            /* wen->went */
    return 0.3;
  }

  /* Up to `max` (default 3) teach words for a typed word, best first, or []
     when nothing is close enough. A candidate qualifies when its weighted
     score is <= 1.2 for typed words up to 4 letters, <= 2.2 for longer ones.
     Ties are broken by teach order, which is the builder's frequency order.
     One-letter words are never matched on either side: "x" is an initial or
     a slip, not a spelling lesson. The typed word itself is never returned. */
  function candidates(word, teachList, max) {
    if (max == null) max = 3;
    var w = normalise(word);
    if (w.length < 2 || !teachList || !teachList.length || max < 1) return [];
    var limit = w.length <= 4 ? 1.2 : 2.2;
    var hits = [];
    for (var i = 0; i < teachList.length; i++) {
      var t = normalise(teachList[i]);
      /* "a" and "i" sit in the teach list; they are never a useful target */
      if (!t || t.length < 2 || t === w || Math.abs(t.length - w.length) > 3) continue;
      var score = weightedDistance(w, t) + firstPenalty(w, t) + lastPenalty(w, t);
      score = Math.round(score * 1000) / 1000;   /* keep tie-breaking exact */
      if (score <= limit) hits.push({ word: teachList[i], score: score, rank: i });
    }
    hits.sort(function (p, q) { return p.score - q.score || p.rank - q.rank; });
    var out = [];
    for (i = 0; i < hits.length && out.length < max; i++) out.push(hits[i].word);
    return out;
  }

  /* The round-1 single-answer call, kept for compatibility: the best
     candidate, reporting the plain distance it always reported. */
  function nearestTeach(word, teachList) {
    var best = candidates(word, teachList, 1)[0];
    if (!best) return null;
    return { word: best, dist: damerauLevenshtein(normalise(word), normalise(best)) };
  }

  var api = {
    normalise: normalise,
    endingBases: endingBases,
    isKnown: isKnown,
    damerauLevenshtein: damerauLevenshtein,
    align: align,
    hintFor: hintFor,
    candidates: candidates,
    nearestTeach: nearestTeach
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Spell = api;
})(typeof window !== 'undefined' ? window : this);
