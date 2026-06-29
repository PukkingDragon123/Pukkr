/* ===========================================================================
   state.js — serialisable state + helpers for the idle / gacha RPG.
   =========================================================================== */
(function (PB) {
  "use strict";

  PB.state = null;

  function nowMs() { try { return Date.now(); } catch (e) { return 0; } }
  function todayStr() { try { return new Date().toISOString().slice(0, 10); } catch (e) { return ""; } }

  function freshLures(n) {
    var a = [];
    for (var i = 0; i < n; i++) a.push({ fruit: null, remaining: 0, ready: false, pending: null });
    return a;
  }
  function freshQuests() {
    // pick three distinct templates to start
    var pool = PB.questDefs.slice(), out = [];
    for (var i = 0; i < 3 && pool.length; i++) {
      var k = Math.floor(Math.random() * pool.length);
      out.push(makeQuest(pool.splice(k, 1)[0]));
    }
    return out;
  }
  function makeQuest(def) {
    return { type: def.type, target: def.target, prog: 0, text: def.text.replace("{t}", def.target),
      reward: def.reward, done: false };
  }
  PB.makeQuest = makeQuest;
  PB.freshQuests = freshQuests;

  PB.newGame = function () {
    PB.state = {
      meta: { version: 5 },
      tokens: PB.config.START_TOKENS,
      glimmer: PB.config.START_GLIMMER,
      bugs: [],                 // { uid, sid, size, tier, talent }
      team: [],                 // uids (max teamSize())
      area: 0,
      unlocked: 1,              // number of areas unlocked
      wave: {},                 // areaId -> highest wave reached
      lures: freshLures(1),     // bait slots, grows with the "lures" upgrade
      upgrades: { lures: 0, comfy: 0, assist: 0, team: 0, idle: 0, greed: 0, luck: 0 },
      pity: { sinceRare: 0, sinceEpic: 0 },
      quests: freshQuests(),
      stats: { caught: 0, dex: {}, battles: 0, merges: 0, pulls: 0, bestCombo: 0 },
      flags: { tutorial: false },
      lastDew: "",
      uidSeq: 1,
      lastSeen: nowMs(),
    };
    return PB.state;
  };

  PB.loadInto = function (data) {
    data.bugs = data.bugs || [];
    data.bugs.forEach(function (b) {
      if (typeof b.size !== "number") b.size = PB.speciesById[b.sid] ? PB.speciesById[b.sid].baseSize : 30;
      if (typeof b.tier !== "number") b.tier = 1;
      if (b.talent === undefined) b.talent = null;
    });
    data.team = (data.team || []).filter(function (uid) { return data.bugs.some(function (b) { return b.uid === uid; }); });
    data.wave = data.wave || {};
    if (typeof data.tokens !== "number") data.tokens = 0;
    if (typeof data.glimmer !== "number") data.glimmer = 0;
    if (typeof data.area !== "number") data.area = 0;
    if (typeof data.unlocked !== "number") data.unlocked = 1;
    if (typeof data.uidSeq !== "number") data.uidSeq = data.bugs.reduce(function (m, b) { return Math.max(m, b.uid || 0); }, 0) + 1;
    data.upgrades = data.upgrades || {};
    ["lures", "comfy", "assist", "team", "idle", "greed", "luck"].forEach(function (k) {
      if (typeof data.upgrades[k] !== "number") data.upgrades[k] = 0;
    });
    data.pity = data.pity || { sinceRare: 0, sinceEpic: 0 };
    data.stats = data.stats || { caught: 0, dex: {} };
    if (!data.stats.dex) data.stats.dex = {};
    ["caught", "battles", "merges", "pulls", "bestCombo"].forEach(function (k) { if (typeof data.stats[k] !== "number") data.stats[k] = 0; });
    data.flags = data.flags || {};
    if (typeof data.lastDew !== "string") data.lastDew = "";

    // migrate the old single bait object (v4) → lures[0]
    var slots = 1 + data.upgrades.lures;
    if (!Array.isArray(data.lures)) {
      data.lures = freshLures(slots);
      if (data.bait && data.bait.fruit) { data.lures[0] = { fruit: data.bait.fruit, remaining: data.bait.remaining || 0, ready: !!data.bait.ready, pending: data.pending || null }; }
    }
    // make sure the lures array matches the upgrade count
    while (data.lures.length < slots) data.lures.push({ fruit: null, remaining: 0, ready: false, pending: null });
    data.lures.forEach(function (s) { if (s.pending === undefined) s.pending = null; });
    delete data.bait; delete data.pending;

    if (!Array.isArray(data.quests) || !data.quests.length) data.quests = freshQuests();

    // offline catch-up: advance each waiting lure + grant idle tokens, capped.
    var elapsed = Math.min(PB.config.OFFLINE_CAP_H * 3600, Math.max(0, (nowMs() - (data.lastSeen || nowMs())) / 1000));
    data._offline = { sec: elapsed, tokens: 0 };
    data.lures.forEach(function (s) { if (s.fruit && !s.ready) s.remaining = Math.max(0, s.remaining - elapsed); });

    PB.state = data;
    // idle token earnings while away (needs helpers below)
    if (elapsed > 60) {
      var perMin = Math.max(1, Math.round(PB.teamAtk() * 0.1));
      data._offline.tokens = Math.min(600, Math.round(perMin * (elapsed / 60)));
      data.tokens += data._offline.tokens;
    }
    // freshen lastSeen now so the bonus can't be re-farmed by reloading
    // (enterPlay persists the save immediately after granting daily dew).
    data.lastSeen = nowMs();
    return data;
  };

  PB.touchSave = function () { PB.state.lastSeen = nowMs(); };
  PB.nextUid = function () { return PB.state.uidSeq++; };
  PB.today = todayStr;

  // Daily Dew: +DAILY_DEW glimmer the first time you play on a new calendar day.
  PB.grantDailyDew = function () {
    var d = todayStr();
    if (!d || PB.state.lastDew === d) return 0;
    PB.state.lastDew = d;
    PB.addGlimmer(PB.config.DAILY_DEW);
    return PB.config.DAILY_DEW;
  };

  // ---- currencies ----------------------------------------------------------
  PB.addTokens = function (n) { PB.state.tokens = Math.max(0, PB.state.tokens + Math.round(n)); };
  PB.spendTokens = function (n) { if (PB.state.tokens < n) return false; PB.state.tokens -= n; return true; };
  PB.addGlimmer = function (n) { PB.state.glimmer = Math.max(0, PB.state.glimmer + Math.round(n)); };
  PB.spendGlimmer = function (n) { if (PB.state.glimmer < n) return false; PB.state.glimmer -= n; return true; };

  // ---- upgrades (derived) --------------------------------------------------
  PB.upLevel = function (key) { return PB.state.upgrades[key] || 0; };
  PB.upMaxed = function (key) { return PB.upLevel(key) >= PB.upgradeById[key].max; };
  PB.upCost = function (key) { var u = PB.upgradeById[key], l = PB.upLevel(key); return l < u.max ? u.costs[l] : null; };
  PB.buyUpgrade = function (key) {
    var cost = PB.upCost(key);
    if (cost == null) return false;
    if (!PB.spendTokens(cost)) return false;
    PB.state.upgrades[key]++;
    if (key === "lures") { PB.state.lures.push({ fruit: null, remaining: 0, ready: false, pending: null }); }
    return true;
  };
  PB.lureCount = function () { return 1 + PB.upLevel("lures"); };
  PB.teamSize = function () { return PB.config.TEAM_SIZE + PB.upLevel("team"); };
  PB.baitMult = function () { return Math.max(0.5, 1 - 0.10 * PB.upLevel("comfy")); };
  PB.idleBonus = function () { return 0.12 * PB.upLevel("idle"); };
  PB.greedMult = function () { return 1 + 0.12 * PB.upLevel("greed"); };
  PB.luckCrit = function () { return 0.04 * PB.upLevel("luck"); };
  PB.pullTalentBonus = function () { return 0.05 * PB.upLevel("luck"); };
  PB.assist = function () { return PB.upLevel("assist"); };

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
    if (PB.state.team.length >= PB.teamSize()) return false;
    PB.state.team.push(uid); return true;
  };

  PB.teamBuffs = function () {
    var b = { atkPct: 0, crit: 0.05 + PB.luckCrit(), heal: 0, hpPct: 0, idlePct: 0.35 + PB.idleBonus() };
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

  // species reachable for capsule pulls (any unlocked area's bugs)
  PB.unlockedPool = function () {
    var seen = {}, out = [];
    for (var i = 0; i < PB.state.unlocked && i < PB.areas.length; i++) {
      PB.areas[i].bugs.forEach(function (sid) { if (!seen[sid]) { seen[sid] = 1; out.push(sid); } });
    }
    return out;
  };

})(window.PB = window.PB || {});
