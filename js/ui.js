/* ===========================================================================
   ui.js — all DOM user interface: HUD, contextual prompt, toasts, the catch
   mini-game overlay, and the tabbed menu panel (Bugdex / Jar / Raise / Museum
   / Shop). Bug art is rendered from the procedural sprites as data URLs.
   =========================================================================== */
(function (PB) {
  "use strict";

  var el = {};
  var currentTab = "bugdex";
  var menuOpen = false;
  var artCache = {};

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) {
    return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }

  function art(sid, px, discovered) {
    var key = (discovered ? sid : "?") + "@" + px;
    if (artCache[key]) return artCache[key];
    var cv = discovered ? PB.sprites.bugCanvas(sid, px) : PB.sprites.mysteryCanvas(px);
    var url = cv.toDataURL();
    artCache[key] = url;
    return url;
  }

  PB.ui = {
    init: function () {
      el.hud = $("hud");
      el.clock = $("clock-text"); el.candy = $("candy-text");
      el.jar = $("jar-text"); el.net = $("net-text");
      el.prompt = $("prompt"); el.toasts = $("toasts");
      el.catchOverlay = $("catch-overlay");
      el.catchTitle = $("catch-title"); el.catchBug = $("catch-bug");
      el.catchZone = $("catch-zone"); el.catchMarker = $("catch-marker");
      el.catchAttempts = $("catch-attempts");
      el.panel = $("panel"); el.panelTitle = $("panel-title");
      el.panelTabs = $("panel-tabs"); el.panelBody = $("panel-body");

      $("panel-close").addEventListener("click", function () { PB.ui.closeMenu(); });
      el.panel.addEventListener("click", function (e) { if (e.target === el.panel) PB.ui.closeMenu(); });
      el.panelBody.addEventListener("click", onBodyClick);
      // tapping/clicking the catch overlay also swings the net (mouse + touch)
      el.catchOverlay.addEventListener("click", function () {
        if (PB.catching.isActive()) PB.catching.strike();
      });
    },

    // ---- HUD ---------------------------------------------------------------
    showHUD: function (v) { el.hud.classList.toggle("hidden", !v); },
    updateHUD: function () {
      if (!PB.state) return;
      el.clock.textContent = PB.time.label();
      el.candy.textContent = PB.state.candy;
      el.jar.textContent = PB.collection.jarCount() + "/" + PB.jarCapacity();
      el.net.textContent = PB.toolTier("net").name;
      el.jar.parentElement.style.borderColor = PB.collection.jarFull() ? "#d96666" : "";
    },

    // ---- prompt ------------------------------------------------------------
    setPrompt: function (text) {
      if (!text) { el.prompt.classList.add("hidden"); return; }
      el.prompt.innerHTML = text;
      el.prompt.classList.remove("hidden");
    },

    // ---- toasts ------------------------------------------------------------
    toast: function (msg, kind) {
      var t = document.createElement("div");
      t.className = "toast" + (kind ? " " + kind : "");
      t.innerHTML = msg;
      el.toasts.appendChild(t);
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 3100);
    },

    // ---- catch overlay -----------------------------------------------------
    openCatch: function (sp, zoneStart, zoneW, attempts) {
      el.catchTitle.textContent = "A wild " + sp.name + "!";
      el.catchBug.innerHTML = '<img src="' + art(sp.id, 96, true) + '" width="96" height="96" alt="">';
      this.setCatchZone(zoneStart, zoneW);
      this.setCatchMarker(0);
      el.catchAttempts.textContent = PB.rarity[sp.rarity].star + " " + PB.rarity[sp.rarity].label;
      el.catchOverlay.classList.remove("hidden");
    },
    setCatchZone: function (start, w) {
      el.catchZone.style.left = (start * 100) + "%";
      el.catchZone.style.width = (w * 100) + "%";
    },
    setCatchMarker: function (pos) { el.catchMarker.style.left = (pos * 100) + "%"; },
    setCatchAttempts: function (text) { el.catchAttempts.textContent = text; },
    closeCatch: function () { el.catchOverlay.classList.add("hidden"); },

    // ---- menu panel --------------------------------------------------------
    isMenuOpen: function () { return menuOpen; },
    isBlocking: function () { return menuOpen; },

    openMenu: function (tab) {
      currentTab = tab || currentTab || "bugdex";
      menuOpen = true;
      el.panel.classList.remove("hidden");
      PB.audio.open();
      renderTabs();
      this.refresh();
    },
    closeMenu: function () {
      if (!menuOpen) return;
      menuOpen = false;
      el.panel.classList.add("hidden");
      PB.audio.close();
    },
    refresh: function () {
      if (!menuOpen) return;
      this.updateHUD();
      renderTabs();
      var fn = renderers[currentTab];
      el.panelTitle.textContent = TAB_TITLES[currentTab];
      el.panelBody.innerHTML = fn ? fn() : "";
    },
  };

  // ---- tab bar -------------------------------------------------------------
  var TABS = [
    { id: "bugdex", label: "🐛 Bugdex" },
    { id: "jar", label: "🫙 Jar" },
    { id: "terrarium", label: "🌿 Raise" },
    { id: "museum", label: "🏛 Museum" },
    { id: "shop", label: "🛒 Shop" },
  ];
  var TAB_TITLES = {
    bugdex: "Bugdex", jar: "Your Jars", terrarium: "Terrarium",
    museum: "Bug Museum", shop: "Tool Stall",
  };

  function renderTabs() {
    el.panelTabs.innerHTML = TABS.map(function (t) {
      return '<button class="panel-tab' + (t.id === currentTab ? " active" : "") +
        '" data-tab="' + t.id + '">' + t.label + "</button>";
    }).join("");
    var btns = el.panelTabs.querySelectorAll(".panel-tab");
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener("click", function () {
        currentTab = this.getAttribute("data-tab");
        PB.audio.select();
        PB.ui.refresh();
      });
    }
  }

  // ---- delegated actions inside the body ----------------------------------
  function onBodyClick(e) {
    var btn = e.target.closest ? e.target.closest("[data-action]") : null;
    if (!btn) return;
    var action = btn.getAttribute("data-action");
    var idx = parseInt(btn.getAttribute("data-index"), 10);
    var arg = btn.getAttribute("data-arg");
    handleAction(action, idx, arg);
  }

  function handleAction(action, idx, arg) {
    switch (action) {
      case "raise": {
        if (PB.terrarium.full()) { PB.ui.toast("Terrarium is full — upgrade it in the Shop.", ""); break; }
        if (PB.terrarium.intake(idx)) { PB.audio.select(); PB.ui.toast("Moved to your terrarium to raise. 🌱", "good"); }
        break;
      }
      case "release": {
        var r = PB.collection.release(idx);
        if (r) PB.ui.toast("Released for +" + r + " 🍬", "candy");
        break;
      }
      case "feed": {
        var res = PB.terrarium.feed(idx, arg);
        if (!res.ok) { PB.ui.toast("You're out of that food — buy more in the Shop.", ""); break; }
        if (res.evolved) PB.ui.toast("🎉 Your " + res.evolved.from + " evolved into " + res.evolved.to + "!", "good");
        else if (res.matured) PB.ui.toast("It matured! It looks happy and full. 💗", "good");
        break;
      }
      case "tojar": {
        if (PB.terrarium.toJar(idx)) PB.ui.toast("Brought back to your jars.", "");
        else PB.ui.toast("Jars are full!", "");
        break;
      }
      case "release-pod": {
        var rp = PB.terrarium.release(idx);
        if (rp) PB.ui.toast("Released for +" + rp + " 🍬", "candy");
        break;
      }
      case "donate": {
        var d = PB.museum.donateFromJar(idx);
        if (!d.ok) { if (d.reason === "dup") PB.ui.toast("The museum already displays a " + d.name + ".", ""); break; }
        var msg = "Donated " + d.name + "! +" + d.reward + " 🍬";
        if (d.tierUp) msg += "<br>🏛 Your museum is now a " + d.tierUp.name + "!";
        PB.ui.toast(msg, "candy");
        break;
      }
      case "invite": {
        var v = PB.museum.invite();
        if (!v) { PB.ui.toast("Friends already visited today. Come back tomorrow!", ""); break; }
        v.visits.forEach(function (vis, i) {
          setTimeout(function () {
            PB.ui.toast(vis.friend.emoji + " " + vis.friend.name + " visited! +" + vis.candy + " 🍬", "candy");
          }, i * 350);
        });
        break;
      }
      case "buy-tool": {
        var bt = PB.shop.buyTool(arg);
        if (bt.ok) PB.ui.toast("Bought " + bt.tier.name + "! 🎒", "good");
        else if (bt.reason === "poor") PB.ui.toast("Not enough candy yet.", "");
        break;
      }
      case "buy-feed": {
        var qty = parseInt(arg.split(":")[1], 10) || 1;
        var bf = PB.shop.buyFeed(arg.split(":")[0], qty);
        if (bf.ok) PB.ui.toast("Bought " + qty + " food for " + bf.cost + " 🍬", "good");
        else PB.ui.toast("Not enough candy yet.", "");
        break;
      }
    }
    PB.ui.refresh();
    PB.ui.updateHUD();
  }

  // ---- renderers -----------------------------------------------------------
  var renderers = {
    bugdex: function () {
      var caught = PB.collection.caughtSpecies(), seen = PB.collection.seenSpecies(),
          total = PB.collection.totalSpecies();
      var head = '<div class="section-note">Caught <b>' + caught + "</b> · Seen <b>" + seen +
        "</b> · of <b>" + total + "</b> species. Records show your biggest catch.</div>";
      var cards = PB.species.map(function (sp) {
        var e = PB.state.dex[sp.id] || {};
        var discovered = !!e.seen;
        var caughtCount = e.caught || 0;
        var locked = !discovered;
        var sub = locked ? "???" :
          (caughtCount > 0 ? "📏 " + (e.bestSize || 0) + " mm" : "seen only");
        var name = locked ? "???" : sp.name;
        var badge = (caughtCount > 0 && PB.rarity[sp.rarity]) ? PB.rarity[sp.rarity].star : "";
        return '<div class="card' + (locked ? " locked" : "") + '">' +
          (caughtCount > 1 ? '<span class="card-count">×' + caughtCount + "</span>" : "") +
          (badge ? '<span class="card-badge">' + badge + "</span>" : "") +
          '<div class="card-art"><img src="' + art(sp.id, 64, discovered) + '" width="64" height="64" alt=""></div>' +
          '<div class="card-name">' + esc(name) + "</div>" +
          '<div class="card-sub">' + sub + (e.donated ? " · 🏛" : "") + "</div>" +
          "</div>";
      }).join("");
      return head + '<div class="grid">' + cards + "</div>";
    },

    jar: function () {
      var jar = PB.state.jar;
      var head = '<div class="section-note">Carrying <b>' + jar.length + "/" + PB.jarCapacity() +
        "</b> bugs. <b>Raise</b> them at home, <b>donate</b> them at the Museum tab, or <b>release</b> for a little candy.</div>";
      if (!jar.length) return head + '<div class="empty-note">Your jars are empty.<br>Go swing your net at a wild bug! 🪤</div>';
      var rows = jar.map(function (bug, i) {
        var sp = PB.speciesById[bug.sid];
        return row(bug.sid, sp.name, PB.rarity[sp.rarity].label + " · " + bug.size + " mm",
          '<button class="btn-small" data-action="raise" data-index="' + i + '">Raise 🌱</button> ' +
          '<button class="btn-small berry" data-action="release" data-index="' + i + '">Release</button>');
      }).join("");
      return head + rows;
    },

    terrarium: function () {
      var pods = PB.state.terrarium;
      var head = '<div class="section-note">Raising <b>' + pods.length + "/" + PB.terrariumCapacity() +
        "</b> bugs. Feed them to raise <b>Love</b> — happy bugs drip <b>candy</b>, and well-loved bugs can <b>evolve</b>. " +
        "Add bugs from the <b>Jar</b> tab.</div>";
      if (!pods.length) return head + '<div class="empty-note">No bugs are being raised yet.<br>Catch a bug, then press <b>Raise</b> in the Jar tab. 🌿</div>';
      var feedBtns = PB.feeds.map(function (f) { return f; });
      var rows = pods.map(function (pod, i) {
        var sp = PB.speciesById[pod.sid];
        var love = Math.round(pod.love);
        var evoNote = sp.next ? (" · grows " + pod.growth + "/" + sp.evolveAt + " ✨") : " · fully grown";
        var feeds = feedBtns.map(function (f) {
          var have = PB.state.feedInv[f.id] || 0;
          return '<button class="btn-small honey" data-action="feed" data-index="' + i + '" data-arg="' + f.id +
            '"' + (have <= 0 ? " disabled" : "") + ' title="' + esc(f.desc) + '">' +
            f.icon + " +" + f.love + " <small>(" + have + ")</small></button>";
        }).join(" ");
        var main = '<div class="row-title">' + esc(sp.name) + " <small>" + pod.size + " mm</small></div>" +
          '<div class="row-desc">Love ' + love + "/100" + evoNote + "</div>" +
          '<div class="bar love"><span style="width:' + Math.min(100, love) + '%"></span></div>' +
          '<div style="margin-top:6px">' + feeds + "</div>";
        var actions = '<button class="btn-small" data-action="tojar" data-index="' + i + '">→ Jar</button><br><br>' +
          '<button class="btn-small berry" data-action="release-pod" data-index="' + i + '">Release</button>';
        return rowCustom(pod.sid, main, actions);
      }).join("");
      return head + rows;
    },

    museum: function () {
      var tier = PB.museum.tier();
      var next = PB.museum.nextTier();
      var count = PB.museum.speciesCount();
      var canInvite = PB.museum.canInvite();
      var head = '<div class="section-note"><b>' + esc(tier.name) + "</b> — " + esc(tier.blurb) +
        "<br>Exhibits: <b>" + count + "</b>" +
        (next ? " · next rank at <b>" + next.at + "</b> species" : " · top rank reached!") +
        " · Visitors served: <b>" + PB.state.museum.visitorsServed + "</b></div>";
      var invite = '<div class="row"><div class="row-main"><div class="row-title">Open the doors 🎟️</div>' +
        '<div class="row-desc">' + (canInvite
          ? "Invite your friends to visit today. They leave candy — more when your exhibits match the biomes they love!"
          : "Your friends have already visited today. Donate more exhibits and invite them again tomorrow.") +
        '</div></div><div class="row-action"><button class="btn-small honey" data-action="invite"' +
        (canInvite ? "" : " disabled") + '>Welcome visitors</button></div></div>';

      // donate from jar
      var jar = PB.state.jar;
      var donateBlock = "<h3 style='margin:14px 0 8px'>Donate from your jar</h3>";
      if (!jar.length) donateBlock += '<div class="empty-note">No bugs to donate. Catch some first! 🫙</div>';
      else donateBlock += jar.map(function (bug, i) {
        var sp = PB.speciesById[bug.sid];
        var already = PB.museum.has(bug.sid);
        var btn = already
          ? '<button class="btn-small" disabled>Already displayed</button>'
          : '<button class="btn-small" data-action="donate" data-index="' + i + '">Donate 🏛</button>';
        return row(bug.sid, sp.name, PB.rarity[sp.rarity].label + " · " + bug.size + " mm", btn);
      }).join("");

      // exhibits grid
      var donated = PB.state.museum.donated;
      var keys = Object.keys(donated);
      var exhibits = "<h3 style='margin:18px 0 8px'>Exhibits on display</h3>";
      if (!keys.length) exhibits += '<div class="empty-note">No exhibits yet. Your first donation starts the collection! ✨</div>';
      else exhibits += '<div class="grid">' + keys.map(function (sid) {
        var sp = PB.speciesById[sid];
        return '<div class="card"><div class="card-art"><img src="' + art(sid, 64, true) +
          '" width="64" height="64" alt=""></div><div class="card-name">' + esc(sp.name) +
          '</div><div class="card-sub">' + donated[sid].size + " mm</div></div>";
      }).join("") + "</div>";

      return head + invite + donateBlock + exhibits;
    },

    shop: function () {
      var head = '<div class="section-note">You have <b>' + PB.state.candy + " 🍬</b>. Spend candy on better gear and tasty bug food.</div>";
      var toolKeys = ["net", "shoes", "jar", "terrarium", "lure"];
      var tools = toolKeys.map(function (key) {
        var t = PB.tools[key];
        var cur = PB.toolTier(key);
        var nt = PB.shop.nextTier(key);
        var actionDesc, action;
        if (!nt) { actionDesc = "Fully upgraded ✓"; action = '<button class="btn-small" disabled>Max</button>'; }
        else {
          actionDesc = "Next: <b>" + esc(nt.name) + "</b> — " + nt.cost + " 🍬";
          var can = PB.shop.canBuyTool(key);
          action = '<button class="btn-small" data-action="buy-tool" data-arg="' + key + '"' +
            (can ? "" : " disabled") + ">Buy</button>";
        }
        return '<div class="row"><div class="row-art" style="font-size:34px;text-align:center;line-height:56px">' +
          t.icon + '</div><div class="row-main"><div class="row-title">' + esc(t.name) +
          " — " + esc(cur.name) + '</div><div class="row-desc">' + esc(t.desc) + "<br>" + actionDesc +
          '</div></div><div class="row-action">' + action + "</div></div>";
      }).join("");

      var feeds = "<h3 style='margin:16px 0 8px'>Bug food</h3>" + PB.feeds.map(function (f) {
        var have = PB.state.feedInv[f.id] || 0;
        return '<div class="row"><div class="row-art" style="font-size:30px;text-align:center;line-height:56px">' +
          f.icon + '</div><div class="row-main"><div class="row-title">' + esc(f.name) +
          " <small>(you have " + have + ")</small></div><div class=\"row-desc\">" + esc(f.desc) +
          " · +" + f.love + " Love · " + f.cost + ' 🍬 each</div></div><div class="row-action">' +
          '<button class="btn-small honey" data-action="buy-feed" data-arg="' + f.id + ':1"' +
          (PB.state.candy >= f.cost ? "" : " disabled") + '>×1</button> ' +
          '<button class="btn-small honey" data-action="buy-feed" data-arg="' + f.id + ':5"' +
          (PB.state.candy >= f.cost * 5 ? "" : " disabled") + '>×5</button></div></div>';
      }).join("");

      return head + tools + feeds;
    },
  };

  // ---- small html helpers --------------------------------------------------
  function row(sid, title, desc, actionHtml) {
    return '<div class="row"><div class="row-art"><img src="' + art(sid, 56, true) +
      '" width="56" height="56" alt=""></div><div class="row-main"><div class="row-title">' +
      esc(title) + '</div><div class="row-desc">' + desc + '</div></div>' +
      '<div class="row-action">' + actionHtml + "</div></div>";
  }
  function rowCustom(sid, mainHtml, actionHtml) {
    return '<div class="row"><div class="row-art"><img src="' + art(sid, 56, true) +
      '" width="56" height="56" alt=""></div><div class="row-main">' + mainHtml + "</div>" +
      '<div class="row-action" style="text-align:center">' + actionHtml + "</div></div>";
  }

})(window.PB = window.PB || {});
