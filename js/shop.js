/* ===========================================================================
   shop.js — spend candy on tool upgrades and bug feed.
   =========================================================================== */
(function (PB) {
  "use strict";

  PB.shop = {
    nextTier: function (key) {
      var lvl = PB.state.tools[key] || 0;
      var tiers = PB.tools[key].tiers;
      if (lvl >= tiers.length - 1) return null;
      return tiers[lvl + 1];
    },

    canBuyTool: function (key) {
      var nt = this.nextTier(key);
      return !!nt && PB.state.candy >= nt.cost;
    },

    buyTool: function (key) {
      var nt = this.nextTier(key);
      if (!nt) return { ok: false, reason: "maxed" };
      if (!PB.spendCandy(nt.cost)) return { ok: false, reason: "poor" };
      PB.state.tools[key] += 1;
      PB.audio.candy();
      return { ok: true, tier: nt };
    },

    buyFeed: function (feedId, qty) {
      qty = qty || 1;
      var feed = PB.feeds.filter(function (f) { return f.id === feedId; })[0];
      if (!feed) return { ok: false };
      var cost = feed.cost * qty;
      if (!PB.spendCandy(cost)) return { ok: false, reason: "poor" };
      PB.state.feedInv[feedId] = (PB.state.feedInv[feedId] || 0) + qty;
      PB.audio.candy();
      return { ok: true, qty: qty, cost: cost };
    },
  };

})(window.PB = window.PB || {});
