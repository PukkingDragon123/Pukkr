# 🐛 Poke Bug

A **cozy mobile-style idle RPG** about collecting bugs, painted in a soft,
hand-drawn look. The loop is simple and addictive: **fight → wait → catch**,
then merge your bugs into bigger, stronger ones.

- 🎣 **Catch** — set out **fruit bait** and **wait** for a bug to wander in
  (skip the wait with 🎟️ **tokens**). Bugs come in **different sizes**, and rare
  ones **sparkle** and carry a **special talent**. When one appears, tap it and
  beat the **shrinking** catch bar — hit the bright **sweet spot** for a bigger
  catch!
- 🐛 **Bugs** — build a **team of 3**. Each talent buffs the whole team, so mix
  wisely: **Mighty** (attack), **Lucky** (crit), **Healer** (regen), **Tough**
  (max HP), **Swift** (idle damage).
- ⚔️ **Battle** — a **clicker + strategy** fight against the Pokémon themselves.
  **Tap to attack** while your team chips away on its own. Clear waves, beat the
  **boss** to **unlock the next area**, and earn tokens for bait.
- ⚗️ **Lab** — **merge** two of the same species into one bigger, stronger bug.
  Merging keeps the better talent (and sometimes grants a new one).

The scenes have a soft **2.5D parallax** and **foliage that rustles** as bugs and
fighters brush past, with **squishy, bouncy combat VFX** — pops, sparks, crits
and screen shake.

Inspired by laid-back bug-collecting and cozy idle games. The five hand-drawn
creatures use original painterly art; the other species use cute procedural
sprites until more hand-drawn art is added.

## Play

It's pure HTML/CSS/JavaScript with **no build step and no dependencies**.

- **Easiest:** open `index.html` in any modern browser. That's it.
- Or serve the folder and visit it, e.g.:
  ```sh
  python3 -m http.server 8000
  # then open http://localhost:8000
  ```

Your game **auto-saves** to your browser's local storage, and **keeps baiting
while you're away** — come back to a bug ready to catch.

## How to play

Mostly you just **tap / click**. The bottom bar switches between the four screens.

| Action | Keys |
| --- | --- |
| Catch the bug · Attack the foe | **click / tap** (or `Space`) |
| Catch / Battle / Bugs / Lab | `1` / `2` / `3` / `4` |
| Help · Close a window | `H` · `Esc` |

1. **Catch** — pick a **fruit** to set bait, then **wait** (or spend 🎟️ tokens to
   skip). When a bug appears, **tap it** and stop the marker in the green —
   the zone keeps **shrinking**, so aim for the bright **sweet spot** for a bigger
   bug. Sparkling bugs are rare and come with a **talent**.
2. **Bugs** — tap a bug to add or remove it from your **team of 3**. The team's
   total power and its talents decide how you do in battle. Release spares for tokens.
3. **Battle** — **tap to attack** waves of foes (your team also fights on its own).
   Beat the **boss** of an area to **unlock the next one**; each win pays tokens.
4. **Lab** — pick a bug, then pick a **matching** one to **merge** them into a
   bigger, stronger bug. Use the **◀ ▶** at the top to travel between unlocked areas.

## What's where

```
index.html        # entry point; loads everything
css/style.css     # the cozy look
assets/{creatures,jars}/   # the five hand-drawn creatures (portrait + jar art)
js/
  data.js         # content: species, rarities, talents, fruits, areas
  sprites.js      # procedural creature sprites (non-hand-drawn species)
  art.js          # registry/loader + drawing for the hand-drawn art
  scene.js        # painterly area backgrounds + 2.5D parallax + foliage
  state.js        # save state: bugs, team, tokens, areas, team buffs/power
  bait.js         # fruit bait timers, token skip, spawn roll (size/rarity/talent)
  catching.js     # the shrinking-bar catch mini-game
  collection.js   # adding caught bugs · releasing for tokens
  combat.js       # the clicker battle: clicks, idle damage, waves, bosses, unlocks
  merge.js        # merging two same-species bugs in the Lab
  fx.js           # pops, sparks, vignette, grain, ambient particles
  ui.js           # all overlays: bait bar, catch, result, bugs, lab, popups
  input.js · main.js  # keyboard · boot/loop/scene render/navigation
```

## Notes

This is a **non-commercial fan project** made for fun. Pokémon and all related
names are © Nintendo / Creatures Inc. / GAME FREAK inc.

The five hand-drawn creatures (Caterpie, Weedle, Paras, Shuckle and Wimpod) use
original painterly art under `assets/` — a portrait for the catch and battle
screens, and a "creature in a jar" piece. The other species use cute procedural
sprites, and the area backgrounds are painted procedurally with soft gradients
and blobs. No original game assets are used.
