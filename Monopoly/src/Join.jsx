import { useState } from "react";
import { db } from "./firebase";
import { ref, set, get } from "firebase/database";
import { v4 as uuidv4 } from "uuid";

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
      alert("Enter your name");
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
      balance: 3000,
      loanTaken: 0,
      loanLimit: 5000
    };

    await set(ref(db, `games/${code}/players/${playerId}`), {
      name,
      balance: 3000,
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
    alert("Enter name and game ID");
    return;
  }

  setLoading(true);

  const code = gameId.toUpperCase();

  // 🔥 1. CHECK GAME FIRST
  const gameSnap = await get(ref(db, `games/${code}`));

  if (!gameSnap.exists()) {
    alert("Game does not exist ❌");
    setLoading(false);
    return;
  }

  const playerId = uuidv4();

  const playerData = {
    playerId,
    name,
    gameId: code,
    balance: 3000,
    loanTaken: 0,
    loanLimit: 5000
  };

  // 🔥 ONLY NOW ADD PLAYER
  await set(ref(db, `games/${code}/players/${playerId}`), {
    name,
    balance: 3000,
    loanTaken: 0,
    loanLimit: 5000
  });

  localStorage.setItem("player", JSON.stringify(playerData));
  setPlayer(playerData);

  setLoading(false);
};

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white p-4">
      <div className="w-full max-w-sm bg-gray-800 p-6 rounded-xl shadow-lg">

        {/* TITLE */}
        <h2 className="text-2xl font-bold text-center mb-4">
          Multiplayer Game 🎮
        </h2>

        {/* MODE SWITCH */}
        <div className="flex mb-4 gap-2">
          <button
            className={`flex-1 p-2 rounded ${
              mode === "join" ? "bg-blue-500" : "bg-gray-700"
            }`}
            onClick={() => setMode("join")}
          >
            Join
          </button>

          <button
            className={`flex-1 p-2 rounded ${
              mode === "create" ? "bg-blue-500" : "bg-gray-700"
            }`}
            onClick={() => setMode("create")}
          >
            Create
          </button>
        </div>

        {/* NAME */}
        <input
          className="w-full p-3 mb-3 rounded bg-gray-700 border border-gray-600"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {/* JOIN INPUT */}
        {mode === "join" && (
          <input
            className="w-full p-3 mb-3 rounded bg-gray-700 border border-gray-600"
            placeholder="Enter Game Code"
            value={gameId}
            onChange={(e) => setGameId(e.target.value.toUpperCase())}
          />
        )}

        {/* BUTTON */}
        {mode === "join" ? (
          <button
            className="w-full p-3 rounded bg-blue-500 hover:bg-blue-600 font-semibold"
            onClick={joinGame}
            disabled={loading}
          >
            {loading ? "Joining..." : "Join Game"}
          </button>
        ) : (
          <button
            className="w-full p-3 rounded bg-blue-500 hover:bg-blue-600 font-semibold"
            onClick={createGame}
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Game"}
          </button>
        )}

      </div>
    </div>
  );
}