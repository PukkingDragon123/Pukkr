/* ===========================================================================
   main.js — boot, title, loop, scene rendering, navigation, interaction.
   Places: Forest & Beach (catch), Museum (raise / feed / open for money),
   Arena (clicker fight), plus the Shop and Backpack overlays.
   =========================================================================== */
(function (PB) {
  "use strict";

  var canvas, ctx;
  var VIEW_W = PB.config.VIEW_W, VIEW_H = PB.config.VIEW_H;
  var mode = "title", helpVisible = false;
  var last = 0, autosaveT = 0, clock = 0;
  var titleBugsAdded = false;
  var museumLayout = [];
  var parX = 0, parY = 0;       // pointer parallax (-1..1)
  var dmgPops = [];             // fight damage numbers

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
    canvas.addEventListener("mousemove", onPointer);
    resize(); window.addEventListener("resize", resize);
    showTitle(); requestAnimationFrame(loop);
  }

  function onPointer(ev) {
    var r = canvas.getBoundingClientRect();
    parX = ((ev.clientX - r.left) / r.width) * 2 - 1;
    parY = ((ev.clientY - r.top) / r.height) * 2 - 1;
  }
  function resize() {
    var w = window.innerWidth, h = window.innerHeight, s = Math.min(w / VIEW_W, h / VIEW_H);
    canvas.style.width = Math.floor(VIEW_W * s) + "px"; canvas.style.height = Math.floor(VIEW_H * s) + "px";
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
  function flashScreen() { var f = $("flash"); if (!f) return; f.classList.remove("go"); void f.offsetWidth; f.classList.add("go"); }
  function setScene(id) {
    if (id === "forest") PB.forest.enterShrine();
    if (PB.scene.current() !== id) flashScreen();
    PB.scene.setLocation(id);
    PB.ui.closePopup();
    updateNav(); updateLocLabel(); updateForestUI();
    var isMuseum = id === "museum";
    $("museum-bar").classList.toggle("hidden", !isMuseum);
    PB.ui.showMuseumBar(isMuseum);
    PB.ui.showTray(isMuseum);
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
    var o = PB.forest.rollOutcome(); PB.audio.select();
    if (o.kind === "catch" || o.kind === "catch_rare") { PB.forest.enterSpot(o.kind === "catch_rare"); updateForestUI(); PB.ui.toast(o.label, "good"); }
    else if (o.kind === "candy") { var n = PB.forest.candyFind(); PB.ui.toast("💰 " + o.label + " +" + n, "candy"); }
    else if (o.kind === "item") { var it = PB.forest.itemFind(); PB.ui.toast("🧺 " + it.qty + "× " + it.feed.name + " found!", "good"); }
    else if (o.kind === "minigame") { PB.ui.openCardGame(); }
    else { PB.ui.toast(o.label, ""); }
    PB.ui.updateHUD();
  }

  // ---- interaction ---------------------------------------------------------
  function blocked() { return mode !== "play" || PB.catching.isActive() || PB.ui.isBlocking() || helpVisible; }
  function isCatchScene() { var h = PB.scene.current(); return (h === "forest" && PB.forest.view === "spot") || h === "beach"; }
  function toCanvas(cx, cy) { var r = canvas.getBoundingClientRect(); return { x: (cx - r.left) / r.width * VIEW_W, y: (cy - r.top) / r.height * VIEW_H }; }
  function jarHit(layout, p) {
    for (var i = layout.length - 1; i >= 0; i--) { var s = layout[i], w = s.h * 0.62; if (p.x >= s.x - w / 2 && p.x <= s.x + w / 2 && p.y >= s.y - s.h && p.y <= s.y + 12) return i; }
    return -1;
  }

  function onCanvasClick(ev) {
    if (blocked()) return;
    var p = toCanvas(ev.clientX, ev.clientY), here = PB.scene.current();
    if (isCatchScene()) {
      var e = PB.spawns.hitTest(p.x, p.y);
      if (e) { if (PB.bag.hasRoomFor(e.sid)) PB.catching.begin(e); else PB.ui.toast("Your backpack is full! Make room first. 🎒", ""); }
    } else if (here === "museum") {
      var mi = jarHit(museumLayout, p); if (mi >= 0) PB.ui.openPopup(museumLayout[mi].uid);
    } else if (here === "fight") {
      var dmg = PB.fight.attack();
      dmgPops.push({ x: VIEW_W / 2 + (Math.random() - 0.5) * 120, y: VIEW_H * 0.36, t: 0.8, dmg: dmg });
    }
  }

  PB._feedDropAt = function (cx, cy, feedId) {
    if (PB.scene.current() !== "museum") { PB.ui.toast("Feed your creatures here in the Museum! 🫙", ""); return; }
    var p = toCanvas(cx, cy), gi = jarHit(museumLayout, p);
    if (gi < 0) { PB.ui.toast("Drop the food onto a jar! 🫙", ""); return; }
    var r = PB.garden.feed(museumLayout[gi].uid, feedId);
    if (!r.ok) { if (r.reason === "none") PB.ui.toast("Out of that food — buy more in the Shop.", ""); return; }
    if (r.full) PB.ui.toast("Fully grown! Worth the most now. 🌟", "good");
    PB.ui.refreshTray(); PB.ui.updateHUD();
  };

  function interact() {
    if (blocked()) return;
    if (PB.scene.current() === "fight") { var d = PB.fight.attack(); dmgPops.push({ x: VIEW_W / 2 + (Math.random() - 0.5) * 120, y: VIEW_H * 0.36, t: 0.8, dmg: d }); return; }
    if (!isCatchScene()) return;
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
    PB.garden.update(dt);          // creatures grow slowly over time
    PB.fight.update(dt);           // idle damage in the arena
    if (PB.fx) PB.fx.update(dt);
    var here = PB.scene.current();

    if (PB.catching.isActive()) { PB.catching.update(dt); PB.ui.setPrompt(null); }
    else if (PB.ui.isBlocking() || helpVisible) { PB.ui.setPrompt(null); }
    else if (here === "forest" && PB.forest.view === "spot") { PB.spawns.update(dt); PB.scene.updateFoliage(dt, PB.spawns.list()); PB.ui.setPrompt("Tap the moving creature to catch it! 🪤"); }
    else if (here === "beach") { PB.spawns.update(dt); PB.scene.updateFoliage(dt, PB.spawns.list()); PB.ui.setPrompt("Tap a beach creature to catch it! 🏖️"); }
    else if (here === "forest") { PB.ui.setPrompt("Pick a path to explore. ⛩️"); }
    else if (here === "museum") { PB.ui.updateMuseumBar(); PB.ui.setPrompt(PB.state.bugs.length ? null : "Catch creatures, then raise them here in jars. 🫙"); }
    else if (here === "fight") { PB.ui.setPrompt("Wave " + PB.state.fight.wave + " · click to attack! 💪 Power " + PB.fight.power()); }

    for (var i = dmgPops.length - 1; i >= 0; i--) { dmgPops[i].t -= dt; dmgPops[i].y -= 60 * dt; if (dmgPops[i].t <= 0) dmgPops.splice(i, 1); }

    if (newDay) { PB.ui.toast("🌅 Day " + PB.state.day + " — open the museum doors again!", "good"); PB.save.write(PB.state); }
    autosaveT += dt; if (autosaveT >= PB.config.AUTOSAVE_SEC) { autosaveT = 0; PB.save.write(PB.state); }
    PB.ui.updateHUD();
  }

  // ---- render --------------------------------------------------------------
  function renderPlay() {
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    PB.scene.draw(ctx, parX, parY);
    var here = PB.scene.current();
    if (isCatchScene()) { PB.spawns.draw(ctx); PB.scene.drawForeground(ctx, parX, parY); }
    else if (here === "museum") drawMuseumJars();
    else if (here === "fight") drawFight();

    var period = PB.time.period(), ov = PB.time.overlay();
    if (ov.dark > 0.001) { ctx.fillStyle = "rgba(" + ov.tint + "," + (ov.dark * 0.5).toFixed(3) + ")"; ctx.fillRect(0, 0, VIEW_W, VIEW_H); }
    if (PB.fx) { PB.fx.drawParticles(ctx, period); PB.fx.drawVignette(ctx); PB.fx.drawGrain(ctx); }
  }

  function drawMuseumJars() {
    var bugs = PB.state.bugs, slots = PB.scene.museumSlots(bugs.length);
    museumLayout = [];
    for (var i = 0; i < slots.length && i < bugs.length; i++) {
      var s = slots[i], b = bugs[i], bob = Math.sin(clock * 2 + i) * 2;
      ctx.fillStyle = "rgba(40,30,20,0.18)"; ctx.beginPath(); ctx.ellipse(s.x, s.y + 2, 26, 7, 0, 0, Math.PI * 2); ctx.fill();
      PB.art.drawJar(ctx, b.sid, s.x, s.y - bob, s.h, clock + i);
      var bw = 40, bx = s.x - bw / 2, by = s.y + 6;
      ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.fillRect(bx, by, bw, 5);
      ctx.fillStyle = b.grow >= 1 ? "#f6c453" : "#7cc36b"; ctx.fillRect(bx, by, bw * b.grow, 5);
      museumLayout.push({ x: s.x, y: s.y, h: s.h, uid: b.uid });
    }
  }

  function fillRR(color, x, y, w, h, r) {
    if (w <= 0) return;
    r = Math.min(r, w / 2, h / 2);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath(); ctx.fill();
  }

  function drawFight() {
    PB.fight.ensure();
    var e = PB.fight.enemy, ex = VIEW_W / 2, ey = VIEW_H * 0.4;
    var hurt = e.hurt > 0, shake = hurt ? (Math.random() - 0.5) * 10 : 0;
    var sc = hurt ? 0.94 : 1;
    // enemy body
    ctx.save(); ctx.translate(ex + shake, ey); ctx.scale(sc, 2 - sc);
    ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.beginPath(); ctx.ellipse(0, 70, 64, 16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = e.c1; ctx.beginPath(); ctx.ellipse(0, 0, 70, 64, 0, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = "#3a2f25"; ctx.stroke();
    // angry eyes + frown
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(-24, -8, 16, 0, Math.PI * 2); ctx.arc(24, -8, 16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#222"; ctx.beginPath(); ctx.arc(-20, -4, 8, 0, Math.PI * 2); ctx.arc(28, -4, 8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#3a2f25"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-34, -26); ctx.lineTo(-10, -16); ctx.moveTo(34, -26); ctx.lineTo(10, -16); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 34, 18, 1.15 * Math.PI, 1.85 * Math.PI); ctx.stroke();
    ctx.restore();
    // HP bar
    var bw = 240, bx = ex - bw / 2, by = ey - 100;
    fillRR("rgba(0,0,0,0.25)", bx - 3, by - 3, bw + 6, 20, 8);
    fillRR("#3a2f25", bx, by, bw, 14, 6);
    fillRR("#ef6b6b", bx, by, bw * Math.max(0, e.hp / e.maxHp), 14, 6);
    ctx.fillStyle = "#fff"; ctx.font = "bold 15px 'Trebuchet MS',sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(e.name + "  " + Math.max(0, Math.ceil(e.hp)) + "/" + e.maxHp, ex, by + 7);
    // your fighters
    var team = PB.state.bugs.slice().sort(function (a, b) { return PB.bugValue(b) - PB.bugValue(a); }).slice(0, 4);
    for (var i = 0; i < team.length; i++) {
      var fx = ex - (team.length - 1) * 55 / 2 + i * 55, fy = VIEW_H * 0.84 + Math.sin(clock * 5 + i) * 4;
      PB.art.drawCreature(ctx, team[i].sid, fx, fy, 58, false, clock * 2 + i * 10);
    }
    if (!team.length) { ctx.fillStyle = "rgba(74,63,53,0.8)"; ctx.font = "bold 16px 'Trebuchet MS',sans-serif"; ctx.textAlign = "center"; ctx.fillText("Catch some creatures to fight with!", ex, VIEW_H * 0.82); }
    // damage popups
    ctx.font = "bold 26px 'Trebuchet MS',sans-serif"; ctx.textAlign = "center";
    for (var d = 0; d < dmgPops.length; d++) {
      var dp = dmgPops[d];
      ctx.globalAlpha = Math.max(0, dp.t);
      ctx.fillStyle = "#fff"; ctx.lineWidth = 3; ctx.strokeStyle = "#d9534f";
      ctx.strokeText("-" + dp.dmg, dp.x, dp.y); ctx.fillText("-" + dp.dmg, dp.x, dp.y);
    }
    ctx.globalAlpha = 1;
  }

  PB.main = {
    atTitle: function () { return mode === "title"; },
    helpOpen: function () { return helpVisible; },
    openHelp: showHelp, closeHelp: closeHelp,
    playFromTitle: function () { if (PB.save.exists()) continueGame(); else newGameStart(); },
    interact: interact,
    goLocation: function (id) { if (id === "shop") PB.ui.openShop(); else if (id === "beach" && !PB.state.flags.beachUnlocked) PB.ui.toast("✈️ Buy a Plane Ticket first!", ""); else setScene(id); },
    feedDropAt: function (cx, cy, id) { PB._feedDropAt(cx, cy, id); },
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

})(window.PB = window.PB || {});
