import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { fetchApi } from "../lib/api";

export const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const endpoint = isLogin ? "/auth/login" : "/auth/register";
      const payload = isLogin ? { email, password } : { username, email, password };
      
      const data = await fetchApi(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (data.token && data.user) {
        login(data.token, data.user);
        navigate("/markets");
      } else {
        setError("Invalid response from server");
      }
    } catch (err: any) {
      setError(err.message || "Failed to authenticate");
    }
  };

  return (
    <div className="flex justify-center items-center py-12 px-4">
      <div className="bg-white border border-slate-200 rounded-3xl p-10 w-full max-w-md shadow-modern-lg">
        <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-50 text-primary rounded-2xl mb-4">
                <Wallet size={24} />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
            {isLogin ? "Welcome Back" : "Create Account"}
            </h2>
            <p className="text-slate-500 mt-2 font-medium">
                {isLogin ? "Log in to manage your trades" : "Join the world's first opinion market"}
            </p>
        </div>
        
        {error && (
          <div className="bg-rose-50 text-danger border border-rose-100 p-4 rounded-xl mb-6 text-sm font-medium flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-danger"></div>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {!isLogin && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Username</label>
              <input 
                type="text" 
                className="brutal-input" 
                placeholder="How should we call you?"
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                required 
              />
            </div>
          )}
          
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
            <input 
              type="email" 
              className="brutal-input" 
              placeholder="you@example.com"
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Password</label>
            <input 
              type="password" 
              className="brutal-input" 
              placeholder="••••••••"
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
            />
          </div>

          <button type="submit" className="brutal-button py-4 mt-4 text-sm font-bold shadow-indigo-200">
            {isLogin ? "Access Market" : "Build Your Portfolio"}
          </button>
        </form>

        <div className="mt-10 text-center text-sm font-medium border-t border-slate-50 pt-8">
          <p className="text-slate-500">
            {isLogin ? "New to Opinune?" : "Already a member?"}{" "}
            <button 
              type="button" 
              className="text-primary font-bold hover:underline"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? "Create an account" : "Log in to trade"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
