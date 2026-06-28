/* ===========================================================================
   merge.js — the Lab. Combine two of the SAME species (and same tier) into one
   stronger, bigger, higher-tier creature. It keeps the better talent (and may
   gain one). The two ingredients are used up.
   =========================================================================== */
(function (PB) {
  "use strict";

  PB.merge = {
    canMerge: function (a, b) {
      if (!a || !b || a.uid === b.uid) return false;
      return a.sid === b.sid && a.tier === b.tier;
    },

    // candidate partners for a given bug (same species + tier, different uid)
    partnersFor: function (uid) {
      var a = PB.bugByUid(uid); if (!a) return [];
      return PB.state.bugs.filter(function (b) { return b.uid !== uid && b.sid === a.sid && b.tier === a.tier; });
    },

    merge: function (uidA, uidB) {
      var a = PB.bugByUid(uidA), b = PB.bugByUid(uidB);
      if (!this.canMerge(a, b)) return null;
      var talent = a.talent || b.talent || null;
      if (!talent && Math.random() < 0.3) talent = PB.talentIds[Math.floor(Math.random() * PB.talentIds.length)];
      var merged = {
        uid: PB.nextUid(), sid: a.sid, tier: a.tier + 1,
        size: Math.round(Math.max(a.size, b.size) * 1.14 * 10) / 10,
        talent: talent,
      };
      // remove ingredients (and from team)
      [uidA, uidB].forEach(function (uid) {
        var i = PB.state.bugs.findIndex(function (x) { return x.uid === uid; });
        if (i >= 0) PB.state.bugs.splice(i, 1);
        var ti = PB.state.team.indexOf(uid); if (ti >= 0) PB.state.team.splice(ti, 1);
      });
      PB.state.bugs.push(merged);
      PB.audio.evolve();
      return merged;
    },
  };

})(window.PB = window.PB || {});
