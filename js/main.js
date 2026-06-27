/* ===========================================================================
   main.js — boot, the title screen, the render/update loop, the camera, and
   player interaction (entering buildings / swinging the net at wild bugs).
   =========================================================================== */
(function (PB) {
  "use strict";

  var canvas, ctx;
  var VIEW_W = PB.config.VIEW_W, VIEW_H = PB.config.VIEW_H;
  var mode = "title";        // "title" | "play"
  var helpVisible = false;
  var last = 0, autosaveT = 0;
  var camX = 0, camY = 0;
  var titleBugsAdded = false;

  function $(id) { return document.getElementById(id); }

  function boot() {
    canvas = $("screen");
    ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    PB.art.preload();
    PB.ui.init();
    PB.input.init();
    if (PB.touch) PB.touch.init();
    if (PB.fx) PB.fx.init();
    PB.world.init();

    wireTitle();
    resize();
    window.addEventListener("resize", resize);

    showTitle();
    requestAnimationFrame(loop);
  }

  function wireTitle() {
    $("btn-play").addEventListener("click", function () { PB.audio.resume(); newGameStart(); });
    $("btn-continue").addEventListener("click", function () { PB.audio.resume(); continueGame(); });
    $("btn-howto").addEventListener("click", function () { PB.audio.resume(); showHelp(); });
    $("btn-help-close").addEventListener("click", function () { closeHelp(); });
  }

  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    var scale = Math.min(w / VIEW_W, h / VIEW_H); // also scales down on small screens
    canvas.style.width = Math.floor(VIEW_W * scale) + "px";
    canvas.style.height = Math.floor(VIEW_H * scale) + "px";
  }

  // ---- title / menus -------------------------------------------------------
  function showTitle() {
    mode = "title";
    $("title").classList.remove("hidden");
    PB.ui.showHUD(false);
    PB.ui.closeMenu();
    var has = PB.save.exists();
    $("btn-play").textContent = has ? "New Game" : "Play";
    var cont = $("btn-continue");
    cont.style.display = has ? "" : "none";
    cont.disabled = !has;
    addTitleBugs();
  }

  function addTitleBugs() {
    if (titleBugsAdded) return;
    titleBugsAdded = true;
    var host = $("title"); // full screen, so jars can sit clear of the centre
    // float the hand-drawn jars in the corners around the menu
    var jars = ["caterpie", "weedle", "paras", "shuckle", "wimpod"];
    var spots = [
      { left: "5%", top: "22%" },
      { right: "6%", top: "14%" },
      { left: "9%", bottom: "12%" },
      { right: "8%", bottom: "14%" },
      { left: "3%", top: "55%" },
    ];
    jars.forEach(function (sid, i) {
      var img = document.createElement("img");
      img.src = PB.art.jarURL(sid);
      img.className = "float-bug";
      img.style.width = "92px";
      var s = spots[i];
      if (s.left) img.style.left = s.left;
      if (s.right) img.style.right = s.right;
      if (s.top) img.style.top = s.top;
      if (s.bottom) img.style.bottom = s.bottom;
      img.style.animationDelay = (i * 0.6) + "s";
      host.appendChild(img);
    });
  }

  function newGameStart() {
    if (PB.save.exists() && !window.confirm("Start a new game? Your saved game will be overwritten.")) return;
    PB.save.clear();
    PB.newGame();
    PB.spawns.reset();
    enterPlay(true);
  }
  function continueGame() {
    var data = PB.save.read();
    if (!data) { newGameStart(); return; }
    PB.loadInto(data);
    PB.spawns.reset();
    enterPlay(false);
  }
  function enterPlay(isNew) {
    mode = "play";
    helpVisible = false;
    $("title").classList.add("hidden");
    $("help").classList.add("hidden");
    PB.ui.showHUD(true);
    PB.ui.updateHUD();
    last = 0; autosaveT = 0;
    if (isNew) {
      PB.ui.toast("Welcome, collector! Walk up to a wild bug and press <b>Space</b> to swing your net. 🪤", "good");
    } else {
      PB.ui.toast("Welcome back! 🐛", "good");
    }
  }

  function showHelp() { helpVisible = true; $("help").classList.remove("hidden"); }
  function closeHelp() { helpVisible = false; $("help").classList.add("hidden"); }

  // ---- main loop -----------------------------------------------------------
  function loop(ts) {
    var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0;
    last = ts;
    if (mode === "play") { updatePlay(dt); renderPlay(); }
    requestAnimationFrame(loop);
  }

  function updatePlay(dt) {
    if (dt <= 0) return;
    var newDay = PB.time.tick(dt);
    PB.terrarium.update(dt);
    if (PB.fx) PB.fx.update(dt);

    if (PB.catching.isActive()) {
      PB.catching.update(dt);
      PB.ui.setPrompt(null);
    } else if (PB.ui.isBlocking() || helpVisible) {
      PB.ui.setPrompt(null);
    } else {
      PB.player.update(dt, PB.input.axis());
      PB.spawns.update(dt);
      updatePrompt();
    }

    if (newDay) onNewDay();

    autosaveT += dt;
    if (autosaveT >= PB.config.AUTOSAVE_SEC) { autosaveT = 0; PB.save.write(PB.state); }

    PB.ui.updateHUD();
  }

  function onNewDay() {
    PB.ui.toast("🌅 Day " + PB.state.day + " — a fresh morning! Your friends can visit the museum again.", "good");
    PB.save.write(PB.state);
  }

  function focusTargets() {
    var p = PB.state.player;
    var bug = PB.spawns.nearestNear(p.x, p.y, 18);
    var bld = PB.world.interactablesNear(p.x, p.y);
    var bugDist = bug ? Math.hypot(bug.x - p.x, bug.y - p.y) : Infinity;
    // a bug wins focus only if it's genuinely on top of you; otherwise a nearby
    // building (door) takes priority so a bug can't block you from entering.
    return { bug: bug, bld: bld, bugClose: bug && (bugDist < (bld ? 9 : 14) || !bld) };
  }

  function updatePrompt() {
    var f = focusTargets();
    if (f.bug && f.bugClose) {
      PB.ui.setPrompt("Press <b>Space</b> to swing your net! 🪤");
    } else if (f.bld) {
      var verb = f.bld.type === "museum" ? "visit the Museum 🏛"
        : (f.bld.type === "shop" ? "shop for tools 🛒" : "go home &amp; raise bugs 🌿");
      PB.ui.setPrompt("Press <b>Space</b> to " + verb);
    } else {
      PB.ui.setPrompt(null);
    }
  }

  function interact() {
    if (mode !== "play" || PB.ui.isBlocking() || PB.catching.isActive()) return;
    var f = focusTargets();
    if (f.bug && f.bugClose) {
      if (PB.collection.jarFull()) {
        PB.player.swing();
        PB.ui.toast("Your jars are full! Raise (R) or donate (M) some bugs first.", "");
        return;
      }
      PB.player.swing();
      PB.catching.begin(f.bug);
      return;
    }
    if (f.bld) {
      PB.player.swing();
      openBuilding(f.bld.type);
      return;
    }
    PB.player.swing();
    PB.audio.swing();
  }

  function openBuilding(type) {
    if (type === "museum") PB.ui.openMenu("museum");
    else if (type === "shop") PB.ui.openMenu("shop");
    else PB.ui.openMenu("terrarium");
  }

  // ---- render --------------------------------------------------------------
  function renderPlay() {
    var p = PB.state.player;
    camX = clamp(Math.round(p.x - VIEW_W / 2), 0, PB.world.pxW - VIEW_W);
    camY = clamp(Math.round(p.y - VIEW_H / 2), 0, PB.world.pxH - VIEW_H);

    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    PB.world.draw(ctx, camX, camY, VIEW_W, VIEW_H);
    PB.spawns.draw(ctx, camX, camY);
    PB.player.draw(ctx, camX, camY);

    // day / night tint
    var period = PB.time.period();
    var ov = PB.time.overlay();
    if (ov.dark > 0.001) {
      ctx.fillStyle = "rgba(" + ov.tint + "," + (ov.dark * 0.55).toFixed(3) + ")";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }

    // cozy atmosphere on top: pollen/fireflies, vignette, faint paper grain
    if (PB.fx) {
      PB.fx.drawParticles(ctx, period);
      PB.fx.drawVignette(ctx);
      PB.fx.drawGrain(ctx);
    }
  }

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  // ---- public --------------------------------------------------------------
  PB.main = {
    atTitle: function () { return mode === "title"; },
    helpOpen: function () { return helpVisible; },
    openHelp: showHelp,
    closeHelp: closeHelp,
    playFromTitle: function () { if (PB.save.exists()) continueGame(); else newGameStart(); },
    interact: interact,
    onScreen: function (x, y, pad) {
      pad = pad || 0;
      var sx = x - camX, sy = y - camY;
      return sx >= -pad && sx <= VIEW_W + pad && sy >= -pad && sy <= VIEW_H + pad;
    },
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

})(window.PB = window.PB || {});
