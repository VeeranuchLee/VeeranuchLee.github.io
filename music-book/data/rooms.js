// GENERATED FILE — do not edit manually.
// Regenerate with: node music-book/tools/build-rooms.mjs
// Compiled from the PRIVATE curation sources (curation/storybook-rooms.json,
// curation/repertoire-roadmap.json) plus the piece catalogue. Child-facing fields
// only — provenance (sourceIds), rights/editorial/score status and art-stage specs
// (sceneRole, teachingUse, narrativeArc, soundBookMechanic, setting) are deliberately
// not emitted. tools/check-rooms.mjs verifies this file matches a fresh build.

export const WINGS = [
  {
    "id": "songs-we-already-carry",
    "number": 1,
    "title": "Songs We Already Carry",
    "tagline": "Begin with familiar tunes so the learner discovers that music already has shape, repetition, movement, and memory before meeting formal history.",
    "roomIds": [
      "melody-detective-workshop",
      "playground-of-patterns",
      "steps-beats-marches",
      "home-distance-belonging"
    ]
  },
  {
    "id": "the-world-sings",
    "number": 2,
    "title": "The World Sings",
    "tagline": "Show that melodies belong to particular languages, places, histories, and uses, while also travelling and changing.",
    "roomIds": [
      "gardens-season-memory",
      "southeast-asian-courtyard",
      "roads-prayer-city-sea",
      "songs-that-transform",
      "when-song-means-home"
    ]
  },
  {
    "id": "music-for-shared-days",
    "number": 3,
    "title": "Music for Shared Days",
    "tagline": "Examine how communities use songs to mark birthdays, winter, ceremonies, endings, and new beginnings.",
    "roomIds": [
      "celebration-square",
      "winter-lanterns"
    ]
  },
  {
    "id": "the-time-corridor",
    "number": 4,
    "title": "The Time Corridor",
    "tagline": "Introduce Baroque and Classical sound worlds, then let Beethoven visibly open the door toward Romantic scale and expression.",
    "roomIds": [
      "baroque-pattern-workshop",
      "baroque-stage-seasons-water-fireworks",
      "vienna-classical-city",
      "beethoven-door-two-eras"
    ]
  },
  {
    "id": "the-romantic-century",
    "number": 5,
    "title": "The Romantic Century",
    "tagline": "Show that nineteenth-century music can be private, national, theatrical, pictorial, dance-driven, or story-driven rather than one uniform Romantic sound.",
    "roomIds": [
      "music-learns-to-sing",
      "piano-diary",
      "home-memory-dance",
      "ballet-kingdom",
      "when-music-storybook",
      "pictures-legends-russian-colour"
    ]
  },
  {
    "id": "cities-colour-new-pulse",
    "number": 6,
    "title": "Cities, Colour, and a New Pulse",
    "tagline": "End the baseline journey by comparing theatre cities, Parisian sound-colour, American ragtime, and British orchestral modernity.",
    "roomIds": [
      "three-theatre-cities",
      "painting-with-sound",
      "new-century-many-sounds"
    ]
  }
];

export const ROOMS = [
  {
    "id": "melody-detective-workshop",
    "number": 1,
    "wingId": "songs-we-already-carry",
    "title": "Melody Detective Workshop",
    "subtitle": "One tune can have a shape, a pattern, and more than one name.",
    "openingQuestion": "How can you recognise a tune even when its words or pictures change?",
    "thesis": "A melody is an organised path of pitches and rhythms. Titles and words may change, but the underlying path can remain recognisable.",
    "era": "Before recordings -> songs travel through people, print, schools, and homes",
    "keyVocabulary": [
      "melody",
      "tune family",
      "repeat",
      "up/down",
      "round"
    ],
    "pieceIds": [
      "twinkle",
      "frere-jacques",
      "london-bridge",
      "pop-goes-weasel",
      "three-blind-mice"
    ],
    "composers": [
      "mozart"
    ],
    "traditions": [
      "Traditional French tune family",
      "Traditional English tune family",
      "Traditional English/American tune family"
    ],
    "connections": [
      {
        "label": "The familiar Twinkle-family tune later becomes material for Mozart variations.",
        "type": "shared-tune-family",
        "toRoomId": "vienna-classical-city"
      },
      {
        "label": "After finding melody shapes, notice how repeated sections let groups join in.",
        "type": "storybook-sequence",
        "toRoomId": "playground-of-patterns"
      }
    ],
    "compareWith": {
      "twinkle": [
        "mozart-ah-vous-dirai-je-variations"
      ],
      "frere-jacques": [
        "row-row-row-your-boat"
      ],
      "london-bridge": [
        "three-blind-mice"
      ],
      "pop-goes-weasel": [
        "jingle-bells"
      ],
      "three-blind-mice": [
        "london-bridge"
      ]
    }
  },
  {
    "id": "playground-of-patterns",
    "number": 2,
    "wingId": "songs-we-already-carry",
    "title": "Playground of Patterns",
    "subtitle": "Songs become easy to join when something comes back.",
    "openingQuestion": "Why can a whole group sing some songs after hearing only one verse?",
    "thesis": "Repetition, call-and-response, lists, and returning refrains make community songs learnable and participatory.",
    "era": "Songs learned through play, family, school, and social repetition",
    "keyVocabulary": [
      "pattern",
      "refrain",
      "verse",
      "call-and-response",
      "repeat"
    ],
    "pieceIds": [
      "row-row-row-your-boat",
      "old-macdonald",
      "bingo",
      "farmer-in-dell",
      "mulberry-bush"
    ],
    "composers": [],
    "traditions": [
      "Traditional / historical children's song",
      "Traditional tune family",
      "Traditional children's song",
      "Traditional English tune family"
    ],
    "connections": [
      {
        "label": "A repeating frame in a play song can prepare the ear for repeating basses and patterns in Baroque music.",
        "type": "musical-comparison",
        "toRoomId": "baroque-pattern-workshop"
      },
      {
        "label": "Once a group can join the pattern, the next question is how the beat helps bodies move together.",
        "type": "storybook-sequence",
        "toRoomId": "steps-beats-marches"
      }
    ],
    "compareWith": {
      "row-row-row-your-boat": [
        "frere-jacques"
      ],
      "old-macdonald": [
        "farmer-in-dell"
      ],
      "bingo": [
        "this-old-man"
      ],
      "farmer-in-dell": [
        "old-macdonald"
      ],
      "mulberry-bush": [
        "skip-to-my-lou"
      ]
    }
  },
  {
    "id": "steps-beats-marches",
    "number": 3,
    "wingId": "songs-we-already-carry",
    "title": "Steps, Beats, and Marches",
    "subtitle": "The beat is the floor that music walks on.",
    "openingQuestion": "What makes one tune feel like a careful step, another like a dance, and another like a parade?",
    "thesis": "A steady pulse supports many kinds of movement, while rhythm changes the character of those steps.",
    "era": "Simple teaching tunes -> dances -> processional songs",
    "keyVocabulary": [
      "pulse",
      "rhythm",
      "step",
      "dance",
      "procession"
    ],
    "pieceIds": [
      "mary-had-little-lamb",
      "hot-cross-buns",
      "this-old-man",
      "skip-to-my-lou",
      "when-saints-go-marching"
    ],
    "composers": [],
    "traditions": [
      "Traditional / Lowell Mason setting lineage",
      "Traditional English tune family",
      "Traditional American play-party song",
      "Traditional / historical American song"
    ],
    "connections": [
      {
        "label": "Processional and celebration songs both organise groups, but their social uses and histories differ.",
        "type": "musical-comparison",
        "toRoomId": "celebration-square"
      },
      {
        "label": "Later, waltz, polka, habanera, and overture will show more specialised movement styles.",
        "type": "musical-comparison",
        "toRoomId": "three-theatre-cities"
      }
    ],
    "compareWith": {
      "mary-had-little-lamb": [
        "hot-cross-buns"
      ],
      "hot-cross-buns": [
        "mary-had-little-lamb"
      ],
      "this-old-man": [
        "bingo"
      ],
      "skip-to-my-lou": [
        "mulberry-bush"
      ],
      "when-saints-go-marching": [
        "jolly-good-fellow"
      ]
    }
  },
  {
    "id": "home-distance-belonging",
    "number": 4,
    "wingId": "songs-we-already-carry",
    "title": "Home, Distance, and Belonging",
    "subtitle": "Some tunes hold a person, a memory, or a faraway place.",
    "openingQuestion": "How can a simple melody make people think of home, comfort, distance, or hope?",
    "thesis": "Familiar songs often carry social memory. Their meaning comes from use, words, community, and history as well as notes.",
    "era": "Cradle -> meeting place -> journey -> imagined home",
    "keyVocabulary": [
      "lullaby",
      "hymn tune",
      "journey",
      "memory",
      "belonging"
    ],
    "pieceIds": [
      "rock-a-bye-baby",
      "amazing-grace-new-britain",
      "simple-gifts",
      "my-bonnie",
      "home-on-range"
    ],
    "composers": [],
    "traditions": [
      "Traditional / historical lullaby",
      "Traditional tune 'New Britain'",
      "Joseph Brackett / Shaker song",
      "Traditional Scottish song lineage",
      "Daniel E. Kelley / Brewster M. Higley; historical song"
    ],
    "connections": [
      {
        "label": "Later, Brahms and Dvorak turn lullaby, memory, dance, and place into composed concert music.",
        "type": "musical-comparison",
        "toRoomId": "home-memory-dance"
      },
      {
        "label": "Lullaby-like softness also appears in seasonal and sacred repertoire.",
        "type": "musical-comparison",
        "toRoomId": "winter-lanterns"
      }
    ],
    "compareWith": {
      "rock-a-bye-baby": [
        "brahms-lullaby"
      ],
      "amazing-grace-new-britain": [
        "simple-gifts"
      ],
      "simple-gifts": [
        "dvorak-new-world-largo"
      ],
      "my-bonnie": [
        "auld-lang-syne"
      ],
      "home-on-range": [
        "dvorak-new-world-largo"
      ]
    }
  },
  {
    "id": "gardens-season-memory",
    "number": 5,
    "wingId": "the-world-sings",
    "title": "Gardens of Season and Memory",
    "subtitle": "Three familiar songs, three places, and three different cultural lives.",
    "openingQuestion": "Can songs about flowers, seasons, and memory sound connected without being treated as the same tradition?",
    "thesis": "Nearby regions can share broad musical resources while maintaining distinct languages, histories, variants, and social meanings.",
    "era": "Exact dates vary by song and version",
    "keyVocabulary": [
      "variant",
      "tradition",
      "phrase",
      "season",
      "memory"
    ],
    "pieceIds": [
      "sakura-sakura",
      "arirang",
      "mo-li-hua"
    ],
    "composers": [],
    "traditions": [
      "Japanese traditional melody",
      "Korean traditional song family",
      "Chinese traditional song family"
    ],
    "connections": [
      {
        "label": "Continue south through distinct language and musical communities rather than entering one generic world-music room.",
        "type": "storybook-sequence",
        "toRoomId": "southeast-asian-courtyard"
      },
      {
        "label": "Later, compare how composed concert works also evoke season, atmosphere, and image.",
        "type": "musical-comparison",
        "toRoomId": "painting-with-sound"
      }
    ],
    "compareWith": {
      "sakura-sakura": [
        "mo-li-hua"
      ],
      "arirang": [
        "lao-duang-duen"
      ],
      "mo-li-hua": [
        "sakura-sakura"
      ]
    }
  },
  {
    "id": "southeast-asian-courtyard",
    "number": 6,
    "wingId": "the-world-sings",
    "title": "Southeast Asian Courtyard",
    "subtitle": "Songs travel across islands, languages, courts, homes, and schools.",
    "openingQuestion": "What changes when songs travel by sea, by family, by school, or through a court tradition?",
    "thesis": "Southeast Asia is not one musical style. A map can reveal proximity and routes while each song keeps its own language, setting, and history.",
    "era": "Multiple timelines shown side by side",
    "keyVocabulary": [
      "language",
      "island route",
      "court tradition",
      "community song",
      "source"
    ],
    "pieceIds": [
      "rasa-sayang",
      "burung-kakak-tua",
      "leron-leron-sinta",
      "lao-duang-duen"
    ],
    "composers": [],
    "traditions": [
      "Malay Archipelago traditional song",
      "Indonesian/Maluku traditional song",
      "Filipino traditional song",
      "Prince Benbadhanabongse / Thai classical song tradition"
    ],
    "connections": [
      {
        "label": "The map now follows songs that travelled through trade, pilgrimage, city life, and migration.",
        "type": "storybook-sequence",
        "toRoomId": "roads-prayer-city-sea"
      },
      {
        "label": "Lao Duang Duen and other lyrical songs can be compared around longing and memory without claiming shared origin.",
        "type": "musical-comparison",
        "toRoomId": "home-distance-belonging"
      }
    ],
    "compareWith": {
      "rasa-sayang": [
        "burung-kakak-tua"
      ],
      "burung-kakak-tua": [
        "rasa-sayang"
      ],
      "leron-leron-sinta": [
        "mulberry-bush"
      ],
      "lao-duang-duen": [
        "arirang"
      ]
    }
  },
  {
    "id": "roads-prayer-city-sea",
    "number": 7,
    "wingId": "the-world-sings",
    "title": "Roads of Prayer, City, and Sea",
    "subtitle": "A melody can cross borders and collect new uses without losing its history.",
    "openingQuestion": "When a song travels, what stays recognisable and what changes?",
    "thesis": "Songs may move through religious practice, urban life, trade routes, migration, print, theatre, and recording. The app must distinguish documented history from an attractive travel story.",
    "era": "Older roots -> named versions -> modern circulation",
    "keyVocabulary": [
      "route",
      "adaptation",
      "version",
      "sacred use",
      "evidence"
    ],
    "pieceIds": [
      "raghupati-raghava",
      "uskudara-gider-iken",
      "misirlou"
    ],
    "composers": [],
    "traditions": [
      "Indian devotional song tradition",
      "Ottoman/Türkiye traditional urban song",
      "Eastern Mediterranean traditional melody"
    ],
    "connections": [
      {
        "label": "The next room focuses on tunes whose later identities became almost as famous as their earlier forms.",
        "type": "storybook-sequence",
        "toRoomId": "songs-that-transform"
      },
      {
        "label": "Later theatre and publishing networks also move dances and melodies between cities.",
        "type": "historical-context",
        "toRoomId": "three-theatre-cities"
      }
    ],
    "compareWith": {
      "uskudara-gider-iken": [
        "misirlou"
      ],
      "misirlou": [
        "la-bamba"
      ]
    }
  },
  {
    "id": "songs-that-transform",
    "number": 8,
    "wingId": "the-world-sings",
    "title": "Songs That Transform",
    "subtitle": "A tune can become a dance, a celebration, a carol, or a symbol.",
    "openingQuestion": "Is a song still the same song after people give it new words, a new setting, or a new social purpose?",
    "thesis": "Musical identity has layers: base melody, named composer or adapter, lyrics, arrangement, performance practice, and later cultural use.",
    "era": "Source layer -> named shaping -> later public identity",
    "keyVocabulary": [
      "melody layer",
      "lyrics",
      "arrangement",
      "adapter",
      "later use"
    ],
    "pieceIds": [
      "hava-nagila",
      "kalinka",
      "shchedryk",
      "greensleeves"
    ],
    "composers": [],
    "traditions": [
      "Jewish / Eastern European song tradition",
      "Ivan Larionov / Russian song tradition",
      "Mykola Leontovych / Ukrainian song setting",
      "English historical tune family"
    ],
    "connections": [
      {
        "label": "Shchedryk and Greensleeves connect to later seasonal uses without becoming duplicate tune records.",
        "type": "shared-tune-family",
        "toRoomId": "winter-lanterns"
      },
      {
        "label": "Mozart variations transform one tune inside a composed work; this room transforms tunes through social history.",
        "type": "musical-comparison",
        "toRoomId": "vienna-classical-city"
      }
    ],
    "compareWith": {
      "kalinka": [
        "tchaikovsky-trepak"
      ],
      "shchedryk": [
        "jingle-bells"
      ],
      "greensleeves": [
        "o-tannenbaum"
      ]
    }
  },
  {
    "id": "when-song-means-home",
    "number": 9,
    "wingId": "the-world-sings",
    "title": "When a Song Means Home",
    "subtitle": "Some melodies grow into public symbols, but they began in particular histories.",
    "openingQuestion": "How does a song become connected with a place, a people, or a shared memory?",
    "thesis": "A song may become a civic, national, regional, or diasporic symbol through repeated public use. That later role should not erase its composer, local tradition, or earlier form.",
    "era": "Creation or tradition -> circulation -> public symbol",
    "keyVocabulary": [
      "public symbol",
      "anthem use",
      "local tradition",
      "adaptation",
      "identity"
    ],
    "pieceIds": [
      "nkosi-sikelel-iafrika",
      "waltzing-matilda",
      "el-condor-pasa",
      "la-bamba"
    ],
    "composers": [],
    "traditions": [
      "Enoch Sontonga / Southern African hymn tradition",
      "Australian historical song",
      "Daniel Alomía Robles / Peruvian work",
      "Mexican traditional song family"
    ],
    "connections": [
      {
        "label": "The next wing asks how songs mark shared times and ceremonies without necessarily representing a nation.",
        "type": "storybook-sequence",
        "toRoomId": "celebration-square"
      },
      {
        "label": "Dvorak also wrote about place and identity in concert music, but through a different medium and historical situation.",
        "type": "musical-comparison",
        "toRoomId": "home-memory-dance"
      }
    ],
    "compareWith": {
      "waltzing-matilda": [
        "home-on-range"
      ],
      "el-condor-pasa": [
        "dvorak-new-world-largo"
      ],
      "la-bamba": [
        "misirlou"
      ]
    }
  },
  {
    "id": "celebration-square",
    "number": 10,
    "wingId": "music-for-shared-days",
    "title": "Celebration Square",
    "subtitle": "People use songs to begin, gather, congratulate, and say goodbye.",
    "openingQuestion": "Why do certain tunes appear whenever people share an important moment?",
    "thesis": "Function shapes musical memory: a short singable tune can become attached to birthdays, congratulations, winter gatherings, worship, or year-end reflection.",
    "era": "Tune history and modern occasion shown as separate layers",
    "keyVocabulary": [
      "occasion",
      "ceremony",
      "congratulation",
      "communal song",
      "tune family"
    ],
    "pieceIds": [
      "happy-birthday",
      "jolly-good-fellow",
      "jingle-bells",
      "joy-to-world",
      "auld-lang-syne"
    ],
    "composers": [],
    "traditions": [
      "Patty Hill and Mildred J. Hill / historical birthday song",
      "Traditional tune family",
      "James Lord Pierpont",
      "Lowell Mason setting / Isaac Watts text lineage",
      "Scottish traditional/historical tune family"
    ],
    "connections": [
      {
        "label": "Move from a mixed celebration square into one quieter seasonal chapter with several different musical functions.",
        "type": "storybook-sequence",
        "toRoomId": "winter-lanterns"
      },
      {
        "label": "Ode to Joy also became a public communal melody, but it began inside a large symphonic work.",
        "type": "musical-comparison",
        "toRoomId": "beethoven-door-two-eras"
      }
    ],
    "compareWith": {
      "jolly-good-fellow": [
        "twinkle"
      ],
      "jingle-bells": [
        "shchedryk"
      ],
      "joy-to-world": [
        "ode-to-joy"
      ],
      "auld-lang-syne": [
        "my-bonnie"
      ]
    }
  },
  {
    "id": "winter-lanterns",
    "number": 11,
    "wingId": "music-for-shared-days",
    "title": "Winter Lanterns",
    "subtitle": "One season can hold lullaby, evergreen, dance, visiting, and story.",
    "openingQuestion": "Why do winter songs sound so different even when people hear them in the same season?",
    "thesis": "A seasonal collection is not one musical style. Songs enter it through sacred story, lullaby, older dance tune, visiting custom, and later reuse.",
    "era": "Different origins gathered into one later seasonal repertoire",
    "keyVocabulary": [
      "seasonal use",
      "carol",
      "lullaby",
      "dance tune",
      "visiting song"
    ],
    "pieceIds": [
      "silent-night",
      "o-tannenbaum",
      "deck-the-hall",
      "we-wish-merry-christmas",
      "first-noel"
    ],
    "composers": [],
    "traditions": [
      "Franz Xaver Gruber / Joseph Mohr",
      "German traditional/historical tune family",
      "Welsh tune 'Nos Galan'",
      "English traditional song",
      "English traditional carol"
    ],
    "connections": [
      {
        "label": "Greensleeves and Shchedryk connect to later seasonal identities without duplicate melody objects.",
        "type": "shared-tune-family",
        "toRoomId": "songs-that-transform"
      },
      {
        "label": "The next wing leaves the calendar and enters a time corridor where musical construction becomes visible.",
        "type": "storybook-sequence",
        "toRoomId": "baroque-pattern-workshop"
      }
    ],
    "compareWith": {
      "silent-night": [
        "rock-a-bye-baby"
      ],
      "o-tannenbaum": [
        "greensleeves"
      ],
      "deck-the-hall": [
        "strauss-tritsch-tratsch-polka"
      ],
      "we-wish-merry-christmas": [
        "jolly-good-fellow"
      ],
      "first-noel": [
        "joy-to-world"
      ]
    }
  },
  {
    "id": "baroque-pattern-workshop",
    "number": 12,
    "wingId": "the-time-corridor",
    "title": "Baroque Pattern Workshop",
    "subtitle": "Lines repeat, overlap, and build a larger design.",
    "openingQuestion": "How can repeating shapes and independent lines make music feel as if it is always moving?",
    "thesis": "Much Baroque music creates momentum through recurring basses, sequences, arpeggiated patterns, and lines that fit together. The room teaches construction before biography.",
    "era": "Approximately 1600-1750, shown as an overlapping teaching band",
    "keyVocabulary": [
      "Baroque",
      "pattern",
      "sequence",
      "bass line",
      "canon/counterpoint"
    ],
    "pieceIds": [
      "bach-prelude-c-major-bwv-846",
      "bach-air-orchestral-suite-3",
      "bach-jesu-joy",
      "bach-cello-suite-1-prelude",
      "pachelbel-canon-d"
    ],
    "composers": [
      "bach",
      "pachelbel"
    ],
    "traditions": [],
    "connections": [
      {
        "label": "Both rooms use repetition, but Baroque works build longer structures from overlapping musical roles.",
        "type": "musical-comparison",
        "toRoomId": "playground-of-patterns"
      },
      {
        "label": "The workshop doors open onto public stages, outdoor spectacle, and musical scene-painting.",
        "type": "storybook-sequence",
        "toRoomId": "baroque-stage-seasons-water-fireworks"
      },
      {
        "label": "The next era keeps inherited craft but favours different balances, forms, and conversational clarity.",
        "type": "historical-context",
        "toRoomId": "vienna-classical-city"
      }
    ],
    "compareWith": {
      "bach-prelude-c-major-bwv-846": [
        "satie-gymnopedie-1"
      ],
      "bach-air-orchestral-suite-3": [
        "bach-jesu-joy"
      ],
      "bach-jesu-joy": [
        "bach-air-orchestral-suite-3"
      ],
      "bach-cello-suite-1-prelude": [
        "mussorgsky-promenade"
      ],
      "pachelbel-canon-d": [
        "row-row-row-your-boat"
      ]
    }
  },
  {
    "id": "baroque-stage-seasons-water-fireworks",
    "number": 13,
    "wingId": "the-time-corridor",
    "title": "Baroque Stage: Seasons, Water, and Fireworks",
    "subtitle": "Music moves from workshop patterns into weather, ceremony, and public spectacle.",
    "openingQuestion": "How can instruments suggest spring, a storm, cold wind, water, or fireworks without showing a picture?",
    "thesis": "Baroque composers could use recurring musical ideas, contrast, rhythm, and instrumental colour to suggest scenes and organise large public occasions.",
    "era": "Early eighteenth century",
    "keyVocabulary": [
      "concerto",
      "contrast",
      "season",
      "ceremony",
      "public music"
    ],
    "pieceIds": [
      "vivaldi-spring-1",
      "vivaldi-summer-storm",
      "vivaldi-winter-1",
      "handel-hallelujah-chorus",
      "handel-water-music-hornpipe",
      "handel-royal-fireworks-rejouissance"
    ],
    "composers": [
      "vivaldi",
      "handel"
    ],
    "traditions": [],
    "connections": [
      {
        "label": "The same era's craft moves from intimate pattern to theatre and public space.",
        "type": "historical-context",
        "toRoomId": "baroque-pattern-workshop"
      },
      {
        "label": "The route continues toward the later eighteenth-century Classical city, where musical conversation and formal balance become the chapter focus.",
        "type": "storybook-sequence",
        "toRoomId": "vienna-classical-city"
      },
      {
        "label": "Later composers also make scenes audible, but with different orchestras, forms, and nineteenth-century story worlds.",
        "type": "musical-comparison",
        "toRoomId": "when-music-storybook"
      }
    ],
    "compareWith": {
      "vivaldi-spring-1": [
        "grieg-morning-mood"
      ],
      "vivaldi-summer-storm": [
        "holst-mars"
      ],
      "vivaldi-winter-1": [
        "vivaldi-summer-storm"
      ],
      "handel-hallelujah-chorus": [
        "ode-to-joy"
      ],
      "handel-water-music-hornpipe": [
        "strauss-blue-danube"
      ],
      "handel-royal-fireworks-rejouissance": [
        "jingle-bells"
      ]
    }
  },
  {
    "id": "vienna-classical-city",
    "number": 14,
    "wingId": "the-time-corridor",
    "title": "Vienna's Classical City",
    "subtitle": "Music becomes conversation: balanced phrases, surprise, variation, and clear musical roles.",
    "openingQuestion": "What makes music sound as if instruments are speaking, answering, joking, or changing an idea?",
    "thesis": "The Classical-era chapter emphasises audible conversation, proportion, contrast, surprise, and variation through Haydn and Mozart, using Vienna as a cultural hub rather than a claim that all Classical music came from one city.",
    "era": "Approximately 1750-1820, overlapping the late Baroque and early Romantic transition",
    "keyVocabulary": [
      "Classical era",
      "phrase",
      "question and answer",
      "variation",
      "surprise"
    ],
    "pieceIds": [
      "haydn-surprise-symphony-94-2",
      "haydn-trumpet-concerto-3",
      "mozart-eine-kleine-nachtmusik-1",
      "mozart-rondo-alla-turca",
      "mozart-symphony-40-1",
      "mozart-piano-sonata-k545-1",
      "mozart-ah-vous-dirai-je-variations"
    ],
    "composers": [
      "haydn",
      "mozart"
    ],
    "traditions": [],
    "connections": [
      {
        "label": "Mozart K.265 transforms the familiar Ah vous dirai-je/Twinkle-family melody into a variation set.",
        "type": "shared-tune-family",
        "toRoomId": "melody-detective-workshop"
      },
      {
        "label": "Beethoven came to Vienna and studied with Haydn, then developed a distinctive path from the Classical tradition.",
        "type": "direct-documented-relationship",
        "toRoomId": "beethoven-door-two-eras"
      },
      {
        "label": "Classical clarity did not erase earlier craft; composers inherited and reworked counterpoint and pattern.",
        "type": "historical-context",
        "toRoomId": "baroque-pattern-workshop"
      }
    ],
    "compareWith": {
      "haydn-surprise-symphony-94-2": [
        "symphony-5-opening"
      ],
      "haydn-trumpet-concerto-3": [
        "mendelssohn-violin-concerto-opening"
      ],
      "mozart-eine-kleine-nachtmusik-1": [
        "handel-water-music-hornpipe"
      ],
      "mozart-rondo-alla-turca": [
        "uskudara-gider-iken"
      ],
      "mozart-symphony-40-1": [
        "beethoven-symphony-7-2"
      ],
      "mozart-piano-sonata-k545-1": [
        "bach-prelude-c-major-bwv-846"
      ],
      "mozart-ah-vous-dirai-je-variations": [
        "twinkle"
      ]
    }
  },
  {
    "id": "beethoven-door-two-eras",
    "number": 15,
    "wingId": "the-time-corridor",
    "title": "Beethoven's Door Between Two Eras",
    "subtitle": "The same city, inherited forms, and a new sense of scale, struggle, intimacy, and public voice.",
    "openingQuestion": "How can one composer use a tiny idea, a private piano pattern, or a broad communal theme to build very different worlds?",
    "thesis": "Beethoven connects Classical training and forms with increasingly expansive, dramatic, and personally charged musical possibilities. The room is a bridge, not a claim that one person changed every style alone.",
    "era": "Late eighteenth to early nineteenth century",
    "keyVocabulary": [
      "motif",
      "symphony",
      "sonata",
      "transition",
      "scale"
    ],
    "pieceIds": [
      "symphony-5-opening",
      "fur-elise",
      "moonlight-sonata",
      "beethoven-symphony-7-2",
      "ode-to-joy"
    ],
    "composers": [
      "beethoven"
    ],
    "traditions": [],
    "connections": [
      {
        "label": "Beethoven studied with Haydn in Vienna and worked within genres shaped by Haydn and Mozart.",
        "type": "direct-documented-relationship",
        "toRoomId": "vienna-classical-city"
      },
      {
        "label": "The private keyboard chamber opens toward Romantic piano miniatures and personal musical worlds.",
        "type": "storybook-sequence",
        "toRoomId": "piano-diary"
      },
      {
        "label": "Ode to Joy later acquired civic and ceremonial uses beyond its original symphonic setting.",
        "type": "historical-context",
        "toRoomId": "celebration-square"
      }
    ],
    "compareWith": {
      "symphony-5-opening": [
        "haydn-surprise-symphony-94-2"
      ],
      "fur-elise": [
        "chopin-nocturne-op9-no2"
      ],
      "moonlight-sonata": [
        "debussy-clair-de-lune"
      ],
      "beethoven-symphony-7-2": [
        "brahms-hungarian-dance-5"
      ],
      "ode-to-joy": [
        "joy-to-world"
      ]
    }
  },
  {
    "id": "music-learns-to-sing",
    "number": 16,
    "wingId": "the-romantic-century",
    "title": "Music Learns to Sing Without Words",
    "subtitle": "Voice-like melody moves from song to piano, violin, ceremony, and spring scene.",
    "openingQuestion": "What makes an instrument sound as if it is singing even when there are no words?",
    "thesis": "Early Romantic composers often foreground long, memorable melodic lines and characterful scenes. Schubert and Mendelssohn provide different routes from songfulness to instrumental storytelling.",
    "era": "Early to mid-nineteenth century",
    "keyVocabulary": [
      "songful line",
      "accompaniment",
      "character piece",
      "concerto",
      "ceremony"
    ],
    "pieceIds": [
      "schubert-ave-maria",
      "schubert-die-forelle",
      "mendelssohn-wedding-march",
      "mendelssohn-spring-song",
      "mendelssohn-violin-concerto-opening"
    ],
    "composers": [
      "schubert",
      "mendelssohn"
    ],
    "traditions": [],
    "connections": [
      {
        "label": "Schubert worked in Beethoven's Vienna but developed a distinctive song-centred identity.",
        "type": "historical-context",
        "toRoomId": "beethoven-door-two-eras"
      },
      {
        "label": "The singing line moves inward into piano miniatures, moods, memories, and named character scenes.",
        "type": "storybook-sequence",
        "toRoomId": "piano-diary"
      },
      {
        "label": "Wordless character and scene-painting become even more explicit in Grieg and Saint-Saens.",
        "type": "musical-comparison",
        "toRoomId": "when-music-storybook"
      }
    ],
    "compareWith": {
      "schubert-ave-maria": [
        "silent-night"
      ],
      "schubert-die-forelle": [
        "saint-saens-aquarium"
      ],
      "mendelssohn-wedding-march": [
        "jolly-good-fellow"
      ],
      "mendelssohn-spring-song": [
        "grieg-morning-mood"
      ],
      "mendelssohn-violin-concerto-opening": [
        "haydn-trumpet-concerto-3"
      ]
    }
  },
  {
    "id": "piano-diary",
    "number": 17,
    "wingId": "the-romantic-century",
    "title": "The Piano Diary",
    "subtitle": "One instrument can whisper, dance, remember, storm, and imagine another place.",
    "openingQuestion": "How can a short piano piece feel like a private page, a scene, or a whole emotional weather system?",
    "thesis": "Romantic piano miniatures often create concentrated worlds through texture, rhythm, register, harmony, and suggestive titles. Chopin and Schumann show different kinds of inward and characterful writing.",
    "era": "Nineteenth-century salon and domestic piano culture",
    "keyVocabulary": [
      "miniature",
      "nocturne",
      "waltz",
      "prelude",
      "texture"
    ],
    "pieceIds": [
      "chopin-nocturne-op9-no2",
      "chopin-minute-waltz",
      "chopin-raindrop-prelude",
      "chopin-fantaisie-impromptu",
      "schumann-traumerei",
      "schumann-happy-farmer",
      "schumann-foreign-lands-people"
    ],
    "composers": [
      "chopin",
      "schumann"
    ],
    "traditions": [],
    "connections": [
      {
        "label": "Beethoven's piano works open a path toward the larger nineteenth-century piano culture, but these composers create distinct forms and identities.",
        "type": "historical-context",
        "toRoomId": "beethoven-door-two-eras"
      },
      {
        "label": "Later Paris-centred composers use space, sonority, and atmosphere differently from Romantic diary-like miniatures.",
        "type": "musical-comparison",
        "toRoomId": "painting-with-sound"
      },
      {
        "label": "The diary opens outward toward home, national dance, mentorship, migration, and orchestral memory.",
        "type": "storybook-sequence",
        "toRoomId": "home-memory-dance"
      }
    ],
    "compareWith": {
      "chopin-nocturne-op9-no2": [
        "moonlight-sonata"
      ],
      "chopin-minute-waltz": [
        "strauss-blue-danube"
      ],
      "chopin-raindrop-prelude": [
        "bach-prelude-c-major-bwv-846"
      ],
      "chopin-fantaisie-impromptu": [
        "rimsky-flight-bumblebee"
      ],
      "schumann-traumerei": [
        "brahms-waltz-op39-no15"
      ],
      "schumann-happy-farmer": [
        "this-old-man"
      ],
      "schumann-foreign-lands-people": [
        "home-on-range"
      ]
    }
  },
  {
    "id": "home-memory-dance",
    "number": 18,
    "wingId": "the-romantic-century",
    "title": "Home, Memory, and Dance",
    "subtitle": "Brahms and Dvorak connect private song, regional dance, friendship, travel, and symphonic scale.",
    "openingQuestion": "How can composers carry memories of home while working in cities, publishing networks, and places far away?",
    "thesis": "Nineteenth-century concert music could draw on lullaby, dance, local identity, mentorship, and travel. Brahms and Dvorak are connected by documented professional support, but they remain distinct composers.",
    "era": "Mid- to late-nineteenth century",
    "keyVocabulary": [
      "lullaby",
      "dance",
      "mentor/supporter",
      "publisher",
      "symphony"
    ],
    "pieceIds": [
      "brahms-lullaby",
      "brahms-hungarian-dance-5",
      "brahms-waltz-op39-no15",
      "dvorak-new-world-largo",
      "dvorak-humoresque-7",
      "dvorak-slavonic-dance-8"
    ],
    "composers": [
      "brahms",
      "dvorak"
    ],
    "traditions": [],
    "connections": [
      {
        "label": "The intimate nineteenth-century piano world continues, but this room opens toward dance, publishing, travel, and orchestra.",
        "type": "historical-context",
        "toRoomId": "piano-diary"
      },
      {
        "label": "Earlier community songs and these concert works both engage home and distance, but through different histories and forms.",
        "type": "musical-comparison",
        "toRoomId": "home-distance-belonging"
      },
      {
        "label": "Brahms advised and recommended Dvorak's work to Simrock; the room makes that support visible without presenting Dvorak as a copy of Brahms.",
        "type": "direct-documented-relationship",
        "toRoomId": null,
        "scope": "within-room"
      }
    ],
    "compareWith": {
      "brahms-lullaby": [
        "rock-a-bye-baby"
      ],
      "brahms-hungarian-dance-5": [
        "dvorak-slavonic-dance-8"
      ],
      "brahms-waltz-op39-no15": [
        "strauss-blue-danube"
      ],
      "dvorak-new-world-largo": [
        "home-on-range"
      ],
      "dvorak-humoresque-7": [
        "schumann-traumerei"
      ],
      "dvorak-slavonic-dance-8": [
        "brahms-hungarian-dance-5"
      ]
    }
  },
  {
    "id": "ballet-kingdom",
    "number": 19,
    "wingId": "the-romantic-century",
    "title": "Ballet Kingdom",
    "subtitle": "Music gives dancers a step, a character, a place, and a story before anyone speaks.",
    "openingQuestion": "How can rhythm, orchestral colour, and melody tell a dancer when to glide, march, spin, or leap?",
    "thesis": "Tchaikovsky's ballet music links movement and narrative, but his concerto shows that the same composer also wrote beyond the theatre.",
    "era": "Late nineteenth-century Russian and European theatre culture",
    "keyVocabulary": [
      "ballet",
      "character dance",
      "waltz",
      "march",
      "concerto"
    ],
    "pieceIds": [
      "swan-lake-theme",
      "tchaikovsky-sugar-plum-fairy",
      "tchaikovsky-waltz-flowers",
      "tchaikovsky-nutcracker-march",
      "tchaikovsky-trepak",
      "tchaikovsky-piano-concerto-1-opening"
    ],
    "composers": [
      "tchaikovsky"
    ],
    "traditions": [],
    "connections": [
      {
        "label": "A neighbouring Russian room reveals a different network of composers, aesthetics, and story sources.",
        "type": "historical-context",
        "toRoomId": "pictures-legends-russian-colour"
      },
      {
        "label": "Saint-Saens and Grieg also make character and scene audible, but not through the same ballet system.",
        "type": "musical-comparison",
        "toRoomId": "when-music-storybook"
      },
      {
        "label": "Theatre music changes with city, genre, audience, and stage tradition.",
        "type": "historical-context",
        "toRoomId": "three-theatre-cities"
      }
    ],
    "compareWith": {
      "swan-lake-theme": [
        "saint-saens-the-swan"
      ],
      "tchaikovsky-sugar-plum-fairy": [
        "saint-saens-aquarium"
      ],
      "tchaikovsky-waltz-flowers": [
        "strauss-blue-danube"
      ],
      "tchaikovsky-nutcracker-march": [
        "when-saints-go-marching"
      ],
      "tchaikovsky-trepak": [
        "kalinka"
      ],
      "tchaikovsky-piano-concerto-1-opening": [
        "mendelssohn-violin-concerto-opening"
      ]
    }
  },
  {
    "id": "when-music-storybook",
    "number": 20,
    "wingId": "the-romantic-century",
    "title": "When Music Becomes a Storybook",
    "subtitle": "Animals, morning, caves, dance, and the uncanny appear through musical character.",
    "openingQuestion": "Can music suggest a creature or scene without copying its literal sound?",
    "thesis": "Programmatic and character music can invite images through motion, register, rhythm, texture, and orchestral colour. The picture is guided but never the only correct response.",
    "era": "Mid- to late-nineteenth century",
    "keyVocabulary": [
      "programme music",
      "character",
      "register",
      "acceleration",
      "suite"
    ],
    "pieceIds": [
      "saint-saens-the-swan",
      "saint-saens-aquarium",
      "saint-saens-danse-macabre",
      "grieg-morning-mood",
      "grieg-mountain-king",
      "grieg-anitras-dance"
    ],
    "composers": [
      "saint-saens",
      "grieg"
    ],
    "traditions": [],
    "connections": [
      {
        "label": "Vivaldi and Handel used earlier forms to suggest scene or occasion; this room uses nineteenth-century programme and character worlds.",
        "type": "musical-comparison",
        "toRoomId": "baroque-stage-seasons-water-fireworks"
      },
      {
        "label": "The living books lead into pictures at an exhibition, legends, orchestral colour, and Russian composer networks.",
        "type": "storybook-sequence",
        "toRoomId": "pictures-legends-russian-colour"
      },
      {
        "label": "Schumann's character miniatures make small private pictures; these works build larger public or orchestral scenes.",
        "type": "musical-comparison",
        "toRoomId": "piano-diary"
      }
    ],
    "compareWith": {
      "saint-saens-the-swan": [
        "swan-lake-theme"
      ],
      "saint-saens-aquarium": [
        "schubert-die-forelle"
      ],
      "saint-saens-danse-macabre": [
        "mussorgsky-night-bald-mountain"
      ],
      "grieg-morning-mood": [
        "vivaldi-spring-1"
      ],
      "grieg-mountain-king": [
        "symphony-5-opening"
      ],
      "grieg-anitras-dance": [
        "tchaikovsky-sugar-plum-fairy"
      ]
    }
  },
  {
    "id": "pictures-legends-russian-colour",
    "number": 21,
    "wingId": "the-romantic-century",
    "title": "Pictures, Legends, and Russian Colour",
    "subtitle": "A walk through images becomes chicks, night, a bee, and a ship at sea.",
    "openingQuestion": "How do composers turn pictures, legends, and fast motion into musical structure?",
    "thesis": "Mussorgsky and Rimsky-Korsakov provide different paths through nineteenth-century Russian art music: one through gallery pictures and stark character, another through orchestral colour, legend, and virtuoso motion.",
    "era": "Late nineteenth century",
    "keyVocabulary": [
      "promenade",
      "exhibition",
      "orchestral colour",
      "legend",
      "composer network"
    ],
    "pieceIds": [
      "mussorgsky-promenade",
      "mussorgsky-unhatched-chicks",
      "mussorgsky-night-bald-mountain",
      "rimsky-flight-bumblebee",
      "rimsky-scheherazade-opening"
    ],
    "composers": [
      "mussorgsky",
      "rimsky-korsakov"
    ],
    "traditions": [],
    "connections": [
      {
        "label": "Rimsky-Korsakov became friendly with Tchaikovsky and exchanged letters, while belonging to a different composer network and aesthetic context.",
        "type": "direct-documented-relationship",
        "toRoomId": "ballet-kingdom"
      },
      {
        "label": "Both rooms turn images and stories into listening cues, but through different cycles, genres, and orchestral identities.",
        "type": "musical-comparison",
        "toRoomId": "when-music-storybook"
      },
      {
        "label": "The route now leaves the Russian gallery for public theatre cities, dance halls, and overture stages.",
        "type": "storybook-sequence",
        "toRoomId": "three-theatre-cities"
      }
    ],
    "compareWith": {
      "mussorgsky-promenade": [
        "bach-cello-suite-1-prelude"
      ],
      "mussorgsky-unhatched-chicks": [
        "saint-saens-the-swan"
      ],
      "mussorgsky-night-bald-mountain": [
        "saint-saens-danse-macabre"
      ],
      "rimsky-flight-bumblebee": [
        "chopin-fantaisie-impromptu"
      ],
      "rimsky-scheherazade-opening": [
        "misirlou"
      ]
    }
  },
  {
    "id": "three-theatre-cities",
    "number": 22,
    "wingId": "cities-colour-new-pulse",
    "title": "Three Theatre Cities",
    "subtitle": "Vienna dances, Paris stages drama, and Italian opera races toward the curtain.",
    "openingQuestion": "How does a city's theatre, dance floor, audience, and publishing world shape what music is written to do?",
    "thesis": "Late eighteenth- and nineteenth-century public music differs by genre and setting: ballroom dance, opera character, overture, and finale organise attention in different ways. Cities are contexts, not sound stereotypes.",
    "era": "Late eighteenth through nineteenth century",
    "keyVocabulary": [
      "waltz",
      "polka",
      "opera",
      "overture",
      "theatre city"
    ],
    "pieceIds": [
      "strauss-blue-danube",
      "strauss-tritsch-tratsch-polka",
      "bizet-habanera",
      "bizet-toreador-song",
      "rossini-william-tell-finale",
      "rossini-barber-seville-overture"
    ],
    "composers": [
      "strauss",
      "bizet",
      "rossini"
    ],
    "traditions": [],
    "connections": [
      {
        "label": "The early movement room taught pulse and participation; here social dance and theatre genres become more specialised.",
        "type": "musical-comparison",
        "toRoomId": "steps-beats-marches"
      },
      {
        "label": "Ballet, opera, overture, and ballroom music share theatre ecosystems but organise movement and story differently.",
        "type": "historical-context",
        "toRoomId": "ballet-kingdom"
      },
      {
        "label": "The public theatre turns into a quieter Paris room where sonority, space, and atmosphere become central.",
        "type": "storybook-sequence",
        "toRoomId": "painting-with-sound"
      }
    ],
    "compareWith": {
      "strauss-blue-danube": [
        "tchaikovsky-waltz-flowers"
      ],
      "strauss-tritsch-tratsch-polka": [
        "deck-the-hall"
      ],
      "bizet-habanera": [
        "la-bamba"
      ],
      "bizet-toreador-song": [
        "when-saints-go-marching"
      ],
      "rossini-william-tell-finale": [
        "grieg-mountain-king"
      ],
      "rossini-barber-seville-overture": [
        "handel-royal-fireworks-rejouissance"
      ]
    }
  },
  {
    "id": "painting-with-sound",
    "number": 23,
    "wingId": "cities-colour-new-pulse",
    "title": "Painting with Sound",
    "subtitle": "Moonlight, curves, empty space, and small gestures reshape the listening room.",
    "openingQuestion": "What happens when colour, spacing, resonance, and atmosphere matter as much as a singable tune?",
    "thesis": "Debussy and Satie offer different Paris-centred alternatives to late Romantic density: one often explores colour and flowing sonority, while the other can use sparseness, repetition, and restraint. They should not be collapsed into one Impressionist label.",
    "era": "Late nineteenth to early twentieth century",
    "keyVocabulary": [
      "sonority",
      "resonance",
      "texture",
      "space",
      "atmosphere"
    ],
    "pieceIds": [
      "debussy-clair-de-lune",
      "debussy-arabesque-1",
      "debussy-little-shepherd",
      "satie-gymnopedie-1"
    ],
    "composers": [
      "debussy",
      "satie"
    ],
    "traditions": [],
    "connections": [
      {
        "label": "Both rooms use piano miniatures, but this room foregrounds sonority, space, and turn-of-century experimentation.",
        "type": "musical-comparison",
        "toRoomId": "piano-diary"
      },
      {
        "label": "Garden and atmosphere imagery can invite comparison, but no claim of cultural influence is made without evidence.",
        "type": "musical-comparison",
        "toRoomId": "gardens-season-memory"
      },
      {
        "label": "The final room keeps the same broad period but moves to Missouri ragtime and a British orchestral planet cycle to prove that one era contains many modernities.",
        "type": "storybook-sequence",
        "toRoomId": "new-century-many-sounds"
      }
    ],
    "compareWith": {
      "debussy-clair-de-lune": [
        "moonlight-sonata"
      ],
      "debussy-arabesque-1": [
        "bach-cello-suite-1-prelude"
      ],
      "debussy-little-shepherd": [
        "grieg-morning-mood"
      ],
      "satie-gymnopedie-1": [
        "bach-prelude-c-major-bwv-846"
      ]
    }
  },
  {
    "id": "new-century-many-sounds",
    "number": 24,
    "wingId": "cities-colour-new-pulse",
    "title": "A New Century, More Than One New Sound",
    "subtitle": "Missouri syncopation and British orchestral planets share a timeline but not one style.",
    "openingQuestion": "If two composers live in the same broad era, why can their music sound as if it comes from different worlds?",
    "thesis": "Time alone does not determine style. Place, community, instrument, venue, publishing, race, class, artistic purpose, and genre all shape musical possibilities. Joplin and Holst make the final contrast explicit.",
    "era": "Late nineteenth to early twentieth century",
    "keyVocabulary": [
      "ragtime",
      "syncopation",
      "steady bass",
      "orchestral suite",
      "multiple modernities"
    ],
    "pieceIds": [
      "joplin-entertainer",
      "joplin-maple-leaf-rag",
      "holst-jupiter",
      "holst-mars"
    ],
    "composers": [
      "joplin",
      "holst"
    ],
    "traditions": [],
    "connections": [
      {
        "label": "Debussy, Satie, Joplin, and Holst overlap in time while pursuing very different sound worlds.",
        "type": "historical-context",
        "toRoomId": "painting-with-sound"
      },
      {
        "label": "The earliest beat room becomes richer: ragtime shifts accents over steady bass, while Mars uses an insistent asymmetrical character.",
        "type": "musical-comparison",
        "toRoomId": "steps-beats-marches"
      },
      {
        "label": "The final map loops back to the first question: recognise a shape, then ask when, where, who, why, and what it connects to.",
        "type": "storybook-sequence",
        "toRoomId": "melody-detective-workshop"
      }
    ],
    "compareWith": {
      "joplin-entertainer": [
        "joplin-maple-leaf-rag"
      ],
      "joplin-maple-leaf-rag": [
        "joplin-entertainer"
      ],
      "holst-jupiter": [
        "ode-to-joy"
      ],
      "holst-mars": [
        "vivaldi-summer-storm"
      ]
    }
  }
];

export const PIECE_ROOMS = {
  "bach-prelude-c-major-bwv-846": {
    "homeRoomId": "baroque-pattern-workshop",
    "roomIds": [
      "baroque-pattern-workshop"
    ]
  },
  "bach-air-orchestral-suite-3": {
    "homeRoomId": "baroque-pattern-workshop",
    "roomIds": [
      "baroque-pattern-workshop"
    ]
  },
  "bach-jesu-joy": {
    "homeRoomId": "baroque-pattern-workshop",
    "roomIds": [
      "baroque-pattern-workshop"
    ]
  },
  "bach-cello-suite-1-prelude": {
    "homeRoomId": "baroque-pattern-workshop",
    "roomIds": [
      "baroque-pattern-workshop"
    ]
  },
  "vivaldi-spring-1": {
    "homeRoomId": "baroque-stage-seasons-water-fireworks",
    "roomIds": [
      "baroque-stage-seasons-water-fireworks"
    ]
  },
  "vivaldi-summer-storm": {
    "homeRoomId": "baroque-stage-seasons-water-fireworks",
    "roomIds": [
      "baroque-stage-seasons-water-fireworks"
    ]
  },
  "vivaldi-winter-1": {
    "homeRoomId": "baroque-stage-seasons-water-fireworks",
    "roomIds": [
      "baroque-stage-seasons-water-fireworks"
    ]
  },
  "handel-hallelujah-chorus": {
    "homeRoomId": "baroque-stage-seasons-water-fireworks",
    "roomIds": [
      "baroque-stage-seasons-water-fireworks"
    ]
  },
  "handel-water-music-hornpipe": {
    "homeRoomId": "baroque-stage-seasons-water-fireworks",
    "roomIds": [
      "baroque-stage-seasons-water-fireworks"
    ]
  },
  "handel-royal-fireworks-rejouissance": {
    "homeRoomId": "baroque-stage-seasons-water-fireworks",
    "roomIds": [
      "baroque-stage-seasons-water-fireworks"
    ]
  },
  "pachelbel-canon-d": {
    "homeRoomId": "baroque-pattern-workshop",
    "roomIds": [
      "baroque-pattern-workshop"
    ]
  },
  "haydn-surprise-symphony-94-2": {
    "homeRoomId": "vienna-classical-city",
    "roomIds": [
      "vienna-classical-city"
    ]
  },
  "haydn-trumpet-concerto-3": {
    "homeRoomId": "vienna-classical-city",
    "roomIds": [
      "vienna-classical-city"
    ]
  },
  "mozart-eine-kleine-nachtmusik-1": {
    "homeRoomId": "vienna-classical-city",
    "roomIds": [
      "vienna-classical-city"
    ]
  },
  "mozart-rondo-alla-turca": {
    "homeRoomId": "vienna-classical-city",
    "roomIds": [
      "vienna-classical-city"
    ]
  },
  "mozart-symphony-40-1": {
    "homeRoomId": "vienna-classical-city",
    "roomIds": [
      "vienna-classical-city"
    ]
  },
  "mozart-piano-sonata-k545-1": {
    "homeRoomId": "vienna-classical-city",
    "roomIds": [
      "vienna-classical-city"
    ]
  },
  "mozart-ah-vous-dirai-je-variations": {
    "homeRoomId": "vienna-classical-city",
    "roomIds": [
      "vienna-classical-city"
    ]
  },
  "fur-elise": {
    "homeRoomId": "beethoven-door-two-eras",
    "roomIds": [
      "beethoven-door-two-eras"
    ]
  },
  "symphony-5-opening": {
    "homeRoomId": "beethoven-door-two-eras",
    "roomIds": [
      "beethoven-door-two-eras"
    ]
  },
  "ode-to-joy": {
    "homeRoomId": "beethoven-door-two-eras",
    "roomIds": [
      "beethoven-door-two-eras"
    ]
  },
  "moonlight-sonata": {
    "homeRoomId": "beethoven-door-two-eras",
    "roomIds": [
      "beethoven-door-two-eras"
    ]
  },
  "beethoven-symphony-7-2": {
    "homeRoomId": "beethoven-door-two-eras",
    "roomIds": [
      "beethoven-door-two-eras"
    ]
  },
  "schubert-ave-maria": {
    "homeRoomId": "music-learns-to-sing",
    "roomIds": [
      "music-learns-to-sing"
    ]
  },
  "schubert-die-forelle": {
    "homeRoomId": "music-learns-to-sing",
    "roomIds": [
      "music-learns-to-sing"
    ]
  },
  "mendelssohn-wedding-march": {
    "homeRoomId": "music-learns-to-sing",
    "roomIds": [
      "music-learns-to-sing"
    ]
  },
  "mendelssohn-spring-song": {
    "homeRoomId": "music-learns-to-sing",
    "roomIds": [
      "music-learns-to-sing"
    ]
  },
  "mendelssohn-violin-concerto-opening": {
    "homeRoomId": "music-learns-to-sing",
    "roomIds": [
      "music-learns-to-sing"
    ]
  },
  "chopin-nocturne-op9-no2": {
    "homeRoomId": "piano-diary",
    "roomIds": [
      "piano-diary"
    ]
  },
  "chopin-minute-waltz": {
    "homeRoomId": "piano-diary",
    "roomIds": [
      "piano-diary"
    ]
  },
  "chopin-raindrop-prelude": {
    "homeRoomId": "piano-diary",
    "roomIds": [
      "piano-diary"
    ]
  },
  "chopin-fantaisie-impromptu": {
    "homeRoomId": "piano-diary",
    "roomIds": [
      "piano-diary"
    ]
  },
  "schumann-traumerei": {
    "homeRoomId": "piano-diary",
    "roomIds": [
      "piano-diary"
    ]
  },
  "schumann-happy-farmer": {
    "homeRoomId": "piano-diary",
    "roomIds": [
      "piano-diary"
    ]
  },
  "schumann-foreign-lands-people": {
    "homeRoomId": "piano-diary",
    "roomIds": [
      "piano-diary"
    ]
  },
  "brahms-lullaby": {
    "homeRoomId": "home-memory-dance",
    "roomIds": [
      "home-memory-dance"
    ]
  },
  "brahms-hungarian-dance-5": {
    "homeRoomId": "home-memory-dance",
    "roomIds": [
      "home-memory-dance"
    ]
  },
  "brahms-waltz-op39-no15": {
    "homeRoomId": "home-memory-dance",
    "roomIds": [
      "home-memory-dance"
    ]
  },
  "swan-lake-theme": {
    "homeRoomId": "ballet-kingdom",
    "roomIds": [
      "ballet-kingdom"
    ]
  },
  "tchaikovsky-sugar-plum-fairy": {
    "homeRoomId": "ballet-kingdom",
    "roomIds": [
      "ballet-kingdom"
    ]
  },
  "tchaikovsky-waltz-flowers": {
    "homeRoomId": "ballet-kingdom",
    "roomIds": [
      "ballet-kingdom"
    ]
  },
  "tchaikovsky-nutcracker-march": {
    "homeRoomId": "ballet-kingdom",
    "roomIds": [
      "ballet-kingdom"
    ]
  },
  "tchaikovsky-trepak": {
    "homeRoomId": "ballet-kingdom",
    "roomIds": [
      "ballet-kingdom"
    ]
  },
  "tchaikovsky-piano-concerto-1-opening": {
    "homeRoomId": "ballet-kingdom",
    "roomIds": [
      "ballet-kingdom"
    ]
  },
  "saint-saens-the-swan": {
    "homeRoomId": "when-music-storybook",
    "roomIds": [
      "when-music-storybook"
    ]
  },
  "saint-saens-aquarium": {
    "homeRoomId": "when-music-storybook",
    "roomIds": [
      "when-music-storybook"
    ]
  },
  "saint-saens-danse-macabre": {
    "homeRoomId": "when-music-storybook",
    "roomIds": [
      "when-music-storybook"
    ]
  },
  "grieg-morning-mood": {
    "homeRoomId": "when-music-storybook",
    "roomIds": [
      "when-music-storybook"
    ]
  },
  "grieg-mountain-king": {
    "homeRoomId": "when-music-storybook",
    "roomIds": [
      "when-music-storybook"
    ]
  },
  "grieg-anitras-dance": {
    "homeRoomId": "when-music-storybook",
    "roomIds": [
      "when-music-storybook"
    ]
  },
  "dvorak-new-world-largo": {
    "homeRoomId": "home-memory-dance",
    "roomIds": [
      "home-memory-dance"
    ]
  },
  "dvorak-humoresque-7": {
    "homeRoomId": "home-memory-dance",
    "roomIds": [
      "home-memory-dance"
    ]
  },
  "dvorak-slavonic-dance-8": {
    "homeRoomId": "home-memory-dance",
    "roomIds": [
      "home-memory-dance"
    ]
  },
  "mussorgsky-promenade": {
    "homeRoomId": "pictures-legends-russian-colour",
    "roomIds": [
      "pictures-legends-russian-colour"
    ]
  },
  "mussorgsky-unhatched-chicks": {
    "homeRoomId": "pictures-legends-russian-colour",
    "roomIds": [
      "pictures-legends-russian-colour"
    ]
  },
  "mussorgsky-night-bald-mountain": {
    "homeRoomId": "pictures-legends-russian-colour",
    "roomIds": [
      "pictures-legends-russian-colour"
    ]
  },
  "rimsky-flight-bumblebee": {
    "homeRoomId": "pictures-legends-russian-colour",
    "roomIds": [
      "pictures-legends-russian-colour"
    ]
  },
  "rimsky-scheherazade-opening": {
    "homeRoomId": "pictures-legends-russian-colour",
    "roomIds": [
      "pictures-legends-russian-colour"
    ]
  },
  "strauss-blue-danube": {
    "homeRoomId": "three-theatre-cities",
    "roomIds": [
      "three-theatre-cities"
    ]
  },
  "strauss-tritsch-tratsch-polka": {
    "homeRoomId": "three-theatre-cities",
    "roomIds": [
      "three-theatre-cities"
    ]
  },
  "bizet-habanera": {
    "homeRoomId": "three-theatre-cities",
    "roomIds": [
      "three-theatre-cities"
    ]
  },
  "bizet-toreador-song": {
    "homeRoomId": "three-theatre-cities",
    "roomIds": [
      "three-theatre-cities"
    ]
  },
  "rossini-william-tell-finale": {
    "homeRoomId": "three-theatre-cities",
    "roomIds": [
      "three-theatre-cities"
    ]
  },
  "rossini-barber-seville-overture": {
    "homeRoomId": "three-theatre-cities",
    "roomIds": [
      "three-theatre-cities"
    ]
  },
  "debussy-clair-de-lune": {
    "homeRoomId": "painting-with-sound",
    "roomIds": [
      "painting-with-sound"
    ]
  },
  "debussy-arabesque-1": {
    "homeRoomId": "painting-with-sound",
    "roomIds": [
      "painting-with-sound"
    ]
  },
  "debussy-little-shepherd": {
    "homeRoomId": "painting-with-sound",
    "roomIds": [
      "painting-with-sound"
    ]
  },
  "satie-gymnopedie-1": {
    "homeRoomId": "painting-with-sound",
    "roomIds": [
      "painting-with-sound"
    ]
  },
  "joplin-entertainer": {
    "homeRoomId": "new-century-many-sounds",
    "roomIds": [
      "new-century-many-sounds"
    ]
  },
  "joplin-maple-leaf-rag": {
    "homeRoomId": "new-century-many-sounds",
    "roomIds": [
      "new-century-many-sounds"
    ]
  },
  "holst-jupiter": {
    "homeRoomId": "new-century-many-sounds",
    "roomIds": [
      "new-century-many-sounds"
    ]
  },
  "holst-mars": {
    "homeRoomId": "new-century-many-sounds",
    "roomIds": [
      "new-century-many-sounds"
    ]
  },
  "twinkle": {
    "homeRoomId": "melody-detective-workshop",
    "roomIds": [
      "melody-detective-workshop"
    ]
  },
  "mary-had-little-lamb": {
    "homeRoomId": "steps-beats-marches",
    "roomIds": [
      "steps-beats-marches"
    ]
  },
  "frere-jacques": {
    "homeRoomId": "melody-detective-workshop",
    "roomIds": [
      "melody-detective-workshop"
    ]
  },
  "row-row-row-your-boat": {
    "homeRoomId": "playground-of-patterns",
    "roomIds": [
      "playground-of-patterns"
    ]
  },
  "old-macdonald": {
    "homeRoomId": "playground-of-patterns",
    "roomIds": [
      "playground-of-patterns"
    ]
  },
  "bingo": {
    "homeRoomId": "playground-of-patterns",
    "roomIds": [
      "playground-of-patterns"
    ]
  },
  "london-bridge": {
    "homeRoomId": "melody-detective-workshop",
    "roomIds": [
      "melody-detective-workshop"
    ]
  },
  "pop-goes-weasel": {
    "homeRoomId": "melody-detective-workshop",
    "roomIds": [
      "melody-detective-workshop"
    ]
  },
  "three-blind-mice": {
    "homeRoomId": "melody-detective-workshop",
    "roomIds": [
      "melody-detective-workshop"
    ]
  },
  "hot-cross-buns": {
    "homeRoomId": "steps-beats-marches",
    "roomIds": [
      "steps-beats-marches"
    ]
  },
  "this-old-man": {
    "homeRoomId": "steps-beats-marches",
    "roomIds": [
      "steps-beats-marches"
    ]
  },
  "farmer-in-dell": {
    "homeRoomId": "playground-of-patterns",
    "roomIds": [
      "playground-of-patterns"
    ]
  },
  "mulberry-bush": {
    "homeRoomId": "playground-of-patterns",
    "roomIds": [
      "playground-of-patterns"
    ]
  },
  "rock-a-bye-baby": {
    "homeRoomId": "home-distance-belonging",
    "roomIds": [
      "home-distance-belonging"
    ]
  },
  "skip-to-my-lou": {
    "homeRoomId": "steps-beats-marches",
    "roomIds": [
      "steps-beats-marches"
    ]
  },
  "amazing-grace-new-britain": {
    "homeRoomId": "home-distance-belonging",
    "roomIds": [
      "home-distance-belonging"
    ]
  },
  "when-saints-go-marching": {
    "homeRoomId": "steps-beats-marches",
    "roomIds": [
      "steps-beats-marches"
    ]
  },
  "simple-gifts": {
    "homeRoomId": "home-distance-belonging",
    "roomIds": [
      "home-distance-belonging"
    ]
  },
  "my-bonnie": {
    "homeRoomId": "home-distance-belonging",
    "roomIds": [
      "home-distance-belonging"
    ]
  },
  "home-on-range": {
    "homeRoomId": "home-distance-belonging",
    "roomIds": [
      "home-distance-belonging"
    ]
  },
  "sakura-sakura": {
    "homeRoomId": "gardens-season-memory",
    "roomIds": [
      "gardens-season-memory"
    ]
  },
  "arirang": {
    "homeRoomId": "gardens-season-memory",
    "roomIds": [
      "gardens-season-memory"
    ]
  },
  "mo-li-hua": {
    "homeRoomId": "gardens-season-memory",
    "roomIds": [
      "gardens-season-memory"
    ]
  },
  "rasa-sayang": {
    "homeRoomId": "southeast-asian-courtyard",
    "roomIds": [
      "southeast-asian-courtyard"
    ]
  },
  "burung-kakak-tua": {
    "homeRoomId": "southeast-asian-courtyard",
    "roomIds": [
      "southeast-asian-courtyard"
    ]
  },
  "leron-leron-sinta": {
    "homeRoomId": "southeast-asian-courtyard",
    "roomIds": [
      "southeast-asian-courtyard"
    ]
  },
  "lao-duang-duen": {
    "homeRoomId": "southeast-asian-courtyard",
    "roomIds": [
      "southeast-asian-courtyard"
    ]
  },
  "raghupati-raghava": {
    "homeRoomId": "roads-prayer-city-sea",
    "roomIds": [
      "roads-prayer-city-sea"
    ]
  },
  "uskudara-gider-iken": {
    "homeRoomId": "roads-prayer-city-sea",
    "roomIds": [
      "roads-prayer-city-sea"
    ]
  },
  "hava-nagila": {
    "homeRoomId": "songs-that-transform",
    "roomIds": [
      "songs-that-transform"
    ]
  },
  "kalinka": {
    "homeRoomId": "songs-that-transform",
    "roomIds": [
      "songs-that-transform"
    ]
  },
  "shchedryk": {
    "homeRoomId": "songs-that-transform",
    "roomIds": [
      "songs-that-transform"
    ]
  },
  "nkosi-sikelel-iafrika": {
    "homeRoomId": "when-song-means-home",
    "roomIds": [
      "when-song-means-home"
    ]
  },
  "misirlou": {
    "homeRoomId": "roads-prayer-city-sea",
    "roomIds": [
      "roads-prayer-city-sea"
    ]
  },
  "waltzing-matilda": {
    "homeRoomId": "when-song-means-home",
    "roomIds": [
      "when-song-means-home"
    ]
  },
  "el-condor-pasa": {
    "homeRoomId": "when-song-means-home",
    "roomIds": [
      "when-song-means-home"
    ]
  },
  "la-bamba": {
    "homeRoomId": "when-song-means-home",
    "roomIds": [
      "when-song-means-home"
    ]
  },
  "greensleeves": {
    "homeRoomId": "songs-that-transform",
    "roomIds": [
      "songs-that-transform"
    ]
  },
  "happy-birthday": {
    "homeRoomId": "celebration-square",
    "roomIds": [
      "celebration-square"
    ]
  },
  "jolly-good-fellow": {
    "homeRoomId": "celebration-square",
    "roomIds": [
      "celebration-square"
    ]
  },
  "jingle-bells": {
    "homeRoomId": "celebration-square",
    "roomIds": [
      "celebration-square"
    ]
  },
  "silent-night": {
    "homeRoomId": "winter-lanterns",
    "roomIds": [
      "winter-lanterns"
    ]
  },
  "o-tannenbaum": {
    "homeRoomId": "winter-lanterns",
    "roomIds": [
      "winter-lanterns"
    ]
  },
  "deck-the-hall": {
    "homeRoomId": "winter-lanterns",
    "roomIds": [
      "winter-lanterns"
    ]
  },
  "we-wish-merry-christmas": {
    "homeRoomId": "winter-lanterns",
    "roomIds": [
      "winter-lanterns"
    ]
  },
  "first-noel": {
    "homeRoomId": "winter-lanterns",
    "roomIds": [
      "winter-lanterns"
    ]
  },
  "joy-to-world": {
    "homeRoomId": "celebration-square",
    "roomIds": [
      "celebration-square"
    ]
  },
  "auld-lang-syne": {
    "homeRoomId": "celebration-square",
    "roomIds": [
      "celebration-square"
    ]
  }
};
