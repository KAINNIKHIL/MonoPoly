import { db } from "../firebase";
import { ref, get, set } from "firebase/database";

export const initCardsForGame = async (gameId) => {
  const snapshot = await get(ref(db, "cards"));

  if (!snapshot.exists()) return;

  const globalCards = snapshot.val();

  const gameCards = {};

  Object.entries(globalCards).forEach(([id, card]) => {
    gameCards[id] = {
      ...card,
      owners: [],
      status: "available"
    };
  });

  await set(ref(db, `games/${gameId}/cards`), gameCards);
};