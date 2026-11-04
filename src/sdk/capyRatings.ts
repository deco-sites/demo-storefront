export interface Rating {
  /** Average score out of 5. */
  average: number;
  count: number;
}

/** Review summaries for the herd, keyed by product handle. */
const RATINGS: Record<string, Rating> = {
  "sol-linen-poncho": { average: 4.7, count: 38 },
  "yuzu-bucket-hat": { average: 4.5, count: 52 },
  "onsen-waffle-robe": { average: 4.9, count: 64 },
  "largo-sunglasses": { average: 4.3, count: 21 },
  "passeio-grazing-vest": { average: 4.6, count: 29 },
  "boia-swim-vest": { average: 4.4, count: 17 },
  "passo-four-paw-sandals": { average: 4.2, count: 33 },
  "rio-raincoat": { average: 4.8, count: 45 },
};

export function ratingOf(handle: string): Rating | undefined {
  return RATINGS[handle];
}
