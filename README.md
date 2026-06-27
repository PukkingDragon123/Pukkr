# 🐛 Poke Bug

A **cozy 2D bug-collecting fan game**. You're a gentle bug collector in a sunny
meadow: net wild bug Pokémon, keep them in jars, raise them at home until they're
happy (and maybe evolve!), and donate them to your own **museum**. Invite your
friends to visit — they'll leave you **candy**, which you spend on better nets,
comfier shoes, sweet lures and roomier jars.

Inspired by laid-back bug-park collecting games. There's no failing and no rush —
just a warm little world to potter around in.

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

| Action | Keys |
| --- | --- |
| Move | `W` `A` `S` `D` or arrow keys |
| Swing net / interact | `Space` or `E` |
| Bugdex | `C` |
| Jar | `J` |
| Raise (Terrarium) | `R` |
| Museum | `M` |
| Shop | `B` |
| Close a window | `Esc` |

1. **Catch** — walk up to a wandering bug and swing your net. Time the meter so
   the marker stops in the green zone. Better nets make the zone wider; rare and
   skittish bugs are trickier.
2. **Raise** — go **home** (the cabin) and move caught bugs into your terrarium.
   Feed them to raise their **Love**; happy bugs slowly produce candy, and
   well-loved bugs with an evolution line will **evolve**.
3. **Museum** — donate bugs to create exhibits, then **open the doors** so friends
   visit. They reward you with candy — more when your exhibits match the biomes
   they love. Fill it out to climb from a *Curio Corner* to a *World Museum*.
4. **Explore** — different bugs appear in different **places** (meadow, woods,
   pond, flower patch, the old oak) and at different **times of day**. The world
   has a gentle day/night cycle, so come back at night for the glowing bugs.

## What's where

```
index.html        # entry point; loads everything
css/style.css     # the cozy look
assets/
  creatures/      # hand-drawn creature cut-outs (catch screen + overworld)
  jars/           # hand-drawn "creature in a jar" art (collection screens)
js/
  data.js         # all content: species, biomes, tools, friends
  art.js          # registry/loader for the hand-drawn art
  sprites.js      # procedural pixel-art + the glass-jar renderer
  world.js        # the map, biomes, buildings, collision
  player.js       # movement
  spawns.js       # wild bugs roaming by biome & time
  catching.js     # the catch mini-game
  collection.js   # jar + Bugdex records
  terrarium.js    # raising & evolving bugs
  museum.js       # exhibits & visiting friends
  shop.js         # upgrades & food
  time.js         # day/night cycle
  fx.js           # ambient pollen/fireflies, vignette, paper grain
  ui.js           # HUD, menus, toasts
  input.js        # keyboard
  touch.js        # on-screen controls for phones/tablets
  audio.js        # tiny procedural sound effects
  main.js         # boot, loop, camera, interaction
```

## Notes

This is a **non-commercial fan project** made for fun. Pokémon and all related
names are © Nintendo / Creatures Inc. / GAME FREAK inc.

A few creatures (Caterpie, Weedle, Paras, Shuckle and Wimpod) use original
hand-drawn art under `assets/`; every other creature is drawn procedurally from
simple shape descriptors, and even those are framed inside a drawn glass jar so
the whole collection shares one cozy "bug in a jar" look. No original game assets
are used.
