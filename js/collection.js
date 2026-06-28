/* ===========================================================================
   collection.js — your roster of caught bugs (your RPG party pool).
   =========================================================================== */
(function (PB) {
  "use strict";

  PB.collection = {
    add: function (pending) {
      var bug = { uid: PB.nextUid(), sid: pending.sid, size: pending.size, tier: 1, talent: pending.talent || null };
      PB.state.bugs.push(bug);
      PB.state.stats.caught += 1;
      PB.state.stats.dex[bug.sid] = (PB.state.stats.dex[bug.sid] || 0) + 1;
      if (PB.state.team.length < PB.config.TEAM_SIZE) PB.state.team.push(bug.uid); // auto-team early on
      return bug;
    },

    release: function (uid) {
      var b = PB.bugByUid(uid);
      if (!b) return 0;
      var i = PB.state.bugs.indexOf(b);
      PB.state.bugs.splice(i, 1);
      var ti = PB.state.team.indexOf(uid); if (ti >= 0) PB.state.team.splice(ti, 1);
      var reward = Math.max(1, Math.round(PB.bugAtk(b) / 5));
      PB.addTokens(reward);
      return reward;
    },
  };

})(window.PB = window.PB || {});
