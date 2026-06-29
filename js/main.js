/* ===========================================================================
   main.js — boot, title, loop, play modes (Catch & Battle), navigation, idle
   updates, and the squishy combat render (combo, abilities, SWARM, modifiers).
   =========================================================================== */
(function (PB) {
  "use strict";

  var canvas, ctx;
  var VIEW_W = PB.config.VIEW_W, VIEW_H = PB.config.VIEW_H;
  var mode = "title", helpVisible = false;
  var last = 0, autosaveT = 0, clock = 0;
  var titleBugsAdded = false;
  var parX = 0, parY = 0;
  var dmgPops = [], sparks = [], rings = [], shake = 0, hitStop = 0;
  var catchSpots = [];

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
      PB.audio.resume(); PB.main.nav(this.getAttribute("data-nav"));
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
    ["navbar", "area-bar", "bait-bar", "combat-bar"].forEach(function (id) { $(id).classList.add("hidden"); });
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
    // offline + daily rewards
    var off = PB.state._offline;
    if (off && off.tokens > 0) setTimeout(function () { PB.ui.toast("While you were away: +" + off.tokens + " 🎟️ from idle battles!", "candy"); }, 700);
    var dew = PB.grantDailyDew();
    if (dew) setTimeout(function () { PB.ui.toast("🌅 Daily Dew: +" + dew + " ✨ Glimmer! Try the Capsule machine.", "candy"); PB.ui.updateHUD(); }, isNew ? 1400 : 1300);
    PB.state._offline = null;
    // persist now so the offline/daily bonuses can't be re-farmed by reloading
    PB.touchSave(); PB.save.write(PB.state);
  }
  function showHelp() { helpVisible = true; $("help").classList.remove("hidden"); }
  function closeHelp() { helpVisible = false; $("help").classList.add("hidden"); }

  function flashScreen() { var f = $("flash"); if (!f) return; f.classList.remove("go"); void f.offsetWidth; f.classList.add("go"); }
  function setMode(m) {
    flashScreen();
    mode = m; PB.scene.setLocation(m);
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
    PB.ui.refreshBait(); PB.ui.updateHUD();
  }

  PB.main = {
    atTitle: function () { return mode === "title"; },
    helpOpen: function () { return helpVisible; },
    openHelp: showHelp, closeHelp: closeHelp,
    playFromTitle: function () { if (PB.save.exists()) continueGame(); else newGameStart(); },
    startCatch: startCatch, interact: interact,
    useAbility: useAbility, fireUlt: fireUlt, labBurst: function () { flashScreen(); },
    mode: function () { return mode; },
    nav: function (n) {
      PB.audio.resume();
      if (n === "bugs") PB.ui.openBugs();
      else if (n === "lab") PB.ui.openLab();
      else if (n === "capsule") PB.ui.openCapsule();
      else if (n === "shop") PB.ui.openShop();
      else setMode(n);
    },
  };

  function blocked() { return mode === "title" || PB.catching.isActive() || PB.ui.isBlocking() || helpVisible; }

  function startCatch(slot) {
    if (PB.catching.isActive()) return;
    if (typeof slot !== "number") slot = PB.bait.firstReady();
    if (slot >= 0 && PB.bait.isReady(slot)) PB.catching.begin(slot);
  }
  function interact() {
    if (blocked()) return;
    if (mode === "catch") startCatch();
    else if (mode === "battle") doAttack();
  }

  function burst(x, y, n, crit) { for (var i = 0; i < n; i++) sparks.push({ x: x, y: y, vx: (Math.random() - 0.5) * 280, vy: (Math.random() - 0.7) * 300, t: 0.5 + Math.random() * 0.2, crit: crit }); }

  function doAttack() {
    var r = PB.combat.click(), ex = VIEW_W / 2, ey = VIEW_H * 0.34;
    dmgPops.push({ x: ex + (Math.random() - 0.5) * 90, y: ey, t: 0.8, dmg: r.dmg, crit: r.crit });
    burst(ex, ey, r.crit ? 11 : 5, r.crit);
    if (r.crit) { shake = 0.25; hitStop = 0.04; PB.audio.crit(); } else PB.audio.hit();
    if (r.combo > 0 && r.combo % 10 === 0) { rings.push({ x: ex, y: ey, r: 14, t: 0.7 }); PB.audio.combo(r.combo); }
    PB.ui.updateCombat();
  }
  function useAbility(slot) {
    if (mode !== "battle" || blocked()) return;
    var res = PB.combat.useAbility(slot);
    if (!res) { PB.audio.nope(); return; }
    var ex = VIEW_W / 2, ey = VIEW_H * 0.34;
    if (res.dmg) { dmgPops.push({ x: ex, y: ey, t: 0.95, dmg: res.dmg, crit: true, label: res.name }); burst(ex, ey, 14, true); shake = 0.3; hitStop = 0.05; }
    else if (res.heal) { dmgPops.push({ x: VIEW_W / 2, y: VIEW_H * 0.62, t: 0.95, heal: true, label: "+" + res.heal }); }
    else { dmgPops.push({ x: ex, y: ey - 30, t: 0.9, buff: true, label: res.icon + " " + res.name + "!" }); }
    PB.ui.updateCombat();
  }
  function fireUlt() {
    if (mode !== "battle" || blocked()) return;
    if (!PB.combat.ultReady()) { PB.audio.nope(); return; }
    var res = PB.combat.ultimate(); if (!res) return;
    var ex = VIEW_W / 2, ey = VIEW_H * 0.34;
    dmgPops.push({ x: ex, y: ey, t: 1.15, dmg: res.dmg, crit: true, ult: true, label: "SWARM" });
    burst(ex, ey, 36, true); shake = 0.55; hitStop = 0.06; flashScreen();
    PB.ui.updateCombat();
  }

  function onCanvasClick(ev) {
    if (blocked()) return;
    if (mode === "catch") {
      var r = canvas.getBoundingClientRect();
      var cx = (ev.clientX - r.left) / r.width * VIEW_W, cy = (ev.clientY - r.top) / r.height * VIEW_H;
      var best = -1, bestD = 1e9;
      for (var i = 0; i < catchSpots.length; i++) { var s = catchSpots[i], d = Math.hypot(cx - s.x, cy - s.y); if (d < s.r && d < bestD) { bestD = d; best = s.slot; } }
      if (best >= 0) startCatch(best);
      else if (PB.bait.anyReady()) startCatch(PB.bait.firstReady());
    } else if (mode === "battle") doAttack();
  }

  // ---- loop ----------------------------------------------------------------
  function loop(ts) { var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0; last = ts; if (mode !== "title") { updatePlay(dt); renderPlay(); } requestAnimationFrame(loop); }

  function updatePlay(dt) {
    if (dt <= 0) return;
    clock += dt;
    var blk = PB.ui.isBlocking() || helpVisible || PB.catching.isActive();
    var simDt = hitStop > 0 ? dt * 0.12 : dt;
    if (hitStop > 0) hitStop = Math.max(0, hitStop - dt);

    PB.bait.update(dt);
    PB.combat.update(simDt);
    if (PB.fx) PB.fx.update(dt);
    if (shake > 0) shake = Math.max(0, shake - dt);

    for (var i = dmgPops.length - 1; i >= 0; i--) { dmgPops[i].t -= dt; dmgPops[i].y -= 60 * dt; if (dmgPops[i].t <= 0) dmgPops.splice(i, 1); }
    for (var j = sparks.length - 1; j >= 0; j--) { var s = sparks[j]; s.t -= dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 520 * dt; if (s.t <= 0) sparks.splice(j, 1); }
    for (var k = rings.length - 1; k >= 0; k--) { rings[k].t -= dt; rings[k].r += 220 * dt; if (rings[k].t <= 0) rings.splice(k, 1); }

    // bars visibility
    PB.ui.showBaitBar(mode === "catch" && !blk);
    PB.ui.showCombatBar(mode === "battle" && !blk && PB.teamBugs().length > 0);

    if (blk) PB.ui.setPrompt(null);
    else if (mode === "catch") {
      PB.ui.refreshBait();
      if (PB.bait.anyReady()) PB.ui.setPrompt("Tap the sparkling bug to catch it! 🪤");
      else if (PB.bait.slots().some(function (_, i) { return PB.bait.isActive(i); })) PB.ui.setPrompt(null);
      else PB.ui.setPrompt("Choose fruit bait below to lure a bug. 🎣");
      PB.scene.updateFoliage(dt, []);
    } else if (mode === "battle") {
      PB.scene.updateFoliage(dt, []);
      PB.ui.updateCombat();
      PB.ui.setPrompt(PB.teamBugs().length ? null : "Add bugs to your team first (Bugs tab)! 🐛");
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
    catchSpots = [];
    var lures = PB.bait.slots(), ready = [];
    for (var i = 0; i < lures.length; i++) if (PB.bait.isReady(i)) ready.push(i);
    if (!ready.length) return;
    for (var n = 0; n < ready.length; n++) {
      var slot = ready[n];
      var frac = ready.length === 1 ? 0.5 : 0.30 + (n / (ready.length - 1)) * 0.40;
      var cx = VIEW_W * frac, cy = VIEW_H * 0.6, bob = Math.sin(clock * 3 + n) * 6;
      var p = lures[slot].pending;
      if (p.sparkle) {
        ctx.save(); ctx.globalAlpha = 0.5 + Math.sin(clock * 5 + n) * 0.3;
        for (var s = 0; s < 6; s++) { var a = clock * 1.5 + s + n; ctx.fillStyle = "#fff6c0"; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * 56, cy - 30 + Math.sin(a) * 38, 3, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
      }
      ctx.fillStyle = "rgba(0,0,0,0.16)"; ctx.beginPath(); ctx.ellipse(cx, cy + 6, 32, 9, 0, 0, Math.PI * 2); ctx.fill();
      PB.art.drawCreature(ctx, p.sid, cx, cy + 6 - bob, 96, false, clock * 8 + n);
      catchSpots.push({ slot: slot, x: cx, y: cy - 30, r: 80 });
    }
  }

  function modBadges(mods) { return mods.map(function (m) { return PB.mods[m].icon; }).join(" "); }

  function drawBattle() {
    var info = PB.combat.info(), e = PB.combat.enemy;
    var ex = VIEW_W / 2, ey = VIEW_H * 0.32;
    var sc = 1 - Math.min(0.24, e.hurt * 0.9), size = e.boss ? 162 : 126;
    ctx.save(); ctx.translate(ex, ey); ctx.scale(sc, 2 - sc); ctx.translate(-ex, -ey);
    ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.beginPath(); ctx.ellipse(ex, ey + size * 0.42, size * 0.5, size * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    if (e.hurt > 0) { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = e.hurt * 2.4; }
    PB.art.drawCreature(ctx, e.sid, ex, ey + size * 0.4, size, false, clock * 6);
    if (e.hurt > 0) ctx.restore();
    ctx.restore();

    // combo rings
    for (var r = 0; r < rings.length; r++) { ctx.globalAlpha = Math.max(0, rings[r].t); ctx.strokeStyle = "#f6c453"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(ex, ey + size * 0.2, rings[r].r, 0, Math.PI * 2); ctx.stroke(); }
    ctx.globalAlpha = 1;

    // enemy bars
    var bw = 320, bx = ex - bw / 2, by = ey - size * 0.58;
    if (info.maxShield > 0) {
      fillRR("rgba(0,0,0,0.25)", bx - 3, by - 22, bw + 6, 14, 7);
      fillRR("#caa23a", bx, by - 21, bw * Math.max(0, info.shield / info.maxShield), 12, 6);
    }
    fillRR("rgba(0,0,0,0.25)", bx - 3, by - 3, bw + 6, 22, 9);
    fillRR("#3a2f25", bx, by, bw, 16, 7);
    fillRR(e.boss ? "#c44fb0" : "#ef6b6b", bx, by, bw * Math.max(0, info.hp / info.max), 16, 7);
    ctx.fillStyle = "#fff"; ctx.font = "bold 15px 'Trebuchet MS',sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText((e.boss ? "👑 " : "") + e.name + "  " + Math.ceil(info.hp) + "/" + info.max, ex, by + 8);
    if (info.mods.length) {
      ctx.font = "16px 'Trebuchet MS',sans-serif";
      ctx.fillText(modBadges(info.mods), ex, by - (info.maxShield > 0 ? 32 : 16));
      ctx.font = "bold 12px 'Trebuchet MS',sans-serif"; ctx.fillStyle = "#ffe3a0";
      ctx.fillText(PB.mods[info.mods[0]].name + ": " + PB.mods[info.mods[0]].blurb, ex, by + 30);
    }

    // your team (bouncing), positioned above the combat bar
    var team = PB.teamBugs();
    var spread = Math.min(78, 360 / Math.max(1, team.length));
    for (var i = 0; i < team.length; i++) {
      var fx = ex - (team.length - 1) * spread / 2 + i * spread, fy = VIEW_H * 0.66 + Math.sin(clock * 5 + i) * 5;
      PB.art.drawCreature(ctx, team[i].sid, fx, fy, 64, false, clock * 2 + i * 9);
    }
    if (!team.length) { ctx.fillStyle = "rgba(74,63,53,0.9)"; ctx.font = "bold 17px 'Trebuchet MS',sans-serif"; ctx.textAlign = "center"; ctx.fillText("No team! Add bugs in the Bugs tab.", ex, VIEW_H * 0.62); }

    // team HP bar
    var tw = 280, tx = ex - tw / 2, ty = VIEW_H * 0.71;
    fillRR("rgba(0,0,0,0.25)", tx - 3, ty - 3, tw + 6, 18, 8);
    fillRR("#3a2f25", tx, ty, tw, 12, 6);
    fillRR(PB.combat.teamFlash > 0 ? "#fff" : (PB.combat.fx.guard > 0 ? "#8fd6ff" : "#7cc36b"), tx, ty, tw * (info.teamMax ? info.teamHp / info.teamMax : 0), 12, 6);
    ctx.fillStyle = "#fff"; ctx.font = "bold 12px 'Trebuchet MS',sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("Team HP " + info.teamHp + "/" + info.teamMax + (PB.combat.fx.guard > 0 ? "  🛡️" : ""), ex, ty + 6);

    // sparks
    for (var sp = 0; sp < sparks.length; sp++) { var pp = sparks[sp]; ctx.globalAlpha = Math.max(0, pp.t * 2); ctx.fillStyle = pp.crit ? "#f6c453" : "#fff3c0"; ctx.beginPath(); ctx.arc(pp.x, pp.y, pp.crit ? 5 : 3, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;

    // damage / labels
    ctx.textAlign = "center";
    for (var d = 0; d < dmgPops.length; d++) {
      var dp = dmgPops[d]; ctx.globalAlpha = Math.max(0, dp.t);
      if (dp.heal) { ctx.font = "bold 24px 'Trebuchet MS',sans-serif"; ctx.lineWidth = 3; ctx.strokeStyle = "#2f7d3a"; ctx.fillStyle = "#bff5c0"; ctx.strokeText(dp.label, dp.x, dp.y); ctx.fillText(dp.label, dp.x, dp.y); continue; }
      if (dp.buff) { ctx.font = "bold 22px 'Trebuchet MS',sans-serif"; ctx.lineWidth = 3; ctx.strokeStyle = "#7a5cc4"; ctx.fillStyle = "#e8dcff"; ctx.strokeText(dp.label, dp.x, dp.y); ctx.fillText(dp.label, dp.x, dp.y); continue; }
      var fsize = dp.ult ? 46 : (24 + Math.min(1, dp.dmg / Math.max(1, info.max)) * 20);
      ctx.font = "bold " + Math.round(fsize) + "px 'Trebuchet MS',sans-serif";
      ctx.lineWidth = 3; ctx.strokeStyle = dp.ult ? "#7a2fb0" : dp.crit ? "#a8521f" : "#b23b3b"; ctx.fillStyle = dp.ult ? "#ffd86b" : dp.crit ? "#f6c453" : "#fff";
      var txt = (dp.label ? dp.label + " " : (dp.crit ? "CRIT " : "")) + dp.dmg;
      ctx.strokeText(txt, dp.x, dp.y); ctx.fillText(txt, dp.x, dp.y);
    }
    ctx.globalAlpha = 1;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

})(window.PB = window.PB || {});
