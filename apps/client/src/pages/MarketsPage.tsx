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
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="bg-primary p-3 border-[3px] border-black shadow-[4px_4px_0_0_#000]">
          <TrendingUp size={32} strokeWidth={3} />
        </div>
        <h1 className="text-5xl font-black uppercase tracking-tighter">Live Markets</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {markets.map((m) => (
          <Link to={`/market/${m.ticker}`} key={m.ticker} className="block group">
            <div className="brutal-box p-6 h-full flex flex-col justify-between hover:bg-yellow-50">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="bg-accent font-bold px-2 py-1 border-2 border-black text-sm uppercase">
                    {m.ticker}
                  </span>
                  <span className="font-bold text-gray-500 text-sm border-b-2 border-black">Vol: {m.volume}</span>
                </div>
                <h3 className="text-2xl font-bold leading-tight mb-4">{m.title}</h3>
              </div>
              
              <div className="flex justify-between items-end border-t-[3px] border-black pt-4 mt-4">
                <div>
                  <div className="text-sm font-bold uppercase text-gray-600 mb-1">Market Chance</div>
                  <div className="text-3xl font-black text-success">{m.chance}</div>
                </div>
                <div className="bg-black text-white p-2 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform">
                  <ArrowRight size={24} strokeWidth={3} />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
