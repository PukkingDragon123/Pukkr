/* ===========================================================================
   collection.js — minting caught/pulled bugs into the collection, dex tracking,
   auto-teaming, and releasing spares for tokens. Discovering a new species pays
   a Glimmer bonus and advances goals.
   =========================================================================== */
(function (PB) {
  "use strict";

  PB.collection = {
    add: function (p) {
      var bug = { uid: PB.nextUid(), sid: p.sid, size: p.size, tier: 1, talent: p.talent || null };
      PB.state.bugs.push(bug);
      PB.state.stats.caught += 1;
      var wasNew = !PB.dexSeen(p.sid);
      PB.state.stats.dex[p.sid] = (PB.state.stats.dex[p.sid] || 0) + 1;
      if (wasNew) { PB.addGlimmer(3); if (PB.quests) PB.quests.progress("dex", 1); }
      var rar = PB.speciesById[p.sid].rarity;
      if ((rar === "rare" || rar === "epic") && PB.quests) PB.quests.progress("rare", 1);
      if (PB.state.team.length < PB.teamSize()) PB.state.team.push(bug.uid);
      return bug;
    },

    release: function (uid) {
      var i = PB.state.bugs.findIndex(function (b) { return b.uid === uid; });
      if (i < 0) return 0;
      var bug = PB.state.bugs[i];
      var reward = Math.max(1, Math.round(PB.bugAtk(bug) / 5));
      PB.state.bugs.splice(i, 1);
      var ti = PB.state.team.indexOf(uid); if (ti >= 0) PB.state.team.splice(ti, 1);
      PB.addTokens(reward);
      PB.audio.candy();
      return reward;
    },
  };

})(window.PB = window.PB || {});
