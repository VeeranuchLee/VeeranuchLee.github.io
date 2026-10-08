(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.ColorLabReset = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // The whole of "Start again" (2026-10-07). A child who taps Start again gets an empty
  // bowl immediately: the earlier two-tap arm/confirm ("Tap again…") read as a dead tap.
  // Kept pure and shared so the regression test and the running app exercise one behaviour.
  function emptyDrops() {
    return { red: 0, yellow: 0, blue: 0 };
  }

  return {
    emptyDrops: emptyDrops,
  };
});