import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, ShoppingBag, TrendingUp, MessageCircle, Smartphone, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";

const HIGHLIGHTS = [
  { icon: TrendingUp, text: "AI-driven demand forecasting for every product" },
  { icon: Smartphone, text: "Instant WhatsApp alerts when stock runs low" },
  { icon: MessageCircle, text: "Ask your business questions in plain English" },
];

const HEADLINE = "Run your shop with the intelligence of a much bigger business.";
const TYPE_SPEED_MS = 32;

function useTypewriter(text, speed) {
  const [typed, setTyped] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setTyped(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return { typed, done };
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { typed: typedHeadline, done: headlineDone } = useTypewriter(HEADLINE, TYPE_SPEED_MS);
  const [formVisible, setFormVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFormVisible(true), 150);
    return () => clearTimeout(timer);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", form);
      login(data.access_token, { id: data.user_id, name: data.name, role: data.role });
      navigate("/pos");
    } catch (err) {
      setError("Incorrect email or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Brand panel */}
      <div className="hidden lg:flex lg:w-[46%] relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 60% 70%, white 1px, transparent 1px)",
            backgroundSize: "48px 48px, 64px 64px",
          }}
        />
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-blue-400/20 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-white/15 backdrop-blur rounded-xl flex items-center justify-center ring-1 ring-white/20">
              <ShoppingBag className="w-5 h-5" strokeWidth={2.25} />
            </div>
            <span className="font-semibold text-lg tracking-tight">SmartRetail</span>
          </div>

          <div>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight mb-4 min-h-[8.5rem]">
              {typedHeadline}
              <span
                className={`inline-block w-[3px] h-8 bg-white/80 ml-0.5 -mb-1.5 ${
                  headlineDone ? "animate-pulse" : "animate-[blink_1s_steps(1)_infinite]"
                }`}
              />
            </h1>
            <p
              className={`text-blue-100 text-base mb-10 max-w-md transition-all duration-500 ${
                headlineDone ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
              }`}
            >
              Point of sale, demand forecasting, inventory alerts, and customer insight — built for
              Ghanaian SMEs.
            </p>

            <div className="space-y-4">
              {HIGHLIGHTS.map(({ icon: Icon, text }, i) => (
                <div
                  key={text}
                  className={`flex items-center gap-3 transition-all duration-500 ${
                    headlineDone ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                  }`}
                  style={{ transitionDelay: headlineDone ? `${150 + i * 120}ms` : "0ms" }}
                >
                  <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center ring-1 ring-white/15 shrink-0">
                    <Icon className="w-4 h-4" strokeWidth={2.25} />
                  </div>
                  <p className="text-sm text-blue-50">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-blue-200/70">Built for SME retail in Ghana</p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 relative flex items-center justify-center px-6 py-12 overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-90"
        >
          <source src="/videos/landing-bg.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-white/10" />

        <div
          className={`relative z-10 w-full max-w-sm bg-white rounded-3xl shadow-popover p-8 transition-all duration-700 ease-out ${
            formVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <div className="lg:hidden flex items-center gap-2.5 justify-center mb-8">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-white" strokeWidth={2.25} />
            </div>
            <span className="font-semibold text-lg text-gray-900">SmartRetail</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">Welcome back</h2>
            <p className="text-gray-500 text-sm mt-1.5">Sign in to your SmartRetail account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" strokeWidth={2} />
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-shadow"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" strokeWidth={2} />
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-shadow"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm px-3.5 py-2.5 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={2} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-xl transition-colors text-sm shadow-card"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-8">
            Cashiers and owners both sign in here — you'll land on the right screen automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
