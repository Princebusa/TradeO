import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { fetchApi } from "../lib/api";
import { Shield, Key, User, ArrowRight, Activity, Mail } from "lucide-react";

export const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center bg-slate-50 p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-slate-200/50 rounded-full blur-3xl"></div>
         <div className="absolute -top-24 -left-24 w-96 h-96 bg-slate-200/30 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-[450px] relative z-10">
        <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 border border-slate-200 mb-6 transition-all hover:bg-slate-200">
                <Shield size={12} className="text-slate-500" />
                <span className="text-[10px] font-bold capitalize tracking-wide text-slate-600">Secure terminal access</span>
            </div>
            <h1 className="text-5xl font-black tracking-tighter text-slate-900 mb-2 capitalize">
                {isLogin ? "Authorized" : "Registration"}
            </h1>
            <p className="text-slate-500 text-[10px] font-bold capitalize tracking-wide">
                {isLogin ? "Secure node connection required" : "Initialize new trading identity"}
            </p>
        </div>

        <div className="brutal-box p-10 bg-white/80 border-slate-200 backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold capitalize tracking-wide text-slate-500 ml-1">Identity UID</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-slate-900 transition-colors">
                    <User size={18} />
                  </div>
                  <input
                    type="text"
                    placeholder="Username"
                    className="w-full brutal-input pl-12 text-sm font-bold placeholder:text-slate-400"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-bold capitalize tracking-wide text-slate-500 ml-1">Protocol Handle (Email)</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-slate-900 transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  placeholder="protocol@node.network"
                  className="w-full brutal-input pl-12 text-sm font-bold placeholder:text-slate-400"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold capitalize tracking-wide text-slate-500 ml-1">Secure Key</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-slate-900 transition-colors">
                  <Key size={18} />
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full brutal-input pl-12 text-sm font-bold placeholder:text-slate-400"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-500 p-4 rounded-xl text-[10px] font-bold capitalize tracking-wide flex items-center gap-3 animate-shake">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full brutal-button h-14 flex items-center justify-center gap-3 group relative overflow-hidden"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                   <div className="w-4 h-4 border-2 border-slate-300 border-t-white rounded-full animate-spin"></div>
                   <span>Initializing...</span>
                </div>
              ) : (
                <>
                  <span>{isLogin ? "Initialize Access" : "Create Identity"}</span>
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-slate-100 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-[10px] font-bold capitalize tracking-wide text-slate-500 hover:text-slate-900 transition-colors"
            >
              {isLogin ? "New user? create identity node" : "Already registered? authenticate node"}
            </button>
          </div>
        </div>

        <div className="mt-12 flex items-center justify-center gap-8 opacity-40 grayscale">
            <Activity size={24} />
            <div className="h-4 w-[1px] bg-slate-300"></div>
            <span className="text-[10px] font-bold capitalize tracking-wide">Protocol Version 4.0.2-Stable</span>
        </div>
      </div>
    </div>
  );
};
