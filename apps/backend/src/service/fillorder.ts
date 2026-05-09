import { transferLockedBalance } from "./balance.service";
import { broadcast, sendToUser } from "../ws";
import { recordTrade } from "./tracker.service";

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

      // Record in positions & trade history tracker
      recordTrade(userId, ticker, side, "BUY", ask.price, matchedQty);
      recordTrade(ask.userId, ticker, side, "SELL", ask.price, matchedQty);

      // Broadcast TRADE and user updates
      broadcast(`trades:${ticker}`, { type: "TRADE", ticker, price: ask.price, quantity: matchedQty, side, timestamp: Date.now() });
      sendToUser(userId, { type: "ORDER_FILLED", side, price: ask.price, filledQuantity: matchedQty });
      sendToUser(ask.userId, { type: "ORDER_FILLED", orderId: ask.id, side, price: ask.price, filledQuantity: matchedQty });

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

      // Record in positions & trade history tracker
      recordTrade(userId, ticker, side, "SELL", price, matchedQty); // The seller executing
      recordTrade(bid.userId, ticker, side, "BUY", price, matchedQty); // The buyer providing liquidity 

      // Broadcast TRADE and user updates
      broadcast(`trades:${ticker}`, { type: "TRADE", ticker, price, quantity: matchedQty, side, timestamp: Date.now() });
      sendToUser(bid.userId, { type: "ORDER_FILLED", orderId: bid.id, side, price, filledQuantity: matchedQty });
      sendToUser(userId, { type: "ORDER_FILLED", side, price, filledQuantity: matchedQty });

      if (bid.quantity === 0) {
        bids.splice(i, 1);
        i--;
      }
    }
  }

  return remainingQuantity;
};