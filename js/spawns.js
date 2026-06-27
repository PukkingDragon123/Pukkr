/* ===========================================================================
   spawns.js — wild bugs that wander the world by biome and time of day.
   Maintains a small living population; bugs drift, hop, and skittish ones
   flee when you get close. The catch mini-game pulls a bug out of here.
   =========================================================================== */
(function (PB) {
  "use strict";

  var TARGET = 16;        // how many wild bugs roam at once
  var entities = [];
  var rand = Math.random; // world spawn variety can be non-deterministic

  function eligible(period) {
    return PB.species.filter(function (s) { return s.times.indexOf(period) >= 0; });
  }

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
    var pool = eligible(period);
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
    var biome = sp.biomes[Math.floor(rand() * sp.biomes.length)];
    var spot = PB.world.randomSpotInBiome(biome, rand);
    if (!spot) return;
    entities.push({
      sid: sp.id,
      x: spot.x, y: spot.y,
      hx: spot.x, hy: spot.y,          // home anchor (drift back toward it)
      tx: spot.x, ty: spot.y,          // wander target
      vx: 0, vy: 0,
      face: 1,
      t: rand() * 100,
      hop: rand() * Math.PI * 2,
      retarget: 0,
      life: 18 + rand() * 18,          // seconds before it naturally wanders off
      biome: biome,
      flee: 0,
    });
  }

  PB.spawns = {
    reset: function () { entities = []; },
    list: function () { return entities; },

    update: function (dt) {
      var period = PB.time.period();
      var p = PB.state.player;

      for (var i = entities.length - 1; i >= 0; i--) {
        var e = entities[i];
        var sp = PB.speciesById[e.sid];
        e.t += dt * 60;
        e.hop += dt * (4 + (sp.skittish || 0) * 6);
        e.life -= dt;

        // pick a new wander target now and then
        e.retarget -= dt;
        if (e.retarget <= 0) {
          e.retarget = 1.4 + rand() * 2.2;
          var rad = 26 + rand() * 26;
          var ang = rand() * Math.PI * 2;
          e.tx = e.hx + Math.cos(ang) * rad;
          e.ty = e.hy + Math.sin(ang) * rad;
        }

        // flee from the player if skittish and close
        var dxp = e.x - p.x, dyp = e.y - p.y;
        var distP = Math.hypot(dxp, dyp);
        var sk = sp.skittish || 0;
        if (sk > 0.1 && distP < 46) {
          e.flee = 1;
          var fl = (1 / Math.max(distP, 6));
          e.tx = e.x + dxp * fl * 60;
          e.ty = e.y + dyp * fl * 60;
        } else if (e.flee > 0) {
          e.flee = Math.max(0, e.flee - dt);
        }

        // move toward target
        var dx = e.tx - e.x, dy = e.ty - e.y;
        var d = Math.hypot(dx, dy) || 1;
        var spd = (10 + sk * 22 + e.flee * 34) * dt;
        var stepx = (dx / d) * spd, stepy = (dy / d) * spd;
        // avoid walking into solids (except pond bugs over water)
        var nx = e.x + stepx, ny = e.y + stepy;
        var blocked = PB.world.isSolid(nx, ny) && e.biome !== "pond";
        if (!blocked) {
          e.x = nx; e.y = ny;
          if (Math.abs(stepx) > 0.05) e.face = stepx < 0 ? -1 : 1;
        } else {
          e.retarget = 0; // bounce: choose a new target next frame
        }

        // keep within map
        e.x = Math.max(8, Math.min(PB.world.pxW - 8, e.x));
        e.y = Math.max(8, Math.min(PB.world.pxH - 8, e.y));

        // despawn when its time is up, or it no longer belongs to this period,
        // but only when it's comfortably off-screen so it never pops away in view.
        var onScreen = PB.main && PB.main.onScreen(e.x, e.y, 40);
        var wrongTime = sp.times.indexOf(period) < 0;
        if ((e.life <= 0 || wrongTime) && !onScreen) {
          entities.splice(i, 1);
        }
      }

      // top up the population
      var guard = 0;
      while (entities.length < TARGET && guard++ < 6) spawnOne(period);
    },

    draw: function (ctx, camX, camY) {
      // back-to-front by y for gentle depth
      var vis = entities.slice().sort(function (a, b) { return a.y - b.y; });
      for (var i = 0; i < vis.length; i++) {
        var e = vis[i];
        var sx = e.x - camX, sy = e.y - camY;
        if (sx < -24 || sx > PB.config.VIEW_W + 24 || sy < -24 || sy > PB.config.VIEW_H + 24) continue;
        var sp = PB.speciesById[e.sid];
        var hop = Math.abs(Math.sin(e.hop)) * 3;
        var hasArt = PB.art.has(e.sid) && PB.art.creatureImg(e.sid);
        // shadow (wider for the chunkier hand-drawn art)
        ctx.fillStyle = "rgba(0,0,0,0.16)";
        ctx.beginPath();
        ctx.ellipse(sx, sy + 2, hasArt ? 9 : 6, hasArt ? 3 : 2.4, 0, 0, Math.PI * 2);
        ctx.fill();
        if (hasArt) {
          PB.art.drawCreature(ctx, e.sid, sx, sy + 2 - hop, 30, e.face < 0);
        } else {
          ctx.save();
          // mirror around the bug's screen-x so it faces its travel direction
          if (e.face < 0) { ctx.translate(sx * 2, 0); ctx.scale(-1, 1); }
          PB.sprites.drawBug(ctx, sp.look, sx, sy - 5 - hop, 20, e.t);
          ctx.restore();
        }
      }
    },

    // nearest catchable bug to a world point, within radius px
    nearestNear: function (px, py, radius) {
      var best = null, bestD = radius * radius;
      for (var i = 0; i < entities.length; i++) {
        var e = entities[i];
        var dx = e.x - px, dy = e.y - py, d = dx * dx + dy * dy;
        if (d < bestD) { best = e; bestD = d; }
      }
      return best;
    },

    remove: function (e) {
      var i = entities.indexOf(e);
      if (i >= 0) entities.splice(i, 1);
    },

    // when a catch fails, the bug bolts
    scare: function (e) {
      e.flee = 1.5;
      e.life = Math.min(e.life, 1.2);
      var p = PB.state.player;
      e.tx = e.x + (e.x - p.x) * 3;
      e.ty = e.y + (e.y - p.y) * 3;
    },
  };

})(window.PB = window.PB || {});
