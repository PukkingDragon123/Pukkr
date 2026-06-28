/* ===========================================================================
   data.js — static content for Poke Bug: a cozy idle bug-collecting RPG.
   Loop: bait & wait → catch → merge → battle → unlock areas.
   =========================================================================== */
(function (PB) {
  "use strict";

  PB.config = {
    VIEW_W: 960,
    VIEW_H: 540,
    AUTOSAVE_SEC: 15,
    START_TOKENS: 12,
    TEAM_SIZE: 3,
    CATCH_ZONE: 0.46,     // catch-bar zone width
    CATCH_SHRINK: 0.06,   // how fast it closes
  };

  PB.rarity = {
    common:   { label: "Common",   value: 6,  star: "★",    talent: 0.06 },
    uncommon: { label: "Uncommon", value: 11, star: "★★",   talent: 0.18 },
    rare:     { label: "Rare",     value: 22, star: "★★★",  talent: 0.45 },
    epic:     { label: "Epic",     value: 48, star: "★★★★", talent: 0.85 },
  };

  // The collectible / fightable creatures (hand-drawn for the 5; procedural beach bugs).
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

  // Talents — rare/special catches sparkle and carry one. They buff the team.
  PB.talents = {
    mighty: { name: "Mighty",  icon: "💪", desc: "+25% team attack",  atkPct: 0.25 },
    lucky:  { name: "Lucky",   icon: "🍀", desc: "+18% crit chance",  crit: 0.18 },
    healer: { name: "Healer",  icon: "💖", desc: "heals the team",    heal: 0.05 },
    tough:  { name: "Tough",   icon: "🛡️", desc: "+35% team HP",      hpPct: 0.35 },
    swift:  { name: "Swift",   icon: "⚡", desc: "+50% idle attack",  idlePct: 0.5 },
  };
  PB.talentIds = Object.keys(PB.talents);

  // Fruit bait: longer waits give better odds of rare/talented bugs.
  PB.fruits = [
    { id: "leaf",  name: "Leaf Bait",  icon: "🍃", wait: 18,  rare: 0.0,  desc: "Quick & free." },
    { id: "berry", name: "Berry Bait", icon: "🫐", wait: 45,  rare: 0.22, desc: "Tastier — better odds." },
    { id: "honey", name: "Honey Bait", icon: "🍯", wait: 95,  rare: 0.5,  desc: "Irresistible — best odds." },
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
