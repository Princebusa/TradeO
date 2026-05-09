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

  // 2. Update position
  initPosition(userId, ticker);
  const pos = positions[userId]![ticker]![side];
  
  if (type === "BUY") {
    pos.shares += quantity;
    pos.spent += price * quantity;
  } else {
    // SELL
    if (pos.shares > 0) {
      const avgPrice = pos.spent / pos.shares;
      const matchedShares = Math.min(pos.shares, quantity);
      
      pos.shares -= matchedShares;
      pos.spent -= avgPrice * matchedShares;
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
    
    if (YES.shares > 0) {
      result.push({
        ticker,
        side: "YES",
        shares: YES.shares,
        avgPrice: YES.spent / YES.shares,
      });
    }
    if (NO.shares > 0) {
      result.push({
        ticker,
        side: "NO",
        shares: NO.shares,
        avgPrice: NO.spent / NO.shares,
      });
    }
  }
  return result;
};

export const getTradeHistoryForUser = (userId: string) => {
  return tradeHistory.filter(t => t.userId === userId).sort((a, b) => b.timestamp - a.timestamp);
};
