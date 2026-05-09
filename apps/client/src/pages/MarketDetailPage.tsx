import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useWebSocket } from "../hooks/useWebSocket";
import { fetchApi } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { MoveUpRight, MoveDownLeft, Activity, Wallet, Clock, ListFilter, ArrowRight } from "lucide-react";

type Order = { id: string; price: number; quantity: number; type: "BUY" | "SELL"; side: "YES" | "NO"; ticker: string };
type DepthMsg = { type: "DEPTH"; ticker: string; bids: Order[]; asks: Order[] };

export const MarketDetailPage = () => {
  const { ticker } = useParams();
  const { messages, isConnected } = useWebSocket(ticker ? [`orderbook:${ticker}`, `trades:${ticker}`] : []);
  const { isAuthenticated } = useAuth();
  
  const [bids, setBids] = useState<Order[]>([]);
  const [asks, setAsks] = useState<Order[]>([]);
  const [balance, setBalance] = useState<{ balance: number; lock: number } | null>(null);
  const [openOrders, setOpenOrders] = useState<Order[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [tradeHistory, setTradeHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"positions" | "openOrders" | "orderHistory" | "tradeHistory">("positions");
  const [marketInfo, setMarketInfo] = useState<{ title: string; volume: string; chance: string } | null>(null);
  
  // Form State
  const [orderSide, setOrderSide] = useState<"YES" | "NO">("YES");
  const [orderType, setOrderType] = useState<"BUY" | "SELL">("BUY");
  const [price, setPrice] = useState<number>(5);
  const [quantity, setQuantity] = useState<number>(10);
  const [statusMsg, setStatusMsg] = useState<{ type: 'error' | 'success', text: string } | null>(null);
  const [isOrdering, setIsOrdering] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editQuantity, setEditQuantity] = useState<number>(0);

  // Initialize data
  useEffect(() => {
    if (ticker) {
      fetchApi(`/order/book/${ticker}`).then((data) => {
        setBids(data[orderSide]?.bids || []);
        setAsks(data[orderSide]?.asks || []);
      }).catch(console.error);

      // Fetch market details
      fetchApi("/order/markets").then((markets: any[]) => {
        const found = markets.find(m => m.ticker === ticker || m.ticker === ticker.toUpperCase());
        if (found) {
          setMarketInfo(found);
        }
      }).catch(console.error);
    }
    if (isAuthenticated) {
      fetchApi("/order/balance").then(setBalance).catch(console.error);
      fetchApi("/order/open").then(setOpenOrders).catch(console.error);
      fetchApi("/order/positions").then(setPositions).catch(console.error);
      fetchApi("/order/history/trades").then(setTradeHistory).catch(console.error);
    }
  }, [ticker, orderSide, isAuthenticated]);

  // Update book from WS
  useEffect(() => {
    const latestDepth = [...messages].reverse().find(m => 
      m.type === "DEPTH" && 
      m.ticker === ticker && 
      m.side === orderSide
    ) as (DepthMsg & { side: string }) | undefined;

    if (latestDepth) {
      setBids(latestDepth.bids || []);
      setAsks(latestDepth.asks || []);
    }
  }, [messages, ticker, orderSide]);

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    setIsOrdering(true);
    try {
      await fetchApi("/order", {
        method: "POST",
        body: JSON.stringify({ side: orderSide, type: orderType, price: Number(price), quantity: Number(quantity), ticker: ticker })
      });
      setStatusMsg({ type: 'success', text: 'Order placed' });
      refreshData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || "Failed to place order" });
    } finally {
      setIsOrdering(false);
    }
  };

  const cancelOrder = async (orderId: string, ticker: string, side: string) => {
    try {
      await fetchApi("/order/cancel", {
        method: "DELETE",
        body: JSON.stringify({ orderId, ticker, side })
      });
      refreshData();
    } catch (err: any) {
      alert(err.message || "Failed to cancel order");
    }
  };

  const startEdit = (order: Order) => {
    setEditingOrderId(order.id);
    setEditPrice(order.price);
    setEditQuantity(order.quantity);
  };

  const saveEdit = async (order: Order) => {
    try {
      await fetchApi("/order/edit", {
        method: "POST",
        body: JSON.stringify({ 
          orderId: order.id, 
          ticker: order.ticker, 
          side: order.side, 
          newPrice: Number(editPrice), 
          newQuantity: Number(editQuantity) 
        })
      });
      setEditingOrderId(null);
      refreshData();
    } catch (err: any) {
      alert(err.message || "Failed to edit order");
    }
  };

  const refreshData = () => {
    fetchApi("/order/open").then(setOpenOrders).catch(console.error);
    fetchApi("/order/balance").then(setBalance).catch(console.error);
    fetchApi("/order/positions").then(setPositions).catch(console.error);
    fetchApi("/order/history/trades").then(setTradeHistory).catch(console.error);
  };

  const currentPrice = useMemo(() => {
    if (bids.length > 0 && bids[0]) return bids[0].price;
    if (asks.length > 0 && asks[0]) return asks[0].price;
    return 0;
  }, [bids, asks]);

  const spread = useMemo(() => {
    if (bids.length > 0 && asks.length > 0 && bids[0] && asks[0]) {
      return Math.max(0, asks[0].price - bids[0].price);
    }
    return 0;
  }, [bids, asks]);

  return (
    <div className="fixed inset-0 top-16 bg-slate-50 text-slate-900 flex flex-col font-sans overflow-hidden">
      
      {/* PROFESSIONAL TERMINAL HEADER */}
      <header className="h-20 border-b border-slate-200 flex items-center px-6 justify-between bg-white z-10">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold tracking-tighter text-slate-900 capitalize">{ticker}</span>
            <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-800 font-bold border border-slate-200 capitalize">Predict</span>
          </div>
          {marketInfo && (
            <>
              <div className="h-8 w-[1px] bg-slate-200 hidden lg:block"></div>
              <span className="hidden lg:block text-base font-bold text-slate-500 tracking-tight">{marketInfo.title}</span>
            </>
          )}
          <div className="h-8 w-[1px] bg-slate-200"></div>
          <div className="flex flex-col">
            <span className="text-xs text-slate-400 capitalize font-bold leading-none mb-1">Last Price</span>
            <span className="text-xl font-mono font-bold leading-none text-slate-900">${currentPrice.toFixed(2)}</span>
          </div>
          <div className="hidden md:flex flex-col">
            <span className="text-xs text-slate-400 capitalize font-bold leading-none mb-1">Market Chance</span>
            <span className="text-lg font-mono font-bold leading-none text-emerald-500">{marketInfo ? marketInfo.chance : '—'}</span>
          </div>
          <div className="hidden md:flex flex-col">
            <span className="text-xs text-slate-400 capitalize font-bold leading-none mb-1">24h Volume</span>
            <span className="text-lg font-mono font-bold leading-none text-slate-700">{marketInfo ? marketInfo.volume : '—'}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full border border-slate-200">
            <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 animate-pulse'}`}></span>
            <span className="text-xs font-bold text-slate-600 capitalize tracking-wide">{isConnected ? 'System Live' : 'Connecting'}</span>
          </div>
        </div>
      </header>

      {/* MAIN TERMINAL BODY */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* LEFT: COMPACT ORDERBOOK */}
        <section className="w-96 border-r border-slate-200 flex flex-col bg-white">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <h3 className="text-sm font-bold capitalize tracking-wide text-slate-500">Global Orderbook</h3>
            <div className="flex gap-1 bg-slate-200/50 rounded border border-slate-200">
              <button onClick={() => setOrderSide("YES")} className={`cursor-pointer px-3 py-1 rounded text-sm font-bold transition-all capitalize ${orderSide === "YES" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}>Yes</button>
              <button onClick={() => setOrderSide("NO")} className={`cursor-pointer px-3 py-1 rounded text-sm font-bold transition-all capitalize ${orderSide === "NO" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}>No</button>
            </div>
          </div>
          
          <div className="flex-1 flex flex-col font-mono text-sm overflow-hidden">
             {/* Header */}
             <div className="grid grid-cols-3 px-5 py-3 text-slate-400 font-bold capitalize tracking-wide text-sm bg-slate-50 border-b border-slate-100">
                <span>Price</span>
                <span className="text-right">Size</span>
                <span className="text-right">Sum</span>
             </div>
             
             {/* ASKS (RED) */}
             <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col-reverse justify-end border-b border-slate-200 bg-rose-50/30 pb-3 pt-3">
                {asks.slice(0, 20).map((ask, i) => (
                  <div key={i} className="relative grid grid-cols-3 px-5 py-2 group cursor-pointer hover:bg-slate-100/80">
                    <span className="text-rose-500 font-bold tracking-tighter">${ask.price.toFixed(2)}</span>
                    <span className="text-right text-slate-700">{ask.quantity}</span>
                    <span className="text-right text-slate-400 tracking-tighter">{(ask.price * ask.quantity).toFixed(0)}</span>
                    <div className="absolute inset-y-0 right-0 bg-rose-100/50" style={{ width: `${Math.min(100, (ask.quantity / 100) * 100)}%` }}></div>
                  </div>
                ))}
                {asks.length === 0 && <div className="py-3 px-5 text-slate-400 italic text-xs text-center">No asks currently available</div>}
             </div>

             {/* SPREAD INDICATOR */}
             <div className="bg-slate-100 py-3 px-5 flex justify-between items-center border-y border-slate-200">
                <span className="text-2xl font-black tracking-tight text-slate-900">${currentPrice.toFixed(2)}</span>
                <span className="text-xs font-bold text-slate-500 capitalize tracking-wide text-right">Spread: ${spread.toFixed(2)}</span>
             </div>

             {/* BIDS (GREEN) */}
             <div className="flex-1 overflow-y-auto no-scrollbar bg-emerald-50/30 pt-3 pb-3">
                {bids.slice(0, 20).map((bid, i) => (
                  <div key={i} className="relative grid grid-cols-3 px-5 py-2 group cursor-pointer hover:bg-slate-100/80">
                    <span className="text-emerald-500 font-bold tracking-tighter">${bid.price.toFixed(2)}</span>
                    <span className="text-right text-slate-700">{bid.quantity}</span>
                    <span className="text-right text-slate-400 tracking-tighter">{(bid.price * bid.quantity).toFixed(0)}</span>
                    <div className="absolute inset-y-0 right-0 bg-emerald-100/50" style={{ width: `${Math.min(100, (bid.quantity / 100) * 100)}%` }}></div>
                  </div>
                ))}
                {bids.length === 0 && <div className="py-3 px-5 text-slate-400 italic text-xs text-center">No bids currently available</div>}
             </div>
          </div>
        </section>

        {/* CENTER: CHART AREA */}
        <section className="flex-1 flex flex-col bg-slate-50 relative">
          
          
         

          {/* BOTTOM PANEL: TRADES / HISTORY */}
          <div className="h-80 border-t border-slate-200 flex flex-col bg-white mt-auto shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] z-10">
             <div className="flex border-b border-slate-200 bg-slate-50">
                <button onClick={() => setActiveTab("positions")} className={`px-8 py-4 text-sm font-bold capitalize tracking-wide transition-all ${activeTab === "positions" ? "border-b-2 border-slate-900 text-slate-900 bg-white" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"}`}>Positions</button>
                <button onClick={() => setActiveTab("openOrders")} className={`px-8 py-4 text-sm font-bold capitalize tracking-wide transition-all ${activeTab === "openOrders" ? "border-b-2 border-slate-900 text-slate-900 bg-white" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"}`}>Open Orders ({openOrders.length})</button>
                <button onClick={() => setActiveTab("orderHistory")} className={`px-8 py-4 text-sm font-bold capitalize tracking-wide transition-all ${activeTab === "orderHistory" ? "border-b-2 border-slate-900 text-slate-900 bg-white" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"}`}>Order History</button>
                <button onClick={() => setActiveTab("tradeHistory")} className={`px-8 py-4 text-sm font-bold capitalize tracking-wide transition-all ${activeTab === "tradeHistory" ? "border-b-2 border-slate-900 text-slate-900 bg-white" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"}`}>Trade History</button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-6 font-mono text-sm bg-white">
                {activeTab === "positions" && (
                  positions.length > 0 ? (
                    <table className="w-full text-left">
                      <thead className="text-xs uppercase font-bold text-slate-400 border-b border-slate-200">
                        <tr>
                          <th className="pb-4 px-3">Market</th>
                          <th className="pb-4 px-3">Side</th>
                          <th className="pb-4 px-3">Shares</th>
                          <th className="pb-4 px-3">Avg Entry</th>
                          <th className="pb-4 px-3">Mark Price</th>
                          <th className="pb-4 px-3 text-right">Unrealized PnL</th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-700">
                        {positions.map((p, i) => {
                           const markPrice = currentPrice; // Approximating using spread midpoint or current order book touch price.
                           const pnl = (markPrice - p.avgPrice) * p.shares;
                           return (
                             <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                               <td className="py-4 px-3 font-bold text-slate-900">{p.ticker}</td>
                               <td className="py-4 px-3">
                                 <span className={`px-2 py-1 rounded text-xs font-bold capitalize ${p.side === 'YES' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{p.side.toLowerCase()}</span>
                               </td>
                               <td className="py-4 px-3">{p.shares}</td>
                               <td className="py-4 px-3 text-slate-500">${p.avgPrice.toFixed(2)}</td>
                               <td className="py-4 px-3 text-slate-900">${markPrice.toFixed(2)}</td>
                               <td className={`py-4 px-3 text-right font-bold tracking-tight ${pnl >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                                 {pnl >= 0 ? "+" : "-"}${Math.abs(pnl).toFixed(2)}
                               </td>
                             </tr>
                           );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300">
                       <ListFilter size={48} className="mb-4 opacity-50" />
                       <p className="text-sm font-bold capitalize tracking-wide text-slate-400">No open positions</p>
                    </div>
                  )
                )}

                {activeTab === "openOrders" && (
                  openOrders.length > 0 ? (
                    <table className="w-full text-left">
                      <thead className="text-xs uppercase font-bold text-slate-400 border-b border-slate-200">
                        <tr>
                          <th className="pb-4 px-3">Time</th>
                          <th className="pb-4 px-3">Market</th>
                          <th className="pb-4 px-3">Outcome</th>
                          <th className="pb-4 px-3">Type</th>
                          <th className="pb-4 px-3">Price</th>
                          <th className="pb-4 px-3">Quantity</th>
                          <th className="pb-4 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-700">
                        {openOrders.map((o, i) => (
                          <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                            <td className="py-4 px-3">Active</td>
                            <td className="py-4 px-3 font-bold text-slate-900">{o.ticker}</td>
                            <td className="py-4 px-3">
                              <span className={`px-2 py-1 rounded text-xs font-bold capitalize ${o.side === 'YES' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{o.side.toLowerCase()}</span>
                            </td>
                            <td className="py-4 px-3 capitalize">{o.type.toLowerCase()}</td>
                            <td className="py-4 px-3">
                              {editingOrderId === o.id ? (
                                 <input type="number" step="0.01" className="bg-white border border-slate-300 rounded px-2 py-1 w-20 text-slate-900 focus:outline-none focus:border-slate-500 shadow-sm" value={editPrice} onChange={e => setEditPrice(Number(e.target.value))} />
                              ) : `$${o.price.toFixed(2)}`}
                            </td>
                            <td className="py-4 px-3">
                              {editingOrderId === o.id ? (
                                 <input type="number" className="bg-white border border-slate-300 rounded px-2 py-1 w-20 text-slate-900 focus:outline-none focus:border-slate-500 shadow-sm" value={editQuantity} onChange={e => setEditQuantity(Number(e.target.value))} />
                              ) : o.quantity}
                            </td>
                            <td className="py-4 px-3 text-right">
                               {editingOrderId === o.id ? (
                                 <div className="flex justify-end gap-3 font-sans">
                                    <button onClick={() => saveEdit(o)} className="text-emerald-600 hover:text-emerald-700 font-bold text-xs capitalize tracking-wide bg-emerald-50 px-3 py-1.5 rounded">Save</button>
                                    <button onClick={() => setEditingOrderId(null)} className="text-slate-500 hover:text-slate-700 font-bold text-xs capitalize tracking-wide bg-slate-100 px-3 py-1.5 rounded">Cancel</button>
                                 </div>
                               ) : (
                                 <div className="flex justify-end gap-4 font-sans">
                                    <button onClick={() => startEdit(o)} className="text-slate-500 hover:text-slate-900 font-bold text-xs capitalize tracking-wide transition-colors">Edit</button>
                                    <button onClick={() => cancelOrder(o.id, o.ticker, o.side)} className="text-rose-500 hover:text-rose-700 font-bold text-xs capitalize tracking-wide transition-colors">Cancel</button>
                                 </div>
                               )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300">
                       <ListFilter size={48} className="mb-4 opacity-50" />
                       <p className="text-sm font-bold capitalize tracking-wide text-slate-400">No active orders</p>
                    </div>
                  )
                )}

                {activeTab === "tradeHistory" && (
                  tradeHistory.length > 0 ? (
                    <table className="w-full text-left">
                      <thead className="text-xs uppercase font-bold text-slate-400 border-b border-slate-200">
                        <tr>
                          <th className="pb-4 px-3">Time</th>
                          <th className="pb-4 px-3">Market</th>
                          <th className="pb-4 px-3">Action</th>
                          <th className="pb-4 px-3">Outcome</th>
                          <th className="pb-4 px-3">Price</th>
                          <th className="pb-4 px-3">Quantity</th>
                          <th className="pb-4 px-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-700">
                        {tradeHistory.map((t, i) => (
                           <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                             <td className="py-4 px-3">{new Date(t.timestamp).toLocaleTimeString()}</td>
                             <td className="py-4 px-3 font-bold text-slate-900">{t.ticker}</td>
                             <td className={`py-4 px-3 capitalize font-bold ${t.type === 'BUY' ? 'text-emerald-500' : 'text-rose-500'}`}>{t.type.toLowerCase()}</td>
                             <td className="py-4 px-3">
                               <span className={`px-2 py-1 rounded text-xs font-bold capitalize ${t.side === 'YES' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{t.side.toLowerCase()}</span>
                             </td>
                             <td className="py-4 px-3">${t.price.toFixed(2)}</td>
                             <td className="py-4 px-3">{t.quantity}</td>
                             <td className="py-4 px-3 text-right font-bold text-slate-900">${(t.price * t.quantity).toFixed(2)}</td>
                           </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300">
                       <ListFilter size={48} className="mb-4 opacity-50" />
                       <p className="text-sm font-bold capitalize tracking-wide text-slate-400">No trade history</p>
                    </div>
                  )
                )}

                {activeTab === "orderHistory" && (
                   <div className="h-full flex flex-col items-center justify-center text-slate-300">
                     <ListFilter size={48} className="mb-4 opacity-50" />
                     <p className="text-sm font-bold capitalize tracking-wide text-slate-400">Order history unavailable</p>
                  </div>
                )}
             </div>
          </div>
        </section>

        {/* RIGHT: ORDER FORM */}
        <section className="w-96 border-l border-slate-200 flex flex-col bg-white">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <h3 className="text-sm font-bold capitalize tracking-wide text-slate-500">Action Center</h3>
            {balance && (
               <div className="flex flex-col items-end">
                  <span className="text-xs font-bold text-slate-400 capitalize leading-none mb-1">Avail. Balance</span>
                  <span className="text-sm font-bold text-slate-800 leading-none">${balance.balance.toFixed(2)}</span>
               </div>
            )}
          </div>
          
          <div className="p-5 flex flex-col gap-8 flex-1 overflow-y-auto">
             <div className="flex flex-col gap-5">
                <div className="grid grid-cols-2 bg-slate-100 rounded-xl border border-slate-200">
                   <button onClick={() => setOrderType("BUY")} className={`cursor-pointer py-3 px-4 rounded-lg text-sm font-bold capitalize tracking-wide transition-all ${orderType === 'BUY' ? 'bg-white text-emerald-600 shadow-sm ' : 'text-slate-500 hover:text-slate-900'}`}>Buy</button>
                   <button onClick={() => setOrderType("SELL")} className={`cursor-pointer py-3 px-4 rounded-lg text-sm font-bold capitalize tracking-wide transition-all ${orderType === 'SELL' ? 'bg-white text-rose-600 shadow-sm ' : 'text-slate-500 hover:text-slate-900'}`}>Sell</button>
                </div>

                <div className="relative">
                  <select value={orderSide} onChange={(e) => setOrderSide(e.target.value as any)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-5 text-sm font-bold capitalize text-slate-800 appearance-none focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-all cursor-pointer">
                    <option value="YES">Will Happen (Yes)</option>
                    <option value="NO">Won't Happen (No)</option>
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                    <ArrowRight size={16} className="rotate-90" />
                  </div>
                </div>
             </div>

             <div className="space-y-5">
                <div className="space-y-3">
                   <div className="flex justify-between text-xs capitalize font-bold text-slate-500 mb-1">
                      <span>Limit Price</span>
                      <span className="text-slate-400">USD</span>
                   </div>
                   <input 
                      type="number" 
                      step="0.01" 
                      className="w-full bg-white border border-slate-300 rounded-[5px] text-[17px] py-2 px-3  font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-all shadow-sm"
                      value={price}
                      onChange={e => setPrice(Number(e.target.value))}
                   />
                </div>

                <div className="space-y-3">
                   <div className="flex justify-between text-xs capitalize font-bold text-slate-500 mb-1">
                      <span>Quantity</span>
                      <span className="text-slate-400">Shares</span>
                   </div>
                   <input 
                      type="number" 
                      className="w-full bg-white border border-slate-300 rounded-[5px] text-[17px] py-2 px-3  font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-all shadow-sm"
                      value={quantity}
                      onChange={e => setQuantity(Number(e.target.value))}
                   />
                </div>
             </div>

             <div className="flex flex-col gap-6 mt-3">
                <div className="flex justify-between items-center px-3 py-4 bg-slate-50 rounded-lg border border-slate-100">
                   <span className="text-sm font-bold capitalize text-slate-500">Total Order Value</span>
                   <span className="text-xl font-black font-mono text-slate-900">${(price * quantity).toFixed(2)}</span>
                </div>
                
                <button 
                  onClick={placeOrder}
                  disabled={isOrdering}
                  className={`w-full py-3 rounded-[6px] font-semibold capitalize text-base tracking-wide transition-all transform active:scale-[0.98] shadow-md ${isOrdering ? 'opacity-70 cursor-not-allowed bg-slate-200 text-slate-500' : 'bg-slate-900 text-white hover:bg-black hover:shadow-lg'}`}
                >
                   {isOrdering ? (
                     <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                        <span>Processing...</span>
                     </div>
                   ) : `Submit Limit Order`}
                </button>
             </div>

             {statusMsg && (
                <div className={`p-4 rounded-xl text-xs font-bold capitalize flex items-center gap-3 border shadow-sm animate-in slide-in-from-bottom-2 duration-300 ${statusMsg.type === 'error' ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                   <Activity size={18} className={statusMsg.type === 'error' ? 'text-rose-500' : 'text-emerald-500'} />
                   {statusMsg.text}
                </div>
             )}
          </div>

        
        </section>

      </main>
    </div>
  );
};
