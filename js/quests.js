/* ===========================================================================
   quests.js — three rolling goals at a time. Progress ticks as you play; a
   finished goal can be claimed for tokens/glimmer and is replaced by a new one.
   =========================================================================== */
(function (PB) {
  "use strict";

  PB.quests = {
    list: function () { return PB.state.quests; },
    readyCount: function () { var n = 0; PB.state.quests.forEach(function (q) { if (q.done && !q.claimed) n++; }); return n; },

    progress: function (type, n) {
      var changed = false;
      PB.state.quests.forEach(function (q) {
        if (q.done || q.type !== type) return;
        if (type === "combo") q.prog = Math.max(q.prog, n);
        else q.prog += n;
        if (q.prog >= q.target) { q.prog = q.target; q.done = true; changed = true; }
      });
      if (changed) { PB.audio.quest(); if (PB.ui && PB.ui.flagQuests) PB.ui.flagQuests(); }
    },

    claim: function (index) {
      var q = PB.state.quests[index];
      if (!q || !q.done) return null;
      if (q.reward.tokens) PB.addTokens(q.reward.tokens);
      if (q.reward.glimmer) PB.addGlimmer(q.reward.glimmer);
      var active = PB.state.quests.map(function (x) { return x.type; });
      var pool = PB.questDefs.filter(function (d) { return active.indexOf(d.type) < 0; });
      if (!pool.length) pool = PB.questDefs;
      PB.state.quests[index] = PB.makeQuest(pool[Math.floor(Math.random() * pool.length)]);
      PB.audio.buy();
      return q.reward;
    },
  };

})(window.PB = window.PB || {});
