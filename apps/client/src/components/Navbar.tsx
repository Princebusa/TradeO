import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { fetchApi } from "../lib/api";
import { LogOut, Wallet, Menu } from "lucide-react";

export const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const [balance, setBalance] = useState<{ balance: number; lock: number } | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchApi("/order/balance").then((data) => setBalance(data)).catch(() => {});
    }
  }, [isAuthenticated]);

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 flex justify-between items-center px-6 h-16 w-full">
      <Link to="/" className="text-2xl font-bold tracking-tight flex items-center gap-2 text-slate-900">
        <div className="w-10 h-10 bg-slate-900 text-white rounded-lg flex items-center justify-center font-black transition-colors">O</div>
        <span className="tracking-tighter capitalize italic text-lg">TradeO Terminal</span>
      </Link>
      
      <div className="flex items-center gap-6">
        {isAuthenticated && user ? (
          <>
            <div className="hidden sm:flex items-center gap-3 border border-slate-200 bg-slate-50 px-5 py-2 rounded-full text-xs font-bold capitalize tracking-wide text-slate-500">
              <Wallet size={16} className="text-slate-500" />
              <span className="font-mono text-slate-800 text-sm">${balance?.balance?.toFixed(2) || "0.00"}</span>
              <span className="text-sm opacity-20">|</span>
              <span className="opacity-60 text-sm">Locked: ${balance?.lock?.toFixed(2) || "0.00"}</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full flex items-center justify-center border border-slate-200 bg-slate-100 text-xs font-bold capitalize text-slate-800">
                    {user.username.slice(0, 2)}
                </div>
                <span className="text-sm font-bold capitalize tracking-wide text-slate-600 hidden md:inline">{user.username}</span>
            </div>
            <button onClick={logout} className="p-2 transition-colors text-slate-400 hover:text-slate-900">
              <LogOut size={20} />
            </button>
          </>
        ) : (
          <Link to="/auth" className="bg-slate-900 text-white px-6 py-2.5 text-xs font-bold capitalize tracking-wide rounded-lg hover:bg-slate-800 transition-all">Connect Wallet</Link>
        )}
      </div>
    </nav>
  );
};
