import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, ArrowRight, BarChart3, Globe, Zap } from "lucide-react";
import { fetchApi } from "../lib/api";

type Market = { ticker: string; title: string; volume: string; chance: string };

export const MarketsPage = () => {
  const [markets, setMarkets] = useState<Market[]>([]);

  useEffect(() => {
    fetchApi("/order/markets")
      .then(setMarkets)
      .catch(console.error);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 bg-slate-50 min-h-screen text-slate-900">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-16 gap-8">
        <div className="space-y-4">
           <div className="flex items-center gap-2 text-slate-500">
              <Globe size={14} />
              <span className="text-[10px] font-bold capitalize tracking-wide">Global Market Intelligence</span>
           </div>
           <h1 className="text-6xl font-black tracking-tighter text-slate-900 capitalize">Live Markets</h1>
            </div>
        
       
      </div>

      {/* Markets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {markets.map((m) => (
          <Link to={`/market/${m.ticker}`} key={m.ticker} className="block group">
            <div className="brutal-box p-6 bg-white flex flex-col justify-between h-[240px] transition-all duration-500 overflow-hidden relative">
             
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-2">
                  <span className="bg-slate-100 border border-slate-200 text-slate-800 font-bold px-4 py-1.5 rounded-md text-[10px] capitalize tracking-wide">
                    {m.ticker}
                  </span>
                  <div className="flex flex-col items-end">
                     <span className="text-[10px] font-bold text-slate-400 capitalize tracking-wide">24h Vol</span>
                     <span className="text-sm font-mono font-bold text-slate-700">{m.volume}</span>
                  </div>
                </div>
                <h3 className="text-2xl font-black text-slate-900 leading-[1.1] tracking-tight group-hover:text-slate-700 transition-colors mb-6 capitalize">{m.title}</h3>
              </div>
              
              <div className="flex justify-between items-end pt-6 border-t border-slate-100 relative z-10">
                <div className="flex flex-col">
                  <div className="text-[10px] font-bold capitalize text-slate-500 tracking-wide mb-1.5 italic">Market Probability</div>
                  <div className="text-5xl font-black text-slate-900 tracking-tighter font-mono group-hover:scale-105 transition-transform origin-left">{m.chance}</div>
                </div>
                <div className="w-12 h-12 bg-slate-50 border border-slate-200 text-slate-400 flex items-center justify-center rounded-xl group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900 transition-all transform group-hover:rotate-45">
                   <ArrowRight size={20} />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
