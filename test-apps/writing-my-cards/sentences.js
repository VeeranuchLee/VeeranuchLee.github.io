/* Writing Book — one sentence per word.
 *
 * Owner request, 2026-08-27: "add the icon to click such that children can hear
 * how it word in the picture is used to explain the picture in a sentence."
 *
 * EACH SENTENCE DESCRIBES THAT WORD'S OWN PICTURE, and uses the word. That is the
 * whole rule and it is what makes the feature worth its audio: a child who cannot
 * yet read "on" can see a cat on a box and hear "The grey cat sits ON TOP of the
 * brown box". The picture is the definition.
 *
 * The owner wrote the first three by hand as the pattern to follow --
 *   the:  The orange cat sits on the green rug.
 *   at:   The boy sits at his desk to study.
 *   in:   The little grey cat is sitting in a cardboard box.
 * -- and the remaining 97 were written against the pictures and read back before a
 * single credit was spent. Approved as written, 2026-08-27.
 *
 * THE WORD MUST APPEAR IN ITS OWN SENTENCE. `want` first read "The girl wants a
 * cookie" and was rewritten: the word a child hears has to be the word they are
 * tracing, not a form of it. tools/apply-sentences.py enforces that.
 *
 * `on` and `in` deliberately share a cat and a box. Same objects, different
 * preposition, which is the only way a picture can teach the difference.
 *
 * This file is NOT generated. words.js is -- by tools/slice-word-cards.py -- so the
 * sentences live apart from it and a re-slice cannot wipe them.
 */
(function (global) {
  'use strict';

  var SENTENCES = {
    /* level 1 */
    "i":      "I am the boy in the green striped shirt.",
    "a":      "A big red apple sits on the table.",
    "the":    "The orange cat sits on the green rug.",
    "is":     "The orange cat is sitting up very straight.",
    "it":     "It is a big beach ball with bright stripes.",
    "in":     "The little grey cat is sitting in a cardboard box.",
    "on":     "The grey cat sits on top of the brown box.",
    "at":     "The boy sits at his desk to study.",
    "my":     "My teddy bear is soft and brown, says the girl.",
    "me":     "Look at me, says the girl in the pink shirt.",

    /* level 2 */
    "cat":    "The orange cat sits quietly on a purple mat.",
    "dog":    "The golden dog sits and waits with his red collar.",
    "pig":    "The pink pig stands in the soft brown mud.",
    "hen":    "The brown hen sits on the yellow straw.",
    "fox":    "The orange fox sits up on the green grass.",
    "bug":    "The little bug rests on a green leaf.",
    "sun":    "The sun smiles high in the blue sky.",
    "hat":    "The blue hat has a yellow band around it.",
    "bed":    "The bed has a blue blanket covered in stars.",
    "cup":    "The blue cup with white spots is full of warm milk.",

    /* level 3 */
    "can":    "The can is round and made of shiny metal.",
    "run":    "The boy can run very fast in his blue shoes.",
    "sit":    "The girl likes to sit on the floor with her legs crossed.",
    "hop":    "The little rabbit likes to hop through the grass.",
    "get":    "The girl will get a blue present with a red bow.",
    "big":    "The elephant is very big and grey.",
    "red":    "The apple is bright red and shiny.",
    "hot":    "The soup in the blue bowl is too hot to eat.",
    "wet":    "The rain falls on the umbrella and makes the ground wet.",
    "fun":    "Going down the slide together is so much fun.",

    /* level 4 */
    "mom":    "My mom has a kind smile and a pink jumper.",
    "dad":    "My dad folds his arms and wears a green jumper.",
    "kid":    "The kid waves goodbye before he walks to school.",
    "man":    "The man is wearing a blue shirt and brown trousers.",
    "boy":    "The boy is wearing a green shirt and blue shorts.",
    "girl":   "The girl is wearing a pink dress and a pink hairband.",
    "bag":    "The green bag has a pink heart on the front.",
    "box":    "The box is made of plain brown cardboard.",
    "pen":    "The blue pen is ready to write.",
    "book":   "The blue book has a gold star on the cover.",

    /* level 5 */
    "and":    "A red apple and a yellow banana sit side by side.",
    "to":     "The boy follows the path all the way to school.",
    "you":    "The girl points her finger straight at you.",
    "we":     "We are two friends standing side by side.",
    "he":     "He is a boy with brown hair and a blue shirt.",
    "she":    "She is a girl with a flower on her purple shirt.",
    "this":   "This red book is the one the boy is holding.",
    "that":   "That little house is far away across the field.",
    "yes":    "The boy says yes and gives a thumbs up.",
    "no":     "The girl folds her arms and says no.",

    /* level 6 */
    "go":     "The red arrow tells the boy which way to go.",
    "see":    "The girl can see a butterfly flying above her.",
    "look":   "The boy uses a magnifying glass to look at a little plant.",
    "like":   "I like my teddy bear, says the happy girl.",
    "have":   "The boy is glad to have a big blue book.",
    "want":   "I want a cookie from that jar, says the girl.",
    "come":   "The boy opens his arms and says come here.",
    "play":   "The two children play together with a striped ball.",
    "eat":    "The boy takes a big bite to eat his apple.",
    "help":   "The girl bends down to help pick up the books.",

    /* level 7 */
    "fish":   "The orange fish swims along and blows tiny bubbles.",
    "bird":   "The blue bird sits on a branch with green leaves.",
    "duck":   "The white duck stands on the grass with orange feet.",
    "frog":   "The green frog sits on a round lily pad.",
    "cow":    "The black and white cow wears a little gold bell.",
    "pet":    "The boy hugs his pet puppy.",
    "ball":   "The ball has red, blue and yellow stripes.",
    "tree":   "The tree has a brown trunk and green leaves.",
    "car":    "The little red car has a happy smiling face.",
    "home":   "The little house with the white fence is a warm home.",

    /* level 8 */
    "one":    "There is one red apple on its own.",
    "two":    "There are two red apples together.",
    "three":  "There are three red apples on the table.",
    "up":     "The boy jumps up into the air with his arms high.",
    "down":   "The boy walks carefully down the grey steps.",
    "here":   "The girl points down and says put it here.",
    "there":  "The boy points at the little house over there.",
    "day":    "The sun shines in the blue sky all through the day.",
    "night":  "The moon and the stars come out at night.",
    "now":    "The girl points at the clock to show the time now.",

    /* level 9 */
    "walk":   "The boy goes for a slow walk in his green coat.",
    "jump":   "The girl can jump high with her arms in the air.",
    "stop":   "The red sign tells everyone to stop.",
    "open":   "The boy lifts the lid to open the blue box.",
    "read":   "The girl sits on the floor to read her book.",
    "write":  "The boy holds his pencil and starts to write.",
    "draw":   "The girl uses her crayons to draw a house and a tree.",
    "sing":   "The girl holds a microphone and begins to sing.",
    "sleep":  "The boy will sleep all night with his teddy bear.",
    "drink":  "The boy lifts the cup to drink some cold water.",

    /* level 10 */
    "was":    "The photograph shows how small the boy was.",
    "are":    "The two children are waving and smiling.",
    "for":    "The wrapped present is for the girl in the pink dress.",
    "of":     "A bowl of fruit sits beside a glass of milk.",
    "said":   "Hello, said the boy with a big smile.",
    "with":   "The girl sits on the floor with her teddy bear.",
    "from":   "The letter came all the way from the school.",
    "what":   "The boy scratches his chin and wonders what it is.",
    "where":  "The girl looks around and asks where it went.",
    "who":    "The boy wonders who is hiding in his thoughts.",
  };

  global.WritingSentences = {
    /* Undefined rather than empty for an unknown slug: the caller can then tell
       "no sentence" from "a sentence that is blank", and sound.js already treats a
       missing clip as a no-op. */
    of: function (slug) { return SENTENCES[slug]; },
    all: function () { return SENTENCES; },
    count: function () { return Object.keys(SENTENCES).length; }
  };
}(window));
