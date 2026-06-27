/* ===========================================================================
   world.js — the map: terrain, biomes, decorations, buildings and collision.
   The map is generated deterministically (fixed seed) so the world — and the
   location of your home and museum — is the same every time you play.
   The static ground + scenery is pre-rendered once to an offscreen canvas
   and blitted each frame for smooth performance.
   =========================================================================== */
(function (PB) {
  "use strict";

  var T = PB.config.TILE;
  var MW = PB.config.MAP_W, MH = PB.config.MAP_H;

  // tile kinds (ground)
  var GRASS = 0, PATH = 1, WATER = 2, SAND = 3, FLOWERBED = 4, DIRT = 5;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var rng = mulberry32(13371337);

  // Biome regions in tile coordinates {id, x, y, w, h}
  var zones = [
    { id: "pond",    x: 2,  y: 24, w: 15, h: 16 },
    { id: "forest",  x: 38, y: 16, w: 17, h: 24 },
    { id: "flowers", x: 17, y: 2,  w: 22, h: 13 },
    { id: "tree",    x: 41, y: 2,  w: 14, h: 13 },
    { id: "meadow",  x: 2,  y: 2,  w: 15, h: 21 }, // left meadow
    { id: "meadow",  x: 17, y: 15, w: 21, h: 25 }, // central meadow
  ];

  // buildings {type, x, y, w, h, doorX, doorY}
  var buildings = [
    { type: "house",  x: 18, y: 30, w: 6, h: 4, name: "Your Cabin" },
    { type: "museum", x: 29, y: 29, w: 9, h: 5, name: "Bug Museum" },
    { type: "shop",   x: 25, y: 36, w: 4, h: 3, name: "Tool Stall" },
  ];

  var ground;   // Uint8 grid [y*MW + x]
  var solid;    // Uint8 grid (1 = blocked)
  var deco;     // list of { type, tx, ty, px, py, r }
  var prerender;
  var interactables; // [{ x, y, r, type, label }]

  function set(arr, x, y, v) { if (x >= 0 && x < MW && y >= 0 && y < MH) arr[y * MW + x] = v; }
  function get(arr, x, y) { return (x >= 0 && x < MW && y >= 0 && y < MH) ? arr[y * MW + x] : 0; }

  function inRect(px, py, b) {
    return px >= b.x && px < b.x + b.w && py >= b.y && py < b.y + b.h;
  }

  function generate() {
    ground = new Uint8Array(MW * MH);
    solid = new Uint8Array(MW * MH);
    deco = [];

    // base grass everywhere
    for (var i = 0; i < ground.length; i++) ground[i] = GRASS;

    // pond water (rounded blob inside its zone)
    var pz = zones[0];
    var pcx = pz.x + pz.w / 2, pcy = pz.y + pz.h / 2;
    for (var y = 0; y < MH; y++) {
      for (var x = 0; x < MW; x++) {
        var dx = (x - pcx) / (pz.w * 0.45), dy = (y - pcy) / (pz.h * 0.42);
        var d = dx * dx + dy * dy + (rng() - 0.5) * 0.12;
        if (d < 1) { set(ground, x, y, WATER); set(solid, x, y, 1); }
        else if (d < 1.35) { if (get(ground, x, y) === GRASS) set(ground, x, y, SAND); }
      }
    }

    // flower beds in the flower zone
    var fz = zones[2];
    for (var fy = fz.y; fy < fz.y + fz.h; fy++) {
      for (var fx = fz.x; fx < fz.x + fz.w; fx++) {
        if (rng() < 0.5) set(ground, fx, fy, FLOWERBED);
      }
    }

    // paths: a cosy crossroads linking the plaza to each biome
    layPath(28, 39, 28, 8);   // vertical spine
    layPath(5, 33, 50, 33);   // horizontal road through the plaza row
    layPath(28, 20, 46, 20);  // branch to forest
    layPath(10, 33, 10, 26);  // branch to pond edge
    layPath(28, 10, 47, 8);   // branch to old oak

    // buildings → solid + door interactables
    interactables = [];
    buildings.forEach(function (b) {
      for (var by = b.y; by < b.y + b.h; by++)
        for (var bx = b.x; bx < b.x + b.w; bx++) set(solid, bx, by, 1);
      var doorTX = b.x + Math.floor(b.w / 2);
      var doorTY = b.y + b.h; // tile just below the building
      // a patch of path at the doorway
      set(ground, doorTX, doorTY, PATH);
      set(ground, doorTX, doorTY - 0, PATH);
      interactables.push({
        x: (doorTX + 0.5) * T,
        y: (doorTY + 0.3) * T,
        r: T * 1.4,
        type: b.type,
        label: b.name,
      });
    });

    // scatter decorations per zone
    scatterDeco();

    // map border hedges (solid)
    for (var bx2 = 0; bx2 < MW; bx2++) { addBorderBush(bx2, 0); addBorderBush(bx2, MH - 1); }
    for (var by2 = 0; by2 < MH; by2++) { addBorderBush(0, by2); addBorderBush(MW - 1, by2); }

    buildPrerender();
  }

  function layPath(x1, y1, x2, y2) {
    var steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
    for (var i = 0; i <= steps; i++) {
      var x = Math.round(x1 + (x2 - x1) * (i / steps));
      var y = Math.round(y1 + (y2 - y1) * (i / steps));
      if (get(ground, x, y) !== WATER) { set(ground, x, y, PATH); set(solid, x, y, 0); }
      if (get(ground, x + 1, y) !== WATER && get(ground, x + 1, y) === GRASS && rng() < 0.6)
        set(ground, x + 1, y, PATH);
    }
  }

  function tileFree(x, y) {
    return get(solid, x, y) === 0 && get(ground, x, y) === GRASS;
  }

  function nearBuilding(x, y, pad) {
    for (var i = 0; i < buildings.length; i++) {
      var b = buildings[i];
      if (x >= b.x - pad && x < b.x + b.w + pad && y >= b.y - pad && y < b.y + b.h + pad) return true;
    }
    return false;
  }

  function scatterDeco() {
    // trees in forest + a grand oak in the tree zone
    var forest = zones[1];
    for (var t = 0; t < 90; t++) {
      var x = forest.x + Math.floor(rng() * forest.w);
      var y = forest.y + Math.floor(rng() * forest.h);
      if (tileFree(x, y) && !nearBuilding(x, y, 1)) {
        deco.push({ type: "tree", tx: x, ty: y, px: (x + 0.5) * T, py: (y + 0.5) * T, r: rng() });
        set(solid, x, y, 1);
      }
    }
    // grand oak
    var tz = zones[3];
    var ox = tz.x + Math.floor(tz.w / 2), oy = tz.y + Math.floor(tz.h / 2);
    deco.push({ type: "oak", tx: ox, ty: oy, px: (ox + 0.5) * T, py: (oy + 0.5) * T, r: 0 });
    set(solid, ox, oy, 1); set(solid, ox + 1, oy, 1); set(solid, ox, oy + 1, 1); set(solid, ox + 1, oy + 1, 1);
    // a few small trees around the oak
    for (var st = 0; st < 16; st++) {
      var sx = tz.x + Math.floor(rng() * tz.w), sy = tz.y + Math.floor(rng() * tz.h);
      if (tileFree(sx, sy)) { deco.push({ type: "tree", tx: sx, ty: sy, px: (sx + 0.5) * T, py: (sy + 0.5) * T, r: rng() }); set(solid, sx, sy, 1); }
    }

    // flowers in flower zone + meadow
    scatterSmall(zones[2], "flower", 70);
    scatterSmall(zones[4], "flower", 22);
    scatterSmall(zones[5], "flower", 30);
    scatterSmall(zones[5], "clover", 26);

    // lily pads on the pond water
    var pz = zones[0];
    for (var l = 0; l < 26; l++) {
      var lx = pz.x + Math.floor(rng() * pz.w), ly = pz.y + Math.floor(rng() * pz.h);
      if (get(ground, lx, ly) === WATER && rng() < 0.6)
        deco.push({ type: "lily", tx: lx, ty: ly, px: (lx + 0.5) * T, py: (ly + 0.5) * T, r: rng() });
    }
    // reeds on the sand around the pond
    scatterOn(pz, SAND, "reed", 18);

    // rocks & mushrooms scattered about
    scatterSmall(zones[1], "mushroom", 18);
    scatterSmall(zones[5], "rock", 8);
    scatterSmall(zones[4], "rock", 5);
  }

  function scatterSmall(z, type, n) {
    for (var i = 0; i < n; i++) {
      var x = z.x + Math.floor(rng() * z.w), y = z.y + Math.floor(rng() * z.h);
      var g = get(ground, x, y);
      if ((g === GRASS || g === FLOWERBED) && get(solid, x, y) === 0 && !nearBuilding(x, y, 0)) {
        deco.push({ type: type, tx: x, ty: y, px: (x + rng()) * T, py: (y + rng()) * T, r: rng() });
      }
    }
  }
  function scatterOn(z, gtype, type, n) {
    for (var i = 0; i < n; i++) {
      var x = z.x + Math.floor(rng() * z.w), y = z.y + Math.floor(rng() * z.h);
      if (get(ground, x, y) === gtype)
        deco.push({ type: type, tx: x, ty: y, px: (x + rng()) * T, py: (y + rng()) * T, r: rng() });
    }
  }

  function addBorderBush(x, y) {
    if (get(ground, x, y) === PATH) return; // keep road exits open-ish
    set(solid, x, y, 1);
    deco.push({ type: "bush", tx: x, ty: y, px: (x + 0.5) * T, py: (y + 0.5) * T, r: ((x * 7 + y * 13) % 100) / 100 });
  }

  // ---- pre-render the static scene ----------------------------------------
  function buildPrerender() {
    prerender = document.createElement("canvas");
    prerender.width = MW * T; prerender.height = MH * T;
    var c = prerender.getContext("2d");

    for (var y = 0; y < MH; y++) {
      for (var x = 0; x < MW; x++) {
        drawGroundTile(c, x, y, ground[y * MW + x]);
      }
    }
    // sort deco by y so overlaps look natural, then draw
    deco.sort(function (a, b) { return a.py - b.py; });
    deco.forEach(function (d) { drawDeco(c, d); });

    // buildings on top of ground (drawn last so they sit above nearby deco)
    buildings.forEach(function (b) { drawBuilding(c, b); });
  }

  function drawGroundTile(c, x, y, kind) {
    var px = x * T, py = y * T;
    var n = ((x * 928371 + y * 1299721) % 1000) / 1000;
    var g;
    if (kind === WATER) {
      g = "#5fb0c9";
      c.fillStyle = g; c.fillRect(px, py, T, T);
      c.fillStyle = "rgba(255,255,255,0.18)";
      if (n < 0.3) c.fillRect(px + 3, py + 4, 5, 2);
      c.fillStyle = "rgba(40,90,110,0.25)";
      if (n > 0.7) c.fillRect(px + 8, py + 9, 4, 2);
    } else if (kind === SAND) {
      c.fillStyle = "#e7d6a8"; c.fillRect(px, py, T, T);
      c.fillStyle = "rgba(180,150,90,0.25)";
      if (n < 0.4) c.fillRect(px + 5, py + 6, 2, 2);
    } else if (kind === PATH) {
      c.fillStyle = "#d8b98a"; c.fillRect(px, py, T, T);
      c.fillStyle = "rgba(160,122,74,0.3)";
      if (n < 0.5) c.fillRect(px + (n * 10 | 0), py + 3, 2, 2);
      if (n > 0.6) c.fillRect(px + 9, py + 10, 3, 1);
    } else if (kind === FLOWERBED) {
      c.fillStyle = "#86b35a"; c.fillRect(px, py, T, T);
      c.fillStyle = "#6f9c49";
      c.fillRect(px, py + (n < 0.5 ? 0 : 8), T, 1);
    } else { // GRASS — organic, hand-painted rather than a hard checker
      var greens = ["#98ce6b", "#9fd674", "#92c965"];
      var gi = n < 0.42 ? 0 : (n < 0.82 ? 1 : 2);
      c.fillStyle = greens[gi];
      c.fillRect(px, py, T, T);
      // a soft dappled patch so tiles don't read as a grid
      c.fillStyle = "rgba(86,146,66,0.16)";
      c.fillRect(px + ((n * 70) | 0) % 9, py + ((n * 130) | 0) % 9, 7, 5);
      // little grass blades
      c.fillStyle = "rgba(78,138,60,0.45)";
      if (n < 0.30) { c.fillRect(px + 3, py + 9, 1, 3); c.fillRect(px + 5, py + 10, 1, 2); }
      else if (n > 0.78) { c.fillRect(px + 10, py + 7, 1, 3); c.fillRect(px + 12, py + 8, 1, 2); }
      // occasional warm highlight fleck
      c.fillStyle = "rgba(220,240,160,0.30)";
      if (n > 0.55 && n < 0.6) c.fillRect(px + 6, py + 4, 2, 2);
    }
  }

  function drawDeco(c, d) {
    var x = d.px, y = d.py;
    switch (d.type) {
      case "tree": drawTree(c, x, y, 1 + d.r * 0.25); break;
      case "oak":  drawTree(c, x, y, 2.4, true); break;
      case "bush": drawBush(c, x, y); break;
      case "flower": drawFlower(c, x, y, d.r); break;
      case "clover": drawClover(c, x, y); break;
      case "mushroom": drawMushroom(c, x, y, d.r); break;
      case "rock": drawRock(c, x, y); break;
      case "lily": drawLily(c, x, y, d.r); break;
      case "reed": drawReed(c, x, y); break;
    }
  }

  function shadow(c, x, y, w) {
    c.fillStyle = "rgba(0,0,0,0.14)";
    c.beginPath(); c.ellipse(x, y, w, w * 0.4, 0, 0, Math.PI * 2); c.fill();
  }

  function drawTree(c, x, y, scale, oak) {
    scale = scale || 1;
    shadow(c, x, y + 6 * scale, 8 * scale);
    // trunk
    c.fillStyle = "#a07a4a";
    c.fillRect(x - 2 * scale, y - 2 * scale, 4 * scale, 9 * scale);
    c.strokeStyle = PB.sprites.OUTLINE; c.lineWidth = 1.4;
    c.strokeRect(x - 2 * scale, y - 2 * scale, 4 * scale, 9 * scale);
    // canopy (layered blobs)
    var cs = oak ? ["#4f9b54", "#5fb35f", "#7cc36b"] : ["#5f9e57", "#7cc36b", "#9dd35b"];
    blob(c, x, y - 9 * scale, 9 * scale, cs[0]);
    blob(c, x - 5 * scale, y - 6 * scale, 6 * scale, cs[1]);
    blob(c, x + 5 * scale, y - 6 * scale, 6 * scale, cs[1]);
    blob(c, x, y - 12 * scale, 6 * scale, cs[2]);
  }
  function blob(c, x, y, r, color) {
    c.fillStyle = color;
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    c.strokeStyle = PB.sprites.OUTLINE; c.lineWidth = 1.4; c.stroke();
  }
  function drawBush(c, x, y) {
    shadow(c, x, y + 4, 7);
    blob(c, x, y, 7, "#5f9e57");
    blob(c, x - 4, y + 1, 4, "#6fae63");
    blob(c, x + 4, y + 1, 4, "#6fae63");
  }
  function drawFlower(c, x, y, r) {
    var cols = ["#ef8a8a", "#f6c453", "#e6a3d0", "#b39ddb", "#fff"];
    var col = cols[(r * 5) | 0];
    c.strokeStyle = "#4f9b54"; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 5); c.stroke();
    for (var i = 0; i < 5; i++) {
      var a = (i / 5) * Math.PI * 2 + r;
      c.fillStyle = col;
      c.beginPath(); c.arc(x + Math.cos(a) * 2.6, y - 6 + Math.sin(a) * 2.6, 1.8, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = "#f6e27a"; c.beginPath(); c.arc(x, y - 6, 1.6, 0, Math.PI * 2); c.fill();
  }
  function drawClover(c, x, y) {
    c.fillStyle = "#5fb35f";
    for (var i = 0; i < 3; i++) {
      var a = (i / 3) * Math.PI * 2;
      c.beginPath(); c.arc(x + Math.cos(a) * 2, y + Math.sin(a) * 2, 1.6, 0, Math.PI * 2); c.fill();
    }
  }
  function drawMushroom(c, x, y, r) {
    shadow(c, x, y + 2, 3);
    c.fillStyle = "#f0e6d0"; c.fillRect(x - 1, y - 2, 2, 4);
    c.fillStyle = r < 0.5 ? "#d9534f" : "#e8895a";
    c.beginPath(); c.arc(x, y - 2, 3.2, Math.PI, 0); c.fill();
    c.fillStyle = "#fff";
    c.beginPath(); c.arc(x - 1, y - 3, 0.7, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(x + 1.2, y - 2.2, 0.6, 0, Math.PI * 2); c.fill();
  }
  function drawRock(c, x, y) {
    shadow(c, x, y + 2, 5);
    c.fillStyle = "#b9b1a4";
    c.beginPath(); c.ellipse(x, y, 5, 3.4, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = PB.sprites.OUTLINE; c.lineWidth = 1.2; c.stroke();
    c.fillStyle = "rgba(255,255,255,0.3)"; c.beginPath(); c.ellipse(x - 1.5, y - 1, 2, 1, 0, 0, Math.PI * 2); c.fill();
  }
  function drawLily(c, x, y, r) {
    c.fillStyle = "#5fae6a";
    c.beginPath(); c.arc(x, y, 4, 0.4, Math.PI * 2); c.fill();
    if (r < 0.35) { c.fillStyle = "#f6a8d8"; c.beginPath(); c.arc(x, y - 1, 1.6, 0, Math.PI * 2); c.fill(); }
  }
  function drawReed(c, x, y) {
    c.strokeStyle = "#6f9c49"; c.lineWidth = 1.4;
    for (var i = -1; i <= 1; i++) {
      c.beginPath(); c.moveTo(x + i * 2, y + 2); c.lineTo(x + i * 2 + i, y - 7); c.stroke();
    }
    c.fillStyle = "#8a6a3a"; c.beginPath(); c.arc(x, y - 7, 1.4, 0, Math.PI * 2); c.fill();
  }

  function drawBuilding(c, b) {
    var x = b.x * T, y = b.y * T, w = b.w * T, h = b.h * T;
    c.save();
    c.strokeStyle = PB.sprites.OUTLINE; c.lineWidth = 2; c.lineJoin = "round";
    // wall
    var wall = b.type === "museum" ? "#f3e3c0" : (b.type === "shop" ? "#e8c79a" : "#e9d3a8");
    c.fillStyle = wall;
    PB.sprites.roundRect(c, x, y + h * 0.28, w, h * 0.72, 4); c.fill(); c.stroke();
    // roof
    c.fillStyle = b.type === "museum" ? "#7a6cc4" : (b.type === "shop" ? "#d9534f" : "#c0584f");
    c.beginPath();
    c.moveTo(x - 4, y + h * 0.34);
    c.lineTo(x + w / 2, y - 4);
    c.lineTo(x + w + 4, y + h * 0.34);
    c.closePath(); c.fill(); c.stroke();
    // door
    var dw = T * 1.1, dx = x + w / 2 - dw / 2, dy = y + h - T * 1.6;
    c.fillStyle = "#7a5a36";
    PB.sprites.roundRect(c, dx, dy, dw, T * 1.6, 3); c.fill(); c.stroke();
    c.fillStyle = "#f6c453"; c.beginPath(); c.arc(dx + dw - 3, dy + T * 0.8, 1.3, 0, Math.PI * 2); c.fill();
    // windows
    c.fillStyle = "#bfe6ff";
    if (b.type !== "shop") {
      [-1, 1].forEach(function (s) {
        var wx = x + w / 2 + s * w * 0.28 - 5, wy = y + h * 0.42;
        PB.sprites.roundRect(c, wx, wy, 10, 10, 2); c.fill(); c.stroke();
      });
    }
    // sign
    c.fillStyle = "#fffaf0";
    var signW = Math.min(w * 0.8, 72), sx = x + w / 2 - signW / 2, sy = y + h * 0.2;
    PB.sprites.roundRect(c, sx, sy, signW, 13, 3); c.fill(); c.stroke();
    c.fillStyle = PB.sprites.OUTLINE; c.font = "bold 9px 'Trebuchet MS', sans-serif";
    c.textAlign = "center"; c.textBaseline = "middle";
    var label = b.type === "museum" ? "🏛 MUSEUM" : (b.type === "shop" ? "🛒 SHOP" : "🏠 HOME");
    c.fillText(label, x + w / 2, sy + 7);
    // shop awning detail
    if (b.type === "shop") {
      c.fillStyle = "#fff";
      for (var i = 0; i < b.w * 2; i++) {
        c.fillStyle = i % 2 ? "#d9534f" : "#fffaf0";
        c.fillRect(x + i * (w / (b.w * 2)), y + h * 0.28, w / (b.w * 2), 5);
      }
    }
    c.restore();
  }

  // ---- public API ----------------------------------------------------------
  PB.world = {
    GRASS: GRASS, WATER: WATER,
    pxW: MW * T, pxH: MH * T,

    init: function () { rng = mulberry32(13371337); generate(); },

    draw: function (ctx, camX, camY, viewW, viewH) {
      ctx.drawImage(prerender, camX, camY, viewW, viewH, 0, 0, viewW, viewH);
    },

    isSolid: function (px, py) {
      var tx = Math.floor(px / T), ty = Math.floor(py / T);
      return get(solid, tx, ty) === 1;
    },

    biomeAt: function (px, py) {
      var tx = Math.floor(px / T), ty = Math.floor(py / T);
      for (var i = 0; i < zones.length; i++) {
        if (inRect(tx, ty, zones[i])) return zones[i].id;
      }
      return "meadow";
    },

    // pick a random walkable tile within a biome (for spawning bugs)
    randomSpotInBiome: function (biome, rand) {
      for (var tries = 0; tries < 40; tries++) {
        var z = pickZone(biome, rand);
        if (!z) return null;
        var x = z.x + Math.floor(rand() * z.w);
        var y = z.y + Math.floor(rand() * z.h);
        var g = get(ground, x, y);
        var walk = get(solid, x, y) === 0 && g !== WATER && !nearBuilding(x, y, 1);
        // pond bugs hover over water/sand edges; allow sand
        if (biome === "pond" && (g === SAND || g === WATER)) walk = !nearBuilding(x, y, 1);
        if (walk) return { x: (x + 0.5) * T, y: (y + 0.5) * T };
      }
      return null;
    },

    interactablesNear: function (px, py) {
      var best = null, bestD = Infinity;
      for (var i = 0; i < interactables.length; i++) {
        var it = interactables[i];
        var dx = px - it.x, dy = py - it.y, d = dx * dx + dy * dy;
        if (d < it.r * it.r && d < bestD) { best = it; bestD = d; }
      }
      return best;
    },

    spawnPoint: function () {
      // in front of the cabin
      return { x: 21 * T, y: 35 * T };
    },

    zones: zones,
  };

  function pickZone(biome, rand) {
    var matches = zones.filter(function (z) { return z.id === biome; });
    if (!matches.length) return null;
    return matches[Math.floor(rand() * matches.length)];
  }

})(window.PB = window.PB || {});
