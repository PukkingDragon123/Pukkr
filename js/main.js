/* ===========================================================================
   main.js — boot, title, loop, scene rendering, navigation and interaction.
   Places: Forest (shrine → spots, catch), Garden (grow), Museum (display),
   plus the Shop and Backpack overlays.
   =========================================================================== */
(function (PB) {
  "use strict";

  var canvas, ctx;
  var VIEW_W = PB.config.VIEW_W, VIEW_H = PB.config.VIEW_H;
  var mode = "title", helpVisible = false;
  var last = 0, autosaveT = 0, clock = 0;
  var titleBugsAdded = false;
  var gardenLayout = [], museumLayout = [];

  function $(id) { return document.getElementById(id); }

  function boot() {
    canvas = $("screen"); ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    PB.art.preload(); PB.ui.init(); PB.input.init();
    if (PB.fx) PB.fx.init();
    PB.scene.init();

    $("btn-play").addEventListener("click", function () { PB.audio.resume(); newGameStart(); });
    $("btn-continue").addEventListener("click", function () { PB.audio.resume(); continueGame(); });
    $("btn-howto").addEventListener("click", function () { PB.audio.resume(); showHelp(); });
    $("btn-help-close").addEventListener("click", closeHelp);
    var nav = $("navbar").querySelectorAll("[data-nav]");
    for (var i = 0; i < nav.length; i++) nav[i].addEventListener("click", function () {
      PB.audio.resume(); var n = this.getAttribute("data-nav");
      if (n === "shop") { PB.ui.openShop(); return; }
      if (n === "beach" && !PB.state.flags.beachUnlocked) { PB.ui.toast("✈️ Buy a Plane Ticket in the Shop to visit the Beach!", ""); return; }
      setScene(n);
    });
    var paths = $("forest-paths").querySelectorAll("[data-side]");
    for (var j = 0; j < paths.length; j++) paths[j].addEventListener("click", function () { choosePath(this.getAttribute("data-side")); });
    $("spot-leave").addEventListener("click", function () { PB.forest.enterShrine(); updateForestUI(); });

    canvas.addEventListener("click", onCanvasClick);
    resize(); window.addEventListener("resize", resize);
    showTitle(); requestAnimationFrame(loop);
  }

  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    var s = Math.min(w / VIEW_W, h / VIEW_H);
    canvas.style.width = Math.floor(VIEW_W * s) + "px";
    canvas.style.height = Math.floor(VIEW_H * s) + "px";
  }

  // ---- title ---------------------------------------------------------------
  function showTitle() {
    mode = "title";
    $("title").classList.remove("hidden");
    PB.ui.showHUD(false);
    ["navbar", "loc-label", "museum-bar", "forest-paths", "spot-leave", "garden-tray"].forEach(function (id) { $(id).classList.add("hidden"); });
    var has = PB.save.exists();
    $("btn-play").textContent = has ? "New Game" : "Play";
    var c = $("btn-continue"); c.style.display = has ? "" : "none"; c.disabled = !has;
    addTitleBugs();
  }
  function addTitleBugs() {
    if (titleBugsAdded) return; titleBugsAdded = true;
    var host = $("title"), jars = ["caterpie", "weedle", "paras", "shuckle", "wimpod"];
    var spots = [{ left: "5%", top: "22%" }, { right: "6%", top: "14%" }, { left: "9%", bottom: "12%" }, { right: "8%", bottom: "14%" }, { left: "3%", top: "55%" }];
    jars.forEach(function (sid, i) {
      var img = document.createElement("img"); img.src = PB.art.jarURL(sid);
      img.className = "float-bug"; img.style.width = "96px";
      var s = spots[i]; if (s.left) img.style.left = s.left; if (s.right) img.style.right = s.right;
      if (s.top) img.style.top = s.top; if (s.bottom) img.style.bottom = s.bottom;
      img.style.animationDelay = (i * 0.6) + "s"; host.appendChild(img);
    });
  }

  function newGameStart() {
    if (PB.save.exists() && !window.confirm("Start a new game? Your saved game will be overwritten.")) return;
    PB.save.clear(); PB.newGame(); PB.scene.setLocation("forest"); PB.forest.enterShrine();
    enterPlay(true);
  }
  function continueGame() {
    var data = PB.save.read(); if (!data) { newGameStart(); return; }
    PB.loadInto(data); PB.scene.setLocation("forest"); PB.forest.enterShrine();
    enterPlay(false);
  }
  function enterPlay(isNew) {
    mode = "play"; helpVisible = false;
    $("title").classList.add("hidden"); $("help").classList.add("hidden");
    PB.ui.showHUD(true); $("navbar").classList.remove("hidden"); $("loc-label").classList.remove("hidden");
    updateNav(); updateLocLabel(); updateForestUI(); PB.ui.updateHUD();
    last = 0; autosaveT = 0;
    PB.ui.toast(isNew ? "Welcome! Enter the forest shrine and pick a path. ⛩️" : "Welcome back! 🐛", "good");
  }
  function showHelp() { helpVisible = true; $("help").classList.remove("hidden"); }
  function closeHelp() { helpVisible = false; $("help").classList.add("hidden"); }

  // ---- navigation ----------------------------------------------------------
  function flashScreen() {
    var f = $("flash"); if (!f) return;
    f.classList.remove("go"); void f.offsetWidth; f.classList.add("go");
  }
  function setScene(id) {
    if (id === "forest") PB.forest.enterShrine();
    if (PB.scene.current() !== id) flashScreen();
    PB.scene.setLocation(id);
    PB.ui.closePopup();
    updateNav(); updateLocLabel(); updateForestUI();
    $("museum-bar").classList.toggle("hidden", id !== "museum");
    if (id === "museum") PB.ui.showMuseumBar(true); else PB.ui.showMuseumBar(false);
    PB.ui.showTray(id === "garden");
    PB.audio.open();
    PB.ui.toast(PB.scene.emoji() + " " + PB.scene.name(), "good");
  }
  function updateLocLabel() { $("loc-label").textContent = PB.scene.emoji() + " " + PB.scene.name(); }
  function updateNav() {
    var b = $("navbar").querySelectorAll("[data-nav]");
    for (var i = 0; i < b.length; i++) b[i].classList.toggle("active", b[i].getAttribute("data-nav") === PB.scene.current());
  }
  function updateForestUI() {
    var inForest = PB.scene.current() === "forest";
    $("forest-paths").classList.toggle("hidden", !(inForest && PB.forest.view === "shrine"));
    $("spot-leave").classList.toggle("hidden", !(inForest && PB.forest.view === "spot"));
  }

  function choosePath(side) {
    if (PB.scene.current() !== "forest" || PB.forest.view !== "shrine") return;
    var o = PB.forest.rollOutcome();
    PB.audio.select();
    if (o.kind === "catch" || o.kind === "catch_rare") {
      PB.forest.enterSpot(o.kind === "catch_rare"); updateForestUI();
      PB.ui.toast(o.label, "good");
    } else if (o.kind === "candy") { var n = PB.forest.candyFind(); PB.ui.toast("🍬 " + o.label + " +" + n + " candy", "candy"); }
    else if (o.kind === "item") { var it = PB.forest.itemFind(); PB.ui.toast("🧺 " + it.qty + "× " + it.feed.name + " found!", "good"); }
    else if (o.kind === "minigame") { PB.ui.openCardGame(); }
    else { PB.ui.toast(o.label, ""); }
    PB.ui.updateHUD();
  }

  // ---- interaction ---------------------------------------------------------
  function blocked() { return mode !== "play" || PB.catching.isActive() || PB.ui.isBlocking() || helpVisible; }
  function toCanvas(cx, cy) { var r = canvas.getBoundingClientRect(); return { x: (cx - r.left) / r.width * VIEW_W, y: (cy - r.top) / r.height * VIEW_H }; }
  function jarHit(layout, p) {
    for (var i = layout.length - 1; i >= 0; i--) {
      var s = layout[i], w = s.h * 0.62;
      if (p.x >= s.x - w / 2 && p.x <= s.x + w / 2 && p.y >= s.y - s.h && p.y <= s.y + 12) return i;
    }
    return -1;
  }

  function isCatchScene() { var h = PB.scene.current(); return (h === "forest" && PB.forest.view === "spot") || h === "beach"; }

  function onCanvasClick(ev) {
    if (blocked()) return;
    var p = toCanvas(ev.clientX, ev.clientY), here = PB.scene.current();
    if (isCatchScene()) {
      var e = PB.spawns.hitTest(p.x, p.y);
      if (e) { if (PB.bag.hasRoomFor(e.sid)) PB.catching.begin(e); else PB.ui.toast("Your backpack is full! Make room first. 🎒", ""); }
    } else if (here === "garden") {
      var gi = jarHit(gardenLayout, p); if (gi >= 0) PB.ui.openPopup(gardenLayout[gi].uid);
    } else if (here === "museum") {
      var mi = jarHit(museumLayout, p);
      if (mi >= 0) { var sid = museumLayout[mi].sid, sp = PB.speciesById[sid]; PB.ui.toast(sp.name + " · " + PB.state.museum.donated[sid].size + " mm", ""); }
    }
  }

  // a food chip was dropped (from the garden tray) — feed the jar under it
  PB._feedDropAt = function (cx, cy, feedId) {
    if (PB.scene.current() !== "garden") return;
    var p = toCanvas(cx, cy), gi = jarHit(gardenLayout, p);
    if (gi < 0) { PB.ui.toast("Drop the food onto a jar! 🫙", ""); return; }
    var r = PB.garden.feed(gardenLayout[gi].uid, feedId);
    if (!r.ok) { if (r.reason === "none") PB.ui.toast("Out of that food — buy more in the Shop.", ""); return; }
    if (r.full) PB.ui.toast("Fully grown! It's worth the most now. 🌟", "good");
    PB.ui.refreshTray(); PB.ui.updateHUD();
  };

  function interact() {
    if (blocked() || !isCatchScene()) return;
    var list = PB.spawns.list().filter(function (e) { return e.state !== "out"; });
    if (!list.length) return;
    var cx = VIEW_W / 2, cy = VIEW_H * 0.6, best = null, bd = Infinity;
    list.forEach(function (e) { var d = Math.abs(e.x - cx) + Math.abs(e.y - cy); if (d < bd) { bd = d; best = e; } });
    if (best && PB.bag.hasRoomFor(best.sid)) PB.catching.begin(best);
    else if (best) PB.ui.toast("Your backpack is full! 🎒", "");
  }

  // ---- loop ----------------------------------------------------------------
  function loop(ts) {
    var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0; last = ts;
    if (mode === "play") { updatePlay(dt); renderPlay(); }
    requestAnimationFrame(loop);
  }

  function updatePlay(dt) {
    if (dt <= 0) return;
    clock += dt;
    var newDay = PB.time.tick(dt);
    PB.garden.update(dt);
    if (PB.fx) PB.fx.update(dt);
    var here = PB.scene.current();

    if (PB.catching.isActive()) { PB.catching.update(dt); PB.ui.setPrompt(null); }
    else if (PB.ui.isBlocking() || helpVisible) { PB.ui.setPrompt(null); }
    else if (here === "forest" && PB.forest.view === "spot") {
      PB.spawns.update(dt);
      PB.ui.setPrompt("Tap the moving creature to catch it! (it's quick!) 🪤");
    } else if (here === "beach") {
      PB.spawns.update(dt);
      PB.ui.setPrompt("Tap a beach creature to catch it! 🏖️");
    } else if (here === "forest") {
      PB.ui.setPrompt("Pick a path to explore. ⛩️");
    } else if (here === "garden") {
      PB.ui.setPrompt(PB.state.bugs.length ? null : "Catch creatures in the Forest first! 🌳");
    } else if (here === "museum") {
      PB.ui.updateMuseumBar();
      PB.ui.setPrompt(PB.museumSpeciesCount() ? null : "Display creatures from your Garden's jars. 🏛");
    }

    if (newDay) { PB.ui.toast("🌅 Day " + PB.state.day + " — friends can visit again!", "good"); PB.save.write(PB.state); }
    autosaveT += dt; if (autosaveT >= PB.config.AUTOSAVE_SEC) { autosaveT = 0; PB.save.write(PB.state); }
    PB.ui.updateHUD();
  }

  // ---- render --------------------------------------------------------------
  function renderPlay() {
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    PB.scene.draw(ctx);
    var here = PB.scene.current();
    if (isCatchScene()) PB.spawns.draw(ctx);
    else if (here === "garden") drawGardenJars();
    else if (here === "museum") drawMuseumJars();

    var period = PB.time.period(), ov = PB.time.overlay();
    if (ov.dark > 0.001) { ctx.fillStyle = "rgba(" + ov.tint + "," + (ov.dark * 0.5).toFixed(3) + ")"; ctx.fillRect(0, 0, VIEW_W, VIEW_H); }
    if (PB.fx) { PB.fx.drawParticles(ctx, period); PB.fx.drawVignette(ctx); PB.fx.drawGrain(ctx); }
  }

  function drawGardenJars() {
    var bugs = PB.state.bugs;
    gardenLayout = PB.scene.gardenSlots(bugs.length);
    for (var i = 0; i < bugs.length && i < gardenLayout.length; i++) {
      var s = gardenLayout[i], b = bugs[i], bob = Math.sin(clock * 2 + i) * 2;
      ctx.fillStyle = "rgba(40,40,30,0.16)";
      ctx.beginPath(); ctx.ellipse(s.x, s.y + 2, 34, 9, 0, 0, Math.PI * 2); ctx.fill();
      PB.art.drawJar(ctx, b.sid, s.x, s.y - bob, s.h, clock + i);
      // grow bar
      var bw = 46, bx = s.x - bw / 2, by = s.y + 8;
      ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.fillRect(bx, by, bw, 6);
      ctx.fillStyle = b.grow >= 1 ? "#f6c453" : "#7cc36b"; ctx.fillRect(bx, by, bw * b.grow, 6);
      ctx.strokeStyle = "rgba(74,63,53,0.5)"; ctx.lineWidth = 1; ctx.strokeRect(bx, by, bw, 6);
      gardenLayout[i].uid = b.uid;
    }
  }
  function drawMuseumJars() {
    var sids = Object.keys(PB.state.museum.donated), slots = PB.scene.museumSlots(sids.length);
    museumLayout = [];
    for (var i = 0; i < slots.length && i < sids.length; i++) {
      var s = slots[i];
      ctx.fillStyle = "rgba(40,30,20,0.18)"; ctx.beginPath(); ctx.ellipse(s.x, s.y + 2, 28, 7, 0, 0, Math.PI * 2); ctx.fill();
      PB.art.drawJar(ctx, sids[i], s.x, s.y, s.h, clock * 0.5 + i);
      museumLayout.push({ x: s.x, y: s.y, h: s.h, sid: sids[i] });
    }
  }

  PB.main = {
    atTitle: function () { return mode === "title"; },
    helpOpen: function () { return helpVisible; },
    openHelp: showHelp, closeHelp: closeHelp,
    playFromTitle: function () { if (PB.save.exists()) continueGame(); else newGameStart(); },
    interact: interact,
    goLocation: function (id) { if (id === "shop") PB.ui.openShop(); else setScene(id); },
    feedDropAt: function (cx, cy, id) { PB._feedDropAt(cx, cy, id); },
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

})(window.PB = window.PB || {});
