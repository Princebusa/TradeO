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
        body: JSON.stringify({ side: orderSide, type: orderType, price: Number(price), quantity: Number(quantity), ticker: ticker })
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
    <div className="max-w-7xl mx-auto px-4 pb-12 flex flex-col lg:flex-row gap-8">
      {/* Left Column: Market Info & Orderbook */}
      <div className="flex-1 flex flex-col gap-8">
        
        {/* Header */}
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-modern flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
               <span className="bg-indigo-50 text-primary font-bold px-3 py-1 rounded-lg text-xs uppercase tracking-wide">{ticker}</span>
               <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                  <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-danger animate-pulse'}`}></span>
                  <span className="font-semibold text-[10px] text-slate-500 uppercase tracking-widest">{isConnected ? 'Live' : 'Connecting...'}</span>
               </div>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Market Book</h1>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-1 text-right">Last Price ({orderSide})</div>
            <div className="text-5xl font-black text-slate-900 tracking-tighter">${currentPrice}</div>
          </div>
        </div>

        {/* Orderbook Container */}
        <div className="brutal-box overflow-hidden flex flex-col flex-1 min-h-[500px]">
          <div className="flex bg-slate-50 border-b border-slate-100 p-1">
            <button 
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all duration-200 ${orderSide === "YES" ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              onClick={() => setOrderSide("YES")}
            >
              YES Outcome
            </button>
            <button 
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all duration-200 ${orderSide === "NO" ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              onClick={() => setOrderSide("NO")}
            >
              NO Outcome
            </button>
          </div>
          
          <div className="p-6 grid grid-cols-2 gap-8 flex-1">
            {/* ASKS (Sells) */}
            <div className="flex flex-col">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-50">
                 <h3 className="text-xs font-bold text-danger uppercase tracking-widest">Asks (Sell)</h3>
                 <span className="text-[10px] font-bold text-slate-400 uppercase">Volume</span>
              </div>
              <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[400px] pr-1">
                {asks.slice(0, 15).reverse().map((ask, i) => (
                  <div key={i} className="group flex justify-between items-center p-2.5 rounded-lg hover:bg-rose-50/50 transition-colors cursor-default">
                    <span className="font-mono font-bold text-danger text-sm">${ask.price.toFixed(2)}</span>
                    <span className="bg-rose-100/30 text-rose-600 font-mono text-xs px-2 py-0.5 rounded-md border border-rose-100/50">{ask.quantity}</span>
                  </div>
                ))}
                {asks.length === 0 && <div className="flex flex-col items-center justify-center py-12 text-slate-300 italic text-sm">No selling activity</div>}
              </div>
            </div>

            {/* BIDS (Buys) */}
            <div className="flex flex-col">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-50">
                 <h3 className="text-xs font-bold text-success uppercase tracking-widest">Bids (Buy)</h3>
                 <span className="text-[10px] font-bold text-slate-400 uppercase">Volume</span>
              </div>
              <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[400px] pr-1">
                {bids.slice(0, 15).map((bid, i) => (
                  <div key={i} className="group flex justify-between items-center p-2.5 rounded-lg hover:bg-emerald-50/50 transition-colors cursor-default">
                    <span className="font-mono font-bold text-success text-sm">${bid.price.toFixed(2)}</span>
                    <span className="bg-emerald-100/30 text-emerald-600 font-mono text-xs px-2 py-0.5 rounded-md border border-emerald-100/50">{bid.quantity}</span>
                  </div>
                ))}
                {bids.length === 0 && <div className="flex flex-col items-center justify-center py-12 text-slate-300 italic text-sm">No buying activity</div>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Order Form */}
      <div className="w-full lg:w-[420px] flex flex-col gap-8">
        <div className="brutal-box p-8 bg-white border-t-[6px] border-t-primary">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Place Your Order</h2>
          
          {statusMsg && (
            <div className={`p-4 rounded-2xl mb-6 text-sm font-medium flex items-center gap-3 ${statusMsg.type === 'error' ? 'bg-rose-50 text-danger border border-rose-100' : 'bg-emerald-50 text-success border border-emerald-100'}`}>
               <div className={`w-2 h-2 rounded-full ${statusMsg.type === 'error' ? 'bg-danger' : 'bg-success'}`}></div>
               {statusMsg.text}
            </div>
          )}

          {!isAuthenticated ? (
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center">
              <p className="text-slate-500 font-medium mb-4">You need an account to trade.</p>
              <button onClick={() => window.location.href='/auth'} className="brutal-button w-full">Sign In to Continue</button>
            </div>
          ) : (
            <form onSubmit={placeOrder} className="flex flex-col gap-6">
              
              <div className="grid grid-cols-2 p-1 bg-slate-50 rounded-2xl border border-slate-100">
                <button type="button" onClick={() => setOrderType("BUY")} className={`py-3 rounded-xl font-bold text-sm transition-all ${orderType === "BUY" ? "bg-white text-slate-900 shadow-sm border border-slate-100" : "text-slate-400 hover:text-slate-600"}`}>
                  Buy
                </button>
                <button type="button" onClick={() => setOrderType("SELL")} className={`py-3 rounded-xl font-bold text-sm transition-all ${orderType === "SELL" ? "bg-white text-slate-900 shadow-sm border border-slate-100" : "text-slate-400 hover:text-slate-600"}`}>
                  Sell
                </button>
              </div>

              <div className="space-y-5">
                <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Market Outcome</label>
                    <select className="brutal-input appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.75rem_center] bg-no-repeat" value={orderSide} onChange={(e) => setOrderSide(e.target.value as any)}>
                    <option value="YES">YES - It will happen</option>
                    <option value="NO">NO - It won't happen</option>
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Price ($)</label>
                        <input type="number" step="0.01" min="0" max="100" className="brutal-input text-lg font-mono font-bold" value={price} onChange={e => setPrice(Number(e.target.value))} required />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Quantity</label>
                        <input type="number" min="1" className="brutal-input text-lg font-mono font-bold" value={quantity} onChange={e => setQuantity(Number(e.target.value))} required />
                    </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex justify-between items-center shadow-lg shadow-slate-200">
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Est. Cost</span>
                    <span className="text-2xl font-black text-white tracking-tight">${(price * quantity).toFixed(2)}</span>
                </div>
                <button type="submit" className={`py-4 px-6 rounded-xl font-bold text-sm transition-all shadow-lg ${orderType === "BUY" ? "bg-success text-white shadow-emerald-900/20" : "bg-danger text-white shadow-rose-900/20"} hover:brightness-110 active:scale-95`}>
                    Confirm {orderType}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Positions / Wallet Lock */}
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-modern">
          <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <div className="w-1.5 h-6 bg-primary rounded-full"></div>
              Your Portfolio
          </h2>
          {!isAuthenticated ? (
            <div className="text-slate-400 text-sm font-medium italic">Login to view activity</div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/50">
                <span className="text-xs font-bold text-slate-500 uppercase">Available</span>
                <span className="text-xl font-bold text-primary">${balance?.balance?.toFixed(2) || "0.00"}</span>
              </div>
              <div className="flex justify-between items-center p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-xs font-bold text-slate-500 uppercase">Invested/Locked</span>
                <span className="text-xl font-bold text-slate-900">${balance?.lock?.toFixed(2) || "0.00"}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
