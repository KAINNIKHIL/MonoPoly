import { ref, update, get, push } from "firebase/database";
import { db } from "../firebase";

/* =========================
   🗳️ VOTE (ALL PLAYERS)
========================= */
export const voteDeal = async ({
  dealId,
  decision,
  playerId,
  gameId,
  players,
  deals
}) => {
  const deal = deals[dealId];
  if (!deal) return;

  const dealRef = ref(db, `games/${gameId}/cardDeals/${dealId}`);

  if (deal.approvals?.[playerId] !== undefined) return;

  const approvals = {
    ...deal.approvals,
    [playerId]: decision
  };

  await update(dealRef, { approvals });

  const totalPlayers = Object.keys(players).length;

  const approveCount = Object.values(approvals).filter(v => v).length;
  const rejectCount = Object.values(approvals).filter(v => !v).length;

  if (rejectCount > 0) {
    await update(dealRef, { status: "rejected" });
    return;
  }

  if (approveCount === totalPlayers) {
    await executeDeal({ dealId, gameId });
  }
};

/* =========================
   🚀 EXECUTE DEAL
========================= */
export const executeDeal = async ({ dealId, gameId }) => {
  const dealRef = ref(db, `games/${gameId}/cardDeals/${dealId}`);
  const snap = await get(dealRef);
  const deal = snap.val();

  if (!deal || deal.status !== "pending") return;

  const price = Number(deal.price);

  await update(dealRef, { status: "processing" });

  try {
    for (const m of deal.members) {
      const pRef = ref(db, `games/${gameId}/players/${m.playerId}`);
      const pSnap = await get(pRef);
      const user = pSnap.val();

      const share = (price * m.percent) / 100;

      if (!user || user.balance < share) {
        await update(dealRef, { status: "pending" });
        return;
      }

      await update(pRef, {
        balance: user.balance - share
      });
    }

    await update(
      ref(db, `games/${gameId}/cardStates/${deal.cardId}`),
      {
        owners: deal.members,
        level: 1,
        mortgaged: false
      }
    );

    await push(ref(db, `games/${gameId}/transactions`), {
      type: "dealPurchase",
      buyers: deal.members,
      amount: price,
      cardName: deal.cardName,
      time: Date.now()
    });

    await update(dealRef, { status: "completed" });

  } catch (err) {
    console.error(err);
    await update(dealRef, { status: "pending" });
  }
};

/* =========================
   🤝 CREATE DEAL (FINAL)
========================= */
export const createDeal = async ({
  player,
  players,
  cards,
  cardStates,
  selectedCard,
  partners,
  bidAmount,
  reset
}) => {
  try {
    // 🧠 BASIC
    if (!selectedCard) throw new Error("Select a property");

    const card = cards[selectedCard];
    if (!card) throw new Error("Invalid property");

    if (cardStates[selectedCard]?.owners?.length) {
      throw new Error("Property already owned");
    }

    const price = Number(bidAmount);
    const minPrice = card.minBid || card.price;

    if (!price || price <= 0) {
      throw new Error("Enter valid amount");
    }

    if (price < minPrice) {
      throw new Error(`Minimum price is ₹${minPrice}`);
    }

    // 👥 PARTNER %
    const partnerPercent = partners.reduce(
      (sum, p) => sum + Number(p.percent || 0),
      0
    );

    if (partnerPercent > 100) {
      throw new Error("Partners exceed 100%");
    }

    const yourPercent = 100 - partnerPercent;

    if (yourPercent <= 0) {
      throw new Error("Invalid share split");
    }

    // 👥 MEMBERS
    const members = [
      {
        playerId: player.playerId,
        percent: yourPercent
      },
      ...partners.map(p => ({
        playerId: p.playerId,
        percent: Number(p.percent || 0)
      }))
    ];

    // 💰 BALANCE CHECK (ALL MEMBERS)
    for (const m of members) {
      const userBalance =
        players[m.playerId]?.balance || 0;

      const share = (price * m.percent) / 100;

      if (userBalance < share) {
        throw new Error(
          `${players[m.playerId]?.name} doesn't have enough balance`
        );
      }
    }

    // 🚀 CREATE DEAL
    await push(
      ref(db, `games/${player.gameId}/cardDeals`),
      {
        cardId: selectedCard,
        cardName: card.name,
        price,
        createdBy: player.playerId,
        members,
        approvals: {},
        status: "pending",
        createdAt: Date.now()
      }
    );

    if (reset) reset();

    return true;

  } catch (err) {
    console.error("CreateDeal Error:", err);
    throw err;
  }
};