# 🐛 Poke Bug

A **cozy 2D bug-collecting fan game** in a soft, hand-painted style. Visit two
peaceful places — a **Sunny Garden** and the **Whispering Woods** — and simply
**click or tap** the creatures drifting by to net them. Keep them in **jars**,
feed them until they're happy (and maybe evolve!), and donate them to your own
**museum**. Invite friends to visit and they'll leave you **candy**, which you
spend on better nets, roomier jars, sweet lures and more.

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

Mostly you just **click / tap** creatures. The bottom bar handles everything else.

| Action | Keys |
| --- | --- |
| Catch a creature | **click / tap** it (or `Space` to net the nearest) |
| Travel: Garden / Woods | `1` / `2` |
| Bugdex | `C` |
| Satchel (carried) | `J` |
| Jars (raising) | `R` |
| Museum | `M` |
| Shop | `B` |
| Help | `H` |
| Close a window | `Esc` |

1. **Catch** — click or tap any creature drifting through the scene. Time the
   meter so the marker stops in the green zone. Better nets make the zone wider;
   rare creatures are trickier.
2. **Travel** — use the bottom bar to move between the **Sunny Garden** and the
   **Whispering Woods**. Different creatures appear in each place and at different
   **times of day** — there's a gentle day/night cycle, so visit at night for the
   glowing ones.
3. **Raise** — move caught creatures into your **Jars** and feed them to raise
   their **Love**; happy creatures drip candy, and well-loved ones with an
   evolution line will **evolve**.
4. **Museum** — donate creatures to create exhibits, then **open the doors** so
   friends visit. They reward you with candy — more when your exhibits match the
   biomes they love. Climb from a *Curio Corner* to a *World Museum*.

## What's where

```
index.html        # entry point; loads everything
css/style.css     # the cozy look
assets/
  creatures/      # hand-drawn creature cut-outs (catch screen + scenes)
  jars/           # hand-drawn "creature in a jar" art (collection screens)
js/
  data.js         # all content: species, locations, tools, friends
  art.js          # registry/loader for the hand-drawn art
  sprites.js      # procedural creatures + the glass-jar renderer
  scene.js        # the painterly Garden & Woods backgrounds + locations
  spawns.js       # creatures drifting through the current scene
  catching.js     # the catch mini-game
  collection.js   # satchel + Bugdex records
  terrarium.js    # raising & evolving creatures in jars
  museum.js       # exhibits & visiting friends
  shop.js         # upgrades & food
  time.js         # day/night cycle
  fx.js           # ambient pollen/fireflies, vignette, paper grain
  ui.js           # HUD, menus, toasts
  input.js        # keyboard
  audio.js        # tiny procedural sound effects
  main.js         # boot, loop, scene render, click-to-catch, navigation
```

## Notes

This is a **non-commercial fan project** made for fun. Pokémon and all related
names are © Nintendo / Creatures Inc. / GAME FREAK inc.

A few creatures (Caterpie, Weedle, Paras, Shuckle and Wimpod) use original
hand-drawn art under `assets/`; every other creature is drawn procedurally from
simple shape descriptors, and even those are framed inside a drawn glass jar so
the whole collection shares one cozy "bug in a jar" look. The location
backgrounds are painted procedurally with soft gradients and blobs. No original
game assets are used.
