/* ===========================================================================
   collection.js — your owned creatures (caught in the Forest, raised in the
   Garden) and the simple records that track your biggest catches.
   =========================================================================== */
(function (PB) {
  "use strict";

  PB.collection = {
    addCatch: function (sid, size) {
      var e = PB.dexEntry(sid);
      var record = size > e.bestSize;
      e.caught += 1;
      if (record) e.bestSize = size;
      PB.state.stats.totalCaught += 1;
      PB.state.bugs.push({ sid: sid, size: size, love: 30, candyBuf: 0 });
      return record;
    },

    ownedCount: function () { return PB.state.bugs.length; },

    release: function (index) {
      var bug = PB.state.bugs[index];
      if (!bug) return 0;
      PB.state.bugs.splice(index, 1);
      var sp = PB.speciesById[bug.sid];
      var refund = Math.max(1, Math.floor(PB.rarity[sp.rarity].value / 2));
      PB.addCandy(refund);
      return refund;
    },
  };

})(window.PB = window.PB || {});
