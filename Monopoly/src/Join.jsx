import { useState } from "react";
import { db } from "./firebase";
import { ref, set, get } from "firebase/database";
import { v4 as uuidv4 } from "uuid";
import toast from "react-hot-toast";

export default function Join({ setPlayer }) {
  const [name, setName] = useState("");
  const [gameId, setGameId] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("join"); // join | create

  // 🎮 Generate Game Code
  const generateGameCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  // 🟢 CREATE GAME
  const createGame = async () => {
    if (!name) {
      toast("Enter your name");
      return;
    }

    setLoading(true);

    const code = generateGameCode();
    const playerId = uuidv4();

    // Create game room
    await set(ref(db, `games/${code}`), {
      createdAt: Date.now(),
      host: playerId
    });

    const playerData = {
      playerId,
      name,
      gameId: code,
      balance: 10000,
      loanTaken: 0,
      loanLimit: 5000
    };

    await set(ref(db, `games/${code}/players/${playerId}`), {
      name,
      balance: 10000,
      loanTaken: 0,
      loanLimit: 5000
    });

    localStorage.setItem("player", JSON.stringify(playerData));
    setPlayer(playerData);

    setLoading(false);
  };

  // 🔵 JOIN GAME
  const joinGame = async () => {
  if (!name || !gameId) {
    toast("Enter name and game ID");
    return;
  }

  setLoading(true);

  const code = gameId.toUpperCase();

  // 🔥 1. CHECK GAME FIRST
  const gameSnap = await get(ref(db, `games/${code}`));

  if (!gameSnap.exists()) {
    toast.error("Game does not exist ❌");
    setLoading(false);
    return;
  }

  const playerId = uuidv4();

  const playerData = {
    playerId,
    name,
    gameId: code,
    balance: 10000,
    loanTaken: 0,
    loanLimit: 5000
  };

  // 🔥 ONLY NOW ADD PLAYER
  await set(ref(db, `games/${code}/players/${playerId}`), {
    name,
    balance: 10000,
    loanTaken: 0,
    loanLimit: 5000
  });

  localStorage.setItem("player", JSON.stringify(playerData));
  setPlayer(playerData);

  setLoading(false);
};

  return (
  <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center text-white p-4">

    <div className="w-full max-w-sm bg-gray-800/70 backdrop-blur-xl p-6 rounded-2xl shadow-2xl border border-gray-700">

      {/* TITLE */}
      <h2 className="text-3xl font-bold text-center mb-1 tracking-wide">
  🏦 Monopoly
</h2>
<p className="text-center text-gray-400 text-sm mb-5">
  Build. Trade. Dominate.
</p>

      {/* MODE SWITCH */}
      <div className="flex mb-5 bg-gray-700/50 p-1 rounded-xl">
        <button
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === "join"
              ? "bg-blue-500 text-white shadow-md scale-105"
              : "text-gray-300"
          }`}
          onClick={() => setMode("join")}
        >
          Join
        </button>

        <button
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === "create"
              ? "bg-blue-500 text-white shadow-md scale-105"
              : "text-gray-300"
          }`}
          onClick={() => setMode("create")}
        >
          Create
        </button>
      </div>

      {/* INPUTS */}
      <div className="space-y-3">
        <input
          className="w-full p-3 rounded-lg bg-gray-700/80 border border-gray-600 focus:border-blue-500 focus:outline-none transition"
          placeholder="👤 Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {mode === "join" && (
          <input
            className="w-full p-3 rounded-lg bg-gray-700/80 border border-gray-600 focus:border-blue-500 focus:outline-none uppercase tracking-widest text-center transition"
            placeholder="🎯 GAME CODE"
            value={gameId}
            onChange={(e) =>
              setGameId(e.target.value.toUpperCase())
            }
          />
        )}
      </div>

      {/* BUTTON */}
      <button
        className="w-full mt-5 p-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:scale-[1.03] active:scale-95 transition-all font-semibold shadow-lg disabled:opacity-50"
        onClick={mode === "join" ? joinGame : createGame}
        disabled={loading}
      >
        {loading
          ? mode === "join"
            ? "Joining..."
            : "Creating..."
          : mode === "join"
          ? "🚀 Join Game"
          : "✨ Create Game"}
      </button>

    </div>
  </div>
);
}