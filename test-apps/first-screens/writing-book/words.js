/* Writing Book — the hundred words.
 *
 * Generated from the owner's ten Level charts, 2026-08-26, by
 * tools/slice-word-cards.py. The chart artwork was cut into one picture and one
 * card per word; the order here is the order on the charts, so a word and its
 * picture cannot drift apart.
 *
 * `level` is the owner's own numbering, 1 to 10, and it is what the child sees.
 * It is a vocabulary progression, not a handwriting one — see TRACING_LEVEL.
 *
 * Every word has:
 *   art/words/picture/<slug>.jpg   the picture with the printed word removed,
 *                                  shown while the answer is still hidden
 *   art/words/card/<slug>.jpg      picture and printed word — the answer, and
 *                                  the sticker
 */
(function (global) {
  'use strict';

  var PAGES = [
    {
      level: 1,
      title: "First Words",
      paper: "unicorn",
      words: [
        { word: "I",       slug: "i"        },
        { word: "a",       slug: "a"        },
        { word: "the",     slug: "the"      },
        { word: "is",      slug: "is"       },
        { word: "it",      slug: "it"       },
        { word: "in",      slug: "in"       },
        { word: "on",      slug: "on"       },
        { word: "at",      slug: "at"       },
        { word: "my",      slug: "my"       },
        { word: "me",      slug: "me"       }
      ]
    },
    {
      level: 2,
      title: "Little Animals",
      paper: "woodland",
      words: [
        { word: "cat",     slug: "cat"      },
        { word: "dog",     slug: "dog"      },
        { word: "pig",     slug: "pig"      },
        { word: "hen",     slug: "hen"      },
        { word: "fox",     slug: "fox"      },
        { word: "bug",     slug: "bug"      },
        { word: "sun",     slug: "sun"      },
        { word: "hat",     slug: "hat"      },
        { word: "bed",     slug: "bed"      },
        { word: "cup",     slug: "cup"      }
      ]
    },
    {
      level: 3,
      title: "Doing Words",
      paper: "space",
      words: [
        { word: "can",     slug: "can"      },
        { word: "run",     slug: "run"      },
        { word: "sit",     slug: "sit"      },
        { word: "hop",     slug: "hop"      },
        { word: "get",     slug: "get"      },
        { word: "big",     slug: "big"      },
        { word: "red",     slug: "red"      },
        { word: "hot",     slug: "hot"      },
        { word: "wet",     slug: "wet"      },
        { word: "fun",     slug: "fun"      }
      ]
    },
    {
      level: 4,
      title: "People and Things",
      paper: "ocean",
      words: [
        { word: "mom",     slug: "mom"      },
        { word: "dad",     slug: "dad"      },
        { word: "kid",     slug: "kid"      },
        { word: "man",     slug: "man"      },
        { word: "boy",     slug: "boy"      },
        { word: "girl",    slug: "girl"     },
        { word: "bag",     slug: "bag"      },
        { word: "box",     slug: "box"      },
        { word: "pen",     slug: "pen"      },
        { word: "book",    slug: "book"     }
      ]
    },
    {
      level: 5,
      title: "Joining Words",
      paper: "unicorn",
      words: [
        { word: "and",     slug: "and"      },
        { word: "to",      slug: "to"       },
        { word: "you",     slug: "you"      },
        { word: "we",      slug: "we"       },
        { word: "he",      slug: "he"       },
        { word: "she",     slug: "she"      },
        { word: "this",    slug: "this"     },
        { word: "that",    slug: "that"     },
        { word: "yes",     slug: "yes"      },
        { word: "no",      slug: "no"       }
      ]
    },
    {
      level: 6,
      title: "Every Day",
      paper: "woodland",
      words: [
        { word: "go",      slug: "go"       },
        { word: "see",     slug: "see"      },
        { word: "look",    slug: "look"     },
        { word: "like",    slug: "like"     },
        { word: "have",    slug: "have"     },
        { word: "want",    slug: "want"     },
        { word: "come",    slug: "come"     },
        { word: "play",    slug: "play"     },
        { word: "eat",     slug: "eat"      },
        { word: "help",    slug: "help"     }
      ]
    },
    {
      level: 7,
      title: "Out and About",
      paper: "ocean",
      words: [
        { word: "fish",    slug: "fish"     },
        { word: "bird",    slug: "bird"     },
        { word: "duck",    slug: "duck"     },
        { word: "frog",    slug: "frog"     },
        { word: "cow",     slug: "cow"      },
        { word: "pet",     slug: "pet"      },
        { word: "ball",    slug: "ball"     },
        { word: "tree",    slug: "tree"     },
        { word: "car",     slug: "car"      },
        { word: "home",    slug: "home"     }
      ]
    },
    {
      level: 8,
      title: "Counting and Time",
      paper: "space",
      words: [
        { word: "one",     slug: "one"      },
        { word: "two",     slug: "two"      },
        { word: "three",   slug: "three"    },
        { word: "up",      slug: "up"       },
        { word: "down",    slug: "down"     },
        { word: "here",    slug: "here"     },
        { word: "there",   slug: "there"    },
        { word: "day",     slug: "day"      },
        { word: "night",   slug: "night"    },
        { word: "now",     slug: "now"      }
      ]
    },
    {
      level: 9,
      title: "Busy Words",
      paper: "woodland",
      words: [
        { word: "walk",    slug: "walk"     },
        { word: "jump",    slug: "jump"     },
        { word: "stop",    slug: "stop"     },
        { word: "open",    slug: "open"     },
        { word: "read",    slug: "read"     },
        { word: "write",   slug: "write"    },
        { word: "draw",    slug: "draw"     },
        { word: "sing",    slug: "sing"     },
        { word: "sleep",   slug: "sleep"    },
        { word: "drink",   slug: "drink"    }
      ]
    },
    {
      level: 10,
      title: "Story Words",
      paper: "unicorn",
      words: [
        { word: "was",     slug: "was"      },
        { word: "are",     slug: "are"      },
        { word: "for",     slug: "for"      },
        { word: "of",      slug: "of"       },
        { word: "said",    slug: "said"     },
        { word: "with",    slug: "with"     },
        { word: "from",    slug: "from"     },
        { word: "what",    slug: "what"     },
        { word: "where",   slug: "where"    },
        { word: "who",     slug: "who"      }
      ]
    }
  ];

  /* One visible number, not two. The owner's levels rise in vocabulary
     difficulty, so the tracing corridor tightens alongside them rather than
     asking a parent to set a second dial (CONCEPT.md §10: keep setup simple).
     If handwriting and vocabulary should progress separately, this is the line
     to change. */
  function tracingLevel(level) {
    if (level <= 4) return 1;
    if (level <= 7) return 2;
    return 3;
  }

  /* How many words a child traces before the page is complete and a sticker is
     revealed. Three is what the owner sketched on 2026-08-26 — enough for one
     sitting, and it keeps the letters big enough for a finger. */
  var SESSION_LENGTH = 3;

  function page(level) {
    for (var i = 0; i < PAGES.length; i++) {
      if (PAGES[i].level === level) return PAGES[i];
    }
    return null;
  }

  function picture(slug) { return 'art/words/picture/' + slug + '.jpg'; }
  function card(slug) { return 'art/words/card/' + slug + '.jpg'; }
  function paper(name) { return 'art/paper/' + name + '.jpg'; }

  global.WritingWords = {
    pages: PAGES,
    page: page,
    picture: picture,
    card: card,
    paper: paper,
    tracingLevel: tracingLevel,
    SESSION_LENGTH: SESSION_LENGTH
  };
})(window);
