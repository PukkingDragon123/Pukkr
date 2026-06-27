/* ===========================================================================
   terrarium.js — raising bugs at home.
   Move a caught bug into a terrarium pod, feed it to raise its Love, and a
   happy bug slowly drips candy. Fully-loved bugs mature; mature enough and
   those with an evolution line will evolve into their next form.
   =========================================================================== */
(function (PB) {
  "use strict";

  var LOVE_DECAY = 0.05;   // love lost per second (very gentle)
  var BASE_DRIP  = 0.04;   // candy/sec at zero love
  var LOVE_DRIP  = 0.10;   // extra candy/sec at full love (so a loved bug ~8/min)

  PB.terrarium = {
    count: function () { return PB.state.terrarium.length; },
    full: function () { return PB.state.terrarium.length >= PB.terrariumCapacity(); },

    // move a carried bug (by jar index) into a terrarium pod
    intake: function (jarIndex) {
      if (this.full()) return false;
      var bug = PB.collection.removeFromJar(jarIndex);
      if (!bug) return false;
      PB.state.terrarium.push({
        sid: bug.sid, size: bug.size,
        love: 30, growth: 0, candyBuf: 0,
      });
      return true;
    },

    // send a raised bug back to your jars (e.g. to donate the evolved form)
    toJar: function (podIndex) {
      if (PB.collection.jarFull()) return false;
      var pod = PB.state.terrarium[podIndex];
      if (!pod) return false;
      PB.state.terrarium.splice(podIndex, 1);
      PB.state.jar.push({ sid: pod.sid, size: pod.size, day: PB.state.day });
      return true;
    },

    release: function (podIndex) {
      var pod = PB.state.terrarium[podIndex];
      if (!pod) return 0;
      PB.state.terrarium.splice(podIndex, 1);
      var sp = PB.speciesById[pod.sid];
      var refund = Math.max(1, Math.floor(PB.rarity[sp.rarity].value / 2));
      PB.addCandy(refund);
      return refund;
    },

    feed: function (podIndex, feedId) {
      var pod = PB.state.terrarium[podIndex];
      if (!pod) return { ok: false };
      if ((PB.state.feedInv[feedId] || 0) <= 0) return { ok: false, reason: "none" };
      var feed = PB.feeds.filter(function (f) { return f.id === feedId; })[0];
      PB.state.feedInv[feedId] -= 1;
      pod.love += feed.love;
      var result = { ok: true, evolved: null, matured: false };
      while (pod.love >= 100) {
        pod.love -= 65;
        pod.growth += 1;
        result.matured = true;
        var evo = this._tryEvolve(pod);
        if (evo) { result.evolved = evo; break; }
      }
      if (pod.love < 0) pod.love = 0;
      PB.audio.candy();
      return result;
    },

    _tryEvolve: function (pod) {
      var sp = PB.speciesById[pod.sid];
      if (sp.next && pod.growth >= sp.evolveAt) {
        var fromName = sp.name;
        pod.sid = sp.next;
        pod.growth = 0;
        pod.love = 45;
        var ns = PB.speciesById[sp.next];
        pod.size = Math.round(pod.size * (ns.baseSize / sp.baseSize) * 10) / 10;
        var entry = PB.dexEntry(ns.id);
        entry.seen = true; entry.caught += 1;
        if (pod.size > entry.bestSize) entry.bestSize = pod.size;
        PB.audio.evolve();
        return { from: fromName, to: ns.name };
      }
      return null;
    },

    // passive: happy bugs slowly produce candy; love gently fades
    update: function (dt) {
      var pods = PB.state.terrarium, earned = 0;
      for (var i = 0; i < pods.length; i++) {
        var pod = pods[i];
        pod.love = Math.max(0, pod.love - LOVE_DECAY * dt);
        var rate = BASE_DRIP + (pod.love / 100) * LOVE_DRIP;
        pod.candyBuf += rate * dt;
        if (pod.candyBuf >= 1) {
          var whole = Math.floor(pod.candyBuf);
          pod.candyBuf -= whole;
          earned += whole;
        }
      }
      if (earned > 0) PB.addCandy(earned);
      return earned;
    },
  };

})(window.PB = window.PB || {});
