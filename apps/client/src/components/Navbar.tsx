import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { fetchApi } from "../lib/api";
import { LogOut, Wallet } from "lucide-react";

export const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const [balance, setBalance] = useState<{ balance: number; lock: number } | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchApi("/order/balance").then((data) => setBalance(data)).catch(() => {});
    }
  }, [isAuthenticated]);

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 mb-8 px-6 py-4 flex justify-between items-center">
      <Link to="/" className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-black">O</div>
        <span>Opinune</span>
      </Link>
      
      <div className="flex items-center gap-6">
        {isAuthenticated && user ? (
          <>
            <div className="hidden sm:flex items-center gap-3 bg-slate-50 border border-slate-100 px-4 py-1.5 rounded-full text-sm font-medium text-slate-600">
              <Wallet size={16} className="text-primary" />
              <span>${balance?.balance?.toFixed(2) || "0.00"}</span>
              <span className="text-xs text-slate-400">|</span>
              <span className="text-xs text-slate-400">Locked: ${balance?.lock?.toFixed(2) || "0.00"}</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200 text-xs font-bold uppercase">
                    {user.username.slice(0, 2)}
                </div>
                <span className="text-sm font-semibold text-slate-700 hidden md:inline">{user.username}</span>
            </div>
            <button onClick={logout} className="text-slate-400 hover:text-danger p-2 transition-colors">
              <LogOut size={20} />
            </button>
          </>
        ) : (
          <Link to="/auth" className="brutal-button px-6 py-2 text-sm shadow-indigo-100">Login</Link>
        )}
      </div>
    </nav>
  );
};
