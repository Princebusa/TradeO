import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, ArrowRight } from "lucide-react";
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
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-10">
        <div>
           <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-2">Live Markets</h1>
           <p className="text-slate-500 font-medium">Bet on outcomes and trade opinions in real-time.</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-modern border border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-primary">
             <TrendingUp size={24} />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Trading Volume</div>
            <div className="text-lg font-bold text-slate-900">$1.2M+</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {markets.map((m) => (
          <Link to={`/market/${m.ticker}`} key={m.ticker} className="block group">
            <div className="brutal-box p-6 h-full flex flex-col justify-between hover:border-primary/30 transition-all duration-300">
              <div>
                <div className="flex justify-between items-start mb-6">
                  <span className="bg-indigo-50 text-primary font-bold px-3 py-1 rounded-lg text-xs uppercase tracking-wide">
                    {m.ticker}
                  </span>
                  <span className="text-slate-400 text-xs font-semibold flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-slate-200 rounded-full"></div>
                      Vol: {m.volume}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-800 leading-snug group-hover:text-primary transition-colors mb-6">{m.title}</h3>
              </div>
              
              <div className="flex justify-between items-end pt-4 border-t border-slate-50">
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-1">Market Chance</div>
                  <div className="text-3xl font-black text-success tracking-tighter">{m.chance}</div>
                </div>
                <div className="bg-slate-100 text-slate-400 p-3 rounded-xl group-hover:bg-primary group-hover:text-white group-hover:translate-x-1 transition-all">
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
