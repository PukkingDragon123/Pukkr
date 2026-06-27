/* ===========================================================================
   main.js — boot, the title screen, the render/update loop, and interaction.
   This is a scene-based cozy collector (no walking avatar): you visit the
   Garden or the Woods, and click/tap drifting creatures to catch them.
   =========================================================================== */
(function (PB) {
  "use strict";

  var canvas, ctx;
  var VIEW_W = PB.config.VIEW_W, VIEW_H = PB.config.VIEW_H;
  var mode = "title";        // "title" | "play"
  var helpVisible = false;
  var last = 0, autosaveT = 0;
  var titleBugsAdded = false;

  function $(id) { return document.getElementById(id); }

  function boot() {
    canvas = $("screen");
    ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    PB.art.preload();
    PB.ui.init();
    PB.input.init();
    if (PB.fx) PB.fx.init();
    PB.scene.init();

    wireTitle();
    wireNav();
    canvas.addEventListener("click", onCanvasClick);
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

  function wireNav() {
    var btns = $("navbar").querySelectorAll("[data-nav]");
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener("click", function () {
        PB.audio.resume();
        var nav = this.getAttribute("data-nav");
        if (nav === "garden" || nav === "forest") goLocation(nav);
        else PB.ui.openMenu(nav);
      });
    }
  }

  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    var scale = Math.min(w / VIEW_W, h / VIEW_H);
    canvas.style.width = Math.floor(VIEW_W * scale) + "px";
    canvas.style.height = Math.floor(VIEW_H * scale) + "px";
  }

  // ---- title ---------------------------------------------------------------
  function showTitle() {
    mode = "title";
    $("title").classList.remove("hidden");
    PB.ui.showHUD(false);
    $("navbar").classList.add("hidden");
    $("loc-label").classList.add("hidden");
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
    var host = $("title");
    var jars = ["caterpie", "weedle", "paras", "shuckle", "wimpod"];
    var spots = [
      { left: "5%", top: "22%" }, { right: "6%", top: "14%" },
      { left: "9%", bottom: "12%" }, { right: "8%", bottom: "14%" },
      { left: "3%", top: "55%" },
    ];
    jars.forEach(function (sid, i) {
      var img = document.createElement("img");
      img.src = PB.art.jarURL(sid);
      img.className = "float-bug";
      img.style.width = "96px";
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
    PB.scene.setLocation("garden");
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
    $("navbar").classList.remove("hidden");
    $("loc-label").classList.remove("hidden");
    updateNav();
    updateLocLabel();
    PB.ui.updateHUD();
    last = 0; autosaveT = 0;
    if (isNew) PB.ui.toast("Welcome, collector! Click or tap a creature to catch it. 🪤", "good");
    else PB.ui.toast("Welcome back! 🐛", "good");
  }

  function showHelp() { helpVisible = true; $("help").classList.remove("hidden"); }
  function closeHelp() { helpVisible = false; $("help").classList.add("hidden"); }

  function goLocation(id) {
    if (!PB.scene.setLocation(id)) return;
    updateNav();
    updateLocLabel();
    PB.audio.open();
    PB.ui.toast(PB.scene.emoji() + " Off to the " + PB.scene.name() + "!", "good");
  }
  function updateLocLabel() { $("loc-label").textContent = PB.scene.emoji() + " " + PB.scene.name(); }
  function updateNav() {
    var btns = $("navbar").querySelectorAll("[data-nav]");
    for (var i = 0; i < btns.length; i++) {
      var nav = btns[i].getAttribute("data-nav");
      btns[i].classList.toggle("active", nav === PB.scene.current());
    }
  }

  // ---- interaction ---------------------------------------------------------
  function blocked() {
    return mode !== "play" || PB.ui.isBlocking() || PB.catching.isActive() || helpVisible;
  }

  function onCanvasClick(ev) {
    if (blocked()) return;
    var rect = canvas.getBoundingClientRect();
    var x = (ev.clientX - rect.left) / rect.width * VIEW_W;
    var y = (ev.clientY - rect.top) / rect.height * VIEW_H;
    var e = PB.spawns.hitTest(x, y);
    if (e) tryCatch(e);
  }

  // keyboard / action button: catch the creature nearest the centre
  function interact() {
    if (blocked()) return;
    var list = PB.spawns.list().filter(function (e) { return e.state !== "out"; });
    if (!list.length) return;
    var cx = VIEW_W / 2, cy = VIEW_H * 0.6, best = null, bd = Infinity;
    list.forEach(function (e) {
      var d = Math.abs(e.x - cx) + Math.abs(e.y - cy);
      if (d < bd) { bd = d; best = e; }
    });
    if (best) tryCatch(best);
  }

  function tryCatch(e) {
    if (PB.collection.jarFull()) {
      PB.ui.toast("Your satchel is full! Raise (Jars) or donate some first.", "");
      return;
    }
    PB.catching.begin(e);
  }

  // ---- loop ----------------------------------------------------------------
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
      PB.spawns.update(dt);
      // a gentle one-time hint until the first catch
      if (!PB.state.flags.tutorialCatch && PB.spawns.list().length) {
        PB.ui.setPrompt("Click or tap a creature to catch it! 🪤");
      } else {
        PB.ui.setPrompt(null);
      }
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

  // ---- render --------------------------------------------------------------
  function renderPlay() {
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    PB.scene.draw(ctx);
    PB.spawns.draw(ctx);

    var period = PB.time.period();
    var ov = PB.time.overlay();
    if (ov.dark > 0.001) {
      ctx.fillStyle = "rgba(" + ov.tint + "," + (ov.dark * 0.5).toFixed(3) + ")";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    if (PB.fx) {
      PB.fx.drawParticles(ctx, period);
      PB.fx.drawVignette(ctx);
      PB.fx.drawGrain(ctx);
    }
  }

  // ---- public --------------------------------------------------------------
  PB.main = {
    atTitle: function () { return mode === "title"; },
    helpOpen: function () { return helpVisible; },
    openHelp: showHelp,
    closeHelp: closeHelp,
    playFromTitle: function () { if (PB.save.exists()) continueGame(); else newGameStart(); },
    interact: interact,
    goLocation: goLocation,
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

})(window.PB = window.PB || {});
