# 🐛 Poke Bug

A **cozy 2D bug-collecting fan game** in a soft, hand-painted style, with three
peaceful places to visit:

- 🌳 **Forest** — wild creatures drift by; **click or tap** one to net it.
- 🌷 **Garden** — your creatures live here in jars; feed them to raise their Love.
- 🏛 **Museum** — display your jars and invite friends, who leave you candy.

Inspired by laid-back bug-park collecting games. There's no failing and no rush —
just a warm little place to potter around in. Every creature is hand-drawn art.

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

Mostly you just **click / tap**. The bottom bar switches between the three places.

| Action | Keys |
| --- | --- |
| Catch a creature (in the Forest) | **click / tap** it (or `Space` to net the nearest) |
| Forest / Garden / Museum | `1` / `2` / `3` |
| Help | `H` |
| Close a window | `Esc` |

1. **Forest** — click or tap a creature drifting by. Time the catch meter so the
   marker stops in the green zone; skittish creatures (like Wimpod) are trickier.
2. **Garden** — your creatures sit here in jars. Tap a jar to **feed** it (costs
   a little candy) and raise its **Love** — happy creatures gently drip candy
   back. There's a soft day/night cycle, with fireflies at night.
3. **Museum** — from a Garden jar, choose **Display in Museum**, then **open the
   doors**. Friends visit and leave candy — more when an exhibit matches the
   habitat they love. Fill all five jars to reach a *World Museum*.

## What's where

```
index.html        # entry point; loads everything
css/style.css     # the cozy look
assets/
  creatures/      # hand-drawn creature cut-outs (catch screen + scenes)
  jars/           # hand-drawn "creature in a jar" art (collection screens)
js/
  data.js         # all content: the five creatures, feeds, friends
  art.js          # registry/loader + drawing for the hand-drawn art
  scene.js        # the painterly Forest / Garden / Museum backgrounds
  spawns.js       # wild creatures drifting through the Forest
  catching.js     # the catch mini-game
  collection.js   # your owned creatures (catch / release)
  raise.js        # feeding & passive candy in the Garden
  museum.js       # displaying jars & visiting friends
  time.js         # day/night cycle
  fx.js           # ambient pollen/fireflies, vignette, paper grain
  ui.js           # HUD, toasts, catch overlay, feed card, museum bar
  input.js        # keyboard
  audio.js        # tiny procedural sound effects
  main.js         # boot, loop, scene render, click-to-catch, navigation
```

## Notes

This is a **non-commercial fan project** made for fun. Pokémon and all related
names are © Nintendo / Creatures Inc. / GAME FREAK inc.

All five creatures (Caterpie, Weedle, Paras, Shuckle and Wimpod) use original
hand-drawn art under `assets/` — a painterly portrait for the Forest and catch
screen, and a "creature in a jar" piece for the Garden and Museum. The three
location backgrounds are painted procedurally with soft gradients and blobs. No
original game assets are used.
