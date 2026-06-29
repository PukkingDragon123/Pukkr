# 🐛 Poke Bug

A **cozy mobile-style idle & gacha RPG** about collecting bugs, painted in a soft,
hand-drawn look. The loop is simple and addictive: **bait & catch (or pull a
capsule) → build & merge your team → battle with combos, abilities & a SWARM
ultimate → earn → upgrade → unlock new areas.**

- 🎣 **Catch** — set **fruit bait** in your **lure slots** and wait for a bug
  (skip the wait with 🎟️ **tokens**). Bugs come in **different sizes**, and rare
  ones **sparkle** and carry a **talent**. When one appears, tap it and beat the
  shrinking catch bar — it's **forgiving** now (wide green, slow marker, a grace
  period, several tries, and edge-snap), and hitting the bright **sweet spot**
  gives a **PERFECT** bigger catch.
- 🎰 **Capsule** — spend ✨ **Glimmer** (earned by battling) on the capsule
  machine for a random bug. **Transparent odds** and a two-tier **pity** system
  (guaranteed Rare by 10 dry pulls, Epic by 80). Pull ×1 or ×10.
- 🐛 **Bugs** — build a **team**. Each talent buffs the whole team **and** grants
  that bug a battle **ability**: **Mighty→Smash**, **Lucky→Focus**,
  **Healer→Mend**, **Tough→Guard**, **Swift→Overdrive** (no talent → **Rally**).
- ⚔️ **Battle** — a **clicker + strategy** fight against the Pokémon themselves.
  **Tap** to stack a **combo** (up to ×2.2) while your team auto-fights; fire
  team **abilities** on cooldown; charge and unleash the **SWARM** ultimate.
  Read each foe's **modifiers** (🛡️ Armored, 😤 Enrage, 💚 Regen, 🔵 Shielded,
  💨 Swift) and pick your tactic. Beat the **boss** to **unlock the next area**.
- ⚗️ **Lab** — **merge** two of the same species into one bigger, stronger bug
  (with a live result **preview**). 🛒 **Shop** — spend 🎟️ on permanent
  **upgrades** (more lure slots, comfy bait, catch assist, team size, idle power,
  treasure, lucky charm). 🎯 **Goals** — rolling quests pay 🎟️ & ✨.

Squishy, bouncy **combat VFX** throughout: damage pops, hit sparks, crit shake,
combo rings, enemy squash, and a big screen-flash SWARM. Soft **2.5D parallax**
scenes with **foliage that rustles**. It **auto-saves** and **keeps baiting while
you're away** (offline catch-up), with a **Daily Dew** ✨ bonus on your first
visit each day.

Inspired by laid-back bug-collecting and cozy idle/gacha games. The five
hand-drawn creatures use original painterly art; the others use cute procedural
sprites until more hand-drawn art is added.

## Play

It's pure HTML/CSS/JavaScript with **no build step and no dependencies**.

- **Easiest:** open `index.html` in any modern browser. That's it.
- Or serve the folder and visit it, e.g.:
  ```sh
  python3 -m http.server 8000
  # then open http://localhost:8000
  ```

## How to play

Mostly you just **tap / click**. The bottom bar switches between screens.

| Action | Keys |
| --- | --- |
| Catch the bug · Attack the foe | **click / tap** (or `Space`) |
| Unleash SWARM ultimate | `Q` |
| Use team abilities (slots 1-5) | `Z` `X` `C` `V` `B` |
| Catch / Battle / Bugs / Capsule / Lab / Shop | `1`–`6` |
| Goals · Help · Close a window | `G` · `H` · `Esc` |

The two currencies: **🎟️ Tokens** are the everyday wallet (skip waits, buy
upgrades, released-bug refunds); **✨ Glimmer** is the collector's wallet (earned
in battle, spent only on capsule pulls and talent re-rolls).

## What's where

```
index.html        # entry point; loads everything
css/style.css     # the cozy look
assets/{creatures,jars}/   # the five hand-drawn creatures
js/
  data.js         # content: species, rarities, talents, abilities, mods, fruits, upgrades, quests, areas
  sprites.js      # procedural creature sprites (non-hand-drawn species)
  art.js          # registry/loader + drawing for the hand-drawn art
  scene.js        # painterly area backgrounds + 2.5D parallax + foliage
  state.js        # save state, currencies, upgrades, pity, team buffs/power, offline catch-up
  bait.js         # multi-lure fruit bait: timers, token skip, spawn roll
  catching.js     # the forgiving shrinking-bar catch mini-game
  collection.js   # minting caught/pulled bugs · dex · releasing for tokens
  combat.js       # clicker battle: combo, SWARM ultimate, abilities, enemy modifiers, waves, bosses
  gacha.js        # the capsule machine: transparent odds + two-tier pity
  merge.js        # merging two same-species bugs (with preview)
  quests.js       # rolling goals that pay tokens & glimmer
  fx.js           # pops, sparks, vignette, grain, ambient particles
  ui.js           # all DOM: HUD, bait bar, combat bar, catch, result, bugs, capsule, lab, shop, goals
  input.js · main.js  # keyboard · boot/loop/render/navigation/VFX
```

## Notes

This is a **non-commercial fan project** made for fun. Pokémon and all related
names are © Nintendo / Creatures Inc. / GAME FREAK inc. The five hand-drawn
creatures (Caterpie, Weedle, Paras, Shuckle and Wimpod) use original painterly
art; the other species and the area backgrounds are drawn procedurally. No
original game assets are used. There is no real-money purchase of any kind — both
currencies are fully earned by playing.
