/* ===========================================================================
   catching.js — the shrinking-bar catch mini-game. Triggered when a baited bug
   appears. Hit the green (aim for the bright sweet spot) before it closes. A
   centered hit makes a slightly bigger catch.
   =========================================================================== */
(function (PB) {
  "use strict";

  var SK = { common: 0.12, uncommon: 0.28, rare: 0.48, epic: 0.72 };
  var active = false, pending = null, sp = null;
  var pos = 0, dir = 1, speed = 1, zoneW = 0.4, zoneStart = 0, shrink = 0.06, cooldown = 0;
  var MIN = 0.05;

  PB.catching = {
    isActive: function () { return active; },

    begin: function (p) {
      pending = p; sp = PB.speciesById[p.sid];
      var sk = SK[sp.rarity] || 0.2;
      zoneW = Math.max(0.2, PB.config.CATCH_ZONE * (1 - sk * 0.25));
      zoneStart = Math.random() * (1 - zoneW);
      pos = Math.random(); dir = Math.random() < 0.5 ? 1 : -1;
      speed = 0.95 + sk * 1.4;
      shrink = PB.config.CATCH_SHRINK * (1 + sk * 1.2);
      active = true; cooldown = 0.12;
      PB.audio.swing();
      PB.ui.openCatch(sp, zoneStart, zoneW, p.sparkle);
    },

    update: function (dt) {
      if (!active) return;
      if (cooldown > 0) cooldown = Math.max(0, cooldown - dt);
      pos += dir * speed * dt;
      if (pos >= 1) { pos = 1; dir = -1; }
      if (pos <= 0) { pos = 0; dir = 1; }
      zoneW = Math.max(0, zoneW - shrink * dt);
      if (zoneStart + zoneW > 1) zoneStart = 1 - zoneW;
      PB.ui.setCatchZone(zoneStart, zoneW);
      PB.ui.setCatchMarker(pos);
      if (zoneW <= MIN) this._fail();
    },

    strike: function () {
      if (!active || cooldown > 0) return;
      if (pos >= zoneStart && pos <= zoneStart + zoneW) { this._succeed(); return; }
      PB.audio.fail(); cooldown = 0.1; zoneW = Math.max(0, zoneW - 0.05);
      PB.ui.setCatchAttempts("Missed! Quick!");
    },

    cancel: function () { if (!active) return; active = false; pending = null; sp = null; PB.ui.closeCatch(); },

    _succeed: function () {
      var center = zoneStart + zoneW / 2;
      var acc = Math.max(0, 1 - Math.abs(pos - center) / (zoneW / 2));
      pending.size = Math.round(pending.size * (1 + acc * 0.15) * 10) / 10;
      var isNew = !PB.dexSeen(pending.sid);
      var bug = PB.collection.add(pending);
      active = false; PB.ui.closeCatch(); PB.audio.catch();
      PB.bait.clear();
      PB.state.flags.tutorial = true;
      PB.ui.openCatchResult({ bug: bug, acc: acc, isNew: isNew });
      pending = null; sp = null;
    },

    _fail: function () {
      active = false; PB.ui.closeCatch(); PB.audio.fail();
      PB.bait.clear();
      PB.ui.toast("It wriggled free and got away! 🍃", "");
      pending = null; sp = null;
    },
  };

})(window.PB = window.PB || {});
