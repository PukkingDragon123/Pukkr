/* ===========================================================================
   museum.js — your creatures live here in jars. Open the museum to visitors
   to earn money — the more (and bigger/rarer) the creatures on display, the
   more they pay. Once per day.
   =========================================================================== */
(function (PB) {
  "use strict";

  PB.museum = {
    canOpen: function () {
      return PB.state.bugs.length > 0 && PB.state.museum.lastVisitDay < PB.state.day;
    },

    // estimated payout for opening right now
    estimate: function () {
      var total = 0;
      PB.state.bugs.forEach(function (b) { total += PB.bugValue(b); });
      return Math.round(6 + total * 0.5 + PB.state.bugs.length * 4);
    },

    openDoors: function () {
      if (!this.canOpen()) return null;
      PB.state.museum.lastVisitDay = PB.state.day;
      var money = this.estimate();
      PB.addCandy(money);
      PB.state.museum.visitorsServed += 1;
      PB.audio.visitor();
      return { money: money, count: PB.state.bugs.length };
    },
  };

})(window.PB = window.PB || {});
