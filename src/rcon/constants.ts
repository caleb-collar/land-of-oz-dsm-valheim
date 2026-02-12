/**
 * Valheim RCON constants
 * Known events, global keys, and command strings
 */

/** Valheim random event identifiers */
export const ValheimEvents = {
  ARMY_EIKTHYR: "army_eikthyr",
  ARMY_THEELDER: "army_theelder",
  ARMY_BONEMASS: "army_bonemass",
  ARMY_MODER: "army_moder",
  ARMY_GOBLIN: "army_goblin",
  FORESTTROLLS: "foresttrolls",
  SKELETONS: "skeletons",
  BLOBS: "blobs",
  WOLVES: "wolves",
  BATS: "bats",
  SERPENTS: "serpents",
} as const;

/** Valheim boss progression global key identifiers */
export const ValheimGlobalKeys = {
  DEFEATED_EIKTHYR: "defeated_eikthyr",
  DEFEATED_GDKING: "defeated_gdking",
  DEFEATED_BONEMASS: "defeated_bonemass",
  DEFEATED_DRAGON: "defeated_dragon",
  DEFEATED_GOBLINKING: "defeated_goblinking",
  DEFEATED_QUEEN: "defeated_queen",
} as const;

/** Type for Valheim event keys */
export type ValheimEventKey =
  (typeof ValheimEvents)[keyof typeof ValheimEvents];

/** Type for Valheim global key names */
export type ValheimGlobalKeyName =
  (typeof ValheimGlobalKeys)[keyof typeof ValheimGlobalKeys];
