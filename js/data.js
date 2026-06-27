/* ===========================================================================
   data.js — static game content for Poke Bug.
   Only the five hand-drawn creatures are used; everything is drawn from the
   uploaded art (assets/), with no procedural creatures.
   =========================================================================== */
(function (PB) {
  "use strict";

  PB.config = {
    VIEW_W: 960,
    VIEW_H: 540,
    DAY_LENGTH_SEC: 240, // real seconds for a full in-game day
    START_HOUR: 8,
    AUTOSAVE_SEC: 20,
    CATCH_ZONE: 0.5,     // base catch-meter zone width (no net upgrades now)
    CROWD: 7,            // wild creatures drifting through the Forest at once
    START_CANDY: 10,
  };

  PB.timeOfDay = function (hour) {
    if (hour >= 5 && hour < 10) return "morning";
    if (hour >= 10 && hour < 17) return "day";
    if (hour >= 17 && hour < 20) return "evening";
    return "night";
  };

  // habitats — only used to flavour museum visitors' preferences
  PB.biomes = {
    forest: { name: "Woods" }, meadow: { name: "Meadow" }, pond: { name: "Pond" },
    flowers: { name: "Flowers" }, tree: { name: "Old Oak" },
  };

  PB.rarity = {
    common:   { label: "Common",   weight: 100, value: 6,  star: "★" },
    uncommon: { label: "Uncommon", weight: 48,  value: 12, star: "★★" },
    rare:     { label: "Rare",     weight: 18,  value: 26, star: "★★★" },
    epic:     { label: "Epic",     weight: 6,   value: 60, star: "★★★★" },
  };

  /* The five collectible creatures. Each has hand-drawn art under assets/.
     `home` is the habitat a museum friend may favour. `skittish` (0..1) makes
     the catch meter faster and the zone a touch narrower. */
  PB.species = [
    { id: "caterpie", name: "Caterpie", dex: 10, rarity: "common", home: "forest",
      skittish: 0.05, baseSize: 30,
      blurb: "A gentle grub that nibbles leaves all morning. The red antenna gives off a sweet smell." },
    { id: "weedle", name: "Weedle", dex: 13, rarity: "common", home: "forest",
      skittish: 0.18, baseSize: 30,
      blurb: "A hairy little grub with a sharp stinger on its head. Best admired from a polite distance." },
    { id: "paras", name: "Paras", dex: 46, rarity: "uncommon", home: "forest",
      skittish: 0.25, baseSize: 32,
      blurb: "Two mushrooms ride on its back, sharing everything it finds. A wonderfully cozy partnership." },
    { id: "wimpod", name: "Wimpod", dex: 767, rarity: "rare", home: "pond",
      skittish: 0.8, baseSize: 45,
      blurb: "A timid scavenger that bolts at the faintest shadow. Catching one takes a calm, patient hand." },
    { id: "shuckle", name: "Shuckle", dex: 213, rarity: "epic", home: "tree",
      skittish: 0.0, baseSize: 30,
      blurb: "Tucks into a worn shell and quietly ferments berries into sweet juice. Famously, famously slow." },
  ];

  PB.speciesById = {};
  PB.species.forEach(function (s) { PB.speciesById[s.id] = s; });

  // Food for raising creatures in the Garden — paid for directly with candy.
  PB.feeds = [
    { id: "leaf",  name: "Fresh Leaf", icon: "🍃", cost: 2,  love: 10 },
    { id: "berry", name: "Oran Berry", icon: "🫐", cost: 6,  love: 28 },
    { id: "honey", name: "Honey Drop", icon: "🍯", cost: 14, love: 60 },
  ];

  // Museum friends who visit and bring candy.
  PB.friends = [
    { id: "fern", name: "Fern",   emoji: "👧", likes: "forest", line: "The woods exhibit smells like a real forest!" },
    { id: "pip",  name: "Pip",    emoji: "👦", likes: "pond",   line: "I could watch the pond bug all night. Take this!" },
    { id: "oak",  name: "Mr. Oak", emoji: "🧓", likes: "tree",  line: "Splendid specimens! The old oak dwellers are my favourite." },
    { id: "maple", name: "Maple", emoji: "🧒", likes: "meadow", line: "Everything looks so happy in their jars!" },
    { id: "rosa", name: "Rosa",   emoji: "👩", likes: "flowers", line: "Such colour! Thank you for sharing your collection." },
  ];

  // Museum reputation tiers (full collection of 5 = top rank).
  PB.museumTiers = [
    { at: 0, name: "Empty Stand",   blurb: "A quiet room, waiting for its first jar." },
    { at: 1, name: "Curio Corner",  blurb: "A first jar on display — a charming start." },
    { at: 2, name: "Local Gallery", blurb: "Word is getting around." },
    { at: 3, name: "Bug Pavilion",  blurb: "Friends visit just to see your jars." },
    { at: 4, name: "Grand Museum",  blurb: "A renowned little hall of wonders." },
    { at: 5, name: "World Museum",  blurb: "The finest bug museum in all the land. You did it!" },
  ];

})(window.PB = window.PB || {});
