/* ===========================================================================
   input.js — keyboard handling for the scene-based game.
   No movement keys (there's no avatar). Action catches the nearest creature;
   letter keys open menus; number keys / g·f hop between locations.
   =========================================================================== */
(function (PB) {
  "use strict";

  var ACTION = { " ": 1, e: 1, enter: 1 };

  function key(e) { return (e.key || "").toLowerCase(); }

  PB.input = {
    init: function () { window.addEventListener("keydown", onDown); },
    action: doAction,
  };

  // Action routing shared by the action key (kept simple and stateful-by-context).
  function doAction() {
    PB.audio.resume();
    if (PB.main.atTitle()) { PB.main.playFromTitle(); return; }
    if (PB.main.helpOpen()) { PB.main.closeHelp(); return; }
    if (PB.catching.isActive()) { PB.catching.strike(); return; }
    if (PB.ui.isMenuOpen()) return;
    PB.main.interact();
  }

  function onDown(e) {
    var k = key(e);
    PB.audio.resume();
    if (k === " ") e.preventDefault();
    if (e.repeat) return;

    if (PB.main.atTitle()) { if (k === "enter") PB.main.playFromTitle(); return; }

    if (PB.main.helpOpen()) {
      if (k === "escape" || k === "enter" || ACTION[k]) PB.main.closeHelp();
      return;
    }

    if (PB.catching.isActive()) {
      if (ACTION[k]) PB.catching.strike();
      else if (k === "escape") PB.catching.cancel();
      return;
    }

    if (PB.ui.isMenuOpen()) {
      if (k === "escape") { PB.ui.closeMenu(); return; }
      var tab = TAB_FOR(k);
      if (tab) PB.ui.openMenu(tab);
      return;
    }

    // in a location
    if (ACTION[k]) { PB.main.interact(); return; }
    if (k === "h" || k === "?") { PB.main.openHelp(); return; }
    if (k === "1" || k === "g") { PB.main.goLocation("garden"); return; }
    if (k === "2" || k === "f") { PB.main.goLocation("forest"); return; }
    var t = TAB_FOR(k);
    if (t) PB.ui.openMenu(t);
  }

  function TAB_FOR(k) {
    if (k === "c") return "bugdex";
    if (k === "j") return "jar";
    if (k === "r") return "terrarium";
    if (k === "m") return "museum";
    if (k === "b") return "shop";
    return null;
  }

})(window.PB = window.PB || {});
