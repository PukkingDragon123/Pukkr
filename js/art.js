/* ===========================================================================
   art.js — registry + loader for the hand-drawn creature art.
   A handful of species ship with painterly art (a "creature" cut-out for the
   wild/overworld + catch screen, and a "creature in a jar" piece for the
   collection screens). Everything else falls back to procedural sprites, and
   procedural creatures get a drawn glass jar so the collection stays cohesive.
   =========================================================================== */
(function (PB) {
  "use strict";

  var FILES = {
    caterpie: { creature: "assets/creatures/caterpie.png", jar: "assets/jars/caterpie.png" },
    weedle:   { creature: "assets/creatures/weedle.png",   jar: "assets/jars/weedle.png" },
    paras:    { creature: "assets/creatures/paras.png",    jar: "assets/jars/paras.png" },
    shuckle:  { creature: "assets/creatures/shuckle.png",  jar: "assets/jars/shuckle.png" },
    wimpod:   { creature: "assets/creatures/wimpod.png",   jar: "assets/jars/wimpod.png" },
  };

  var imgs = {}; // "<sid>:<kind>" -> HTMLImageElement

  function ready(im) { return im && im.complete && im.naturalWidth > 0; }

  PB.art = {
    preload: function () {
      Object.keys(FILES).forEach(function (sid) {
        ["creature", "jar"].forEach(function (kind) {
          var im = new Image();
          im.src = FILES[sid][kind];
          imgs[sid + ":" + kind] = im;
        });
      });
    },

    has: function (sid) { return !!FILES[sid]; },
    creatureURL: function (sid) { return FILES[sid] ? FILES[sid].creature : null; },
    jarURL: function (sid) { return FILES[sid] ? FILES[sid].jar : null; },
    creatureImg: function (sid) { var im = imgs[sid + ":creature"]; return ready(im) ? im : null; },
    jarImg: function (sid) { var im = imgs[sid + ":jar"]; return ready(im) ? im : null; },

    // Draw a hand-drawn creature cut-out centred on cx with its feet at cy.
    // Returns false if the image isn't available so the caller can fall back.
    drawCreature: function (ctx, sid, cx, cy, h, faceLeft) {
      var im = this.creatureImg(sid);
      if (!im) return false;
      var w = (im.naturalWidth / im.naturalHeight) * h;
      ctx.save();
      if (faceLeft) { ctx.translate(cx, 0); ctx.scale(-1, 1); ctx.translate(-cx, 0); }
      ctx.drawImage(im, Math.round(cx - w / 2), Math.round(cy - h), Math.round(w), Math.round(h));
      ctx.restore();
      return true;
    },
  };

})(window.PB = window.PB || {});
