/* ===========================================================================
   bait.js — set fruit bait in one or more lure slots and wait (idle) for bugs.
   Rarer fruit = better odds; the Lure Slots upgrade adds simultaneous slots.
   Skip a slot's wait with tokens. When a slot is ready a bug appears (rarer
   ones sparkle and carry a talent) for you to catch.
   =========================================================================== */
(function (PB) {
  "use strict";

  var SPAWN_W = { common: 100, uncommon: 45, rare: 16, epic: 5 };

  function fruitById(id) { return PB.fruits.filter(function (f) { return f.id === id; })[0]; }

  PB.bait = {
    slots: function () { return PB.state.lures; },
    slot: function (i) { return PB.state.lures[i]; },
    fruitOf: function (i) { var s = PB.state.lures[i]; return s && s.fruit ? fruitById(s.fruit) : null; },

    isActive: function (i) { var s = PB.state.lures[i]; return !!(s && s.fruit) && !s.ready; },
    isReady: function (i) { var s = PB.state.lures[i]; return !!(s && s.ready && s.pending); },
    isIdle: function (i) { var s = PB.state.lures[i]; return !!s && !s.fruit; },
    remaining: function (i) { return Math.max(0, PB.state.lures[i].remaining); },

    anyReady: function () { return PB.state.lures.some(function (s) { return s.ready && s.pending; }); },
    readyCount: function () { var n = 0; PB.state.lures.forEach(function (s) { if (s.ready && s.pending) n++; }); return n; },
    firstReady: function () { for (var i = 0; i < PB.state.lures.length; i++) if (this.isReady(i)) return i; return -1; },

    set: function (i, fruitId) {
      var s = PB.state.lures[i];
      if (!s || s.fruit) return false;   // only an empty slot can be baited
      var f = fruitById(fruitId);
      if (!f) return false;
      s.fruit = fruitId; s.remaining = Math.round(f.wait * PB.baitMult()); s.ready = false; s.pending = null;
      PB.audio.select();
      return true;
    },

    update: function (dt) {
      var arr = PB.state.lures;
      for (var i = 0; i < arr.length; i++) {
        var s = arr[i];
        if (!s.fruit || s.ready) continue;
        s.remaining -= dt;
        if (s.remaining <= 0) { s.remaining = 0; s.ready = true; this._roll(i); }
      }
    },

    skipCost: function (i) { return Math.max(1, Math.ceil(this.remaining(i) / 8)); },
    skip: function (i) {
      if (!this.isActive(i)) return false;
      var cost = this.skipCost(i);
      if (!PB.spendTokens(cost)) return false;
      var s = PB.state.lures[i];
      s.remaining = 0; s.ready = true; this._roll(i);
      PB.audio.candy();
      return cost;
    },

    // clear a slot after its bug is caught or flees
    clear: function (i) { var s = PB.state.lures[i]; if (s) { s.fruit = null; s.remaining = 0; s.ready = false; s.pending = null; } },

    _roll: function (i) {
      var s = PB.state.lures[i], area = PB.area(), f = fruitById(s.fruit);
      var rareBoost = f ? f.rare : 0;
      var pool = area.bugs.map(function (sid) { return PB.speciesById[sid]; });
      var total = 0, weights = pool.map(function (sp) {
        var w = SPAWN_W[sp.rarity];
        if (sp.rarity === "rare" || sp.rarity === "epic") w *= (1 + rareBoost * 5);
        total += w; return w;
      });
      var r = Math.random() * total, sp = pool[pool.length - 1];
      for (var k = 0; k < pool.length; k++) { r -= weights[k]; if (r <= 0) { sp = pool[k]; break; } }
      var size = Math.round(sp.baseSize * (0.7 + Math.random() * 0.7) * 10) / 10;
      var talent = null;
      var chance = PB.rarity[sp.rarity].talent + rareBoost * 0.3;
      if (Math.random() < chance) talent = PB.talentIds[Math.floor(Math.random() * PB.talentIds.length)];
      s.pending = { sid: sp.id, size: size, talent: talent, sparkle: !!talent };
      PB.audio.visitor();
    },
  };

})(window.PB = window.PB || {});
