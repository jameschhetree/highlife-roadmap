"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { adminLogin } from "@/lib/admin-auth";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 400));

    if (adminLogin(username, password)) {
      router.push("/");
    } else {
      setError("Invalid credentials");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
        className="w-full max-w-sm mx-auto px-6"
      >
        <div className="text-center mb-10">
          <div className="w-14 h-14 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-amber-400 to-teal-500 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-xl tracking-tight">
              HL
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-[#1a1a1a] tracking-tight mb-2">
            HighLife Roadmap
          </h1>
          <p className="text-sm text-[#888]">
            Sign in to manage the 12-month plan
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-[#888] uppercase tracking-wider block mb-1.5">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-white border border-[#e5e5e5] text-sm px-4 py-3 rounded-xl text-[#1a1a1a] placeholder:text-[#ccc] focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-all"
              placeholder="admin"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[#888] uppercase tracking-wider block mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border border-[#e5e5e5] text-sm px-4 py-3 pr-12 rounded-xl text-[#1a1a1a] placeholder:text-[#ccc] focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-all"
                placeholder="admin"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#ccc] hover:text-[#888] transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-500 text-sm text-center"
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#1a1a1a] text-white text-sm font-medium rounded-xl hover:bg-[#333] transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-xs text-[#bbb] mt-6">
          Credentials: admin / admin
        </p>
      </motion.div>
    </div>
  );
}
