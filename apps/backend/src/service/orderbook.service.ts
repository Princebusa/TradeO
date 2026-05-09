import type { Order } from "./fillorder";

// Define an in-memory orderbook
export type SideBook = {
  bids: Order[]; // Sorted descending by price
  asks: Order[]; // Sorted ascending by price
};

export type TickerBook = {
  YES: SideBook;
  NO: SideBook;
};

// Global in-memory orderbook
export const orderbook: Record<string, TickerBook> = {
  GOOGLE: {
    YES: { bids: [], asks: [] },
    NO: { bids: [], asks: [] },
  },
};

export const getTickerBook = (ticker: string) => {
  if (!orderbook[ticker]) {
    orderbook[ticker] = {
      YES: { bids: [], asks: [] },
      NO: { bids: [], asks: [] },
    };
  }
  return orderbook[ticker];
};
