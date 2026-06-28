/* ===========================================================================
   combat.js — clicker + idle + strategy battles. Your team auto-fights (idle)
   and your taps land big hits; talents give buffs so team comp matters. Clear
   waves; every Nth wave is a boss; beating a boss unlocks the next area.
   Enemies are the uploaded creature sprites, scaled up.
   =========================================================================== */
(function (PB) {
  "use strict";

  PB.combat = {
    enemy: null,
    teamHp: 0,
    hitFlash: 0,      // brief enemy squash on hit
    teamFlash: 0,     // team-took-damage flash

    isBoss: function () { var a = PB.area(); return PB.areaWave() % a.waves === 0; },

    reset: function () { this.enemy = null; this.teamHp = PB.teamMaxHp(); this.ensure(); },

    ensure: function () {
      if (this.teamHp <= 0 || this.teamHp > PB.teamMaxHp()) this.teamHp = PB.teamMaxHp();
      if (!this.enemy) this._spawn();
    },

    _spawn: function () {
      var a = PB.area(), wave = PB.areaWave(), boss = (wave % a.waves === 0);
      var sid = boss ? a.foes[a.foes.length - 1] : a.foes[(wave - 1) % a.foes.length];
      var scale = Math.pow(1.21, wave - 1) * (1 + PB.state.area * 0.6);
      var hp = Math.round(34 * scale * (boss ? 2.6 : 1));
      var atk = Math.round(3 * Math.pow(1.16, wave - 1) * (1 + PB.state.area * 0.4) * (boss ? 1.5 : 1));
      this.enemy = {
        sid: sid, name: (boss ? "BOSS " : "") + PB.speciesById[sid].name + " Lv" + wave,
        hp: hp, maxHp: hp, atk: atk, hurt: 0, boss: boss,
      };
    },

    // a tap: a strong hit (chance to crit)
    click: function () {
      this.ensure();
      var buffs = PB.teamBuffs();
      var crit = Math.random() < buffs.crit;
      var dmg = Math.round(PB.teamAtk() * (crit ? 2.4 : 1));
      this.enemy.hp -= dmg; this.enemy.hurt = 0.18;
      if (this.enemy.hp <= 0) this._defeat();
      return { dmg: dmg, crit: crit };
    },

    update: function (dt) {
      if (PB.scene.current() !== "battle") return;
      this.ensure();
      if (this.enemy.hurt > 0) this.enemy.hurt = Math.max(0, this.enemy.hurt - dt);
      if (this.teamFlash > 0) this.teamFlash = Math.max(0, this.teamFlash - dt);
      var buffs = PB.teamBuffs();
      // idle team damage
      var idle = PB.teamAtk() * buffs.idlePct * dt;
      if (idle > 0) { this.enemy.hp -= idle; if (this.enemy.hp <= 0) { this._defeat(); return; } }
      // enemy attacks the team; healer regens
      this.teamHp -= this.enemy.atk * dt;
      if (buffs.heal > 0) this.teamHp = Math.min(PB.teamMaxHp(), this.teamHp + PB.teamMaxHp() * buffs.heal * dt);
      if (this.teamHp < 0) this.teamHp = 0;
      if (this.teamHp <= 0) this._faint();
    },

    _defeat: function () {
      var a = PB.area(), wave = PB.areaWave(), boss = (wave % a.waves === 0);
      var reward = Math.round((2 + wave * 0.7 + PB.state.area) * (boss ? 3 : 1));
      PB.addTokens(reward);
      PB.audio.evolve();
      var msg = "Defeated " + this.enemy.name + "! +" + reward + " 🎟️";
      if (boss && PB.state.unlocked === PB.state.area + 1 && PB.state.area + 1 < PB.areas.length) {
        PB.state.unlocked += 1;
        msg += "<br>🗺️ New area unlocked: " + PB.areas[PB.state.area + 1].name + "!";
      }
      PB.ui.toast(msg, "candy");
      PB.state.wave[a.id] = wave + 1;
      this.enemy = null; this._spawn();
      PB.ui.updateHUD();
    },

    _faint: function () {
      this.teamHp = PB.teamMaxHp();
      if (this.enemy) { this.enemy.hp = this.enemy.maxHp; }
      this.teamFlash = 0;
      PB.audio.fail();
      PB.ui.toast("Your team retreated to recover! Try a stronger team. 💪", "");
    },

    setArea: function (i) {
      if (i < 0 || i >= PB.areas.length || i >= PB.state.unlocked) return false;
      PB.state.area = i;
      PB.scene.setLocation("battle"); // refresh bg via area
      this.reset();
      return true;
    },

    info: function () {
      this.ensure();
      return {
        name: this.enemy.name, hp: Math.max(0, this.enemy.hp), max: this.enemy.maxHp,
        teamHp: Math.max(0, Math.round(this.teamHp)), teamMax: PB.teamMaxHp(),
        wave: PB.areaWave(), boss: this.isBoss(),
      };
    },
  };

})(window.PB = window.PB || {});
