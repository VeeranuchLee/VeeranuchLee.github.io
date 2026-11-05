(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.IceCreamRules = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const AUTO_CHURN_STEP_MS = 750;

  const PLACES = [
    { id: "dairy", name: "Dairy farm", scene: "assets/scenes/dairy-farm.webp", postcard: "assets/rewards/postcard-dairy.webp", fact: "Cream can be separated from milk. Our milk and cream are already prepared for cooking." },
    { id: "market", name: "Farm market", scene: "assets/scenes/farm-market.webp", postcard: "assets/rewards/postcard-market.webp", fact: "Strawberries grow on low plants. Sugar can come from the sweet stem of tall sugar cane." },
    { id: "vanilla", name: "Madagascar vanilla garden", scene: "assets/scenes/vanilla-garden.webp", postcard: "assets/rewards/postcard-vanilla.webp", fact: "Vanilla is native to Mexico and Central America. These vanilla pods were grown in Madagascar." }
  ];

  const INGREDIENTS = [
    { id: "milk", name: "Milk", place: "dairy", price: 1, art: "assets/items/milk.webp" },
    { id: "cream", name: "Cream", place: "dairy", price: 2, art: "assets/items/cream.webp" },
    { id: "strawberry", name: "Strawberry", place: "market", price: 1, art: "assets/items/strawberry.webp" },
    { id: "sugar", name: "Cane sugar", place: "market", price: 1, art: "assets/items/cane-sugar.webp" },
    { id: "vanilla", name: "Vanilla pod", place: "vanilla", price: 2, art: "assets/items/vanilla.webp" }
  ];

  const RECIPES = [
    { id: "vanilla-cloud", name: "Vanilla Cloud", base: { cream: 2, milk: 1, vanilla: 1 }, late: {}, colour: "vanilla", sale: 8, placeStamp: "vanilla" },
    { id: "strawberry-scoop", name: "Strawberry Scoop", base: { cream: 2, sugar: 1 }, late: { strawberry: 1 }, colour: "strawberry", sale: 7, placeStamp: "market" },
    { id: "strawberry-vanilla-ripple", name: "Strawberry-Vanilla Ripple", base: { cream: 2, milk: 1, strawberry: 1 }, late: { vanilla: 1 }, colour: "ripple", sale: 9, placeStamp: "dairy" }
  ];

  const CUSTOMERS = [
    { id: "bunny", name: "Bunny", waiting: "assets/customers/bunny-waiting.webp", happy: "assets/customers/bunny-happy.webp" },
    { id: "duckling", name: "Duckling", waiting: "assets/customers/duckling-waiting.webp", happy: "assets/customers/duckling-happy.webp" },
    { id: "hedgehog", name: "Hedgehog", waiting: "assets/customers/hedgehog-waiting.webp", happy: "assets/customers/hedgehog-happy.webp" }
  ];

  const byId = (rows, id) => rows.find((row) => row.id === id);
  const recipeFor = (state) => RECIPES[state.orderIndex];
  const customerFor = (state) => CUSTOMERS[state.orderIndex];
  const portions = (recipe) => ({ ...recipe.base, ...Object.fromEntries(Object.entries(recipe.late).map(([id, count]) => [id, (recipe.base[id] || 0) + count])) });
  const recipeCost = (recipe) => Object.entries(portions(recipe)).reduce((sum, [id, count]) => sum + byId(INGREDIENTS, id).price * count, 0);
  const missing = (state, recipe = recipeFor(state)) => Object.entries(portions(recipe)).reduce((out, [id, count]) => {
    const left = count - (state.pantry[id] || 0);
    if (left > 0) out[id] = left;
    return out;
  }, {});
  const missingCost = (state) => Object.entries(missing(state)).reduce((sum, [id, count]) => sum + byId(INGREDIENTS, id).price * count, 0);

  function createGame(mode = "calm") {
    const state = { version: 1, mode, orderIndex: 0, wallet: 8, pantry: {}, recipes: [], stamps: [], postcards: [], phase: "order", activePurchase: null, churn: null, payment: null, gentleRefills: 0 };
    ensureFunds(state);
    return state;
  }

  function ensureFunds(state) {
    const need = missingCost(state);
    if (state.wallet < need) {
      state.gentleRefills += need - state.wallet;
      state.wallet = need;
    }
    return state.wallet;
  }

  function beginPurchase(state, ingredientId) {
    const ingredient = byId(INGREDIENTS, ingredientId);
    if (!ingredient || !missing(state)[ingredientId]) return false;
    ensureFunds(state);
    state.activePurchase = { ingredientId, price: ingredient.price, paid: 0 };
    return true;
  }

  function tapPurchaseCoin(state) {
    const pay = state.activePurchase;
    if (!pay || state.wallet <= 0 || pay.paid >= pay.price) return false;
    pay.paid += 1;
    state.wallet -= 1;
    if (pay.paid === pay.price) {
      state.pantry[pay.ingredientId] = (state.pantry[pay.ingredientId] || 0) + 1;
      state.activePurchase = null;
    }
    return true;
  }

  function readyToChurn(state) { return Object.keys(missing(state)).length === 0; }

  function createChurn(state) {
    if (!readyToChurn(state)) return false;
    const recipe = recipeFor(state);
    const cups = [];
    Object.entries(recipe.base).forEach(([id, count]) => {
      for (let i = 0; i < count; i += 1) cups.push({ id, added: false });
    });
    const late = [];
    Object.entries(recipe.late).forEach(([id, count]) => {
      for (let i = 0; i < count; i += 1) late.push({ id, added: false });
    });
    state.phase = "cups";
    state.churn = { cups, late, progress: 0, foldProgress: 0, mixtureState: 0, phase: "cups", scooped: false };
    return state.churn;
  }

  function tapCup(state, index) {
    const churn = state.churn;
    if (!churn || churn.phase !== "cups" || !churn.cups[index] || churn.cups[index].added) return false;
    churn.cups[index].added = true;
    if (churn.cups.every((cup) => cup.added)) churn.phase = state.phase = "churn";
    return true;
  }

  function advanceChurn(state, amount = 0.25) {
    const churn = state.churn;
    if (!churn || !["churn", "fold"].includes(churn.phase)) return false;
    if (churn.phase === "fold") {
      churn.foldProgress = Math.min(0.5, churn.foldProgress + Math.max(0, amount));
      if (churn.foldProgress >= 0.5) churn.phase = state.phase = "scoop";
      return true;
    }
    churn.progress = Math.min(1, churn.progress + Math.max(0, amount));
    churn.mixtureState = Math.min(3, Math.floor(churn.progress * 4));
    if (churn.progress >= 1) {
      churn.mixtureState = 3;
      churn.phase = churn.late.length ? "mix-in" : "scoop";
      state.phase = churn.phase;
    }
    return true;
  }

  function advanceAutoChurn(state) {
    return advanceChurn(state, 0.25);
  }

  function tapMixIn(state, index) {
    const churn = state.churn;
    if (!churn || churn.phase !== "mix-in" || !churn.late[index] || churn.late[index].added) return false;
    churn.late[index].added = true;
    if (churn.late.every((item) => item.added)) churn.phase = state.phase = "fold";
    return true;
  }

  function tapScoop(state) {
    const churn = state.churn;
    if (!churn || churn.phase !== "scoop") return false;
    churn.scooped = true;
    state.phase = "serve";
    return true;
  }

  function serve(state) {
    if (state.phase !== "serve") return false;
    state.phase = "payment";
    state.payment = { due: recipeFor(state).sale, counted: 0 };
    return true;
  }

  function tapCustomerCoin(state) {
    if (state.phase !== "payment" || !state.payment || state.payment.counted >= state.payment.due) return false;
    state.payment.counted += 1;
    state.wallet += 1;
    if (state.payment.counted === state.payment.due) finishOrder(state);
    return true;
  }

  function finishOrder(state) {
    const recipe = recipeFor(state);
    Object.keys(portions(recipe)).forEach((id) => { state.pantry[id] = Math.max(0, (state.pantry[id] || 0) - portions(recipe)[id]); });
    if (!state.recipes.includes(recipe.id)) state.recipes.push(recipe.id);
    if (!state.stamps.includes(recipe.placeStamp)) state.stamps.push(recipe.placeStamp);
    if (!state.postcards.includes(recipe.placeStamp)) state.postcards.push(recipe.placeStamp);
    state.phase = "reward";
  }

  function nextOrder(state) {
    if (state.phase !== "reward") return false;
    if (state.orderIndex >= RECIPES.length - 1) {
      state.phase = "picnic";
      return true;
    }
    state.orderIndex += 1;
    state.phase = "order";
    state.activePurchase = null;
    state.churn = null;
    state.payment = null;
    ensureFunds(state);
    return true;
  }

  return { AUTO_CHURN_STEP_MS, PLACES, INGREDIENTS, RECIPES, CUSTOMERS, byId, recipeFor, customerFor, portions, recipeCost, missing, missingCost, createGame, ensureFunds, beginPurchase, tapPurchaseCoin, readyToChurn, createChurn, tapCup, advanceChurn, advanceAutoChurn, tapMixIn, tapScoop, serve, tapCustomerCoin, finishOrder, nextOrder };
});
