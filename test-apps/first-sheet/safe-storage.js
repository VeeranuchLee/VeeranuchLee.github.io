/* safe-storage.js -- browser storage that never throws.
 *
 * ONE canonical copy: shared-data/safe-storage/safe-storage.js. Each app ships a
 * byte-identical copy made by `python3 scripts/check-safe-storage.py --sync`; edit
 * the canonical file and re-sync, never an app's copy (preflight refuses a copy
 * that differs).
 *
 * Why: with Safari's "Block All Cookies" switched on, merely reading
 * window.localStorage throws a SecurityError. One unguarded touch while a script
 * loads unwinds everything after it -- the 2026-11-01 audit found apps that never
 * started, and a word list that ignored every tap, for exactly that reason.
 *
 * SafeStorage.local and SafeStorage.session have the three Storage methods the apps
 * use. getItem(key) returns the stored string or null; setItem(key, value) and
 * removeItem(key) return true when the browser kept the change. None of them ever
 * throws. When the browser refuses, values live in memory for the rest of the
 * visit, so a setting a child has just changed still holds until the page closes.
 * Either object can be passed wherever code expects a Storage.
 *
 * Load it with a plain <script src="safe-storage.js"></script> before the app's
 * own scripts. scripts/check-safe-storage.py, run by preflight, refuses any other
 * unguarded localStorage or sessionStorage touch in shipped code.
 */
(function (root) {
  "use strict";

  function area(name) {
    var memory = {};
    function real() {
      try { return root[name] || null; } catch (e) { return null; }
    }
    return {
      getItem: function (key) {
        key = String(key);
        try {
          var store = real();
          var value = store ? store.getItem(key) : null;
          if (value !== null) return value;
        } catch (e) { /* refused: fall back to this visit's memory */ }
        return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null;
      },
      setItem: function (key, value) {
        key = String(key);
        memory[key] = String(value);
        try {
          var store = real();
          if (!store) return false;
          store.setItem(key, memory[key]);
          return true;
        } catch (e) { return false; }
      },
      removeItem: function (key) {
        key = String(key);
        delete memory[key];
        try {
          var store = real();
          if (!store) return false;
          store.removeItem(key);
          return true;
        } catch (e) { return false; }
      }
    };
  }

  root.SafeStorage = { local: area("localStorage"), session: area("sessionStorage") };
})(typeof window !== "undefined" ? window : this);
