export const INTEREST_OPTIONS = [
  "Historia",
  "Natura",
  "Architektura",
  "Aktywność fizyczna",
  "Relaks",
] as const;

export type Interest = (typeof INTEREST_OPTIONS)[number];
