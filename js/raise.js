/* ===========================================================================
   raise.js — raising your creatures in the Garden. Feed them (with candy) to
   raise their Love; happy creatures gently drip candy back to you over time.
   =========================================================================== */
(function (PB) {
  "use strict";

  var LOVE_DECAY = 0.04;   // love lost per second (very gentle)
  var BASE_DRIP  = 0.04;   // candy/sec at zero love
  var LOVE_DRIP  = 0.11;   // extra candy/sec at full love

  PB.raise = {
    feed: function (index, feedId) {
      var bug = PB.state.bugs[index];
      if (!bug) return { ok: false };
      var feed = PB.feeds.filter(function (f) { return f.id === feedId; })[0];
      if (!feed) return { ok: false };
      if (!PB.spendCandy(feed.cost)) return { ok: false, reason: "poor" };
      bug.love = Math.min(100, bug.love + feed.love);
      PB.audio.candy();
      return { ok: true, full: bug.love >= 100 };
    },

    // passive candy from happy creatures; love fades very gently
    update: function (dt) {
      var bugs = PB.state.bugs, earned = 0;
      for (var i = 0; i < bugs.length; i++) {
        var b = bugs[i];
        b.love = Math.max(0, b.love - LOVE_DECAY * dt);
        b.candyBuf += (BASE_DRIP + (b.love / 100) * LOVE_DRIP) * dt;
        if (b.candyBuf >= 1) { var w = Math.floor(b.candyBuf); b.candyBuf -= w; earned += w; }
      }
      if (earned > 0) PB.addCandy(earned);
      return earned;
    },
  };

})(window.PB = window.PB || {});
