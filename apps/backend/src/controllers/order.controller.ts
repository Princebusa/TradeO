import type { Request, Response } from "express";
import { lockBalance, getBalance } from "../service/balance.service";
import { fillOrders } from "../service/fillorder";
import type { Order } from "../service/fillorder";

// Define an in-memory orderbook
type SideBook = {
  bids: Order[]; // Sorted descending by price
  asks: Order[]; // Sorted ascending by price
};

type TickerBook = {
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

const generateId = () => Math.random().toString(36).substring(7);

export const order = async (req: Request, res: Response): Promise<void> => {
  try {
    const { side, price, type, quantity } = req.body as {
      side?: "YES" | "NO";
      type?: "BUY" | "SELL";
      price?: number;
      quantity?: number;
    };
    const ticker = "GOOGLE"; // For now hardcode or extract from params/body
    const userId = (req as any).userId;

    if (!side || !price || !type || !quantity || !userId) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    if (!orderbook[ticker]) {
      orderbook[ticker] = {
        YES: { bids: [], asks: [] },
        NO: { bids: [], asks: [] },
      };
    }

    const currentBook = orderbook[ticker][side];
    const orderData: Order = {
      id: generateId(),
      userId,
      price,
      quantity,
      type,
      side,
      ticker,
    };

    // Before matching, lock the user's balance
    // For a BUY order, cost is price * qty
    // For a SELL order, usually you need the token. Since we don't have token balances in DB,
    // let's assume we lock a margin of (10 - price) * qty, or for simplicity, we mock SELLs as successful.
    // Let's enforce locks for BUYS.
    const requiredAmount = type === "BUY" ? price * quantity : 0;
    if (requiredAmount > 0) {
      try {
        await lockBalance(userId, requiredAmount);
      } catch (e: any) {
        res.status(400).json({ error: e.message || "Insufficient balance" });
        return;
      }
    }

    const remainingQty = await fillOrders(
      type,
      ticker,
      side,
      price,
      quantity,
      userId,
      currentBook.bids,
      currentBook.asks
    );

    // If order was not fully filled, add rest to orderbook
    if (remainingQty > 0) {
      orderData.quantity = remainingQty;
      if (type === "BUY") {
        currentBook.bids.push(orderData);
        currentBook.bids.sort((a, b) => b.price - a.price); // Descending
      } else {
        currentBook.asks.push(orderData);
        currentBook.asks.sort((a, b) => a.price - b.price); // Ascending
      }
    }

    res.status(200).json({ message: "Order processed", side, price, filledQuantity: quantity - remainingQty, remainingQuantity: remainingQty, userId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getOrderbook = async (req: Request, res: Response): Promise<void> => {
  const ticker = (req.params.ticker as string)?.toUpperCase() || "GOOGLE";
  if (!orderbook[ticker]) {
    res.status(404).json({ error: "Ticker not found" });
    return;
  }
  res.status(200).json(orderbook[ticker]);
};

export const getWalletBalance = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const wallet = await getBalance(userId);
    res.status(200).json(wallet);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};
