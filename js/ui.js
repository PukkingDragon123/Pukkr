/* ===========================================================================
   ui.js — DOM interface for the idle / gacha RPG: HUD, multi-lure bait bar,
   catch + result, the combat bar (combo / abilities / SWARM), the Bugs/team
   screen, the Merge Lab, the Capsule machine, the Upgrades shop, and Goals.
   =========================================================================== */
(function (PB) {
  "use strict";

  var el = {};
  var baitSig = "";       // re-render bait bar only when slot phases change
  var teamSig = "";       // rebuild ability row only when team changes
  var labA = null, labB = null;
  var lastCombo = 0;

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }
  function stars(n) { var s = ""; for (var i = 0; i < n; i++) s += "⭐"; return s; }
  function art(sid) { return PB.art.creatureThumb(sid); }
  function rarTag(sid) { var r = PB.rarity[PB.speciesById[sid].rarity]; return '<span class="rar" style="background:' + r.col + '">' + r.star + "</span>"; }

  PB.ui = {
    init: function () {
      el.hud = $("hud"); el.tok = $("tok-text"); el.glim = $("glim-text"); el.dex = $("dex-text"); el.pow = $("pow-text");
      el.goalsBtn = $("goals-pill"); el.goalsBadge = $("goals-badge");
      el.areaBar = $("area-bar"); el.areaName = $("area-name");
      el.prompt = $("prompt"); el.toasts = $("toasts"); el.baitBar = $("bait-bar");
      el.combatBar = $("combat-bar"); el.comboTag = $("combo-tag"); el.abilityRow = $("ability-row");
      el.ultBtn = $("ult-btn"); el.ultFill = $("ult-fill"); el.ultLabel = $("ult-label");
      el.catchOverlay = $("catch-overlay"); el.catchTitle = $("catch-title"); el.catchBug = $("catch-bug");
      el.catchZone = $("catch-zone"); el.catchSweet = $("catch-sweet"); el.catchMarker = $("catch-marker"); el.catchAttempts = $("catch-attempts");
      el.result = $("catch-result");
      el.bugsOverlay = $("bugs-overlay"); el.bugsGrid = $("bugs-grid"); el.bugsNote = $("bugs-note");
      el.labOverlay = $("lab-overlay"); el.labBody = $("lab-body");
      el.capOverlay = $("capsule-overlay"); el.capBody = $("capsule-body");
      el.shopOverlay = $("shop-overlay"); el.shopBody = $("shop-body");
      el.questOverlay = $("quests-overlay"); el.questBody = $("quests-body");

      el.catchOverlay.addEventListener("click", function () { if (PB.catching.isActive()) PB.catching.strike(); });
      $("result-ok").addEventListener("click", function () { el.result.classList.add("hidden"); PB.audio.select(); });
      $("bugs-close").addEventListener("click", function () { el.bugsOverlay.classList.add("hidden"); });
      $("lab-close").addEventListener("click", function () { el.labOverlay.classList.add("hidden"); });
      $("capsule-close").addEventListener("click", function () { el.capOverlay.classList.add("hidden"); });
      $("shop-close").addEventListener("click", function () { el.shopOverlay.classList.add("hidden"); });
      $("quests-close").addEventListener("click", function () { el.questOverlay.classList.add("hidden"); });
      el.goalsBtn.addEventListener("click", function () { PB.ui.openQuests(); });

      el.baitBar.addEventListener("click", onBaitClick);
      el.bugsGrid.addEventListener("click", onBugsClick);
      el.labBody.addEventListener("click", onLabClick);
      el.capBody.addEventListener("click", onCapClick);
      el.shopBody.addEventListener("click", onShopClick);
      el.questBody.addEventListener("click", onQuestClick);
      el.abilityRow.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest("[data-ability]"); if (b) PB.main.useAbility(parseInt(b.getAttribute("data-ability"), 10)); });
      el.ultBtn.addEventListener("click", function () { PB.main.fireUlt(); });
      [el.bugsOverlay, el.labOverlay, el.capOverlay, el.shopOverlay, el.questOverlay].forEach(function (o) { o.addEventListener("click", function (e) { if (e.target === o) o.classList.add("hidden"); }); });
    },

    // ---- HUD + area --------------------------------------------------------
    showHUD: function (v) { el.hud.classList.toggle("hidden", !v); },
    updateHUD: function () {
      if (!PB.state) return;
      el.tok.textContent = PB.state.tokens;
      el.glim.textContent = PB.state.glimmer;
      el.dex.textContent = PB.dexCount() + "/" + PB.species.length;
      el.pow.textContent = PB.teamAtk();
      el.areaName.textContent = PB.area().name;
      var rc = PB.quests.readyCount();
      el.goalsBadge.textContent = rc; el.goalsBadge.classList.toggle("hidden", rc === 0);
    },
    flagQuests: function () { this.updateHUD(); },

    setPrompt: function (t) { if (!t) { el.prompt.classList.add("hidden"); return; } el.prompt.innerHTML = t; el.prompt.classList.remove("hidden"); },
    toast: function (msg, kind) { var t = document.createElement("div"); t.className = "toast" + (kind ? " " + kind : ""); t.innerHTML = msg; el.toasts.appendChild(t); setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 3300); },

    showAreaBar: function (v) { el.areaBar.classList.toggle("hidden", !v); },
    showBaitBar: function (v) { var hidden = el.baitBar.classList.contains("hidden"); if (v && hidden) { baitSig = ""; this.refreshBait(); } el.baitBar.classList.toggle("hidden", !v); },

    // ---- bait bar (multi-lure) --------------------------------------------
    refreshBait: function () {
      var lures = PB.bait.slots();
      var sig = PB.lureCount() + "|" + lures.map(function (s, i) { return PB.bait.isReady(i) ? "r" + s.pending.sid : PB.bait.isActive(i) ? "w" : "i"; }).join(",");
      if (sig === baitSig) { this.tickBait(); return; }
      baitSig = sig;
      var rows = "";
      for (var i = 0; i < lures.length; i++) {
        rows += '<div class="lure-slot">' + slotInner(i) + "</div>";
      }
      el.baitBar.innerHTML = rows;
      this.tickBait();
    },
    tickBait: function () {
      var lures = PB.bait.slots();
      for (var i = 0; i < lures.length; i++) {
        if (!PB.bait.isActive(i)) continue;
        var f = PB.bait.fruitOf(i), rem = PB.bait.remaining(i);
        var t = $("bait-time-" + i); if (t) t.textContent = Math.ceil(rem) + "s";
        var fill = $("bait-fill-" + i); if (fill && f) fill.style.width = (100 * (1 - rem / Math.round(f.wait * PB.baitMult()))) + "%";
        var sk = $("bait-skip-" + i); if (sk) sk.textContent = PB.bait.skipCost(i);
      }
    },

    // ---- combat bar (combo / abilities / ult) ------------------------------
    showCombatBar: function (v) { var hidden = el.combatBar.classList.contains("hidden"); if (v && hidden) { teamSig = ""; this.updateCombat(); } el.combatBar.classList.toggle("hidden", !v); },
    buildAbilities: function () {
      var team = PB.teamBugs(), html = "";
      for (var i = 0; i < team.length; i++) {
        var ab = PB.combat.abilityFor(i);
        html += '<button class="ability" data-ability="' + i + '" title="' + esc(ab.name + " — " + ab.desc) + '">' +
          '<span class="ab-veil" id="ab-veil-' + i + '"></span>' +
          '<span class="ab-ic">' + ab.icon + '</span><span class="ab-name">' + esc(ab.name) + "</span></button>";
      }
      if (!team.length) html = '<span class="ab-empty">Add bugs to your team!</span>';
      el.abilityRow.innerHTML = html;
    },
    updateCombat: function () {
      if (el.combatBar.classList.contains("hidden")) return;
      var c = PB.combat, team = PB.teamBugs();
      var sig = team.map(function (b) { return b.uid + ":" + b.talent; }).join(",");
      if (sig !== teamSig) { teamSig = sig; this.buildAbilities(); }
      // combo
      if (c.combo >= 2) {
        el.comboTag.classList.remove("hidden");
        el.comboTag.innerHTML = '🔥 <b>x' + c.combo + "</b>" + (c.fx.frenzy > 0 ? " FRENZY!" : "");
        if (c.combo > lastCombo) { el.comboTag.classList.remove("pulse"); void el.comboTag.offsetWidth; el.comboTag.classList.add("pulse"); }
      } else el.comboTag.classList.add("hidden");
      lastCombo = c.combo;
      // abilities
      for (var i = 0; i < team.length; i++) {
        var ab = PB.combat.abilityFor(i), veil = $("ab-veil-" + i);
        var frac = ab && ab.cd ? Math.max(0, Math.min(1, c.cds[i] / ab.cd)) : 0;
        if (veil) veil.style.height = (frac * 100) + "%";
        var btn = veil && veil.parentNode; if (btn) btn.classList.toggle("cooling", frac > 0);
      }
      // ult
      el.ultFill.style.width = c.ult + "%";
      var ready = c.ult >= 100;
      el.ultBtn.classList.toggle("ready", ready);
      el.ultLabel.textContent = ready ? "SWARM!" : "SWARM " + Math.floor(c.ult) + "%";
    },

    // ---- catch overlay -----------------------------------------------------
    openCatch: function (sp, zs, zw, sparkle, attempts) {
      el.catchTitle.innerHTML = (sparkle ? "✨ " : "") + "A wild " + esc(sp.name) + "!";
      el.catchBug.innerHTML = '<img class="catch-art" src="' + art(sp.id) + '" alt="">';
      this.setCatchZone(zs, zw); this.setCatchMarker(0);
      el.catchAttempts.textContent = PB.rarity[sp.rarity].star + " " + PB.rarity[sp.rarity].label + " · Tries: " + attempts;
      el.catchOverlay.classList.remove("hidden");
    },
    setCatchZone: function (s, w) { el.catchZone.style.left = (s * 100) + "%"; el.catchZone.style.width = (w * 100) + "%"; var sw = Math.max(0.05, w * 0.24); el.catchSweet.style.left = ((s + w / 2) * 100) + "%"; el.catchSweet.style.width = (sw * 100) + "%"; },
    setCatchMarker: function (p) { el.catchMarker.style.left = (p * 100) + "%"; },
    setCatchAttempts: function (t) { el.catchAttempts.textContent = t; },
    closeCatch: function () { el.catchOverlay.classList.add("hidden"); },

    openCatchResult: function (info) {
      var bug = info.bug, sp = PB.speciesById[bug.sid], grade = info.grade || "";
      $("result-banner").textContent = grade === "PERFECT" ? "✨ PERFECT catch! ✨" : (info.isNew ? "New discovery!" : (grade === "GREAT" ? "Great catch!" : "You caught it!"));
      $("result-art").innerHTML = '<img class="result-img" src="' + art(bug.sid) + '" alt="">';
      $("result-name").textContent = sp.name;
      var badges = "";
      if (info.isNew) badges += '<span class="rbadge new">NEW!</span>';
      if (grade) badges += '<span class="rbadge grade ' + grade.toLowerCase() + '">' + grade + "</span>";
      if (bug.talent) badges += '<span class="rbadge tal">' + PB.talents[bug.talent].icon + " " + PB.talents[bug.talent].name + "</span>";
      badges += '<span class="rbadge star">' + PB.rarity[sp.rarity].star + "</span>";
      $("result-badges").innerHTML = badges;
      $("result-size").innerHTML = '<span class="size-label">' + PB.sizeLabel(bug) + '</span><span class="size-mm">' + bug.size + " mm · ATK " + PB.bugAtk(bug) + "</span>";
      el.result.classList.remove("hidden");
      PB.audio.candy();
      PB.ui.updateHUD();
    },

    // ---- overlays ----------------------------------------------------------
    anyOverlayOpen: function () { return [el.bugsOverlay, el.labOverlay, el.result, el.capOverlay, el.shopOverlay, el.questOverlay].some(function (o) { return !o.classList.contains("hidden"); }); },
    isBlocking: function () { return this.anyOverlayOpen(); },
    closeOverlays: function () { [el.bugsOverlay, el.labOverlay, el.result, el.capOverlay, el.shopOverlay, el.questOverlay].forEach(function (o) { o.classList.add("hidden"); }); },

    openBugs: function () { renderBugs(); el.bugsOverlay.classList.remove("hidden"); PB.audio.open(); },
    openLab: function () { labA = null; labB = null; renderLab(); el.labOverlay.classList.remove("hidden"); PB.audio.open(); },
    openCapsule: function () { renderCapsule(""); el.capOverlay.classList.remove("hidden"); PB.audio.open(); },
    openShop: function () { renderShop(); el.shopOverlay.classList.remove("hidden"); PB.audio.open(); },
    openQuests: function () { renderQuests(); el.questOverlay.classList.remove("hidden"); PB.audio.open(); },
  };

  // ---- bait slot markup ----------------------------------------------------
  function slotInner(i) {
    if (PB.bait.isReady(i)) {
      var sp = PB.speciesById[PB.bait.slot(i).pending.sid];
      return '<span class="lure-ready">✨ Wild ' + esc(sp.name) + "!</span>" +
        '<button class="btn-small" data-slot="' + i + '" data-catchnow="1">Catch! 🪤</button>';
    }
    if (PB.bait.isActive(i)) {
      var f = PB.bait.fruitOf(i);
      return '<span class="lure-ic">' + (f ? f.icon : "🍃") + "</span>" +
        '<div class="bait-prog"><span id="bait-fill-' + i + '"></span></div>' +
        '<span id="bait-time-' + i + '" class="bait-time"></span>' +
        '<button class="btn-tiny honey" data-slot="' + i + '" data-skip="1">⏩<span id="bait-skip-' + i + '">?</span>🎟️</button>';
    }
    return '<span class="lure-ic">🎣</span>' + PB.fruits.map(function (f) {
      return '<button class="bait-fruit" data-slot="' + i + '" data-fruit="' + f.id + '"><span class="bf-ic">' + f.icon + "</span>" + esc(f.name) + "<small>" + Math.round(f.wait * PB.baitMult()) + "s</small></button>";
    }).join("");
  }

  function onBaitClick(e) {
    var b = e.target.closest && e.target.closest("[data-fruit],[data-skip],[data-catchnow]");
    if (!b) return;
    var i = parseInt(b.getAttribute("data-slot"), 10);
    if (b.hasAttribute("data-fruit")) { PB.bait.set(i, b.getAttribute("data-fruit")); PB.ui.refreshBait(); }
    else if (b.hasAttribute("data-skip")) { if (PB.bait.skip(i)) { PB.ui.refreshBait(); PB.ui.updateHUD(); } else PB.ui.toast("Not enough tokens to skip.", ""); }
    else if (b.hasAttribute("data-catchnow")) { PB.main.startCatch(i); }
  }

  // ---- bugs / team ---------------------------------------------------------
  function bugCard(b) {
    var sp = PB.speciesById[b.sid], inTeam = PB.inTeam(b.uid);
    var tal = b.talent ? '<span class="card-talent" title="' + esc(PB.talents[b.talent].desc) + '">' + PB.talents[b.talent].icon + "</span>" : "";
    return '<div class="card bug-card' + (inTeam ? " in-team" : "") + (b.talent ? " sparkle" : "") + '" data-uid="' + b.uid + '">' +
      (inTeam ? '<span class="card-badge">TEAM</span>' : "") + tal + rarTag(b.sid) +
      '<div class="card-art"><img src="' + art(b.sid) + '" alt=""></div>' +
      '<div class="card-name">' + esc(sp.name) + " " + stars(b.tier) + "</div>" +
      '<div class="card-sub">ATK ' + PB.bugAtk(b) + " · " + Math.round(b.size) + " mm</div>" +
      '<button class="card-reroll" data-reroll="' + b.uid + '" title="Re-roll talent (8 ✨)">🎲</button>' +
      '<button class="card-rel" data-rel="' + b.uid + '" title="Release for tokens">✕</button></div>';
  }
  function renderBugs() {
    el.bugsNote.innerHTML = "Tap a bug to add/remove it from your <b>team</b> (max " + PB.teamSize() + "). " +
      "Team <b>" + PB.teamBugs().length + "/" + PB.teamSize() + "</b> · Power <b>" + PB.teamAtk() + "</b> · HP <b>" + PB.teamMaxHp() + "</b>. 🎲 re-roll talent (8 ✨), ✕ release.";
    if (!PB.state.bugs.length) { el.bugsGrid.innerHTML = '<div class="empty-note">No bugs yet — go bait & catch some, or pull a capsule! 🎣</div>'; return; }
    var sorted = PB.state.bugs.slice().sort(function (a, c) { return PB.bugAtk(c) - PB.bugAtk(a); });
    el.bugsGrid.innerHTML = sorted.map(bugCard).join("");
  }
  function onBugsClick(e) {
    var rr = e.target.closest && e.target.closest("[data-reroll]");
    if (rr) {
      var u = parseInt(rr.getAttribute("data-reroll"), 10);
      var t = PB.gacha.rerollTalent(u);
      if (t) PB.ui.toast("Re-rolled to " + PB.talents[t].icon + " " + PB.talents[t].name + "!", "good");
      else PB.ui.toast("Need 8 ✨ to re-roll.", "");
      renderBugs(); PB.ui.updateHUD(); return;
    }
    var rel = e.target.closest && e.target.closest("[data-rel]");
    if (rel) { var r = PB.collection.release(parseInt(rel.getAttribute("data-rel"), 10)); if (r) PB.ui.toast("Released for +" + r + " 🎟️", "candy"); renderBugs(); PB.ui.updateHUD(); return; }
    var card = e.target.closest && e.target.closest("[data-uid]");
    if (!card) return;
    var uid = parseInt(card.getAttribute("data-uid"), 10);
    if (!PB.toggleTeam(uid)) PB.ui.toast("Team is full (max " + PB.teamSize() + ").", "");
    else PB.audio.select();
    renderBugs(); PB.ui.updateHUD();
  }

  // ---- lab / merge (station + preview) ------------------------------------
  function labPedestal(slot, bug) {
    if (!bug) return '<div class="lab-ped empty">' + (slot === "A" ? "Pick a bug" : "Pick a match") + "</div>";
    var sp = PB.speciesById[bug.sid];
    return '<div class="lab-ped" data-clearslot="' + slot + '"><div class="card-art"><img src="' + art(bug.sid) + '" alt=""></div>' +
      '<div class="card-name">' + esc(sp.name) + " " + stars(bug.tier) + "</div></div>";
  }
  function renderLab() {
    if (PB.state.bugs.length < 2) { el.labBody.innerHTML = '<div class="empty-note">Catch (or pull) at least two of the same bug to merge them here. ⚗️</div>'; return; }
    var a = labA ? PB.bugByUid(labA) : null, b = labB ? PB.bugByUid(labB) : null;
    if (labA && !a) { labA = null; a = null; } if (labB && !b) { labB = null; b = null; }
    var prev = (a && b) ? PB.merge.preview(a, b) : null;
    var resultCard = prev
      ? '<div class="lab-ped result"><div class="card-art"><img src="' + art(prev.sid) + '" alt=""></div>' +
        '<div class="card-name">' + esc(PB.speciesById[prev.sid].name) + " " + stars(prev.tier) + "</div>" +
        '<div class="card-sub">ATK ' + prev.atk + " · " + Math.round(prev.size) + " mm" + (prev.gainsTalent ? " · maybe a talent!" : "") + "</div></div>"
      : '<div class="lab-ped result ghost">?</div>';
    var station = '<div class="lab-station">' + labPedestal("A", a) +
      '<span class="lab-op">+</span>' + labPedestal("B", b) +
      '<span class="lab-op">=</span>' + resultCard +
      '<button class="btn-primary lab-go" data-merge="1"' + (prev ? "" : " disabled") + '>Merge! ⚗️</button></div>';

    var note = '<div class="section-note">Merge <b>two of the same species &amp; tier</b> into one bigger, stronger bug (+2 ✨). ' +
      (a ? "Now pick a <b>glowing</b> partner." : "Tap a bug to start.") + "</div>";
    var cards = PB.state.bugs.slice().sort(function (x, y) { return x.sid < y.sid ? -1 : x.sid > y.sid ? 1 : x.tier - y.tier; }).map(function (bug) {
      var sp = PB.speciesById[bug.sid];
      var isSel = bug.uid === labA || bug.uid === labB;
      var isPartner = a && !isSel && PB.merge.canMerge(a, bug);
      return '<div class="card lab-card' + (isSel ? " lab-sel" : "") + (isPartner ? " lab-partner" : "") + (bug.talent ? " sparkle" : "") +
        '" data-uid="' + bug.uid + '"><div class="card-art"><img src="' + art(bug.sid) + '" alt=""></div>' +
        '<div class="card-name">' + esc(sp.name) + " " + stars(bug.tier) + "</div>" +
        '<div class="card-sub">ATK ' + PB.bugAtk(bug) + (bug.talent ? " · " + PB.talents[bug.talent].icon : "") + "</div></div>";
    }).join("");
    el.labBody.innerHTML = station + note + '<div class="grid">' + cards + "</div>";
  }
  function onLabClick(e) {
    if (e.target.closest && e.target.closest("[data-merge]")) {
      if (labA && labB) {
        var m = PB.merge.merge(labA, labB);
        if (m) { PB.main.labBurst(); PB.ui.toast("Merged into a " + PB.speciesById[m.sid].name + " " + stars(m.tier) + "! +2 ✨", "good"); labA = m.uid; labB = null; }
      }
      renderLab(); PB.ui.updateHUD(); return;
    }
    var clr = e.target.closest && e.target.closest("[data-clearslot]");
    if (clr) { if (clr.getAttribute("data-clearslot") === "A") { labA = labB; labB = null; } else labB = null; renderLab(); return; }
    var card = e.target.closest && e.target.closest("[data-uid]");
    if (!card) return;
    var uid = parseInt(card.getAttribute("data-uid"), 10);
    if (uid === labA) { labA = labB; labB = null; renderLab(); return; }
    if (uid === labB) { labB = null; renderLab(); return; }
    if (!labA) { labA = uid; PB.audio.select(); }
    else if (PB.merge.canMerge(PB.bugByUid(labA), PB.bugByUid(uid))) { labB = uid; PB.audio.select(); }
    else { labA = uid; labB = null; PB.audio.select(); }
    renderLab();
  }

  // ---- capsule / gacha -----------------------------------------------------
  function renderCapsule(stageHtml) {
    var odds = PB.gachaCfg.odds;
    var oddsLine = "Common " + Math.round(odds.common * 100) + "% · Uncommon " + Math.round(odds.uncommon * 100) +
      "% · Rare " + (odds.rare * 100) + "% · Epic " + (odds.epic * 100) + "%";
    el.capBody.innerHTML =
      '<div class="cap-stage" id="cap-stage">' + (stageHtml || '<div class="cap-machine">🥚</div><div class="cap-tip">Pull a capsule to add a bug straight to your collection!</div>') + "</div>" +
      '<div class="cap-pity">✨ Rare guaranteed in <b>' + PB.gacha.rareIn() + "</b> · Epic in <b>" + PB.gacha.epicIn() + "</b></div>" +
      '<div class="cap-odds">' + oddsLine + "</div>" +
      '<div class="cap-actions">' +
      '<button class="btn-secondary" data-pull="1"' + (PB.gacha.canPull(1) ? "" : " disabled") + ">Pull ×1 · 12 ✨</button>" +
      '<button class="btn-primary" data-pull="10"' + (PB.gacha.canPull(10) ? "" : " disabled") + ">Pull ×10 · 108 ✨</button>" +
      "</div>";
  }
  function capCardHtml(r, small) {
    var sp = PB.speciesById[r.sid], rc = PB.rarity[r.rarity];
    return '<div class="cap-reveal ' + r.rarity + (small ? " mini" : "") + '" style="border-color:' + rc.col + '">' +
      (r.isNew ? '<span class="cap-new">NEW</span>' : "") +
      '<div class="card-art"><img src="' + art(r.sid) + '" alt=""></div>' +
      '<div class="card-name">' + esc(sp.name) + "</div>" +
      '<div class="cap-rar" style="color:' + rc.col + '">' + rc.star + (r.talent ? " " + PB.talents[r.talent].icon : "") + "</div></div>";
  }
  function onCapClick(e) {
    var b = e.target.closest && e.target.closest("[data-pull]");
    if (!b) return;
    var n = parseInt(b.getAttribute("data-pull"), 10);
    if (!PB.gacha.canPull(n)) { PB.ui.toast("Not enough ✨ Glimmer. Win battles to earn more!", ""); PB.audio.nope(); return; }
    var out = PB.gacha.pull(n);
    if (!out) return;
    PB.ui.updateHUD();
    var best = out.results.reduce(function (m, r) { return Math.max(m, ["common", "uncommon", "rare", "epic"].indexOf(r.rarity)); }, 0);
    PB.audio.reveal(best);
    if (n === 1) {
      renderCapsule('<div class="cap-pop">' + capCardHtml(out.results[0], false) + "</div>");
    } else {
      var strip = out.results.map(function (r) { return capCardHtml(r, true); }).join("");
      renderCapsule('<div class="cap-strip">' + strip + "</div>");
    }
  }

  // ---- shop / upgrades -----------------------------------------------------
  function effectText(u) {
    var lv = PB.upLevel(u.key);
    if (u.key === "lures") return "Lures: " + PB.lureCount();
    if (u.key === "comfy") return "Wait −" + Math.round((1 - PB.baitMult()) * 100) + "%";
    if (u.key === "assist") return "Catch assist Lv " + lv;
    if (u.key === "team") return "Team size: " + PB.teamSize();
    if (u.key === "idle") return "Idle +" + Math.round(PB.idleBonus() * 100) + "%";
    if (u.key === "greed") return "Battle +" + Math.round((PB.greedMult() - 1) * 100) + "% 🎟️";
    if (u.key === "luck") return "Crit +" + Math.round(PB.luckCrit() * 100) + "%";
    return "";
  }
  function renderShop() {
    var cards = PB.upgrades.map(function (u) {
      var lv = PB.upLevel(u.key), maxed = PB.upMaxed(u.key), cost = PB.upCost(u.key);
      var afford = cost != null && PB.state.tokens >= cost;
      return '<div class="card shop-card">' +
        '<div class="shop-ic">' + u.icon + "</div>" +
        '<div class="card-name">' + esc(u.name) + "</div>" +
        '<div class="shop-lv">Lv ' + lv + "/" + u.max + "</div>" +
        '<div class="card-sub">' + esc(u.blurb) + "</div>" +
        '<div class="shop-eff">' + effectText(u) + "</div>" +
        (maxed ? '<button class="btn-small" disabled>MAX</button>'
          : '<button class="btn-small ' + (afford ? "" : "poor") + '" data-buy="' + u.key + '">' + cost + " 🎟️</button>") +
        "</div>";
    }).join("");
    el.shopBody.innerHTML = '<div class="section-note">Spend 🎟️ <b>Tokens</b> on permanent boosts. You have <b>' + PB.state.tokens + "</b> 🎟️.</div><div class=\"grid\">" + cards + "</div>";
  }
  function onShopClick(e) {
    var b = e.target.closest && e.target.closest("[data-buy]");
    if (!b) return;
    var key = b.getAttribute("data-buy");
    if (PB.buyUpgrade(key)) { PB.audio.buy(); PB.ui.toast("Upgraded " + PB.upgradeById[key].name + "! " + effectText(PB.upgradeById[key]), "good"); baitSig = ""; teamSig = ""; }
    else { PB.audio.nope(); PB.ui.toast("Not enough 🎟️ Tokens.", ""); }
    renderShop(); PB.ui.updateHUD();
  }

  // ---- quests / goals ------------------------------------------------------
  function renderQuests() {
    var rows = PB.quests.list().map(function (q, i) {
      var rw = q.reward.tokens ? q.reward.tokens + " 🎟️" : q.reward.glimmer + " ✨";
      var pct = Math.min(100, Math.round(100 * q.prog / q.target));
      return '<div class="quest' + (q.done ? " done" : "") + '">' +
        '<div class="quest-top"><span class="quest-text">' + esc(q.text) + "</span><span class=\"quest-rw\">" + rw + "</span></div>" +
        '<div class="quest-bar"><span style="width:' + pct + '%"></span></div>' +
        '<div class="quest-foot"><span>' + Math.min(q.prog, q.target) + "/" + q.target + "</span>" +
        (q.done ? '<button class="btn-small" data-claim="' + i + '">Claim!</button>' : "") + "</div></div>";
    }).join("");
    el.questBody.innerHTML = '<div class="section-note">Finish goals for 🎟️ &amp; ✨. New goals appear as you claim them.</div>' + rows;
  }
  function onQuestClick(e) {
    var b = e.target.closest && e.target.closest("[data-claim]");
    if (!b) return;
    var r = PB.quests.claim(parseInt(b.getAttribute("data-claim"), 10));
    if (r) PB.ui.toast("Goal complete! +" + (r.tokens ? r.tokens + " 🎟️" : r.glimmer + " ✨"), "good");
    renderQuests(); PB.ui.updateHUD();
  }

})(window.PB = window.PB || {});
