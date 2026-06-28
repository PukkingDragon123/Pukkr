/* ===========================================================================
   bait.js — set fruit bait and wait (idle) for a bug to appear. Rarer fruit =
   better odds. Skip the wait with tokens. When ready, a bug appears (rarer ones
   sparkle and carry a talent) for you to catch.
   =========================================================================== */
(function (PB) {
  "use strict";

  var SPAWN_W = { common: 100, uncommon: 45, rare: 16, epic: 5 };

  function fruit() { return PB.fruits.filter(function (f) { return f.id === PB.state.bait.fruit; })[0]; }

  PB.bait = {
    fruitObj: fruit,
    active: function () { return !!PB.state.bait.fruit && !PB.state.bait.ready; },
    ready: function () { return PB.state.bait.ready && !!PB.state.pending; },
    remaining: function () { return Math.max(0, PB.state.bait.remaining); },

    set: function (fruitId) {
      if (this.active() || this.ready()) return false;
      var f = PB.fruits.filter(function (x) { return x.id === fruitId; })[0];
      if (!f) return false;
      PB.state.bait = { fruit: fruitId, remaining: f.wait, ready: false };
      PB.state.pending = null;
      PB.audio.select();
      return true;
    },

    update: function (dt) {
      var b = PB.state.bait;
      if (!b.fruit || b.ready) return;
      b.remaining -= dt;
      if (b.remaining <= 0) { b.remaining = 0; b.ready = true; this._roll(); }
    },

    // token cost to skip the remaining wait
    skipCost: function () { return Math.max(1, Math.ceil(this.remaining() / 8)); },
    skip: function () {
      if (!this.active()) return false;
      var cost = this.skipCost();
      if (!PB.spendTokens(cost)) return false;
      PB.state.bait.remaining = 0; PB.state.bait.ready = true; this._roll();
      PB.audio.candy();
      return cost;
    },

    // clear after the bug is caught or fled
    clear: function () { PB.state.bait = { fruit: null, remaining: 0, ready: false }; PB.state.pending = null; },

    _roll: function () {
      var area = PB.area(), f = fruit();
      var rareBoost = f ? f.rare : 0;
      var pool = area.bugs.map(function (sid) { return PB.speciesById[sid]; });
      // weighted pick (rarer bugs get a boost from better fruit)
      var total = 0, weights = pool.map(function (s) {
        var w = SPAWN_W[s.rarity];
        if (s.rarity === "rare" || s.rarity === "epic") w *= (1 + rareBoost * 5);
        total += w; return w;
      });
      var r = Math.random() * total, sp = pool[pool.length - 1];
      for (var i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) { sp = pool[i]; break; } }
      // size + talent rolls
      var size = Math.round(sp.baseSize * (0.7 + Math.random() * 0.7) * 10) / 10;
      var talent = null;
      var chance = PB.rarity[sp.rarity].talent + rareBoost * 0.3;
      if (Math.random() < chance) talent = PB.talentIds[Math.floor(Math.random() * PB.talentIds.length)];
      PB.state.pending = { sid: sp.id, size: size, talent: talent, sparkle: !!talent };
      PB.audio.visitor();
    },
  };

})(window.PB = window.PB || {});
