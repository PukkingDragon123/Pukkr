/* ===========================================================================
   ui.js — all DOM interface and overlays.
   =========================================================================== */
(function (PB) {
  "use strict";

  var el = {};
  var popupUid = -1;
  var BAG_CELL = 50;

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) {
    return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }
  function jarImg(sid) { return '<img src="' + PB.art.jarThumb(sid) + '" alt="">'; }

  // generic pointer-drag with a floating ghost; onDrop(clientX, clientY)
  function dragGhost(startEv, html, onDrop) {
    startEv.preventDefault();
    var g = document.createElement("div");
    g.className = "drag-ghost"; g.innerHTML = html;
    document.body.appendChild(g);
    function move(ev) { g.style.left = ev.clientX + "px"; g.style.top = ev.clientY + "px"; }
    move(startEv);
    function up(ev) {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (g.parentNode) g.parentNode.removeChild(g);
      onDrop(ev.clientX, ev.clientY);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  PB.ui = {
    init: function () {
      el.hud = $("hud");
      el.clock = $("clock-text"); el.candy = $("candy-text"); el.dex = $("dex-text"); el.bag = $("bag-text");
      el.prompt = $("prompt"); el.toasts = $("toasts");
      el.catchOverlay = $("catch-overlay"); el.catchTitle = $("catch-title"); el.catchBug = $("catch-bug");
      el.catchZone = $("catch-zone"); el.catchSweet = $("catch-sweet"); el.catchMarker = $("catch-marker"); el.catchAttempts = $("catch-attempts");
      el.result = $("catch-result");
      el.bagOverlay = $("bag-overlay"); el.bagGrid = $("bag-grid"); el.bagNote = $("bag-note");
      el.shopOverlay = $("shop-overlay"); el.shopBody = $("shop-body");
      el.popup = $("bug-popup"); el.tray = $("garden-tray"); el.trayFoods = $("tray-foods");
      el.gardenUp = $("garden-up"); el.gupBody = $("gup-body");
      el.museumBar = $("museum-bar"); el.mbInfo = $("mb-info");
      el.cardgame = $("cardgame"); el.cardRow = $("card-row"); el.cardResult = $("card-result");

      el.catchOverlay.addEventListener("click", function () { if (PB.catching.isActive()) PB.catching.strike(); });
      $("hud-bag").addEventListener("click", function () { PB.ui.openBag(); });
      $("bag-close").addEventListener("click", function () { el.bagOverlay.classList.add("hidden"); });
      $("shop-close").addEventListener("click", function () { el.shopOverlay.classList.add("hidden"); });
      $("popup-close").addEventListener("click", function () { PB.ui.closePopup(); });
      $("popup-release").addEventListener("click", popupRelease);
      $("gup-close").addEventListener("click", function () { el.gardenUp.classList.add("hidden"); });
      $("garden-upgrade-btn").addEventListener("click", function () { PB.ui.openGardenUpgrade(); });
      $("mb-invite").addEventListener("click", doInvite);
      $("result-ok").addEventListener("click", function () { el.result.classList.add("hidden"); });
      el.shopBody.addEventListener("click", onShopClick);
      [el.bagOverlay, el.shopOverlay, el.popup, el.gardenUp, el.cardgame].forEach(function (ov) {
        ov.addEventListener("click", function (e) { if (e.target === ov) ov.classList.add("hidden"); });
      });
    },

    // ---- HUD ---------------------------------------------------------------
    showHUD: function (v) { el.hud.classList.toggle("hidden", !v); },
    updateHUD: function () {
      if (!PB.state) return;
      el.clock.textContent = PB.time.label();
      el.candy.textContent = PB.state.candy;
      el.dex.textContent = PB.museumSpeciesCount() + "/" + PB.species.length;
      var used = 0; PB.state.bugs.forEach(function (b) { var f = PB.bag.footprint(b.sid); used += f.w * f.h; });
      el.bag.textContent = used + "/" + (PB.bagW() * PB.bagH());
    },
    setPrompt: function (t) { if (!t) { el.prompt.classList.add("hidden"); return; } el.prompt.innerHTML = t; el.prompt.classList.remove("hidden"); },
    toast: function (msg, kind) {
      var t = document.createElement("div"); t.className = "toast" + (kind ? " " + kind : ""); t.innerHTML = msg;
      el.toasts.appendChild(t);
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 3100);
    },

    anyOverlayOpen: function () {
      return [el.bagOverlay, el.shopOverlay, el.popup, el.gardenUp, el.cardgame, el.result].some(function (o) { return !o.classList.contains("hidden"); });
    },
    isBlocking: function () { return this.anyOverlayOpen(); },
    closeOverlays: function () { [el.bagOverlay, el.shopOverlay, el.popup, el.gardenUp, el.cardgame, el.result].forEach(function (o) { o.classList.add("hidden"); }); },

    // ---- catch overlay -----------------------------------------------------
    openCatch: function (sp, zs, zw) {
      el.catchTitle.textContent = "A wild " + sp.name + "!";
      el.catchBug.innerHTML = '<img class="catch-art" src="' + PB.art.creatureThumb(sp.id) + '" alt="">';
      this.setCatchZone(zs, zw); this.setCatchMarker(0);
      el.catchAttempts.textContent = PB.rarity[sp.rarity].star + " " + PB.rarity[sp.rarity].label;
      el.catchOverlay.classList.remove("hidden");
    },
    setCatchZone: function (s, w) {
      el.catchZone.style.left = (s * 100) + "%"; el.catchZone.style.width = (w * 100) + "%";
      var sweetW = Math.max(0.04, w * 0.22);
      el.catchSweet.style.left = ((s + w / 2) * 100) + "%";
      el.catchSweet.style.width = (sweetW * 100) + "%";
    },
    setCatchMarker: function (p) { el.catchMarker.style.left = (p * 100) + "%"; },
    setCatchAttempts: function (t) { el.catchAttempts.textContent = t; },
    closeCatch: function () { el.catchOverlay.classList.add("hidden"); },

    // ---- "you caught it!" result + size screen ----------------------------
    openCatchResult: function (info) {
      var bug = info.bug, sp = PB.speciesById[bug.sid];
      $("result-banner").textContent = info.acc > 0.85 ? "✨ Perfect catch! ✨" : (info.isNew ? "New discovery!" : "You caught it!");
      $("result-art").innerHTML = '<img class="result-img" src="' + PB.art.creatureThumb(bug.sid) + '" alt="">';
      $("result-name").textContent = sp.name;
      var badges = "";
      if (info.isNew) badges += '<span class="rbadge new">NEW!</span>';
      if (info.isRecord) badges += '<span class="rbadge rec">📏 RECORD</span>';
      badges += '<span class="rbadge star">' + PB.rarity[sp.rarity].star + " " + PB.rarity[sp.rarity].label + "</span>";
      $("result-badges").innerHTML = badges;
      $("result-size").innerHTML = '<span class="size-label">' + PB.sizeLabel(bug) + '</span><span class="size-mm">' + PB.sizeOf(bug) + ' mm</span>';
      $("result-candy").innerHTML = "+" + info.candy + " 💰 catch bonus";
      el.result.classList.remove("hidden");
      PB.audio.candy();
    },

    // ---- backpack ----------------------------------------------------------
    openBag: function () { renderBag(); el.bagOverlay.classList.remove("hidden"); PB.audio.open(); },
    closeBag: function () { el.bagOverlay.classList.add("hidden"); },

    // ---- shop --------------------------------------------------------------
    openShop: function () { renderShop(); el.shopOverlay.classList.remove("hidden"); PB.audio.open(); },

    // ---- creature popup ----------------------------------------------------
    openPopup: function (uid) { popupUid = uid; if (renderPopup()) { el.popup.classList.remove("hidden"); PB.audio.open(); } },
    closePopup: function () { el.popup.classList.add("hidden"); popupUid = -1; },

    // ---- garden tray + upgrade --------------------------------------------
    showTray: function (v) { el.tray.classList.toggle("hidden", !v); if (v) renderTray(); },
    refreshTray: function () { if (!el.tray.classList.contains("hidden")) renderTray(); },
    openGardenUpgrade: function () { renderGardenUp(); el.gardenUp.classList.remove("hidden"); PB.audio.open(); },

    // ---- museum bar --------------------------------------------------------
    showMuseumBar: function (v) { el.museumBar.classList.toggle("hidden", !v); if (v) this.updateMuseumBar(); },
    updateMuseumBar: function () {
      var t = PB.museumTier();
      var open = PB.museum.canOpen();
      el.mbInfo.innerHTML = "<b>" + esc(t.name) + "</b> · " + PB.state.bugs.length + " jars" +
        (open ? " · earns <b>" + PB.museum.estimate() + " 💰</b>" : " · come back tomorrow");
      $("mb-invite").disabled = !open;
    },

    // ---- shrine card game --------------------------------------------------
    openCardGame: function () {
      el.cardResult.textContent = "";
      el.cardRow.innerHTML = "";
      for (var i = 0; i < 3; i++) {
        var c = document.createElement("button");
        c.className = "charm-card"; c.textContent = "❓";
        c.addEventListener("click", pickCard);
        el.cardRow.appendChild(c);
      }
      el.cardgame.classList.remove("hidden");
    },
  };

  // ---- backpack rendering + drag ------------------------------------------
  function renderBag() {
    var w = PB.bagW(), h = PB.bagH();
    el.bagNote.innerHTML = "Your <b>" + PB.bagTier().name + "</b> (" + w + "×" + h +
      "). Drag a jar to tidy it; tap one for actions. Upgrade in the Shop. 🎒";
    el.bagGrid.style.width = (w * BAG_CELL) + "px";
    el.bagGrid.style.height = (h * BAG_CELL) + "px";
    el.bagGrid.innerHTML = "";
    var x, y;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      var cell = document.createElement("div"); cell.className = "bag-cell";
      cell.style.left = (x * BAG_CELL) + "px"; cell.style.top = (y * BAG_CELL) + "px";
      cell.style.width = (BAG_CELL - 2) + "px"; cell.style.height = (BAG_CELL - 2) + "px";
      el.bagGrid.appendChild(cell);
    }
    PB.state.bugs.forEach(function (b) {
      var f = PB.bag.footprint(b.sid);
      var tile = document.createElement("div"); tile.className = "bag-tile";
      tile.style.left = (b.gx * BAG_CELL) + "px"; tile.style.top = (b.gy * BAG_CELL) + "px";
      tile.style.width = (f.w * BAG_CELL - 4) + "px"; tile.style.height = (f.h * BAG_CELL - 4) + "px";
      tile.innerHTML = jarImg(b.sid);
      attachBagDrag(tile, b);
      el.bagGrid.appendChild(tile);
    });
  }

  function attachBagDrag(tile, bug) {
    tile.addEventListener("pointerdown", function (e) {
      var sx = e.clientX, sy = e.clientY, moved = false;
      dragGhost(e, jarImg(bug.sid), function (cx, cy) {
        if (!moved) { PB.ui.openPopup(bug.uid); return; } // a tap → actions
        var r = el.bagGrid.getBoundingClientRect();
        var gx = Math.round((cx - r.left - BAG_CELL / 2) / BAG_CELL);
        var gy = Math.round((cy - r.top - BAG_CELL / 2) / BAG_CELL);
        PB.bag.move(bug.uid, gx, gy);
        renderBag();
      });
      function track(ev) { if (Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) > 6) { moved = true; window.removeEventListener("pointermove", track); } }
      window.addEventListener("pointermove", track);
      window.addEventListener("pointerup", function once() { window.removeEventListener("pointermove", track); window.removeEventListener("pointerup", once); });
    });
  }

  // ---- shop ----------------------------------------------------------------
  function renderShop() {
    var head = '<div class="section-note">You have <b>' + PB.state.candy + " 💰</b>. Spend it on better gear and food.</div>";
    var ticket;
    if (PB.state.flags.beachUnlocked) {
      ticket = row(PB.ticket.icon, PB.ticket.name + " — Beach unlocked ✓", "The Beach is open! Visit it from the bottom bar. 🏖️",
        '<button class="btn-small" disabled>Owned</button>');
    } else {
      ticket = row(PB.ticket.icon, PB.ticket.name, PB.ticket.desc + "<br>Cost: <b>" + PB.ticket.cost + " 💰</b>",
        '<button class="btn-small honey" data-ticket="1"' + (PB.state.candy >= PB.ticket.cost ? "" : " disabled") + ">Buy</button>");
    }
    var gear = ["net", "bag"].map(function (key) {
      var u = PB.upgrades[key], cur = (key === "net" ? PB.netTier() : PB.bagTier());
      var nt = PB.shop.nextTier(key), action, line;
      if (!nt) { line = "Fully upgraded ✓"; action = '<button class="btn-small" disabled>Max</button>'; }
      else { line = "Next: <b>" + esc(nt.name) + "</b> — " + nt.cost + " 💰";
        action = '<button class="btn-small" data-buy="' + key + '"' + (PB.shop.canBuy(key) ? "" : " disabled") + ">Buy</button>"; }
      return row(u.icon, u.name + " — " + cur.name, u.desc + "<br>" + line, action);
    }).join("");
    var food = "<h3 style='margin:14px 0 8px'>Food (drag onto creatures in the Garden)</h3>" + PB.feeds.map(function (f) {
      var have = PB.state.food[f.id] || 0;
      return row(f.icon, f.name + " <small>(have " + have + ")</small>",
        "+" + Math.round(f.grow * 100) + "% grow · " + f.cost + " 💰 each",
        '<button class="btn-small honey" data-food="' + f.id + ':1"' + (PB.state.candy >= f.cost ? "" : " disabled") + '>×1</button> ' +
        '<button class="btn-small honey" data-food="' + f.id + ':5"' + (PB.state.candy >= f.cost * 5 ? "" : " disabled") + '>×5</button>');
    }).join("");
    el.shopBody.innerHTML = head + ticket + gear + food;
  }
  function onShopClick(e) {
    var b = e.target.closest && e.target.closest("[data-buy],[data-food],[data-ticket]");
    if (!b) return;
    if (b.hasAttribute("data-ticket")) {
      var rt = PB.shop.buyTicket();
      if (rt.ok) PB.ui.toast("✈️ Plane ticket bought! The Beach is now open. 🏖️", "good");
      else if (rt.reason === "poor") PB.ui.toast("Not enough money yet.", "");
    } else if (b.hasAttribute("data-buy")) {
      var r = PB.shop.buy(b.getAttribute("data-buy"));
      if (r.ok) PB.ui.toast("Bought " + r.tier.name + "! 🎉", "good");
      else if (r.reason === "poor") PB.ui.toast("Not enough money yet.", "");
    } else {
      var p = b.getAttribute("data-food").split(":"), q = parseInt(p[1], 10) || 1;
      var rf = PB.shop.buyFood(p[0], q);
      if (rf.ok) PB.ui.toast("Bought " + q + " food for " + rf.cost + " 💰", "good");
      else PB.ui.toast("Not enough money yet.", "");
    }
    renderShop(); PB.ui.updateHUD();
  }

  // ---- creature popup ------------------------------------------------------
  function renderPopup() {
    var b = PB.bag.byUid(popupUid);
    if (!b) { PB.ui.closePopup(); return false; }
    var sp = PB.speciesById[b.sid];
    $("popup-art").innerHTML = jarImg(b.sid);
    $("popup-name").textContent = sp.name;
    $("popup-sub").innerHTML = PB.rarity[sp.rarity].star + " · " + PB.sizeOf(b) + " mm · worth " + PB.bugValue(b) + " 💰";
    $("popup-grow").style.width = Math.round(b.grow * 100) + "%";
    return true;
  }
  function popupRelease() {
    var r = PB.collection.release(popupUid);
    if (r) PB.ui.toast("Released for +" + r + " 💰", "candy");
    PB.ui.closePopup(); PB.ui.updateHUD();
  }

  // ---- garden food tray (drag to feed) ------------------------------------
  function renderTray() {
    el.trayFoods.innerHTML = PB.feeds.map(function (f) {
      var have = PB.state.food[f.id] || 0;
      return '<div class="food-chip' + (have ? "" : " empty") + '" data-food="' + f.id + '">' +
        '<span class="food-icon">' + f.icon + "</span><span class='food-n'>" + have + "</span></div>";
    }).join("");
    Array.prototype.forEach.call(el.trayFoods.querySelectorAll(".food-chip"), function (chip) {
      var id = chip.getAttribute("data-food");
      chip.addEventListener("pointerdown", function (e) {
        if ((PB.state.food[id] || 0) <= 0) { PB.ui.toast("You're out of that food — buy more in the Shop.", ""); return; }
        var f = PB.feeds.filter(function (x) { return x.id === id; })[0];
        dragGhost(e, '<div class="food-chip big"><span class="food-icon">' + f.icon + "</span></div>", function (cx, cy) {
          PB.main.feedDropAt(cx, cy, id);
        });
      });
    });
  }

  function renderGardenUp() {
    var cur = PB.gardenTier(), nt = PB.shop.nextTier("garden");
    var html = '<div class="feed-name">🌱 Garden Care</div>' +
      '<div class="feed-sub">Current: <b>' + esc(cur.name) + "</b> — creatures grow ×" + cur.growth + " faster</div>";
    if (!nt) html += '<p style="margin:14px 0">Your garden is as lush as it gets! 🌸</p>';
    else {
      html += '<p style="margin:14px 0 10px">Next: <b>' + esc(nt.name) + "</b> — grow ×" + nt.growth +
        " faster<br>Cost: " + nt.cost + " 💰</p>" +
        '<button class="btn-primary" id="gup-buy"' + (PB.shop.canBuy("garden") ? "" : " disabled") + ">Upgrade</button>";
    }
    el.gupBody.innerHTML = html;
    var btn = $("gup-buy");
    if (btn) btn.addEventListener("click", function () {
      var r = PB.shop.buy("garden");
      if (r.ok) { PB.ui.toast("Garden upgraded to " + r.tier.name + "! 🌷", "good"); renderGardenUp(); PB.ui.updateHUD(); }
      else PB.ui.toast("Not enough money yet.", "");
    });
  }

  function doInvite() {
    var v = PB.museum.openDoors();
    if (!v) { PB.ui.toast("The museum's open for today — come back tomorrow!", ""); return; }
    PB.ui.toast("🏛 Visitors loved your " + v.count + " jars! +" + v.money + " 💰", "candy");
    PB.ui.updateMuseumBar(); PB.ui.updateHUD();
  }

  function pickCard(e) {
    if (e.currentTarget.disabled) return;
    Array.prototype.forEach.call(el.cardRow.children, function (c) { c.disabled = true; });
    var rew = PB.forest.cardReward();
    var card = e.currentTarget;
    if (rew.type === "candy") { card.textContent = "💰"; el.cardResult.innerHTML = "You won <b>+" + rew.n + " 💰</b>!"; }
    else if (rew.type === "item") { card.textContent = rew.feed.icon; el.cardResult.innerHTML = "You won <b>" + rew.qty + "× " + esc(rew.feed.name) + "</b>!"; }
    else { card.textContent = "🍂"; el.cardResult.innerHTML = "Aw, just a leaf. Better luck next time!"; }
    PB.audio.candy();
    PB.ui.updateHUD();
    setTimeout(function () { el.cardgame.classList.add("hidden"); }, 1400);
  }

  // ---- small html helper ---------------------------------------------------
  function row(icon, title, desc, action) {
    return '<div class="row"><div class="row-art" style="font-size:30px;align-items:center">' + icon +
      '</div><div class="row-main"><div class="row-title">' + title + '</div><div class="row-desc">' + desc +
      "</div></div><div class=\"row-action\">" + action + "</div></div>";
  }

})(window.PB = window.PB || {});
