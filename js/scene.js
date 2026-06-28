/* ===========================================================================
   scene.js — painterly backgrounds for the current area, drawn with a soft
   2.5D pointer-parallax, plus a foreground foliage layer that rustles as
   creatures move. The "mode" is catch or battle; the background follows the
   current area (forest- or beach-style).
   =========================================================================== */
(function (PB) {
  "use strict";

  var W = PB.config.VIEW_W, H = PB.config.VIEW_H;
  var mode = "catch";
  var pre = {};
  var foliage = {};

  function rgba(c, a) { return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }
  function blob(c, x, y, r, col, a) {
    var g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(col, a)); g.addColorStop(0.65, rgba(col, a * 0.55)); g.addColorStop(1, rgba(col, 0));
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  }
  function vgrad(c, x, y, w, h, top, bot) { var g = c.createLinearGradient(x, y, x, y + h); g.addColorStop(0, top); g.addColorStop(1, bot); c.fillStyle = g; c.fillRect(x, y, w, h); }
  function rng(seed) { var s = seed >>> 0; return function () { s = (s + 0x6D2B79F5) >>> 0; var t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function softTree(c, x, baseY, scale, dark) {
    var th = 90 * scale, tw = 16 * scale;
    var tg = c.createLinearGradient(x - tw, 0, x + tw, 0); tg.addColorStop(0, "#7c5a36"); tg.addColorStop(0.5, "#9c7747"); tg.addColorStop(1, "#6e4f30");
    c.fillStyle = tg; c.beginPath(); c.moveTo(x - tw * 0.5, baseY); c.quadraticCurveTo(x - tw * 0.3, baseY - th * 0.6, x - tw * 0.2, baseY - th); c.lineTo(x + tw * 0.2, baseY - th); c.quadraticCurveTo(x + tw * 0.3, baseY - th * 0.6, x + tw * 0.5, baseY); c.closePath(); c.fill();
    var cy = baseY - th - 14 * scale, g = dark ? [[58, 110, 64], [74, 130, 72], [96, 156, 88]] : [[110, 180, 90], [134, 198, 104], [165, 214, 120]];
    blob(c, x, cy, 70 * scale, g[0], 0.95); blob(c, x - 46 * scale, cy + 18 * scale, 50 * scale, g[0], 0.9); blob(c, x + 46 * scale, cy + 18 * scale, 50 * scale, g[1], 0.9);
    blob(c, x - 16 * scale, cy - 30 * scale, 46 * scale, g[1], 0.92); blob(c, x + 26 * scale, cy - 30 * scale, 30 * scale, [220, 240, 170], 0.35);
  }
  function fern(c, x, y, s, col) { c.strokeStyle = rgba(col, 0.9); c.lineWidth = 3 * s; c.lineCap = "round"; for (var b = -2; b <= 2; b++) { var a = -Math.PI / 2 + b * 0.42; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(a) * 40 * s - Math.sin(a) * 14 * s, y + Math.sin(a) * 40 * s + Math.cos(a) * 14 * s, x + Math.cos(a) * 80 * s, y + Math.sin(a) * 80 * s); c.stroke(); } }
  function star(c, x, y, r) { c.beginPath(); for (var i = 0; i < 5; i++) { var a = -Math.PI / 2 + i * 2 * Math.PI / 5; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); var a2 = a + Math.PI / 5; c.lineTo(x + Math.cos(a2) * r * 0.45, y + Math.sin(a2) * r * 0.45); } c.closePath(); c.fill(); }

  function paintForest(c) {
    var rnd = rng(19990909);
    vgrad(c, 0, 0, W, H, "#cfe6c4", "#5d8a52");
    for (var row = 0; row < 4; row++) { var yy = H * (0.12 + row * 0.12), dk = row >= 2; for (var x = -40; x < W + 80; x += 120) softTree(c, x + (row % 2) * 60, yy + 80, 0.7 + row * 0.12, dk); }
    c.save(); c.globalCompositeOperation = "screen";
    for (var r = 0; r < 4; r++) { var rx = W * (0.2 + r * 0.2); var g = c.createLinearGradient(rx, 0, rx + 60, H); g.addColorStop(0, "rgba(255,250,210,0.20)"); g.addColorStop(1, "rgba(255,250,210,0)"); c.fillStyle = g; c.beginPath(); c.moveTo(rx - 30, 0); c.lineTo(rx + 30, 0); c.lineTo(rx + 120, H); c.lineTo(rx + 40, H); c.closePath(); c.fill(); }
    c.restore();
    vgrad(c, 0, H * 0.62, W, H * 0.38, "#6f8f4f", "#4f6a39");
    for (var i = 0; i < 44; i++) blob(c, rnd() * W, H * (0.66 + rnd() * 0.32), 30 + rnd() * 70, rnd() < 0.5 ? [70, 96, 52] : [120, 150, 80], 0.18);
    for (var m = 0; m < 9; m++) { var mx = rnd() * W, my = H * (0.7 + rnd() * 0.24); c.fillStyle = "#f0e6d0"; c.fillRect(mx - 3, my - 6, 6, 12); c.fillStyle = rnd() < 0.5 ? "#d9534f" : "#e8895a"; c.beginPath(); c.ellipse(mx, my - 6, 11, 8, 0, Math.PI, 0); c.fill(); }
    fern(c, W * 0.15, H * 0.92, 1.4, [80, 130, 60]); fern(c, W * 0.85, H * 0.9, 1.5, [80, 130, 60]);
    blob(c, W * 0.02, H * 1.04, 280, [30, 55, 30], 0.6); blob(c, W * 1.0, H * 1.02, 300, [30, 55, 30], 0.6);
  }
  function paintBeach(c) {
    var rnd = rng(55555);
    vgrad(c, 0, 0, W, H * 0.55, "#bfe9ff", "#ffe9c2");
    blob(c, W * 0.80, H * 0.18, 200, [255, 244, 200], 0.9); blob(c, W * 0.80, H * 0.18, 80, [255, 252, 235], 1);
    [[0.2, 0.16], [0.5, 0.1], [0.62, 0.22]].forEach(function (p) { blob(c, W * p[0], H * p[1], 70, [255, 255, 255], 0.85); blob(c, W * p[0] + 50, H * p[1] + 6, 50, [255, 255, 255], 0.8); blob(c, W * p[0] - 46, H * p[1] + 8, 44, [255, 255, 255], 0.8); });
    vgrad(c, 0, H * 0.42, W, H * 0.22, "#5fc7d6", "#3a9ec2");
    c.strokeStyle = "rgba(255,255,255,0.5)"; c.lineWidth = 3;
    for (var wv = 0; wv < 5; wv++) { var wy = H * (0.46 + wv * 0.03); c.beginPath(); for (var x = 0; x <= W; x += 20) c.lineTo(x, wy + Math.sin(x * 0.04 + wv) * 4); c.stroke(); }
    vgrad(c, 0, H * 0.6, W, H * 0.12, "#e9d3a0", "#efdcae"); vgrad(c, 0, H * 0.7, W, H * 0.3, "#f6e6bf", "#ecd49f");
    for (var i = 0; i < 36; i++) blob(c, rnd() * W, H * (0.74 + rnd() * 0.24), 18 + rnd() * 28, [210, 180, 120], 0.12);
    for (var sh = 0; sh < 8; sh++) { var sx = rnd() * W, sy = H * (0.76 + rnd() * 0.2); if (rnd() < 0.5) { c.fillStyle = "#f4b8c4"; c.beginPath(); c.arc(sx, sy, 7, Math.PI, 0); c.fill(); } else { c.fillStyle = "#f6b65e"; star(c, sx, sy, 8); } }
    var px = W * 0.1, py = H * 0.74; c.strokeStyle = "#9c7747"; c.lineWidth = 14; c.lineCap = "round"; c.beginPath(); c.moveTo(px, py); c.quadraticCurveTo(px - 30, py - 110, px + 10, py - 200); c.stroke();
    [-1, -0.4, 0.3, 1].forEach(function (a) { blob(c, px + 10 + a * 60, py - 200 - Math.abs(a) * 6, 46, [110, 180, 90], 0.95); });
    blob(c, W * 0.03, H * 1.05, 240, [220, 190, 130], 0.55); blob(c, W * 1.0, H * 1.04, 250, [220, 190, 130], 0.55);
  }

  function makeFoliage(bg) {
    var rnd = rng(bg === "beach" ? 808 : 909), arr = [], n = 14;
    for (var i = 0; i < n; i++) {
      var edge = i < n * 0.6;
      arr.push({ x: 30 + rnd() * (W - 60), y: edge ? H * (0.9 + rnd() * 0.08) : H * (0.72 + rnd() * 0.12), s: 0.8 + rnd() * 1.0, sway: 0, phase: rnd() * Math.PI * 2, kind: bg === "beach" ? (rnd() < 0.5 ? "reed" : "grass") : (rnd() < 0.4 ? "flower" : "grass") });
    }
    foliage[bg] = arr;
  }
  function foliageFor(bg) { if (!foliage[bg]) makeFoliage(bg); return foliage[bg]; }
  var t_i = 0;
  function drawTuft(c, kind, s) {
    if (kind === "flower") { c.strokeStyle = "#4f9b54"; c.lineWidth = 3 * s; c.lineCap = "round"; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -22 * s); c.stroke(); var cols = ["#ef8a8a", "#f6c453", "#e6a3d0", "#fff"]; c.fillStyle = cols[(t_i++) % cols.length]; for (var p = 0; p < 5; p++) { var a = p / 5 * Math.PI * 2; c.beginPath(); c.arc(Math.cos(a) * 5 * s, -22 * s + Math.sin(a) * 5 * s, 4 * s, 0, Math.PI * 2); c.fill(); } c.fillStyle = "#f6e27a"; c.beginPath(); c.arc(0, -22 * s, 3 * s, 0, Math.PI * 2); c.fill(); }
    else if (kind === "reed") { c.strokeStyle = "#6f9c49"; c.lineWidth = 3.5 * s; c.lineCap = "round"; for (var r = -1; r <= 1; r++) { c.beginPath(); c.moveTo(r * 5 * s, 0); c.quadraticCurveTo(r * 9 * s, -22 * s, r * 7 * s, -40 * s); c.stroke(); } }
    else { c.strokeStyle = "#5fae5a"; c.lineWidth = 4 * s; c.lineCap = "round"; for (var g = -2; g <= 2; g++) { c.beginPath(); c.moveTo(g * 5 * s, 0); c.quadraticCurveTo(g * 9 * s, -20 * s, g * 8 * s, -34 * s); c.stroke(); } }
  }

  PB.scene = {
    init: function () { prerender("forest", paintForest); prerender("beach", paintBeach); },
    current: function () { return mode; },
    setLocation: function (m) { mode = m; return true; },
    bgOf: function () { return PB.area().bg; },
    name: function () { return PB.area().name; },
    bounds: function () { return { x0: 90, x1: W - 90, y0: H * 0.42, y1: H * 0.78 }; },

    draw: function (ctx, parX, parY) {
      var bg = pre[this.bgOf()]; if (!bg) return;
      var over = 0.06; parX = parX || 0; parY = parY || 0; var ow = W * over, oh = H * over;
      ctx.drawImage(bg, -ow / 2 - parX * ow * 0.5, -oh / 2 - parY * oh * 0.5, W * (1 + over), H * (1 + over));
    },

    updateFoliage: function (dt, movers) {
      var arr = foliageFor(this.bgOf());
      for (var i = 0; i < arr.length; i++) {
        var t = arr[i]; t.phase += dt * 1.5; t.sway *= Math.pow(0.06, dt);
        for (var j = 0; movers && j < movers.length; j++) { var m = movers[j], dx = m.x - t.x, dy = m.y - t.y; if (Math.abs(dx) < 40 && Math.abs(dy) < 60) t.sway += (dx >= 0 ? -1 : 1) * 0.3 * dt; }
        t.sway = Math.max(-0.6, Math.min(0.6, t.sway));
      }
    },
    drawForeground: function (ctx, parX, parY) {
      var arr = foliageFor(this.bgOf()), ox = (parX || 0) * 18, oy = (parY || 0) * 6;
      for (var i = 0; i < arr.length; i++) { var t = arr[i]; ctx.save(); ctx.translate(t.x + ox, t.y + oy); ctx.rotate(t.sway + Math.sin(t.phase) * 0.04); drawTuft(ctx, t.kind, t.s); ctx.restore(); }
    },
  };

  function prerender(id, painter) { var cv = document.createElement("canvas"); cv.width = W; cv.height = H; painter(cv.getContext("2d")); pre[id] = cv; }

})(window.PB = window.PB || {});
