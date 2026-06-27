/* ===========================================================================
   collection.js — the jar (bugs you carry) and the Bugdex records.
   =========================================================================== */
(function (PB) {
  "use strict";

  PB.collection = {
    // store a freshly caught bug; returns true if it set a new size record
    addCatch: function (sid, size) {
      var entry = PB.dexEntry(sid);
      var record = size > entry.bestSize;
      entry.caught += 1;
      entry.seen = true;
      if (record) entry.bestSize = size;
      PB.state.stats.totalCaught += 1;
      PB.state.jar.push({ sid: sid, size: size, day: PB.state.day });
      return record;
    },

    jarCount: function () { return PB.state.jar.length; },
    jarFull: function () { return PB.state.jar.length >= PB.jarCapacity(); },

    removeFromJar: function (index) {
      if (index < 0 || index >= PB.state.jar.length) return null;
      return PB.state.jar.splice(index, 1)[0];
    },

    // let a bug go for a small candy thank-you (handy for duplicates)
    release: function (index) {
      var bug = this.removeFromJar(index);
      if (!bug) return 0;
      var sp = PB.speciesById[bug.sid];
      var refund = Math.max(1, Math.floor(PB.rarity[sp.rarity].value / 2));
      PB.addCandy(refund);
      return refund;
    },

    // counts for the Bugdex header
    caughtSpecies: function () {
      var n = 0;
      for (var id in PB.state.dex) if (PB.state.dex[id].caught > 0) n++;
      return n;
    },
    seenSpecies: function () {
      var n = 0;
      for (var id in PB.state.dex) if (PB.state.dex[id].seen) n++;
      return n;
    },
    totalSpecies: function () { return PB.species.length; },
  };

})(window.PB = window.PB || {});
