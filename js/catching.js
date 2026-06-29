/* ===========================================================================
   catching.js — the shrinking-bar catch mini-game. Triggered when a baited bug
   appears. It is forgiving: a wide green that slows to a floor (never auto-fails),
   a grace period before it shrinks, several tries, and edge-magnetism on taps.
   Aim for the bright sweet spot for a bigger catch.
   =========================================================================== */
(function (PB) {
  "use strict";

  // halved rarity penalties — even Epic stays catchable
  var SK = { common: 0.06, uncommon: 0.14, rare: 0.24, epic: 0.36 };
  var MIN = 0.16, MAG = 0.05, GRACE = 0.6;   // floor keeps the bar always winnable

  var active = false, slotIx = -1, pending = null, sp = null;
  var pos = 0, dir = 1, speed = 1, zoneW = 0.5, zoneStart = 0, shrink = 0.02;
  var cooldown = 0, grace = 0, attempts = 0;

  PB.catching = {
    isActive: function () { return active; },

    begin: function (slot) {
      if (active) return;
      var s = PB.state.lures[slot]; if (!s || !s.ready || !s.pending) return;
      slotIx = slot; pending = s.pending; sp = PB.speciesById[pending.sid];
      var sk = SK[sp.rarity] || 0.1, a = PB.assist();
      zoneW = Math.min(0.85, PB.config.CATCH_ZONE * (1 - sk * 0.5) + 0.04 * a);
      zoneStart = Math.random() * (1 - zoneW);
      pos = Math.random() < 0.5 ? 0 : 1; dir = pos === 0 ? 1 : -1;
      speed = (0.6 + sk * 0.7) * (1 - 0.06 * a);
      shrink = PB.config.CATCH_SHRINK * (1 + sk);
      attempts = 3 + a;
      cooldown = 0.12; grace = GRACE;
      active = true;
      PB.audio.swing();
      PB.ui.openCatch(sp, zoneStart, zoneW, pending.sparkle, attempts);
    },

    update: function (dt) {
      if (!active) return;
      if (cooldown > 0) cooldown = Math.max(0, cooldown - dt);
      if (grace > 0) grace = Math.max(0, grace - dt);
      pos += dir * speed * dt;
      if (pos >= 1) { pos = 1; dir = -1; }
      if (pos <= 0) { pos = 0; dir = 1; }
      if (grace <= 0 && zoneW > MIN) {
        zoneW = Math.max(MIN, zoneW - shrink * dt);
        if (zoneStart + zoneW > 1) zoneStart = 1 - zoneW;
      }
      PB.ui.setCatchZone(zoneStart, zoneW);
      PB.ui.setCatchMarker(pos);
    },

    strike: function () {
      if (!active || cooldown > 0) return;
      // edge-magnetism: a near-miss snaps in
      if (pos >= zoneStart - MAG && pos <= zoneStart + zoneW + MAG) { this._succeed(); return; }
      attempts -= 1;
      PB.audio.fail(); cooldown = 0.14;
      zoneW = Math.max(MIN, zoneW - 0.03);
      if (attempts <= 0) { this._fail(); return; }
      PB.ui.setCatchAttempts("Just missed! Tries left: " + attempts);
    },

    cancel: function () { if (!active) return; active = false; pending = null; sp = null; slotIx = -1; PB.ui.closeCatch(); },

    _succeed: function () {
      var center = zoneStart + zoneW / 2;
      var acc = Math.max(0, 1 - Math.abs(pos - center) / (zoneW / 2 + MAG));
      var grade = acc >= 0.75 ? "PERFECT" : acc >= 0.4 ? "GREAT" : "GOOD";
      var bonus = acc >= 0.75 ? 0.18 : acc >= 0.4 ? 0.10 : 0.04;
      pending.size = Math.round(pending.size * (1 + bonus) * 10) / 10;
      var isNew = !PB.dexSeen(pending.sid);
      var bug = PB.collection.add(pending);
      active = false; PB.ui.closeCatch(); PB.audio.catch();
      PB.bait.clear(slotIx); slotIx = -1;
      PB.state.flags.tutorial = true;
      if (PB.quests) PB.quests.progress("catch", 1);
      PB.ui.openCatchResult({ bug: bug, acc: acc, grade: grade, isNew: isNew });
      pending = null; sp = null;
    },

    _fail: function () {
      active = false; PB.ui.closeCatch(); PB.audio.fail();
      PB.bait.clear(slotIx); slotIx = -1;
      PB.ui.toast("It wriggled free and got away! 🍃", "");
      pending = null; sp = null;
    },
  };

})(window.PB = window.PB || {});
