/* ===========================================================================
   sprites.js — procedural pixel-art drawing.
   Bugs are drawn from their `look` descriptor, so the whole game ships with
   zero image assets. Also draws the player and provides cached tile art.
   =========================================================================== */
(function (PB) {
  "use strict";

  var OUTLINE = "#3a2f25";

  // ---- small drawing helpers ----------------------------------------------
  function fillCircle(ctx, x, y, r, color) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill();
  }
  function fillEllipse(ctx, x, y, rx, ry, color, rot) {
    ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot);
    ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill();
    ctx.restore();
  }
  function strokeEllipse(ctx, x, y, rx, ry, w, rot) {
    ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot);
    ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.lineWidth = w; ctx.strokeStyle = OUTLINE; ctx.lineJoin = "round"; ctx.stroke();
    ctx.restore();
  }
  function line(ctx, x1, y1, x2, y2, w, color) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.lineWidth = w; ctx.strokeStyle = color || OUTLINE; ctx.lineCap = "round"; ctx.stroke();
  }

  function shade(hex, amt) {
    // amt in [-1,1]; lightens/darkens a #rrggbb colour.
    var h = hex.replace("#", "");
    if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    var r = parseInt(h.substr(0, 2), 16), g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16);
    var f = amt < 0 ? 0 : 255, p = Math.abs(amt);
    r = Math.round(r + (f - r) * p); g = Math.round(g + (f - g) * p); b = Math.round(b + (f - b) * p);
    return "rgb(" + r + "," + g + "," + b + ")";
  }

  /* ----------------------------------------------------------------------
     drawBug(ctx, look, cx, cy, size, t)
     Draws a bug centred at (cx,cy) fitting roughly within `size` pixels.
     `t` is a free-running time value used for wing-flap / wiggle animation.
     ---------------------------------------------------------------------- */
  function drawBug(ctx, look, cx, cy, size, t) {
    t = t || 0;
    var s = size / 16;            // one design unit in pixels
    var ow = Math.max(1, s * 1.1); // outline width
    var flap = Math.sin(t * 0.18); // -1..1
    ctx.save();
    ctx.translate(cx, cy);
    ctx.lineJoin = "round";
    ctx.lineWidth = ow;
    ctx.strokeStyle = OUTLINE;

    if (look.glow) {
      var grad = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.75);
      grad.addColorStop(0, hexA(look.c2 || look.c1, 0.55));
      grad.addColorStop(1, hexA(look.c2 || look.c1, 0));
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(0, 0, size * 0.75, 0, Math.PI * 2); ctx.fill();
    }

    // Back wings first (so the body sits on top)
    drawWings(ctx, look, s, flap, true);

    switch (look.body) {
      case "grub":   drawGrub(ctx, look, s, t); break;
      case "round":  drawRound(ctx, look, s); break;
      case "beetle": drawBeetle(ctx, look, s); break;
      case "mantis": drawMantis(ctx, look, s, flap); break;
      case "moth":   drawMothBody(ctx, look, s); break;
      case "dragon": drawDragon(ctx, look, s); break;
      case "spider": drawSpider(ctx, look, s, t); break;
      default:       drawRound(ctx, look, s);
    }

    // Front wings (bee/fly) shimmer over the body
    drawWings(ctx, look, s, flap, false);

    ctx.restore();
  }

  function hexA(hex, a) {
    var h = hex.replace("#", "");
    if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    var r = parseInt(h.substr(0, 2), 16), g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16);
    return "rgba(" + r + "," + g + "," + b + "," + a + ")";
  }

  function eye(ctx, x, y, r, c3) {
    fillCircle(ctx, x, y, r, "#fff");
    fillCircle(ctx, x + r * 0.2, y, r * 0.55, c3 || "#222");
  }

  function pattern(ctx, look, x, y, r) {
    if (look.pattern === "spots") {
      ctx.fillStyle = look.c2;
      fillCircle(ctx, x - r * 0.3, y - r * 0.2, r * 0.22, look.c2);
      fillCircle(ctx, x + r * 0.35, y + r * 0.1, r * 0.18, look.c2);
    } else if (look.pattern === "stripes") {
      ctx.strokeStyle = look.c2; ctx.lineWidth = r * 0.25;
      ctx.beginPath(); ctx.moveTo(x - r * 0.6, y - r * 0.1); ctx.lineTo(x + r * 0.6, y - r * 0.1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - r * 0.5, y + r * 0.35); ctx.lineTo(x + r * 0.5, y + r * 0.35); ctx.stroke();
      ctx.lineWidth = Math.max(1, r * 0.12); ctx.strokeStyle = OUTLINE;
    }
  }

  // ---- body styles ---------------------------------------------------------
  function drawGrub(ctx, look, s, t) {
    var seg = 4, r = 3.2 * s, step = 2.7 * s, x0 = -step * 1.2;
    for (var i = seg - 1; i >= 0; i--) {
      var x = x0 + i * step;
      var y = Math.sin(t * 0.15 + i * 0.8) * 0.6 * s;
      fillCircle(ctx, x, y, r - i * 0.15 * s, i === seg - 1 ? shade(look.c1, 0.12) : look.c1);
      ctx.beginPath(); ctx.arc(x, y, r - i * 0.15 * s, 0, Math.PI * 2); ctx.stroke();
      if (look.pattern === "segments" && i < seg - 1) {
        fillCircle(ctx, x, y + r * 0.5, r * 0.35, look.c2);
      }
    }
    // head
    var hx = x0 + (seg - 1) * step, hy = Math.sin(t * 0.15 + (seg - 1) * 0.8) * 0.6 * s;
    eye(ctx, hx + r * 0.4, hy - r * 0.2, r * 0.45, look.c3);
    if (look.horn) {
      line(ctx, hx + r * 0.2, hy - r, hx + r * 0.6, hy - r * 2.1, s * 1.1, look.c2);
      fillCircle(ctx, hx + r * 0.6, hy - r * 2.1, s * 0.8, look.c2);
    }
  }

  function drawRound(ctx, look, s) {
    var r = 5.2 * s;
    fillEllipse(ctx, 0, 0, r, r * 0.95, look.c1);
    strokeEllipse(ctx, 0, 0, r, r * 0.95, ctx.lineWidth);
    fillEllipse(ctx, 0, -r * 0.25, r * 0.7, r * 0.45, shade(look.c1, 0.18));
    pattern(ctx, look, 0, 0, r);
    eye(ctx, -r * 0.35, 0, r * 0.22, look.c3);
    eye(ctx, r * 0.35, 0, r * 0.22, look.c3);
  }

  function drawBeetle(ctx, look, s) {
    var r = 5 * s;
    // body
    fillEllipse(ctx, 0, 0, r, r * 1.05, look.c1);
    strokeEllipse(ctx, 0, 0, r, r * 1.05, ctx.lineWidth);
    // wing-case split
    line(ctx, 0, -r * 0.8, 0, r, ctx.lineWidth, OUTLINE);
    pattern(ctx, look, -r * 0.4, r * 0.1, r * 0.8);
    pattern(ctx, look, r * 0.4, r * 0.1, r * 0.8);
    // head
    fillCircle(ctx, 0, -r * 1.0, r * 0.5, shade(look.c1, -0.2));
    ctx.beginPath(); ctx.arc(0, -r * 1.0, r * 0.5, 0, Math.PI * 2); ctx.stroke();
    eye(ctx, -r * 0.2, -r * 1.05, r * 0.16, look.c3);
    eye(ctx, r * 0.2, -r * 1.05, r * 0.16, look.c3);
    if (look.horn) {
      line(ctx, -r * 0.18, -r * 1.4, -r * 0.4, -r * 2.0, s * 1.0, shade(look.c1, -0.2));
      line(ctx, r * 0.18, -r * 1.4, r * 0.4, -r * 2.0, s * 1.0, shade(look.c1, -0.2));
    }
    // little legs
    for (var i = -1; i <= 1; i++) {
      line(ctx, -r * 0.8, r * 0.2 * i, -r * 1.3, r * 0.2 * i - r * 0.2, s * 0.7, OUTLINE);
      line(ctx, r * 0.8, r * 0.2 * i, r * 1.3, r * 0.2 * i - r * 0.2, s * 0.7, OUTLINE);
    }
  }

  function drawMantis(ctx, look, s, flap) {
    var r = 3.6 * s;
    // long body, tilted
    fillEllipse(ctx, 0, r * 0.4, r * 0.9, r * 2.2, look.c1, 0.15);
    strokeEllipse(ctx, 0, r * 0.4, r * 0.9, r * 2.2, ctx.lineWidth, 0.15);
    // head
    fillEllipse(ctx, r * 0.2, -r * 1.6, r * 0.8, r * 0.7, shade(look.c1, 0.1));
    strokeEllipse(ctx, r * 0.2, -r * 1.6, r * 0.8, r * 0.7, ctx.lineWidth);
    eye(ctx, r * 0.6, -r * 1.7, r * 0.3, look.c3);
    eye(ctx, -r * 0.25, -r * 1.7, r * 0.3, look.c3);
    // raised scythe arms
    var a = flap * 0.2;
    line(ctx, -r * 0.6, -r * 0.8, -r * 1.8, -r * 1.8 + a * r, s * 1.2, look.c1);
    line(ctx, -r * 1.8, -r * 1.8 + a * r, -r * 1.2, -r * 2.6 + a * r, s * 1.2, look.c2);
    line(ctx, r * 0.6, -r * 0.8, r * 1.8, -r * 1.8 - a * r, s * 1.2, look.c1);
    line(ctx, r * 1.8, -r * 1.8 - a * r, r * 1.2, -r * 2.6 - a * r, s * 1.2, look.c2);
    if (look.horn) { /* the scythes are the horn feature */ }
  }

  function drawMothBody(ctx, look, s) {
    var r = 2.6 * s;
    fillEllipse(ctx, 0, 0, r, r * 1.8, shade(look.c1, -0.1));
    strokeEllipse(ctx, 0, 0, r, r * 1.8, ctx.lineWidth);
    fillCircle(ctx, 0, -r * 1.7, r * 0.9, shade(look.c1, -0.05));
    ctx.beginPath(); ctx.arc(0, -r * 1.7, r * 0.9, 0, Math.PI * 2); ctx.stroke();
    eye(ctx, -r * 0.4, -r * 1.8, r * 0.3, look.c3);
    eye(ctx, r * 0.4, -r * 1.8, r * 0.3, look.c3);
    // feathery antennae
    line(ctx, -r * 0.3, -r * 2.3, -r * 1.2, -r * 3.4, s * 0.9, OUTLINE);
    line(ctx, r * 0.3, -r * 2.3, r * 1.2, -r * 3.4, s * 0.9, OUTLINE);
  }

  function drawDragon(ctx, look, s) {
    var r = 2.4 * s;
    // long segmented tail/body horizontal
    for (var i = 0; i < 4; i++) {
      fillEllipse(ctx, -i * r * 1.3, 0, r * (1 - i * 0.12), r * 0.8, i % 2 ? shade(look.c1, -0.1) : look.c1);
      strokeEllipse(ctx, -i * r * 1.3, 0, r * (1 - i * 0.12), r * 0.8, ctx.lineWidth);
    }
    // head
    fillCircle(ctx, r * 1.2, 0, r * 1.1, shade(look.c1, 0.05));
    ctx.beginPath(); ctx.arc(r * 1.2, 0, r * 1.1, 0, Math.PI * 2); ctx.stroke();
    eye(ctx, r * 1.5, -r * 0.4, r * 0.42, look.c3);
    eye(ctx, r * 1.5, r * 0.4, r * 0.42, look.c3);
    if (look.horn) {
      line(ctx, r * 2.0, 0, r * 3.0, -r * 0.3, s * 1.1, look.c2);
      line(ctx, r * 2.0, r * 0.3, r * 3.0, r * 0.6, s * 1.1, look.c2);
    }
  }

  function drawSpider(ctx, look, s, t) {
    var r = 4.4 * s;
    // legs wiggling
    var wig = Math.sin(t * 0.2) * 0.3;
    for (var i = 0; i < 3; i++) {
      var ly = -r * 0.4 + i * r * 0.4;
      line(ctx, -r * 0.6, ly, -r * 1.9, ly - r * 0.5 + wig * r, s * 0.8, OUTLINE);
      line(ctx, r * 0.6, ly, r * 1.9, ly - r * 0.5 - wig * r, s * 0.8, OUTLINE);
    }
    fillEllipse(ctx, 0, r * 0.2, r, r * 0.9, look.c1);
    strokeEllipse(ctx, 0, r * 0.2, r, r * 0.9, ctx.lineWidth);
    pattern(ctx, look, 0, r * 0.2, r * 0.8);
    // head/cephalothorax
    fillCircle(ctx, 0, -r * 0.8, r * 0.6, shade(look.c1, -0.12));
    ctx.beginPath(); ctx.arc(0, -r * 0.8, r * 0.6, 0, Math.PI * 2); ctx.stroke();
    eye(ctx, -r * 0.25, -r * 0.9, r * 0.18, look.c3);
    eye(ctx, r * 0.25, -r * 0.9, r * 0.18, look.c3);
    if (look.horn) {
      line(ctx, -r * 0.3, -r * 1.3, -r * 0.5, -r * 1.9, s * 0.9, look.c2);
      line(ctx, r * 0.3, -r * 1.3, r * 0.5, -r * 1.9, s * 0.9, look.c2);
    }
  }

  // ---- wings (drawn behind and in front) -----------------------------------
  function drawWings(ctx, look, s, flap, back) {
    var w = look.wings;
    if (!w || w === "none") return;
    var spread = 1 + flap * 0.12;

    if (w === "butterfly" && back) {
      var wc = look.c1, ac = look.c2;
      [-1, 1].forEach(function (side) {
        ctx.save();
        ctx.translate(side * 4.5 * s, -1 * s);
        ctx.scale(side * spread, 1);
        fillEllipse(ctx, 0, -2 * s, 4.4 * s, 3 * s, wc);
        strokeEllipse(ctx, 0, -2 * s, 4.4 * s, 3 * s, ctx.lineWidth);
        fillEllipse(ctx, 0.5 * s, 2.6 * s, 3.4 * s, 2.6 * s, shade(wc, -0.08));
        strokeEllipse(ctx, 0.5 * s, 2.6 * s, 3.4 * s, 2.6 * s, ctx.lineWidth);
        if (look.pattern === "spots") {
          fillCircle(ctx, 0, -2 * s, 1.1 * s, ac);
          fillCircle(ctx, 0.5 * s, 2.4 * s, 0.8 * s, ac);
        } else if (look.pattern === "stripes") {
          fillEllipse(ctx, 0, -2 * s, 4.4 * s, 0.7 * s, ac);
        }
        ctx.restore();
      });
    } else if ((w === "bee" || w === "fly") && !back) {
      var len = w === "fly" ? 6 * s : 4.2 * s;
      [-1, 1].forEach(function (side) {
        ctx.save();
        ctx.translate(side * 1.5 * s, -2.5 * s);
        ctx.rotate(side * (0.5 + flap * 0.25));
        ctx.globalAlpha = 0.5;
        fillEllipse(ctx, side * len * 0.4, 0, len, 1.8 * s, "#eef6ff");
        ctx.globalAlpha = 1;
        ctx.lineWidth = Math.max(1, s * 0.7);
        strokeEllipse(ctx, side * len * 0.4, 0, len, 1.8 * s, ctx.lineWidth);
        ctx.restore();
      });
    }
  }

  // ---- render a bug to its own canvas (for UI cards / overlays) ------------
  var bugCache = {};
  function bugCanvas(sid, px) {
    px = px || 64;
    var key = sid + "@" + px;
    if (bugCache[key]) return bugCache[key];
    var sp = PB.speciesById[sid];
    var cv = document.createElement("canvas");
    cv.width = px; cv.height = px;
    var c = cv.getContext("2d");
    if (sp) drawBug(c, sp.look, px / 2, px / 2 + px * 0.05, px * 0.72, 0);
    bugCache[key] = cv;
    return cv;
  }
  // A "?" silhouette for undiscovered species.
  function mysteryCanvas(px) {
    px = px || 64;
    var key = "mystery@" + px;
    if (bugCache[key]) return bugCache[key];
    var cv = document.createElement("canvas");
    cv.width = px; cv.height = px;
    var c = cv.getContext("2d");
    c.fillStyle = "#d8cbb0";
    c.beginPath(); c.arc(px / 2, px / 2, px * 0.34, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#7a6c5d"; c.font = "bold " + (px * 0.4) + "px sans-serif";
    c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText("?", px / 2, px / 2 + px * 0.02);
    bugCache[key] = cv;
    return cv;
  }

  /* ----------------------------------------------------------------------
     drawPlayer — a cute net-wielding collector, top-down-ish.
     ---------------------------------------------------------------------- */
  function drawPlayer(ctx, cx, cy, dir, walk, swinging) {
    var bob = Math.sin(walk * 0.4) * 1.2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.lineJoin = "round";
    ctx.lineWidth = 2;
    ctx.strokeStyle = OUTLINE;

    // shadow
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath(); ctx.ellipse(0, 9, 6, 2.6, 0, 0, Math.PI * 2); ctx.fill();

    var flip = dir === "left" ? -1 : 1;
    ctx.scale(flip, 1);

    // legs
    var legSwing = Math.sin(walk * 0.4) * 2;
    line(ctx, -2.2, 4 + bob, -2.2 - legSwing, 9 + bob, 2.4, "#5a78b0");
    line(ctx, 2.2, 4 + bob, 2.2 + legSwing, 9 + bob, 2.4, "#5a78b0");

    // body / overalls
    ctx.fillStyle = "#6c8fd6";
    roundRect(ctx, -4.5, -3 + bob, 9, 8, 2); ctx.fill(); ctx.stroke();

    // head
    ctx.fillStyle = "#f3c9a0";
    fillCircle(ctx, 0, -7 + bob, 4.4, "#f3c9a0");
    ctx.beginPath(); ctx.arc(0, -7 + bob, 4.4, 0, Math.PI * 2); ctx.stroke();
    // hat (explorer cap)
    ctx.fillStyle = "#d9534f";
    ctx.beginPath();
    ctx.arc(0, -8.5 + bob, 4.6, Math.PI, 0); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#d9534f";
    roundRect(ctx, -6, -8.6 + bob, 12, 2.2, 1); ctx.fill(); ctx.stroke();

    // eyes (only when facing down/side)
    if (dir !== "up") {
      fillCircle(ctx, -1.6, -6.6 + bob, 0.9, "#222");
      fillCircle(ctx, 1.8, -6.6 + bob, 0.9, "#222");
    }

    // net
    var na = swinging != null ? swinging : (dir === "up" ? -2.4 : -0.5);
    ctx.save();
    ctx.translate(5, -2 + bob);
    ctx.rotate(na);
    line(ctx, 0, 0, 9, 0, 1.6, "#a07a4a");
    ctx.globalAlpha = 0.55;
    fillCircle(ctx, 11, 0, 4, "#eef6ff");
    ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(11, 0, 4, 0, Math.PI * 2); ctx.lineWidth = 1.4; ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  PB.sprites = {
    drawBug: drawBug,
    bugCanvas: bugCanvas,
    mysteryCanvas: mysteryCanvas,
    drawPlayer: drawPlayer,
    roundRect: roundRect,
    shade: shade,
    OUTLINE: OUTLINE,
  };

})(window.PB = window.PB || {});
