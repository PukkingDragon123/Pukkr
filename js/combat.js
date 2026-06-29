/* ===========================================================================
   combat.js — clicker + idle + strategy battles.
   Taps build a COMBO (up to ×2.2) and fill a SWARM ultimate gauge. Each team
   bug grants an active ABILITY (by talent). Enemies roll MODIFIERS that demand
   counter-play. Your team also auto-fights (idle). Clear waves; every Nth is a
   boss; beating a boss unlocks the next area. Enemies are the creature sprites.
   =========================================================================== */
(function (PB) {
  "use strict";

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  PB.combat = {
    enemy: null,
    teamHp: 0,
    teamFlash: 0,
    combo: 0, comboT: 0, comboBleed: 0,
    ult: 0,                                  // 0..100
    fx: { frenzy: 0, overdrive: 0, guard: 0, rallyT: 0, rallyAtk: 0, focusCrits: 0 },
    cds: [0, 0, 0, 0, 0],                    // per team-slot ability cooldown

    isBoss: function () { var a = PB.area(); return PB.areaWave() % a.waves === 0; },
    comboMult: function () { return (1 + Math.min(this.combo, 30) * 0.04) * (this.fx.frenzy > 0 ? 2 : 1); },
    critChance: function () { return PB.teamBuffs().crit; },
    hasMod: function (m) { return this.enemy && this.enemy.mods.indexOf(m) >= 0; },

    reset: function () {
      this.enemy = null; this.teamHp = PB.teamMaxHp();
      this.combo = 0; this.comboT = 0; this.comboBleed = 0; this.ult = 0;
      this.fx = { frenzy: 0, overdrive: 0, guard: 0, rallyT: 0, rallyAtk: 0, focusCrits: 0 };
      this.cds = [0, 0, 0, 0, 0];
      this.ensure();
    },

    ensure: function () {
      if (this.teamHp <= 0 || this.teamHp > PB.teamMaxHp()) this.teamHp = PB.teamMaxHp();
      if (!this.enemy) this._spawn();
    },

    _pickMods: function (n, boss) {
      var keys = Object.keys(PB.mods), out = [];
      while (out.length < n && keys.length) {
        var k = keys.splice(Math.floor(Math.random() * keys.length), 1)[0];
        // never pair the two punishing offence mods on a non-boss
        if (!boss && (k === "enrage" || k === "swift") && (out.indexOf("enrage") >= 0 || out.indexOf("swift") >= 0)) continue;
        out.push(k);
      }
      return out;
    },

    _spawn: function () {
      var a = PB.area(), wave = PB.areaWave(), boss = (wave % a.waves === 0);
      var sid = boss ? a.foes[a.foes.length - 1] : a.foes[(wave - 1) % a.foes.length];
      var scale = Math.pow(1.21, wave - 1) * (1 + PB.state.area * 0.6);
      var hp = Math.round(34 * scale * (boss ? 2.6 : 1));
      var atk = Math.round(3 * Math.pow(1.16, wave - 1) * (1 + PB.state.area * 0.4) * (boss ? 1.5 : 1));
      var mods = boss ? this._pickMods(2, true) : (wave >= 6 ? this._pickMods(Math.random() < 0.5 ? 1 : 2, false) : (wave >= 3 && Math.random() < 0.4 ? this._pickMods(1, false) : []));
      var baseAtk = atk * (mods.indexOf("swift") >= 0 ? 1.6 : 1);
      var maxShield = mods.indexOf("shielded") >= 0 ? Math.round(hp * 0.2) : 0;
      this.enemy = {
        sid: sid, name: (boss ? "BOSS " : "") + PB.speciesById[sid].name + " Lv" + wave,
        hp: hp, maxHp: hp, atk: baseAtk, baseAtk: baseAtk, hurt: 0, boss: boss,
        mods: mods, shield: maxShield, maxShield: maxShield, enrageT: 0, sinceTap: 0,
      };
    },

    _deal: function (amount) {
      var e = this.enemy;
      if (e.shield > 0) { var s = Math.min(e.shield, amount); e.shield -= s; amount -= s; }
      e.hp -= amount;
    },

    // a tap: combo-scaled hit (chance to crit)
    click: function () {
      this.ensure();
      var e = this.enemy;
      this.combo += 1; this.comboT = 1.6; this.comboBleed = 0;
      if (PB.quests) PB.quests.progress("combo", this.combo);
      if (this.combo > PB.state.stats.bestCombo) PB.state.stats.bestCombo = this.combo;
      var crit = this.fx.focusCrits > 0 ? true : Math.random() < this.critChance();
      if (this.fx.focusCrits > 0) this.fx.focusCrits -= 1;
      var atk = PB.teamAtk() * (1 + this.fx.rallyAtk);
      var dmg = Math.round(atk * this.comboMult() * (crit ? 2.4 : 1));
      if (this.hasMod("armored")) dmg = Math.max(1, Math.round(dmg * 0.5));
      this._deal(dmg); e.hurt = crit ? 0.26 : 0.18; e.sinceTap = 0;
      this.ult = Math.min(100, this.ult + 6 + (crit ? 3 : 0));
      if (e.hp <= 0) this._defeat();
      return { dmg: dmg, crit: crit, combo: this.combo, armored: this.hasMod("armored") };
    },

    // ability for a team slot (by talent, or generic Rally)
    abilityFor: function (slot) {
      var team = PB.teamBugs(); if (slot >= team.length) return null;
      var bug = team[slot];
      var key = (bug.talent && PB.talents[bug.talent]) ? PB.talents[bug.talent].ability : "rally";
      var ab = PB.abilities[key];
      return { key: key, slot: slot, icon: ab.icon, name: ab.name, cd: ab.cd, desc: ab.desc, sid: bug.sid };
    },
    abilityReady: function (slot) { var a = this.abilityFor(slot); return !!a && this.cds[slot] <= 0; },

    useAbility: function (slot) {
      this.ensure();
      var a = this.abilityFor(slot); if (!a || this.cds[slot] > 0) return null;
      this.cds[slot] = a.cd;
      var res = { key: a.key, icon: a.icon, name: a.name };
      var e = this.enemy;
      if (a.key === "smash") { var d = Math.round(PB.teamAtk() * 4); this._deal(d); e.hurt = 0.32; res.dmg = d; }
      else if (a.key === "focus") { this.fx.focusCrits = 5; }
      else if (a.key === "mend") { var h = Math.round(PB.teamMaxHp() * 0.25); this.teamHp = Math.min(PB.teamMaxHp(), this.teamHp + h); res.heal = h; }
      else if (a.key === "guard") { this.fx.guard = 3; }
      else if (a.key === "overdrive") { this.fx.overdrive = 4; }
      else if (a.key === "rally") { this.fx.rallyT = 4; this.fx.rallyAtk = 0.2; }
      PB.audio.charge();
      if (e.hp <= 0) this._defeat();
      return res;
    },

    ultReady: function () { return this.ult >= 100; },
    ultimate: function () {
      this.ensure();
      if (this.ult < 100) return null;
      var d = Math.round(PB.teamAtk() * 8);
      this._deal(d); this.enemy.hurt = 0.36;
      this.ult = 0; this.fx.frenzy = 3;
      PB.audio.ult();
      if (PB.quests) PB.quests.progress("ult", 1);
      if (this.enemy.hp <= 0) this._defeat();
      return { dmg: d };
    },

    update: function (dt) {
      if (PB.scene.current() !== "battle") return;
      this.ensure();
      var e = this.enemy, f = this.fx;
      // with no team there's nothing to fight with — idle, never faint/spam
      if (PB.teamBugs().length === 0) { e.sinceTap += dt; return; }
      // combo bleed
      if (this.combo > 0) { this.comboT -= dt; if (this.comboT <= 0) { this.comboBleed += dt; while (this.comboBleed >= 0.15 && this.combo > 0) { this.combo -= 1; this.comboBleed -= 0.15; } } }
      // effect timers
      f.frenzy = Math.max(0, f.frenzy - dt);
      f.overdrive = Math.max(0, f.overdrive - dt);
      f.guard = Math.max(0, f.guard - dt);
      f.rallyT = Math.max(0, f.rallyT - dt); if (f.rallyT <= 0) f.rallyAtk = 0;
      for (var i = 0; i < this.cds.length; i++) this.cds[i] = Math.max(0, this.cds[i] - dt);
      if (e.hurt > 0) e.hurt = Math.max(0, e.hurt - dt);
      if (this.teamFlash > 0) this.teamFlash = Math.max(0, this.teamFlash - dt);
      e.sinceTap += dt;

      var buffs = PB.teamBuffs();
      // idle team damage (NOT combo-scaled); fills ult slowly
      var idlePct = buffs.idlePct; if (f.overdrive > 0) idlePct *= 3; if (f.frenzy > 0) idlePct *= 2;
      idlePct = Math.min(idlePct, 3.0);
      var idle = PB.teamAtk() * idlePct * dt;
      if (idle > 0) { this._deal(idle); this.ult = Math.min(100, this.ult + 1.5 * dt); if (e.hp <= 0) { this._defeat(); return; } }
      // enemy enrage ramp
      if (e.mods.indexOf("enrage") >= 0) e.enrageT += dt;
      var atkNow = e.baseAtk * (e.mods.indexOf("enrage") >= 0 ? (1 + Math.min(1.2, 0.06 * e.enrageT)) : 1);
      var toTeam = atkNow * dt; if (f.guard > 0) toTeam *= 0.1;
      if (toTeam > 0) { this.teamHp -= toTeam; this.teamFlash = 0.12; }
      // enemy regen if you stall
      if (e.mods.indexOf("regen") >= 0 && e.sinceTap > 1.2) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.02 * dt);
      // healer
      if (buffs.heal > 0) this.teamHp = Math.min(PB.teamMaxHp(), this.teamHp + PB.teamMaxHp() * buffs.heal * dt);
      if (this.teamHp < 0) this.teamHp = 0;
      if (this.teamHp <= 0) this._faint();
    },

    _defeat: function () {
      var a = PB.area(), wave = PB.areaWave(), boss = (wave % a.waves === 0), e = this.enemy;
      var base = (2 + wave * 0.7 + PB.state.area) * (boss ? 3 : 1);
      var reward = Math.round(base * PB.greedMult() * (1 + 0.15 * (e ? e.mods.length : 0)));
      PB.addTokens(reward);
      var glim = (boss ? 5 : 1); PB.addGlimmer(glim);
      PB.state.stats.battles += 1;
      if (PB.quests) { PB.quests.progress("battle", 1); if (boss) PB.quests.progress("boss", 1); }
      PB.audio.evolve();
      var msg = "Defeated " + e.name + "! +" + reward + " 🎟️ +" + glim + " ✨";
      if (boss && PB.state.unlocked === PB.state.area + 1 && PB.state.area + 1 < PB.areas.length) {
        PB.state.unlocked += 1;
        PB.addGlimmer(7);
        msg += "<br>🗺️ New area unlocked: " + PB.areas[PB.state.area + 1].name + "! +7 ✨";
      }
      PB.ui.toast(msg, "candy");
      PB.state.wave[a.id] = wave + 1;
      // keep the combo rolling across kills — chaining waves is the fun part
      this.enemy = null; this._spawn();
      PB.ui.updateHUD();
    },

    _faint: function () {
      this.teamHp = PB.teamMaxHp();
      if (this.enemy) { this.enemy.hp = this.enemy.maxHp; this.enemy.shield = this.enemy.maxShield; this.enemy.enrageT = 0; }
      this.combo = 0; this.teamFlash = 0;
      PB.audio.fail();
      PB.ui.toast("Your team retreated to recover! Try a stronger team or new tactics. 💪", "");
    },

    setArea: function (i) {
      if (i < 0 || i >= PB.areas.length || i >= PB.state.unlocked) return false;
      PB.state.area = i; PB.scene.setLocation("battle"); this.reset();
      return true;
    },

    info: function () {
      this.ensure(); var e = this.enemy;
      return {
        name: e.name, hp: Math.max(0, e.hp), max: e.maxHp, shield: e.shield, maxShield: e.maxShield,
        mods: e.mods, boss: e.boss,
        teamHp: Math.max(0, Math.round(this.teamHp)), teamMax: PB.teamMaxHp(),
        wave: PB.areaWave(), combo: this.combo, ult: this.ult, frenzy: this.fx.frenzy > 0,
      };
    },
  };

})(window.PB = window.PB || {});
