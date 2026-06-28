/* ===========================================================================
   ui.js — DOM interface for the idle RPG: HUD, area bar, bait bar, catch +
   result, the Bugs/team screen, and the Merge Lab.
   =========================================================================== */
(function (PB) {
  "use strict";

  var el = {};
  var baitPhase = "";   // re-render bait bar only when the phase changes
  var labSel = null;    // selected bug uid in the lab

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }
  function stars(n) { var s = ""; for (var i = 0; i < n; i++) s += "⭐"; return s; }
  function art(sid) { return PB.art.creatureThumb(sid); }

  PB.ui = {
    init: function () {
      el.hud = $("hud"); el.tok = $("tok-text"); el.dex = $("dex-text"); el.pow = $("pow-text");
      el.areaBar = $("area-bar"); el.areaName = $("area-name");
      el.prompt = $("prompt"); el.toasts = $("toasts"); el.baitBar = $("bait-bar");
      el.catchOverlay = $("catch-overlay"); el.catchTitle = $("catch-title"); el.catchBug = $("catch-bug");
      el.catchZone = $("catch-zone"); el.catchSweet = $("catch-sweet"); el.catchMarker = $("catch-marker"); el.catchAttempts = $("catch-attempts");
      el.result = $("catch-result");
      el.bugsOverlay = $("bugs-overlay"); el.bugsGrid = $("bugs-grid"); el.bugsNote = $("bugs-note");
      el.labOverlay = $("lab-overlay"); el.labBody = $("lab-body");

      el.catchOverlay.addEventListener("click", function () { if (PB.catching.isActive()) PB.catching.strike(); });
      $("result-ok").addEventListener("click", function () { el.result.classList.add("hidden"); });
      $("bugs-close").addEventListener("click", function () { el.bugsOverlay.classList.add("hidden"); });
      $("lab-close").addEventListener("click", function () { el.labOverlay.classList.add("hidden"); });
      el.baitBar.addEventListener("click", onBaitClick);
      el.bugsGrid.addEventListener("click", onBugsClick);
      el.labBody.addEventListener("click", onLabClick);
      [el.bugsOverlay, el.labOverlay].forEach(function (o) { o.addEventListener("click", function (e) { if (e.target === o) o.classList.add("hidden"); }); });
    },

    // ---- HUD + area --------------------------------------------------------
    showHUD: function (v) { el.hud.classList.toggle("hidden", !v); },
    updateHUD: function () {
      if (!PB.state) return;
      el.tok.textContent = PB.state.tokens;
      el.dex.textContent = PB.dexCount() + "/" + PB.species.length;
      el.pow.textContent = PB.teamAtk();
      el.areaName.textContent = PB.scene.emoji ? PB.scene.emoji() : PB.area().name;
      el.areaName.textContent = PB.area().name;
    },

    setPrompt: function (t) { if (!t) { el.prompt.classList.add("hidden"); return; } el.prompt.innerHTML = t; el.prompt.classList.remove("hidden"); },
    toast: function (msg, kind) { var t = document.createElement("div"); t.className = "toast" + (kind ? " " + kind : ""); t.innerHTML = msg; el.toasts.appendChild(t); setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 3100); },

    showAreaBar: function (v) { el.areaBar.classList.toggle("hidden", !v); },
    showBaitBar: function (v) { el.baitBar.classList.toggle("hidden", !v); if (v) { baitPhase = ""; this.refreshBait(); } },

    // ---- bait bar ----------------------------------------------------------
    refreshBait: function () {
      var phase = PB.bait.ready() ? "ready" : PB.bait.active() ? "wait" : "idle";
      if (phase === baitPhase) { if (phase === "wait") this.tickBait(); return; }
      baitPhase = phase;
      if (phase === "idle") {
        el.baitBar.innerHTML = '<span class="bait-label">🎣 Set bait:</span>' + PB.fruits.map(function (f) {
          return '<button class="bait-fruit" data-fruit="' + f.id + '"><span class="bf-ic">' + f.icon + '</span>' + esc(f.name) + '<small>' + f.wait + 's</small></button>';
        }).join("");
      } else if (phase === "wait") {
        var f = PB.bait.fruitObj();
        el.baitBar.innerHTML = '<span class="bait-label">' + (f ? f.icon : "🍃") + ' Waiting…</span>' +
          '<div class="bait-prog"><span id="bait-fill"></span></div>' +
          '<span id="bait-time" class="bait-time"></span>' +
          '<button class="btn-small honey" data-skip="1">Skip · <span id="bait-skip">?</span>🎟️</button>';
        this.tickBait();
      } else {
        var sp = PB.speciesById[PB.state.pending.sid];
        el.baitBar.innerHTML = '<span class="bait-label">✨ A wild ' + esc(sp.name) + ' appeared!</span>' +
          '<button class="btn-small" data-catchnow="1">Catch it! 🪤</button>';
      }
    },
    tickBait: function () {
      if (baitPhase !== "wait") return;
      var f = PB.bait.fruitObj(), rem = PB.bait.remaining();
      var t = $("bait-time"); if (t) t.textContent = Math.ceil(rem) + "s";
      var fill = $("bait-fill"); if (fill && f) fill.style.width = (100 * (1 - rem / f.wait)) + "%";
      var sk = $("bait-skip"); if (sk) sk.textContent = PB.bait.skipCost();
    },

    // ---- catch overlay -----------------------------------------------------
    openCatch: function (sp, zs, zw, sparkle) {
      el.catchTitle.innerHTML = (sparkle ? "✨ " : "") + "A wild " + esc(sp.name) + "!";
      el.catchBug.innerHTML = '<img class="catch-art" src="' + art(sp.id) + '" alt="">';
      this.setCatchZone(zs, zw); this.setCatchMarker(0);
      el.catchAttempts.textContent = PB.rarity[sp.rarity].star + " " + PB.rarity[sp.rarity].label;
      el.catchOverlay.classList.remove("hidden");
    },
    setCatchZone: function (s, w) { el.catchZone.style.left = (s * 100) + "%"; el.catchZone.style.width = (w * 100) + "%"; var sw = Math.max(0.04, w * 0.22); el.catchSweet.style.left = ((s + w / 2) * 100) + "%"; el.catchSweet.style.width = (sw * 100) + "%"; },
    setCatchMarker: function (p) { el.catchMarker.style.left = (p * 100) + "%"; },
    setCatchAttempts: function (t) { el.catchAttempts.textContent = t; },
    closeCatch: function () { el.catchOverlay.classList.add("hidden"); },

    openCatchResult: function (info) {
      var bug = info.bug, sp = PB.speciesById[bug.sid];
      $("result-banner").textContent = info.acc > 0.85 ? "✨ Perfect catch! ✨" : (info.isNew ? "New discovery!" : "You caught it!");
      $("result-art").innerHTML = '<img class="result-img" src="' + art(bug.sid) + '" alt="">';
      $("result-name").textContent = sp.name;
      var badges = "";
      if (info.isNew) badges += '<span class="rbadge new">NEW!</span>';
      if (bug.talent) badges += '<span class="rbadge tal">' + PB.talents[bug.talent].icon + " " + PB.talents[bug.talent].name + "</span>";
      badges += '<span class="rbadge star">' + PB.rarity[sp.rarity].star + "</span>";
      $("result-badges").innerHTML = badges;
      $("result-size").innerHTML = '<span class="size-label">' + PB.sizeLabel(bug) + '</span><span class="size-mm">' + bug.size + ' mm · ATK ' + PB.bugAtk(bug) + '</span>';
      el.result.classList.remove("hidden");
      PB.audio.candy();
      PB.ui.updateHUD();
    },

    // ---- overlays ----------------------------------------------------------
    anyOverlayOpen: function () { return [el.bugsOverlay, el.labOverlay, el.result].some(function (o) { return !o.classList.contains("hidden"); }); },
    isBlocking: function () { return this.anyOverlayOpen(); },
    closeOverlays: function () { [el.bugsOverlay, el.labOverlay, el.result].forEach(function (o) { o.classList.add("hidden"); }); },

    openBugs: function () { renderBugs(); el.bugsOverlay.classList.remove("hidden"); PB.audio.open(); },
    openLab: function () { labSel = null; renderLab(); el.labOverlay.classList.remove("hidden"); PB.audio.open(); },
  };

  // ---- bait bar actions ----------------------------------------------------
  function onBaitClick(e) {
    var b = e.target.closest && e.target.closest("[data-fruit],[data-skip],[data-catchnow]");
    if (!b) return;
    if (b.hasAttribute("data-fruit")) { PB.bait.set(b.getAttribute("data-fruit")); PB.ui.refreshBait(); }
    else if (b.hasAttribute("data-skip")) { if (PB.bait.skip()) { PB.ui.refreshBait(); PB.ui.updateHUD(); } else PB.ui.toast("Not enough tokens to skip.", ""); }
    else if (b.hasAttribute("data-catchnow")) { PB.main.startCatch(); }
  }

  // ---- bugs / team ---------------------------------------------------------
  function bugCard(b) {
    var sp = PB.speciesById[b.sid], inTeam = PB.inTeam(b.uid);
    var tal = b.talent ? '<span class="card-talent" title="' + esc(PB.talents[b.talent].desc) + '">' + PB.talents[b.talent].icon + "</span>" : "";
    return '<div class="card bug-card' + (inTeam ? " in-team" : "") + (b.talent ? " sparkle" : "") + '" data-uid="' + b.uid + '">' +
      (inTeam ? '<span class="card-badge">TEAM</span>' : "") + tal +
      '<div class="card-art"><img src="' + art(b.sid) + '" alt=""></div>' +
      '<div class="card-name">' + esc(sp.name) + " " + stars(b.tier) + "</div>" +
      '<div class="card-sub">ATK ' + PB.bugAtk(b) + " · " + Math.round(b.size) + " mm</div>" +
      '<button class="card-rel" data-rel="' + b.uid + '" title="Release">✕</button></div>';
  }
  function renderBugs() {
    el.bugsNote.innerHTML = "Tap a bug to add/remove it from your <b>team</b> (max " + PB.config.TEAM_SIZE + "). " +
      "Team: <b>" + PB.teamBugs().length + "/" + PB.config.TEAM_SIZE + "</b> · Power <b>" + PB.teamAtk() + "</b> · HP <b>" + PB.teamMaxHp() + "</b>. ✨ = talent.";
    if (!PB.state.bugs.length) { el.bugsGrid.innerHTML = '<div class="empty-note">No bugs yet — go bait and catch some! 🎣</div>'; return; }
    var sorted = PB.state.bugs.slice().sort(function (a, c) { return PB.bugAtk(c) - PB.bugAtk(a); });
    el.bugsGrid.innerHTML = sorted.map(bugCard).join("");
  }
  function onBugsClick(e) {
    var rel = e.target.closest && e.target.closest("[data-rel]");
    if (rel) { var r = PB.collection.release(parseInt(rel.getAttribute("data-rel"), 10)); if (r) PB.ui.toast("Released for +" + r + " 🎟️", "candy"); renderBugs(); PB.ui.updateHUD(); return; }
    var card = e.target.closest && e.target.closest("[data-uid]");
    if (!card) return;
    var uid = parseInt(card.getAttribute("data-uid"), 10);
    if (!PB.toggleTeam(uid)) PB.ui.toast("Team is full (max " + PB.config.TEAM_SIZE + ").", "");
    else PB.audio.select();
    renderBugs(); PB.ui.updateHUD();
  }

  // ---- lab / merge ---------------------------------------------------------
  function renderLab() {
    if (PB.state.bugs.length < 2) { el.labBody.innerHTML = '<div class="empty-note">Catch at least two of the same bug to merge them here. ⚗️</div>'; return; }
    var note = '<div class="section-note">Merge <b>two of the same species &amp; tier</b> into one bigger, stronger bug. ' +
      (labSel ? "Now pick a glowing partner!" : "Tap a bug to start.") + "</div>";
    var selBug = labSel ? PB.bugByUid(labSel) : null;
    var cards = PB.state.bugs.slice().sort(function (a, c) { return a.sid < c.sid ? -1 : 1; }).map(function (b) {
      var sp = PB.speciesById[b.sid];
      var isSel = labSel === b.uid;
      var isPartner = selBug && PB.merge.canMerge(selBug, b);
      return '<div class="card lab-card' + (isSel ? " lab-sel" : "") + (isPartner ? " lab-partner" : "") + (b.talent ? " sparkle" : "") +
        '" data-uid="' + b.uid + '"><div class="card-art"><img src="' + art(b.sid) + '" alt=""></div>' +
        '<div class="card-name">' + esc(sp.name) + " " + stars(b.tier) + "</div>" +
        '<div class="card-sub">ATK ' + PB.bugAtk(b) + (b.talent ? " · " + PB.talents[b.talent].icon : "") + "</div></div>";
    }).join("");
    el.labBody.innerHTML = note + '<div class="grid">' + cards + "</div>";
  }
  function onLabClick(e) {
    var card = e.target.closest && e.target.closest("[data-uid]");
    if (!card) return;
    var uid = parseInt(card.getAttribute("data-uid"), 10), b = PB.bugByUid(uid);
    if (labSel == null) { labSel = uid; PB.audio.select(); renderLab(); return; }
    if (uid === labSel) { labSel = null; renderLab(); return; }
    var a = PB.bugByUid(labSel);
    if (PB.merge.canMerge(a, b)) {
      var m = PB.merge.merge(labSel, uid);
      labSel = null;
      if (m) { PB.ui.toast("Merged into a " + PB.speciesById[m.sid].name + " " + stars(m.tier) + "!", "good"); }
      renderLab(); PB.ui.updateHUD();
    } else { labSel = uid; PB.audio.select(); renderLab(); }
  }

})(window.PB = window.PB || {});
