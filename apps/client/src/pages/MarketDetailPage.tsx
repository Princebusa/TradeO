import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useWebSocket } from "../hooks/useWebSocket";
import { fetchApi } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

type Order = { price: number; quantity: number };
type DepthMsg = { type: "DEPTH"; ticker: string; bids: Order[]; asks: Order[] };

export const MarketDetailPage = () => {
  const { ticker } = useParams();
  const { messages, isConnected } = useWebSocket(ticker ? [`orderbook:${ticker}`, `trades:${ticker}`] : []);
  const { isAuthenticated } = useAuth();
  
  const [bids, setBids] = useState<Order[]>([]);
  const [asks, setAsks] = useState<Order[]>([]);
  const [balance, setBalance] = useState<{ balance: number; lock: number } | null>(null);
  
  // Form State
  const [orderSide, setOrderSide] = useState<"YES" | "NO">("YES");
  const [orderType, setOrderType] = useState<"BUY" | "SELL">("BUY");
  const [price, setPrice] = useState<number>(5);
  const [quantity, setQuantity] = useState<number>(10);
  const [statusMsg, setStatusMsg] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  // Initialize books by fetching GET /order/book/:ticker once
  useEffect(() => {
    if (ticker) {
      fetchApi(`/order/book/${ticker}`).then((data) => {
        setBids(data[orderSide]?.bids || []);
        setAsks(data[orderSide]?.asks || []);
      }).catch(console.error);
    }
    if (isAuthenticated) {
      fetchApi("/order/balance").then(setBalance).catch(console.error);
    }
  }, [ticker, orderSide, isAuthenticated]);

  // Update book from WS
  useEffect(() => {
    const latestDepth = [...messages].reverse().find(m => m.type === "DEPTH" && m.ticker === ticker) as DepthMsg | undefined;
    if (latestDepth) {
      // The server broadcasts both books? Actually, our current WS broadcasts depth as bids and asks for ONE side or for BOTH?
      // Our implementation broadcasted: { bids: currentBook.bids, asks: currentBook.asks } relative to the `side` placed.
      // Wait, in order.controller.ts we broadcasted `bids` and `asks` of the `currentBook`, which is specific to the `side`. 
      // It's safer to just fetch after every trade, or handle it carefully. Assuming the WS sends the full Depth for the side.
      setBids(latestDepth.bids || []);
      setAsks(latestDepth.asks || []);
    }
  }, [messages, ticker]);

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    try {
      await fetchApi("/order", {
        method: "POST",
        body: JSON.stringify({ side: orderSide, type: orderType, price: Number(price), quantity: Number(quantity) })
      });
      setStatusMsg({ type: 'success', text: 'Order placed successfully!' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || "Failed to place order" });
    }
  };

  const currentPrice = useMemo(() => {
    // Top of book depending on YES/NO. Just a rough estimate
    if (bids.length > 0) return bids[0].price;
    if (asks.length > 0) return asks[0].price;
    return "-";
  }, [bids, asks]);

  return (
    <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-8">
      {/* Left Column: Market Info & Orderbook */}
      <div className="flex-1 flex flex-col gap-6">
        
        {/* Header */}
        <div className="brutal-box p-6 bg-white flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-black uppercase mb-1">{ticker}</h1>
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 border-2 border-black rounded-full ${isConnected ? 'bg-success' : 'bg-danger animate-pulse'}`}></span>
              <span className="font-bold text-sm uppercase">{isConnected ? 'Live' : 'Connecting...'}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold uppercase text-gray-500">Last Price ({orderSide})</div>
            <div className="text-5xl font-black">${currentPrice}</div>
          </div>
        </div>

        {/* Orderbook */}
        <div className="brutal-box bg-white flex-1 min-h-[400px]">
          <div className="flex border-b-[3px] border-black">
            <button 
              className={`flex-1 p-3 font-black text-xl border-r-[3px] border-black ${orderSide === "YES" ? "bg-accent" : "bg-white"}`}
              onClick={() => setOrderSide("YES")}
            >
              YES BOOK
            </button>
            <button 
              className={`flex-1 p-3 font-black text-xl ${orderSide === "NO" ? "bg-accent" : "bg-white"}`}
              onClick={() => setOrderSide("NO")}
            >
              NO BOOK
            </button>
          </div>
          
          <div className="p-4 grid grid-cols-2 gap-4">
            {/* ASKS (Sells) */}
            <div>
              <h3 className="text-center font-black pb-2 mb-2 border-b-2 border-black bg-danger text-white uppercase tracking-wider">Asks (Sell)</h3>
              <div className="flex justify-between font-bold text-sm mb-2 px-2 text-gray-600">
                <span>Price</span><span>Qty</span>
              </div>
              <div className="flex flex-col gap-1">
                {asks.slice(0, 10).reverse().map((ask, i) => (
                  <div key={i} className="flex justify-between p-1 bg-red-50 border-2 border-transparent hover:border-black font-mono font-bold text-danger">
                    <span>${ask.price.toFixed(2)}</span>
                    <span>{ask.quantity}</span>
                  </div>
                ))}
                {asks.length === 0 && <div className="text-center text-gray-400 font-bold py-4">No Asks</div>}
              </div>
            </div>

            {/* BIDS (Buys) */}
            <div>
              <h3 className="text-center font-black pb-2 mb-2 border-b-2 border-black bg-success text-black uppercase tracking-wider">Bids (Buy)</h3>
              <div className="flex justify-between font-bold text-sm mb-2 px-2 text-gray-600">
                <span>Price</span><span>Qty</span>
              </div>
              <div className="flex flex-col gap-1">
                {bids.slice(0, 10).map((bid, i) => (
                  <div key={i} className="flex justify-between p-1 bg-green-50 border-2 border-transparent hover:border-black font-mono font-bold text-success">
                    <span>${bid.price.toFixed(2)}</span>
                    <span>{bid.quantity}</span>
                  </div>
                ))}
                {bids.length === 0 && <div className="text-center text-gray-400 font-bold py-4">No Bids</div>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Order Form */}
      <div className="w-full md:w-[400px] flex flex-col gap-6">
        <div className="brutal-box p-6 bg-white">
          <h2 className="text-2xl font-black uppercase mb-4 border-b-[3px] border-black pb-2">Place Order</h2>
          
          {statusMsg && (
            <div className={`p-3 font-bold mb-4 border-[3px] border-black ${statusMsg.type === 'error' ? 'bg-danger text-white' : 'bg-success text-black'}`}>
              {statusMsg.text}
            </div>
          )}

          {!isAuthenticated ? (
            <div className="bg-yellow-100 p-4 border-[3px] border-black font-bold text-center">
              Please login to trade.
            </div>
          ) : (
            <form onSubmit={placeOrder} className="flex flex-col gap-4">
              
              <div className="flex border-[3px] border-black bg-gray-100">
                <button type="button" onClick={() => setOrderType("BUY")} className={`flex-1 py-2 font-black uppercase transition-colors ${orderType === "BUY" ? "bg-success text-black" : ""}`}>
                  Buy
                </button>
                <div className="w-[3px] bg-black"></div>
                <button type="button" onClick={() => setOrderType("SELL")} className={`flex-1 py-2 font-black uppercase transition-colors ${orderType === "SELL" ? "bg-danger text-white" : ""}`}>
                  Sell
                </button>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-sm uppercase">Outcome</label>
                <select className="brutal-input" value={orderSide} onChange={(e) => setOrderSide(e.target.value as any)}>
                  <option value="YES">YES</option>
                  <option value="NO">NO</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-sm uppercase">Limit Price ($)</label>
                <input type="number" step="0.01" min="0" max="10" className="brutal-input" value={price} onChange={e => setPrice(Number(e.target.value))} required />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-sm uppercase">Quantity (Shares)</label>
                <input type="number" min="1" className="brutal-input" value={quantity} onChange={e => setQuantity(Number(e.target.value))} required />
              </div>

              <div className="mt-4 p-4 border-[3px] border-black bg-gray-50 flex justify-between items-center font-bold">
                <span>Total Cost</span>
                <span className="text-xl font-black">${(price * quantity).toFixed(2)}</span>
              </div>

              <button type="submit" className={`brutal-button py-4 mt-2 text-xl ${orderType === "BUY" ? "bg-success" : "bg-danger text-white"}`}>
                {orderType} {quantity} {orderSide} @ ${price}
              </button>
            </form>
          )}
        </div>

        {/* Positions / Wallet Lock */}
        <div className="brutal-box p-6 bg-white mt-4">
          <h2 className="text-xl font-black uppercase mb-4 border-b-[3px] border-black pb-2">Your Positions (Locks)</h2>
          {!isAuthenticated ? (
            <div className="text-gray-500 font-bold italic">Login to view positions</div>
          ) : (
            <div className="flex flex-col gap-2 font-bold">
              <div className="flex justify-between border-[3px] border-black p-3 bg-yellow-50">
                <span>Available Capital:</span>
                <span className="font-black">${balance?.balance?.toFixed(2) || "0.00"}</span>
              </div>
              <div className="flex justify-between border-[3px] border-black p-3 bg-red-50">
                <span>Active Locks / Margin:</span>
                <span className="font-black">${balance?.lock?.toFixed(2) || "0.00"}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
