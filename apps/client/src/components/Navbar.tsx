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
    <nav className="brutal-box mb-8 p-4 flex justify-between items-center bg-primary">
      <Link to="/" className="text-2xl font-black tracking-tighter uppercase flex items-center gap-2 -m-1">
        <span className="bg-black text-primary px-2 py-1 rotate-2">Opinune</span>
        <span className="text-black bg-white px-2 py-1 -rotate-2 border-2 border-black">Trade</span>
      </Link>
      
      <div className="flex items-center gap-4">
        {isAuthenticated && user ? (
          <>
            <div className="flex items-center gap-2 bg-white border-2 border-black px-3 py-1 font-bold">
              <Wallet size={18} />
              <span>${balance?.balance?.toFixed(2) || "0.00"}</span>
              <span className="text-xs text-gray-500 ml-2">(Locked: ${balance?.lock?.toFixed(2) || "0.00"})</span>
            </div>
            <div className="bg-white border-2 border-black px-3 py-1 font-bold">
              {user.username}
            </div>
            <button onClick={logout} className="brutal-button p-2 bg-danger text-white">
              <LogOut size={18} />
            </button>
          </>
        ) : (
          <Link to="/auth" className="brutal-button px-4 py-2">Login</Link>
        )}
      </div>
    </nav>
  );
};
