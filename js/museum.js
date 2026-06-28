/* ===========================================================================
   museum.js — display your creatures in jars, and open the doors so friends
   visit and leave candy (more when an exhibit matches the habitat they love).
   =========================================================================== */
(function (PB) {
  "use strict";

  function tierIndex() {
    var t = PB.museumTier();
    for (var i = 0; i < PB.museumTiers.length; i++) if (PB.museumTiers[i] === t) return i;
    return 0;
  }

  PB.museum = {
    has: function (sid) { return !!PB.state.museum.donated[sid]; },
    speciesCount: function () { return PB.museumSpeciesCount(); },
    tier: function () { return PB.museumTier(); },

    // move an owned creature (by uid) onto display; value scales with its size
    donate: function (uid) {
      var bug = PB.bag.byUid(uid);
      if (!bug) return { ok: false };
      var sp = PB.speciesById[bug.sid];
      if (this.has(bug.sid)) return { ok: false, reason: "dup", name: sp.name };
      var before = PB.museumTier();
      var size = PB.sizeOf(bug), reward = PB.bugValue(bug);
      PB.state.museum.donated[bug.sid] = { size: size };
      PB.dexEntry(bug.sid).donated = true;
      PB.bag.remove(uid);
      PB.addCandy(reward);
      PB.audio.donate();
      var after = PB.museumTier();
      return { ok: true, name: sp.name, reward: reward, tierUp: after !== before ? after : null };
    },

    canInvite: function () {
      return PB.museumSpeciesCount() > 0 && PB.state.museum.lastVisitDay < PB.state.day;
    },

    invite: function () {
      if (!this.canInvite()) return null;
      PB.state.museum.lastVisitDay = PB.state.day;
      var ti = tierIndex();
      var byHome = {};
      for (var sid in PB.state.museum.donated) {
        var h = PB.speciesById[sid].home;
        byHome[h] = (byHome[h] || 0) + 1;
      }
      var howMany = Math.min(PB.friends.length, 1 + ti + (Math.random() < 0.4 ? 1 : 0));
      var pool = PB.friends.slice(), visits = [], total = 0;
      for (var i = 0; i < howMany && pool.length; i++) {
        var fr = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
        var match = byHome[fr.likes] || 0;
        var candy = Math.round((6 + match * 8 + ti * 3) * (0.9 + Math.random() * 0.25));
        PB.addCandy(candy);
        PB.state.museum.visitorsServed += 1;
        total += candy;
        visits.push({ friend: fr, candy: candy });
      }
      if (visits.length) PB.audio.visitor();
      return { visits: visits, total: total };
    },
  };

})(window.PB = window.PB || {});
