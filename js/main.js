/* ===========================================================================
   main.js — boot, title, loop, two play modes (Catch & Battle), navigation,
   idle updates, and the combat render with squishy VFX.
   =========================================================================== */
(function (PB) {
  "use strict";

  var canvas, ctx;
  var VIEW_W = PB.config.VIEW_W, VIEW_H = PB.config.VIEW_H;
  var mode = "title", helpVisible = false;
  var last = 0, autosaveT = 0, clock = 0;
  var titleBugsAdded = false;
  var parX = 0, parY = 0;
  var dmgPops = [], sparks = [], shake = 0;

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
      if (n === "bugs") PB.ui.openBugs(); else if (n === "lab") PB.ui.openLab(); else setMode(n);
    });
    $("area-prev").addEventListener("click", function () { switchArea(-1); });
    $("area-next").addEventListener("click", function () { switchArea(1); });
    canvas.addEventListener("click", onCanvasClick);
    canvas.addEventListener("mousemove", function (ev) { var r = canvas.getBoundingClientRect(); parX = ((ev.clientX - r.left) / r.width) * 2 - 1; parY = ((ev.clientY - r.top) / r.height) * 2 - 1; });
    resize(); window.addEventListener("resize", resize);
    showTitle(); requestAnimationFrame(loop);
  }
  function resize() { var w = window.innerWidth, h = window.innerHeight, s = Math.min(w / VIEW_W, h / VIEW_H); canvas.style.width = Math.floor(VIEW_W * s) + "px"; canvas.style.height = Math.floor(VIEW_H * s) + "px"; }

  function showTitle() {
    mode = "title"; $("title").classList.remove("hidden"); PB.ui.showHUD(false);
    ["navbar", "area-bar", "bait-bar"].forEach(function (id) { $(id).classList.add("hidden"); });
    var has = PB.save.exists(); $("btn-play").textContent = has ? "New Game" : "Play";
    var c = $("btn-continue"); c.style.display = has ? "" : "none"; c.disabled = !has;
    addTitleBugs();
  }
  function addTitleBugs() {
    if (titleBugsAdded) return; titleBugsAdded = true;
    var host = $("title"), jars = ["caterpie", "weedle", "paras", "shuckle", "wimpod"];
    var spots = [{ left: "5%", top: "22%" }, { right: "6%", top: "14%" }, { left: "9%", bottom: "12%" }, { right: "8%", bottom: "14%" }, { left: "3%", top: "55%" }];
    jars.forEach(function (sid, i) { var img = document.createElement("img"); img.src = PB.art.jarURL ? (PB.art.jarURL(sid) || PB.art.creatureThumb(sid)) : PB.art.creatureThumb(sid); img.className = "float-bug"; img.style.width = "96px"; var s = spots[i]; if (s.left) img.style.left = s.left; if (s.right) img.style.right = s.right; if (s.top) img.style.top = s.top; if (s.bottom) img.style.bottom = s.bottom; img.style.animationDelay = (i * 0.6) + "s"; host.appendChild(img); });
  }

  function newGameStart() { if (PB.save.exists() && !window.confirm("Start a new game? Your save will be overwritten.")) return; PB.save.clear(); PB.newGame(); enterPlay(true); }
  function continueGame() { var d = PB.save.read(); if (!d) { newGameStart(); return; } PB.loadInto(d); enterPlay(false); }
  function enterPlay(isNew) {
    helpVisible = false; $("title").classList.add("hidden"); $("help").classList.add("hidden");
    PB.ui.showHUD(true); $("navbar").classList.remove("hidden"); PB.ui.showAreaBar(true);
    PB.combat.reset();
    setMode("catch");
    PB.ui.updateHUD();
    last = 0; autosaveT = 0;
    PB.ui.toast(isNew ? "Welcome! Set fruit bait to lure your first bug. 🎣" : "Welcome back! 🐛", "good");
  }
  function showHelp() { helpVisible = true; $("help").classList.remove("hidden"); }
  function closeHelp() { helpVisible = false; $("help").classList.add("hidden"); }

  function flashScreen() { var f = $("flash"); if (!f) return; f.classList.remove("go"); void f.offsetWidth; f.classList.add("go"); }
  function setMode(m) {
    flashScreen();
    mode = m; PB.scene.setLocation(m);
    PB.ui.showBaitBar(m === "catch");
    if (m === "battle") PB.combat.reset();
    updateNav(); PB.ui.updateHUD();
  }
  function updateNav() { var b = $("navbar").querySelectorAll("[data-nav]"); for (var i = 0; i < b.length; i++) { var n = b[i].getAttribute("data-nav"); b[i].classList.toggle("active", (n === "catch" || n === "battle") && n === mode); } }
  function switchArea(d) {
    var i = PB.state.area + d;
    if (i < 0 || i >= PB.areas.length) return;
    if (i >= PB.state.unlocked) { PB.ui.toast("🔒 Beat the boss to unlock " + PB.areas[i].name + "!", ""); return; }
    PB.state.area = i; flashScreen();
    if (mode === "battle") PB.combat.reset();
    PB.ui.updateHUD();
  }

  PB.main = {
    atTitle: function () { return mode === "title"; },
    helpOpen: function () { return helpVisible; },
    openHelp: showHelp, closeHelp: closeHelp,
    playFromTitle: function () { if (PB.save.exists()) continueGame(); else newGameStart(); },
    startCatch: startCatch, interact: interact,
    nav: function (n) { PB.audio.resume(); if (n === "bugs") PB.ui.openBugs(); else if (n === "lab") PB.ui.openLab(); else setMode(n); },
  };

  function blocked() { return mode === "title" || PB.catching.isActive() || PB.ui.isBlocking() || helpVisible; }
  function startCatch() { if (PB.bait.ready() && !PB.catching.isActive()) PB.catching.begin(PB.state.pending); }
  function interact() {
    if (blocked()) return;
    if (mode === "catch") startCatch();
    else if (mode === "battle") doAttack();
  }
  function doAttack() {
    var r = PB.combat.click(), e = PB.combat.enemy;
    var ex = VIEW_W / 2, ey = VIEW_H * 0.38;
    dmgPops.push({ x: ex + (Math.random() - 0.5) * 90, y: ey, t: 0.8, dmg: r.dmg, crit: r.crit });
    for (var i = 0; i < (r.crit ? 10 : 5); i++) sparks.push({ x: ex, y: ey, vx: (Math.random() - 0.5) * 260, vy: (Math.random() - 0.7) * 260, t: 0.5, crit: r.crit });
    if (r.crit) shake = 0.25;
  }
  function onCanvasClick(ev) {
    if (blocked()) return;
    if (mode === "catch") { if (PB.bait.ready()) startCatch(); }
    else if (mode === "battle") doAttack();
  }

  // ---- loop ----------------------------------------------------------------
  function loop(ts) { var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0; last = ts; if (mode !== "title") { updatePlay(dt); renderPlay(); } requestAnimationFrame(loop); }

  function updatePlay(dt) {
    if (dt <= 0) return;
    clock += dt;
    PB.bait.update(dt);
    PB.combat.update(dt);
    if (PB.fx) PB.fx.update(dt);
    if (shake > 0) shake = Math.max(0, shake - dt);

    for (var i = dmgPops.length - 1; i >= 0; i--) { dmgPops[i].t -= dt; dmgPops[i].y -= 64 * dt; if (dmgPops[i].t <= 0) dmgPops.splice(i, 1); }
    for (var j = sparks.length - 1; j >= 0; j--) { var s = sparks[j]; s.t -= dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 500 * dt; if (s.t <= 0) sparks.splice(j, 1); }

    if (PB.catching.isActive() || PB.ui.isBlocking() || helpVisible) PB.ui.setPrompt(null);
    else if (mode === "catch") {
      PB.ui.refreshBait();
      if (PB.bait.ready()) PB.ui.setPrompt("Tap the sparkling bug to catch it! 🪤");
      else if (PB.bait.active()) PB.ui.setPrompt(null);
      else PB.ui.setPrompt("Choose fruit bait below to lure a bug. 🎣");
      PB.scene.updateFoliage(dt, []);
    } else if (mode === "battle") {
      PB.scene.updateFoliage(dt, []);
      PB.ui.setPrompt(PB.teamBugs().length ? "Tap to attack! ⚔️" : "Add bugs to your team first (Bugs tab)!");
    }

    autosaveT += dt; if (autosaveT >= PB.config.AUTOSAVE_SEC) { autosaveT = 0; PB.touchSave(); PB.save.write(PB.state); }
    PB.ui.updateHUD();
  }

  // ---- render --------------------------------------------------------------
  function fillRR(color, x, y, w, h, r) { if (w <= 0) return; r = Math.min(r, w / 2, h / 2); ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); ctx.fill(); }

  function renderPlay() {
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - 0.5) * 12 * shake * 4, (Math.random() - 0.5) * 12 * shake * 4);
    ctx.clearRect(-20, -20, VIEW_W + 40, VIEW_H + 40);
    PB.scene.draw(ctx, parX, parY);
    if (mode === "catch") drawCatch();
    else if (mode === "battle") drawBattle();
    PB.scene.drawForeground(ctx, parX, parY);

    if (PB.fx) { PB.fx.drawParticles(ctx, mode === "battle" ? "evening" : "day"); PB.fx.drawVignette(ctx); PB.fx.drawGrain(ctx); }
    ctx.restore();
  }

  function drawCatch() {
    if (!PB.bait.ready()) return;
    var p = PB.state.pending, cx = VIEW_W / 2, cy = VIEW_H * 0.6, bob = Math.sin(clock * 3) * 6;
    if (p.sparkle) {
      ctx.save(); ctx.globalAlpha = 0.5 + Math.sin(clock * 5) * 0.3;
      for (var i = 0; i < 6; i++) { var a = clock * 1.5 + i; ctx.fillStyle = "#fff6c0"; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * 60, cy - 30 + Math.sin(a) * 40, 3, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
    ctx.fillStyle = "rgba(0,0,0,0.16)"; ctx.beginPath(); ctx.ellipse(cx, cy + 6, 34, 9, 0, 0, Math.PI * 2); ctx.fill();
    PB.art.drawCreature(ctx, p.sid, cx, cy + 6 - bob, 100, false, clock * 8);
  }

  function drawBattle() {
    var info = PB.combat.info(), e = PB.combat.enemy;
    var ex = VIEW_W / 2, ey = VIEW_H * 0.36;
    // enemy sprite (the uploaded creature art), squashing when hit
    var sc = e.hurt > 0 ? 0.9 : 1, size = e.boss ? 168 : 130;
    ctx.save(); ctx.translate(ex, ey); ctx.scale(sc, 2 - sc); ctx.translate(-ex, -ey);
    ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.beginPath(); ctx.ellipse(ex, ey + size * 0.42, size * 0.5, size * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    if (e.hurt > 0) { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = e.hurt * 3; }
    PB.art.drawCreature(ctx, e.sid, ex, ey + size * 0.4, size, false, clock * 6);
    if (e.hurt > 0) ctx.restore();
    ctx.restore();
    // enemy HP bar
    var bw = 300, bx = ex - bw / 2, by = ey - size * 0.55;
    fillRR("rgba(0,0,0,0.25)", bx - 3, by - 3, bw + 6, 22, 9);
    fillRR("#3a2f25", bx, by, bw, 16, 7);
    fillRR(e.boss ? "#c44fb0" : "#ef6b6b", bx, by, bw * Math.max(0, info.hp / info.max), 16, 7);
    ctx.fillStyle = "#fff"; ctx.font = "bold 15px 'Trebuchet MS',sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText((e.boss ? "👑 " : "") + e.name + "  " + Math.ceil(info.hp) + "/" + info.max, ex, by + 8);
    // your team at the bottom, bouncing (lunge forward on recent hit)
    var team = PB.teamBugs();
    for (var i = 0; i < team.length; i++) {
      var fx = ex - (team.length - 1) * 70 / 2 + i * 70, fy = VIEW_H * 0.86 + Math.sin(clock * 5 + i) * 5;
      PB.art.drawCreature(ctx, team[i].sid, fx, fy, 70, false, clock * 2 + i * 9);
    }
    if (!team.length) { ctx.fillStyle = "rgba(74,63,53,0.85)"; ctx.font = "bold 17px 'Trebuchet MS',sans-serif"; ctx.textAlign = "center"; ctx.fillText("No team! Add bugs in the Bugs tab.", ex, VIEW_H * 0.84); }
    // team HP bar
    var tw = 260, tx = ex - tw / 2, ty = VIEW_H * 0.93;
    fillRR("rgba(0,0,0,0.25)", tx - 3, ty - 3, tw + 6, 18, 8);
    fillRR("#3a2f25", tx, ty, tw, 12, 6);
    fillRR(PB.combat.teamFlash > 0 ? "#fff" : "#7cc36b", tx, ty, tw * (info.teamMax ? info.teamHp / info.teamMax : 0), 12, 6);
    ctx.fillStyle = "#fff"; ctx.font = "bold 12px 'Trebuchet MS',sans-serif"; ctx.fillText("Team HP " + info.teamHp + "/" + info.teamMax, ex, ty + 6);
    // sparks
    for (var s = 0; s < sparks.length; s++) { var sp = sparks[s]; ctx.globalAlpha = Math.max(0, sp.t * 2); ctx.fillStyle = sp.crit ? "#f6c453" : "#fff3c0"; ctx.beginPath(); ctx.arc(sp.x, sp.y, sp.crit ? 5 : 3, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
    // damage numbers
    ctx.textAlign = "center";
    for (var d = 0; d < dmgPops.length; d++) {
      var dp = dmgPops[d]; ctx.globalAlpha = Math.max(0, dp.t);
      ctx.font = "bold " + (dp.crit ? 34 : 24) + "px 'Trebuchet MS',sans-serif";
      ctx.lineWidth = 3; ctx.strokeStyle = dp.crit ? "#a8521f" : "#b23b3b"; ctx.fillStyle = dp.crit ? "#f6c453" : "#fff";
      var txt = (dp.crit ? "CRIT " : "") + dp.dmg;
      ctx.strokeText(txt, dp.x, dp.y); ctx.fillText(txt, dp.x, dp.y);
    }
    ctx.globalAlpha = 1;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

})(window.PB = window.PB || {});
