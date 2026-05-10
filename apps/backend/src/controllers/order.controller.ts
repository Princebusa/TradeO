import type { Request, Response } from "express";
import { client } from "db/client";
import { lockBalance, getBalance, releaseBalance } from "../service/balance.service";
import { fillOrders } from "../service/fillorder";
import type { Order } from "../service/fillorder";
import { broadcast } from "../ws";
import { getPositionsForUser, getTradeHistoryForUser } from "../service/tracker.service";
import { orderbook, getTickerBook } from "../service/orderbook.service";

const generateId = () => Math.random().toString(36).substring(7);

// Helper to remove order from book internally
const removeOrderFromBook = (ticker: string, side: "YES" | "NO", orderId: string, userId: string) => {
  const tickerBook = orderbook[ticker];
  if (!tickerBook) return null;
  const sideBook = tickerBook[side];
  
  let index = sideBook.bids.findIndex(o => o.id === orderId && o.userId === userId);
  if (index !== -1) {
    return sideBook.bids.splice(index, 1)[0];
  }
  
  index = sideBook.asks.findIndex(o => o.id === orderId && o.userId === userId);
  if (index !== -1) {
    return sideBook.asks.splice(index, 1)[0];
  }
  
  return null;
};

export const order = async (req: Request, res: Response): Promise<void> => {
  try {
    const { side, price, type, quantity, ticker } = req.body as {
      side?: "YES" | "NO";
      type?: "BUY" | "SELL";
      price?: number;
      quantity?: number;
      ticker?: string;
    };
    const userId = (req as any).userId;

    if (!side || !price || !type || !quantity || !userId || !ticker) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    if (!Number.isFinite(price) || !Number.isFinite(quantity) || quantity <= 0 || price <= 0) {
      res.status(400).json({ error: "Invalid price or quantity" });
      return;
    }

    const tickerBook = getTickerBook(ticker);
    const currentBook = tickerBook[side];
    const orderData: Order = {
      id: generateId(),
      userId,
      price,
      quantity,
      type,
      side,
      ticker,
    };

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

    if (remainingQty > 0) {
      orderData.quantity = remainingQty;
      if (type === "BUY") {
        currentBook.bids.push(orderData);
        currentBook.bids.sort((a, b) => b.price - a.price);
      } else {
        currentBook.asks.push(orderData);
        currentBook.asks.sort((a, b) => a.price - b.price);
      }
    }

    broadcast(`orderbook:${ticker}`, {
      type: "DEPTH",
      ticker,
      side,
      bids: currentBook.bids,
      asks: currentBook.asks
    });

    res.status(200).json({ message: "Order processed", side, price, filledQuantity: quantity - remainingQty, remainingQuantity: remainingQty, userId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const cancelOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId, ticker, side } = req.body;
    const userId = (req as any).userId;

    if (!orderId || !ticker || !side || !userId) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const cancelledOrder = removeOrderFromBook(ticker, side, orderId, userId);
    if (!cancelledOrder) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    if (cancelledOrder.type === "BUY") {
      await releaseBalance(userId, cancelledOrder.price * cancelledOrder.quantity);
    }

    // Broadcast update
    const sideBook = orderbook[ticker][side as "YES" | "NO"];
    broadcast(`orderbook:${ticker}`, {
      type: "DEPTH",
      ticker,
      side,
      bids: sideBook.bids,
      asks: sideBook.asks
    });

    res.status(200).json({ message: "Order cancelled" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const editOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId, ticker, side, newPrice, newQuantity } = req.body;
    const userId = (req as any).userId;

    if (!orderId || !ticker || !side || !newPrice || !newQuantity || !userId) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    // 1. Cancel old order
    const oldOrder = removeOrderFromBook(ticker, side, orderId, userId);
    if (!oldOrder) {
      res.status(404).json({ error: "Original order not found" });
      return;
    }

    if (oldOrder.type === "BUY") {
      await releaseBalance(userId, oldOrder.price * oldOrder.quantity);
    }

    // 2. Place new order (using logic from existing order function)
    req.body.price = newPrice;
    req.body.quantity = newQuantity;
    req.body.type = oldOrder.type;
    req.body.side = side;
    req.body.ticker = ticker;

    return await order(req, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getOrderbook = async (req: Request, res: Response): Promise<void> => {
  const ticker = (req.params.ticker as string) || "GOOGLE";
  const tickerUpper = ticker.toUpperCase();
  
  // First, check if it's already in memory (try both exact and upper)
  if (orderbook[ticker]) {
    res.status(200).json(orderbook[ticker]);
    return;
  }
  if (orderbook[tickerUpper]) {
    res.status(200).json(orderbook[tickerUpper]);
    return;
  }

  // If not in memory, check if it exists in the database (case-insensitive)
  try {
    const dbMarket = await client.market.findFirst({
      where: { 
        ticker: {
          equals: ticker,
          mode: 'insensitive'
        }
      }
    });

    if (!dbMarket) {
      res.status(404).json({ error: "Ticker not found" });
      return;
    }

    // Use the exact ticker from DB to initialize memory if needed
    const tickerFromDb = dbMarket.ticker;
    const tickerBook = getTickerBook(tickerFromDb);
    res.status(200).json(tickerBook);
  } catch (error) {
    console.error("Error fetching market from DB:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMarkets = async (req: Request, res: Response): Promise<void> => {
  try {
    const dbMarkets = await client.market.findMany();
    
    if (dbMarkets.length === 0) {
    
      res.status(200).json({message:"No markets found"});
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

export const getOpenOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const openOrders: Order[] = [];
    
    // Iterate through all tickers in the orderbook
    Object.values(orderbook).forEach((tickerBook) => {
      // Check YES outcome
      tickerBook.YES.bids.forEach((order) => {
        if (order.userId === userId) openOrders.push(order);
      });
      tickerBook.YES.asks.forEach((order) => {
        if (order.userId === userId) openOrders.push(order);
      });

      // Check NO outcome
      tickerBook.NO.bids.forEach((order) => {
        if (order.userId === userId) openOrders.push(order);
      });
      tickerBook.NO.asks.forEach((order) => {
        if (order.userId === userId) openOrders.push(order);
      });
    });

    res.status(200).json(openOrders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getPositions = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const positions = getPositionsForUser(userId);
    res.status(200).json(positions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getTradeHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const history = getTradeHistoryForUser(userId);
    res.status(200).json(history);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};
