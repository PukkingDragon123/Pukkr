/* ===========================================================================
   player.js — movement, collision against the world, and drawing.
   state.player.{x,y} is the player's anchor (roughly the feet) in world pixels.
   =========================================================================== */
(function (PB) {
  "use strict";

  var HALF_W = 4.5;   // collision half-width
  var FEET = 7;       // collision sample below the centre

  var walk = 0;       // walk-cycle counter
  var swingT = 0;     // >0 while a net swing animates

  function canStand(px, py) {
    var fy = py + FEET;
    return !PB.world.isSolid(px - HALF_W, fy) &&
           !PB.world.isSolid(px + HALF_W, fy) &&
           !PB.world.isSolid(px - HALF_W, fy - 4) &&
           !PB.world.isSolid(px + HALF_W, fy - 4);
  }

  PB.player = {
    update: function (dt, axis) {
      var p = PB.state.player;
      var speed = PB.config.PLAYER_SPEED * PB.shoeSpeed() * 60 * dt; // px/frame-ish
      var dx = axis.x, dy = axis.y;
      if (dx && dy) { dx *= 0.7071; dy *= 0.7071; }
      var moving = (dx !== 0 || dy !== 0);

      if (dx !== 0) {
        var nx = p.x + dx * speed;
        if (canStand(nx, p.y)) p.x = nx;
      }
      if (dy !== 0) {
        var ny = p.y + dy * speed;
        if (canStand(p.x, ny)) p.y = ny;
      }
      // clamp to map
      p.x = Math.max(8, Math.min(PB.world.pxW - 8, p.x));
      p.y = Math.max(8, Math.min(PB.world.pxH - 8, p.y));

      if (moving) {
        walk += speed;
        if (Math.abs(dy) >= Math.abs(dx)) p.dir = dy < 0 ? "up" : "down";
        else p.dir = dx < 0 ? "left" : "right";
        if (walk % 18 < speed) PB.audio.step();
      } else {
        walk = 0;
      }

      if (swingT > 0) swingT = Math.max(0, swingT - dt);
    },

    swing: function () { swingT = 0.32; },
    isSwinging: function () { return swingT > 0; },

    draw: function (ctx, camX, camY) {
      var p = PB.state.player;
      var sx = p.x - camX, sy = p.y - camY;
      var swingAngle = null;
      if (swingT > 0) {
        var prog = 1 - (swingT / 0.32);
        swingAngle = -1.8 + prog * 3.2; // sweep the net across
      }
      PB.sprites.drawPlayer(ctx, sx, sy, p.dir, walk, swingAngle);
    },

    // a point just ahead of the player, where the net reaches
    reachPoint: function () {
      var p = PB.state.player;
      var d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[p.dir];
      return { x: p.x + d[0] * 14, y: p.y + d[1] * 14 };
    },
  };

})(window.PB = window.PB || {});
