/* ===========================================================================
   spawns.js — wild creatures that drift through the Whispering Woods.
   Click/tap one to try to catch it. Only the hand-drawn species appear.
   =========================================================================== */
(function (PB) {
  "use strict";

  var entities = [];
  var rand = Math.random;

  function pool() {
    var loc = PB.scene.current();
    return PB.species.filter(function (s) { return (s.locs || ["forest"]).indexOf(loc) >= 0; });
  }
  function weightedPick() {
    var list = pool(), boost = PB.forest.rareBoost, total = 0, i, w;
    if (!list.length) return null;
    var weights = list.map(function (s) {
      w = PB.rarity[s.rarity].weight;
      if (boost && (s.rarity === "rare" || s.rarity === "epic")) w *= 5;
      total += w; return w;
    });
    var r = rand() * total;
    for (i = 0; i < list.length; i++) { r -= weights[i]; if (r <= 0) return list[i]; }
    return list[list.length - 1];
  }

  function spawnOne() {
    var sp = weightedPick();
    if (!sp) return;
    var b = PB.scene.bounds();
    var y = b.y0 + rand() * (b.y1 - b.y0);
    entities.push({
      sid: sp.id,
      x: b.x0 + 20 + rand() * (b.x1 - b.x0 - 40),
      baseY: y, y: y,
      dirX: rand() < 0.5 ? -1 : 1,
      speed: 26 + rand() * 22 + (sp.skittish || 0) * 60, // fast & dodgy — hard to click
      bobAmp: 6 + rand() * 6, bobSpd: 2.2 + rand() * 1.5,
      phase: rand() * Math.PI * 2,
      face: 1,
      life: 16 + rand() * 16,
      alpha: 0, state: "in",
      retarget: 1 + rand() * 2,
    });
  }

  PB.spawns = {
    reset: function () { entities = []; },
    list: function () { return entities; },

    update: function (dt) {
      var loc = PB.scene.current();
      var catching = (loc === "forest" && PB.forest.view === "spot") || loc === "beach";
      if (!catching) { entities = []; return; }
      var b = PB.scene.bounds();
      for (var i = entities.length - 1; i >= 0; i--) {
        var e = entities[i];
        e.phase += dt * e.bobSpd; e.life -= dt;
        if (e.state === "in") { e.alpha = Math.min(1, e.alpha + dt * 2.5); if (e.alpha >= 1) e.state = "live"; }
        else if (e.state === "out") { e.alpha -= dt * 2.2; if (e.alpha <= 0) { entities.splice(i, 1); continue; } }
        e.retarget -= dt;
        if (e.retarget <= 0) { e.retarget = 0.5 + rand() * 1.4; if (rand() < 0.55) e.dirX *= -1; } // dodgy
        e.x += e.dirX * e.speed * dt;
        if (e.x < b.x0) { e.x = b.x0; e.dirX = 1; }
        if (e.x > b.x1) { e.x = b.x1; e.dirX = -1; }
        e.face = e.dirX < 0 ? -1 : 1;
        e.y = e.baseY + Math.sin(e.phase) * e.bobAmp;
        if (e.state === "live" && e.life <= 0) e.state = "out";
      }
      var guard = 0;
      while (entities.length < PB.config.CROWD && guard++ < 4) spawnOne();
    },

    draw: function (ctx) {
      var vis = entities.slice().sort(function (a, b) { return a.baseY - b.baseY; });
      for (var i = 0; i < vis.length; i++) {
        var e = vis[i];
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, e.alpha));
        ctx.fillStyle = "rgba(40,40,30,0.18)";
        ctx.beginPath(); ctx.ellipse(e.x, e.baseY + 40, 30, 9, 0, 0, Math.PI * 2); ctx.fill();
        PB.art.drawCreature(ctx, e.sid, e.x, e.y + 44, 96, e.face < 0, e.t); // squishy bob
        ctx.restore();
      }
    },

    hitTest: function (px, py) {
      var best = null, bestY = -Infinity;
      for (var i = 0; i < entities.length; i++) {
        var e = entities[i];
        if (e.state === "out") continue;
        var dx = (px - e.x) / 50, dy = (py - (e.y + 8)) / 58;
        if (dx * dx + dy * dy <= 1 && e.baseY > bestY) { best = e; bestY = e.baseY; }
      }
      return best;
    },

    remove: function (e) { var i = entities.indexOf(e); if (i >= 0) entities.splice(i, 1); },
    scare: function (e) { e.state = "out"; e.speed += 50; },
  };

})(window.PB = window.PB || {});
