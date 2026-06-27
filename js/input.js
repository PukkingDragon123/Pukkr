/* ===========================================================================
   input.js — keyboard handling. Movement keys are read each frame from a
   held-key set; action and menu keys are edge-triggered on key-down.
   =========================================================================== */
(function (PB) {
  "use strict";

  var held = {};

  var LEFT  = { a: 1, arrowleft: 1 };
  var RIGHT = { d: 1, arrowright: 1 };
  var UP    = { w: 1, arrowup: 1 };
  var DOWN  = { s: 1, arrowdown: 1 };
  var ACTION = { " ": 1, e: 1, enter: 1 };
  var MOVE_KEYS = { a:1,d:1,w:1,s:1,arrowleft:1,arrowright:1,arrowup:1,arrowdown:1 };

  function key(e) { return (e.key || "").toLowerCase(); }

  PB.input = {
    init: function () {
      window.addEventListener("keydown", onDown);
      window.addEventListener("keyup", onUp);
      window.addEventListener("blur", function () { held = {}; });
    },
    axis: function () {
      var x = 0, y = 0;
      for (var k in held) {
        if (LEFT[k]) x -= 1; if (RIGHT[k]) x += 1;
        if (UP[k]) y -= 1; if (DOWN[k]) y += 1;
      }
      return { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) };
    },
    clear: function () { held = {}; },

    // ---- used by the on-screen touch controls ----
    hold: function (dir, on) {
      var k = DIRKEY[dir];
      if (!k) return;
      if (on) held[k] = 1; else delete held[k];
    },
    action: doAction,
  };

  var DIRKEY = { up: "arrowup", down: "arrowdown", left: "arrowleft", right: "arrowright" };

  // Action routing shared by the action key and the touch button.
  function doAction() {
    PB.audio.resume();
    if (PB.main.atTitle()) { PB.main.playFromTitle(); return; }
    if (PB.main.helpOpen()) { PB.main.closeHelp(); return; }
    if (PB.catching.isActive()) { PB.catching.strike(); return; }
    if (PB.ui.isMenuOpen()) return; // menus are tapped directly
    PB.main.interact();
  }

  function onUp(e) { delete held[key(e)]; }

  function onDown(e) {
    var k = key(e);
    PB.audio.resume();
    if (PREVENT(k)) e.preventDefault();
    if (e.repeat) return; // movement uses the held set; ignore OS key-repeat

    // Title / help screens are driven by their buttons; allow Enter to play.
    if (PB.main.atTitle()) {
      if (k === "enter") PB.main.playFromTitle();
      return;
    }
    if (PB.main.helpOpen()) {
      if (k === "escape" || k === "enter" || ACTION[k]) PB.main.closeHelp();
      return;
    }

    // Catch mini-game has priority.
    if (PB.catching.isActive()) {
      if (ACTION[k]) PB.catching.strike();
      else if (k === "escape") PB.catching.cancel();
      return;
    }

    // Menu open: Esc closes; letter keys jump between tabs.
    if (PB.ui.isMenuOpen()) {
      if (k === "escape") { PB.ui.closeMenu(); return; }
      var tab = TAB_FOR(k);
      if (tab) PB.ui.openMenu(tab);
      return;
    }

    // In the overworld.
    if (ACTION[k]) { PB.main.interact(); return; }
    if (k === "h" || k === "?") { PB.main.openHelp(); return; }
    var t = TAB_FOR(k);
    if (t) { PB.ui.openMenu(t); return; }
    if (MOVE_KEYS[k]) held[k] = 1;
  }

  function TAB_FOR(k) {
    if (k === "c") return "bugdex";
    if (k === "j") return "jar";
    if (k === "r") return "terrarium";
    if (k === "m") return "museum";
    if (k === "b") return "shop";
    return null;
  }
  function PREVENT(k) {
    return k === " " || k === "arrowup" || k === "arrowdown" || k === "arrowleft" || k === "arrowright";
  }

})(window.PB = window.PB || {});
