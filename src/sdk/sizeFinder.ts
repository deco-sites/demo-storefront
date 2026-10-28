/**
 * The size rule of the house: three sizes graded from weight and girth (the "How we size" table).
 * When weight and girth point at different sizes, girth wins.
 */
export type SizeName = "Pup" | "Adult" | "Big Boss";

export const SIZE_TABLE: { name: SizeName; maxKg: number; maxGirth: number }[] = [
  { name: "Pup", maxKg: 25, maxGirth: 90 },
  { name: "Adult", maxKg: 50, maxGirth: 115 },
  { name: "Big Boss", maxKg: 70, maxGirth: 135 },
];

export interface SizeAdvice {
  size: SizeName;
  /** Weight and girth point at different sizes, so girth decided. */
  girthWon: boolean;
  /** A measurement falls outside the table (Pup girth under 55 cm, or past Big Boss). */
  outside: boolean;
}

const bySize = (value: number, key: "maxKg" | "maxGirth") =>
  (SIZE_TABLE.find((s) => value <= s[key]) ?? SIZE_TABLE[SIZE_TABLE.length - 1]).name;

/** Recommends a size from weight (kg) and/or girth (cm). Returns null with nothing to go on. */
export function recommendSize(kg?: number | null, girth?: number | null): SizeAdvice | null {
  const k = kg && kg > 0 ? kg : null;
  const g = girth && girth > 0 ? girth : null;
  if (k === null && g === null) return null;
  const byKg = k !== null ? bySize(k, "maxKg") : null;
  const byGirth = g !== null ? bySize(g, "maxGirth") : null;
  return {
    size: (byGirth ?? byKg)!,
    girthWon: byKg !== null && byGirth !== null && byKg !== byGirth,
    outside: (k !== null && k > 70) || (g !== null && (g < 55 || g > 135)),
  };
}
