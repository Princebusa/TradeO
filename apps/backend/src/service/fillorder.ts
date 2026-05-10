import { transferLockedBalance, releaseBalance } from "./balance.service";
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
      if (ask.userId === userId) continue; // no self-trade
      if (ask.price > price) {
        break; // No more eligible asks
      }
      if (remainingQuantity === 0) break;

      const matchedQty = Math.min(ask.quantity, remainingQuantity);
      
      ask.quantity -= matchedQty;
      remainingQuantity -= matchedQty;

      const execPrice = ask.price;

      // Buyer reserved `limitPrice` per share; pay maker (execPrice) and return the rest from lock to balance.
      await transferLockedBalance(userId, ask.userId, matchedQty * execPrice);
      const rebate = (price - execPrice) * matchedQty;
      if (rebate > 0) {
        await releaseBalance(userId, rebate);
      }

      // Record in positions & trade history tracker
      recordTrade(userId, ticker, side, "BUY", execPrice, matchedQty);
      recordTrade(ask.userId, ticker, side, "SELL", execPrice, matchedQty);

      // Broadcast TRADE and user updates
      broadcast(`trades:${ticker}`, { type: "TRADE", ticker, price: execPrice, quantity: matchedQty, side, timestamp: Date.now() });
      sendToUser(userId, { type: "ORDER_FILLED", side, price: execPrice, filledQuantity: matchedQty });
      sendToUser(ask.userId, { type: "ORDER_FILLED", orderId: ask.id, side, price: execPrice, filledQuantity: matchedQty });

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
      if (bid.userId === userId) continue; // no self-trade
      if (bid.price < price) {
        break; // No more eligible bids
      }
      if (remainingQuantity === 0) break;

      const matchedQty = Math.min(bid.quantity, remainingQuantity);

      bid.quantity -= matchedQty;
      remainingQuantity -= matchedQty;

      // Maker bid price is the execution price; buyer locked bid.price per share.
      const execPrice = bid.price;

      await transferLockedBalance(bid.userId, userId, matchedQty * execPrice);

      recordTrade(userId, ticker, side, "SELL", execPrice, matchedQty);
      recordTrade(bid.userId, ticker, side, "BUY", execPrice, matchedQty);

      broadcast(`trades:${ticker}`, { type: "TRADE", ticker, price: execPrice, quantity: matchedQty, side, timestamp: Date.now() });
      sendToUser(bid.userId, { type: "ORDER_FILLED", orderId: bid.id, side, price: execPrice, filledQuantity: matchedQty });
      sendToUser(userId, { type: "ORDER_FILLED", side, price: execPrice, filledQuantity: matchedQty });

      if (bid.quantity === 0) {
        bids.splice(i, 1);
        i--;
      }
    }
  }

  return remainingQuantity;
};