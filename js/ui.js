/* ===========================================================================
   ui.js — DOM interface: HUD, toasts, the catch mini-game overlay, the Garden
   feed-card (tap a jar to feed/display/release), and the Museum bar.
   =========================================================================== */
(function (PB) {
  "use strict";

  var el = {};
  var feedIndex = -1;

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) {
    return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }

  PB.ui = {
    init: function () {
      el.hud = $("hud");
      el.clock = $("clock-text"); el.candy = $("candy-text"); el.dex = $("dex-text");
      el.prompt = $("prompt"); el.toasts = $("toasts");
      el.catchOverlay = $("catch-overlay"); el.catchTitle = $("catch-title");
      el.catchBug = $("catch-bug"); el.catchZone = $("catch-zone");
      el.catchMarker = $("catch-marker"); el.catchAttempts = $("catch-attempts");
      el.feedcard = $("feedcard"); el.feedArt = $("feed-art"); el.feedName = $("feed-name");
      el.feedSub = $("feed-sub"); el.feedLove = $("feed-love"); el.feedFeeds = $("feed-feeds");
      el.museumBar = $("museum-bar"); el.mbInfo = $("mb-info");

      el.catchOverlay.addEventListener("click", function () {
        if (PB.catching.isActive()) PB.catching.strike();
      });
      $("feed-close").addEventListener("click", function () { PB.ui.closeFeedCard(); });
      el.feedcard.addEventListener("click", function (e) { if (e.target === el.feedcard) PB.ui.closeFeedCard(); });
      el.feedFeeds.addEventListener("click", function (e) {
        var b = e.target.closest && e.target.closest("[data-feed]");
        if (b) doFeed(b.getAttribute("data-feed"));
      });
      $("feed-display").addEventListener("click", doDisplay);
      $("feed-release").addEventListener("click", doRelease);
      $("mb-invite").addEventListener("click", doInvite);
    },

    // ---- HUD ---------------------------------------------------------------
    showHUD: function (v) { el.hud.classList.toggle("hidden", !v); },
    updateHUD: function () {
      if (!PB.state) return;
      el.clock.textContent = PB.time.label();
      el.candy.textContent = PB.state.candy;
      el.dex.textContent = PB.museumSpeciesCount() + "/" + PB.species.length;
    },

    setPrompt: function (text) {
      if (!text) { el.prompt.classList.add("hidden"); return; }
      el.prompt.innerHTML = text;
      el.prompt.classList.remove("hidden");
    },

    toast: function (msg, kind) {
      var t = document.createElement("div");
      t.className = "toast" + (kind ? " " + kind : "");
      t.innerHTML = msg;
      el.toasts.appendChild(t);
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 3100);
    },

    // ---- catch overlay -----------------------------------------------------
    openCatch: function (sp, zoneStart, zoneW) {
      el.catchTitle.textContent = "A wild " + sp.name + "!";
      el.catchBug.innerHTML = '<img class="catch-art" src="' + PB.art.creatureURL(sp.id) + '" alt="">';
      this.setCatchZone(zoneStart, zoneW);
      this.setCatchMarker(0);
      el.catchAttempts.textContent = PB.rarity[sp.rarity].star + " " + PB.rarity[sp.rarity].label;
      el.catchOverlay.classList.remove("hidden");
    },
    setCatchZone: function (s, w) { el.catchZone.style.left = (s * 100) + "%"; el.catchZone.style.width = (w * 100) + "%"; },
    setCatchMarker: function (p) { el.catchMarker.style.left = (p * 100) + "%"; },
    setCatchAttempts: function (t) { el.catchAttempts.textContent = t; },
    closeCatch: function () { el.catchOverlay.classList.add("hidden"); },

    // ---- feed card ---------------------------------------------------------
    feedOpen: function () { return !el.feedcard.classList.contains("hidden"); },
    isBlocking: function () { return this.feedOpen(); },

    openFeedCard: function (index) {
      feedIndex = index;
      if (!renderFeed()) return;
      el.feedcard.classList.remove("hidden");
      PB.audio.open();
    },
    closeFeedCard: function () {
      if (!this.feedOpen()) return;
      el.feedcard.classList.add("hidden");
      feedIndex = -1;
      PB.audio.close();
    },

    // ---- museum bar --------------------------------------------------------
    showMuseumBar: function (v) { el.museumBar.classList.toggle("hidden", !v); if (v) this.updateMuseumBar(); },
    updateMuseumBar: function () {
      var tier = PB.museumTier();
      el.mbInfo.innerHTML = "<b>" + esc(tier.name) + "</b> · " + PB.museumSpeciesCount() + "/" + PB.species.length + " on display";
      $("mb-invite").disabled = !PB.museum.canInvite();
    },
  };

  // ---- feed card rendering & actions ---------------------------------------
  function renderFeed() {
    var bug = PB.state.bugs[feedIndex];
    if (!bug) { PB.ui.closeFeedCard(); return false; }
    var sp = PB.speciesById[bug.sid];
    el.feedArt.innerHTML = '<img src="' + PB.art.jarURL(bug.sid) + '" alt="">';
    el.feedName.textContent = sp.name;
    el.feedSub.innerHTML = PB.rarity[sp.rarity].star + " · " + bug.size + " mm · Love " + Math.round(bug.love) + "/100";
    el.feedLove.style.width = Math.min(100, bug.love) + "%";
    el.feedFeeds.innerHTML = PB.feeds.map(function (f) {
      var can = PB.state.candy >= f.cost;
      return '<button class="btn-small honey" data-feed="' + f.id + '"' + (can ? "" : " disabled") + '>' +
        f.icon + " +" + f.love + " <small>" + f.cost + "🍬</small></button>";
    }).join(" ");
    $("feed-display").disabled = PB.museum.has(bug.sid);
    $("feed-display").textContent = PB.museum.has(bug.sid) ? "🏛 Already displayed" : "🏛 Display in Museum";
    return true;
  }

  function doFeed(feedId) {
    var r = PB.raise.feed(feedIndex, feedId);
    if (!r.ok) { if (r.reason === "poor") PB.ui.toast("Not enough candy for that treat.", ""); return; }
    if (r.full) PB.ui.toast("It looks completely content! 💗", "good");
    renderFeed(); PB.ui.updateHUD();
  }
  function doDisplay() {
    var bug = PB.state.bugs[feedIndex];
    if (!bug) return;
    var d = PB.museum.donate(feedIndex);
    if (!d.ok) { if (d.reason === "dup") PB.ui.toast("The museum already displays a " + d.name + ".", ""); return; }
    var msg = "Displayed " + d.name + " in the museum! +" + d.reward + " 🍬";
    if (d.tierUp) msg += "<br>🏛 Your museum is now a " + d.tierUp.name + "!";
    PB.ui.toast(msg, "candy");
    PB.ui.closeFeedCard(); PB.ui.updateHUD();
  }
  function doRelease() {
    var r = PB.collection.release(feedIndex);
    if (r) PB.ui.toast("Released back to the wild for +" + r + " 🍬", "candy");
    PB.ui.closeFeedCard(); PB.ui.updateHUD();
  }
  function doInvite() {
    var v = PB.museum.invite();
    if (!v) { PB.ui.toast("Friends already visited today. Come back tomorrow!", ""); return; }
    v.visits.forEach(function (vis, i) {
      setTimeout(function () {
        PB.ui.toast(vis.friend.emoji + " " + vis.friend.name + " visited! +" + vis.candy + " 🍬", "candy");
      }, i * 350);
    });
    PB.ui.updateMuseumBar(); PB.ui.updateHUD();
  }

})(window.PB = window.PB || {});
