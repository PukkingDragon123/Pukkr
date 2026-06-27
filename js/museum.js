/* ===========================================================================
   museum.js — donate bugs to build exhibits, then open the doors so friends
   can visit. Visitors leave candy, and they leave more when the exhibits match
   the biomes they love and the museum's reputation grows.
   =========================================================================== */
(function (PB) {
  "use strict";

  function primaryBiome(sid) { return PB.speciesById[sid].biomes[0]; }

  function tierIndex() {
    var t = PB.museumTier();
    for (var i = 0; i < PB.museumTiers.length; i++) if (PB.museumTiers[i] === t) return i;
    return 0;
  }

  PB.museum = {
    has: function (sid) { return !!PB.state.museum.donated[sid]; },

    // donate the carried bug at jar index; new species only
    donateFromJar: function (index) {
      var bug = PB.state.jar[index];
      if (!bug) return { ok: false };
      if (this.has(bug.sid)) return { ok: false, reason: "dup", name: PB.speciesById[bug.sid].name };
      return this._donate(bug.sid, bug.size, function () { PB.collection.removeFromJar(index); });
    },

    donateFromTerrarium: function (index) {
      var pod = PB.state.terrarium[index];
      if (!pod) return { ok: false };
      if (this.has(pod.sid)) return { ok: false, reason: "dup", name: PB.speciesById[pod.sid].name };
      return this._donate(pod.sid, pod.size, function () { PB.state.terrarium.splice(index, 1); });
    },

    _donate: function (sid, size, removeFn) {
      var beforeTier = PB.museumTier();
      PB.state.museum.donated[sid] = { size: size, day: PB.state.day };
      PB.dexEntry(sid).donated = true;
      removeFn();
      var sp = PB.speciesById[sid];
      var reward = PB.rarity[sp.rarity].value;
      PB.addCandy(reward);
      PB.audio.donate();
      var afterTier = PB.museumTier();
      return { ok: true, reward: reward, name: sp.name,
               tierUp: afterTier !== beforeTier ? afterTier : null };
    },

    canInvite: function () {
      return PB.museumSpeciesCount() > 0 && PB.state.museum.lastVisitDay < PB.state.day;
    },

    // open the doors for the day; returns the list of visitors and their gifts
    invite: function () {
      if (!this.canInvite()) return null;
      PB.state.museum.lastVisitDay = PB.state.day;
      var ti = tierIndex();
      var howMany = Math.min(PB.friends.length, 1 + Math.floor(ti / 2) + (Math.random() < 0.4 ? 1 : 0));

      // count donated exhibits per liked biome
      var byBiome = {};
      for (var sid in PB.state.museum.donated) {
        var b = primaryBiome(sid);
        byBiome[b] = (byBiome[b] || 0) + 1;
      }

      var diversity = Object.keys(byBiome).length; // distinct biomes on display
      var pool = PB.friends.slice();
      var visits = [], total = 0;
      for (var i = 0; i < howMany && pool.length; i++) {
        var idx = Math.floor(Math.random() * pool.length);
        var fr = pool.splice(idx, 1)[0];
        var match = byBiome[fr.likes] || 0;
        var candy = Math.round((5 + match * 5 + ti * 3 + diversity) * (0.9 + Math.random() * 0.25));
        PB.addCandy(candy);
        PB.state.museum.visitorsServed += 1;
        total += candy;
        visits.push({ friend: fr, candy: candy });
      }
      if (visits.length) PB.audio.visitor();
      return { visits: visits, total: total };
    },

    speciesCount: function () { return PB.museumSpeciesCount(); },
    tier: function () { return PB.museumTier(); },
    tierIndex: tierIndex,
    nextTier: function () {
      var n = PB.museumSpeciesCount();
      for (var i = 0; i < PB.museumTiers.length; i++) {
        if (PB.museumTiers[i].at > n) return PB.museumTiers[i];
      }
      return null;
    },
  };

})(window.PB = window.PB || {});
