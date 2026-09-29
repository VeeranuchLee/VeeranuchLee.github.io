/* Number Whack — shared Space/Unicorn arcade shell. Rules and scoring stay in
 * TapWaitEngine; this adapter owns the painted cabinet, feedback and controls. */
(function (root) {
  "use strict";
  var React = root.React, Engine = root.TapWaitEngine;
  var h = React && React.createElement;
  if (!React || !h || !Engine) return;

  var SCREEN_TITLE = "Number Whack";
  /* Measured from the dark interiors in the 1024x768 painted boards.  These are
     image-space fractions, not an inferred grid: the paintings have perspective. */
  var HOLE_RECTS = {
    space: [
      [0.2266,0.2865,0.1445,0.0833],[0.4258,0.2865,0.1484,0.0833],[0.6328,0.2865,0.1406,0.0833],
      [0.1797,0.4375,0.1680,0.1302],[0.4141,0.4375,0.1719,0.1250],[0.6523,0.4271,0.1680,0.1354],
      [0.1367,0.6406,0.1914,0.1562],[0.4102,0.6354,0.1797,0.1562],[0.6719,0.6302,0.1875,0.1667]
    ],
    unicorn: [
      [0.2227,0.3021,0.1406,0.0990],[0.4297,0.3021,0.1406,0.1042],[0.6406,0.3021,0.1406,0.0990],
      [0.1836,0.4583,0.1602,0.1198],[0.4219,0.4583,0.1602,0.1198],[0.6562,0.4583,0.1602,0.1198],
      [0.1484,0.6406,0.1797,0.1458],[0.4102,0.6406,0.1797,0.1510],[0.6719,0.6406,0.1797,0.1458]
    ]
  };
  var PRESETS = [
    { id: "odd", label: "Odd", ruleText: "Whack the odd numbers!", hint: "Odd numbers have one left over.", glyph: "1  3  5", max: 20, test: function (n) { return n % 2 !== 0; } },
    { id: "even", label: "Even", ruleText: "Whack the even numbers!", hint: "Even numbers pair up neatly.", glyph: "2  4  6", max: 30, test: function (n) { return n % 2 === 0; } },
    { id: "greater", label: "Greater", ruleText: "Whack numbers greater than 15!", hint: "Look for numbers above 15.", glyph: "> 15", max: 40, test: function (n) { return n > 15; } },
    { id: "less", label: "Less", ruleText: "Whack numbers less than 16!", hint: "Look for numbers below 16.", glyph: "< 16", max: 50, test: function (n) { return n < 16; } }
  ];
  PRESETS.forEach(function (p) { p.pool = range(1, p.max); });

  function range(from, to) { var a = []; for (var n = from; n <= to; n++) a.push(n); return a; }
  function sound(name) { var s = root.Sound; if (s && typeof s[name] === "function") { try { s[name](); } catch (_) {} } }
  function critterCount(eventIndex) { return eventIndex < 3 ? 1 : eventIndex < 7 ? 2 : 3; }
  function makeConfig() {
    return {
      itemPool: PRESETS[0].pool, rule: PRESETS[0].test, ruleText: PRESETS[0].ruleText,
      roundLength: 12,
      spawn: { mode: "positions", slots: [0,1,2,3,4,5,6,7,8], count: critterCount, visibleMs: 4200, gapMs: 500 },
      difficultyLevels: PRESETS.map(function (p) { return { itemPool: p.pool, rule: p.test, ruleText: p.ruleText, ruleHint: p.hint }; }),
      scoring: { streak: true, basePoints: 10, waitPoints: 5, streakStep: 2, maxStreakBonus: 10 },
      feedback: {},
      audio: {
        show: function () { sound("hop"); },
        correct: function (p) { sound("ding"); if (p && p.streak > 1 && p.streak % 3 === 0) setTimeout(function () { sound("twinkle"); }, 160); },
        wrong: function () { sound("wrong"); },
        waited: function () { sound("hop"); },
        missed: function () { sound("wrong"); },
        roundEnd: function () { sound("celebrate"); }
      }
    };
  }

  function Game(props) {
    props = props || {};
    var useState = React.useState, useEffect = React.useEffect, useRef = React.useRef, useCallback = React.useCallback;
    var pair = useState(null), view = pair[0], setView = pair[1];
    var levelPair = useState(0), level = levelPair[0], setLevel = levelPair[1];
    var flashPair = useState(""), flash = flashPair[0], setFlash = flashPair[1];
    var gameRef = useRef(null), flashTimer = useRef(null), propsRef = useRef(props); propsRef.current = props;
    var signal = useCallback(function (kind) { setFlash(kind); clearTimeout(flashTimer.current); flashTimer.current = setTimeout(function () { setFlash(""); }, kind === "waited" ? 700 : 480); }, []);

    useEffect(function () {
      var game = new Engine.Game(makeConfig(), { seed: props.seed == null ? Date.now() : props.seed });
      gameRef.current = game;
      root.__tapWaitMathGame = game;
      /* Browser QA must exercise the real React click path without racing the
         randomized spawner.  This test-only hook pauses automatic timers and
         installs one exact event; production never calls it. */
      root.__tapWaitMathTest = {
        force: function (spec) {
          spec = spec || {};
          game.clearTimer();
          game.auto = false;
          var now = game.clock.now();
          var entry = {
            id: "qa-" + String(spec.slot == null ? 4 : spec.slot) + "-" + String(spec.item == null ? 17 : spec.item),
            item: spec.item == null ? 17 : spec.item,
            target: spec.target !== false,
            slot: spec.slot == null ? 4 : spec.slot,
            tapped: false
          };
          game.state.phase = "showing";
          game.state.current = { index: game.state.eventIndex, items: [entry] };
          game.state.nextAt = null;
          game.state.visibleUntil = now + 60000;
          game.state.lastFeedback = null;
          game.emit("show", { itemEvent: game.state.current, now: now });
          game.emit("change", { now: now });
          return { slot: entry.slot, item: String(entry.item), target: entry.target };
        },
        expire: function () {
          game.tick(game.state.visibleUntil + 1);
          return game.getState();
        }
      };
      var update = function () { setView(game.getState()); };
      var offs = [game.on("change", update), game.on("correct", function () { var p = propsRef.current; if (typeof p.setScore === "function") p.setScore(function (v) { return v + 1; }); if (typeof p.onCorrect === "function") p.onCorrect(); signal("correct"); }), game.on("wrong", function () { signal("wrong"); }), game.on("waited", function () { signal("waited"); }), game.on("missed", function () { signal("missed"); }), game.on("roundEnd", function (d) { if (typeof propsRef.current.onRoundEnd === "function") propsRef.current.onRoundEnd(d.summary); })];
      game.start(); update();
      return function () { offs.forEach(function (off) { off(); }); clearTimeout(flashTimer.current); game.destroy(); gameRef.current = null; if (root.__tapWaitMathGame === game) delete root.__tapWaitMathGame; delete root.__tapWaitMathTest; };
    }, []);

    var state = view || { phase: "loading", score: 0, streak: 0, wrong: 0, eventIndex: 0, roundLength: 12, current: null };
    var activeIndex = gameRef.current ? gameRef.current.getDifficulty() : level;
    var preset = PRESETS[activeIndex] || PRESETS[0];
    var theme = props.theme === "unicorn" ? "unicorn" : "space";
    var items = state.current && state.current.items || [];
    var bySlot = {}; items.forEach(function (item) { bySlot[item.slot] = item; });
    var reteach = state.wrong >= 2, reveal = state.wrong >= 3;

    function choose(next) { if (next < 0 || next >= PRESETS.length) return; sound("tap"); setLevel(next); var g = gameRef.current; if (g) { g.setDifficulty(next); g.start(); setView(g.getState()); } }
    function again() { sound("tap"); var g = gameRef.current; if (g) { g.start(); setView(g.getState()); } }
    function harder() { sound("tap"); if (activeIndex < PRESETS.length - 1) choose(activeIndex + 1); }

    var holeRects = HOLE_RECTS[theme];
    var holes = Array.from({ length: 9 }, function (_, slot) {
      var item = bySlot[slot];
      var rect = holeRects[slot];
      var holeStyle = { left:(rect[0]*100)+"%", top:(rect[1]*100)+"%", width:(rect[2]*100)+"%", height:(rect[3]*100)+"%" };
      return h("div", { key: slot, className: "tw-hole" + (item ? " occupied" : ""), style:holeStyle, "data-slot": String(slot), "aria-label": item ? undefined : "Empty hole" }, item ?
        h("button", { type: "button", className: "tw-critter up" + (item.target ? " target" : "") + (item.tapped ? " bonked" : "") + (reveal && item.target ? " hint-match" : ""), "data-slot": String(slot), "data-target": item.target ? "true" : "false", "aria-label": String(item.item), onClick: function () { if (gameRef.current) gameRef.current.tap(item); } }, [
          h("span", { key: "visual", className: "tw-critter-visual" }, [
            h("span", { key: "sprite", className: "tw-critter-art", "aria-hidden": "true" }),
            h("span", { key: "sign", className: "tw-number-sign" }, String(item.item))
          ]),
          h("span", { key: "burst", className: "tw-boop", "aria-hidden": "true" })
        ]) : null);
    });

    var body = [
      h("div", { key: "marquee", className: "tw-marquee" }, [
        h("button", { key: "back", type: "button", className: "back-btn", "aria-label": "Back to Math", onClick: function () { sound("tap"); if (props.onBack) props.onBack(); } }, "←"),
        h("div", { key: "score", className: "tw-score-box" }, [h("small", { key: "l" }, "SCORE"), h("b", { key: "v" }, String(state.score || 0))]),
        h("div", { key: "title", className: "tw-title" }, SCREEN_TITLE),
        h("div", { key: "streak", className: "tw-streak-box" }, [h("small", { key: "l" }, "STREAK"), h("b", { key: "v" }, "★ " + (state.streak || 0))]),
        h("button", { key: "sound", type: "button", className: "sound-btn", "aria-label": props.muted ? "Turn sound on" : "Turn sound off", onClick: function () { sound("tap"); if (props.onToggleMute) props.onToggleMute(); } }, props.muted ? "🔇" : "🔊")
      ]),
      h("div", { key: "rule", className: "tw-rule" + (reveal ? " reteach" : "") }, [h("span", { key: "word", className: "tw-rule-word" }, preset.label), h("strong", { key: "glyph", className: "tw-glyph" }, preset.glyph), h("span", { key: "line", className: "tw-rule-line" }, reteach ? preset.hint : preset.ruleText)]),
      h("div", { key: "stage", className: "tw-stage " + flash, "aria-label": "Nine-hole Number Whack arcade board" }, holes),
      h("div", { key: "footer", className: "tw-footer" }, [
        h("div", { key: "rules", className: "tw-ribbon", "aria-label": "Choose a Number Whack rule" }, PRESETS.map(function (p, i) { return h("button", { key: p.id, type: "button", className: "tw-chip" + (i === activeIndex ? " on" : ""), "aria-pressed": i === activeIndex, onClick: function () { choose(i); } }, p.label); })),
        h("div", { key: "message", className: "tw-message", "aria-live": "polite" }, flash === "wrong" ? "Let that one duck away." : flash === "waited" ? "Good waiting! ★" : flash === "missed" ? "Look for the matching signs." : "Boop a match. Let the others duck."),
        h("span", { key: "progress", className: "tw-progress" }, Math.min((state.eventIndex || 0) + 1, state.roundLength || 12) + " / " + (state.roundLength || 12))
      ])
    ];
    if (state.phase === "ended") body.push(h("div", { key: "finish", className: "tw-finish" }, [h("div", { key: "ticket", className: "tw-ticket" }, [h("span", { key: "t" }, "PRIZE TICKET"), h("b", { key: "s" }, "★ " + (state.score || 0))]), h("div", { key: "copy", className: "tw-finish-copy" }, "Great whacking and waiting!"), h("div", { key: "buttons", className: "tw-finish-buttons" }, [h("button", { key: "again", type: "button", className: "tw-finish-button", onClick: again }, "Play again"), h("button", { key: "harder", type: "button", className: "tw-finish-button", disabled: activeIndex >= PRESETS.length - 1, onClick: harder }, "Next rule ›")]) ]));
    return h("div", { className: "screen tap-wait-math-screen " + theme, style: props.journeyBg ? { "--game-bg": "url('" + props.journeyBg + "')" } : undefined }, body);
  }
  root.TapWaitMath = { Game: Game, presets: PRESETS, makeConfig: makeConfig, SCREEN_TITLE: SCREEN_TITLE };
})(typeof self !== "undefined" ? self : this);
