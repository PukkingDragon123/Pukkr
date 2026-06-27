/* ===========================================================================
   save.js — persistence to localStorage. One slot, auto-saved.
   =========================================================================== */
(function (PB) {
  "use strict";

  var KEY = "pokebug.save.v1";

  PB.save = {
    write: function (state) {
      try {
        localStorage.setItem(KEY, JSON.stringify(state));
        return true;
      } catch (e) { return false; }
    },
    read: function () {
      try {
        var raw = localStorage.getItem(KEY);
        if (!raw) return null;
        var data = JSON.parse(raw);
        return (data && data.meta) ? data : null;
      } catch (e) { return null; }
    },
    exists: function () {
      try { return !!localStorage.getItem(KEY); } catch (e) { return false; }
    },
    clear: function () {
      try { localStorage.removeItem(KEY); } catch (e) {}
    },
  };

})(window.PB = window.PB || {});
