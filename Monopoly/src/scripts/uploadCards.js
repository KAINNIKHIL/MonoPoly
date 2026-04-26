import { db } from "../firebase";
import { ref, set } from "firebase/database";
import { allCards } from "../data/cards/allCards";

const uploadCards = async () => {
  try {
    const cardsObj = {};

    allCards.forEach(card => {
      cardsObj[card.id] = card;
    });

    await set(ref(db, "cards"), cardsObj);

    console.log("✅ All cards uploaded successfully");
  } catch (err) {
    console.error("❌ Upload failed", err);
  }
};

uploadCards();