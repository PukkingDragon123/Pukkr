/* ===========================================================================
   garden.js — growing creatures. A creature's `grow` (0..1) rises slowly over
   time (faster the better your garden), and faster when you feed it. As it
   grows it gets bigger and worth more. Grown creatures gently drip candy.
   =========================================================================== */
(function (PB) {
  "use strict";

  var PASSIVE = 0.0045;  // grow/sec at garden level 0
  var DRIP    = 0.03;    // candy/sec scaling

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

    update: function (dt) {
      var g = PB.gardenGrowth(), d = PB.gardenDrip(), earned = 0;
      var bugs = PB.state.bugs;
      for (var i = 0; i < bugs.length; i++) {
        var b = bugs[i];
        if (b.grow < 1) b.grow = Math.min(1, b.grow + PASSIVE * g * dt);
        b.candyBuf = (b.candyBuf || 0) + DRIP * d * (0.35 + b.grow) * dt;
        if (b.candyBuf >= 1) { var w = Math.floor(b.candyBuf); b.candyBuf -= w; earned += w; }
      }
      if (earned > 0) PB.addCandy(earned);
      return earned;
    },
  };

})(window.PB = window.PB || {});
