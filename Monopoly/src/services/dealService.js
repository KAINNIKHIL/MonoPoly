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

  // ❌ already voted
  if (deal.approvals?.[playerId] !== undefined) return;

  // 🔵 SELL DEAL (buyer-only approval)
  if (deal.type === "sell") {

  // ❌ only members can vote
  const isMember = deal.members?.some(
    m => m.playerId === playerId
  );

  if (!isMember) return;

  const approvals = {
    ...deal.approvals,
    [playerId]: decision
  };

  await update(dealRef, { approvals });

  // ❌ even one reject = full reject
  const rejected = Object.values(approvals)
    .includes(false);

  if (rejected) {
    await update(dealRef, {
      status: "rejected"
    });

    return;
  }

  // ✅ all approved
  const allApproved = deal.members.every(
    m => approvals[m.playerId] === true
  );

  if (allApproved) {
    return executeSellDeal({
      dealId,
      gameId
    });
  }

  return;
}

  // 🟢 BUY DEAL (your old logic)
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




export const createSellDeal = async ({
  player,
  card,
  percent,
  price,
  buyerId,
  gameId
}) => {
  if (!buyerId) throw new Error("Select buyer");

  if (!percent || percent <= 0) {
    throw new Error("Invalid percentage");
  }

  if (!price || price <= 0) {
    throw new Error("Invalid price");
  }

  // 👥 get all current owners
  const cardRef = ref(
    db,
    `games/${gameId}/cardStates/${card.id}`
  );

  const cardSnap = await get(cardRef);

  const cardState = cardSnap.val();

  const members = [
  {
    playerId: player.playerId
  },
  {
    playerId: buyerId
  }
];

await push(
  ref(db, `games/${gameId}/cardDeals`),
  {
    type: "sell",

    cardId: card.id,
    cardName: card.name,

    sellerId: player.playerId,
    buyerId,

    percent,
    price,

    members,

    approvals: {
  [player.playerId]: true
},
    status: "pending",
    createdAt: Date.now()
  }
);
};



export const executeSellDeal = async ({
  dealId,
  gameId
}) => {
  const dealRef = ref(
    db,
    `games/${gameId}/cardDeals/${dealId}`
  );

  const snap = await get(dealRef);
  const deal = snap.val();

  if (!deal || deal.status !== "pending") return;

  const {
    sellerId,
    buyerId,
    percent,
    price,
    cardId
  } = deal;

  const cardRef = ref(
    db,
    `games/${gameId}/cardStates/${cardId}`
  );

  const cardSnap = await get(cardRef);
  const cardState = cardSnap.val();

  let owners = cardState?.owners || [];

  const seller = owners.find(
    o => o.playerId === sellerId
  );

  // ❌ seller invalid
  if (!seller || seller.percent < percent) {
    await update(dealRef, {
      status: "rejected"
    });

    return;
  }

  /* =========================
     💰 BUYER PAYMENT
  ========================= */

  if (buyerId !== "bank") {
    const buyerRef = ref(
      db,
      `games/${gameId}/players/${buyerId}`
    );

    const buyerSnap = await get(buyerRef);
    const buyer = buyerSnap.val();

    // ❌ insufficient balance
    if (!buyer || buyer.balance < price) {
      await update(dealRef, {
        status: "rejected"
      });

      return;
    }

    // deduct buyer money
    await update(buyerRef, {
      balance: buyer.balance - price
    });
  }

  /* =========================
     💵 GIVE SELLER MONEY
  ========================= */

  const sellerRef = ref(
    db,
    `games/${gameId}/players/${sellerId}`
  );

  const sellerSnap = await get(sellerRef);
  const sellerData = sellerSnap.val();

  await update(sellerRef, {
    balance:
      (sellerData?.balance || 0) + Number(price)
  });

  /* =========================
     🧠 UPDATE OWNERSHIP
  ========================= */

  let newOwners = owners
    .map(o =>
      o.playerId === sellerId
        ? {
            ...o,
            percent:
              o.percent - Number(percent)
          }
        : o
    )
    .filter(o => o.percent > 0);

  // add buyer ownership
  if (buyerId !== "bank") {
    const existing = newOwners.find(
      o => o.playerId === buyerId
    );

    if (existing) {
      existing.percent += Number(percent);
    } else {
      newOwners.push({
        playerId: buyerId,
        percent: Number(percent)
      });
    }
  }

  await update(cardRef, {
    owners: newOwners
  });

  /* =========================
     📝 ACTIVITY LOG
  ========================= */

  await push(
    ref(db, `games/${gameId}/transactions`),
    {
      type: "sellDeal",

      seller:
        sellerData?.name || sellerId,

      buyer:
        buyerId === "bank"
          ? "Bank"
          : buyerId,

      percent,
      amount: price,

      cardName: deal.cardName,

      time: Date.now()
    }
  );

  /* =========================
     ✅ COMPLETE
  ========================= */

  await update(dealRef, {
    status: "completed"
  });
};