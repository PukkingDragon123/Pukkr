/* ===========================================================================
   state.js — serialisable state + helpers for the idle RPG.
   =========================================================================== */
(function (PB) {
  "use strict";

  PB.state = null;

  PB.newGame = function () {
    PB.state = {
      meta: { version: 4 },
      tokens: PB.config.START_TOKENS,
      bugs: [],                 // { uid, sid, size, tier, talent }
      team: [],                 // uids (max TEAM_SIZE)
      area: 0,
      unlocked: 1,              // number of areas unlocked
      wave: {},                 // areaId -> highest wave reached
      bait: { fruit: null, remaining: 0, ready: false },
      pending: null,            // a bug waiting to be caught
      stats: { caught: 0, dex: {} },
      flags: { tutorial: false },
      uidSeq: 1,
      lastSeen: nowMs(),
    };
    return PB.state;
  };

  function nowMs() { try { return Date.now(); } catch (e) { return 0; } }

  PB.loadInto = function (data) {
    data.bugs = data.bugs || [];
    data.bugs.forEach(function (b) {
      if (typeof b.size !== "number") b.size = PB.speciesById[b.sid] ? PB.speciesById[b.sid].baseSize : 30;
      if (typeof b.tier !== "number") b.tier = 1;
      if (b.talent === undefined) b.talent = null;
    });
    data.team = (data.team || []).filter(function (uid) { return data.bugs.some(function (b) { return b.uid === uid; }); });
    data.wave = data.wave || {};
    data.bait = data.bait || { fruit: null, remaining: 0, ready: false };
    data.stats = data.stats || { caught: 0, dex: {} };
    if (!data.stats.dex) data.stats.dex = {};
    data.flags = data.flags || {};
    if (typeof data.tokens !== "number") data.tokens = 0;
    if (typeof data.area !== "number") data.area = 0;
    if (typeof data.unlocked !== "number") data.unlocked = 1;
    if (typeof data.uidSeq !== "number") data.uidSeq = data.bugs.length + 1;
    if (data.pending === undefined) data.pending = null;
    // offline catch-up: advance the bait timer by time away (cap 8h)
    var elapsed = Math.min(8 * 3600, Math.max(0, (nowMs() - (data.lastSeen || nowMs())) / 1000));
    if (data.bait.fruit && !data.bait.ready) data.bait.remaining = Math.max(0, data.bait.remaining - elapsed);
    PB.state = data;
    return data;
  };

  PB.touchSave = function () { PB.state.lastSeen = nowMs(); };
  PB.nextUid = function () { return PB.state.uidSeq++; };

  // ---- tokens --------------------------------------------------------------
  PB.addTokens = function (n) { PB.state.tokens = Math.max(0, PB.state.tokens + n); };
  PB.spendTokens = function (n) { if (PB.state.tokens < n) return false; PB.state.tokens -= n; return true; };

  // ---- dex -----------------------------------------------------------------
  PB.dexSeen = function (sid) { return (PB.state.stats.dex[sid] || 0) > 0; };
  PB.dexCount = function () { var n = 0; for (var k in PB.state.stats.dex) if (PB.state.stats.dex[k] > 0) n++; return n; };

  // ---- per-bug combat stats -----------------------------------------------
  PB.sizeRatio = function (bug) { var sp = PB.speciesById[bug.sid]; return bug.size / sp.baseSize; };
  PB.sizeLabel = function (bug) { return PB.sizeLabelFor(PB.sizeRatio(bug)); };
  PB.bugAtk = function (bug) {
    var sp = PB.speciesById[bug.sid];
    return Math.round(PB.rarity[sp.rarity].value * bug.tier * (0.7 + PB.sizeRatio(bug) * 0.6));
  };
  PB.bugHp = function (bug) { return PB.bugAtk(bug) * 6; };

  // ---- team ----------------------------------------------------------------
  PB.bugByUid = function (uid) { for (var i = 0; i < PB.state.bugs.length; i++) if (PB.state.bugs[i].uid === uid) return PB.state.bugs[i]; return null; };
  PB.teamBugs = function () { return PB.state.team.map(PB.bugByUid).filter(Boolean); };
  PB.inTeam = function (uid) { return PB.state.team.indexOf(uid) >= 0; };
  PB.toggleTeam = function (uid) {
    var i = PB.state.team.indexOf(uid);
    if (i >= 0) { PB.state.team.splice(i, 1); return true; }
    if (PB.state.team.length >= PB.config.TEAM_SIZE) return false;
    PB.state.team.push(uid); return true;
  };

  PB.teamBuffs = function () {
    var b = { atkPct: 0, crit: 0.05, heal: 0, hpPct: 0, idlePct: 0.35 };
    PB.teamBugs().forEach(function (bug) {
      if (!bug.talent) return;
      var t = PB.talents[bug.talent]; if (!t) return;
      if (t.atkPct) b.atkPct += t.atkPct;
      if (t.crit) b.crit += t.crit;
      if (t.heal) b.heal += t.heal;
      if (t.hpPct) b.hpPct += t.hpPct;
      if (t.idlePct) b.idlePct += t.idlePct;
    });
    return b;
  };
  PB.teamAtk = function () {
    var base = 0; PB.teamBugs().forEach(function (b) { base += PB.bugAtk(b); });
    return Math.max(1, Math.round(base * (1 + PB.teamBuffs().atkPct)));
  };
  PB.teamMaxHp = function () {
    var base = 0; PB.teamBugs().forEach(function (b) { base += PB.bugHp(b); });
    return Math.max(10, Math.round(base * (1 + PB.teamBuffs().hpPct)));
  };

  // ---- areas ---------------------------------------------------------------
  PB.area = function () { return PB.areas[PB.state.area]; };
  PB.areaWave = function () { return PB.state.wave[PB.area().id] || 1; };

})(window.PB = window.PB || {});
