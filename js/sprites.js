/* ===========================================================================
   sprites.js — cute, squishy procedural creatures for species that don't have
   hand-drawn art yet (the beach bugs). Also renders a little glass jar around
   them so they match the hand-drawn jars in the collection screens.
   =========================================================================== */
(function (PB) {
  "use strict";

  var OUTLINE = "#3a2f25";
  var cache = {};

  function circle(c, x, y, r, fill) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = fill; c.fill(); }
  function ring(c, x, y, r, w) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.lineWidth = w; c.strokeStyle = OUTLINE; c.stroke(); }
  function ell(c, x, y, rx, ry, fill) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = fill; c.fill(); }
  function ellS(c, x, y, rx, ry, w) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.lineWidth = w; c.strokeStyle = OUTLINE; c.stroke(); }
  function line(c, x1, y1, x2, y2, w, col) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.lineWidth = w; c.strokeStyle = col || OUTLINE; c.lineCap = "round"; c.stroke(); }
  function shade(hex, a) {
    var h = hex.replace("#", ""); if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    var r = parseInt(h.substr(0,2),16), g = parseInt(h.substr(2,2),16), b = parseInt(h.substr(4,2),16);
    var f = a < 0 ? 0 : 255, p = Math.abs(a);
    return "rgb(" + Math.round(r+(f-r)*p) + "," + Math.round(g+(f-g)*p) + "," + Math.round(b+(f-b)*p) + ")";
  }
  function eye(c, x, y, r, c3) {
    circle(c, x, y, r, "#fff"); circle(c, x + r * 0.2, y, r * 0.55, c3 || "#222");
    circle(c, x - r * 0.18, y - r * 0.3, r * 0.25, "rgba(255,255,255,0.95)");
  }

  // squishy bob: t drives a squash/stretch around the base.
  function drawBug(c, look, cx, cy, size, t) {
    t = t || 0;
    var s = size / 16, ow = Math.max(1.4, s * 1.15);
    var sq = 1 + Math.sin(t * 0.16) * 0.08;        // squash factor
    c.save();
    c.translate(cx, cy);
    c.scale(1 / sq, sq);                            // squash-and-stretch
    c.lineJoin = "round"; c.lineWidth = ow; c.strokeStyle = OUTLINE;
    switch (look.body) {
      case "crab":    drawCrab(c, look, s); break;
      case "shrimp":  drawShrimp(c, look, s); break;
      case "grub":    drawGrub(c, look, s); break;
      case "beetle":  drawBeetle(c, look, s); break;
      case "moth":    drawMoth(c, look, s); break;
      case "mantis":  drawMantis(c, look, s); break;
      case "firefly": drawFirefly(c, look, s); break;
      case "spider":  drawSpider(c, look, s); break;
      default:        drawRound(c, look, s);
    }
    c.restore();
  }

  function drawRound(c, look, s) {
    var r = 5.4 * s;
    ell(c, 0, 0, r, r * 0.92, look.c1); ellS(c, 0, 0, r, r * 0.92, c.lineWidth);
    ell(c, 0, -r * 0.28, r * 0.7, r * 0.42, shade(look.c1, 0.18));
    eye(c, -r * 0.34, 0, r * 0.24, look.c3); eye(c, r * 0.34, 0, r * 0.24, look.c3);
    // smile
    c.beginPath(); c.arc(0, r * 0.32, r * 0.32, 0.15 * Math.PI, 0.85 * Math.PI); c.lineWidth = s * 0.8; c.strokeStyle = OUTLINE; c.stroke();
  }

  function drawCrab(c, look, s) {
    var r = 5 * s;
    // shell/rock backpack
    if (look.shell) {
      ell(c, 0, -r * 0.5, r * 1.15, r * 0.95, look.c2); ellS(c, 0, -r * 0.5, r * 1.15, r * 0.95, c.lineWidth);
      circle(c, -r * 0.4, -r * 0.7, r * 0.18, shade(look.c2, -0.2));
      circle(c, r * 0.5, -r * 0.4, r * 0.14, shade(look.c2, -0.2));
    }
    // legs
    for (var i = -1; i <= 1; i++) {
      line(c, -r * 0.7, r * 0.2 + i * r * 0.3, -r * 1.4, r * 0.5 + i * r * 0.3, s * 0.9);
      line(c, r * 0.7, r * 0.2 + i * r * 0.3, r * 1.4, r * 0.5 + i * r * 0.3, s * 0.9);
    }
    // body
    ell(c, 0, r * 0.2, r, r * 0.85, look.c1); ellS(c, 0, r * 0.2, r, r * 0.85, c.lineWidth);
    // claws
    if (look.claws) {
      line(c, -r, r * 0.1, -r * 1.7, -r * 0.3, s * 1.2, look.c1);
      ell(c, -r * 1.9, -r * 0.4, r * 0.5, r * 0.4, look.c1); ellS(c, -r * 1.9, -r * 0.4, r * 0.5, r * 0.4, c.lineWidth);
      line(c, r, r * 0.1, r * 1.7, -r * 0.3, s * 1.2, look.c1);
      ell(c, r * 1.9, -r * 0.4, r * 0.5, r * 0.4, look.c1); ellS(c, r * 1.9, -r * 0.4, r * 0.5, r * 0.4, c.lineWidth);
    }
    eye(c, -r * 0.34, r * 0.05, r * 0.26, look.c3); eye(c, r * 0.34, r * 0.05, r * 0.26, look.c3);
  }

  function drawShrimp(c, look, s) {
    var r = 3.2 * s;
    // curved segmented body
    for (var i = 0; i < 4; i++) {
      ell(c, -i * r * 1.1, i * i * 0.5 * s, r * (1 - i * 0.12), r * 0.85, i % 2 ? shade(look.c1, -0.08) : look.c1);
      ellS(c, -i * r * 1.1, i * i * 0.5 * s, r * (1 - i * 0.12), r * 0.85, c.lineWidth);
    }
    // tail fan
    line(c, -r * 3.3, r * 2.2, -r * 4.2, r * 1.4, s, look.c2);
    line(c, -r * 3.3, r * 2.2, -r * 4.3, r * 2.6, s, look.c2);
    // head
    circle(c, r * 1.1, 0, r * 1.1, shade(look.c1, 0.05)); ring(c, r * 1.1, 0, r * 1.1, c.lineWidth);
    // side fins
    line(c, r * 0.4, -r * 0.8, r * 0.1, -r * 1.8, s * 1.1, look.c2);
    eye(c, r * 1.4, -r * 0.3, r * 0.34, look.c3);
  }

  function drawGrub(c, look, s) {
    var r = 3.4 * s, step = 2.6 * s;
    for (var i = 3; i >= 0; i--) {
      circle(c, -step * 1.2 + i * step, 0, r - i * 0.1 * s, i === 3 ? shade(look.c1, 0.1) : look.c1);
      ring(c, -step * 1.2 + i * step, 0, r - i * 0.1 * s, c.lineWidth);
    }
    var hx = -step * 1.2 + 3 * step;
    eye(c, hx + r * 0.3, -r * 0.1, r * 0.4, look.c3);
  }

  // domed shiny beetle with a little horn
  function drawBeetle(c, look, s) {
    var r = 5.2 * s;
    for (var i = -1; i <= 1; i++) {
      line(c, -r * 0.7, -r * 0.1 + i * r * 0.45, -r * 1.5, i * r * 0.5, s * 0.9);
      line(c, r * 0.7, -r * 0.1 + i * r * 0.45, r * 1.5, i * r * 0.5, s * 0.9);
    }
    ell(c, 0, 0, r, r * 0.95, look.c1); ellS(c, 0, 0, r, r * 0.95, c.lineWidth);
    ell(c, -r * 0.32, -r * 0.36, r * 0.42, r * 0.28, shade(look.c1, 0.38));
    line(c, 0, -r * 0.7, 0, r * 0.85, s * 0.9, OUTLINE);
    circle(c, -r * 0.45, r * 0.2, r * 0.16, shade(look.c1, -0.28));
    circle(c, r * 0.45, r * 0.2, r * 0.16, shade(look.c1, -0.28));
    ell(c, 0, -r * 0.95, r * 0.5, r * 0.42, look.c2); ellS(c, 0, -r * 0.95, r * 0.5, r * 0.42, c.lineWidth);
    if (look.horn) { line(c, 0, -r * 1.3, 0, -r * 1.95, s * 1.2, look.c2); ell(c, 0, -r * 2.0, r * 0.14, r * 0.2, look.c2); }
    eye(c, -r * 0.32, -r * 0.05, r * 0.22, look.c3); eye(c, r * 0.32, -r * 0.05, r * 0.22, look.c3);
  }

  // fuzzy moth with two big patterned wings
  function drawMoth(c, look, s) {
    var r = 3.4 * s;
    [-1, 1].forEach(function (d) {
      ell(c, d * r * 1.55, -r * 0.35, r * 1.6, r * 1.15, look.c2); ellS(c, d * r * 1.55, -r * 0.35, r * 1.6, r * 1.15, c.lineWidth);
      ell(c, d * r * 1.4, r * 1.1, r * 1.1, r * 0.8, shade(look.c2, -0.08)); ellS(c, d * r * 1.4, r * 1.1, r * 1.1, r * 0.8, c.lineWidth);
      ell(c, d * r * 2.0, -r * 0.5, r * 0.55, r * 0.5, look.c3 || "#fff");          // eyespot
      circle(c, d * r * 1.3, r * 0.05, r * 0.3, shade(look.c2, 0.3));
    });
    for (var i = 0; i < 3; i++) { circle(c, 0, -r * 0.7 + i * r * 0.7, r * (0.62 - i * 0.06), shade(look.c1, i === 0 ? 0.1 : 0)); ring(c, 0, -r * 0.7 + i * r * 0.7, r * (0.62 - i * 0.06), c.lineWidth); }
    line(c, -r * 0.2, -r * 1.1, -r * 0.7, -r * 1.9, s * 0.8); line(c, r * 0.2, -r * 1.1, r * 0.7, -r * 1.9, s * 0.8);
    eye(c, -r * 0.24, -r * 0.95, r * 0.2, look.c3); eye(c, r * 0.24, -r * 0.95, r * 0.2, look.c3);
  }

  // slim upright mantis with raptor arms
  function drawMantis(c, look, s) {
    var r = 3.6 * s;
    for (var i = 0; i < 2; i++) { line(c, -r * 0.3, r * 1.1 + i * r * 0.5, -r * 1.3, r * 1.6 + i * r * 0.6, s * 0.8); line(c, r * 0.3, r * 1.1 + i * r * 0.5, r * 1.3, r * 1.6 + i * r * 0.6, s * 0.8); }
    ell(c, 0, r * 0.7, r * 0.85, r * 1.7, look.c1); ellS(c, 0, r * 0.7, r * 0.85, r * 1.7, c.lineWidth);
    ell(c, 0, -r * 0.5, r * 0.62, r * 0.85, shade(look.c1, 0.1)); ellS(c, 0, -r * 0.5, r * 0.62, r * 0.85, c.lineWidth);
    [-1, 1].forEach(function (d) { line(c, d * r * 0.5, -r * 0.4, d * r * 1.4, r * 0.1, s * 1.0, look.c2); line(c, d * r * 1.4, r * 0.1, d * r * 1.1, -r * 0.7, s * 1.0, look.c2); });
    ell(c, 0, -r * 1.5, r * 0.6, r * 0.5, look.c1); ellS(c, 0, -r * 1.5, r * 0.6, r * 0.5, c.lineWidth);
    line(c, -r * 0.2, -r * 1.9, -r * 0.5, -r * 2.5, s * 0.7); line(c, r * 0.2, -r * 1.9, r * 0.5, -r * 2.5, s * 0.7);
    eye(c, -r * 0.34, -r * 1.55, r * 0.26, look.c3); eye(c, r * 0.34, -r * 1.55, r * 0.26, look.c3);
  }

  // glowing firefly
  function drawFirefly(c, look, s) {
    var r = 3.8 * s, glow = look.c2 || "#fdf3a0";
    var g = c.createRadialGradient(0, r * 0.7, 0, 0, r * 0.7, r * 2.4);
    g.addColorStop(0, glow); g.addColorStop(0.4, shade(glow, -0.05)); g.addColorStop(1, "rgba(255,255,255,0)");
    c.save(); c.globalAlpha = 0.85; c.fillStyle = g; c.beginPath(); c.arc(0, r * 0.7, r * 2.4, 0, Math.PI * 2); c.fill(); c.restore();
    [-1, 1].forEach(function (d) { c.save(); c.globalAlpha = 0.5; ell(c, d * r * 0.9, -r * 0.4, r * 0.9, r * 0.6, "rgba(255,255,255,0.9)"); c.restore(); ellS(c, d * r * 0.9, -r * 0.4, r * 0.9, r * 0.6, c.lineWidth * 0.7); });
    ell(c, 0, r * 0.65, r * 0.95, r * 0.85, glow); ellS(c, 0, r * 0.65, r * 0.95, r * 0.85, c.lineWidth);
    circle(c, 0, -r * 0.45, r * 0.7, look.c1); ring(c, 0, -r * 0.45, r * 0.7, c.lineWidth);
    eye(c, -r * 0.26, -r * 0.5, r * 0.2, look.c3); eye(c, r * 0.26, -r * 0.5, r * 0.2, look.c3);
  }

  // round spider with eight legs
  function drawSpider(c, look, s) {
    var r = 4 * s;
    [-1, 1].forEach(function (d) {
      for (var i = 0; i < 4; i++) {
        var ay = -r * 0.5 + i * r * 0.42, kx = d * r * 1.4, ky = ay - r * 0.3 + i * r * 0.18;
        line(c, d * r * 0.6, ay, kx, ky, s * 0.7); line(c, kx, ky, d * r * 1.9, ay + r * 0.5, s * 0.7);
      }
    });
    ell(c, 0, r * 0.35, r, r * 0.95, look.c1); ellS(c, 0, r * 0.35, r, r * 0.95, c.lineWidth);
    circle(c, -r * 0.3, r * 0.2, r * 0.16, shade(look.c1, look.c2 ? 0.0 : -0.2));
    if (look.mark) { ell(c, 0, r * 0.4, r * 0.3, r * 0.55, look.c2); }
    circle(c, 0, -r * 0.65, r * 0.62, shade(look.c1, 0.08)); ring(c, 0, -r * 0.65, r * 0.62, c.lineWidth);
    eye(c, -r * 0.28, -r * 0.7, r * 0.2, look.c3); eye(c, r * 0.28, -r * 0.7, r * 0.2, look.c3);
    circle(c, -r * 0.12, -r * 0.95, r * 0.08, OUTLINE); circle(c, r * 0.12, -r * 0.95, r * 0.08, OUTLINE);
  }

  // ---- jar around a procedural creature ------------------------------------
  function jarCanvas(sid, px) {
    px = px || 80;
    var key = "j:" + sid + "@" + px;
    if (cache[key]) return cache[key];
    var cv = document.createElement("canvas"); cv.width = px; cv.height = Math.round(px * 1.18);
    var c = cv.getContext("2d");
    drawJarInto(c, px, cv.height, sid);
    cache[key] = cv; return cv;
  }
  function drawJarInto(c, w, h, sid) {
    c.lineJoin = "round"; c.lineWidth = Math.max(1.5, w * 0.035);
    var bx = w * 0.14, bw = w * 0.72, by = h * 0.2, bh = h * 0.74, r = w * 0.16;
    c.fillStyle = "rgba(205,233,238,0.5)"; rr(c, bx, by, bw, bh, r); c.fill();
    c.save(); rr(c, bx, by, bw, bh, r); c.clip();
    c.fillStyle = "#e7d6a8"; c.fillRect(bx, by + bh - h * 0.13, bw, h * 0.13); // sand
    var sp = PB.speciesById[sid];
    if (sp && sp.look) drawBug(c, sp.look, w / 2, by + bh * 0.55, w * 0.5, 0);
    c.restore();
    c.strokeStyle = OUTLINE; rr(c, bx, by, bw, bh, r); c.stroke();
    c.fillStyle = "rgba(255,255,255,0.36)";
    c.beginPath(); c.moveTo(bx + w * 0.06, by + h * 0.06); c.lineTo(bx + w * 0.15, by + h * 0.04);
    c.lineTo(bx + w * 0.07, by + bh * 0.8); c.lineTo(bx + w * 0.02, by + bh * 0.7); c.closePath(); c.fill();
    var ly = by - h * 0.06;
    c.fillStyle = "#e8d6b0"; c.beginPath(); c.ellipse(w / 2, ly, bw * 0.46, h * 0.05, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = "#5fb0c9"; rr(c, bx + w * 0.02, by - h * 0.02, bw - w * 0.04, h * 0.06, w * 0.03); c.fill(); c.stroke();
  }
  function rr(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function bugCanvas(sid, px) {
    px = px || 96; var key = "b:" + sid + "@" + px;
    if (cache[key]) return cache[key];
    var cv = document.createElement("canvas"); cv.width = px; cv.height = px;
    var sp = PB.speciesById[sid];
    if (sp && sp.look) drawBug(cv.getContext("2d"), sp.look, px / 2, px / 2, px * 0.7, 0);
    cache[key] = cv; return cv;
  }

  PB.sprites = { drawBug: drawBug, jarCanvas: jarCanvas, bugCanvas: bugCanvas, OUTLINE: OUTLINE };

})(window.PB = window.PB || {});
