import { useEffect, useState } from "react";
import Join from "./Join";
import Player from "./Player";


function App() {
  const [player, setPlayer] = useState(null);

  // 🔄 Restore player after refresh
  useEffect(() => {
    const savedPlayer = localStorage.getItem("player");

    if (savedPlayer) {
      setPlayer(JSON.parse(savedPlayer));
    }
  }, []);

  return (
    <div>
      {!player ? (
        <Join setPlayer={setPlayer} />
      ) : (
        <Player player={player} />
      )}
    </div>
  );
}

export default App;