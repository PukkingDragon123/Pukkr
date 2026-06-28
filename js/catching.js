/* ===========================================================================
   catching.js — the catch mini-game. The marker sweeps while the green zone
   steadily SHRINKS; press/tap while the marker is inside it before it closes.
   A better Net (shop) starts the zone wider and shrinks it slower. Skittish
   creatures sweep faster and close quicker. A miss nips the zone smaller.
   =========================================================================== */
(function (PB) {
  "use strict";

  var active = false, entity = null, sp = null;
  var pos = 0, dir = 1, speed = 1, zoneW = 0.4, zoneStart = 0, shrink = 0.07, cooldown = 0;
  var MIN = 0.055;

  PB.catching = {
    isActive: function () { return active; },

    begin: function (e) {
      entity = e; sp = PB.speciesById[e.sid];
      var sk = sp.skittish || 0;
      zoneW = Math.max(0.22, PB.catchZone() * (1 - sk * 0.25));
      zoneStart = Math.random() * (1 - zoneW);
      pos = Math.random(); dir = Math.random() < 0.5 ? 1 : -1;
      speed = 0.95 + sk * 1.5;
      shrink = PB.catchShrink() * (1 + sk * 1.2);
      active = true; cooldown = 0.12;
      PB.dexEntry(sp.id);
      PB.audio.swing();
      PB.ui.openCatch(sp, zoneStart, zoneW);
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
      PB.audio.fail();
      cooldown = 0.1;
      zoneW = Math.max(0, zoneW - 0.05); // a miss costs you a little zone
      PB.ui.setCatchAttempts("Missed! Keep trying…");
    },

    cancel: function () { if (!active) return; active = false; entity = null; sp = null; PB.ui.closeCatch(); },

    _succeed: function () {
      var bug = PB.bag.add(sp.id);
      active = false; PB.ui.closeCatch(); PB.audio.catch();
      if (bug) {
        var e = PB.dexEntry(sp.id), sz = PB.sizeOf(bug);
        e.caught += 1; if (sz > e.bestSize) e.bestSize = sz;
        PB.state.stats.totalCaught += 1;
        PB.state.flags.tutorialCatch = true;
        if (entity) PB.spawns.remove(entity);
        PB.ui.toast("Caught " + sp.name + "! 🎉 Tucked into your backpack.", "good");
      } else {
        if (entity) PB.spawns.scare(entity);
        PB.ui.toast("Caught " + sp.name + "… but your backpack is full!", "");
      }
      entity = null; sp = null;
    },

    _fail: function () {
      active = false; PB.ui.closeCatch(); PB.audio.fail();
      if (entity) PB.spawns.scare(entity);
      PB.ui.toast("It wriggled free and darted off!", "");
      entity = null; sp = null;
    },
  };

})(window.PB = window.PB || {});
