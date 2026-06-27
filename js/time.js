/* ===========================================================================
   time.js — in-game clock and day/night cycle.
   A full day lasts config.DAY_LENGTH_SEC real seconds. The sky tint shifts
   smoothly through morning, day, evening and night.
   =========================================================================== */
(function (PB) {
  "use strict";

  PB.time = {
    // advance the clock by dt seconds; returns true when a new day begins.
    tick: function (dt) {
      var s = PB.state, cfg = PB.config;
      s.timeSec += dt;
      var newDay = false;
      while (s.timeSec >= cfg.DAY_LENGTH_SEC) {
        s.timeSec -= cfg.DAY_LENGTH_SEC;
        s.day += 1;
        s.stats.daysPlayed = s.day;
        newDay = true;
      }
      return newDay;
    },

    hour: function () {
      return (PB.state.timeSec / PB.config.DAY_LENGTH_SEC) * 24;
    },

    label: function () {
      var h = this.hour();
      var hh = Math.floor(h);
      var mm = Math.floor((h - hh) * 60);
      var ampm = hh < 12 ? "am" : "pm";
      var disp = hh % 12; if (disp === 0) disp = 12;
      return "Day " + PB.state.day + " · " + disp + ":" + (mm < 10 ? "0" : "") + mm + ampm;
    },

    period: function () { return PB.timeOfDay(this.hour()); },

    // A 0..1 "darkness" value plus an overlay colour for the world.
    overlay: function () {
      var h = this.hour();
      var dark = 0;            // 0 day, 1 deep night
      var tint = "0,0,40";
      if (h < 5)        { dark = 0.55; tint = "20,24,70"; }       // late night
      else if (h < 7)   { dark = 0.55 - (h - 5) / 2 * 0.4; tint = "70,60,90"; } // dawn
      else if (h < 9)   { dark = 0.15 - (h - 7) / 2 * 0.15; tint = "255,210,150"; } // morning warm
      else if (h < 17)  { dark = 0; tint = "255,255,255"; }       // day
      else if (h < 19)  { dark = (h - 17) / 2 * 0.3; tint = "255,160,90"; }  // sunset
      else if (h < 21)  { dark = 0.3 + (h - 19) / 2 * 0.25; tint = "120,80,120"; } // dusk
      else              { dark = 0.55; tint = "20,24,70"; }       // night
      return { dark: dark, tint: tint };
    },
  };

})(window.PB = window.PB || {});
