/* ===========================================================================
   art.js — registry/loader + drawing for creature art.
   Species with hand-drawn files use them; the rest (beach bugs) fall back to
   cute procedural sprites. All drawing adds a gentle squishy squash-stretch.
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
  var imgs = {}, thumbs = {};
  function ready(im) { return im && im.complete && im.naturalWidth > 0; }

  PB.art = {
    preload: function () {
      Object.keys(FILES).forEach(function (sid) {
        ["creature", "jar"].forEach(function (k) { var im = new Image(); im.src = FILES[sid][k]; imgs[sid + ":" + k] = im; });
      });
    },
    has: function (sid) { return !!FILES[sid]; },
    creatureURL: function (sid) { return FILES[sid] ? FILES[sid].creature : null; },
    jarURL: function (sid) { return FILES[sid] ? FILES[sid].jar : null; },
    creatureImg: function (sid) { var im = imgs[sid + ":creature"]; return ready(im) ? im : null; },
    jarImg: function (sid) { var im = imgs[sid + ":jar"]; return ready(im) ? im : null; },

    // a URL usable in an <img> (real file, or a procedural data URL)
    creatureThumb: function (sid) {
      if (FILES[sid]) return FILES[sid].creature;
      var k = "c:" + sid; return thumbs[k] || (thumbs[k] = PB.sprites.bugCanvas(sid, 128).toDataURL());
    },
    jarThumb: function (sid) {
      if (FILES[sid]) return FILES[sid].jar;
      var k = "j:" + sid; return thumbs[k] || (thumbs[k] = PB.sprites.jarCanvas(sid, 128).toDataURL());
    },

    // draw a creature with feet at (cx,cy), squishing as it bobs
    drawCreature: function (ctx, sid, cx, cy, h, faceLeft, t) {
      t = t || 0;
      var sp = PB.speciesById[sid], im = this.creatureImg(sid);
      var sq = 1 + Math.sin(t * 0.16) * 0.08;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale((faceLeft ? -1 : 1) / sq, sq);
      ctx.translate(-cx, -cy);
      if (im) { var w = (im.naturalWidth / im.naturalHeight) * h; ctx.drawImage(im, Math.round(cx - w / 2), Math.round(cy - h), Math.round(w), Math.round(h)); }
      else if (sp && sp.look) { PB.sprites.drawBug(ctx, sp.look, cx, cy - h * 0.5, h, 0); }
      ctx.restore();
      return true;
    },

    // draw a jar with its base at bottomY, wobbling gently
    drawJar: function (ctx, sid, cx, bottomY, h, t) {
      t = t || 0;
      var sq = 1 + Math.sin(t * 0.16 + 1) * 0.05;
      ctx.save();
      ctx.translate(cx, bottomY); ctx.scale(1 / sq, sq); ctx.translate(-cx, -bottomY);
      var im = this.jarImg(sid);
      if (im) { var w = (im.naturalWidth / im.naturalHeight) * h; ctx.drawImage(im, Math.round(cx - w / 2), Math.round(bottomY - h), Math.round(w), Math.round(h)); }
      else {
        var cv = PB.sprites.jarCanvas(sid, 128), ar = cv.width / cv.height, w2 = ar * h;
        ctx.drawImage(cv, Math.round(cx - w2 / 2), Math.round(bottomY - h), Math.round(w2), Math.round(h));
      }
      ctx.restore();
    },
  };

})(window.PB = window.PB || {});
