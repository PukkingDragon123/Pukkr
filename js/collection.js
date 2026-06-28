/* ===========================================================================
   collection.js — small helpers for letting a creature go.
   =========================================================================== */
(function (PB) {
  "use strict";

  PB.collection = {
    release: function (uid) {
      var b = PB.bag.byUid(uid);
      if (!b) return 0;
      var refund = Math.max(1, Math.floor(PB.bugValue(b) / 2));
      PB.bag.remove(uid);
      PB.addCandy(refund);
      return refund;
    },
  };

})(window.PB = window.PB || {});
