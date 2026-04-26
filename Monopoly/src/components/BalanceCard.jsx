import { useEffect, useState } from "react";

export default function BalanceCard({ balance }) {
  const [animate, setAnimate] = useState(false);

  // trigger glow on balance change
  useEffect(() => {
    setAnimate(true);
    const t = setTimeout(() => setAnimate(false), 500);
    return () => clearTimeout(t);
  }, [balance]);

  return (
    <div
      className={`relative rounded-2xl p-5 mb-6 text-center 
      bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900
      border border-white/10 shadow-xl overflow-hidden
      transition-all duration-300
      ${animate ? "scale-[1.03] shadow-2xl" : ""}`}
    >
      {/* glow layer */}
      {animate && (
        <div className="absolute inset-0 bg-green-400/10 blur-xl animate-pulse" />
      )}

      {/* label */}
      <p className="text-xs uppercase tracking-wide text-gray-400">
        Balance
      </p>

      {/* amount */}
      <h1 className="text-4xl font-bold mt-2 text-white">
        ₹{balance}
      </h1>

      {/* subtle bottom highlight */}
      <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-green-400/50 to-transparent" />
    </div>
  );
}