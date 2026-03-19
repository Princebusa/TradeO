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
    <div className="flex justify-center items-center min-h-[70vh]">
      <div className="brutal-box p-8 w-full max-w-md bg-white">
        <h2 className="text-4xl font-black mb-6 uppercase tracking-tighter bg-primary inline-block px-2 py-1 -rotate-2">
          {isLogin ? "Enter Market" : "Join Market"}
        </h2>
        
        {error && (
          <div className="bg-danger text-white border-[3px] border-black p-3 mb-4 font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!isLogin && (
            <div className="flex flex-col">
              <label className="font-bold mb-1 uppercase text-sm">Username</label>
              <input 
                type="text" 
                className="brutal-input" 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                required 
              />
            </div>
          )}
          
          <div className="flex flex-col">
            <label className="font-bold mb-1 uppercase text-sm">Email</label>
            <input 
              type="email" 
              className="brutal-input" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
            />
          </div>

          <div className="flex flex-col">
            <label className="font-bold mb-1 uppercase text-sm">Password</label>
            <input 
              type="password" 
              className="brutal-input" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
            />
          </div>

          <button type="submit" className="brutal-button py-3 mt-4 text-lg">
            {isLogin ? "Login =>" : "Sign Up =>"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm font-bold border-t-[3px] border-black pt-4">
          <p>
            {isLogin ? "No account?" : "Already trading?"}{" "}
            <button 
              type="button" 
              className="text-secondary underline hover:text-primary transition-colors bg-black px-1"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? "Register Here" : "Login Here"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
