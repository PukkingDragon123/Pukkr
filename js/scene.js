/* ===========================================================================
   scene.js — the two cozy locations you visit: a Sunny Garden and the
   Whispering Woods. There is no walking avatar; each location is a soft,
   hand-painted background (rendered procedurally with gradients and soft
   blobs, so it stays smooth rather than pixelated). Creatures drift across
   the scene and you click/tap them to catch them.
   =========================================================================== */
(function (PB) {
  "use strict";

  var W = PB.config.VIEW_W, H = PB.config.VIEW_H;

  var LOC = {
    garden: { name: "Sunny Garden",      biomes: ["meadow", "flowers", "pond"], emoji: "🌷" },
    forest: { name: "Whispering Woods",  biomes: ["forest", "tree"],            emoji: "🌳" },
  };

  var current = "garden";
  var pre = {}; // prerendered background canvases

  // ---- painterly helpers ---------------------------------------------------
  function rgba(c, a) { return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }

  // a soft, edgeless blob — the building block of the painterly look
  function blob(c, x, y, r, col, a) {
    var g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(col, a));
    g.addColorStop(0.65, rgba(col, a * 0.55));
    g.addColorStop(1, rgba(col, 0));
    c.fillStyle = g;
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  }

  function vgrad(c, x, y, w, h, top, bot) {
    var g = c.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, top); g.addColorStop(1, bot);
    c.fillStyle = g; c.fillRect(x, y, w, h);
  }

  // a deterministic pseudo-random so scenes look the same each visit
  function rng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function softTree(c, x, baseY, scale, dark) {
    var trunkH = 90 * scale, trunkW = 16 * scale;
    // trunk
    var tg = c.createLinearGradient(x - trunkW, 0, x + trunkW, 0);
    tg.addColorStop(0, "#7c5a36"); tg.addColorStop(0.5, "#9c7747"); tg.addColorStop(1, "#6e4f30");
    c.fillStyle = tg;
    c.beginPath();
    c.moveTo(x - trunkW * 0.5, baseY);
    c.quadraticCurveTo(x - trunkW * 0.3, baseY - trunkH * 0.6, x - trunkW * 0.2, baseY - trunkH);
    c.lineTo(x + trunkW * 0.2, baseY - trunkH);
    c.quadraticCurveTo(x + trunkW * 0.3, baseY - trunkH * 0.6, x + trunkW * 0.5, baseY);
    c.closePath(); c.fill();
    // canopy: layered soft blobs
    var cy = baseY - trunkH - 14 * scale;
    var greens = dark
      ? [[58, 110, 64], [74, 130, 72], [96, 156, 88]]
      : [[110, 180, 90], [134, 198, 104], [165, 214, 120]];
    blob(c, x, cy, 70 * scale, greens[0], 0.95);
    blob(c, x - 46 * scale, cy + 18 * scale, 50 * scale, greens[0], 0.9);
    blob(c, x + 46 * scale, cy + 18 * scale, 50 * scale, greens[1], 0.9);
    blob(c, x - 16 * scale, cy - 30 * scale, 46 * scale, greens[1], 0.92);
    blob(c, x + 20 * scale, cy - 22 * scale, 40 * scale, greens[2], 0.85);
    // sunlit highlight
    blob(c, x + 26 * scale, cy - 30 * scale, 30 * scale, [220, 240, 170], 0.35);
  }

  function flowerCluster(c, x, y, s, rnd) {
    var cols = [[239, 138, 138], [246, 196, 83], [230, 163, 208], [179, 157, 219], [255, 255, 255], [255, 170, 120]];
    var n = 4 + Math.floor(rnd() * 4);
    for (var i = 0; i < n; i++) {
      var fx = x + (rnd() - 0.5) * 46 * s, fy = y + (rnd() - 0.5) * 26 * s;
      var col = cols[Math.floor(rnd() * cols.length)];
      // stem
      c.strokeStyle = "rgba(80,150,70,0.7)"; c.lineWidth = 2 * s; c.lineCap = "round";
      c.beginPath(); c.moveTo(fx, fy + 12 * s); c.lineTo(fx, fy); c.stroke();
      // petals
      for (var p = 0; p < 5; p++) {
        var a = (p / 5) * Math.PI * 2 + rnd();
        c.fillStyle = rgba(col, 0.95);
        c.beginPath();
        c.arc(fx + Math.cos(a) * 4 * s, fy + Math.sin(a) * 4 * s, 3 * s, 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = "#f6e27a";
      c.beginPath(); c.arc(fx, fy, 2.4 * s, 0, Math.PI * 2); c.fill();
    }
  }

  function fern(c, x, y, s, col) {
    c.strokeStyle = rgba(col, 0.9); c.lineWidth = 3 * s; c.lineCap = "round";
    for (var b = -2; b <= 2; b++) {
      var ang = -Math.PI / 2 + b * 0.42;
      var ex = x + Math.cos(ang) * 80 * s, ey = y + Math.sin(ang) * 80 * s;
      c.beginPath(); c.moveTo(x, y);
      c.quadraticCurveTo(x + Math.cos(ang) * 40 * s - Math.sin(ang) * 14 * s,
                         y + Math.sin(ang) * 40 * s + Math.cos(ang) * 14 * s, ex, ey);
      c.stroke();
    }
  }

  // ---- the Sunny Garden ----------------------------------------------------
  function paintGarden(c) {
    var rnd = rng(20240601);
    // sky
    vgrad(c, 0, 0, W, H * 0.62, "#bfe8ff", "#e8f7ef");
    // warm sun glow top-right
    blob(c, W * 0.82, H * 0.16, 230, [255, 244, 200], 0.85);
    blob(c, W * 0.82, H * 0.16, 90, [255, 250, 230], 0.95);
    // hazy distant hills
    blob(c, W * 0.2, H * 0.6, 360, [150, 200, 130], 0.5);
    blob(c, W * 0.7, H * 0.62, 420, [134, 190, 120], 0.5);
    // meadow ground
    vgrad(c, 0, H * 0.5, W, H * 0.5, "#a9da7e", "#7cbf5f");
    // soft ground dapples
    for (var i = 0; i < 60; i++) {
      blob(c, rnd() * W, H * (0.55 + rnd() * 0.43), 30 + rnd() * 60,
        rnd() < 0.5 ? [120, 185, 95] : [170, 215, 120], 0.18);
    }
    // back trees on the sides
    softTree(c, W * 0.08, H * 0.66, 1.0, false);
    softTree(c, W * 0.93, H * 0.64, 1.15, false);
    // a little pond, lower-left
    var px = W * 0.24, py = H * 0.84;
    c.fillStyle = "rgba(120,200,210,0.9)";
    c.beginPath(); c.ellipse(px, py, 150, 50, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = "rgba(255,255,255,0.35)";
    c.beginPath(); c.ellipse(px - 40, py - 12, 40, 10, 0, 0, Math.PI * 2); c.fill();
    for (var l = 0; l < 5; l++) {
      c.fillStyle = "rgba(95,174,106,0.95)";
      c.beginPath(); c.arc(px - 70 + rnd() * 150, py - 18 + rnd() * 36, 12, 0, Math.PI * 2); c.fill();
    }
    // a wooden trellis / fence at mid-back
    c.strokeStyle = "rgba(180,140,90,0.8)"; c.lineWidth = 6;
    for (var fX = W * 0.4; fX < W * 0.66; fX += 26) {
      c.beginPath(); c.moveTo(fX, H * 0.5); c.lineTo(fX, H * 0.62); c.stroke();
    }
    c.beginPath(); c.moveTo(W * 0.4, H * 0.54); c.lineTo(W * 0.66, H * 0.54); c.stroke();
    // flower beds across the meadow (denser toward the foreground)
    for (var f = 0; f < 26; f++) {
      var s = 0.7 + rnd() * 1.6;
      flowerCluster(c, rnd() * W, H * (0.56 + rnd() * 0.4), s, rnd);
    }
    // out-of-focus foreground framing
    blob(c, W * 0.04, H * 1.02, 240, [70, 130, 70], 0.6);
    blob(c, W * 1.0, H * 1.02, 260, [70, 130, 70], 0.6);
    flowerCluster(c, W * 0.1, H * 0.96, 2.6, rnd);
    flowerCluster(c, W * 0.9, H * 0.95, 2.6, rnd);
  }

  // ---- the Whispering Woods -------------------------------------------------
  function paintForest(c) {
    var rnd = rng(19990909);
    // deep, misty backdrop
    vgrad(c, 0, 0, W, H, "#cfe6c4", "#5d8a52");
    // receding rows of canopy (back = hazy/light, front = dark)
    for (var row = 0; row < 4; row++) {
      var yy = H * (0.12 + row * 0.12);
      var darkv = row >= 2;
      for (var x = -40; x < W + 80; x += 120) {
        softTree(c, x + (row % 2) * 60, yy + 80, 0.7 + row * 0.12, darkv);
      }
    }
    // god rays
    c.save();
    c.globalCompositeOperation = "screen";
    for (var r = 0; r < 4; r++) {
      var rx = W * (0.2 + r * 0.2);
      var g = c.createLinearGradient(rx, 0, rx + 60, H);
      g.addColorStop(0, "rgba(255,250,210,0.20)");
      g.addColorStop(1, "rgba(255,250,210,0)");
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(rx - 30, 0); c.lineTo(rx + 30, 0);
      c.lineTo(rx + 120, H); c.lineTo(rx + 40, H); c.closePath(); c.fill();
    }
    c.restore();
    // forest floor
    vgrad(c, 0, H * 0.62, W, H * 0.38, "#6f8f4f", "#4f6a39");
    for (var i = 0; i < 50; i++) {
      blob(c, rnd() * W, H * (0.66 + rnd() * 0.32), 30 + rnd() * 70,
        rnd() < 0.5 ? [70, 96, 52] : [120, 150, 80], 0.2);
    }
    // a mossy fallen log
    c.fillStyle = "#7a5a38";
    c.save(); c.translate(W * 0.62, H * 0.82); c.rotate(-0.12);
    c.beginPath(); c.roundRect(-180, -26, 360, 52, 26); c.fill();
    c.fillStyle = "rgba(120,170,90,0.8)";
    c.beginPath(); c.roundRect(-180, -30, 360, 16, 10); c.fill();
    c.fillStyle = "#5a4128";
    c.beginPath(); c.ellipse(-180, 0, 12, 24, 0, 0, Math.PI * 2); c.fill();
    c.restore();
    // mushrooms + ferns on the floor
    for (var m = 0; m < 10; m++) {
      var mx = rnd() * W, my = H * (0.7 + rnd() * 0.26);
      c.fillStyle = "#f0e6d0"; c.fillRect(mx - 3, my - 6, 6, 12);
      c.fillStyle = rnd() < 0.5 ? "#d9534f" : "#e8895a";
      c.beginPath(); c.ellipse(mx, my - 6, 11, 8, 0, Math.PI, 0); c.fill();
      c.fillStyle = "rgba(255,255,255,0.8)";
      c.beginPath(); c.arc(mx - 3, my - 8, 1.6, 0, Math.PI * 2); c.fill();
    }
    fern(c, W * 0.16, H * 0.92, 1.4, [80, 130, 60]);
    fern(c, W * 0.84, H * 0.9, 1.5, [80, 130, 60]);
    // soft mist bands
    c.fillStyle = "rgba(255,255,255,0.16)";
    c.beginPath(); c.ellipse(W * 0.5, H * 0.6, W * 0.6, 40, 0, 0, Math.PI * 2); c.fill();
    // dark foreground framing
    blob(c, W * 0.02, H * 1.04, 280, [30, 55, 30], 0.7);
    blob(c, W * 1.0, H * 1.02, 300, [30, 55, 30], 0.7);
    fern(c, W * 0.06, H * 1.02, 2.6, [40, 80, 40]);
    fern(c, W * 0.95, H * 1.0, 2.7, [40, 80, 40]);
  }

  function prerender(id, painter) {
    var cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    painter(cv.getContext("2d"));
    pre[id] = cv;
  }

  PB.scene = {
    init: function () {
      prerender("garden", paintGarden);
      prerender("forest", paintForest);
    },

    current: function () { return current; },
    name: function () { return LOC[current].name; },
    emoji: function () { return LOC[current].emoji; },
    locations: function () { return Object.keys(LOC); },
    locName: function (id) { return LOC[id].name; },

    setLocation: function (id) {
      if (!LOC[id] || id === current) return false;
      current = id;
      PB.spawns.reset();
      return true;
    },

    // the band of the screen where creatures roam
    bounds: function () {
      return { x0: 70, x1: W - 70, y0: H * 0.42, y1: H * 0.84 };
    },

    // species that can appear here right now
    pool: function (period) {
      var biomes = LOC[current].biomes;
      return PB.species.filter(function (s) {
        if (s.times.indexOf(period) < 0) return false;
        for (var i = 0; i < s.biomes.length; i++) if (biomes.indexOf(s.biomes[i]) >= 0) return true;
        return false;
      });
    },

    draw: function (ctx) {
      var bg = pre[current];
      if (bg) ctx.drawImage(bg, 0, 0, W, H);
    },
  };

})(window.PB = window.PB || {});
