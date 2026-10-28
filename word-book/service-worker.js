/* CACHE_NAME is the variable the release pipeline's reader expects (publish-app.sh stage 5
   matches /CACHE_NAME\s*=/), and bumping it is what arms a release. Do not rename it; see
   release/registry.json.

   SELF-UPDATE TAKEOVER, owner decision 2026-10-25: install calls skipWaiting and activate
   claims existing clients so cg-update.js can observe the new worker on an open page.
   cg-update.js protects a child mid-play: it never reloads a page the child touched until
   that page has been left alone for at least five minutes.

   NOT BUMPED FOR THE 2026-09-22 WORD CLIPS. word-book has never been published: the live
   /word-book/ serves no worker at all and release/registry.json had word-book disabled at
   the time, so v2 on main was already ahead of live and unpublished. One unpublished
   version is enough; bumping again would arm nothing new.

   v3 2026-09-24: arms the first release candidate -- owner-approved A/B preview
   (data/letters.json {"enabled":["a","b"]}, wired by commit f6534e0b). data/letters.json
   joins SHELL here: dictionary.html fetches it at runtime and falls back to EVERY letter
   if that fetch fails, so precaching it is what keeps the A/B-only gate holding offline
   from the very first load, not only after one successful online fetch.

   v4 -> v5, 2026-09-26: the hub's music bed (audio/word-bed.m4a, rendered 2026-09-18) is
   wired to index.html for the first time -- AUDIO-DIRECTION.md decision 10a. A worker
   bump only; nothing here publishes on its own. The bed itself does NOT join SHELL: it
   is off by default, so precaching it would add 864 KB to every child's first install to
   serve a feature most will never turn on. It is cached the first time it actually plays,
   by the fetch handler's generic same-origin branch below (the comment on that branch
   already names this exact file).

   v5 -> v6, 2026-09-28: CG-250 round 7 owner verdicts landed. Only bow.ribbon-knot's
   clip changed (ships the IPA-turbo take; among/all/and/ago keep their current shipped
   clip unchanged, no file touched) -- coordination/tasks/2026-09-28-2029-claude-word-
   clips-r7-verdicts.md. A worker bump only; this arms a release candidate but does not
   publish it -- production publish still needs the owner's separate, SHA-bound
   approval.

   v6 -> v7, 2026-09-29: the owner lifted the Word Book freeze for exactly PR #1074 and
   #1075 ("lift C and D pls") -- coordination/tasks/2026-09-29-2026-claude-wordbook-
   merge-cd.md. #1074 shipped the letter-C verdict clips (7 IPA takes + 1 sentence cut);
   #1075 shipped sentence audio for the rest of C and all of D (105 clips). Neither PR
   bumped CACHE_NAME on its own branch (the held PR #1073 was going to carry v6->v7, but
   it stays held and unmerged), so installed devices would keep the old word/sentence
   clips without this bump. A worker bump only; this arms a release candidate but does
   not publish it -- production publish still needs the owner's separate, SHA-bound
   approval.

   NOT BUMPED FOR THE 2026-10-01 BOOKSHELF CARD. assets/icons/bookshelf.webp joins SHELL
   (the hub's fifth card, linking to Reading Tree at /reading/), but v7 has never been
   published -- live /word-book/ served word-book-v5 when this was written -- so v7 is
   already ahead of live and one unpublished version is enough, the same reasoning as the
   2026-09-22 word clips above.

   v7 -> v8, 2026-10-02: letters C and D are enabled (data/letters.json), owner, verbatim:
   "today's goal : i want C and D to be finished." 47 C/D pictures, 7 C/D word clips, the
   new click card's sentence clip and data/dictionary.json all change under unchanged URLs
   -- coordination/tasks/2026-10-02-0812-claude-wordbook-cd-release.md. v7 was never
   published either, so this is belt and braces: it marks the C/D candidate as its own
   cache generation. A worker bump only; this arms a release candidate but does not
   publish it -- production publish still needs the owner's separate, SHA-bound approval.

   v8 -> v9, 2026-10-07: letters A-H (owner, verbatim: "I think we can promote until H to
   main hub."). E-H are enabled in data/letters.json, and A-H pick up the held work from
   agent/wordbook-next-0930: the owner's v4 word clips (47/47 picks), sentence clips, card
   art fixes (globe, hundred, five's finished crown) and the Thai corrections (goal ->
   ประตูฟุตบอล) -- coordination/tasks/2026-10-07-1700-claude-wordbook-release-ah.md. The
   Grammar Game is HELD ("Letters only (Recommended)"): its files are [private] in
   .publish-manifest, so they are NOT in SHELL either -- cache.addAll() rejects on one 404
   and the whole install would fail. data/features.json ({"grammar": false}, the gate
   index.html reads) joins SHELL so the card stays hidden offline too, and
   tap-zoom-guard.js joins SHELL because index.html and
   dictionary.html now load it (INTERACTION-DIRECTION.md method C). A worker bump only;
   this arms a release candidate but does not publish it -- production publish still needs
   the owner's separate, SHA-bound approval.
   v9 -> v10, 2026-10-08: letters A-N (owner, verbatim: "word book -> approved the new
   changes, so pls publish until N"; "Everything on Test Hub"). I-N enabled in
   data/letters.json; Word Groups, the night room label bubbles and the Grammar Game ship
   (data/features.json grammar true; the game's html/css/js/questions/rendered.json join
   SHELL, its pictures and clips are cached on first use). L and N voice picks, the 8 Oct
   card redraws. A worker bump only; this arms a release candidate but does not publish it
   -- production publish still needs the owner's separate, SHA-bound approval.
   v11 -> v12, 2026-10-13: letters O-Z complete the alphabet -- data/letters.json enables
   all 26 letters. Owner, verbatim: "puzzle card -> approved. can we have it on live next?
   this time we'll have all the letter live." Ships the approved puzzle.thinking-game picture.
   A worker bump arms the release; production publish still needs the owner's SHA-bound
   approval.
   v12 -> v13, 2026-10-15: Posters mode, with only the 11 owner-approved posters live
   (data/posters.json `live`). Owner, verbatim: "pls put the approved ones on live (public
   main hub)". The other 28 posters stay on the Test Hub only. A worker bump arms the
   release; production publish still needs the owner's SHA-bound approval. */
/* v13 -> v14, 2026-10-15 afternoon: 11 more owner-approved posters go live (numbers 0-10
   and 11-20, first to tenth, meals, time, sizes, growing up, fruit stall, more fruits,
   vegetable garden with its new sign plate, animal band). Owner: "approve list".
   v14 -> v15, 2026-10-15: Dictionary Spell adds a separate control and a stable spelling.js
   URL. The 26 Alice letter clips share the range-aware cache-on-first-play path (not
   precached). A worker bump arms the release; publishing needs the owner's SHA approval.
   v15 -> v16, 2026-10-15: dictionary headwords never split inside a word. Visible long
   words shrink only as far as 70% to remain beside Hear and Spell; multi-word entries
   still wrap at spaces. A worker bump arms the release; publishing needs the owner's
   SHA-bound approval.
   v16 -> v17, 2026-10-15 (controller QA round 2): the headword takes its own full-width
   line at the top of the card body, and Hear + Spell move to a left-aligned row beneath
   it, unchanged in size. Sharing one row left the word a ~42px box at 768x1024 that
   clipped even at the 70% floor ("zebr", "zooke"). The shrink floor stays as a safety
   net only. A worker bump arms the release; publishing needs the owner's SHA-bound
   approval.
   v17 -> v18, 2026-10-17: the owner chose the calm Alice spelling-letter takes for E,
   G, O and Z; the other 22 letter clips stay unchanged. A worker bump arms the release;
   publishing needs the owner's SHA-bound approval.
   v18 -> v19, 2026-10-18: audio-wake.js joins SHELL (main, #1397).
   v19 -> v20, 2026-10-18: poster labels sit at their named objects' feet or bases, and
   the held "Where is it?" draft is split into two owner-fixed plates. Every poster plate
   and data/posters.json join SHELL so the complete poster catalogue remains available
   offline. A worker bump arms the release candidate; publishing still needs the owner's
   exact-SHA approval.
   v20 -> v21, 2026-10-21: one bundled Word Book candidate adds Coming Next 206 plus
   the later 79 poster words and final owner choices; Reading Tree 50 plus diamond.gem
   and Sparkling gems; and the latest older-style posters, label moves, ruler crop,
   retired combined Positions poster, and Find Picture Play hit boxes through round 2. */
const CACHE_NAME='word-book-v23';
const SHELL=['./','./index.html',
  "./audio-wake.js",'./dictionary.html','./fonts.css',
  './cg-back.css',
  './cg-update.js',
  './fonts/Nunito-latin.woff2','./fonts/Nunito-latin-ext.woff2','./fonts/FredokaOne-latin.woff2',
  './manifest.webmanifest','./data/dictionary.json','./data/letters.json','./data/features.json','./data/posters.json','./data/find-picture-bank.json','./word-audio.js','./spelling.js',
  './sentence-audio.js','./audio/sentences/rendered.json','./tap-zoom-guard.js','./grammar-game.html','./grammar-game.css','./grammar-game.js','./data/grammar-questions.json','./audio/grammar/rendered.json','./room-label.css','./room-label.js',
  './assets/icons/dictionary.webp','./assets/icons/spelling.webp',
  './assets/icons/writing-book.webp','./assets/icons/spelling-exam.webp',
  './assets/icons/bookshelf.webp','./assets/backdrop.webp','./assets/room-plate.webp',
  './assets/word-groups/actions.webp','./assets/word-groups/feelings-emotions.webp',
  './assets/word-groups/colours.webp','./assets/word-groups/shapes-sizes.webp',
  './assets/word-groups/describing-words.webp','./assets/word-groups/numbers-amounts.webp',
  './assets/word-groups/time.webp','./assets/word-groups/position-direction.webp',
  './assets/word-groups/people-family.webp','./assets/word-groups/body-senses.webp',
  './assets/word-groups/health-care.webp','./assets/word-groups/food-drink.webp',
  './assets/word-groups/clothes.webp','./assets/word-groups/home.webp',
  './assets/word-groups/school-learning.webp','./assets/word-groups/places.webp',
  './assets/word-groups/jobs-helpers.webp','./assets/word-groups/toys-games.webp',
  './assets/word-groups/sports-movement.webp','./assets/word-groups/music-art.webp',
  './assets/word-groups/technology-tools.webp','./assets/word-groups/transport.webp',
  './assets/word-groups/animals.webp','./assets/word-groups/nature-plants.webp',
  './assets/word-groups/weather.webp','./assets/word-groups/space.webp',
  './assets/word-groups/materials-textures.webp',
  './assets/posters/numbers-0-10.webp','./assets/posters/numbers-11-20.webp',
  './assets/posters/ordinals.webp','./assets/posters/solar-system.webp',
  './assets/posters/months.webp','./assets/posters/weekdays.webp','./assets/posters/seasons.webp',
  './assets/posters/rainbow.webp','./assets/posters/day.webp','./assets/posters/meals.webp',
  './assets/posters/time-units.webp','./assets/posters/sizes.webp','./assets/posters/growing-up.webp',
  './assets/posters/story-order.webp',
  './assets/posters/positions-1.webp','./assets/posters/positions-2.webp',
  './audio/posters/positions/on.m4a','./audio/posters/positions/in.m4a',
  './audio/posters/positions/under.m4a','./audio/posters/positions/over.m4a',
  './audio/posters/positions/beside.m4a','./audio/posters/positions/between.m4a',
  './audio/posters/positions/above.m4a','./audio/posters/positions/below.m4a',
  './audio/posters/positions/inside.m4a','./audio/posters/positions/outside.m4a',
  './audio/posters/positions/behind.m4a',
  './audio/posters/find-picture/intro.m4a','./audio/posters/find-picture/carrier.m4a',
  './audio/posters/find-picture/try-again.m4a','./audio/posters/find-picture/listen-again.m4a',
  './audio/posters/find-picture/reveal.m4a','./audio/posters/find-picture/complete.m4a',
  /* POSTER_SENTENCES_START */
  './audio/posters/sentences/diamond.gem.m4a','./audio/posters/sentences/pearl.shell-gem.m4a','./audio/posters/sentences/crystal.mineral-form.m4a',
  './audio/posters/sentences/gold.metal.m4a','./audio/posters/sentences/silver.metal.m4a','./audio/posters/sentences/treasure.valuable-things.m4a',
  './audio/posters/sentences/gem.beautiful-cut-stone.m4a','./audio/posters/sentences/amber.hardened-tree-gold.m4a','./audio/posters/sentences/amethyst.purple-quartz.m4a',
  './audio/posters/sentences/geode.hollow-crystal-rock.m4a','./audio/posters/sentences/mineral.natural-solid-material.m4a',
  './audio/posters/sentences/adult.grown-person.m4a','./audio/posters/sentences/aeroplane.flying-vehicle.m4a','./audio/posters/sentences/afternoon.after-noon.m4a','./audio/posters/sentences/ambulance.medical-vehicle-v2.m4a',
  './audio/posters/sentences/ambulance.medical-vehicle.m4a','./audio/posters/sentences/angry.feeling-cross.m4a','./audio/posters/sentences/ant.insect-v2.m4a','./audio/posters/sentences/ant.insect.m4a',
  './audio/posters/sentences/apple.fruit.m4a','./audio/posters/sentences/apron.protective-clothing.m4a','./audio/posters/sentences/arm.body-part.m4a','./audio/posters/sentences/astronaut.space-traveller.m4a',
  './audio/posters/sentences/atlas.map-book.m4a','./audio/posters/sentences/attic.roof-space.m4a','./audio/posters/sentences/aubergine.vegetable-v2.m4a','./audio/posters/sentences/aubergine.vegetable.m4a',
  './audio/posters/sentences/aunt.family-role-v2.m4a','./audio/posters/sentences/aunt.family-role.m4a','./audio/posters/sentences/autumn.season.m4a','./audio/posters/sentences/avocado.fruit.m4a',
  './audio/posters/sentences/baby.very-young-child.m4a','./audio/posters/sentences/backpack.back-carried-bag.m4a','./audio/posters/sentences/baker.occupation.m4a','./audio/posters/sentences/banana.fruit.m4a',
  './audio/posters/sentences/basement.underground-room.m4a','./audio/posters/sentences/bathroom.room.m4a','./audio/posters/sentences/bear.animal.m4a','./audio/posters/sentences/bedroom.room.m4a',
  './audio/posters/sentences/bee.insect-v2.m4a','./audio/posters/sentences/bee.insect.m4a','./audio/posters/sentences/beetle.insect-v2.m4a','./audio/posters/sentences/beetle.insect.m4a',
  './audio/posters/sentences/beginning.start.m4a','./audio/posters/sentences/bell.ringing-instrument.m4a','./audio/posters/sentences/belt.clothing.m4a','./audio/posters/sentences/bicycle.pedal-vehicle-v2.m4a',
  './audio/posters/sentences/bicycle.pedal-vehicle.m4a','./audio/posters/sentences/big.large-size.m4a','./audio/posters/sentences/blackboard.writing-board-v3.m4a','./audio/posters/sentences/blackboard.writing-board.m4a',
  './audio/posters/sentences/blue.colour.m4a',
  './audio/posters/sentences/blueberry.fruit.m4a','./audio/posters/sentences/boat.water-vehicle.m4a','./audio/posters/sentences/book.reading-object.m4a','./audio/posters/sentences/bookmark.page-marker.m4a',
  './audio/posters/sentences/boot.footwear.m4a','./audio/posters/sentences/bored.not-interested.m4a','./audio/posters/sentences/bow.ribbon-knot.m4a','./audio/posters/sentences/bowl.dish-v2.m4a',
  './audio/posters/sentences/bowl.dish.m4a','./audio/posters/sentences/boy.young-person.m4a','./audio/posters/sentences/bracelet.jewellery.m4a','./audio/posters/sentences/brother.family-role.m4a',
  './audio/posters/sentences/builder.occupation.m4a','./audio/posters/sentences/bus.road-vehicle-v2.m4a','./audio/posters/sentences/bus.road-vehicle.m4a','./audio/posters/sentences/butterfly.insect.m4a',
  './audio/posters/sentences/cabbage.vegetable.m4a','./audio/posters/sentences/calm.not-upset.m4a','./audio/posters/sentences/cap.headwear.m4a','./audio/posters/sentences/car.road-vehicle-v2.m4a',
  './audio/posters/sentences/car.road-vehicle.m4a','./audio/posters/sentences/carrot.vegetable.m4a','./audio/posters/sentences/cat.animal-v2.m4a','./audio/posters/sentences/cat.animal.m4a',
  './audio/posters/sentences/caterpillar.insect-larva-v2.m4a','./audio/posters/sentences/caterpillar.insect-larva.m4a','./audio/posters/sentences/cauliflower.vegetable.m4a','./audio/posters/sentences/chalk.writing-material.m4a',
  './audio/posters/sentences/cheek.body-part.m4a','./audio/posters/sentences/chef.occupation.m4a','./audio/posters/sentences/cherry.fruit-v2.m4a','./audio/posters/sentences/cherry.fruit.m4a',
  './audio/posters/sentences/chicken.animal-v2.m4a','./audio/posters/sentences/child.young-person.m4a','./audio/posters/sentences/chilli.food-v2.m4a','./audio/posters/sentences/chilli.food.m4a',
  './audio/posters/sentences/chin.body-part.m4a','./audio/posters/sentences/chopsticks.eating-tool.m4a','./audio/posters/sentences/circle.shape.m4a','./audio/posters/sentences/clean.not-dirty.m4a',
  './audio/posters/sentences/cloud.sky-water.m4a','./audio/posters/sentences/coat.clothing.m4a','./audio/posters/sentences/coconut.fruit-v2.m4a','./audio/posters/sentences/coconut.fruit.m4a',
  './audio/posters/sentences/cold.low-temperature.m4a','./audio/posters/sentences/cone.solid-shape.m4a','./audio/posters/sentences/cooker.cooking-appliance.m4a','./audio/posters/sentences/corn.food.m4a',
  './audio/posters/sentences/costume.dress-up-clothes.m4a','./audio/posters/sentences/cousin.family-role.m4a','./audio/posters/sentences/cow.animal-v2.m4a','./audio/posters/sentences/crab.animal-v2.m4a',
  './audio/posters/sentences/crayon.colouring-tool-v2.m4a','./audio/posters/sentences/crayon.colouring-tool.m4a','./audio/posters/sentences/crown.royal-headwear.m4a','./audio/posters/sentences/cube.solid-shape.m4a',
  './audio/posters/sentences/cucumber.food.m4a','./audio/posters/sentences/cup.drinking-container.m4a','./audio/posters/sentences/curious.wanting-to-discover.m4a','./audio/posters/sentences/cylinder.solid-shape.m4a',
  './audio/posters/sentences/dad.father-informal-v2.m4a','./audio/posters/sentences/dad.father-informal.m4a','./audio/posters/sentences/daughter.family-role.m4a','./audio/posters/sentences/day.twenty-four-hours.m4a',
  './audio/posters/sentences/dentist.occupation.m4a','./audio/posters/sentences/desk.work-table.m4a','./audio/posters/sentences/diamond.shape.m4a','./audio/posters/sentences/dictionary.word-reference.m4a',
  './audio/posters/sentences/dinner.main-evening-meal.m4a','./audio/posters/sentences/dirty.not-clean.m4a','./audio/posters/sentences/dishwasher.appliance.m4a','./audio/posters/sentences/doctor.occupation.m4a',
  './audio/posters/sentences/dog.animal-v2.m4a','./audio/posters/sentences/dog.animal.m4a','./audio/posters/sentences/dolphin.animal.m4a','./audio/posters/sentences/donkey.animal.m4a',
  './audio/posters/sentences/down.towards-a-lower-place-v2.m4a','./audio/posters/sentences/down.towards-a-lower-place.m4a','./audio/posters/sentences/dragonfly.insect-v2.m4a','./audio/posters/sentences/dragonfly.insect.m4a',
  './audio/posters/sentences/dress.clothing.m4a','./audio/posters/sentences/driver.occupation-v2.m4a','./audio/posters/sentences/driver.occupation.m4a','./audio/posters/sentences/ear.body-part.m4a',
  './audio/posters/sentences/earth.our-planet.m4a','./audio/posters/sentences/eight.number.m4a','./audio/posters/sentences/eighteen.number.m4a','./audio/posters/sentences/elbow.body-part.m4a',
  './audio/posters/sentences/elephant.animal.m4a','./audio/posters/sentences/eleven.number.m4a','./audio/posters/sentences/empty.containing-nothing.m4a','./audio/posters/sentences/end.finish-an-activity.m4a',
  './audio/posters/sentences/eraser.rubbing-tool.m4a','./audio/posters/sentences/evening.late-day.m4a','./audio/posters/sentences/excited.eager-and-happy.m4a','./audio/posters/sentences/eye.body-part.m4a',
  './audio/posters/sentences/eyebrow.body-part.m4a','./audio/posters/sentences/face.body-part.m4a','./audio/posters/sentences/family.relatives-v2.m4a','./audio/posters/sentences/family.relatives.m4a',
  './audio/posters/sentences/farmer.occupation.m4a','./audio/posters/sentences/fifteen.number.m4a','./audio/posters/sentences/fifth.order-five.m4a','./audio/posters/sentences/finger.body-part.m4a',
  './audio/posters/sentences/fire-engine.emergency-vehicle-v2.m4a','./audio/posters/sentences/fire-engine.emergency-vehicle.m4a','./audio/posters/sentences/firefighter.occupation.m4a','./audio/posters/sentences/first.order-one.m4a',
  './audio/posters/sentences/fish.animal-v2.m4a','./audio/posters/sentences/five.number.m4a','./audio/posters/sentences/flute.instrument.m4a','./audio/posters/sentences/fly.insect.m4a',
  './audio/posters/sentences/fog.weather.m4a','./audio/posters/sentences/foot.body-part.m4a','./audio/posters/sentences/fork.eating-tool.m4a','./audio/posters/sentences/four.number.m4a',
  './audio/posters/sentences/fourteen.number.m4a','./audio/posters/sentences/fourth.order-four.m4a','./audio/posters/sentences/fox.animal.m4a','./audio/posters/sentences/friday.weekday.m4a',
  './audio/posters/sentences/fridge.cool-storage.m4a','./audio/posters/sentences/full.containing-all-it-can-v2.m4a','./audio/posters/sentences/full.containing-all-it-can.m4a','./audio/posters/sentences/garage.car-building.m4a',
  './audio/posters/sentences/garden.growing-space.m4a','./audio/posters/sentences/garlic.food-v2.m4a','./audio/posters/sentences/garlic.food.m4a','./audio/posters/sentences/ginger.food-v2.m4a',
  './audio/posters/sentences/ginger.food.m4a','./audio/posters/sentences/giraffe.animal-v2.m4a','./audio/posters/sentences/giraffe.animal-v3.m4a','./audio/posters/sentences/girl.young-person-v2.m4a',
  './audio/posters/sentences/girl.young-person.m4a',
  './audio/posters/sentences/glasses.eyewear.m4a','./audio/posters/sentences/glove.clothing.m4a','./audio/posters/sentences/glue.sticky-material.m4a','./audio/posters/sentences/goat.animal-v2.m4a',
  './audio/posters/sentences/grandfather.family-role.m4a','./audio/posters/sentences/grandmother.family-role.m4a','./audio/posters/sentences/grape.fruit.m4a','./audio/posters/sentences/grasshopper.insect.m4a',
  './audio/posters/sentences/green.colour.m4a','./audio/posters/sentences/guava.fruit-v2.m4a','./audio/posters/sentences/guava.fruit.m4a','./audio/posters/sentences/guitar.instrument.m4a',
  './audio/posters/sentences/hair.body-covering.m4a','./audio/posters/sentences/hallway.passage-v2.m4a','./audio/posters/sentences/hallway.passage.m4a','./audio/posters/sentences/hand.body-part.m4a',
  './audio/posters/sentences/happy.pleased.m4a','./audio/posters/sentences/harp.instrument.m4a','./audio/posters/sentences/hat.headwear.m4a','./audio/posters/sentences/head.body-part.m4a',
  './audio/posters/sentences/helicopter.flying-vehicle.m4a','./audio/posters/sentences/helmet.protective-headwear.m4a','./audio/posters/sentences/hexagon.shape.m4a','./audio/posters/sentences/horse.animal-v2.m4a',
  './audio/posters/sentences/hot.high-temperature.m4a','./audio/posters/sentences/hour.time-unit.m4a','./audio/posters/sentences/house.building.m4a','./audio/posters/sentences/huge.very-big.m4a',
  './audio/posters/sentences/jacket.clothing.m4a','./audio/posters/sentences/jackfruit.fruit.m4a','./audio/posters/sentences/jellyfish.animal.m4a','./audio/posters/sentences/jumper.clothing-v2.m4a',
  './audio/posters/sentences/jumper.clothing.m4a','./audio/posters/sentences/jupiter.planet.m4a','./audio/posters/sentences/kangaroo.animal.m4a','./audio/posters/sentences/kettle.water-container.m4a',
  './audio/posters/sentences/kitchen.room.m4a','./audio/posters/sentences/kiwi.fruit.m4a','./audio/posters/sentences/knee.body-part.m4a','./audio/posters/sentences/knife.cutting-tool.m4a',
  './audio/posters/sentences/koala.animal-v2.m4a','./audio/posters/sentences/koala.animal.m4a','./audio/posters/sentences/large.big-size.m4a','./audio/posters/sentences/leg.body-part.m4a',
  './audio/posters/sentences/lemon.fruit-v2.m4a','./audio/posters/sentences/lemon.fruit.m4a','./audio/posters/sentences/lettuce.vegetable.m4a','./audio/posters/sentences/librarian.occupation.m4a',
  './audio/posters/sentences/lime.fruit.m4a','./audio/posters/sentences/lion.animal-v2.m4a','./audio/posters/sentences/lion.animal.m4a','./audio/posters/sentences/little.small-size.m4a',
  './audio/posters/sentences/living-room.room.m4a','./audio/posters/sentences/lonely.sad-to-be-alone-v2.m4a','./audio/posters/sentences/lonely.sad-to-be-alone.m4a','./audio/posters/sentences/longan.fruit-v2.m4a',
  './audio/posters/sentences/longan.fruit.m4a','./audio/posters/sentences/lorry.large-goods-vehicle-v2.m4a','./audio/posters/sentences/lorry.large-goods-vehicle.m4a','./audio/posters/sentences/lunch.midday-meal.m4a',
  './audio/posters/sentences/lychee.fruit-v2.m4a','./audio/posters/sentences/lychee.fruit.m4a','./audio/posters/sentences/mango.fruit-v2.m4a','./audio/posters/sentences/mango.fruit.m4a',
  './audio/posters/sentences/mangosteen.fruit.m4a','./audio/posters/sentences/marker.writing-tool-v2.m4a','./audio/posters/sentences/marker.writing-tool.m4a','./audio/posters/sentences/mars.planet.m4a',
  './audio/posters/sentences/melon.fruit-v2.m4a','./audio/posters/sentences/melon.fruit.m4a','./audio/posters/sentences/mercury.planet.m4a','./audio/posters/sentences/microwave.cooking-appliance.m4a',
  './audio/posters/sentences/middle.central-part.m4a','./audio/posters/sentences/minute.time-unit.m4a','./audio/posters/sentences/monday.weekday.m4a','./audio/posters/sentences/monkey.animal-v2.m4a',
  './audio/posters/sentences/month.calendar-period.m4a','./audio/posters/sentences/morning.early-day.m4a','./audio/posters/sentences/moth.insect-v2.m4a','./audio/posters/sentences/moth.insect.m4a',
  './audio/posters/sentences/motorbike.motor-vehicle-v2.m4a','./audio/posters/sentences/motorbike.motor-vehicle.m4a','./audio/posters/sentences/mouse.animal-v2.m4a','./audio/posters/sentences/mouse.animal.m4a',
  './audio/posters/sentences/mouth.body-part.m4a','./audio/posters/sentences/mug.drinking-container.m4a','./audio/posters/sentences/mum.mother-informal-v2.m4a','./audio/posters/sentences/mum.mother-informal.m4a',
  './audio/posters/sentences/necklace.jewellery.m4a','./audio/posters/sentences/neptune.planet.m4a','./audio/posters/sentences/night.dark-part-of-day.m4a','./audio/posters/sentences/nine.number.m4a',
  './audio/posters/sentences/nineteen.number.m4a','./audio/posters/sentences/nose.body-part.m4a','./audio/posters/sentences/notebook.writing-book.m4a','./audio/posters/sentences/nurse.occupation.m4a',
  './audio/posters/sentences/octopus.animal-v2.m4a','./audio/posters/sentences/one.number.m4a','./audio/posters/sentences/onion.vegetable.m4a','./audio/posters/sentences/orange.colour.m4a',
  './audio/posters/sentences/orange.fruit-v2.m4a','./audio/posters/sentences/orange.fruit.m4a','./audio/posters/sentences/oval.shape.m4a','./audio/posters/sentences/panda.animal-v2.m4a',
  './audio/posters/sentences/paper.material.m4a','./audio/posters/sentences/pea.food.m4a','./audio/posters/sentences/pear.fruit.m4a','./audio/posters/sentences/pen.writing-tool.m4a',
  './audio/posters/sentences/pencil-case.stationery-container.m4a','./audio/posters/sentences/pencil.writing-tool.m4a','./audio/posters/sentences/pepper.vegetable.m4a','./audio/posters/sentences/piano.instrument.m4a',
  './audio/posters/sentences/pig.animal-v2.m4a','./audio/posters/sentences/potato.vegetable.m4a','./audio/posters/sentences/pumpkin.food-v2.m4a','./audio/posters/sentences/rain.weather.m4a',
  './audio/posters/sentences/rainbow.sky-colours.m4a','./audio/posters/sentences/rectangle.shape.m4a','./audio/posters/sentences/red.colour.m4a','./audio/posters/sentences/ruler.measuring-tool.m4a',
  './audio/posters/sentences/sad.unhappy.m4a','./audio/posters/sentences/saturday.weekday.m4a','./audio/posters/sentences/saturn.planet.m4a','./audio/posters/sentences/scared.frightened.m4a',
  './audio/posters/sentences/scarf.clothing.m4a','./audio/posters/sentences/scissors.cutting-tool.m4a','./audio/posters/sentences/seahorse.animal-v2.m4a','./audio/posters/sentences/seahorse.animal.m4a',
  './audio/posters/sentences/second.order-two.m4a','./audio/posters/sentences/second.time-unit.m4a','./audio/posters/sentences/seven.number.m4a','./audio/posters/sentences/seventeen.number.m4a',
  './audio/posters/sentences/seventh.order-seven.m4a','./audio/posters/sentences/sharpener.pencil-tool-v2.m4a','./audio/posters/sentences/sharpener.pencil-tool.m4a','./audio/posters/sentences/shirt.clothing.m4a',
  './audio/posters/sentences/shoe.footwear.m4a','./audio/posters/sentences/shorts.clothing.m4a','./audio/posters/sentences/shoulder.body-part.m4a','./audio/posters/sentences/shrimp.animal-v2.m4a',
  './audio/posters/sentences/shrimp.animal.m4a','./audio/posters/sentences/shy.not-confident-with-people.m4a','./audio/posters/sentences/six.number.m4a','./audio/posters/sentences/sixteen.number.m4a',
  './audio/posters/sentences/sixth.order-six.m4a','./audio/posters/sentences/skirt.clothing.m4a','./audio/posters/sentences/small.little-size.m4a','./audio/posters/sentences/snail.animal-v2.m4a',
  './audio/posters/sentences/snail.animal.m4a','./audio/posters/sentences/snow.weather.m4a','./audio/posters/sentences/sock.clothing.m4a','./audio/posters/sentences/sphere.solid-shape.m4a',
  './audio/posters/sentences/spider.animal-v2.m4a','./audio/posters/sentences/spinach.vegetable.m4a','./audio/posters/sentences/spring-onion.vegetable-v2.m4a','./audio/posters/sentences/spring-onion.vegetable.m4a',
  './audio/posters/sentences/spring.season.m4a','./audio/posters/sentences/square.square-shaped.m4a','./audio/posters/sentences/starfish.animal.m4a','./audio/posters/sentences/storm.rough-weather.m4a',
  './audio/posters/sentences/strawberry.fruit.m4a','./audio/posters/sentences/summer.season.m4a','./audio/posters/sentences/sun.our-star.m4a','./audio/posters/sentences/sunday.weekday.m4a',
  './audio/posters/sentences/surprised.not-expecting.m4a','./audio/posters/sentences/sweet-potato.vegetable.m4a','./audio/posters/sentences/tambourine.instrument.m4a','./audio/posters/sentences/teenager.young-person.m4a',
  './audio/posters/sentences/ten.number.m4a','./audio/posters/sentences/tenth.order-ten.m4a','./audio/posters/sentences/third.order-three.m4a','./audio/posters/sentences/thirteen.number.m4a',
  './audio/posters/sentences/three.number.m4a','./audio/posters/sentences/thursday.weekday.m4a','./audio/posters/sentences/tiny.very-small.m4a','./audio/posters/sentences/tired.needing-rest.m4a',
  './audio/posters/sentences/toe.body-part.m4a','./audio/posters/sentences/tomato.food-v2.m4a','./audio/posters/sentences/tomato.food.m4a','./audio/posters/sentences/tractor.farm-vehicle-v2.m4a',
  './audio/posters/sentences/tractor.farm-vehicle.m4a','./audio/posters/sentences/triangle.shape.m4a','./audio/posters/sentences/trousers.clothing.m4a','./audio/posters/sentences/trumpet.instrument.m4a',
  './audio/posters/sentences/tuesday.weekday.m4a','./audio/posters/sentences/tummy.stomach-informal.m4a','./audio/posters/sentences/twelve.number.m4a','./audio/posters/sentences/twenty.number.m4a',
  './audio/posters/sentences/two.number.m4a','./audio/posters/sentences/up.towards-a-higher-place-v2.m4a','./audio/posters/sentences/up.towards-a-higher-place.m4a','./audio/posters/sentences/uranus.planet.m4a',
  './audio/posters/sentences/venus.planet.m4a','./audio/posters/sentences/watermelon.fruit.m4a','./audio/posters/sentences/wednesday.weekday.m4a','./audio/posters/sentences/week.seven-days.m4a',
  './audio/posters/sentences/whale.animal.m4a','./audio/posters/sentences/wind.moving-air.m4a','./audio/posters/sentences/winter.season.m4a','./audio/posters/sentences/wolf.animal-v2.m4a',
  './audio/posters/sentences/wolf.animal-v3.m4a',
  './audio/posters/sentences/year.twelve-months.m4a','./audio/posters/sentences/yellow.colour.m4a','./audio/posters/sentences/zebra.animal-v2.m4a','./audio/posters/sentences/zebra.animal.m4a',
  './audio/posters/sentences/zero.number.m4a',
  /* POSTER_SENTENCES_END */
  './assets/posters/fruit-stall.webp','./assets/posters/more-fruits.webp',
  './assets/posters/vegetable-garden.webp','./assets/posters/more-vegetables.webp',
  './assets/posters/farm.webp','./assets/posters/wild-animals.webp','./assets/posters/sea.webp',
  './assets/posters/bugs.webp','./assets/posters/feelings.webp','./assets/posters/school-desk.webp',
  './assets/posters/pencil-case.webp','./assets/posters/washing-line.webp',
  './assets/posters/dressing-up.webp','./assets/posters/face.webp','./assets/posters/body.webp',
  './assets/posters/family.webp','./assets/posters/helpers.webp',
  './assets/posters/things-that-go.webp','./assets/posters/rooms-house.webp',
  './assets/posters/kitchen.webp','./assets/posters/opposites.webp','./assets/posters/shapes.webp',
  './assets/posters/weather.webp','./assets/posters/animal-band.webp','./assets/posters/gems.webp'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(SHELL)));self.skipWaiting();});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('word-book-v')&&k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
/* THE SPOKEN WORDS (audio/words/*.m4a, 2,020 clips, 26 MB) -- cached on first play,
   never precached. Precaching 26 MB on install to serve taps that may never come is the
   wrong trade, the same call .publish-manifest makes for the pictures and the Space Hub
   made for its bed.

   Why they need their own branch: an <audio> element asks with `Range: bytes=0-`, the
   server answers 206, and cache.put() REJECTS a 206 -- so the plain handler below would
   never cache a clip and would throw inside the worker on every tap (animal-book's and
   coloring-app's workers record the same finding). Here the worker fetches the WHOLE
   file with no Range header (a clean 200, ~13 KB), keeps that, and answers the element's
   range from it as a proper 206, which is what Safari's media stack insists on.

   OFFLINE CONSEQUENCE, stated plainly: a word the child has heard once while online
   plays offline afterwards. A word never played while online cannot play offline -- the
   fetch fails, the element errors, and the page shows the speaker's "missed" face (a
   shake and a cross) instead of doing nothing. A new CACHE_NAME drops the heard clips
   with the rest of the old cache; they refill as words are tapped again.

   THE SPOKEN SENTENCES (audio/sentences/<sense>.m4a, owner spec 2026-09-22) take the
   SAME branch for the same reason: an <audio> range request, cached whole on first play
   under this app's own CACHE_NAME, never precached. Only their small ledger,
   audio/sentences/rendered.json, is in SHELL -- it is what tells the page which cards
   may show a sentence speaker, so it must be there offline like data/dictionary.json.
   tools/check-sentence-audio.mjs fails if a sentence clip ever joins SHELL or leaves
   this branch. The offline consequence is the words' exactly: a sentence heard once
   plays offline; one never heard shows the missed face. */
function wordClip(request){
  const whole=new Request(request.url);
  return caches.open(CACHE_NAME).then(cache=>cache.match(whole).then(hit=>hit||fetch(whole).then(r=>{
    if(r.status===200&&r.type==='basic')cache.put(whole,r.clone()).catch(()=>{});
    return r;
  }))).then(full=>{
    const range=request.headers.get('range');
    const m=range&&/^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if(!m||full.status!==200||(m[1]===''&&m[2]===''))return full;
    return full.arrayBuffer().then(buf=>{
      const size=buf.byteLength;
      let start,end;
      if(m[1]===''){start=Math.max(0,size-Number(m[2]));end=size-1;}
      else{start=Number(m[1]);end=m[2]===''?size-1:Math.min(Number(m[2]),size-1);}
      if(start>=size||start>end)return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+size}});
      return new Response(buf.slice(start,end+1),{status:206,statusText:'Partial Content',headers:{
        'Content-Type':full.headers.get('Content-Type')||'audio/mp4',
        'Content-Range':'bytes '+start+'-'+end+'/'+size,
        'Content-Length':String(end-start+1),'Accept-Ranges':'bytes'}});
    });
  });
}
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  if(url.origin===location.origin&&(url.pathname.indexOf('/audio/words/')>-1||url.pathname.indexOf('/audio/sentences/')>-1||url.pathname.indexOf('/audio/letters/')>-1)&&url.pathname.endsWith('.m4a')){
    e.respondWith(wordClip(e.request));return;
  }
  /* status===200, not r.ok: ok includes 206, which cache.put() rejects (the hub's bed is
     a ranged <audio> fetch and used to throw here on every play). */
  e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{if(r.status===200&&url.origin===location.origin){const copy=r.clone();caches.open(CACHE_NAME).then(c=>c.put(e.request,copy));}return r;})));
});
