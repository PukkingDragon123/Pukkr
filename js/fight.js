/* ===========================================================================
   fight.js — a cozy clicker battle. Click to attack waves of foes. Your damage
   (click + idle) scales with how big and grown your creatures are, so feeding
   and growing them in the Museum powers up your fights. Wins pay money.
   =========================================================================== */
(function (PB) {
  "use strict";

  var FOES = [
    { name: "Pesky Aphid", c1: "#9acd5b" },
    { name: "Grumpy Grub", c1: "#d9a14d" },
    { name: "Spiky Mite", c1: "#d96666" },
    { name: "Shadow Moth", c1: "#7a6cc4" },
    { name: "Big Beetle", c1: "#5a8f6a" },
  ];

  PB.fight = {
    enemy: null,

    // total creature power from everything you own
    power: function () {
      var p = 0; PB.state.bugs.forEach(function (b) { p += PB.bugValue(b); }); return p;
    },
    clickDamage: function () { return 1 + Math.floor(this.power() / 3); },
    dps: function () { return this.power() / 6; },

    ensure: function () { if (!this.enemy) this._spawn(); },

    _spawn: function () {
      var w = PB.state.fight.wave;
      var foe = FOES[(w - 1) % FOES.length];
      var hp = Math.round(28 * Math.pow(1.32, w - 1));
      this.enemy = { name: foe.name + " #" + w, c1: foe.c1, hp: hp, maxHp: hp, hurt: 0 };
    },

    // returns damage dealt (for a popup) or 0
    attack: function () {
      this.ensure();
      var dmg = this.clickDamage();
      this.enemy.hp -= dmg;
      this.enemy.hurt = 0.18;
      if (this.enemy.hp <= 0) this._defeat();
      return dmg;
    },

    // idle damage over time
    update: function (dt) {
      if (PB.scene.current() !== "fight") return;
      this.ensure();
      if (this.enemy.hurt > 0) this.enemy.hurt = Math.max(0, this.enemy.hurt - dt);
      var d = this.dps() * dt;
      if (d > 0) { this.enemy.hp -= d; if (this.enemy.hp <= 0) this._defeat(); }
    },

    _defeat: function () {
      var w = PB.state.fight.wave, name = this.enemy ? this.enemy.name : "the foe";
      var reward = 5 + w * 4 + Math.floor(this.power() * 0.4);
      PB.addCandy(reward);
      PB.state.fight.wave += 1;
      if (PB.state.fight.wave > (PB.state.fight.best || 1)) PB.state.fight.best = PB.state.fight.wave;
      PB.audio.evolve();
      PB.ui.toast("Defeated " + name + "! +" + reward + " 💰", "candy");
      this.enemy = null;
      this._spawn();
      return reward;
    },
  };

})(window.PB = window.PB || {});
