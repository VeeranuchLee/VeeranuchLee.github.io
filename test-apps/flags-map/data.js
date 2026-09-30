// flags-app/data.js — the country dataset and every spoken line.
//
// This file is the app's single source of truth for content, the way
// solar-system-game's app.js is for its words. tools/check-data.mjs asserts
// the invariants below, and scripts/preflight.sh runs it on every commit:
//
//   - every country has its assets/flags/<code>.svg file
//   - 3-5 facts per country, each with its own source (a fact without a
//     source cannot be published — "verified before it teaches")
//   - unique codes, names, fact ids and line ids
//   - confusable groups contain only known codes
//
// Facts are deliberately qualitative where numbers drift with time. Sources
// are named (title + topic), not deep-linked, so they stay checkable after
// page moves. qc/facts-audit.csv carries the independent reader QA pass and
// the owner's adjudication column.

var FLAGS_DATA = (function () {
  'use strict';

  // Confusable families: flags that look alike at a glance. Stage 1-2
  // distractor picking never puts a confusable partner next to the target —
  // teaching the distinction is the later "similar-looking flags" stage,
  // where these groups become the lesson instead of a trap.
  var CONFUSABLE = [
    ['id', 'pl'],     // red-over-white vs white-over-red (inverse stripes)
    ['au', 'nz'],     // Southern Cross family with a Union Jack canton
    ['it', 'ie', 'mx'], // vertical tricolours (mx adds the eagle)
    ['dk', 'se'],     // Nordic cross layout
    ['fr', 'nl'],     // same three colours, vertical vs horizontal
    ['vn', 'cn'],     // red field with yellow star(s)
    ['my', 'us'],     // stripes plus a canton
    // 2026-09-30 additions: pairs among the 30 new countries and the old ones
    // that a young child could mix up. The 30 were chosen to be distinct, so
    // these are the closest remaining resemblances, kept out of the same
    // question rather than treated as identical.
    ['at', 'pl', 'id'], // horizontal red and white bands
    ['bd', 'jp'],       // one red disc
    ['ma', 'vn', 'cn'], // red field with a single star
    ['co', 'ua'],       // yellow and blue bands
    ['lt', 'et'],       // yellow, green and red bands
    ['cu', 'pa'],       // blue and red with a white star
    ['to', 'ch']        // red with a white cross
  ];

  var COUNTRIES = [
    // ---- Southeast Asia (the children's home region) ----
    {
      code: 'th', name: 'Thailand', region: 'Southeast Asia', capital: 'Bangkok',
      lookFor: 'the thick blue stripe in the middle',
      facts: [
        { id: 'th-f1', text: 'Thailand\u2019s flag used to show a white elephant, the king\u2019s special animal.', src: 'Britannica, flag of Thailand' },
        { id: 'th-f2', text: 'No European country ever ruled Thailand \u2014 it kept its freedom while its neighbours were colonised.', src: 'Britannica, Thailand' },
        { id: 'th-f3', text: 'In Thailand, cars drive on the left side of the road.', src: 'CIA World Factbook, Thailand \u2014 Roadways' },
        { id: 'th-f4', text: 'Bangkok, the capital, has one of the longest official city names in the whole world.', src: 'Britannica, Bangkok' }
      ]
    },
    {
      code: 'vn', name: 'Vietnam', region: 'Southeast Asia', capital: 'Hanoi',
      lookFor: 'the big yellow star on red',
      facts: [
        { id: 'vn-f1', text: 'Vietnam is a long, narrow country shaped like the letter S.', src: 'Britannica, Vietnam' },
        { id: 'vn-f2', text: 'Vietnam grows more coffee than almost any other country \u2014 only Brazil grows more.', src: 'Britannica, Vietnam \u2014 Agriculture' },
        { id: 'vn-f3', text: 'Vietnam has a bay where more than a thousand tall islands rise straight out of the green water.', src: 'Britannica, Ha Long Bay' },
        { id: 'vn-f4', text: 'In Vietnam, puppets dance on top of the water in a puppet show that is hundreds of years old.', src: 'Wikipedia, Water puppetry' }
      ]
    },
    {
      code: 'la', name: 'Laos', region: 'Southeast Asia', capital: 'Vientiane',
      lookFor: 'the white circle in the middle',
      facts: [
        { id: 'la-f1', text: 'Laos is the only country in Southeast Asia with no sea coast at all.', src: 'Britannica, Laos' },
        { id: 'la-f2', text: 'Laos was once called the Land of a Million Elephants.', src: 'Britannica, Laos \u2014 Lan Xang kingdom' },
        { id: 'la-f3', text: 'The white circle on the flag stands for a bright future for Laos.', src: 'Britannica, flag of Laos' },
        { id: 'la-f4', text: 'The Mekong, one of the longest rivers in the world, flows all the way through Laos.', src: 'Britannica, Mekong River' }
      ]
    },
    {
      code: 'kh', name: 'Cambodia', region: 'Southeast Asia', capital: 'Phnom Penh',
      lookFor: 'the white temple in the middle',
      facts: [
        { id: 'kh-f1', text: 'Cambodia\u2019s flag shows Angkor Wat, a giant temple built 900 years ago.', src: 'Britannica, Angkor Wat' },
        { id: 'kh-f2', text: 'Angkor Wat is the largest religious monument in the world.', src: 'Britannica, Angkor Wat' },
        { id: 'kh-f3', text: 'Cambodia has a huge lake called Tonle Sap that grows much bigger every rainy season.', src: 'Britannica, Tonle Sap' },
        { id: 'kh-f4', text: 'Every year Cambodians celebrate a water festival with big boat races on the river.', src: 'Wikipedia, Bon Om Touk' }
      ]
    },
    {
      code: 'my', name: 'Malaysia', region: 'Southeast Asia', capital: 'Kuala Lumpur',
      lookFor: 'the moon and star on blue, beside the stripes',
      facts: [
        { id: 'my-f1', text: 'Malaysia\u2019s flag has 14 stripes \u2014 one for each state and one for the capital area.', src: 'Britannica, flag of Malaysia' },
        { id: 'my-f2', text: 'Malaysia is made of two pieces of land, separated by a big sea.', src: 'Britannica, Malaysia' },
        { id: 'my-f3', text: 'Part of Borneo, one of the biggest islands in the world, belongs to Malaysia.', src: 'Britannica, Borneo' },
        { id: 'my-f4', text: 'In Malaysia grows the Rafflesia, the biggest flower in the world \u2014 and it smells rotten!', src: 'Britannica, Rafflesia' }
      ]
    },
    {
      code: 'sg', name: 'Singapore', region: 'Southeast Asia', capital: 'Singapore',
      lookFor: 'the moon and five stars',
      facts: [
        { id: 'sg-f1', text: 'Singapore is a whole country on one small island, with many tiny islands around it.', src: 'Britannica, Singapore' },
        { id: 'sg-f2', text: 'Singapore has one of the busiest ports in the world \u2014 ships from everywhere stop there.', src: 'Britannica, Singapore \u2014 Trade' },
        { id: 'sg-f3', text: 'Singapore\u2019s airport has a waterfall inside \u2014 one of the tallest indoor waterfalls in the world!', src: 'Wikipedia, Jewel Changi Airport' },
        { id: 'sg-f4', text: 'Singapore has a zoo that opens at night, so you can see animals when they are wide awake.', src: 'Wikipedia, Night Safari, Singapore' }
      ]
    },
    {
      code: 'id', name: 'Indonesia', region: 'Southeast Asia', capital: 'Jakarta',
      lookFor: 'just two stripes \u2014 red on top of white',
      facts: [
        { id: 'id-f1', text: 'Indonesia is made of more than 17,000 islands \u2014 the biggest island country in the world.', src: 'Britannica, Indonesia' },
        { id: 'id-f2', text: 'The Komodo dragon, the biggest lizard in the world, lives only on a few islands in Indonesia.', src: 'Britannica, Komodo dragon' },
        { id: 'id-f3', text: 'Indonesia has more active volcanoes than any other country.', src: 'CIA World Factbook, Indonesia \u2014 Volcanism' },
        { id: 'id-f4', text: 'The red and white on the flag stand for courage and purity.', src: 'Britannica, flag of Indonesia' }
      ]
    },
    {
      code: 'ph', name: 'Philippines', region: 'Southeast Asia', capital: 'Manila',
      lookFor: 'the golden sun with three little stars',
      facts: [
        { id: 'ph-f1', text: 'The sun on the flag has eight rays \u2014 they remember the eight places that first rose up for freedom.', src: 'Britannica, flag of the Philippines' },
        { id: 'ph-f2', text: 'The Philippines is a country of more than 7,000 islands in the Pacific Ocean.', src: 'Britannica, Philippines' },
        { id: 'ph-f3', text: 'In the Philippines, people ride colourful buses called jeepneys, painted bright as rainbows.', src: 'Britannica, jeepney' },
        { id: 'ph-f4', text: 'In the Philippines there is an underground river you can ride a boat through, deep beneath a mountain.', src: 'UNESCO World Heritage List, Puerto-Princesa Subterranean River' }
      ]
    },

    // ---- East and South Asia ----
    {
      code: 'jp', name: 'Japan', region: 'East Asia', capital: 'Tokyo',
      lookFor: 'the big red circle \u2014 the sun',
      facts: [
        { id: 'jp-f1', text: 'Japan is made up of thousands of islands.', src: 'Britannica, Japan' },
        { id: 'jp-f2', text: 'The red circle stands for the sun \u2014 Japan is called the Land of the Rising Sun.', src: 'Britannica, flag of Japan' },
        { id: 'jp-f3', text: 'Japan\u2019s bullet trains are famous for being fast and almost always on time.', src: 'Britannica, Shinkansen' },
        { id: 'jp-f4', text: 'In Japan, snow monkeys sit in hot springs to keep warm in winter.', src: 'Britannica, Japanese macaque' },
        { id: 'jp-f5', text: 'Mount Fuji, a beautiful snow-capped volcano, is the tallest mountain in Japan.', src: 'Britannica, Mount Fuji' }
      ]
    },
    {
      code: 'cn', name: 'China', region: 'East Asia', capital: 'Beijing',
      lookFor: 'one big yellow star and four small ones',
      facts: [
        { id: 'cn-f1', text: 'The giant panda lives wild only in China \u2014 it eats bamboo nearly all day long.', src: 'Britannica, giant panda' },
        { id: 'cn-f2', text: 'The Great Wall of China is the longest wall in the world \u2014 it stretches for thousands of kilometres.', src: 'Britannica, Great Wall of China' },
        { id: 'cn-f3', text: 'More than a billion people live in China. Only India has more.', src: 'United Nations World Population Prospects' },
        { id: 'cn-f4', text: 'China\u2019s biggest holiday comes with the new moon, and every year gets an animal name \u2014 like the dragon or the tiger.', src: 'Britannica, Chinese New Year' }
      ]
    },
    {
      code: 'kr', name: 'South Korea', region: 'East Asia', capital: 'Seoul',
      lookFor: 'the red and blue swirl in the middle',
      facts: [
        { id: 'kr-f1', text: 'The blue and red halves of the swirl show opposites working together, like day and night.', src: 'Britannica, flag of South Korea' },
        { id: 'kr-f2', text: 'Koreans write with an alphabet called Hangul, invented by a king so that everyone could learn to read.', src: 'Britannica, Hangul' },
        { id: 'kr-f3', text: 'In South Korea, people eat kimchi \u2014 spicy pickled cabbage \u2014 with almost every meal.', src: 'Britannica, kimchi' },
        { id: 'kr-f4', text: 'In the strip of land between the two Koreas, where people may not build, wild animals like bears and cranes live in peace.', src: 'Britannica, Korean Demilitarized Zone' }
      ]
    },
    {
      code: 'in', name: 'India', region: 'South Asia', capital: 'New Delhi',
      lookFor: 'the blue wheel in the middle',
      facts: [
        { id: 'in-f1', text: 'The blue wheel has 24 spokes and copies a carving made more than 2,000 years ago.', src: 'Britannica, flag of India' },
        { id: 'in-f2', text: 'More people live in India than in any other country on Earth.', src: 'United Nations World Population Prospects' },
        { id: 'in-f3', text: 'The tiger is India\u2019s national animal, and most of the world\u2019s wild tigers live in India.', src: 'World Wide Fund for Nature, Tigers' },
        { id: 'in-f4', text: 'In India stands the Taj Mahal, a wonder of white marble built by an emperor in memory of his queen.', src: 'Britannica, Taj Mahal' },
        { id: 'in-f5', text: 'India grows more mangoes than any other country.', src: 'Food and Agriculture Organization, crops data' }
      ]
    },
    {
      code: 'np', name: 'Nepal', region: 'South Asia', capital: 'Kathmandu',
      lookFor: 'two triangles stacked \u2014 it is not a rectangle!',
      facts: [
        { id: 'np-f1', text: 'Nepal has the only flag in the world that is not a rectangle.', src: 'Britannica, flag of Nepal' },
        { id: 'np-f2', text: 'Mount Everest, the tallest mountain in the world, sits on the border of Nepal.', src: 'Britannica, Mount Everest' },
        { id: 'np-f3', text: 'The Buddha was born in Nepal, at a place called Lumbini.', src: 'UNESCO World Heritage List, Lumbini' },
        { id: 'np-f4', text: 'In Nepal, people greet each other with \u201cNamaste\u201d, pressing their palms together.', src: 'Britannica, Nepal' }
      ]
    },

    // ---- Australia and the Pacific ----
    {
      code: 'au', name: 'Australia', region: 'Australia and the Pacific', capital: 'Canberra',
      lookFor: 'the stars on blue \u2014 one big, five little in a cross',
      facts: [
        { id: 'au-f1', text: 'Australia\u2019s capital is not Sydney or Melbourne \u2014 it is Canberra, a city built just to be the capital.', src: 'Britannica, Canberra' },
        { id: 'au-f2', text: 'The five little stars make the Southern Cross, a shape best seen from the southern half of the world.', src: 'Britannica, Southern Cross' },
        { id: 'au-f3', text: 'Kangaroos carry their babies in a front pocket called a pouch.', src: 'Britannica, kangaroo' },
        { id: 'au-f4', text: 'Australia is the only country that is also its own continent.', src: 'Britannica, Australia' },
        { id: 'au-f5', text: 'Off Australia\u2019s coast lies the Great Barrier Reef, the biggest coral reef in the world \u2014 so big it can be seen from space.', src: 'Britannica, Great Barrier Reef' }
      ]
    },
    {
      code: 'nz', name: 'New Zealand', region: 'Australia and the Pacific', capital: 'Wellington',
      lookFor: 'four red stars on blue \u2014 no big star',
      facts: [
        { id: 'nz-f1', text: 'New Zealand was the first country in the world where women could vote in elections.', src: 'Britannica, New Zealand \u2014 Woman suffrage' },
        { id: 'nz-f2', text: 'The kiwi, a round bird that cannot fly, gives its name to the people \u2014 New Zealanders call themselves Kiwis!', src: 'Britannica, kiwi' },
        { id: 'nz-f3', text: 'New Zealand has several times more sheep than people.', src: 'Statistics New Zealand, agricultural production' },
        { id: 'nz-f4', text: 'In some New Zealand caves, glow-worms light up the dark ceiling like tiny blue stars.', src: 'Britannica, glow-worm' }
      ]
    },

    // ---- Europe ----
    {
      code: 'gb', name: 'United Kingdom', region: 'Europe', capital: 'London',
      lookFor: 'three crosses stacked on top of each other \u2014 red, white and blue',
      facts: [
        { id: 'gb-f1', text: 'The UK flag is three flags in one \u2014 the crosses of England, Scotland and Northern Ireland layered together.', src: 'Britannica, Union Jack' },
        { id: 'gb-f2', text: 'The United Kingdom is four countries in one: England, Scotland, Wales and Northern Ireland.', src: 'Britannica, United Kingdom' },
        { id: 'gb-f3', text: 'Big Ben is a giant bell that chimes the hours in a tall tower by the River Thames in London.', src: 'UK Parliament, Big Ben' },
        { id: 'gb-f4', text: 'The modern game of football, with one set of rules for everyone, began in England.', src: 'Britannica, football' }
      ]
    },
    {
      code: 'fr', name: 'France', region: 'Europe', capital: 'Paris',
      lookFor: 'three stripes going up and down \u2014 blue, white, red',
      facts: [
        { id: 'fr-f1', text: 'In Paris stands the Eiffel Tower, a tower of iron built more than 130 years ago.', src: 'Britannica, Eiffel Tower' },
        { id: 'fr-f2', text: 'The Louvre in Paris is the most visited art museum in the world.', src: 'Britannica, Louvre' },
        { id: 'fr-f3', text: 'Every summer, bicycle riders race all around France for three whole weeks in the Tour de France.', src: 'Britannica, Tour de France' },
        { id: 'fr-f4', text: 'In France there are caves where people painted horses and bulls more than 15,000 years ago.', src: 'Britannica, Lascaux' }
      ]
    },
    {
      code: 'de', name: 'Germany', region: 'Europe', capital: 'Berlin',
      lookFor: 'three stripes across \u2014 black, red and gold',
      facts: [
        { id: 'de-f1', text: 'Germany has fairy-tale castles \u2014 one of them inspired the castle in Disney\u2019s Sleeping Beauty.', src: 'Britannica, Neuschwanstein' },
        { id: 'de-f2', text: 'A wall once cut the city of Berlin in two. When it came down, people celebrated all over the world.', src: 'Britannica, Berlin Wall' },
        { id: 'de-f3', text: 'Bakeries in Germany sell more than 300 different kinds of bread.', src: 'Wikipedia, German bread culture' },
        { id: 'de-f4', text: 'The first real cars were built in Germany, more than 130 years ago.', src: 'Britannica, automobile \u2014 Karl Benz' }
      ]
    },
    {
      code: 'it', name: 'Italy', region: 'Europe', capital: 'Rome',
      lookFor: 'three stripes going up and down \u2014 green, white, red',
      facts: [
        { id: 'it-f1', text: 'Italy is shaped like a boot \u2014 and it even has a toe and a heel!', src: 'Britannica, Italy' },
        { id: 'it-f2', text: 'Near the city of Naples stands a volcano that once buried a whole town in ash.', src: 'Britannica, Mount Vesuvius' },
        { id: 'it-f3', text: 'Pizza was born in Italy \u2014 the city of Naples made it famous.', src: 'Britannica, pizza' },
        { id: 'it-f4', text: 'Inside the city of Rome there is a whole other country \u2014 Vatican City, the smallest country in the world.', src: 'Britannica, Vatican City' },
        { id: 'it-f5', text: 'The Leaning Tower of Pisa really does lean \u2014 it started tilting while it was still being built.', src: 'Britannica, Leaning Tower of Pisa' }
      ]
    },
    {
      code: 'es', name: 'Spain', region: 'Europe', capital: 'Madrid',
      lookFor: 'two red stripes hugging a fat yellow one',
      facts: [
        { id: 'es-f1', text: 'In Spain, people build human towers \u2014 teams stand on each other\u2019s shoulders, and a child climbs to the very top!', src: 'UNESCO Intangible Heritage, Human towers in Spain' },
        { id: 'es-f2', text: 'People in more than 20 countries speak Spanish \u2014 it began here, in Spain.', src: 'Britannica, Spanish language' },
        { id: 'es-f3', text: 'Spain is famous for flamenco, dancing with swirly dresses, clapping hands and stamping feet.', src: 'Britannica, flamenco' },
        { id: 'es-f4', text: 'In one Spanish town, people have a huge tomato fight every year \u2014 a festival called La Tomatina!', src: 'Wikipedia, La Tomatina' }
      ]
    },
    {
      code: 'pt', name: 'Portugal', region: 'Europe', capital: 'Lisbon',
      lookFor: 'the yellow rings in the middle, like a little ball made of hoops',
      facts: [
        { id: 'pt-f1', text: 'Portugal\u2019s flag shows an armillary sphere \u2014 an old machine for studying the stars. It honours Portugal\u2019s brave sailors of long ago.', src: 'Britannica, flag of Portugal' },
        { id: 'pt-f2', text: 'More than 500 years ago, sailors from Portugal found the sea route from Europe all the way to India.', src: 'Britannica, Vasco da Gama' },
        { id: 'pt-f3', text: 'Portugal\u2019s borders are among the oldest in Europe \u2014 they have barely changed for centuries.', src: 'Britannica, Portugal' },
        { id: 'pt-f4', text: 'More of the world\u2019s cork comes from Portugal than from any other country \u2014 cork is the bark of the cork oak tree.', src: 'Britannica, cork' }
      ]
    },
    {
      code: 'nl', name: 'Netherlands', region: 'Europe', capital: 'Amsterdam',
      lookFor: 'three stripes across \u2014 red, white and blue',
      facts: [
        { id: 'nl-f1', text: 'The Netherlands means \u201cthe low lands\u201d \u2014 much of the country is even below the level of the sea!', src: 'Britannica, Netherlands' },
        { id: 'nl-f2', text: 'For hundreds of years, windmills in the Netherlands have helped pump water off the land.', src: 'Britannica, Netherlands \u2014 Land reclamation' },
        { id: 'nl-f3', text: 'On average, the people of the Netherlands are the tallest in the world.', src: 'NCD Risk Factor Collaboration, height data' },
        { id: 'nl-f4', text: 'In the Netherlands there are more bicycles than people!', src: 'Wikipedia, Cycling in the Netherlands' }
      ]
    },
    {
      code: 'ch', name: 'Switzerland', region: 'Europe', capital: 'Bern',
      lookFor: 'the white plus sign on red \u2014 and the flag is square',
      facts: [
        { id: 'ch-f1', text: 'Switzerland\u2019s flag is square \u2014 almost every other flag in the world is a rectangle.', src: 'Britannica, flag of Switzerland' },
        { id: 'ch-f2', text: 'The Red Cross symbol is the Swiss flag with its colours flipped \u2014 a red cross on white.', src: 'Britannica, International Red Cross' },
        { id: 'ch-f3', text: 'The Alps run through Switzerland, and their tallest peaks keep their snow all year round.', src: 'Britannica, Alps' },
        { id: 'ch-f4', text: 'In Switzerland people speak four languages: German, French, Italian and Romansh.', src: 'Britannica, Switzerland \u2014 Languages' }
      ]
    },
    {
      code: 'se', name: 'Sweden', region: 'Europe', capital: 'Stockholm',
      lookFor: 'the yellow cross lying on blue',
      facts: [
        { id: 'se-f1', text: 'In Sweden\u2019s far north, winter is so dark that the sun barely rises for weeks.', src: 'Britannica, Sweden \u2014 Climate' },
        { id: 'se-f2', text: 'Every year most of the Nobel Prizes are handed out in Stockholm, to great scientists and writers.', src: 'Britannica, Nobel Prize' },
        { id: 'se-f3', text: 'In Sweden you may walk and camp almost anywhere in the countryside, as long as you are kind to nature.', src: 'Swedish Environmental Protection Agency, Right of public access' },
        { id: 'se-f4', text: 'Moose, giants of the deer family, wander wild in Sweden\u2019s forests.', src: 'Britannica, moose' }
      ]
    },
    {
      code: 'dk', name: 'Denmark', region: 'Europe', capital: 'Copenhagen',
      lookFor: 'the white cross on red',
      facts: [
        { id: 'dk-f1', text: 'Denmark\u2019s flag is the oldest still in use by any country \u2014 more than 800 years old!', src: 'Britannica, flag of Denmark' },
        { id: 'dk-f2', text: 'Denmark is a land of islands \u2014 it has more than 400 of them.', src: 'Statistics Denmark, Denmark in Figures' },
        { id: 'dk-f3', text: 'LEGO bricks come from Denmark \u2014 the name means \u201cplay well\u201d in Danish.', src: 'Britannica, LEGO' },
        { id: 'dk-f4', text: 'In Copenhagen\u2019s harbour sits a little statue of the Little Mermaid, from the fairy tale by Hans Christian Andersen.', src: 'Britannica, Copenhagen' }
      ]
    },
    {
      code: 'gr', name: 'Greece', region: 'Europe', capital: 'Athens',
      lookFor: 'blue and white stripes with a little cross in the corner',
      facts: [
        { id: 'gr-f1', text: 'The Olympic Games began in Greece almost 3,000 years ago.', src: 'Britannica, Olympic Games' },
        { id: 'gr-f2', text: 'Greece has thousands of islands, but only a few hundred have people living on them.', src: 'Britannica, Greece' },
        { id: 'gr-f3', text: 'The old Greeks told stories about gods who lived on Mount Olympus \u2014 Zeus was their king.', src: 'Britannica, Greek mythology' },
        { id: 'gr-f4', text: 'The marathon race is named after a legend from Greece \u2014 a messenger who ran from a battlefield to Athens.', src: 'Britannica, marathon' }
      ]
    },
    {
      code: 'pl', name: 'Poland', region: 'Europe', capital: 'Warsaw',
      lookFor: 'just two stripes \u2014 white on top of red',
      facts: [
        { id: 'pl-f1', text: 'Copernicus, who figured out that the Earth goes around the Sun, was born in Poland more than 500 years ago.', src: 'Britannica, Nicolaus Copernicus' },
        { id: 'pl-f2', text: 'In Poland there is a forest so old that bison \u2014 Europe\u2019s heaviest land animals \u2014 still roam it.', src: 'UNESCO World Heritage List, Bialowieza Forest' },
        { id: 'pl-f3', text: 'Chopin, who wrote beautiful music for the piano, came from Poland.', src: 'Britannica, Frederic Chopin' },
        { id: 'pl-f4', text: 'In Poland there is a salt mine with underground halls so grand that even the chandeliers are carved from salt.', src: 'UNESCO World Heritage List, Wieliczka Salt Mine' }
      ]
    },
    {
      code: 'ua', name: 'Ukraine', region: 'Europe', capital: 'Kyiv',
      lookFor: 'blue on top of yellow \u2014 like sky over a wheat field',
      facts: [
        { id: 'ua-f1', text: 'The flag shows blue sky over golden wheat \u2014 Ukraine grows so much grain that people call it the breadbasket of Europe.', src: 'Britannica, Ukraine \u2014 Agriculture' },
        { id: 'ua-f2', text: 'The largest aeroplane ever built was made in Ukraine.', src: 'Britannica, Antonov An-225' },
        { id: 'ua-f3', text: 'Kyiv, the capital, is one of the oldest cities in that part of the world.', src: 'Britannica, Kyiv' },
        { id: 'ua-f4', text: 'Sunflowers grow all over Ukraine \u2014 it is one of the world\u2019s biggest growers of sunflower seeds.', src: 'Food and Agriculture Organization, crops data' }
      ]
    },
    {
      code: 'ie', name: 'Ireland', region: 'Europe', capital: 'Dublin',
      lookFor: 'three stripes going up and down \u2014 green, white and orange',
      facts: [
        { id: 'ie-f1', text: 'There are no snakes living wild in Ireland!', src: 'Britannica, Ireland \u2014 Plant and animal life' },
        { id: 'ie-f2', text: 'Ireland\u2019s official symbol is a harp \u2014 you can find it on its coins.', src: 'Britannica, Ireland \u2014 National symbols' },
        { id: 'ie-f3', text: 'Long ago in Ireland people celebrated an old festival called Samhain, which grew into our Halloween.', src: 'Britannica, Halloween' },
        { id: 'ie-f4', text: 'Irish stories tell of leprechauns \u2014 tiny shoemakers who hide pots of gold at the end of the rainbow.', src: 'Britannica, leprechaun' }
      ]
    },

    // ---- North America ----
    {
      code: 'us', name: 'United States', region: 'North America', capital: 'Washington, D.C.',
      lookFor: 'the flag with 50 little white stars on blue',
      facts: [
        { id: 'us-f1', text: 'The 50 stars stand for the 50 states \u2014 a new star was added each time a state joined.', src: 'Britannica, flag of the United States' },
        { id: 'us-f2', text: 'The United States is so wide it stretches more than 4,000 kilometres from ocean to ocean across North America.', src: 'CIA World Factbook, United States \u2014 Geography' },
        { id: 'us-f3', text: 'Yellowstone, the world\u2019s first national park, was created in the United States in 1872.', src: 'Britannica, Yellowstone National Park' },
        { id: 'us-f4', text: 'A river spent millions of years carving the Grand Canyon, a valley so deep that it has its own weather.', src: 'Britannica, Grand Canyon' }
      ]
    },
    {
      code: 'ca', name: 'Canada', region: 'North America', capital: 'Ottawa',
      lookFor: 'the red maple leaf in the middle',
      facts: [
        { id: 'ca-f1', text: 'Maple syrup comes from the sap of maple trees, and Canada makes most of the world\u2019s maple syrup.', src: 'Agriculture and Agri-Food Canada, maple syrup' },
        { id: 'ca-f2', text: 'Canada is the second-biggest country in the world.', src: 'Britannica, Canada' },
        { id: 'ca-f3', text: 'Canada has so many lakes that it holds most of the lakes in the whole world.', src: 'Britannica, Canada \u2014 Lakes' },
        { id: 'ca-f4', text: 'Ice hockey is Canada\u2019s official national winter sport, and kids skate on frozen ponds all winter long.', src: 'Britannica, ice hockey' }
      ]
    },
    {
      code: 'mx', name: 'Mexico', region: 'North America', capital: 'Mexico City',
      lookFor: 'the eagle sitting on a cactus',
      facts: [
        { id: 'mx-f1', text: 'The picture on Mexico\u2019s flag tells an old legend: an eagle sat on a cactus with a snake in its beak, and there the city was begun.', src: 'Britannica, flag of Mexico' },
        { id: 'mx-f2', text: 'People in Mexico have enjoyed chocolate as a special drink for thousands of years \u2014 long before there were chocolate bars.', src: 'Britannica, chocolate' },
        { id: 'mx-f3', text: 'Every year, millions of monarch butterflies fly all the way from Canada to Mexico\u2019s forests to spend the winter.', src: 'Britannica, monarch butterfly' },
        { id: 'mx-f4', text: 'Corn was first grown by farmers in Mexico thousands of years ago.', src: 'Britannica, corn' },
        { id: 'mx-f5', text: 'The axolotl, a smiling salamander that can regrow its legs, lives in the lakes near Mexico City.', src: 'Britannica, axolotl' }
      ]
    },

    // ---- South America ----
    {
      code: 'br', name: 'Brazil', region: 'South America', capital: 'Bras\u00edlia',
      lookFor: 'the yellow diamond with a blue globe inside',
      facts: [
        { id: 'br-f1', text: 'The stars on Brazil\u2019s flag show the real sky over the city of Rio de Janeiro on the night the country became a republic!', src: 'Britannica, flag of Brazil' },
        { id: 'br-f2', text: 'The Amazon rainforest, the biggest rainforest on Earth, covers much of Brazil.', src: 'Britannica, Amazon Rainforest' },
        { id: 'br-f3', text: 'The Amazon River carries more water than any other river in the world.', src: 'Britannica, Amazon River' },
        { id: 'br-f4', text: 'Brazil\u2019s capital, Bras\u00edlia, was planned and built from scratch in just a few years.', src: 'Britannica, Brasilia' },
        { id: 'br-f5', text: 'Brazil has won the football World Cup more times than any other country.', src: 'FIFA, World Cup winners' }
      ]
    },
    {
      code: 'ar', name: 'Argentina', region: 'South America', capital: 'Buenos Aires',
      lookFor: 'three light-blue and white stripes with a golden sun',
      facts: [
        { id: 'ar-f1', text: 'The golden sun on the flag is called the Sun of May.', src: 'Britannica, flag of Argentina' },
        { id: 'ar-f2', text: 'On Argentina\u2019s wide grasslands, cowboys called gauchos ride horses and herd cattle.', src: 'Britannica, gaucho' },
        { id: 'ar-f3', text: 'The tango, a famous dance, was born in the streets of Buenos Aires.', src: 'Britannica, tango' },
        { id: 'ar-f4', text: 'Fossil hunters in Argentina have found some of the biggest dinosaurs ever discovered.', src: 'Britannica, Argentinosaurus' }
      ]
    },

    // ---- Middle East ----
    {
      code: 'tr', name: 'Turkey', region: 'Middle East', capital: 'Ankara',
      lookFor: 'the white star and crescent moon on red',
      facts: [
        { id: 'tr-f1', text: 'Turkey\u2019s biggest city is Istanbul, but its capital is Ankara.', src: 'Britannica, Ankara' },
        { id: 'tr-f2', text: 'Istanbul is a giant city that sits on two continents \u2014 one side in Europe, one side in Asia.', src: 'Britannica, Istanbul' },
        { id: 'tr-f3', text: 'Tulips were first made famous in Turkey, and later they travelled to the Netherlands.', src: 'Britannica, tulip' },
        { id: 'tr-f4', text: 'In Cappadocia, people once carved their houses out of soft rock towers \u2014 today colourful hot-air balloons float above them.', src: 'Britannica, Cappadocia' }
      ]
    },

    // ---- Africa ----
    {
      code: 'eg', name: 'Egypt', region: 'Africa', capital: 'Cairo',
      lookFor: 'the golden eagle in the middle',
      facts: [
        { id: 'eg-f1', text: 'Egypt\u2019s Great Pyramid is 4,500 years old \u2014 and it is still standing.', src: 'Britannica, Pyramids of Giza' },
        { id: 'eg-f2', text: 'The Great Pyramid was the tallest building in the world for more than 3,000 years.', src: 'Britannica, Great Pyramid of Khufu' },
        { id: 'eg-f3', text: 'The Nile is the longest river in Africa \u2014 ancient Egypt grew along it like a green ribbon through the desert.', src: 'Britannica, Nile River' },
        { id: 'eg-f4', text: 'Ancient Egyptians wrote with pictures called hieroglyphs \u2014 birds, snakes, eyes and feet!', src: 'Britannica, hieroglyph' },
        { id: 'eg-f5', text: 'The ancient Egyptians loved cats, and even had a cat goddess named Bastet.', src: 'Britannica, Bastet' }
      ]
    },
    {
      code: 'za', name: 'South Africa', region: 'Africa', capital: 'Pretoria',
      lookFor: 'the green Y lying on its side',
      facts: [
        { id: 'za-f1', text: 'South Africa has three capitals \u2014 Pretoria, Cape Town and Bloemfontein \u2014 each doing a different job.', src: 'Britannica, South Africa \u2014 Government' },
        { id: 'za-f2', text: 'In South Africa you can find the Big Five animals: lion, leopard, rhino, elephant and buffalo.', src: 'World Wide Fund for Nature, Big Five' },
        { id: 'za-f3', text: 'Near Africa\u2019s southern tip, two oceans meet \u2014 the warm Indian Ocean and the cold Atlantic.', src: 'Britannica, Cape Agulhas' },
        { id: 'za-f4', text: 'A flat-topped mountain watches over Cape Town, and sometimes clouds drape over it like a tablecloth.', src: 'Britannica, Table Mountain' }
      ]
    },
    {
      code: 'ng', name: 'Nigeria', region: 'Africa', capital: 'Abuja',
      lookFor: 'green, white, green \u2014 stripes going up and down',
      facts: [
        { id: 'ng-f1', text: 'More people live in Nigeria than in any other African country.', src: 'United Nations World Population Prospects' },
        { id: 'ng-f2', text: 'Nigeria makes more films each year than Hollywood \u2014 people call its film industry Nollywood!', src: 'Britannica, Nollywood' },
        { id: 'ng-f3', text: 'On Nigeria\u2019s flag, the white stripe stands for peace and the green stripes stand for the land.', src: 'Britannica, flag of Nigeria' },
        { id: 'ng-f4', text: 'In Nigeria, drummers play talking drums that can squeak high and low to copy the patterns of speech.', src: 'Wikipedia, Talking drum' }
      ]
    },
    {
      code: 'ke', name: 'Kenya', region: 'Africa', capital: 'Nairobi',
      lookFor: 'the shield with two spears in the middle',
      facts: [
        { id: 'ke-f1', text: 'Kenya\u2019s flag carries a Maasai shield \u2014 the Maasai are famous herders who live in Kenya and Tanzania.', src: 'Britannica, flag of Kenya' },
        { id: 'ke-f2', text: 'Every year, more than a million wildebeest stampede across Kenya\u2019s grasslands, following the rain.', src: 'World Wide Fund for Nature, Great Migration' },
        { id: 'ke-f3', text: 'Many of the world\u2019s best long-distance runners come from Kenya\u2019s highlands.', src: 'Britannica, Kenya \u2014 Sports' },
        { id: 'ke-f4', text: 'Lions and giraffes roam a national park right beside Nairobi, with city buildings in the background!', src: 'Kenya Wildlife Service, Nairobi National Park' }
      ]
    },
    // ---- 2026-09-30: thirty more countries (flag-icons 086f7e97, sources in qc/2026-09-30-facts-sources.md) ----
    {
      code: 'sa', name: 'Saudi Arabia', region: 'Middle East', capital: 'Riyadh',
      lookFor: 'the white writing above a white sword, on green',
      facts: [
        { id: 'sa-f1', text: 'Saudi Arabia covers most of the Arabian Peninsula, and much of it is sandy desert.', src: 'Britannica, Saudi Arabia' },
        { id: 'sa-f2', text: 'Mecca and Medina, two holy cities of Islam, are in Saudi Arabia.', src: 'Britannica, Mecca; Britannica, Medina' },
        { id: 'sa-f3', text: 'Camels have carried people across the Arabian deserts for thousands of years.', src: 'Britannica, dromedary' }
      ]
    },
    {
      code: 'pk', name: 'Pakistan', region: 'South Asia', capital: 'Islamabad',
      lookFor: 'the white crescent and star on dark green, beside a white stripe',
      facts: [
        { id: 'pk-f1', text: 'K2, the second-highest mountain in the world, rises in the mountains on Pakistan\u2019s border.', src: 'Britannica, K2' },
        { id: 'pk-f2', text: 'The Indus River flows through Pakistan from the mountains all the way to the Arabian Sea.', src: 'Britannica, Indus River' },
        { id: 'pk-f3', text: 'Cricket is the most popular sport in Pakistan.', src: 'Britannica, Pakistan \u2014 Sports and recreation' },
        { id: 'pk-f4', text: 'Many trucks in Pakistan are painted with bright, colourful pictures.', src: 'Wikipedia, Truck art in Pakistan' }
      ]
    },
    {
      code: 'bd', name: 'Bangladesh', region: 'South Asia', capital: 'Dhaka',
      lookFor: 'the red circle on green',
      facts: [
        { id: 'bd-f1', text: 'The red circle on Bangladesh\u2019s flag stands for the rising sun.', src: 'Britannica, flag of Bangladesh' },
        { id: 'bd-f2', text: 'Bangladesh is a low, flat land crossed by many rivers.', src: 'Britannica, Bangladesh' },
        { id: 'bd-f3', text: 'The Bengal tiger is Bangladesh\u2019s national animal.', src: 'Britannica, Bangladesh \u2014 national symbols; Britannica, Sundarbans' },
        { id: 'bd-f4', text: 'The Sundarbans, a great forest beside the sea, is a home for tigers.', src: 'Britannica, Sundarbans' }
      ]
    },
    {
      code: 'mn', name: 'Mongolia', region: 'East Asia', capital: 'Ulaanbaatar',
      lookFor: 'the golden symbol on the left red stripe, with blue in the middle',
      facts: [
        { id: 'mn-f1', text: 'Mongolia has wide, open grasslands, and many families live in round tents called gers.', src: 'Britannica, Mongolia' },
        { id: 'mn-f2', text: 'Every summer Mongolia holds the Naadam festival, with horse racing, wrestling and archery.', src: 'Britannica, Naadam' },
        { id: 'mn-f3', text: 'Mongolia has no sea coast. It lies between Russia and China.', src: 'Britannica, Mongolia' }
      ]
    },
    {
      code: 'kz', name: 'Kazakhstan', region: 'Central Asia', capital: 'Astana',
      lookFor: 'the golden sun and eagle on sky blue',
      facts: [
        { id: 'kz-f1', text: 'Kazakhstan is the biggest country in the world with no sea coast.', src: 'Britannica, Kazakhstan' },
        { id: 'kz-f2', text: 'Some hunters in Kazakhstan train golden eagles to hunt with them.', src: 'Britannica, Kazakhstan \u2014 Cultural life; Wikipedia, Eagle hunting' },
        { id: 'kz-f3', text: 'Wild apple trees grow in the mountains of Kazakhstan, and garden apples come from trees like them.', src: 'Britannica, apple' }
      ]
    },
    {
      code: 'bt', name: 'Bhutan', region: 'South Asia', capital: 'Thimphu',
      lookFor: 'the white dragon on yellow and orange',
      facts: [
        { id: 'bt-f1', text: 'Bhutan is called the Land of the Thunder Dragon, and a dragon flies across its flag.', src: 'Britannica, flag of Bhutan; Britannica, Bhutan' },
        { id: 'bt-f2', text: 'Bhutan is a small mountain country in the Himalayas.', src: 'Britannica, Bhutan' },
        { id: 'bt-f3', text: 'Archery is the national sport of Bhutan.', src: 'Britannica, Bhutan \u2014 Sports and recreation' }
      ]
    },
    {
      code: 'qa', name: 'Qatar', region: 'Middle East', capital: 'Doha',
      lookFor: 'the zigzag white edge on maroon',
      facts: [
        { id: 'qa-f1', text: 'Qatar\u2019s flag has a zigzag edge with nine points.', src: 'Britannica, flag of Qatar' },
        { id: 'qa-f2', text: 'Qatar is a small country that sticks out into the Persian Gulf.', src: 'Britannica, Qatar' },
        { id: 'qa-f3', text: 'Qatar hosted the FIFA World Cup in 2022.', src: 'FIFA, 2022 FIFA World Cup Qatar' }
      ]
    },
    {
      code: 'uz', name: 'Uzbekistan', region: 'Central Asia', capital: 'Tashkent',
      lookFor: 'the crescent and stars on blue, white and green stripes',
      facts: [
        { id: 'uz-f1', text: 'Samarkand, a city in Uzbekistan, was a famous stop on the Silk Road, the old trading road between Asia and Europe.', src: 'Britannica, Samarkand' },
        { id: 'uz-f2', text: 'Many old buildings in Uzbekistan are covered in beautiful blue tiles.', src: 'Britannica, Samarkand \u2014 Registan' },
        { id: 'uz-f3', text: 'Uzbekistan has no sea coast, and every country around it has no sea coast either.', src: 'Britannica, Uzbekistan' }
      ]
    },
    {
      code: 'at', name: 'Austria', region: 'Europe', capital: 'Vienna',
      lookFor: 'a white stripe between two red stripes',
      facts: [
        { id: 'at-f1', text: 'Mozart, the famous composer, was born in Salzburg, Austria.', src: 'Britannica, Wolfgang Amadeus Mozart' },
        { id: 'at-f2', text: 'The Alps cover much of Austria, and it is a great place to ski.', src: 'Britannica, Austria' },
        { id: 'at-f3', text: 'In Vienna, white Lipizzaner horses perform graceful dances at the Spanish Riding School.', src: 'Britannica, Spanish Riding School' }
      ]
    },
    {
      code: 'al', name: 'Albania', region: 'Europe', capital: 'Tirana',
      lookFor: 'the black two-headed eagle on red',
      facts: [
        { id: 'al-f1', text: 'The black eagle on Albania\u2019s flag has two heads.', src: 'Britannica, flag of Albania' },
        { id: 'al-f2', text: 'Albania has a long sea coast and many mountains.', src: 'Britannica, Albania' },
        { id: 'al-f3', text: 'Albania is in southeastern Europe.', src: 'Britannica, Albania' }
      ]
    },
    {
      code: 'lt', name: 'Lithuania', region: 'Europe', capital: 'Vilnius',
      lookFor: 'three stripes: yellow, green and red',
      facts: [
        { id: 'lt-f1', text: 'Lithuania is one of three Baltic countries beside the Baltic Sea.', src: 'Britannica, Lithuania' },
        { id: 'lt-f2', text: 'Pieces of amber, a golden gem made from ancient tree sap, wash up on the Baltic beaches.', src: 'Britannica, amber' },
        { id: 'lt-f3', text: 'Basketball is a favourite sport in Lithuania.', src: 'Britannica, Lithuania \u2014 Sports and recreation' }
      ]
    },
    {
      code: 'ma', name: 'Morocco', region: 'Africa', capital: 'Rabat',
      lookFor: 'the green star on red',
      facts: [
        { id: 'ma-f1', text: 'Morocco is in the north-west corner of Africa, with coasts on the Atlantic Ocean and the Mediterranean Sea.', src: 'Britannica, Morocco' },
        { id: 'ma-f2', text: 'Snow covers the tops of Morocco\u2019s Atlas Mountains in winter.', src: 'Britannica, Atlas Mountains' },
        { id: 'ma-f3', text: 'In Morocco, goats climb argan trees to eat the fruit.', src: 'Britannica, argan tree; National Geographic, Tree-climbing goats of Morocco' }
      ]
    },
    {
      code: 'et', name: 'Ethiopia', region: 'Africa', capital: 'Addis Ababa',
      lookFor: 'the blue circle with a star, on green, yellow and red',
      facts: [
        { id: 'et-f1', text: 'Coffee plants first grew wild in Ethiopia.', src: 'Britannica, coffee' },
        { id: 'et-f2', text: 'Amharic, a language spoken in Ethiopia, is written with the old Ge\u2019ez alphabet.', src: 'Britannica, Ethiopia \u2014 Languages; Britannica, Ge\u2019ez language' },
        { id: 'et-f3', text: 'Gelada monkeys live in the high Simien Mountains of Ethiopia.', src: 'Britannica, gelada' }
      ]
    },
    {
      code: 'tz', name: 'Tanzania', region: 'Africa', capital: 'Dodoma',
      lookFor: 'the black stripe edged with yellow, across green and blue',
      facts: [
        { id: 'tz-f1', text: 'Mount Kilimanjaro, the tallest mountain in Africa, is in Tanzania.', src: 'Britannica, Mount Kilimanjaro' },
        { id: 'tz-f2', text: 'Every year, herds of wildebeest and zebras cross the Serengeti grasslands in Tanzania.', src: 'Britannica, Serengeti' },
        { id: 'tz-f3', text: 'Zanzibar, a group of spice islands, is part of Tanzania.', src: 'Britannica, Zanzibar' }
      ]
    },
    {
      code: 'bw', name: 'Botswana', region: 'Africa', capital: 'Gaborone',
      lookFor: 'a black stripe with white edges across light blue',
      facts: [
        { id: 'bw-f1', text: 'In the Okavango Delta in Botswana, a river spreads out into a huge wetland full of animals.', src: 'Britannica, Okavango Delta' },
        { id: 'bw-f2', text: 'Much of Botswana is covered by the sandy Kalahari.', src: 'Britannica, Botswana' },
        { id: 'bw-f3', text: 'Botswana\u2019s money is called the pula, a word that means rain.', src: 'Britannica, Botswana \u2014 Currency' }
      ]
    },
    {
      code: 'mg', name: 'Madagascar', region: 'Africa', capital: 'Antananarivo',
      lookFor: 'a white stripe, then red above green',
      facts: [
        { id: 'mg-f1', text: 'Madagascar is a giant island off the east coast of Africa.', src: 'Britannica, Madagascar' },
        { id: 'mg-f2', text: 'Ring-tailed lemurs live wild only on the island of Madagascar.', src: 'Britannica, ring-tailed lemur' },
        { id: 'mg-f3', text: 'Giant baobab trees stand in a row along a famous dirt road in Madagascar.', src: 'Britannica, baobab; Wikipedia, Avenue of the Baobabs' }
      ]
    },
    {
      code: 'zm', name: 'Zambia', region: 'Africa', capital: 'Lusaka',
      lookFor: 'an eagle above red, black and orange stripes, on green',
      facts: [
        { id: 'zm-f1', text: 'Victoria Falls, one of the biggest waterfalls in the world, is on the border of Zambia and Zimbabwe.', src: 'Britannica, Victoria Falls' },
        { id: 'zm-f2', text: 'The bird on Zambia\u2019s flag is an African fish eagle.', src: 'Britannica, flag of Zambia' },
        { id: 'zm-f3', text: 'Zambia has no sea coast.', src: 'Britannica, Zambia' }
      ]
    },
    {
      code: 'ug', name: 'Uganda', region: 'Africa', capital: 'Kampala',
      lookFor: 'a white crane in a circle, on black, yellow and red stripes',
      facts: [
        { id: 'ug-f1', text: 'The grey crowned crane on Uganda\u2019s flag is the country\u2019s national bird.', src: 'Britannica, flag of Uganda' },
        { id: 'ug-f2', text: 'Mountain gorillas live in Uganda\u2019s forests.', src: 'Britannica, mountain gorilla; Britannica, Bwindi Impenetrable National Park' },
        { id: 'ug-f3', text: 'Lake Victoria, the biggest lake in Africa, touches Uganda.', src: 'Britannica, Lake Victoria' }
      ]
    },
    {
      code: 'zw', name: 'Zimbabwe', region: 'Africa', capital: 'Harare',
      lookFor: 'the white triangle with a red star and a bird',
      facts: [
        { id: 'zw-f1', text: 'The bird on Zimbabwe\u2019s flag is the Zimbabwe Bird, which was carved in stone long ago.', src: 'Britannica, Great Zimbabwe; Britannica, flag of Zimbabwe' },
        { id: 'zw-f2', text: 'Great Zimbabwe is an old city of huge stone walls.', src: 'Britannica, Great Zimbabwe' },
        { id: 'zw-f3', text: 'Hwange National Park in Zimbabwe is home to many elephants.', src: 'Britannica, Hwange National Park' }
      ]
    },
    {
      code: 'mu', name: 'Mauritius', region: 'Africa', capital: 'Port Louis',
      lookFor: 'four stripes: red, blue, yellow and green',
      facts: [
        { id: 'mu-f1', text: 'Mauritius is an island in the Indian Ocean.', src: 'Britannica, Mauritius' },
        { id: 'mu-f2', text: 'The dodo was a big bird that could not fly. It lived only on Mauritius, and it is gone now.', src: 'Britannica, dodo' },
        { id: 'mu-f3', text: 'Mauritius has beautiful beaches and coral reefs.', src: 'Britannica, Mauritius' }
      ]
    },
    {
      code: 'cu', name: 'Cuba', region: 'Caribbean', capital: 'Havana',
      lookFor: 'blue and white stripes with a red triangle and a white star',
      facts: [
        { id: 'cu-f1', text: 'Cuba is the biggest island in the Caribbean Sea.', src: 'Britannica, Cuba' },
        { id: 'cu-f2', text: 'Many old, brightly painted cars from the 1950s still drive on Cuba\u2019s streets.', src: 'Britannica, Cuba \u2014 Transportation' },
        { id: 'cu-f3', text: 'The bee hummingbird from Cuba is the smallest bird in the world.', src: 'Britannica, bee hummingbird' }
      ]
    },
    {
      code: 'jm', name: 'Jamaica', region: 'Caribbean', capital: 'Kingston',
      lookFor: 'a gold X with green and black triangles',
      facts: [
        { id: 'jm-f1', text: 'Usain Bolt, one of the fastest runners ever, comes from Jamaica.', src: 'Britannica, Usain Bolt' },
        { id: 'jm-f2', text: 'Reggae music began in Jamaica.', src: 'Britannica, reggae' },
        { id: 'jm-f3', text: 'Coffee from the Blue Mountains of Jamaica is famous around the world.', src: 'Britannica, Blue Mountains, Jamaica' }
      ]
    },
    {
      code: 'pa', name: 'Panama', region: 'Central America', capital: 'Panama City',
      lookFor: 'a blue star and a red star in white, blue and red squares',
      facts: [
        { id: 'pa-f1', text: 'The Panama Canal is a waterway that lets ships sail between the Atlantic and Pacific oceans.', src: 'Britannica, Panama Canal' },
        { id: 'pa-f2', text: 'Ships climb through the Panama Canal on giant water steps called locks.', src: 'Britannica, lock' },
        { id: 'pa-f3', text: 'Panama joins North America to South America.', src: 'Britannica, Panama' }
      ]
    },
    {
      code: 'do', name: 'Dominican Republic', region: 'Caribbean', capital: 'Santo Domingo',
      lookFor: 'a white cross with blue and red squares',
      facts: [
        { id: 'do-f1', text: 'The Dominican Republic shares an island called Hispaniola with Haiti.', src: 'Britannica, Hispaniola' },
        { id: 'do-f2', text: 'Pico Duarte, the tallest mountain in the Caribbean, is in the Dominican Republic.', src: 'Britannica, Duarte Peak' },
        { id: 'do-f3', text: 'Baseball is a favourite sport in the Dominican Republic.', src: 'Britannica, Dominican Republic \u2014 Sports and recreation' }
      ]
    },
    {
      code: 'ht', name: 'Haiti', region: 'Caribbean', capital: 'Port-au-Prince',
      lookFor: 'blue over red with a white square in the middle',
      facts: [
        { id: 'ht-f1', text: 'Haiti shares the island of Hispaniola with the Dominican Republic.', src: 'Britannica, Hispaniola' },
        { id: 'ht-f2', text: 'The name Haiti comes from an old word that means land of high mountains.', src: 'Britannica, Haiti \u2014 Name' },
        { id: 'ht-f3', text: 'Haitian artists are famous for their bright, colourful paintings.', src: 'Britannica, Haiti \u2014 Cultural life' }
      ]
    },
    {
      code: 'co', name: 'Colombia', region: 'South America', capital: 'Bogot\u00e1',
      lookFor: 'a wide yellow stripe over blue and red',
      facts: [
        { id: 'co-f1', text: 'The Andes mountains run through western Colombia.', src: 'Britannica, Colombia' },
        { id: 'co-f2', text: 'Colombia has coasts on both the Pacific Ocean and the Caribbean Sea.', src: 'Britannica, Colombia' },
        { id: 'co-f3', text: 'Colourful poison frogs live in Colombia\u2019s rainforests.', src: 'Britannica, poison frog' }
      ]
    },
    {
      code: 'gy', name: 'Guyana', region: 'South America', capital: 'Georgetown',
      lookFor: 'a yellow arrow with a red arrow on green',
      facts: [
        { id: 'gy-f1', text: 'Kaieteur Falls in Guyana drops from a very high cliff into the rainforest.', src: 'Britannica, Kaieteur Falls' },
        { id: 'gy-f2', text: 'Rainforest covers most of Guyana.', src: 'Britannica, Guyana \u2014 Plant and animal life' },
        { id: 'gy-f3', text: 'Guyana is the only country in South America where English is the official language.', src: 'Britannica, Guyana \u2014 Languages' }
      ]
    },
    {
      code: 'sr', name: 'Suriname', region: 'South America', capital: 'Paramaribo',
      lookFor: 'a yellow star in the middle of a wide red stripe',
      facts: [
        { id: 'sr-f1', text: 'Suriname is the only country in South America where Dutch is the official language.', src: 'Britannica, Suriname \u2014 Languages' },
        { id: 'sr-f2', text: 'Most of Suriname is covered in rainforest.', src: 'Britannica, Suriname \u2014 Plant and animal life' },
        { id: 'sr-f3', text: 'Suriname is the smallest independent country in South America.', src: 'Britannica, Suriname' }
      ]
    },
    {
      code: 'pg', name: 'Papua New Guinea', region: 'Australia and the Pacific', capital: 'Port Moresby',
      lookFor: 'a yellow bird of paradise on red, and white stars on black',
      facts: [
        { id: 'pg-f1', text: 'The bird of paradise on the flag has beautiful, colourful feathers, and it lives in Papua New Guinea.', src: 'Britannica, bird of paradise; Britannica, flag of Papua New Guinea' },
        { id: 'pg-f2', text: 'More languages are spoken in Papua New Guinea than in any other country.', src: 'Britannica, Papua New Guinea \u2014 Languages' },
        { id: 'pg-f3', text: 'Mountains and thick rainforest cover much of Papua New Guinea.', src: 'Britannica, Papua New Guinea' }
      ]
    },
    {
      code: 'to', name: 'Tonga', region: 'Australia and the Pacific', capital: 'Nuku\u2019alofa',
      lookFor: 'a red cross on a white square, on red',
      facts: [
        { id: 'to-f1', text: 'Tonga is made up of many islands in the Pacific Ocean.', src: 'Britannica, Tonga' },
        { id: 'to-f2', text: 'Tonga has both coral islands and islands made by volcanoes.', src: 'Britannica, Tonga' },
        { id: 'to-f3', text: 'Every year, humpback whales swim to Tonga to have their babies.', src: 'Britannica, humpback whale; Britannica, Tonga' }
      ]
    }

  ];

  // Spoken lines with stable ids. When a designed voice replaces the interim
  // speechSynthesis one, these ids become the render manifest keys (the
  // solar-system-game lines.json -> clips.json pattern). Per-country lines
  // are generated from the country rows so the data above stays the single
  // source of truth.
  var LINES = {
    'home.hello': 'Welcome to the Flags game!',
    'mode.match': 'Match the flag',
    'mode.explore': 'Explore Flags',
    'explore.intro': 'Explore the flags. Tap one to meet its country.',
    'mode.country': 'Which country?',
    'mode.map': 'World map',
    'mode.mapFind': 'Flag to map',
    'mode.mapPick': 'Map to flag',
    'mode.mapExplore': 'Explore the map',
    'map.menu.intro': 'Pick a map game.',
    'map.find.prompt': 'Tap this country on the map.',
    'map.pick.prompt': 'Which flag belongs to the glowing country?',
    'map.hint': 'Here is a clue. Look in the coloured part of the map.',
    'map.explore.prompt': 'Tap a coloured country to meet it.',
    'map.explore.hint': 'Tap a coloured country.',
    'prompt.match': 'Tap the flag that is the same.',
    'prompt.match.reveal': 'Look carefully. Tap the flag that is the same.',
    'prompt.country': 'Which country does this flag belong to?',
    'prompt.country.reveal': 'Listen and look. Which country is this?',
    'answer.correct.1': 'Yes! That is right.',
    'answer.correct.2': 'Wonderful!',
    'answer.correct.3': 'You found it!',
    'answer.correct.4': 'Well done!',
    'answer.retry.1': 'Not this one. Try again!',
    'answer.retry.2': 'Almost! Try again.',
    'answer.reveal': 'Here it is.',
    'card.tapToHear': 'Tap the card to hear about this country.',
    'card.capital': 'Capital.',
    'card.lookFor': 'Look for.',
    'card.fact': 'Tiny fact.',
    'card.next': 'Next flag',
    'session.done': 'What a journey! You met so many flags today.',
    'session.count': 'flags today'
  };

  function splitSentences(text) {
    return (String(text).match(/[^.!?]+[.!?]+["']?\s*/g) || [String(text)])
      .map(function (part) { return part.trim(); })
      .filter(Boolean);
  }

  function cardLines(country) {
    // One line per sentence-shaped utterance, per AUDIO-DIRECTION playback
    // rules. ids are stable: card.<code>.name / .region / .capital /
    // .lookfor / .factN. A fact with several sentences continues as
    // .factN.2, .factN.3, etc., so no interim or future rendered utterance
    // ever reaches speech.js without a manifest-visible id.
    var lines = {};
    lines['card.' + country.code + '.name'] = country.name + '.';
    lines['card.' + country.code + '.region'] = 'It is in the ' + country.region + ' region.';
    lines['card.' + country.code + '.capital'] = 'The capital is ' + country.capital + '.';
    lines['card.' + country.code + '.lookfor'] = 'Look for ' + country.lookFor + '.';
    country.facts.forEach(function (fact, i) {
      splitSentences(fact.text).forEach(function (part, sentenceIndex) {
        var id = 'card.' + country.code + '.fact' + (i + 1);
        if (sentenceIndex > 0) id += '.' + (sentenceIndex + 1);
        lines[id] = part;
      });
    });
    return lines;
  }

  return {
    countries: COUNTRIES,
    confusable: CONFUSABLE,
    lines: LINES,
    cardLines: cardLines
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = FLAGS_DATA;
}
