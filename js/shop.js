/* ===========================================================================
   shop.js — spend candy on gear upgrades (net, backpack, garden) and food.
   =========================================================================== */
(function (PB) {
  "use strict";

  PB.shop = {
    nextTier: function (key) {
      var lvl = PB.state.upg[key] || 0, tiers = PB.upgrades[key].tiers;
      return lvl >= tiers.length - 1 ? null : tiers[lvl + 1];
    },
    canBuy: function (key) { var nt = this.nextTier(key); return !!nt && PB.state.candy >= nt.cost; },
    buy: function (key) {
      var nt = this.nextTier(key);
      if (!nt) return { ok: false, reason: "maxed" };
      if (!PB.spendCandy(nt.cost)) return { ok: false, reason: "poor" };
      PB.state.upg[key] += 1;
      PB.audio.candy();
      return { ok: true, tier: nt };
    },
    buyTicket: function () {
      if (PB.state.flags.beachUnlocked) return { ok: false, reason: "owned" };
      if (!PB.spendCandy(PB.ticket.cost)) return { ok: false, reason: "poor" };
      PB.state.flags.beachUnlocked = true;
      PB.audio.candy();
      return { ok: true };
    },
    buyFood: function (id, qty) {
      qty = qty || 1;
      var f = PB.feeds.filter(function (x) { return x.id === id; })[0];
      if (!f) return { ok: false };
      if (!PB.spendCandy(f.cost * qty)) return { ok: false, reason: "poor" };
      PB.state.food[id] = (PB.state.food[id] || 0) + qty;
      PB.audio.candy();
      return { ok: true, qty: qty, cost: f.cost * qty };
    },
  };

})(window.PB = window.PB || {});
