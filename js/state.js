/* ===========================================================================
   state.js — the central, serialisable game state plus small helpers.
   The model is deliberately simple: you own a list of creatures (raised in the
   Garden) and a set of museum exhibits.
   =========================================================================== */
(function (PB) {
  "use strict";

  PB.state = null;

  PB.newGame = function () {
    var cfg = PB.config;
    PB.state = {
      meta: { version: 2, name: "Collector" },
      day: 1,
      timeSec: (cfg.START_HOUR / 24) * cfg.DAY_LENGTH_SEC,
      candy: cfg.START_CANDY,
      bugs: [],          // owned creatures: { sid, size, love, candyBuf }
      dex: {},           // sid -> { caught, bestSize, donated }
      museum: { donated: {}, visitorsServed: 0, lastVisitDay: 0 },
      stats: { totalCaught: 0, candyEarned: 0, daysPlayed: 1 },
      flags: { tutorialCatch: false },
    };
    return PB.state;
  };

  PB.loadInto = function (data) {
    data.bugs = data.bugs || [];
    data.bugs.forEach(function (b) {
      if (typeof b.love !== "number") b.love = 30;
      if (typeof b.candyBuf !== "number") b.candyBuf = 0;
    });
    data.dex = data.dex || {};
    data.museum = data.museum || {};
    if (!data.museum.donated) data.museum.donated = {};
    if (typeof data.museum.visitorsServed !== "number") data.museum.visitorsServed = 0;
    if (typeof data.museum.lastVisitDay !== "number") data.museum.lastVisitDay = 0;
    data.stats = data.stats || { totalCaught: 0, candyEarned: 0, daysPlayed: data.day || 1 };
    data.flags = data.flags || {};
    if (typeof data.candy !== "number") data.candy = 0;
    if (typeof data.day !== "number") data.day = 1;
    if (typeof data.timeSec !== "number") data.timeSec = 0;
    PB.state = data;
    return data;
  };

  // ---- dex -----------------------------------------------------------------
  PB.dexEntry = function (sid) {
    if (!PB.state.dex[sid]) PB.state.dex[sid] = { caught: 0, bestSize: 0, donated: false };
    return PB.state.dex[sid];
  };
  PB.caughtSpeciesCount = function () {
    var n = 0; for (var id in PB.state.dex) if (PB.state.dex[id].caught > 0) n++; return n;
  };

  // ---- candy ---------------------------------------------------------------
  PB.addCandy = function (n) {
    PB.state.candy = Math.max(0, PB.state.candy + n);
    if (n > 0) PB.state.stats.candyEarned += n;
  };
  PB.spendCandy = function (n) {
    if (PB.state.candy < n) return false;
    PB.state.candy -= n; return true;
  };

  // ---- catching ------------------------------------------------------------
  PB.catchZone = function (skittish) {
    return Math.max(0.16, Math.min(0.9, PB.config.CATCH_ZONE * (1 - (skittish || 0) * 0.35)));
  };

  // ---- museum --------------------------------------------------------------
  PB.museumSpeciesCount = function () { return Object.keys(PB.state.museum.donated).length; };
  PB.museumTier = function () {
    var n = PB.museumSpeciesCount(), tier = PB.museumTiers[0];
    for (var i = 0; i < PB.museumTiers.length; i++) if (n >= PB.museumTiers[i].at) tier = PB.museumTiers[i];
    return tier;
  };

})(window.PB = window.PB || {});
