export type Position = {
  shares: number;
  spent: number;
};

export type TradeRecord = {
  id: string;
  userId: string;
  ticker: string;
  side: "YES" | "NO";
  type: "BUY" | "SELL"; // From the perspective of the user
  price: number;
  quantity: number;
  timestamp: number;
};

// userId -> ticker -> side -> Position
const positions: Record<string, Record<string, { YES: Position; NO: Position }>> = {};
const tradeHistory: TradeRecord[] = [];

const initPosition = (userId: string, ticker: string) => {
  if (!positions[userId]) {
    positions[userId] = {};
  }
  if (!positions[userId][ticker]) {
    positions[userId][ticker] = {
      YES: { shares: 0, spent: 0 },
      NO: { shares: 0, spent: 0 },
    };
  }
};

export const recordTrade = (
  userId: string,
  ticker: string,
  side: "YES" | "NO",
  type: "BUY" | "SELL",
  price: number,
  quantity: number
) => {
  // 1. Log trade
  tradeHistory.push({
    id: Math.random().toString(36).substring(7),
    userId,
    ticker,
    side,
    type,
    price,
    quantity,
    timestamp: Date.now(),
  });

  // 2. Update position (signed shares: positive = long, negative = short)
  initPosition(userId, ticker);
  const pos = positions[userId]![ticker]![side];

  if (type === "BUY") {
    if (pos.shares < 0) {
      const shortSize = -pos.shares;
      const coverQty = Math.min(quantity, shortSize);
      const avgShort = pos.spent / shortSize;
      pos.shares += coverQty;
      pos.spent -= avgShort * coverQty;
      const remainder = quantity - coverQty;
      if (remainder > 0) {
        pos.shares += remainder;
        pos.spent += price * remainder;
      }
    } else {
      pos.shares += quantity;
      pos.spent += price * quantity;
    }
  } else {
    // SELL
    if (pos.shares > 0) {
      const avgLong = pos.spent / pos.shares;
      const closeLongQty = Math.min(pos.shares, quantity);
      pos.shares -= closeLongQty;
      pos.spent -= avgLong * closeLongQty;
      const openShortQty = quantity - closeLongQty;
      if (openShortQty > 0) {
        pos.shares -= openShortQty;
        pos.spent += price * openShortQty;
      }
    } else {
      pos.shares -= quantity;
      pos.spent += price * quantity;
    }
  }
};

export const getPositionsForUser = (userId: string) => {
  if (!positions[userId]) return [];

  const result: any[] = [];
  for (const ticker in positions[userId]) {
    const tickerPositions = positions[userId]![ticker]!;
    const YES = tickerPositions.YES;
    const NO = tickerPositions.NO;
    
    if (YES.shares !== 0) {
      const abs = Math.abs(YES.shares);
      result.push({
        ticker,
        side: "YES",
        shares: YES.shares,
        avgPrice: YES.spent / abs,
      });
    }
    if (NO.shares !== 0) {
      const abs = Math.abs(NO.shares);
      result.push({
        ticker,
        side: "NO",
        shares: NO.shares,
        avgPrice: NO.spent / abs,
      });
    }
  }
  return result;
};

export const getTradeHistoryForUser = (userId: string) => {
  return tradeHistory.filter(t => t.userId === userId).sort((a, b) => b.timestamp - a.timestamp);
};
