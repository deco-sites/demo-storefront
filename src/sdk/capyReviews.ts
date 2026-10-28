/**
 * Review scores for the herd. There's no reviews app on the store yet, so these are kept here by
 * product handle; a product without an entry shows no stars.
 */
export interface Rating {
  /** Average score, 0–5. */
  average: number;
  count: number;
}

const RATINGS: Record<string, Rating> = {
  "sol-linen-poncho": { average: 4.7, count: 52 },
  "yuzu-bucket-hat": { average: 4.5, count: 38 },
  "onsen-waffle-robe": { average: 4.9, count: 64 },
  "largo-sunglasses": { average: 4.3, count: 21 },
  "passeio-grazing-vest": { average: 4.4, count: 17 },
  "boia-swim-vest": { average: 4.6, count: 29 },
  "passo-four-paw-sandals": { average: 4.2, count: 33 },
  "rio-raincoat": { average: 4.8, count: 46 },
};

export const ratingOf = (handle: string): Rating | undefined => RATINGS[handle];
