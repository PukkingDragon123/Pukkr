/* ===========================================================================
   bag.js — the spatial backpack. Each creature occupies a footprint (fw x fh)
   on a grid. Bigger creatures need more room; the bag can be upgraded.
   =========================================================================== */
(function (PB) {
  "use strict";

  function fp(sid) { var s = PB.speciesById[sid]; return { w: s.fw, h: s.fh }; }

  function buildGrid(ignoreUid) {
    var w = PB.bagW(), h = PB.bagH();
    var g = [];
    for (var y = 0; y < h; y++) { g.push([]); for (var x = 0; x < w; x++) g[y].push(null); }
    PB.state.bugs.forEach(function (b) {
      if (b.uid === ignoreUid) return;
      var f = fp(b.sid);
      for (var yy = 0; yy < f.h; yy++) for (var xx = 0; xx < f.w; xx++) {
        var gx = b.gx + xx, gy = b.gy + yy;
        if (gy >= 0 && gy < h && gx >= 0 && gx < w) g[gy][gx] = b.uid;
      }
    });
    return g;
  }

  function fits(grid, x, y, fw, fh) {
    var w = PB.bagW(), h = PB.bagH();
    if (x < 0 || y < 0 || x + fw > w || y + fh > h) return false;
    for (var yy = 0; yy < fh; yy++) for (var xx = 0; xx < fw; xx++)
      if (grid[y + yy][x + xx] !== null) return false;
    return true;
  }

  PB.bag = {
    footprint: fp,
    grid: buildGrid,
    width: function () { return PB.bagW(); },
    height: function () { return PB.bagH(); },

    // first free slot for a footprint (row-major); null if no room
    findSlot: function (fw, fh, ignoreUid) {
      var grid = buildGrid(ignoreUid), w = PB.bagW(), h = PB.bagH();
      for (var y = 0; y <= h - fh; y++) for (var x = 0; x <= w - fw; x++)
        if (fits(grid, x, y, fw, fh)) return { x: x, y: y };
      return null;
    },

    hasRoomFor: function (sid) { var f = fp(sid); return !!this.findSlot(f.w, f.h); },

    add: function (sid, grow) {
      var f = fp(sid), slot = this.findSlot(f.w, f.h);
      if (!slot) return null;
      var bug = { uid: PB.nextUid(), sid: sid, grow: grow != null ? grow : 0.08, gx: slot.x, gy: slot.y, candyBuf: 0 };
      PB.state.bugs.push(bug);
      return bug;
    },

    byUid: function (uid) {
      for (var i = 0; i < PB.state.bugs.length; i++) if (PB.state.bugs[i].uid === uid) return PB.state.bugs[i];
      return null;
    },

    remove: function (uid) {
      var i = PB.state.bugs.findIndex(function (b) { return b.uid === uid; });
      if (i >= 0) return PB.state.bugs.splice(i, 1)[0];
      return null;
    },

    // try to move a creature to a new top-left cell
    move: function (uid, x, y) {
      var b = this.byUid(uid); if (!b) return false;
      var f = fp(b.sid), grid = buildGrid(uid);
      if (!fits(grid, x, y, f.w, f.h)) return false;
      b.gx = x; b.gy = y; return true;
    },
  };

})(window.PB = window.PB || {});
