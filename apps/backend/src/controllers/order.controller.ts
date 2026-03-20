import type { Request, Response } from "express";
import { client } from "db/client";
import { lockBalance, getBalance } from "../service/balance.service";
import { fillOrders } from "../service/fillorder";
import type { Order } from "../service/fillorder";
import { broadcast } from "../ws";

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
    const ticker = req.body.ticker; // For now hardcode or extract from params/body
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

    // Broadcast updated orderbook DEPTH
    broadcast(`orderbook:${ticker}`, {
      type: "DEPTH",
      ticker,
      bids: currentBook.bids,
      asks: currentBook.asks
    });

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

export const getMarkets = async (req: Request, res: Response): Promise<void> => {
  try {
    const dbMarkets = await client.market.findMany();
    
    if (dbMarkets.length === 0) {
      // Return hardcoded mock if DB is empty as a fallback for the UI
      res.status(200).json([
        { ticker: "BTC100K", title: "Will Bitcoin hit $100k before December?", volume: "$4.5M", chance: "42%" },
        { ticker: "USDEBT", title: "Will US Debt ceiling be raised?", volume: "$800k", chance: "99%" }
      ]);
      return;
    }

    const markets = dbMarkets.map(m => {
      // Format volume
      let volumeStr = "$0";
      if (m.volume >= 1e6) {
        volumeStr = `$${(m.volume / 1e6).toFixed(1)}M`;
      } else if (m.volume >= 1e3) {
        volumeStr = `$${(m.volume / 1e3).toFixed(1)}k`;
      } else {
        volumeStr = `$${m.volume.toFixed(0)}`;
      }

      return {
        ticker: m.ticker,
        title: m.title,
        volume: volumeStr,
        chance: `${Math.round(m.chance * 100)}%`
      };
    });
    
    res.status(200).json(markets);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getWalletBalance = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
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
