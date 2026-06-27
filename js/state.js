/* ===========================================================================
   state.js — the central, serialisable game state plus small helpers.
   Everything the player accomplishes lives in PB.state and is what gets saved.
   =========================================================================== */
(function (PB) {
  "use strict";

  PB.state = null; // set by newGame() or loadInto()

  // Build a brand new save. The player starts at home (museum/house area).
  PB.newGame = function () {
    var cfg = PB.config;
    PB.state = {
      meta: { version: 1, name: "Collector" },
      day: 1,
      timeSec: (cfg.START_HOUR / 24) * cfg.DAY_LENGTH_SEC, // 8:00 in seconds
      candy: 12,
      tools: { net: 0, shoes: 0, jar: 0, terrarium: 0, lure: 0 },
      feedInv: { leaf: 3, berry: 0, honey: 0 },
      player: { x: 28 * cfg.TILE, y: 32 * cfg.TILE, dir: "down" },
      jar: [],            // bugs currently carried in jars
      dex: {},            // sid -> { caught, seen, bestSize, donated }
      terrarium: [],      // bugs being raised: { sid, size, love, growth, candyBuf }
      museum: { donated: {}, visitorsServed: 0, lastVisitDay: 0 },
      stats: { totalCaught: 0, candyEarned: 0, daysPlayed: 1 },
      flags: { tutorialCatch: false },
    };
    return PB.state;
  };

  PB.loadInto = function (data) {
    // Backfill anything a save might be missing so later reads never throw.
    data.tools = data.tools || {};
    ["net", "shoes", "jar", "terrarium", "lure"].forEach(function (k) {
      if (typeof data.tools[k] !== "number") data.tools[k] = 0;
    });
    data.feedInv = data.feedInv || { leaf: 0, berry: 0, honey: 0 };
    data.jar = data.jar || [];
    data.dex = data.dex || {};
    data.terrarium = data.terrarium || [];
    data.terrarium.forEach(function (pod) {
      if (typeof pod.growth !== "number") pod.growth = 0;
      if (typeof pod.candyBuf !== "number") pod.candyBuf = 0;
      if (typeof pod.love !== "number") pod.love = 30;
    });
    data.museum = data.museum || {};
    if (!data.museum.donated) data.museum.donated = {};
    if (typeof data.museum.visitorsServed !== "number") data.museum.visitorsServed = 0;
    if (typeof data.museum.lastVisitDay !== "number") data.museum.lastVisitDay = 0;
    data.stats = data.stats || { totalCaught: 0, candyEarned: 0, daysPlayed: data.day || 1 };
    data.flags = data.flags || {};
    if (typeof data.candy !== "number") data.candy = 0;
    if (typeof data.day !== "number") data.day = 1;
    if (typeof data.timeSec !== "number") data.timeSec = 0;
    if (!data.player) data.player = { x: 21 * PB.config.TILE, y: 35 * PB.config.TILE, dir: "down" };
    PB.state = data;
    return data;
  };

  // ---- Tool helpers --------------------------------------------------------
  PB.toolTier = function (key) {
    var lvl = PB.state.tools[key] || 0;
    var tiers = PB.tools[key].tiers;
    return tiers[Math.min(lvl, tiers.length - 1)];
  };
  PB.jarCapacity = function () { return PB.toolTier("jar").slots; };
  PB.terrariumCapacity = function () { return PB.toolTier("terrarium").slots; };
  PB.netZone = function () { return PB.toolTier("net").zone; };
  PB.shoeSpeed = function () { return PB.toolTier("shoes").speed; };
  PB.lureRare = function () { return PB.toolTier("lure").rare; };

  // ---- Dex helpers ---------------------------------------------------------
  PB.dexEntry = function (sid) {
    if (!PB.state.dex[sid]) {
      PB.state.dex[sid] = { caught: 0, seen: false, bestSize: 0, donated: false };
    }
    return PB.state.dex[sid];
  };
  PB.markSeen = function (sid) { PB.dexEntry(sid).seen = true; };

  // ---- Candy ---------------------------------------------------------------
  PB.addCandy = function (n) {
    PB.state.candy = Math.max(0, PB.state.candy + n);
    if (n > 0) PB.state.stats.candyEarned += n;
  };
  PB.spendCandy = function (n) {
    if (PB.state.candy < n) return false;
    PB.state.candy -= n;
    return true;
  };

  // ---- Misc ----------------------------------------------------------------
  // How many distinct species have been donated to the museum.
  PB.museumSpeciesCount = function () { return Object.keys(PB.state.museum.donated).length; };

  PB.museumTier = function () {
    var n = PB.museumSpeciesCount();
    var tier = PB.museumTiers[0];
    for (var i = 0; i < PB.museumTiers.length; i++) {
      if (n >= PB.museumTiers[i].at) tier = PB.museumTiers[i];
    }
    return tier;
  };

})(window.PB = window.PB || {});
