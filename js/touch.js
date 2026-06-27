/* ===========================================================================
   touch.js — on-screen D-pad and action button for phones/tablets.
   Shown only on touch devices; maps to the same input the keyboard drives.
   =========================================================================== */
(function (PB) {
  "use strict";

  function isTouch() {
    return ("ontouchstart" in window) || (navigator.maxTouchPoints || 0) > 0;
  }

  PB.touch = {
    init: function () {
      if (!isTouch()) return;
      var host = document.getElementById("touch");
      if (!host) return;
      host.classList.add("on");

      // direction pad
      var dirs = host.querySelectorAll("[data-dir]");
      for (var i = 0; i < dirs.length; i++) bindDir(dirs[i]);

      // action button
      var act = document.getElementById("tc-act");
      if (act) {
        act.addEventListener("pointerdown", function (e) {
          e.preventDefault();
          PB.input.action();
        });
      }
    },
  };

  function bindDir(btn) {
    var dir = btn.getAttribute("data-dir");
    function down(e) { e.preventDefault(); PB.input.hold(dir, true); }
    function up(e) { if (e) e.preventDefault(); PB.input.hold(dir, false); }
    btn.addEventListener("pointerdown", down);
    btn.addEventListener("pointerup", up);
    btn.addEventListener("pointercancel", up);
    btn.addEventListener("pointerleave", up);
  }

})(window.PB = window.PB || {});
