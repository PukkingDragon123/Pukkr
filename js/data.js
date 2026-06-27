/* ===========================================================================
   data.js — static game content for Poke Bug
   ---------------------------------------------------------------------------
   Everything here is pure data (no logic). It is attached to the global PB
   namespace so the rest of the game can read it without a module loader.

   A "species" describes one collectible bug. Sprites are drawn procedurally
   from the `look` descriptor (see sprites.js) so there are no image assets.

   look descriptor fields:
     body   : 'grub' | 'round' | 'beetle' | 'mantis' | 'moth' | 'dragon' | 'spider'
     c1     : main body colour
     c2     : accent colour
     c3     : detail colour (eyes / pattern), optional
     wings  : 'none' | 'butterfly' | 'bee' | 'fly' | 'beetle'
     pattern: 'none' | 'spots' | 'stripes' | 'segments'
     glow   : boolean (gentle glow, e.g. fireflies)
     horn   : boolean (pincer / horn for beetles & mantises)
   =========================================================================== */
(function (PB) {
  "use strict";

  PB.config = {
    TILE: 16,
    VIEW_W: 480,
    VIEW_H: 270,
    MAP_W: 56,           // world size in tiles
    MAP_H: 42,
    PLAYER_SPEED: 1.35,  // base tiles-ish per frame unit (scaled by shoes)
    DAY_LENGTH_SEC: 240, // real seconds for a full in-game day
    START_HOUR: 8,
    AUTOSAVE_SEC: 20,
    JAR_START: 8,
    TERRARIUM_START: 3,
  };

  // Times of day used for spawn windows ----------------------------------
  // morning 5-10, day 10-17, evening 17-20, night 20-5
  PB.timeOfDay = function (hour) {
    if (hour >= 5 && hour < 10) return "morning";
    if (hour >= 10 && hour < 17) return "day";
    if (hour >= 17 && hour < 20) return "evening";
    return "night";
  };

  // Biomes — regions of the map where bugs are found ----------------------
  PB.biomes = {
    meadow: { name: "Sunny Meadow", tint: "#9bd06f" },
    forest: { name: "Whispering Woods", tint: "#5f9e57" },
    pond:   { name: "Lily Pond", tint: "#7fc6c0" },
    flowers:{ name: "Flower Patch", tint: "#e6a3d0" },
    tree:   { name: "Old Oak", tint: "#c9a36b" },
  };

  // Rarity → base candy value & relative spawn weight ---------------------
  PB.rarity = {
    common:    { label: "Common",    weight: 100, value: 4,  star: "★" },
    uncommon:  { label: "Uncommon",  weight: 45,  value: 9,  star: "★★" },
    rare:      { label: "Rare",      weight: 16,  value: 22, star: "★★★" },
    epic:      { label: "Epic",      weight: 5,   value: 55, star: "★★★★" },
  };

  /* ----------------------------------------------------------------------
     Species roster. `next`/`evolveAt` define raising/evolution chains.
     `skittish` (0..1) shrinks the catch zone and makes the bug flee faster.
     ---------------------------------------------------------------------- */
  PB.species = [
    // --- Caterpie line --------------------------------------------------
    { id: "caterpie", name: "Caterpie", rarity: "common", biomes: ["meadow", "forest"], times: ["morning", "day"],
      skittish: 0.05, baseSize: 30,
      look: { body: "grub", c1: "#9dd35b", c2: "#d9534f", c3: "#fff", wings: "none", pattern: "segments", horn: true },
      blurb: "A gentle grub that nibbles leaves all morning. The red antenna gives off a faint, sweet smell.",
      next: "metapod", evolveAt: 3 },
    { id: "metapod", name: "Metapod", rarity: "uncommon", biomes: ["forest"], times: ["day"],
      skittish: 0.0, baseSize: 35,
      look: { body: "round", c1: "#7ec850", c2: "#4f9b54", c3: "#222", wings: "none", pattern: "none" },
      blurb: "Hardened into a quiet green shell. It barely moves, just waiting for the day it takes flight.",
      next: "butterfree", evolveAt: 5 },
    { id: "butterfree", name: "Butterfree", rarity: "rare", biomes: ["flowers", "meadow"], times: ["day"],
      skittish: 0.45, baseSize: 48,
      look: { body: "moth", c1: "#7a6cc4", c2: "#fff", c3: "#222", wings: "butterfly", pattern: "spots" },
      blurb: "Dusts its wings with sparkling scales. Beloved by museum visitors for its graceful drifting flight." },

    // --- Weedle line ----------------------------------------------------
    { id: "weedle", name: "Weedle", rarity: "common", biomes: ["forest", "tree"], times: ["morning", "day"],
      skittish: 0.15, baseSize: 28,
      look: { body: "grub", c1: "#e8b86a", c2: "#d9534f", c3: "#fff", wings: "none", pattern: "segments", horn: true },
      blurb: "A hairy little grub with a sharp stinger on its head. Best admired from a polite distance.",
      next: "kakuna", evolveAt: 3 },
    { id: "kakuna", name: "Kakuna", rarity: "uncommon", biomes: ["tree"], times: ["day"],
      skittish: 0.0, baseSize: 33,
      look: { body: "round", c1: "#f0c040", c2: "#c98f1f", c3: "#222", wings: "none", pattern: "none" },
      blurb: "A golden cocoon, warm to the touch. Inside, something fierce is patiently forming.",
      next: "beedrill", evolveAt: 5 },
    { id: "beedrill", name: "Beedrill", rarity: "rare", biomes: ["flowers", "forest"], times: ["day", "evening"],
      skittish: 0.6, baseSize: 50,
      look: { body: "dragon", c1: "#f0c040", c2: "#222", c3: "#fff", wings: "bee", pattern: "stripes", horn: true },
      blurb: "Triple-stingered and territorial. Catching one is a true test of net skill." },

    // --- Wurmple line ---------------------------------------------------
    { id: "wurmple", name: "Wurmple", rarity: "common", biomes: ["meadow", "flowers"], times: ["morning", "day"],
      skittish: 0.1, baseSize: 26,
      look: { body: "grub", c1: "#d96666", c2: "#f6c453", c3: "#fff", wings: "none", pattern: "spots", horn: true },
      blurb: "A rosy caterpillar with spike-tipped tails. It loves sweet sap and warm sunbeams.",
      next: "silcoon", evolveAt: 3 },
    { id: "silcoon", name: "Silcoon", rarity: "uncommon", biomes: ["tree", "forest"], times: ["day"],
      skittish: 0.0, baseSize: 30,
      look: { body: "round", c1: "#fff", c2: "#e0d8c0", c3: "#d96666", wings: "none", pattern: "none" },
      blurb: "A silken white cocoon that watches the world through a single tiny gap.",
      next: "beautifly", evolveAt: 5 },
    { id: "beautifly", name: "Beautifly", rarity: "rare", biomes: ["flowers"], times: ["morning", "day"],
      skittish: 0.4, baseSize: 46,
      look: { body: "moth", c1: "#f0c040", c2: "#3a78c2", c3: "#d9534f", wings: "butterfly", pattern: "spots" },
      blurb: "Sips flower nectar through a long curled proboscis. A jewel of any flower patch." },

    // --- Standalone friends --------------------------------------------
    { id: "paras", name: "Paras", rarity: "common", biomes: ["forest"], times: ["day", "evening"],
      skittish: 0.2, baseSize: 32,
      look: { body: "beetle", c1: "#e8895a", c2: "#f6a", c3: "#222", wings: "none", pattern: "spots" },
      blurb: "Two mushrooms ride on its back, sharing everything the little bug finds. A cozy partnership." },
    { id: "venonat", name: "Venonat", rarity: "uncommon", biomes: ["forest", "meadow"], times: ["night", "evening"],
      skittish: 0.3, baseSize: 38,
      look: { body: "round", c1: "#9a7fd0", c2: "#d94", c3: "#d9534f", wings: "none", pattern: "spots" },
      blurb: "A fuzzy ball of fur with enormous eyes that drink in moonlight. Drawn to gentle lantern glow.",
      next: "venomoth", evolveAt: 4 },
    { id: "venomoth", name: "Venomoth", rarity: "rare", biomes: ["flowers"], times: ["night"],
      skittish: 0.5, baseSize: 48,
      look: { body: "moth", c1: "#b8a0e0", c2: "#7a6cc4", c3: "#d94", wings: "butterfly", pattern: "stripes" },
      blurb: "Scatters glittering dust under the stars. The night patch shimmers wherever it flutters." },

    { id: "ledyba", name: "Ledyba", rarity: "common", biomes: ["meadow", "flowers"], times: ["morning"],
      skittish: 0.25, baseSize: 30,
      look: { body: "beetle", c1: "#e84d4d", c2: "#222", c3: "#fff", wings: "beetle", pattern: "spots" },
      blurb: "A bashful ladybug that huddles with friends for warmth on cool mornings.",
      next: "ledian", evolveAt: 4 },
    { id: "ledian", name: "Ledian", rarity: "uncommon", biomes: ["meadow"], times: ["morning", "evening"],
      skittish: 0.35, baseSize: 44,
      look: { body: "beetle", c1: "#e84d4d", c2: "#f6c453", c3: "#222", wings: "bee", pattern: "spots" },
      blurb: "The stars are said to give it strength. Sprinkles glowing pollen as it loops through the air." },

    { id: "spinarak", name: "Spinarak", rarity: "common", biomes: ["forest", "tree"], times: ["night", "evening"],
      skittish: 0.3, baseSize: 30,
      look: { body: "spider", c1: "#7ec850", c2: "#d94", c3: "#222", wings: "none", pattern: "stripes" },
      blurb: "Spins patient silk between the branches and reads the threads like a gentle little oracle.",
      next: "ariados", evolveAt: 4 },
    { id: "ariados", name: "Ariados", rarity: "uncommon", biomes: ["forest"], times: ["night"],
      skittish: 0.45, baseSize: 46,
      look: { body: "spider", c1: "#d9534f", c2: "#f6c453", c3: "#222", wings: "none", pattern: "stripes", horn: true },
      blurb: "Trails a single line of silk wherever it roams, always able to find its way home." },

    { id: "volbeat", name: "Volbeat", rarity: "uncommon", biomes: ["pond", "meadow"], times: ["night"],
      skittish: 0.4, baseSize: 34,
      look: { body: "beetle", c1: "#3a78c2", c2: "#f6e27a", c3: "#fff", wings: "bee", pattern: "none", glow: true },
      blurb: "Draws looping patterns of light over the pond at night to greet the Illumise." },
    { id: "illumise", name: "Illumise", rarity: "uncommon", biomes: ["pond", "flowers"], times: ["night"],
      skittish: 0.4, baseSize: 34,
      look: { body: "beetle", c1: "#6a4fb0", c2: "#7fe0d0", c3: "#fff", wings: "bee", pattern: "none", glow: true },
      blurb: "Leads a glowing swarm with a sweet fragrance. The pond becomes a dance floor under the moon." },

    { id: "combee", name: "Combee", rarity: "common", biomes: ["flowers", "tree"], times: ["day"],
      skittish: 0.2, baseSize: 28,
      look: { body: "round", c1: "#f6c453", c2: "#a07a4a", c3: "#222", wings: "bee", pattern: "none" },
      blurb: "Three faces stacked in a tiny honeycomb. It hums a contented tune while gathering nectar.",
      next: "vespiquen", evolveAt: 6 },
    { id: "vespiquen", name: "Vespiquen", rarity: "epic", biomes: ["flowers"], times: ["day"],
      skittish: 0.5, baseSize: 52,
      look: { body: "dragon", c1: "#f6c453", c2: "#3a2f25", c3: "#fff", wings: "bee", pattern: "stripes" },
      blurb: "The regal queen of the hive. Museum visitors line up just to glimpse her elegant comb-gown." },

    { id: "joltik", name: "Joltik", rarity: "uncommon", biomes: ["forest", "tree"], times: ["night"],
      skittish: 0.5, baseSize: 22,
      look: { body: "spider", c1: "#f6e27a", c2: "#3a78c2", c3: "#222", wings: "none", pattern: "none", glow: true },
      blurb: "Tiniest of bugs. It clings to larger creatures to sip up static, crackling softly.",
      next: "galvantula", evolveAt: 5 },
    { id: "galvantula", name: "Galvantula", rarity: "rare", biomes: ["tree"], times: ["night"],
      skittish: 0.55, baseSize: 44,
      look: { body: "spider", c1: "#f6c453", c2: "#3a78c2", c3: "#222", wings: "none", pattern: "stripes", glow: true },
      blurb: "Weaves an electrified web that hums with stored lightning. Handle with a very good net." },

    { id: "sewaddle", name: "Sewaddle", rarity: "common", biomes: ["forest", "tree"], times: ["morning", "day"],
      skittish: 0.15, baseSize: 28,
      look: { body: "grub", c1: "#cfe88a", c2: "#5f9e57", c3: "#222", wings: "none", pattern: "segments" },
      blurb: "Sews itself a leafy hood for a cozy nap. The tidiest dresser in the whole forest.",
      next: "swadloon", evolveAt: 3 },
    { id: "swadloon", name: "Swadloon", rarity: "uncommon", biomes: ["forest"], times: ["day"],
      skittish: 0.1, baseSize: 32,
      look: { body: "round", c1: "#5f9e57", c2: "#f6c453", c3: "#222", wings: "none", pattern: "none" },
      blurb: "Wrapped snug in leaves, it makes the forest floor greener wherever it rests.",
      next: "leavanny", evolveAt: 5 },
    { id: "leavanny", name: "Leavanny", rarity: "rare", biomes: ["forest", "flowers"], times: ["day"],
      skittish: 0.45, baseSize: 50,
      look: { body: "mantis", c1: "#9dd35b", c2: "#f6c453", c3: "#222", wings: "none", pattern: "none", horn: true },
      blurb: "A kindly tailor that snips leaf-clothes for smaller bugs with its sharp, gentle arms." },

    { id: "scyther", name: "Scyther", rarity: "rare", biomes: ["meadow", "forest"], times: ["day"],
      skittish: 0.65, baseSize: 52,
      look: { body: "mantis", c1: "#5fb35f", c2: "#f6e27a", c3: "#222", wings: "fly", pattern: "none", horn: true },
      blurb: "A blinding-fast blade-mantis. It respects only a collector with a steady hand and a fine net." },
    { id: "pinsir", name: "Pinsir", rarity: "rare", biomes: ["tree", "forest"], times: ["day", "evening"],
      skittish: 0.6, baseSize: 52,
      look: { body: "beetle", c1: "#b08436", c2: "#6a4f2a", c3: "#222", wings: "none", pattern: "none", horn: true },
      blurb: "Proud of its mighty pincers, it loves a friendly contest of strength over a wedge of fruit." },
    { id: "heracross", name: "Heracross", rarity: "epic", biomes: ["tree"], times: ["morning", "night"],
      skittish: 0.6, baseSize: 54,
      look: { body: "beetle", c1: "#3a4fb0", c2: "#f6c453", c3: "#fff", wings: "beetle", pattern: "none", horn: true },
      blurb: "The treasure of the old oak. It slurps sweet sap all night and lifts a hundred times its weight." },
    { id: "yanma", name: "Yanma", rarity: "uncommon", biomes: ["pond", "meadow"], times: ["day", "evening"],
      skittish: 0.5, baseSize: 44,
      look: { body: "dragon", c1: "#d94d4d", c2: "#7fe0d0", c3: "#222", wings: "fly", pattern: "none" },
      blurb: "A darting dragonfly that can hover and even fly backwards. Its huge eyes miss nothing." },
    { id: "shuckle", name: "Shuckle", rarity: "epic", biomes: ["tree"], times: ["evening", "night"],
      skittish: 0.0, baseSize: 30,
      look: { body: "round", c1: "#f0c040", c2: "#d9534f", c3: "#222", wings: "none", pattern: "spots" },
      blurb: "Tucks into a worn shell and quietly ferments berries into sweet juice. Famously, famously slow." },

    { id: "wimpod", name: "Wimpod", rarity: "rare", biomes: ["pond"], times: ["day", "evening", "night"],
      skittish: 0.8, baseSize: 45,
      look: { body: "beetle", c1: "#9aa6c6", c2: "#6a5fb0", c3: "#f6e27a", wings: "none", pattern: "segments", horn: true },
      blurb: "A timid little scavenger that bolts at the faintest shadow. Catching one takes a calm, patient hand." },
  ];

  // Index for quick lookups
  PB.speciesById = {};
  PB.species.forEach(function (s) { PB.speciesById[s.id] = s; });

  /* ----------------------------------------------------------------------
     Tools & upgrades sold at the shop. Each upgrade has tiered levels.
     ---------------------------------------------------------------------- */
  PB.tools = {
    net: {
      name: "Net", icon: "🪤",
      desc: "A wider net makes the catch zone bigger and forgiving.",
      tiers: [
        { name: "Old Net",     cost: 0,    zone: 0.30 },
        { name: "Sturdy Net",  cost: 60,   zone: 0.40 },
        { name: "Silk Net",    cost: 180,  zone: 0.52 },
        { name: "Pro Net",     cost: 450,  zone: 0.64 },
        { name: "Golden Net",  cost: 1100, zone: 0.80 },
      ],
    },
    shoes: {
      name: "Shoes", icon: "👟",
      desc: "Comfier shoes let you stroll the meadow a little faster.",
      tiers: [
        { name: "Sandals",       cost: 0,   speed: 1.0 },
        { name: "Trail Shoes",   cost: 50,  speed: 1.2 },
        { name: "Spring Boots",  cost: 160, speed: 1.4 },
        { name: "Breeze Runners",cost: 380, speed: 1.65 },
      ],
    },
    jar: {
      name: "Jars", icon: "🫙",
      desc: "More jars means you can carry more bugs before heading home.",
      tiers: [
        { name: "Few Jars",   cost: 0,   slots: 8 },
        { name: "Jar Basket", cost: 70,  slots: 14 },
        { name: "Jar Crate",  cost: 200, slots: 22 },
        { name: "Jar Wagon",  cost: 500, slots: 36 },
      ],
    },
    terrarium: {
      name: "Terrarium", icon: "🌿",
      desc: "Extra terrarium pods let you raise more bugs at once at home.",
      tiers: [
        { name: "Small Terrarium",  cost: 0,   slots: 3 },
        { name: "Garden Terrarium", cost: 120, slots: 5 },
        { name: "Grand Terrarium",  cost: 340, slots: 8 },
        { name: "Conservatory",     cost: 800, slots: 12 },
      ],
    },
    lure: {
      name: "Lure", icon: "🍯",
      desc: "Sweet honey lure raises the chance that rarer bugs appear.",
      tiers: [
        { name: "No Lure",      cost: 0,   rare: 0.0 },
        { name: "Fruit Slice",  cost: 90,  rare: 0.10 },
        { name: "Sweet Honey",  cost: 260, rare: 0.22 },
        { name: "Royal Nectar", cost: 620, rare: 0.38 },
      ],
    },
  };

  // Consumable feed for raising bugs (bought once, used many times)
  PB.feeds = [
    { id: "leaf",   name: "Fresh Leaf",   icon: "🍃", cost: 3,  love: 8,  desc: "A crisp leaf. A simple, happy snack." },
    { id: "berry",  name: "Oran Berry",   icon: "🫐", cost: 8,  love: 20, desc: "Juicy and sweet — bugs adore it." },
    { id: "honey",  name: "Honey Drop",   icon: "🍯", cost: 18, love: 45, desc: "A glistening drop of pure delight." },
  ];

  /* ----------------------------------------------------------------------
     Museum friends — NPCs who visit your museum and bring candy & cheer.
     A friend "likes" a theme; donating bugs that match pays a bonus.
     ---------------------------------------------------------------------- */
  PB.friends = [
    { id: "maple", name: "Maple", emoji: "🧒", likes: "meadow",
      line: "Wow, your meadow bugs look so happy! Here's some candy I saved." },
    { id: "fern",  name: "Fern",  emoji: "👧", likes: "forest",
      line: "The forest exhibit smells just like a real woodland. Lovely!" },
    { id: "pip",   name: "Pip",   emoji: "👦", likes: "pond",
      line: "I could watch the pond bugs glow all night. Take this!" },
    { id: "rosa",  name: "Rosa",  emoji: "👩", likes: "flowers",
      line: "Your flower patch is bursting with colour. Thank you for sharing it!" },
    { id: "oak",   name: "Mr. Oak", emoji: "🧓", likes: "tree",
      line: "Splendid specimens! The old oak dwellers are my favourite." },
  ];

  // Museum rating tiers based on number of donated species
  PB.museumTiers = [
    { at: 0,  name: "Empty Stand",   blurb: "A quiet room, waiting for its first exhibit." },
    { at: 1,  name: "Curio Corner",  blurb: "A few jars on display — a humble, charming start." },
    { at: 4,  name: "Local Gallery", blurb: "Word is getting around the meadow." },
    { at: 8,  name: "Bug Pavilion",  blurb: "Friends visit just to see your collection." },
    { at: 14, name: "Grand Museum",  blurb: "A renowned hall of wonders. You did this!" },
    { at: 22, name: "World Museum",  blurb: "The finest bug museum in all the land." },
  ];

})(window.PB = window.PB || {});
