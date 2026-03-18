import { transferLockedBalance } from "./balance.service";

export interface Order {
  id: string;
  userId: string;
  price: number;
  quantity: number;
  type: "BUY" | "SELL";
  side: "YES" | "NO";
  ticker: string;
}

export const fillOrders = async (
  orderType: "BUY" | "SELL",
  ticker: string,
  side: "YES" | "NO",
  price: number,
  quantity: number,
  userId: string,
  bids: Order[],
  asks: Order[]
): Promise<number> => {
  let remainingQuantity = quantity;

  if (orderType === "BUY") {
    // Match against asks (sellers)
    // Asks are typically sorted ascending by price. We iterate over the best asks (lowest price).
    for (let i = 0; i < asks.length; i++) {
      const ask = asks[i];
      if (!ask) continue;
      if (ask.price > price) {
        break; // No more eligible asks
      }
      if (remainingQuantity === 0) break;

      const matchedQty = Math.min(ask.quantity, remainingQuantity);
      
      ask.quantity -= matchedQty;
      remainingQuantity -= matchedQty;

      // Transfer from buyer (userId) to seller (ask.userId)
      // The buyer locked funds when putting the order, we transfer those to the seller.
      await transferLockedBalance(userId, ask.userId, matchedQty * ask.price);

      if (ask.quantity === 0) {
        asks.splice(i, 1);
        i--;
      }
    }
  } else {
    // orderType === "SELL"
    // Match against bids (buyers)
    // Bids are typically sorted descending by price. We iterate over best bids (highest price).
    for (let i = 0; i < bids.length; i++) {
      const bid = bids[i];
      if (!bid) continue;
      if (bid.price < price) {
        break; // No more eligible bids
      }
      if (remainingQuantity === 0) break;

      const matchedQty = Math.min(bid.quantity, remainingQuantity);

      bid.quantity -= matchedQty;
      remainingQuantity -= matchedQty;

      // Transfer from buyer (bid.userId) to seller (userId)
      // The buyer locked funds when putting their bid, we transfer those to the seller.
      await transferLockedBalance(bid.userId, userId, matchedQty * price);

      if (bid.quantity === 0) {
        bids.splice(i, 1);
        i--;
      }
    }
  }

  return remainingQuantity;
};