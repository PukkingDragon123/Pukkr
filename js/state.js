/* ===========================================================================
   state.js — central serialisable state + helpers.
   Creatures live in a spatial backpack (grid). A creature's `grow` (0..1)
   drives its size and how much it is worth — bigger = more prize.
   =========================================================================== */
(function (PB) {
  "use strict";

  PB.state = null;

  PB.newGame = function () {
    var cfg = PB.config;
    PB.state = {
      meta: { version: 3, name: "Collector" },
      day: 1,
      timeSec: (cfg.START_HOUR / 24) * cfg.DAY_LENGTH_SEC,
      candy: cfg.START_CANDY,
      bugs: [],                       // { uid, sid, grow, gx, gy }
      upg: { net: 0, bag: 0, garden: 0 },
      food: { leaf: 2, berry: 0, honey: 0 },
      museum: { donated: {}, visitorsServed: 0, lastVisitDay: 0 },
      dex: {},
      stats: { totalCaught: 0, candyEarned: 0, daysPlayed: 1 },
      flags: { tutorialCatch: false },
      uidSeq: 1,
    };
    return PB.state;
  };

  PB.loadInto = function (data) {
    data.bugs = data.bugs || [];
    data.bugs.forEach(function (b) {
      if (typeof b.grow !== "number") b.grow = 0.1;
      if (typeof b.gx !== "number") b.gx = 0;
      if (typeof b.gy !== "number") b.gy = 0;
    });
    data.upg = data.upg || { net: 0, bag: 0, garden: 0 };
    ["net", "bag", "garden"].forEach(function (k) { if (typeof data.upg[k] !== "number") data.upg[k] = 0; });
    data.food = data.food || { leaf: 0, berry: 0, honey: 0 };
    data.museum = data.museum || {};
    if (!data.museum.donated) data.museum.donated = {};
    if (typeof data.museum.visitorsServed !== "number") data.museum.visitorsServed = 0;
    if (typeof data.museum.lastVisitDay !== "number") data.museum.lastVisitDay = 0;
    data.dex = data.dex || {};
    data.stats = data.stats || { totalCaught: 0, candyEarned: 0, daysPlayed: data.day || 1 };
    data.flags = data.flags || {};
    if (typeof data.candy !== "number") data.candy = 0;
    if (typeof data.day !== "number") data.day = 1;
    if (typeof data.timeSec !== "number") data.timeSec = 0;
    if (typeof data.uidSeq !== "number") data.uidSeq = data.bugs.length + 1;
    PB.state = data;
    return data;
  };

  PB.nextUid = function () { return PB.state.uidSeq++; };

  // ---- upgrades ------------------------------------------------------------
  function tier(key) {
    var lvl = PB.state.upg[key] || 0, tiers = PB.upgrades[key].tiers;
    return tiers[Math.min(lvl, tiers.length - 1)];
  }
  PB.netTier = function () { return tier("net"); };
  PB.bagTier = function () { return tier("bag"); };
  PB.gardenTier = function () { return tier("garden"); };
  PB.bagW = function () { return tier("bag").w; };
  PB.bagH = function () { return tier("bag").h; };
  PB.catchZone = function () { return tier("net").zone; };
  PB.catchShrink = function () { return tier("net").shrink; };
  PB.gardenGrowth = function () { return tier("garden").growth; };
  PB.gardenDrip = function () { return tier("garden").drip; };

  // ---- creature size / value ----------------------------------------------
  // grow 0 -> 0.8x base, grow 1 -> 1.7x base. Value scales the same way.
  PB.sizeOf = function (bug) {
    var sp = PB.speciesById[bug.sid];
    return Math.round(sp.baseSize * (0.8 + bug.grow * 0.9) * 10) / 10;
  };
  PB.bugValue = function (bug) {
    var sp = PB.speciesById[bug.sid];
    return Math.max(1, Math.round(PB.rarity[sp.rarity].value * (0.8 + bug.grow * 0.9)));
  };

  // ---- dex -----------------------------------------------------------------
  PB.dexEntry = function (sid) {
    if (!PB.state.dex[sid]) PB.state.dex[sid] = { caught: 0, bestSize: 0, donated: false };
    return PB.state.dex[sid];
  };

  // ---- candy ---------------------------------------------------------------
  PB.addCandy = function (n) { PB.state.candy = Math.max(0, PB.state.candy + n); if (n > 0) PB.state.stats.candyEarned += n; };
  PB.spendCandy = function (n) { if (PB.state.candy < n) return false; PB.state.candy -= n; return true; };

  // ---- museum --------------------------------------------------------------
  PB.museumSpeciesCount = function () { return Object.keys(PB.state.museum.donated).length; };
  PB.museumTier = function () {
    var n = PB.museumSpeciesCount(), t = PB.museumTiers[0];
    for (var i = 0; i < PB.museumTiers.length; i++) if (n >= PB.museumTiers[i].at) t = PB.museumTiers[i];
    return t;
  };

})(window.PB = window.PB || {});
