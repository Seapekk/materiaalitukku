// Freight constants copied from the AI Studio app (src/data.ts).
// Base € per FTL truck by origin country; per-unit freight is
// (base + destination surcharge) / 1000, exactly like the original.
export const TRANSPORT_BASE: Record<string, number> = {
  de: 1850,
  pl: 1420,
  ee: 420,
  fi: 0,
  // Countries the rebuild supports beyond the original four:
  se: 1150,
  lv: 640,
  lt: 780,
};

export const DEST_SURCHARGE: Record<string, number> = {
  Helsinki: 0,
  Tampere: 120,
  Oulu: 280,
  Rovaniemi: 420,
};

export const ITEMS_PER_PAGE = 50;
