# 🐛 Poke Bug

A **cozy 2D bug-collecting fan game** in a soft, hand-painted style:

- ⛩️ **Forest / Beach** — enter the shrine and pick the **left or right path**:
  a bug spot (tap a fast, dodgy creature, then beat the **shrinking** catch bar —
  hit the bright **sweet spot** for a bigger catch!), a money stash, food, a
  pick-a-charm game, or nothing. Every catch ends on a **"You caught it!"** screen.
  Buy a **Plane Ticket** in the Shop to unlock the **Beach** and its new creatures.
- 🎒 **Backpack** — caught creatures take up **space by size** on a grid; drag to tidy.
- 🏛 **Museum** — your creatures live here in jars. **Drag food onto a jar** to grow
  it bigger (bigger = worth more), and **open the museum** to earn **money** 💰.
- ⚔️ **Arena** — a **clicker battle**: click to attack waves of foes. The bigger and
  more grown your creatures, the harder you hit. Winning pays money.
- 🛒 **Shop** — better net, bigger backpack, garden care, food, and the Plane Ticket.

The scenes have a soft **2.5D parallax** and **foliage that rustles** as bugs brush past.

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
| Catch (tap a creature in a spot) · Fight (click the foe) | **click / tap** (or `Space`) |
| Forest / Beach / Museum / Arena / Shop | `1` / `2` / `3` / `4` / `5` |
| Backpack | `B` |
| Help · Close a window | `H` · `Esc` |

1. **Forest / Beach** — pick a path at the shrine. In a bug spot, **tap a fast,
   dodgy creature**, then tap/press while the marker is in the green — the zone
   keeps **shrinking**, so aim for the bright **sweet spot**! A better **net** helps.
2. **Backpack** — your catch is stored on a grid by its size. Drag jars to tidy them.
3. **Museum** — **drag food** from the tray onto a jar to grow your creature
   (bigger = worth more), then **open the museum** to earn **money** 💰.
4. **Arena** — **click to fight** waves of foes. Bigger, grown creatures deal more
   damage (click + idle). Each win pays money; chase higher waves.

## What's where

```
index.html        # entry point; loads everything
css/style.css     # the cozy look
assets/{creatures,jars}/   # the five hand-drawn creatures (portrait + jar art)
js/
  data.js         # content: creatures, footprints, upgrades, food, forest spots
  art.js          # registry/loader + drawing for the hand-drawn art
  bag.js          # the spatial 5x5 backpack (footprints, placement)
  scene.js        # painterly Forest/Beach/Museum/Arena backgrounds + parallax + foliage
  forest.js       # shrine paths & random spot outcomes
  spawns.js       # fast, dodgy creatures in a catch spot
  catching.js     # the shrinking-bar catch mini-game
  collection.js   # releasing creatures
  garden.js       # growing & feeding (drag-and-drop)
  fight.js        # the clicker battle (power, waves, rewards)
  shop.js         # net / backpack / garden upgrades + food + plane ticket
  museum.js       # raise jars & open the museum for money
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
