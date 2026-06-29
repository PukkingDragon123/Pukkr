/* ===========================================================================
   merge.js — the Lab. Combine two of the SAME species (and same tier) into one
   stronger, bigger, higher-tier creature. It keeps the better talent (and may
   gain one). The two ingredients are used up. Merging pays a little Glimmer.
   =========================================================================== */
(function (PB) {
  "use strict";

  PB.merge = {
    canMerge: function (a, b) {
      if (!a || !b || a.uid === b.uid) return false;
      return a.sid === b.sid && a.tier === b.tier;
    },

    partnersFor: function (uid) {
      var a = PB.bugByUid(uid); if (!a) return [];
      return PB.state.bugs.filter(function (b) { return b.uid !== uid && b.sid === a.sid && b.tier === a.tier; });
    },

    // predicted result of merging a + b (for the Lab preview)
    preview: function (a, b) {
      if (!this.canMerge(a, b)) return null;
      var size = Math.round(Math.max(a.size, b.size) * 1.14 * 10) / 10;
      var keptTalent = a.talent || b.talent || null;
      var ghost = { sid: a.sid, tier: a.tier + 1, size: size, talent: keptTalent };
      return { sid: a.sid, tier: a.tier + 1, size: size, talent: keptTalent, atk: PB.bugAtk(ghost),
        gainsTalent: !keptTalent };
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
      [uidA, uidB].forEach(function (uid) {
        var i = PB.state.bugs.findIndex(function (x) { return x.uid === uid; });
        if (i >= 0) PB.state.bugs.splice(i, 1);
        var ti = PB.state.team.indexOf(uid); if (ti >= 0) PB.state.team.splice(ti, 1);
      });
      PB.state.bugs.push(merged);
      PB.state.stats.merges += 1;
      PB.addGlimmer(2);
      if (PB.quests) PB.quests.progress("merge", 1);
      PB.audio.evolve();
      return merged;
    },
  };

})(window.PB = window.PB || {});
