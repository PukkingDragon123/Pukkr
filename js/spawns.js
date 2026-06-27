/* ===========================================================================
   spawns.js — creatures that drift across the current location. There is no
   player; you simply click/tap a creature to try to catch it. Which creatures
   appear depends on the location (Garden vs Woods) and the time of day.
   =========================================================================== */
(function (PB) {
  "use strict";

  var entities = [];
  var rand = Math.random;

  function weightedPick(list) {
    var total = 0, i;
    for (i = 0; i < list.length; i++) total += PB.rarity[list[i].rarity].weight;
    var r = rand() * total;
    for (i = 0; i < list.length; i++) {
      r -= PB.rarity[list[i].rarity].weight;
      if (r <= 0) return list[i];
    }
    return list[list.length - 1];
  }

  function pickSpecies(period) {
    var pool = PB.scene.pool(period);
    if (!pool.length) return null;
    var lure = PB.lureRare();
    if (lure > 0 && rand() < lure) {
      var rares = pool.filter(function (s) { return s.rarity === "rare" || s.rarity === "epic"; });
      if (rares.length) return weightedPick(rares);
    }
    return weightedPick(pool);
  }

  function spawnOne(period) {
    var sp = pickSpecies(period);
    if (!sp) return;
    var b = PB.scene.bounds();
    var winged = sp.look && sp.look.wings && sp.look.wings !== "none";
    var y = b.y0 + rand() * (b.y1 - b.y0) * (winged ? 0.8 : 1);
    entities.push({
      sid: sp.id,
      x: b.x0 + 20 + rand() * (b.x1 - b.x0 - 40),
      baseY: y,
      y: y,
      dirX: rand() < 0.5 ? -1 : 1,
      speed: 8 + rand() * 14 + (sp.skittish || 0) * 12,
      bobAmp: winged ? 10 + rand() * 8 : 3 + rand() * 3,
      bobSpd: winged ? 3 + rand() * 2 : 1.5 + rand(),
      phase: rand() * Math.PI * 2,
      t: rand() * 100,
      face: 1,
      life: 14 + rand() * 16,
      alpha: 0,
      state: "in",
      retarget: 1 + rand() * 2,
    });
  }

  PB.spawns = {
    reset: function () { entities = []; },
    list: function () { return entities; },

    update: function (dt) {
      var period = PB.time.period();
      var b = PB.scene.bounds();

      for (var i = entities.length - 1; i >= 0; i--) {
        var e = entities[i];
        var sp = PB.speciesById[e.sid];
        e.t += dt * 60;
        e.phase += dt * e.bobSpd;
        e.life -= dt;

        // fade in / out
        if (e.state === "in") { e.alpha = Math.min(1, e.alpha + dt * 2.5); if (e.alpha >= 1) e.state = "live"; }
        else if (e.state === "out") { e.alpha -= dt * 2.2; if (e.alpha <= 0) { entities.splice(i, 1); continue; } }

        // gentle wandering
        e.retarget -= dt;
        if (e.retarget <= 0) { e.retarget = 1.5 + rand() * 2.5; if (rand() < 0.4) e.dirX *= -1; }
        e.x += e.dirX * e.speed * dt;
        if (e.x < b.x0) { e.x = b.x0; e.dirX = 1; }
        if (e.x > b.x1) { e.x = b.x1; e.dirX = -1; }
        e.face = e.dirX < 0 ? -1 : 1;
        e.y = e.baseY + Math.sin(e.phase) * e.bobAmp;

        // time-of-day change or natural lifetime → drift away
        if (e.state === "live" && (e.life <= 0 || sp.times.indexOf(period) < 0)) e.state = "out";
      }

      var target = PB.crowdSize();
      var guard = 0;
      while (entities.length < target && guard++ < 4) spawnOne(period);
    },

    draw: function (ctx) {
      var vis = entities.slice().sort(function (a, b) { return a.baseY - b.baseY; });
      for (var i = 0; i < vis.length; i++) {
        var e = vis[i];
        var sp = PB.speciesById[e.sid];
        var hasArt = PB.art.has(e.sid) && PB.art.creatureImg(e.sid);
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, e.alpha));
        // soft shadow on the ground (at baseY, not the bobbing y)
        ctx.fillStyle = "rgba(40,40,30,0.18)";
        ctx.beginPath();
        ctx.ellipse(e.x, e.baseY + (hasArt ? 40 : 22), hasArt ? 30 : 20, hasArt ? 9 : 7, 0, 0, Math.PI * 2);
        ctx.fill();
        if (hasArt) {
          PB.art.drawCreature(ctx, e.sid, e.x, e.y + 44, 92, e.face < 0);
        } else {
          ctx.save();
          if (e.face < 0) { ctx.translate(e.x * 2, 0); ctx.scale(-1, 1); }
          PB.sprites.drawBug(ctx, sp.look, e.x, e.y, 66, e.t);
          ctx.restore();
        }
        ctx.restore();
      }
    },

    // topmost creature under a screen point (for click/tap to catch)
    hitTest: function (px, py) {
      var best = null, bestY = -Infinity;
      for (var i = 0; i < entities.length; i++) {
        var e = entities[i];
        if (e.state === "out") continue;
        var hasArt = PB.art.has(e.sid);
        var rx = hasArt ? 46 : 36, ry = hasArt ? 56 : 40;
        var cx = e.x, cy = e.y + (hasArt ? 8 : -4);
        var dx = (px - cx) / rx, dy = (py - cy) / ry;
        if (dx * dx + dy * dy <= 1 && e.baseY > bestY) { best = e; bestY = e.baseY; }
      }
      return best;
    },

    remove: function (e) {
      var i = entities.indexOf(e);
      if (i >= 0) entities.splice(i, 1);
    },

    // a failed catch: the creature darts away
    scare: function (e) { e.state = "out"; e.speed += 40; },
  };

})(window.PB = window.PB || {});
