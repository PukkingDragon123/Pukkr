# 🐛 Poke Bug

A **cozy 2D bug-collecting fan game** in a soft, hand-painted style:

- ⛩️ **Forest** — enter through a little shrine and pick the **left or right path**.
  You'll find a bug spot (tap a fast, dodgy creature, then beat the **shrinking**
  catch bar), a candy stash, a basket of food, a pick-a-charm game, or nothing.
- 🏖️ **Beach** — buy a **Plane Ticket** in the Shop to unlock the seaside and meet
  brand-new creatures (Corphish, Dwebble, Anorith).
- 🎒 **Backpack** — caught creatures take up **space by size** on a 5×5 grid; drag
  to tidy them. Upgrade the bag for more room.
- 🌷 **Garden** — **drag food onto a jar** to grow your creature. The bigger it
  grows, the more it's worth! Upgrade the garden to grow faster and earn more.
- 🏛 **Museum** — display your grown creatures and **open the doors** for visiting
  friends, who leave candy.
- 🛒 **Shop** — buy a better net, a bigger backpack, and food.

Inspired by laid-back bug-park collecting games. Everything bobs and squishes for
a soft, bouncy feel. The five forest creatures are hand-drawn art; the beach
creatures use cute procedural sprites until hand-drawn art is added.

## Play

It's pure HTML/CSS/JavaScript with **no build step and no dependencies**.

- **Easiest:** open `index.html` in any modern browser. That's it.
- Or serve the folder and visit it, e.g.:
  ```sh
  python3 -m http.server 8000
  # then open http://localhost:8000
  ```

Your game **auto-saves** to your browser's local storage.

## How to play

Mostly you just **click / tap / drag**. The bottom bar switches places.

| Action | Keys |
| --- | --- |
| Catch (tap a creature in a forest spot) | **click / tap** it (or `Space`) |
| Forest / Garden / Museum / Shop | `1` / `2` / `3` / `4` |
| Backpack | `B` |
| Help · Close a window | `H` · `Esc` |

1. **Forest** — pick a path at the shrine. In a bug spot, **tap a fast, dodgy
   creature** to start the catch, then press/tap while the marker is in the green
   — but the zone keeps **shrinking**, so be quick! A better **net** (Shop) helps.
2. **Backpack** — your catch is stored on a grid by its size. Drag jars to tidy
   them; a full bag means you must release or display something first.
3. **Garden** — **drag food** from the tray onto a jar to grow your creature.
   Bigger = worth more candy. **Upgrade Garden** to grow faster and drip more.
4. **Museum** — tap a Garden jar → **Display in Museum**, then **open the doors**
   for visiting friends and candy.

## What's where

```
index.html        # entry point; loads everything
css/style.css     # the cozy look
assets/{creatures,jars}/   # the five hand-drawn creatures (portrait + jar art)
js/
  data.js         # content: creatures, footprints, upgrades, food, forest spots
  art.js          # registry/loader + drawing for the hand-drawn art
  bag.js          # the spatial 5x5 backpack (footprints, placement)
  scene.js        # painterly Forest (with torii) / Garden / Museum backgrounds
  forest.js       # shrine paths & random spot outcomes
  spawns.js       # fast, dodgy creatures in a forest spot
  catching.js     # the shrinking-bar catch mini-game
  collection.js   # releasing creatures
  garden.js       # growing & feeding (drag-and-drop) + candy drip
  shop.js         # net / backpack / garden upgrades + food
  museum.js       # displaying jars & visiting friends
  time.js · fx.js # day/night cycle · pollen/fireflies/vignette
  ui.js           # all overlays: catch, backpack, shop, popups, tray, cards
  input.js · main.js  # keyboard · boot/loop/scene render/navigation
```

## Notes

This is a **non-commercial fan project** made for fun. Pokémon and all related
names are © Nintendo / Creatures Inc. / GAME FREAK inc.

All five creatures (Caterpie, Weedle, Paras, Shuckle and Wimpod) use original
hand-drawn art under `assets/` — a painterly portrait for the Forest and catch
screen, and a "creature in a jar" piece for the Garden and Museum. The three
location backgrounds are painted procedurally with soft gradients and blobs. No
original game assets are used.
