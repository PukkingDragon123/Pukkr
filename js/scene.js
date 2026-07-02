/* ===========================================================================
   scene.js — a faux-3D painterly renderer. Each biome supplies a palette + a
   "style"; the engine paints a deep scene from it: graded sky with a sun &
   god-rays, layered hills receding into fog, a PERSPECTIVE ground plane, themed
   props with contact shadows, a live lighting/bloom pass, and a foreground
   foliage layer that rustles. Multi-layer pointer-parallax sells the depth.
   =========================================================================== */
(function (PB) {
  "use strict";

  var W = PB.config.VIEW_W, H = PB.config.VIEW_H;
  var mode = "catch";
  var back = {}, front = {}, foliage = {}, clock = 0;

  // ---- color helpers -------------------------------------------------------
  function hexToRgb(h) { if (Array.isArray(h)) return h; h = (h || "#888").replace("#", ""); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; }
  function rgba(c, a) { return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }
  function mix(a, b, t) { var x = hexToRgb(a), y = hexToRgb(b); return [Math.round(x[0] + (y[0] - x[0]) * t), Math.round(x[1] + (y[1] - x[1]) * t), Math.round(x[2] + (y[2] - x[2]) * t)]; }
  function hx(rgb) { return "rgb(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ")"; }
  function vgrad(c, x, y, w, h, top, bot) { var g = c.createLinearGradient(x, y, x, y + h); g.addColorStop(0, top); g.addColorStop(1, bot); c.fillStyle = g; c.fillRect(x, y, w, h); }
  function blob(c, x, y, r, col, a) { var g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(col, a)); g.addColorStop(0.65, rgba(col, a * 0.5)); g.addColorStop(1, rgba(col, 0)); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
  function rng(seed) { var s = seed >>> 0; return function () { s = (s + 0x6D2B79F5) >>> 0; var t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // sensible palette if a biome forgot to define one
  function palOf(area) {
    if (area.scene) return area.scene;
    if (area.bg === "beach") return { style: "beach", sky: ["#bfe9ff", "#ffe9c2"], ground: ["#f0dba6", "#e6c98c"], fog: "#dff0ef", light: "#fff4cf", accent: "#5fc7d6" };
    return { style: "forest", sky: ["#cfe6c4", "#8fbf78"], ground: ["#6f9c4f", "#48632f"], fog: "#dff0d8", light: "#fff7d0", accent: "#e88a8a" };
  }
  var HORIZON = 0.56;       // fraction of H where ground meets sky

  // ---- sky, sun & god-rays -------------------------------------------------
  function paintSky(c, P) {
    var hy = H * HORIZON;
    vgrad(c, 0, 0, W, hy + 20, P.sky[0], P.sky[1]);
    var sx = W * (P.sunX != null ? P.sunX : 0.74), sy = H * (P.sunY != null ? P.sunY : 0.2);
    blob(c, sx, sy, H * 0.5, hexToRgb(P.light), 0.55);
    blob(c, sx, sy, H * 0.16, hexToRgb(P.light), 0.95);
    // god-rays
    c.save(); c.globalCompositeOperation = "screen";
    for (var i = 0; i < 6; i++) {
      var a = 0.6 + i * 0.32, len = H * 1.1, x0 = sx + Math.cos(a) * 30, y0 = sy + Math.sin(a) * 30;
      var g = c.createLinearGradient(x0, y0, x0 + Math.cos(a) * len, y0 + Math.sin(a) * len);
      g.addColorStop(0, rgba(hexToRgb(P.light), 0.16)); g.addColorStop(1, rgba(hexToRgb(P.light), 0));
      c.fillStyle = g; c.beginPath(); c.moveTo(x0, y0);
      c.lineTo(x0 + Math.cos(a - 0.05) * len, y0 + Math.sin(a - 0.05) * len);
      c.lineTo(x0 + Math.cos(a + 0.05) * len + 70, y0 + Math.sin(a + 0.05) * len); c.closePath(); c.fill();
    }
    c.restore();
  }

  function paintHills(c, P) {
    var hy = H * HORIZON;
    for (var L = 0; L < 3; L++) {
      var depth = 1 - L * 0.34;                       // far -> near
      var col = mix(P.fog, P.ground[0], 0.25 + L * 0.32);
      var baseY = hy - 30 + L * 36, amp = 26 + L * 16, rnd = rng(101 + L * 53);
      c.fillStyle = hx(col); c.beginPath(); c.moveTo(-20, baseY + amp);
      for (var x = -20; x <= W + 20; x += 40) { c.lineTo(x, baseY - amp * Math.abs(Math.sin(x * 0.004 + L + rnd() * 0.4))); }
      c.lineTo(W + 20, hy + 60); c.lineTo(-20, hy + 60); c.closePath(); c.fill();
    }
    // fog band at the horizon
    var g = c.createLinearGradient(0, hy - 60, 0, hy + 50); g.addColorStop(0, rgba(hexToRgb(P.fog), 0)); g.addColorStop(0.6, rgba(hexToRgb(P.fog), 0.55)); g.addColorStop(1, rgba(hexToRgb(P.fog), 0));
    c.fillStyle = g; c.fillRect(0, hy - 60, W, 110);
  }

  // perspective ground plane: gradient + receding bands that converge at the horizon
  function paintGround(c, P) {
    var hy = H * HORIZON;
    vgrad(c, 0, hy, W, H - hy, hx(mix(P.ground[0], P.fog, 0.25)), P.ground[1]);
    // converging seams (perspective)
    c.save(); c.strokeStyle = rgba(hexToRgb(P.ground[1]), 0.35); c.lineWidth = 2;
    var vx = W / 2;
    for (var i = -7; i <= 7; i++) { c.beginPath(); c.moveTo(vx + i * 12, hy + 2); c.lineTo(vx + i * 150, H + 10); c.stroke(); }
    // horizontal rows getting closer near the horizon
    c.strokeStyle = rgba(hexToRgb(P.ground[1]), 0.22);
    for (var r = 1; r <= 9; r++) { var t = r / 9, y = hy + (H - hy) * t * t; c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    c.restore();
    // soft lit center
    blob(c, W / 2, hy + (H - hy) * 0.5, W * 0.42, hexToRgb(P.light), 0.10);
  }

  // ---- themed props --------------------------------------------------------
  function softTree(c, x, y, sc, P) {
    var th = 90 * sc, tw = 15 * sc;
    var tg = c.createLinearGradient(x - tw, 0, x + tw, 0); tg.addColorStop(0, "#6e4f30"); tg.addColorStop(0.5, "#9c7747"); tg.addColorStop(1, "#5e4226");
    c.fillStyle = tg; c.beginPath(); c.moveTo(x - tw * 0.5, y); c.quadraticCurveTo(x - tw * 0.3, y - th * 0.6, x - tw * 0.2, y - th); c.lineTo(x + tw * 0.2, y - th); c.quadraticCurveTo(x + tw * 0.3, y - th * 0.6, x + tw * 0.5, y); c.closePath(); c.fill();
    var cy = y - th - 12 * sc, g1 = hexToRgb(P.ground[0]), g2 = mix(P.ground[0], "#ffffff", 0.3);
    blob(c, x, cy, 66 * sc, g1, 0.95);
    blob(c, x - 42 * sc, cy + 16 * sc, 46 * sc, g1, 0.9); blob(c, x + 42 * sc, cy + 16 * sc, 46 * sc, g2, 0.9);
    blob(c, x + 22 * sc, cy - 26 * sc, 28 * sc, mix(P.light, g2, 0.4), 0.5);
  }
  function pine(c, x, y, sc, P) {
    var col = mix(P.ground[0], "#0a2a14", 0.25);
    c.fillStyle = "#7c5a36"; c.fillRect(x - 3 * sc, y - 20 * sc, 6 * sc, 22 * sc);
    for (var t = 0; t < 3; t++) { var ty = y - 18 * sc - t * 22 * sc, wd = (34 - t * 9) * sc; c.fillStyle = hx(mix(col, P.light, t * 0.08)); c.beginPath(); c.moveTo(x, ty - 30 * sc); c.lineTo(x - wd, ty); c.lineTo(x + wd, ty); c.closePath(); c.fill(); }
  }
  function crystal(c, x, y, sc, P) {
    var col = hexToRgb(P.accent);
    [[0, 1.0, 1.0], [-0.5, 0.7, 0.7], [0.5, 0.6, 0.6]].forEach(function (k) {
      var cx = x + k[0] * 22 * sc, h = 56 * sc * k[2], w = 12 * sc * k[1];
      var g = c.createLinearGradient(cx, y - h, cx, y); g.addColorStop(0, rgba(mix(P.accent, "#ffffff", 0.5), 0.95)); g.addColorStop(1, rgba(col, 0.9));
      c.fillStyle = g; c.beginPath(); c.moveTo(cx, y - h); c.lineTo(cx - w, y - h * 0.45); c.lineTo(cx - w * 0.6, y); c.lineTo(cx + w * 0.6, y); c.lineTo(cx + w, y - h * 0.45); c.closePath(); c.fill();
      c.strokeStyle = rgba([255, 255, 255], 0.4); c.lineWidth = 1; c.beginPath(); c.moveTo(cx, y - h); c.lineTo(cx, y); c.stroke();
    });
    blob(c, x, y - 24 * sc, 40 * sc, col, 0.4);
  }
  function glowMushroom(c, x, y, sc, P) {
    c.fillStyle = "#e9e0cf"; c.fillRect(x - 3 * sc, y - 16 * sc, 6 * sc, 16 * sc);
    blob(c, x, y - 20 * sc, 30 * sc, hexToRgb(P.accent), 0.5);
    c.fillStyle = hx(hexToRgb(P.accent)); c.beginPath(); c.ellipse(x, y - 16 * sc, 14 * sc, 9 * sc, 0, Math.PI, 0); c.fill();
    c.fillStyle = "rgba(255,255,255,0.5)"; for (var d = 0; d < 3; d++) c.fillRect(x - 8 * sc + d * 7 * sc, y - 19 * sc, 2 * sc, 2 * sc);
  }
  function lavaRock(c, x, y, sc, P) {
    c.fillStyle = "#2a2026"; c.beginPath(); c.ellipse(x, y - 8 * sc, 22 * sc, 14 * sc, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = hx(hexToRgb(P.accent)); c.lineWidth = 2 * sc; c.beginPath(); c.moveTo(x - 14 * sc, y - 8 * sc); c.lineTo(x - 2 * sc, y - 12 * sc); c.lineTo(x + 10 * sc, y - 4 * sc); c.stroke();
    blob(c, x, y - 8 * sc, 26 * sc, hexToRgb(P.accent), 0.35);
  }
  function snowDrift(c, x, y, sc, P) { c.fillStyle = "rgba(255,255,255,0.92)"; c.beginPath(); c.ellipse(x, y, 40 * sc, 14 * sc, 0, Math.PI, 0); c.fill(); c.fillStyle = "rgba(210,230,245,0.7)"; c.beginPath(); c.ellipse(x + 10 * sc, y, 22 * sc, 8 * sc, 0, Math.PI, 0); c.fill(); }
  function icePine(c, x, y, sc, P) { pine(c, x, y, sc, P); c.fillStyle = "rgba(255,255,255,0.85)"; for (var t = 0; t < 3; t++) { var ty = y - 18 * sc - t * 22 * sc; c.beginPath(); c.moveTo(x, ty - 30 * sc); c.lineTo(x - (30 - t * 9) * sc, ty - 4 * sc); c.lineTo(x, ty - 8 * sc); c.closePath(); c.fill(); } }
  function lily(c, x, y, sc, P) { c.fillStyle = hx(mix(P.ground[0], "#2c6b3a", 0.4)); c.beginPath(); c.ellipse(x, y, 22 * sc, 9 * sc, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = hx(mix(P.ground[0], "#000", 0.2)); c.beginPath(); c.moveTo(x, y); c.lineTo(x + 22 * sc, y - 2 * sc); c.lineTo(x + 18 * sc, y + 3 * sc); c.closePath(); c.fill(); c.fillStyle = hx(hexToRgb(P.accent)); c.beginPath(); c.arc(x - 6 * sc, y - 3 * sc, 4 * sc, 0, Math.PI * 2); c.fill(); }
  function reed(c, x, y, sc, P) { c.strokeStyle = hx(mix(P.ground[0], "#1f3a22", 0.4)); c.lineWidth = 3 * sc; c.lineCap = "round"; for (var k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(x + k * 6 * sc, y); c.quadraticCurveTo(x + k * 12 * sc, y - 34 * sc, x + k * 9 * sc, y - 56 * sc); c.stroke(); } }
  function cactus(c, x, y, sc, P) { var col = hx(mix(P.ground[0], "#3a7d4a", 0.5)); c.fillStyle = col; c.strokeStyle = "#2c5e38"; c.lineWidth = 1.5 * sc; rrect(c, x - 7 * sc, y - 48 * sc, 14 * sc, 48 * sc, 7 * sc); c.fill(); rrect(c, x - 22 * sc, y - 30 * sc, 10 * sc, 24 * sc, 5 * sc); c.fill(); rrect(c, x + 12 * sc, y - 38 * sc, 10 * sc, 30 * sc, 5 * sc); c.fill(); }
  function dune(c, x, y, sc, P) { c.fillStyle = hx(mix(P.ground[0], P.light, 0.2)); c.beginPath(); c.ellipse(x, y, 90 * sc, 22 * sc, 0, Math.PI, 0); c.fill(); }
  function flower(c, x, y, sc, P, seed) { var cols = [P.accent, "#f6c453", "#ef8a8a", "#ffffff"]; c.strokeStyle = "#4f9b54"; c.lineWidth = 2.5 * sc; c.lineCap = "round"; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 20 * sc); c.stroke(); var col = cols[seed % cols.length]; c.fillStyle = hx(hexToRgb(col)); for (var p = 0; p < 5; p++) { var a = p / 5 * Math.PI * 2; c.beginPath(); c.arc(x + Math.cos(a) * 5 * sc, y - 20 * sc + Math.sin(a) * 5 * sc, 4 * sc, 0, Math.PI * 2); c.fill(); } c.fillStyle = "#f6e27a"; c.beginPath(); c.arc(x, y - 20 * sc, 3 * sc, 0, Math.PI * 2); c.fill(); }
  function rrect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

  // which props each style scatters (drawn front-to-near with contact shadows)
  var STYLES = {
    forest:  { far: pine,   near: softTree, tuft: "flower" },
    beach:   { far: null,   near: palm,     tuft: "reed", water: true },
    cave:    { far: crystal, near: glowMushroom, tuft: "crystal", dim: 0.25 },
    volcano: { far: lavaRock, near: lavaRock, tuft: "ember", dim: 0.18 },
    tundra:  { far: icePine, near: snowDrift, tuft: "ice", snow: true },
    swamp:   { far: reed,   near: lily,     tuft: "reed", water: true, dim: 0.12 },
    meadow:  { far: softTree, near: flower, tuft: "flower" },
    desert:  { far: dune,   near: cactus,   tuft: "grass" },
    canopy:  { far: softTree, near: softTree, tuft: "flower" },
  };
  function palm(c, x, y, sc, P) {
    c.strokeStyle = "#9c7747"; c.lineWidth = 11 * sc; c.lineCap = "round"; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x - 24 * sc, y - 80 * sc, x + 8 * sc, y - 150 * sc); c.stroke();
    var lc = mix(P.ground[0], "#2c6b3a", 0.3);
    [-1, -0.4, 0.3, 1].forEach(function (a) { blob(c, x + 8 * sc + a * 46 * sc, y - 150 * sc - Math.abs(a) * 5 * sc, 40 * sc, lc, 0.9); });
  }

  function scatter(c, painter, P, n, y0, y1, seed, dim) {
    if (!painter) return;
    var rnd = rng(seed);
    for (var i = 0; i < n; i++) {
      var t = i / Math.max(1, n - 1), x = 30 + rnd() * (W - 60), y = H * (y0 + (y1 - y0) * rnd()), sc = 0.6 + (y / H) * 0.9;
      c.fillStyle = "rgba(0,0,0,0.16)"; c.beginPath(); c.ellipse(x, y + 2, 26 * sc, 7 * sc, 0, 0, Math.PI * 2); c.fill();
      painter(c, x, y, sc, P, i);
    }
    if (dim) { c.fillStyle = rgba([10, 8, 16], dim); c.fillRect(0, 0, W, H); }
  }

  // ---- layer builders ------------------------------------------------------
  function buildBack(area) {
    var P = palOf(area), cv = document.createElement("canvas"); cv.width = W; cv.height = H; var c = cv.getContext("2d");
    paintSky(c, P); paintHills(c, P);
    var S = STYLES[P.style] || STYLES.forest;
    if (S.water) { vgrad(c, 0, H * HORIZON - 8, W, H * 0.16, hx(hexToRgb(P.accent)), hx(mix(P.accent, "#13405a", 0.5))); c.strokeStyle = "rgba(255,255,255,0.45)"; c.lineWidth = 2; for (var wv = 0; wv < 4; wv++) { var wy = H * HORIZON + wv * 8; c.beginPath(); for (var x = 0; x <= W; x += 18) c.lineTo(x, wy + Math.sin(x * 0.05 + wv) * 3); c.stroke(); } }
    scatter(c, S.far, P, 7, HORIZON + 0.02, HORIZON + 0.1, 7771, 0);
    back[area.id] = cv;
  }
  function buildFront(area) {
    var P = palOf(area), cv = document.createElement("canvas"); cv.width = W; cv.height = H; var c = cv.getContext("2d");
    paintGround(c, P);
    var S = STYLES[P.style] || STYLES.forest;
    scatter(c, S.near, P, 7, 0.72, 0.96, 313, S.dim || 0);
    if (S.snow) { c.fillStyle = "rgba(255,255,255,0.5)"; for (var i = 0; i < 40; i++) { var rnd = (i * 9301 + 49297) % 233280 / 233280; c.beginPath(); c.arc(rnd * W, H * (0.6 + ((i * 7) % 40) / 40 * 0.4), 1.6, 0, Math.PI * 2); c.fill(); } }
    // near edge framing
    blob(c, W * 0.02, H * 1.05, 260, mix(P.ground[1], "#000", 0.2), 0.55); blob(c, W * 1.0, H * 1.04, 270, mix(P.ground[1], "#000", 0.2), 0.55);
    front[area.id] = cv;
  }

  // ---- foreground foliage (live, rustling) ---------------------------------
  function makeFoliage(area) {
    var P = palOf(area), S = STYLES[P.style] || STYLES.forest, rnd = rng(area.id.length * 131 + 7), arr = [], n = 13;
    for (var i = 0; i < n; i++) arr.push({ x: 24 + rnd() * (W - 48), y: H * (0.9 + rnd() * 0.08), s: 0.85 + rnd() * 1.0, sway: 0, phase: rnd() * 6.28, kind: S.tuft, col: P.accent });
    foliage[area.id] = arr;
  }
  function foliageFor(area) { if (!foliage[area.id]) makeFoliage(area); return foliage[area.id]; }
  var tIdx = 0;
  function drawTuft(c, kind, s, P) {
    if (kind === "flower") { c.strokeStyle = "#4f9b54"; c.lineWidth = 3 * s; c.lineCap = "round"; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -22 * s); c.stroke(); var cols = ["#ef8a8a", "#f6c453", "#e6a3d0", "#fff", P.accent]; c.fillStyle = cols[(tIdx++) % cols.length]; for (var p = 0; p < 5; p++) { var a = p / 5 * 6.28; c.beginPath(); c.arc(Math.cos(a) * 5 * s, -22 * s + Math.sin(a) * 5 * s, 4 * s, 0, Math.PI * 2); c.fill(); } c.fillStyle = "#f6e27a"; c.beginPath(); c.arc(0, -22 * s, 3 * s, 0, Math.PI * 2); c.fill(); }
    else if (kind === "reed") { c.strokeStyle = "#6f9c49"; c.lineWidth = 3.5 * s; c.lineCap = "round"; for (var r = -1; r <= 1; r++) { c.beginPath(); c.moveTo(r * 5 * s, 0); c.quadraticCurveTo(r * 9 * s, -22 * s, r * 7 * s, -42 * s); c.stroke(); } }
    else if (kind === "crystal") { var col = hexToRgb(P.accent); c.fillStyle = rgba(col, 0.92); c.beginPath(); c.moveTo(0, -36 * s); c.lineTo(-8 * s, 0); c.lineTo(8 * s, 0); c.closePath(); c.fill(); c.fillStyle = rgba(mix(P.accent, "#fff", 0.6), 0.9); c.beginPath(); c.moveTo(0, -36 * s); c.lineTo(-3 * s, 0); c.lineTo(3 * s, 0); c.closePath(); c.fill(); }
    else if (kind === "ember") { c.fillStyle = "#2a2026"; c.beginPath(); c.moveTo(-10 * s, 0); c.lineTo(0, -20 * s); c.lineTo(10 * s, 0); c.closePath(); c.fill(); c.fillStyle = hx(hexToRgb(P.accent)); c.beginPath(); c.arc(0, -6 * s, 4 * s, 0, Math.PI * 2); c.fill(); }
    else if (kind === "ice") { c.fillStyle = "rgba(225,240,255,0.9)"; c.beginPath(); c.moveTo(0, 0); c.lineTo(-6 * s, -28 * s); c.lineTo(6 * s, -28 * s); c.closePath(); c.fill(); }
    else { c.strokeStyle = "#5fae5a"; c.lineWidth = 4 * s; c.lineCap = "round"; for (var g = -2; g <= 2; g++) { c.beginPath(); c.moveTo(g * 5 * s, 0); c.quadraticCurveTo(g * 9 * s, -20 * s, g * 8 * s, -34 * s); c.stroke(); } }
  }

  PB.scene = {
    init: function () { /* layers build lazily per biome */ },
    current: function () { return mode; },
    setLocation: function (m) { mode = m; return true; },
    bgOf: function () { return PB.area().id; },
    name: function () { return PB.area().name; },
    bounds: function () { return { x0: 90, x1: W - 90, y0: H * 0.42, y1: H * 0.78 }; },

    draw: function (ctx, parX, parY) {
      clock += 0.016;
      var area = PB.area();
      if (!back[area.id]) buildBack(area);
      if (!front[area.id]) buildFront(area);
      parX = parX || 0; parY = parY || 0;
      var P = palOf(area);
      // back layer — slow parallax
      drawLayer(ctx, back[area.id], parX * 0.03, parY * 0.02, 0.05);
      // front layer — faster parallax + a little vertical
      drawLayer(ctx, front[area.id], parX * 0.08, parY * 0.04, 0.08);
      // live lighting bloom from the sun
      var sx = W * (P.sunX != null ? P.sunX : 0.74), sy = H * (P.sunY != null ? P.sunY : 0.2);
      ctx.save(); ctx.globalCompositeOperation = "screen"; blob(ctx, sx - parX * 8, sy, H * 0.6 * (1 + Math.sin(clock) * 0.03), hexToRgb(P.light), 0.10); ctx.restore();
    },

    updateFoliage: function (dt, movers) {
      var arr = foliageFor(PB.area());
      for (var i = 0; i < arr.length; i++) { var t = arr[i]; t.phase += dt * 1.5; t.sway *= Math.pow(0.06, dt); for (var j = 0; movers && j < movers.length; j++) { var m = movers[j], dx = m.x - t.x, dy = m.y - t.y; if (Math.abs(dx) < 40 && Math.abs(dy) < 60) t.sway += (dx >= 0 ? -1 : 1) * 0.3 * dt; } t.sway = Math.max(-0.6, Math.min(0.6, t.sway)); }
    },
    drawForeground: function (ctx, parX, parY) {
      var area = PB.area(), P = palOf(area), arr = foliageFor(area), ox = (parX || 0) * 22, oy = (parY || 0) * 8;
      for (var i = 0; i < arr.length; i++) { var t = arr[i]; ctx.save(); ctx.translate(t.x + ox, t.y + oy); ctx.rotate(t.sway + Math.sin(t.phase) * 0.04); drawTuft(ctx, t.kind, t.s, P); ctx.restore(); }
    },
  };

  function drawLayer(ctx, cv, px, py, over) {
    var ow = W * over, oh = H * over;
    ctx.drawImage(cv, -ow / 2 - px * W, -oh / 2 - py * H, W * (1 + over), H * (1 + over));
  }

})(window.PB = window.PB || {});
