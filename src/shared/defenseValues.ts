// Defense values configuration
export const DEFAULT_DEFENSE_VALUES = {
  armor: 10,
  dodge: 5,
  magic_resist: 8,
} as const;

export type DefenseValues = typeof DEFAULT_DEFENSE_VALUES;
