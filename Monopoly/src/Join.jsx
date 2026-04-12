import { useState } from "react";
import { db } from "./firebase";
import { ref, set } from "firebase/database";
import { v4 as uuidv4 } from "uuid";

export default function Join({ setPlayer }) {
  const [name, setName] = useState("");
  const [gameId, setGameId] = useState("");
  const [loading, setLoading] = useState(false);

  const joinGame = async () => {
    if (!name || !gameId) {
      alert("Enter name and game ID");
      return;
    }

    setLoading(true);

    const playerId = uuidv4();

    const playerData = {
      playerId,
      name,
      gameId
    };

    // Save to Firebase
    await set(ref(db, `games/${gameId}/players/${playerId}`), {
      name,
      balance: 3000,
      loanTaken: 0,
      loanLimit: 5000
    });

    // 🔥 SAVE LOCALLY (IMPORTANT FIX)
    localStorage.setItem("player", JSON.stringify(playerData));

    // Set state
    setPlayer(playerData);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white p-4">
      <div className="w-full max-w-sm bg-gray-800 p-6 rounded-xl shadow-lg">

        {/* TITLE */}
        <h2 className="text-2xl font-bold text-center mb-6">
          Join Game 🎮
        </h2>

        {/* NAME */}
        <input
          className="w-full p-3 mb-4 rounded bg-gray-700 border border-gray-600 focus:outline-none"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && joinGame()}
        />

        {/* GAME ID */}
        <input
          className="w-full p-3 mb-4 rounded bg-gray-700 border border-gray-600 focus:outline-none"
          placeholder="Enter Game ID"
          value={gameId}
          onChange={(e) => setGameId(e.target.value.toLowerCase())}
          onKeyDown={(e) => e.key === "Enter" && joinGame()}
        />

        {/* BUTTON */}
        <button
          className={`w-full p-3 rounded font-semibold ${
            loading
              ? "bg-gray-600"
              : "bg-blue-500 hover:bg-blue-600"
          }`}
          onClick={joinGame}
          disabled={loading}
        >
          {loading ? "Joining..." : "Join Game"}
        </button>

      </div>
    </div>
  );
}