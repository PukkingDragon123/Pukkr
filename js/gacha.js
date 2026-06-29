/* ===========================================================================
   gacha.js — the Capsule Machine. Spend Glimmer ✨ to pull a random bug from
   the species you've unlocked. Transparent odds + a two-tier pity (guaranteed
   Rare by 10 dry pulls, guaranteed Epic by 80). Size & talent rolls reuse the
   exact bait math so a capsule bug is never strictly better than a caught one.
   =========================================================================== */
(function (PB) {
  "use strict";

  var ORDER = ["common", "uncommon", "rare", "epic"];

  // the rarity we AIM for, reading (not mutating) the pity counters
  function rollRarity() {
    var cfg = PB.gachaCfg, p = PB.state.pity, o = cfg.odds;
    var epicChance = o.epic + Math.max(0, p.sinceEpic - cfg.epicSoft) * cfg.epicRamp;
    if (p.sinceEpic >= cfg.epicHard - 1) return "epic";
    if (Math.random() < epicChance) return "epic";
    if (p.sinceRare >= cfg.rarePity - 1) return "rare";       // hard rare floor
    var r = Math.random();
    if (r < o.rare) return "rare";
    if (r < o.rare + o.uncommon) return "uncommon";
    return "common";
  }

  // spend pity on what was actually DELIVERED, so a guaranteed Epic isn't
  // burned when the unlocked pool has no Epic species to give yet.
  function bumpPity(delivered) {
    var p = PB.state.pity;
    if (delivered === "epic") { p.sinceEpic = 0; p.sinceRare = 0; }
    else if (delivered === "rare") { p.sinceRare = 0; p.sinceEpic += 1; }
    else { p.sinceRare += 1; p.sinceEpic += 1; }
  }

  function pickSpecies(rar, pool) {
    for (var t = ORDER.indexOf(rar); t >= 0; t--) {
      var cands = pool.filter(function (sid) { return PB.speciesById[sid].rarity === ORDER[t]; });
      if (cands.length) return cands[Math.floor(Math.random() * cands.length)];
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function rollPending(rar, pool) {
    var sid = pickSpecies(rar, pool), sp = PB.speciesById[sid];
    var size = Math.round(sp.baseSize * (0.7 + Math.random() * 0.7) * 10) / 10;
    var talent = null;
    var chance = PB.rarity[sp.rarity].talent + PB.pullTalentBonus();
    if (Math.random() < chance) talent = PB.talentIds[Math.floor(Math.random() * PB.talentIds.length)];
    return { sid: sid, size: size, talent: talent, sparkle: !!talent, rarity: sp.rarity };
  }

  PB.gacha = {
    cost: function (n) { return n >= 10 ? PB.gachaCfg.costTen : PB.gachaCfg.costSingle * n; },
    canPull: function (n) { return PB.state.glimmer >= this.cost(n); },
    // pulls until the guaranteed Rare / Epic
    rareIn: function () { return Math.max(1, PB.gachaCfg.rarePity - PB.state.pity.sinceRare); },
    epicIn: function () { return Math.max(1, PB.gachaCfg.epicHard - PB.state.pity.sinceEpic); },

    pull: function (n) {
      n = n || 1;
      var cost = this.cost(n);
      if (!PB.spendGlimmer(cost)) return null;
      var pool = PB.unlockedPool(); if (!pool.length) pool = PB.area().bugs.slice();
      var results = [], gotUncommon = false;
      for (var i = 0; i < n; i++) {
        var rar = rollRarity();
        if (n >= 10 && i === n - 1 && !gotUncommon && rar === "common") rar = "uncommon"; // ×10 floor
        var pend = rollPending(rar, pool);
        bumpPity(pend.rarity);
        if (ORDER.indexOf(pend.rarity) >= 1) gotUncommon = true;
        var isNew = !PB.dexSeen(pend.sid);
        var bug = PB.collection.add(pend);
        results.push({ bug: bug, sid: pend.sid, rarity: pend.rarity, talent: pend.talent, size: pend.size, isNew: isNew });
      }
      PB.state.stats.pulls += n;
      if (PB.quests) PB.quests.progress("pull", n);
      PB.audio.pull();
      return { results: results, cost: cost };
    },

    // a Glimmer sink for collectors: reroll one bug's talent
    rerollCost: 8,
    rerollTalent: function (uid) {
      var b = PB.bugByUid(uid); if (!b) return false;
      if (!PB.spendGlimmer(this.rerollCost)) return false;
      var pool = PB.talentIds.filter(function (t) { return t !== b.talent; });
      b.talent = pool[Math.floor(Math.random() * pool.length)];
      PB.audio.reveal(1);
      return b.talent;
    },
  };

})(window.PB = window.PB || {});
