/* ===========================================================================
   fx.js — cozy atmosphere: drifting pollen by day, glowing fireflies at night,
   a soft vignette, and a faint paper grain. All procedural and cheap.
   =========================================================================== */
(function (PB) {
  "use strict";

  var W = PB.config.VIEW_W, H = PB.config.VIEW_H;
  var motes = [];
  var vign = null, noise = null, grainPattern = null;

  function rnd() { return Math.random(); }

  function makeMote(anywhere) {
    return {
      x: rnd() * W,
      y: anywhere ? rnd() * H : H + 6,
      vx: (rnd() - 0.5) * 8,
      vy: -(3 + rnd() * 9),
      r: 0.8 + rnd() * 1.5,
      ph: rnd() * Math.PI * 2,
      sp: 0.6 + rnd() * 1.3,
    };
  }

  PB.fx = {
    init: function () {
      motes = [];
      for (var i = 0; i < 28; i++) motes.push(makeMote(true));
      buildVignette();
      buildNoise();
    },

    update: function (dt) {
      for (var i = 0; i < motes.length; i++) {
        var m = motes[i];
        m.x += m.vx * dt; m.y += m.vy * dt; m.ph += dt * m.sp;
        m.x += Math.sin(m.ph) * 6 * dt; // gentle weave
        if (m.y < -8 || m.x < -8 || m.x > W + 8) motes[i] = makeMote(false);
      }
    },

    drawParticles: function (ctx, period) {
      ctx.save();
      for (var i = 0; i < motes.length; i++) {
        var m = motes[i];
        var tw = Math.sin(m.ph) * 0.5 + 0.5;
        if (period === "night") {
          var a = 0.2 + tw * 0.65;
          var g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 4.5);
          g.addColorStop(0, "rgba(246,226,122," + a.toFixed(3) + ")");
          g.addColorStop(1, "rgba(246,226,122,0)");
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(m.x, m.y, m.r * 4.5, 0, Math.PI * 2); ctx.fill();
        } else if (period === "evening") {
          ctx.fillStyle = "rgba(255,206,150," + (0.16 + tw * 0.2).toFixed(3) + ")";
          ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.fillStyle = "rgba(255,250,225," + (0.1 + tw * 0.16).toFixed(3) + ")";
          ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();
    },

    drawVignette: function (ctx) { if (vign) ctx.drawImage(vign, 0, 0); },

    drawGrain: function (ctx) {
      if (!noise) return;
      if (!grainPattern) grainPattern = ctx.createPattern(noise, "repeat");
      ctx.save();
      ctx.globalAlpha = 0.04;
      ctx.globalCompositeOperation = "overlay";
      ctx.fillStyle = grainPattern;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    },
  };

  function buildVignette() {
    vign = document.createElement("canvas");
    vign.width = W; vign.height = H;
    var c = vign.getContext("2d");
    var g = c.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 0.92);
    g.addColorStop(0, "rgba(38,28,18,0)");
    g.addColorStop(1, "rgba(38,28,18,0.26)");
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }

  function buildNoise() {
    noise = document.createElement("canvas");
    noise.width = 72; noise.height = 72;
    var c = noise.getContext("2d");
    var id = c.createImageData(72, 72);
    for (var i = 0; i < id.data.length; i += 4) {
      var v = 180 + Math.floor(Math.random() * 75);
      id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
      id.data[i + 3] = 255;
    }
    c.putImageData(id, 0, 0);
  }

})(window.PB = window.PB || {});
