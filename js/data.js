/* ===========================================================================
   data.js — static game content for Poke Bug.
   Only the five hand-drawn creatures are used.
   =========================================================================== */
(function (PB) {
  "use strict";

  PB.config = {
    VIEW_W: 960,
    VIEW_H: 540,
    DAY_LENGTH_SEC: 240,
    START_HOUR: 8,
    AUTOSAVE_SEC: 20,
    START_CANDY: 16,
    CROWD: 6,            // wild creatures in a forest spot at once
  };

  PB.timeOfDay = function (hour) {
    if (hour >= 5 && hour < 10) return "morning";
    if (hour >= 10 && hour < 17) return "day";
    if (hour >= 17 && hour < 20) return "evening";
    return "night";
  };

  PB.rarity = {
    common:   { label: "Common",   weight: 100, value: 6,  star: "★" },
    uncommon: { label: "Uncommon", weight: 48,  value: 12, star: "★★" },
    rare:     { label: "Rare",     weight: 18,  value: 26, star: "★★★" },
    epic:     { label: "Epic",     weight: 6,   value: 60, star: "★★★★" },
  };

  /* The five collectible creatures.
     fw/fh = footprint (cells) in the backpack grid.
     skittish (0..1) makes a wild creature faster & dodgier and the catch bar
     shrink quicker. */
  PB.species = [
    { id: "caterpie", name: "Caterpie", dex: 10, rarity: "common", home: "forest",
      skittish: 0.15, baseSize: 28, fw: 1, fh: 1,
      blurb: "A gentle grub that nibbles leaves all morning." },
    { id: "weedle", name: "Weedle", dex: 13, rarity: "common", home: "forest",
      skittish: 0.3, baseSize: 30, fw: 2, fh: 1,
      blurb: "A hairy little grub with a sharp stinger on its head." },
    { id: "shuckle", name: "Shuckle", dex: 213, rarity: "uncommon", home: "tree",
      skittish: 0.1, baseSize: 30, fw: 1, fh: 1,
      blurb: "Tucks into a worn shell and ferments berries into sweet juice." },
    { id: "paras", name: "Paras", dex: 46, rarity: "rare", home: "forest",
      skittish: 0.45, baseSize: 34, fw: 2, fh: 2,
      blurb: "Two mushrooms ride on its back, sharing everything it finds." },
    { id: "wimpod", name: "Wimpod", dex: 767, rarity: "epic", home: "pond",
      skittish: 0.85, baseSize: 46, fw: 2, fh: 2,
      blurb: "A timid scavenger that bolts at the faintest shadow." },
  ];
  PB.speciesById = {};
  PB.species.forEach(function (s) { PB.speciesById[s.id] = s; });

  // Food — bought in the shop, then dragged onto a creature in the Garden.
  PB.feeds = [
    { id: "leaf",  name: "Fresh Leaf", icon: "🍃", cost: 3,  grow: 0.12 },
    { id: "berry", name: "Oran Berry", icon: "🫐", cost: 8,  grow: 0.30 },
    { id: "honey", name: "Honey Drop", icon: "🍯", cost: 18, grow: 0.60 },
  ];

  // ---- upgrades ------------------------------------------------------------
  // Net: bigger starting catch zone + slower shrink. Bag: more grid cells.
  // Garden: faster passive growth + candy drip.
  PB.upgrades = {
    net: {
      name: "Net", icon: "🥅",
      desc: "A finer net starts the catch bar wider and shrinks it slower.",
      tiers: [
        { name: "Old Net",    cost: 0,    zone: 0.42, shrink: 0.085 },
        { name: "Sturdy Net", cost: 70,   zone: 0.50, shrink: 0.070 },
        { name: "Silk Net",   cost: 200,  zone: 0.58, shrink: 0.056 },
        { name: "Pro Net",    cost: 480,  zone: 0.66, shrink: 0.044 },
        { name: "Master Net", cost: 1100, zone: 0.74, shrink: 0.034 },
      ],
    },
    bag: {
      name: "Backpack", icon: "🎒",
      desc: "A bigger backpack fits more (and larger) creatures.",
      tiers: [
        { name: "Small Bag",  cost: 0,   w: 5, h: 5 },
        { name: "Roomy Bag",  cost: 120, w: 6, h: 5 },
        { name: "Big Bag",    cost: 320, w: 6, h: 6 },
        { name: "Huge Bag",   cost: 720, w: 7, h: 7 },
      ],
    },
    garden: {
      name: "Garden", icon: "🌱",
      desc: "Tend the garden so creatures grow faster and drip more candy.",
      tiers: [
        { name: "Plain Patch",   cost: 0,   growth: 1.0, drip: 1.0 },
        { name: "Tended Patch",  cost: 90,  growth: 1.6, drip: 1.4 },
        { name: "Lush Garden",   cost: 260, growth: 2.4, drip: 2.0 },
        { name: "Magic Garden",  cost: 640, growth: 3.6, drip: 3.0 },
      ],
    },
  };

  // Museum friends.
  PB.friends = [
    { id: "fern", name: "Fern",   emoji: "👧", likes: "forest" },
    { id: "pip",  name: "Pip",    emoji: "👦", likes: "pond" },
    { id: "oak",  name: "Mr. Oak", emoji: "🧓", likes: "tree" },
    { id: "maple", name: "Maple", emoji: "🧒", likes: "meadow" },
    { id: "rosa", name: "Rosa",   emoji: "👩", likes: "flowers" },
  ];

  PB.museumTiers = [
    { at: 0, name: "Empty Stand",   blurb: "A quiet room, waiting for its first jar." },
    { at: 1, name: "Curio Corner",  blurb: "A first jar on display — a charming start." },
    { at: 2, name: "Local Gallery", blurb: "Word is getting around." },
    { at: 3, name: "Bug Pavilion",  blurb: "Friends visit just to see your jars." },
    { at: 4, name: "Grand Museum",  blurb: "A renowned little hall of wonders." },
    { at: 5, name: "World Museum",  blurb: "The finest bug museum in all the land!" },
  ];

  // ---- forest spots --------------------------------------------------------
  // Each path choice rolls one of these outcomes (by weight).
  PB.forestOutcomes = [
    { kind: "catch",    weight: 52, label: "A buzzing thicket!" },
    { kind: "catch_rare", weight: 12, label: "A hidden grove — rarer bugs here!" },
    { kind: "candy",    weight: 12, label: "You found a candy stash!" },
    { kind: "item",     weight: 10, label: "A picnic basket of food!" },
    { kind: "minigame", weight: 10, label: "A little shrine game!" },
    { kind: "unlucky",  weight: 4,  label: "...just rustling leaves. Nothing here." },
  ];

})(window.PB = window.PB || {});
