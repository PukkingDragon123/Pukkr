/* ===========================================================================
   scene.js — the three cozy places you visit:
     • Whispering Woods (Forest) — where wild creatures appear to catch
     • Cozy Garden                — where your creatures live in jars (raise)
     • Bug Museum                 — where you display jars for friends to admire
   Each is a soft, hand-painted background drawn procedurally (smooth, not
   pixelated). Creature/jar art sits on top.
   =========================================================================== */
(function (PB) {
  "use strict";

  var W = PB.config.VIEW_W, H = PB.config.VIEW_H;

  var LOC = {
    forest: { name: "Whispering Woods", emoji: "🌳" },
    garden: { name: "Cozy Garden",      emoji: "🌷" },
    museum: { name: "Bug Museum",       emoji: "🏛" },
  };
  var current = "forest";
  var pre = {};

  // ---- painterly helpers ---------------------------------------------------
  function rgba(c, a) { return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }
  function blob(c, x, y, r, col, a) {
    var g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(col, a)); g.addColorStop(0.65, rgba(col, a * 0.55)); g.addColorStop(1, rgba(col, 0));
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  }
  function vgrad(c, x, y, w, h, top, bot) {
    var g = c.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, top); g.addColorStop(1, bot); c.fillStyle = g; c.fillRect(x, y, w, h);
  }
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
    var tg = c.createLinearGradient(x - trunkW, 0, x + trunkW, 0);
    tg.addColorStop(0, "#7c5a36"); tg.addColorStop(0.5, "#9c7747"); tg.addColorStop(1, "#6e4f30");
    c.fillStyle = tg;
    c.beginPath();
    c.moveTo(x - trunkW * 0.5, baseY);
    c.quadraticCurveTo(x - trunkW * 0.3, baseY - trunkH * 0.6, x - trunkW * 0.2, baseY - trunkH);
    c.lineTo(x + trunkW * 0.2, baseY - trunkH);
    c.quadraticCurveTo(x + trunkW * 0.3, baseY - trunkH * 0.6, x + trunkW * 0.5, baseY);
    c.closePath(); c.fill();
    var cy = baseY - trunkH - 14 * scale;
    var g = dark ? [[58, 110, 64], [74, 130, 72], [96, 156, 88]] : [[110, 180, 90], [134, 198, 104], [165, 214, 120]];
    blob(c, x, cy, 70 * scale, g[0], 0.95);
    blob(c, x - 46 * scale, cy + 18 * scale, 50 * scale, g[0], 0.9);
    blob(c, x + 46 * scale, cy + 18 * scale, 50 * scale, g[1], 0.9);
    blob(c, x - 16 * scale, cy - 30 * scale, 46 * scale, g[1], 0.92);
    blob(c, x + 20 * scale, cy - 22 * scale, 40 * scale, g[2], 0.85);
    blob(c, x + 26 * scale, cy - 30 * scale, 30 * scale, [220, 240, 170], 0.35);
  }
  function flowerCluster(c, x, y, s, rnd) {
    var cols = [[239, 138, 138], [246, 196, 83], [230, 163, 208], [179, 157, 219], [255, 255, 255], [255, 170, 120]];
    var n = 4 + Math.floor(rnd() * 4);
    for (var i = 0; i < n; i++) {
      var fx = x + (rnd() - 0.5) * 46 * s, fy = y + (rnd() - 0.5) * 26 * s;
      var col = cols[Math.floor(rnd() * cols.length)];
      c.strokeStyle = "rgba(80,150,70,0.7)"; c.lineWidth = 2 * s; c.lineCap = "round";
      c.beginPath(); c.moveTo(fx, fy + 12 * s); c.lineTo(fx, fy); c.stroke();
      for (var p = 0; p < 5; p++) {
        var a = (p / 5) * Math.PI * 2 + rnd();
        c.fillStyle = rgba(col, 0.95);
        c.beginPath(); c.arc(fx + Math.cos(a) * 4 * s, fy + Math.sin(a) * 4 * s, 3 * s, 0, Math.PI * 2); c.fill();
      }
      c.fillStyle = "#f6e27a"; c.beginPath(); c.arc(fx, fy, 2.4 * s, 0, Math.PI * 2); c.fill();
    }
  }
  function fern(c, x, y, s, col) {
    c.strokeStyle = rgba(col, 0.9); c.lineWidth = 3 * s; c.lineCap = "round";
    for (var b = -2; b <= 2; b++) {
      var ang = -Math.PI / 2 + b * 0.42;
      c.beginPath(); c.moveTo(x, y);
      c.quadraticCurveTo(x + Math.cos(ang) * 40 * s - Math.sin(ang) * 14 * s,
        y + Math.sin(ang) * 40 * s + Math.cos(ang) * 14 * s,
        x + Math.cos(ang) * 80 * s, y + Math.sin(ang) * 80 * s);
      c.stroke();
    }
  }
  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r); c.closePath();
  }

  // ---- Cozy Garden ---------------------------------------------------------
  function paintGarden(c) {
    var rnd = rng(20240601);
    vgrad(c, 0, 0, W, H * 0.62, "#bfe8ff", "#e8f7ef");
    blob(c, W * 0.82, H * 0.16, 230, [255, 244, 200], 0.85);
    blob(c, W * 0.82, H * 0.16, 90, [255, 250, 230], 0.95);
    blob(c, W * 0.2, H * 0.6, 360, [150, 200, 130], 0.5);
    blob(c, W * 0.7, H * 0.62, 420, [134, 190, 120], 0.5);
    vgrad(c, 0, H * 0.5, W, H * 0.5, "#a9da7e", "#7cbf5f");
    for (var i = 0; i < 50; i++)
      blob(c, rnd() * W, H * (0.55 + rnd() * 0.42), 30 + rnd() * 60, rnd() < 0.5 ? [120, 185, 95] : [170, 215, 120], 0.16);
    softTree(c, W * 0.06, H * 0.62, 1.0, false);
    softTree(c, W * 0.95, H * 0.6, 1.15, false);
    for (var f = 0; f < 22; f++) flowerCluster(c, rnd() * W, H * (0.55 + rnd() * 0.4), 0.7 + rnd() * 1.4, rnd);
    blob(c, W * 0.03, H * 1.04, 230, [70, 130, 70], 0.55);
    blob(c, W * 1.0, H * 1.03, 250, [70, 130, 70], 0.55);
    flowerCluster(c, W * 0.08, H * 0.98, 2.4, rnd);
    flowerCluster(c, W * 0.93, H * 0.97, 2.4, rnd);
  }

  // ---- Whispering Woods -----------------------------------------------------
  function paintForest(c) {
    var rnd = rng(19990909);
    vgrad(c, 0, 0, W, H, "#cfe6c4", "#5d8a52");
    for (var row = 0; row < 4; row++) {
      var yy = H * (0.12 + row * 0.12), dk = row >= 2;
      for (var x = -40; x < W + 80; x += 120) softTree(c, x + (row % 2) * 60, yy + 80, 0.7 + row * 0.12, dk);
    }
    c.save(); c.globalCompositeOperation = "screen";
    for (var r = 0; r < 4; r++) {
      var rx = W * (0.2 + r * 0.2);
      var g = c.createLinearGradient(rx, 0, rx + 60, H);
      g.addColorStop(0, "rgba(255,250,210,0.20)"); g.addColorStop(1, "rgba(255,250,210,0)");
      c.fillStyle = g;
      c.beginPath(); c.moveTo(rx - 30, 0); c.lineTo(rx + 30, 0); c.lineTo(rx + 120, H); c.lineTo(rx + 40, H); c.closePath(); c.fill();
    }
    c.restore();
    vgrad(c, 0, H * 0.62, W, H * 0.38, "#6f8f4f", "#4f6a39");
    for (var i = 0; i < 44; i++)
      blob(c, rnd() * W, H * (0.66 + rnd() * 0.32), 30 + rnd() * 70, rnd() < 0.5 ? [70, 96, 52] : [120, 150, 80], 0.18);
    c.fillStyle = "#7a5a38"; c.save(); c.translate(W * 0.64, H * 0.84); c.rotate(-0.1);
    roundRect(c, -180, -24, 360, 48, 24); c.fill();
    c.fillStyle = "rgba(120,170,90,0.8)"; roundRect(c, -180, -28, 360, 14, 10); c.fill();
    c.restore();
    for (var m = 0; m < 9; m++) {
      var mx = rnd() * W, my = H * (0.7 + rnd() * 0.24);
      c.fillStyle = "#f0e6d0"; c.fillRect(mx - 3, my - 6, 6, 12);
      c.fillStyle = rnd() < 0.5 ? "#d9534f" : "#e8895a"; c.beginPath(); c.ellipse(mx, my - 6, 11, 8, 0, Math.PI, 0); c.fill();
    }
    fern(c, W * 0.15, H * 0.92, 1.4, [80, 130, 60]); fern(c, W * 0.85, H * 0.9, 1.5, [80, 130, 60]);
    c.fillStyle = "rgba(255,255,255,0.16)"; c.beginPath(); c.ellipse(W * 0.5, H * 0.6, W * 0.6, 40, 0, 0, Math.PI * 2); c.fill();
    blob(c, W * 0.02, H * 1.04, 280, [30, 55, 30], 0.65); blob(c, W * 1.0, H * 1.02, 300, [30, 55, 30], 0.65);
    fern(c, W * 0.05, H * 1.02, 2.6, [40, 80, 40]); fern(c, W * 0.96, H * 1.0, 2.7, [40, 80, 40]);
  }

  // ---- Bug Museum (warm wooden interior) -----------------------------------
  var MUSEUM_SHELVES = [0.44, 0.66, 0.88]; // shelf baselines as fractions of H

  function paintMuseum(c) {
    var rnd = rng(7777);
    // warm wall
    vgrad(c, 0, 0, W, H, "#f4e3c4", "#e7cfa3");
    // soft wallpaper stripes
    c.fillStyle = "rgba(210,180,130,0.18)";
    for (var s = 0; s < W; s += 64) c.fillRect(s, 0, 30, H);
    // a sunny window
    c.fillStyle = "#cfeeff"; roundRect(c, W * 0.70, H * 0.08, W * 0.20, H * 0.24, 10); c.fill();
    c.strokeStyle = "#9c7747"; c.lineWidth = 8; roundRect(c, W * 0.70, H * 0.08, W * 0.20, H * 0.24, 10); c.stroke();
    c.beginPath(); c.moveTo(W * 0.80, H * 0.08); c.lineTo(W * 0.80, H * 0.32); c.moveTo(W * 0.70, H * 0.20); c.lineTo(W * 0.90, H * 0.20); c.stroke();
    blob(c, W * 0.80, H * 0.2, 160, [255, 250, 210], 0.5);
    // a little potted plant
    c.fillStyle = "#c0683f"; roundRect(c, W * 0.07, H * 0.30, 54, 46, 8); c.fill();
    blob(c, W * 0.07 + 27, H * 0.28, 60, [110, 180, 90], 0.95);
    blob(c, W * 0.07 + 6, H * 0.30, 38, [134, 198, 104], 0.9);
    blob(c, W * 0.07 + 48, H * 0.30, 38, [134, 198, 104], 0.9);
    // wooden floor
    vgrad(c, 0, H * 0.9, W, H * 0.1, "#c79a63", "#a87c47");
    // shelves
    for (var i = 0; i < MUSEUM_SHELVES.length; i++) {
      var y = H * MUSEUM_SHELVES[i];
      c.fillStyle = "#9c7747";
      roundRect(c, W * 0.06, y, W * 0.88, 16, 6); c.fill();
      c.fillStyle = "rgba(255,255,255,0.18)"; c.fillRect(W * 0.06, y, W * 0.88, 4);
      c.fillStyle = "rgba(60,40,20,0.25)"; c.fillRect(W * 0.06, y + 12, W * 0.88, 4);
    }
    // warm vignette baked in
    var vg = c.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, H * 0.95);
    vg.addColorStop(0, "rgba(60,40,20,0)"); vg.addColorStop(1, "rgba(60,40,20,0.22)");
    c.fillStyle = vg; c.fillRect(0, 0, W, H);
  }

  function prerender(id, painter) {
    var cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    painter(cv.getContext("2d")); pre[id] = cv;
  }

  // ---- jar slot layouts ----------------------------------------------------
  function gridSlots(n, x0, x1, yTop, rowH, perRow, jarH) {
    var slots = [];
    for (var i = 0; i < n; i++) {
      var row = Math.floor(i / perRow), col = i % perRow;
      var inRow = Math.min(perRow, n - row * perRow);
      var span = x1 - x0, step = span / (inRow + 1);
      slots.push({ x: x0 + step * (col + 1), y: yTop + row * rowH, h: jarH });
    }
    return slots;
  }

  PB.scene = {
    init: function () {
      prerender("forest", paintForest);
      prerender("garden", paintGarden);
      prerender("museum", paintMuseum);
    },
    current: function () { return current; },
    name: function () { return LOC[current].name; },
    emoji: function () { return LOC[current].emoji; },
    setLocation: function (id) {
      if (!LOC[id] || id === current) return false;
      current = id;
      if (id === "forest") PB.spawns.reset();
      return true;
    },
    bounds: function () { return { x0: 80, x1: W - 80, y0: H * 0.40, y1: H * 0.82 }; },

    // jar positions (x = centre, y = where the jar's bottom rests)
    gardenSlots: function (n) {
      return gridSlots(n, W * 0.1, W * 0.9, H * 0.56, H * 0.21, 5, 118);
    },
    museumSlots: function (n) {
      var slots = [];
      var perShelf = 6;
      for (var i = 0; i < n; i++) {
        var shelf = Math.floor(i / perShelf), col = i % perShelf;
        if (shelf >= MUSEUM_SHELVES.length) break;
        var inShelf = Math.min(perShelf, n - shelf * perShelf);
        var step = (W * 0.84) / (inShelf + 1);
        slots.push({ x: W * 0.08 + step * (col + 1), y: H * MUSEUM_SHELVES[shelf] + 6, h: 104 });
      }
      return slots;
    },

    draw: function (ctx) { var bg = pre[current]; if (bg) ctx.drawImage(bg, 0, 0, W, H); },
  };

})(window.PB = window.PB || {});
