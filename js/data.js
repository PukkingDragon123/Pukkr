/* ===========================================================================
   data.js — static content for Poke Bug: a cozy idle / gacha bug-collecting RPG.
   Loop: bait & catch (multi-lure) + capsule pulls → build & merge team →
   battle (combo + ultimate + abilities + enemy modifiers) → earn → upgrade → unlock.
   =========================================================================== */
(function (PB) {
  "use strict";

  PB.config = {
    VIEW_W: 960,
    VIEW_H: 540,
    AUTOSAVE_SEC: 15,
    START_TOKENS: 30,
    START_GLIMMER: 0,         // the first Daily Dew grants a starter pull
    DAILY_DEW: 15,            // ✨ granted once per real calendar day
    TEAM_SIZE: 3,             // base; grows with the Team Size upgrade
    CATCH_ZONE: 0.58,         // base catch-bar green width (forgiving)
    CATCH_SHRINK: 0.02,       // slow close, with a floor (never auto-fails)
    OFFLINE_CAP_H: 8,         // hours of offline catch-up
  };

  PB.rarity = {
    common:   { label: "Common",   value: 6,  star: "★",    talent: 0.06, col: "#9bb26b" },
    uncommon: { label: "Uncommon", value: 11, star: "★★",   talent: 0.18, col: "#5bb6c9" },
    rare:     { label: "Rare",     value: 22, star: "★★★",  talent: 0.45, col: "#c08bdf" },
    epic:     { label: "Epic",     value: 48, star: "★★★★", talent: 0.85, col: "#f0a93a" },
  };

  // The collectible / fightable creatures (hand-drawn for the 5; procedural for the rest).
  PB.species = [
    { id: "caterpie", name: "Caterpie", dex: 10, rarity: "common", baseSize: 28,
      blurb: "A gentle grub that nibbles leaves all day." },
    { id: "weedle", name: "Weedle", dex: 13, rarity: "common", baseSize: 30,
      blurb: "A hairy grub with a sharp stinger." },
    { id: "shuckle", name: "Shuckle", dex: 213, rarity: "uncommon", baseSize: 30,
      blurb: "A tough little shell that ferments berries." },
    { id: "paras", name: "Paras", dex: 46, rarity: "rare", baseSize: 34,
      blurb: "Mushroom-backed and surprisingly sturdy." },
    { id: "wimpod", name: "Wimpod", dex: 767, rarity: "epic", baseSize: 46,
      blurb: "Timid, but fast and full of surprises." },
    { id: "corphish", name: "Corphish", dex: 341, rarity: "common", baseSize: 30,
      look: { body: "crab", c1: "#e0533f", c2: "#f0c040", c3: "#222", claws: true },
      blurb: "A hardy crawdad that loves a scrap." },
    { id: "dwebble", name: "Dwebble", dex: 557, rarity: "uncommon", baseSize: 30,
      look: { body: "crab", c1: "#e0a86a", c2: "#9aa0a6", c3: "#222", claws: true, shell: true },
      blurb: "Carries a sturdy stone shield on its back." },
    { id: "anorith", name: "Anorith", dex: 347, rarity: "rare", baseSize: 40,
      look: { body: "shrimp", c1: "#7fb0d8", c2: "#2a4d6e", c3: "#222" },
      blurb: "An ancient swimmer with slashing claws." },
  ];
  PB.speciesById = {};
  PB.species.forEach(function (s) { PB.speciesById[s.id] = s; });

  // Talents — rare/special catches sparkle and carry one. They buff the team AND
  // grant that bug an active battle ability (see combat.js / PB.abilities).
  PB.talents = {
    mighty: { name: "Mighty",  icon: "💪", desc: "+25% team attack · Smash",   atkPct: 0.25, ability: "smash" },
    lucky:  { name: "Lucky",   icon: "🍀", desc: "+18% crit · Focus",          crit: 0.18,   ability: "focus" },
    healer: { name: "Healer",  icon: "💖", desc: "heals the team · Mend",       heal: 0.05,   ability: "mend" },
    tough:  { name: "Tough",   icon: "🛡️", desc: "+35% team HP · Guard",        hpPct: 0.35,  ability: "guard" },
    swift:  { name: "Swift",   icon: "⚡", desc: "+50% idle attack · Overdrive", idlePct: 0.5, ability: "overdrive" },
  };
  PB.talentIds = Object.keys(PB.talents);

  // Active battle abilities, keyed by talent (a no-talent bug grants "Rally").
  PB.abilities = {
    smash:     { name: "Smash",     icon: "💥", cd: 8,  desc: "A huge hit (4× team attack)." },
    focus:     { name: "Focus",     icon: "🎯", cd: 12, desc: "Your next 5 taps always crit." },
    mend:      { name: "Mend",      icon: "💞", cd: 10, desc: "Heal 25% of team HP." },
    guard:     { name: "Guard",     icon: "🛡️", cd: 14, desc: "Block 90% damage for 3s." },
    overdrive: { name: "Overdrive", icon: "⚡", cd: 10, desc: "Triple idle attack for 4s." },
    rally:     { name: "Rally",     icon: "📣", cd: 9,  desc: "+20% team attack for 4s." },
  };

  // Enemy modifiers — read the foe, pick your tool. Bosses always carry two.
  PB.mods = {
    armored: { name: "Armored",  icon: "🛡️", blurb: "Taps deal half — lean on idle, abilities & SWARM." },
    enrage:  { name: "Enrage",   icon: "😤", blurb: "Grows stronger over time — end it fast." },
    regen:   { name: "Regen",    icon: "💚", blurb: "Heals if you stop tapping — keep at it." },
    shielded:{ name: "Shielded", icon: "🔵", blurb: "A shield soaks the first hits — burst through." },
    swift:   { name: "Swift",    icon: "💨", blurb: "Strikes faster — bring Tough or Healer." },
  };

  // Fruit bait: longer waits give better odds of rare/talented bugs.
  PB.fruits = [
    { id: "leaf",  name: "Leaf",  icon: "🍃", wait: 18,  rare: 0.0,  desc: "Quick & free." },
    { id: "berry", name: "Berry", icon: "🫐", wait: 45,  rare: 0.22, desc: "Tastier — better odds." },
    { id: "honey", name: "Honey", icon: "🍯", wait: 95,  rare: 0.5,  desc: "Irresistible — best odds." },
  ];

  // Capsule (gacha) — transparent odds; pity guarantees in gacha.js.
  PB.gachaCfg = {
    costSingle: 12,
    costTen: 108,           // 10 pulls for the price of 9
    odds: { common: 0.64, uncommon: 0.26, rare: 0.085, epic: 0.015 },
    rarePity: 10,          // guaranteed Rare+ by the 10th dry pull
    epicSoft: 50,          // epic chance ramps from here
    epicRamp: 0.03,        // +3% per dry pull past the soft floor
    epicHard: 80,          // guaranteed Epic by here
  };

  // Token-bought upgrades. costs[level] = price to go level → level+1.
  PB.upgrades = [
    { key: "lures", name: "Lure Slots", icon: "🎣", max: 3,
      costs: [60, 180, 450], blurb: "Run more bait at once (+1 lure)." },
    { key: "comfy", name: "Comfy Bait", icon: "🛋️", max: 5,
      costs: [40, 70, 120, 200, 330], blurb: "Bait waits −10% per level." },
    { key: "assist", name: "Catch Assist", icon: "🪤", max: 5,
      costs: [50, 90, 150, 250, 400], blurb: "Wider, slower catch bar + tries." },
    { key: "team", name: "Team Size", icon: "👥", max: 2,
      costs: [200, 600], blurb: "+1 battle team slot." },
    { key: "idle", name: "Idle Power", icon: "🔋", max: 8,
      costs: [45, 75, 120, 190, 300, 470, 730, 1100], blurb: "+12% auto (idle) attack." },
    { key: "greed", name: "Treasure", icon: "💰", max: 5,
      costs: [80, 140, 240, 400, 660], blurb: "+12% tokens from battles." },
    { key: "luck", name: "Lucky Charm", icon: "🍀", max: 3,
      costs: [120, 260, 520], blurb: "+4% base crit & +5% capsule talents." },
  ];
  PB.upgradeById = {};
  PB.upgrades.forEach(function (u) { PB.upgradeById[u.key] = u; });

  // Quest templates — three are active at a time; claim → replaced by a new one.
  PB.questDefs = [
    { type: "catch",  target: 5, text: "Catch {t} bugs",            reward: { tokens: 25 } },
    { type: "battle", target: 8, text: "Win {t} battles",           reward: { glimmer: 6 } },
    { type: "merge",  target: 2, text: "Merge {t} times in the Lab", reward: { tokens: 30 } },
    { type: "pull",   target: 3, text: "Pull {t} capsules",         reward: { glimmer: 5 } },
    { type: "combo",  target: 18, text: "Reach a {t} hit combo",    reward: { glimmer: 5 } },
    { type: "rare",   target: 1, text: "Get a Rare or better bug",  reward: { glimmer: 8 } },
    { type: "boss",   target: 1, text: "Defeat an area boss",       reward: { glimmer: 7 } },
    { type: "ult",    target: 2, text: "Unleash SWARM {t} times",   reward: { tokens: 35 } },
    { type: "dex",    target: 1, text: "Discover a new species",    reward: { glimmer: 6 } },
  ];

  // Areas unlock in order by beating each one's boss.
  PB.areas = [
    { id: "woods", name: "Whispering Woods", bg: "forest",
      bugs: ["caterpie", "weedle", "shuckle", "paras"], foes: ["caterpie", "weedle", "paras"], waves: 5 },
    { id: "beach", name: "Sunny Beach", bg: "beach",
      bugs: ["corphish", "dwebble", "wimpod"], foes: ["corphish", "dwebble", "wimpod"], waves: 6 },
    { id: "grove", name: "Glowing Grove", bg: "forest",
      bugs: ["paras", "shuckle", "anorith", "wimpod"], foes: ["paras", "shuckle", "anorith"], waves: 7 },
    { id: "reef", name: "Coral Reef", bg: "beach",
      bugs: ["anorith", "wimpod", "corphish", "dwebble"], foes: ["wimpod", "anorith", "dwebble"], waves: 8 },
  ];

  PB.sizeLabelFor = function (ratio) {
    if (ratio < 0.82) return "Tiny";
    if (ratio < 0.97) return "Small";
    if (ratio < 1.12) return "Average";
    if (ratio < 1.32) return "Big";
    return "Huge";
  };

})(window.PB = window.PB || {});
