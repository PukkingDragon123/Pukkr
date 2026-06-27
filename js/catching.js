/* ===========================================================================
   catching.js — the timing-based catch mini-game.
   A marker sweeps a meter; press the action key while it sits in the green
   "catch zone". Better nets widen the zone; skittish bugs move the marker
   faster and shrink the zone. Three attempts before a bug bolts.
   =========================================================================== */
(function (PB) {
  "use strict";

  var active = false;
  var entity = null;
  var sp = null;
  var pos = 0, dir = 1, speed = 1;
  var zoneStart = 0, zoneW = 0.4;
  var attempts = 3;
  var cooldown = 0; // brief lock after the result so a key press doesn't bleed

  PB.catching = {
    isActive: function () { return active; },

    begin: function (e) {
      entity = e;
      sp = PB.speciesById[e.sid];
      var sk = sp.skittish || 0;
      zoneW = PB.catchZone(sk);
      zoneStart = Math.random() * (1 - zoneW);
      pos = 0; dir = 1;
      speed = 0.85 + sk * 1.25;
      attempts = 3;
      active = true;
      cooldown = 0.15;
      PB.dexEntry(sp.id); // mark discovered
      PB.audio.swing();
      PB.ui.openCatch(sp, zoneStart, zoneW, attempts);
    },

    update: function (dt) {
      if (!active) return;
      if (cooldown > 0) cooldown = Math.max(0, cooldown - dt);
      pos += dir * speed * dt;
      if (pos >= 1) { pos = 1; dir = -1; }
      if (pos <= 0) { pos = 0; dir = 1; }
      PB.ui.setCatchMarker(pos);
    },

    // called when the player presses the action key during a catch
    strike: function () {
      if (!active || cooldown > 0) return;
      var hit = pos >= zoneStart && pos <= zoneStart + zoneW;
      if (hit) { this._succeed(); return; }
      attempts -= 1;
      PB.audio.fail();
      if (attempts <= 0) { this._fail(); return; }
      // a miss: the bug gets twitchy — faster marker, shifted zone
      speed += 0.35;
      zoneStart = Math.random() * (1 - zoneW);
      PB.ui.setCatchZone(zoneStart, zoneW);
      PB.ui.setCatchAttempts("Missed! " + attempts + " " + (attempts === 1 ? "try" : "tries") + " left");
      cooldown = 0.12;
    },

    cancel: function () {
      if (!active) return;
      active = false; entity = null; sp = null;
      PB.ui.closeCatch();
    },

    _succeed: function () {
      var base = sp.baseSize;
      var size = Math.round(base * (0.72 + Math.random() * 0.56) * 10) / 10;
      var firstCatch = (PB.dexEntry(sp.id).caught === 0);
      var record = PB.collection.addCatch(sp.id, size);
      PB.spawns.remove(entity);
      active = false;
      PB.ui.closeCatch();
      PB.audio.catch();
      var msg = "Caught " + sp.name + "! (" + size + " mm)";
      if (firstCatch) msg = "✨ New! " + msg;
      else if (record) msg = "📏 Record size! " + msg;
      PB.ui.toast(msg, "good");
      PB.state.flags.tutorialCatch = true;
      entity = null; sp = null;
    },

    _fail: function () {
      PB.ui.setCatchAttempts("It wriggled free and got away!");
      PB.spawns.scare(entity);
      cooldown = 999;            // lock out further strikes during the wind-down
      var self = this;
      setTimeout(function () { if (active) self.cancel(); }, 700);
    },
  };

})(window.PB = window.PB || {});
