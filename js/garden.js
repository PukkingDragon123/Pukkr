/* ===========================================================================
   garden.js — growing creatures. A creature's `grow` (0..1) rises slowly over
   time (faster the better your garden), and faster when you feed it. As it
   grows it gets bigger and worth more (museum income + fight power).
   =========================================================================== */
(function (PB) {
  "use strict";

  var PASSIVE = 0.0045;  // grow/sec at garden level 0

  PB.garden = {
    feed: function (uid, feedId) {
      var b = PB.bag.byUid(uid);
      if (!b) return { ok: false };
      var feed = PB.feeds.filter(function (f) { return f.id === feedId; })[0];
      if (!feed) return { ok: false };
      if ((PB.state.food[feedId] || 0) <= 0) return { ok: false, reason: "none" };
      PB.state.food[feedId] -= 1;
      var before = b.grow;
      b.grow = Math.min(1, b.grow + feed.grow);
      var e = PB.dexEntry(b.sid), sz = PB.sizeOf(b);
      if (sz > e.bestSize) e.bestSize = sz;
      PB.audio.candy();
      return { ok: true, full: b.grow >= 1 && before < 1, gained: b.grow - before };
    },

    // creatures grow a little on their own over time (faster with garden upgrades)
    update: function (dt) {
      var g = PB.gardenGrowth(), bugs = PB.state.bugs;
      for (var i = 0; i < bugs.length; i++) {
        var b = bugs[i];
        if (b.grow < 1) b.grow = Math.min(1, b.grow + PASSIVE * g * dt);
      }
    },
  };

})(window.PB = window.PB || {});
