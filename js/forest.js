/* ===========================================================================
   forest.js — the Forest is entered through a little shrine. You pick a path
   (left or right) and discover a random spot: a buzzing thicket to catch in, a
   stash of candy, a basket of food, a shrine pick-a-card game, or nothing.
   =========================================================================== */
(function (PB) {
  "use strict";

  PB.forest = {
    view: "shrine",     // "shrine" | "spot"
    rareBoost: false,

    enterShrine: function () { this.view = "shrine"; this.rareBoost = false; PB.spawns.reset(); },
    enterSpot: function (rare) { this.view = "spot"; this.rareBoost = !!rare; PB.spawns.reset(); },

    rollOutcome: function () {
      var total = 0; PB.forestOutcomes.forEach(function (o) { total += o.weight; });
      var r = Math.random() * total;
      for (var i = 0; i < PB.forestOutcomes.length; i++) { r -= PB.forestOutcomes[i].weight; if (r <= 0) return PB.forestOutcomes[i]; }
      return PB.forestOutcomes[0];
    },

    candyFind: function () { var n = 8 + Math.floor(Math.random() * 16); PB.addCandy(n); return n; },
    itemFind: function () {
      var f = PB.feeds[Math.floor(Math.random() * PB.feeds.length)];
      var q = 1 + Math.floor(Math.random() * 2);
      PB.state.food[f.id] = (PB.state.food[f.id] || 0) + q;
      return { feed: f, qty: q };
    },

    // pick-a-card reward (one of three): candy, food, or a dud
    cardReward: function () {
      var roll = Math.random();
      if (roll < 0.45) { var n = 12 + Math.floor(Math.random() * 22); PB.addCandy(n); return { type: "candy", n: n }; }
      if (roll < 0.85) { var it = this.itemFind(); return { type: "item", feed: it.feed, qty: it.qty }; }
      return { type: "none" };
    },
  };

})(window.PB = window.PB || {});
