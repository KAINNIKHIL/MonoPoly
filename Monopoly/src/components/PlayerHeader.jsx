import { useState } from "react";

export default function PlayerHeader({ playerData, gameId, onLeave }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(gameId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="bg-gray-900/80 border border-white/10 rounded-2xl p-4 mb-5 shadow-md">
      
      <div className="flex items-center justify-between">
        
        {/* 👤 Player Info */}
        <div>
          <h2 className="text-lg font-semibold text-white">
            {playerData.name || "Player"}
          </h2>

          <p className="text-xs text-gray-400">
            Game ID
          </p>
        </div>

        {/* ⚙️ Actions (Copy + Leave) */}
        <div className="flex items-center gap-2">
          
          {/* Copy */}
          <button
            onClick={handleCopy}
            className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition border border-white/10"
          >
            {copied ? "Copied" : "Copy"}
          </button>

          {/* Leave */}
          <button
            onClick={onLeave}
            className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition active:scale-90"
            title="Leave Game"
          >
            Leave
          </button>
        </div>
      </div>

      {/* 🧾 Game ID */}
      <div
        onClick={handleCopy}
        className="mt-3 text-sm bg-black/40 border border-white/10 px-3 py-2 rounded-lg cursor-pointer flex justify-between items-center"
      >
        <span className="truncate">{gameId}</span>

        <span className="text-gray-400 text-xs">
          tap to copy
        </span>
      </div>

      {/* ✅ feedback */}
      {copied && (
        <div className="text-green-400 text-xs mt-2 text-center animate-pulse">
          Game ID copied
        </div>
      )}
    </div>
  );
}