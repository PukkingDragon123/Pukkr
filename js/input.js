/* ===========================================================================
   input.js — keyboard convenience (the game is mostly click/tap/drag).
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
    if (k === "b") { PB.ui.openBag(); return; }
    if (k === "1") PB.main.goLocation("forest");
    else if (k === "2") PB.main.goLocation("garden");
    else if (k === "3") PB.main.goLocation("museum");
    else if (k === "4") PB.main.goLocation("shop");
  }

})(window.PB = window.PB || {});
