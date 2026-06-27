/* ===========================================================================
   audio.js — tiny procedural sound using the Web Audio API.
   No audio files: every sound is synthesised on the fly so the game stays
   fully self-contained. Sound is gentle and cozy, and can be muted.
   =========================================================================== */
(function (PB) {
  "use strict";

  var ctx = null;
  var master = null;
  var muted = false;

  function ensure() {
    if (ctx) return ctx;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch (e) { ctx = null; }
    return ctx;
  }

  // A soft sine/triangle blip with a quick decay envelope.
  function blip(freq, dur, type, vol, when) {
    if (muted) return;
    var c = ensure();
    if (!c) return;
    when = when || 0;
    var t = c.currentTime + when;
    var osc = c.createOscillator();
    var g = c.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.18, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.15));
    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + (dur || 0.15) + 0.02);
  }

  // A short rising/falling arpeggio for happy moments.
  function arp(freqs, step, type, vol) {
    freqs.forEach(function (f, i) { blip(f, step * 1.4, type || "triangle", vol || 0.16, i * step); });
  }

  PB.audio = {
    resume: function () { var c = ensure(); if (c && c.state === "suspended") c.resume(); },
    setMuted: function (m) { muted = m; },
    isMuted: function () { return muted; },

    step:    function () { blip(170 + Math.random() * 20, 0.06, "sine", 0.05); },
    swing:   function () { blip(520, 0.08, "triangle", 0.14); blip(360, 0.1, "sine", 0.1, 0.04); },
    select:  function () { blip(660, 0.07, "square", 0.1); },
    open:    function () { arp([520, 660], 0.07, "triangle", 0.12); },
    close:   function () { blip(440, 0.08, "sine", 0.1); blip(330, 0.1, "sine", 0.08, 0.05); },
    fail:    function () { blip(220, 0.18, "sawtooth", 0.12); blip(160, 0.22, "sine", 0.1, 0.06); },
    catch:   function () { arp([523, 659, 784, 1047], 0.09, "triangle", 0.16); },
    candy:   function () { arp([784, 988], 0.06, "square", 0.1); },
    evolve:  function () { arp([523, 659, 784, 1047, 1319], 0.11, "triangle", 0.17); },
    donate:  function () { arp([659, 784, 988], 0.1, "sine", 0.15); },
    visitor: function () { arp([880, 1175], 0.08, "triangle", 0.12); },
  };

})(window.PB = window.PB || {});
