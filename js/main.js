/* ===========================================================================
   main.js — boot, title screen, the loop, scene rendering, and interaction.
   Three places: Forest (catch), Garden (raise in jars), Museum (display).
   =========================================================================== */
(function (PB) {
  "use strict";

  var canvas, ctx;
  var VIEW_W = PB.config.VIEW_W, VIEW_H = PB.config.VIEW_H;
  var mode = "title";
  var helpVisible = false;
  var last = 0, autosaveT = 0, clock = 0;
  var titleBugsAdded = false;
  var gardenLayout = [], museumLayout = [];

  function $(id) { return document.getElementById(id); }

  function boot() {
    canvas = $("screen");
    ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";

    PB.art.preload();
    PB.ui.init();
    PB.input.init();
    if (PB.fx) PB.fx.init();
    PB.scene.init();

    wireTitle(); wireNav();
    canvas.addEventListener("click", onCanvasClick);
    resize(); window.addEventListener("resize", resize);
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
      btns[i].addEventListener("click", function () { PB.audio.resume(); goLocation(this.getAttribute("data-nav")); });
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
    $("museum-bar").classList.add("hidden");
    var has = PB.save.exists();
    $("btn-play").textContent = has ? "New Game" : "Play";
    var cont = $("btn-continue");
    cont.style.display = has ? "" : "none"; cont.disabled = !has;
    addTitleBugs();
  }
  function addTitleBugs() {
    if (titleBugsAdded) return;
    titleBugsAdded = true;
    var host = $("title");
    var jars = ["caterpie", "weedle", "paras", "shuckle", "wimpod"];
    var spots = [
      { left: "5%", top: "22%" }, { right: "6%", top: "14%" },
      { left: "9%", bottom: "12%" }, { right: "8%", bottom: "14%" }, { left: "3%", top: "55%" },
    ];
    jars.forEach(function (sid, i) {
      var img = document.createElement("img");
      img.src = PB.art.jarURL(sid);
      img.className = "float-bug"; img.style.width = "96px";
      var s = spots[i];
      if (s.left) img.style.left = s.left; if (s.right) img.style.right = s.right;
      if (s.top) img.style.top = s.top; if (s.bottom) img.style.bottom = s.bottom;
      img.style.animationDelay = (i * 0.6) + "s";
      host.appendChild(img);
    });
  }

  function newGameStart() {
    if (PB.save.exists() && !window.confirm("Start a new game? Your saved game will be overwritten.")) return;
    PB.save.clear(); PB.newGame(); PB.scene.setLocation("forest"); PB.spawns.reset();
    enterPlay(true);
  }
  function continueGame() {
    var data = PB.save.read();
    if (!data) { newGameStart(); return; }
    PB.loadInto(data); PB.scene.setLocation("forest"); PB.spawns.reset();
    enterPlay(false);
  }
  function enterPlay(isNew) {
    mode = "play"; helpVisible = false;
    $("title").classList.add("hidden"); $("help").classList.add("hidden");
    PB.ui.showHUD(true);
    $("navbar").classList.remove("hidden");
    $("loc-label").classList.remove("hidden");
    updateNav(); updateLocLabel(); PB.ui.updateHUD();
    last = 0; autosaveT = 0;
    if (isNew) PB.ui.toast("Welcome! Tap a creature in the Forest to catch it. 🪤", "good");
    else PB.ui.toast("Welcome back! 🐛", "good");
  }

  function showHelp() { helpVisible = true; $("help").classList.remove("hidden"); }
  function closeHelp() { helpVisible = false; $("help").classList.add("hidden"); }

  function goLocation(id) {
    if (!PB.scene.setLocation(id)) return;
    PB.ui.closeFeedCard();
    updateNav(); updateLocLabel();
    $("museum-bar").classList.toggle("hidden", id !== "museum");
    if (id === "museum") PB.ui.showMuseumBar(true); else PB.ui.showMuseumBar(false);
    PB.audio.open();
    PB.ui.toast(PB.scene.emoji() + " " + PB.scene.name(), "good");
  }
  function updateLocLabel() { $("loc-label").textContent = PB.scene.emoji() + " " + PB.scene.name(); }
  function updateNav() {
    var btns = $("navbar").querySelectorAll("[data-nav]");
    for (var i = 0; i < btns.length; i++)
      btns[i].classList.toggle("active", btns[i].getAttribute("data-nav") === PB.scene.current());
  }

  // ---- interaction ---------------------------------------------------------
  function blocked() { return mode !== "play" || PB.catching.isActive() || PB.ui.isBlocking() || helpVisible; }

  function toCanvas(ev) {
    var r = canvas.getBoundingClientRect();
    return { x: (ev.clientX - r.left) / r.width * VIEW_W, y: (ev.clientY - r.top) / r.height * VIEW_H };
  }
  function jarHit(layout, p) {
    for (var i = layout.length - 1; i >= 0; i--) {
      var s = layout[i], w = s.h * 0.62;
      if (p.x >= s.x - w / 2 && p.x <= s.x + w / 2 && p.y >= s.y - s.h && p.y <= s.y + 12) return i;
    }
    return -1;
  }

  function onCanvasClick(ev) {
    if (blocked()) return;
    var p = toCanvas(ev), here = PB.scene.current();
    if (here === "forest") {
      var e = PB.spawns.hitTest(p.x, p.y);
      if (e) PB.catching.begin(e);
    } else if (here === "garden") {
      var gi = jarHit(gardenLayout, p);
      if (gi >= 0) PB.ui.openFeedCard(gi);
    } else if (here === "museum") {
      var mi = jarHit(museumLayout, p);
      if (mi >= 0) { var sid = museumLayout[mi].sid; var sp = PB.speciesById[sid];
        PB.ui.toast(sp.name + " · " + PB.state.museum.donated[sid].size + " mm", ""); }
    }
  }

  // keyboard action: in the Forest, net the creature nearest the centre
  function interact() {
    if (blocked() || PB.scene.current() !== "forest") return;
    var list = PB.spawns.list().filter(function (e) { return e.state !== "out"; });
    if (!list.length) return;
    var cx = VIEW_W / 2, cy = VIEW_H * 0.6, best = null, bd = Infinity;
    list.forEach(function (e) { var d = Math.abs(e.x - cx) + Math.abs(e.y - cy); if (d < bd) { bd = d; best = e; } });
    if (best) PB.catching.begin(best);
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
    clock += dt;
    var newDay = PB.time.tick(dt);
    PB.raise.update(dt);
    if (PB.fx) PB.fx.update(dt);

    var here = PB.scene.current();
    if (PB.catching.isActive()) { PB.catching.update(dt); PB.ui.setPrompt(null); }
    else if (PB.ui.isBlocking() || helpVisible) { PB.ui.setPrompt(null); }
    else {
      if (here === "forest") {
        PB.spawns.update(dt);
        PB.ui.setPrompt(!PB.state.flags.tutorialCatch && PB.spawns.list().length ? "Tap a creature to catch it! 🪤" : null);
      } else if (here === "garden") {
        PB.ui.setPrompt(PB.state.bugs.length ? null : "Catch creatures in the Forest, then raise them here in jars. 🫙");
      } else {
        if (here === "museum") PB.ui.updateMuseumBar();
        PB.ui.setPrompt(PB.museumSpeciesCount() ? null : "Display creatures from your Garden's jars. 🏛");
      }
    }

    if (newDay) onNewDay();
    autosaveT += dt;
    if (autosaveT >= PB.config.AUTOSAVE_SEC) { autosaveT = 0; PB.save.write(PB.state); }
    PB.ui.updateHUD();
  }

  function onNewDay() {
    PB.ui.toast("🌅 Day " + PB.state.day + " — your friends can visit the museum again!", "good");
    PB.save.write(PB.state);
  }

  // ---- render --------------------------------------------------------------
  function renderPlay() {
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    PB.scene.draw(ctx);

    var here = PB.scene.current();
    if (here === "forest") PB.spawns.draw(ctx);
    else if (here === "garden") drawGardenJars();
    else if (here === "museum") drawMuseumJars();

    var period = PB.time.period(), ov = PB.time.overlay();
    if (ov.dark > 0.001) {
      ctx.fillStyle = "rgba(" + ov.tint + "," + (ov.dark * 0.5).toFixed(3) + ")";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    if (PB.fx) { PB.fx.drawParticles(ctx, period); PB.fx.drawVignette(ctx); PB.fx.drawGrain(ctx); }
  }

  function drawGardenJars() {
    var bugs = PB.state.bugs;
    gardenLayout = PB.scene.gardenSlots(bugs.length);
    for (var i = 0; i < bugs.length && i < gardenLayout.length; i++) {
      var s = gardenLayout[i], bug = bugs[i];
      var bob = Math.sin(clock * 2 + i) * 2;
      ctx.fillStyle = "rgba(40,40,30,0.16)";
      ctx.beginPath(); ctx.ellipse(s.x, s.y + 2, 34, 9, 0, 0, Math.PI * 2); ctx.fill();
      PB.art.drawJar(ctx, bug.sid, s.x, s.y - bob, s.h);
      // little love bar under the jar
      var bw = 44, bx = s.x - bw / 2, by = s.y + 6;
      ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.fillRect(bx, by, bw, 5);
      ctx.fillStyle = bug.love >= 100 ? "#ef8a8a" : "#7cc36b";
      ctx.fillRect(bx, by, bw * Math.min(100, bug.love) / 100, 5);
    }
  }

  function drawMuseumJars() {
    var sids = Object.keys(PB.state.museum.donated);
    var slots = PB.scene.museumSlots(sids.length);
    museumLayout = [];
    for (var i = 0; i < slots.length && i < sids.length; i++) {
      var s = slots[i];
      ctx.fillStyle = "rgba(40,30,20,0.18)";
      ctx.beginPath(); ctx.ellipse(s.x, s.y + 2, 28, 7, 0, 0, Math.PI * 2); ctx.fill();
      PB.art.drawJar(ctx, sids[i], s.x, s.y, s.h);
      museumLayout.push({ x: s.x, y: s.y, h: s.h, sid: sids[i] });
    }
  }

  PB.main = {
    atTitle: function () { return mode === "title"; },
    helpOpen: function () { return helpVisible; },
    openHelp: showHelp, closeHelp: closeHelp,
    playFromTitle: function () { if (PB.save.exists()) continueGame(); else newGameStart(); },
    interact: interact,
    goLocation: goLocation,
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

})(window.PB = window.PB || {});
