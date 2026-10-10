(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.ColorLabMixNaming = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var ANCHORS = {
    red: "red",
    yellow: "yellow",
    blue: "blue",
    "red+yellow": "orange",
    "yellow+blue": "green",
    "red+blue": "purple",
    "red+yellow+blue": "brown",
  };

  // Keep the established family rule: one paint uses its own family; two paints use their
  // secondary family plus a 75%-dominant primary; three paints use brown/grey.
  function mixFamilies(drops) {
    var total = drops.red + drops.yellow + drops.blue;
    var used = ["red", "yellow", "blue"].filter(function (c) { return drops[c] > 0; });
    if (used.length === 1) return [used[0]];
    if (used.length === 3) return ["brown", "grey"];
    var pair = used.join("+");
    var mix = { "red+yellow": "orange", "yellow+blue": "green", "red+blue": "purple" }[pair];
    var out = [mix];
    used.forEach(function (c) { if (drops[c] / total >= 0.75) out.push(c); });
    return out;
  }

  function equalPartsAnchor(drops) {
    var used = ["red", "yellow", "blue"].filter(function (c) { return drops[c] > 0; });
    if (!used.length) return null;
    var amount = drops[used[0]];
    if (!used.every(function (c) { return drops[c] === amount; })) return null;
    return ANCHORS[used.join("+")] || null;
  }

  function distance(left, right) {
    return Math.hypot.apply(null, left.map(function (value, index) { return value - right[index]; }));
  }

  function nameMix(drops, oklab, colors, targets, nearestName) {
    var anchor = equalPartsAnchor(drops);
    if (anchor) return colors.find(function (color) { return color.displayName === anchor; }) || null;
    var allowed = mixFamilies(drops);
    var exactTarget = targets.find(function (target) {
      return ["red", "yellow", "blue"].every(function (paint) {
        return target.provenRecipe[paint] === drops[paint];
      });
    });
    if (exactTarget) return colors.find(function (color) { return color.slug === exactTarget.slug; }) || null;
    var reached = targets.filter(function (target) {
      return allowed.indexOf(target.family) >= 0 && distance(oklab, target.centreOklab) <= target.toleranceOklab;
    }).sort(function (left, right) {
      return distance(oklab, left.centreOklab) - distance(oklab, right.centreOklab);
    })[0];
    if (reached) return colors.find(function (color) { return color.slug === reached.slug; }) || null;
    var pool = colors.filter(function (color) {
      return color.mixName === true && allowed.indexOf(color.familyId) >= 0;
    });
    var nearest = nearestName(oklab, pool);
    return nearest ? nearest.color : null;
  }

  function isNewDiscovery(discoveredIds, targetId) {
    return !discoveredIds.has(targetId);
  }

  return {
    mixFamilies: mixFamilies,
    equalPartsAnchor: equalPartsAnchor,
    nameMix: nameMix,
    isNewDiscovery: isNewDiscovery,
  };
});
