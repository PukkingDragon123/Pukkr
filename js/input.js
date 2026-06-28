/* ===========================================================================
   input.js — keyboard convenience (the game is mostly tap/click).
   =========================================================================== */
(function (PB) {
  "use strict";

  var ACTION = { " ": 1, e: 1, enter: 1 };
  function key(e) { return (e.key || "").toLowerCase(); }

  PB.input = { init: function () { window.addEventListener("keydown", onDown); } };

  function onDown(e) {
    var k = key(e);
    PB.audio.resume();
    if (k === " ") e.preventDefault();
    if (e.repeat) return;

    if (PB.main.atTitle()) { if (k === "enter") PB.main.playFromTitle(); return; }
    if (PB.main.helpOpen()) { if (k === "escape" || k === "enter" || ACTION[k]) PB.main.closeHelp(); return; }
    if (PB.catching.isActive()) { if (ACTION[k]) PB.catching.strike(); else if (k === "escape") PB.catching.cancel(); return; }
    if (PB.ui.isBlocking()) { if (k === "escape") PB.ui.closeOverlays(); return; }

    if (ACTION[k]) { PB.main.interact(); return; }
    if (k === "h" || k === "?") { PB.main.openHelp(); return; }
    if (k === "1") PB.main.nav("catch");
    else if (k === "2") PB.main.nav("battle");
    else if (k === "3") PB.main.nav("bugs");
    else if (k === "4") PB.main.nav("lab");
  }

})(window.PB = window.PB || {});
