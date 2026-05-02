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

  try {

    return await executeSellDeal({
      dealId,
      gameId
    });

  } catch (err) {

    console.error(err);

    await update(dealRef, {
      status: "rejected",
      rejectReason:
        err.message ||
        "Deal execution failed"
    });

    return;
  }
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
        percent: yourPercent,
        mortgaged: false
      },
      ...partners.map(p => ({
        playerId: p.playerId,
        percent: Number(p.percent || 0),
        mortgaged: false
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

  if (!buyerId) {
    throw new Error("Select buyer");
  }

  if (!percent || percent <= 0) {
    throw new Error("Invalid percentage");
  }

  if (!price || price <= 0) {
    throw new Error("Invalid price");
  }

  // 👥 card state
  const cardRef = ref(
    db,
    `games/${gameId}/cardStates/${card.id}`
  );

  const cardSnap = await get(cardRef);

  const cardState = cardSnap.val();

  const owners = cardState?.owners || [];

  // 🧠 seller ownership
  const seller = owners.find(
    o =>
      String(o.playerId) ===
      String(player.playerId)
  );

  // ❌ not owner
  if (!seller) {
    throw new Error(
      "You are not owner"
    );
  }

  // ❌ mortgaged property
  if (seller.mortgaged) {
    throw new Error(
      "Unmortgage property first"
    );
  }

  // ❌ selling more than owned
  if (
    Number(percent) >
    Number(seller.percent)
  ) {
    throw new Error(
      "You don't own that much share"
    );
  }

  // 👥 deal members
  const members = [
    {
      playerId: player.playerId
    },
    {
      playerId: buyerId
    }
  ];

  // 🚀 create deal
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

  if (!deal || deal.status !== "pending") {
    return;
  }

  const {
    sellerId,
    buyerId,
    percent,
    price,
    cardId
  } = deal;

  /* =========================
     🧠 CARD STATE
  ========================= */

  const cardRef = ref(
    db,
    `games/${gameId}/cardStates/${cardId}`
  );

  const cardSnap = await get(cardRef);

  const cardState = cardSnap.val();

  const owners = cardState?.owners || [];

  /* =========================
     👤 SELLER
  ========================= */

  const seller = owners.find(
    o =>
      String(o.playerId) ===
      String(sellerId)
  );

  // ❌ seller not found
  if (!seller) {

    await update(dealRef, {
      status: "rejected",
      rejectReason:
        "Seller is not owner"
    });

    throw new Error(
      "Seller is not owner"
    );
  }

  // ❌ mortgaged share
  if (seller?.mortgaged === true) {

    await update(dealRef, {
      status: "rejected",
      rejectReason:
        "Unmortgage property first"
    });

    throw new Error(
      "Unmortgage property first"
    );
  }

  // ❌ invalid share
  if (
    Number(percent) >
    Number(seller.percent)
  ) {

    await update(dealRef, {
      status: "rejected",
      rejectReason:
        `Seller only owns ${seller.percent}%`
    });

    throw new Error(
      `Seller only owns ${seller.percent}%`
    );
  }
  /* =========================
   ❌ BUYER HAS MORTGAGED SHARE
========================= */

const buyerOwner = owners.find(
  o =>
    String(o.playerId) ===
    String(buyerId)
);

if (buyerOwner?.mortgaged === true) {

  await update(dealRef, {
    status: "rejected",
    rejectReason:
      "Buyer must unmortgage existing share first"
  });

  throw new Error(
    "Buyer must unmortgage existing share first"
  );
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
    if (
      !buyer ||
      Number(buyer.balance) < Number(price)
    ) {

      await update(dealRef, {
        status: "rejected",
        rejectReason:
          "Buyer doesn't have enough balance"
      });

      throw new Error(
        "Buyer doesn't have enough balance"
      );
    }

    // 💸 deduct buyer money
    await update(buyerRef, {
      balance:
        Number(buyer.balance) -
        Number(price)
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
      Number(sellerData?.balance || 0) +
      Number(price)
  });

  /* =========================
     🧠 UPDATE OWNERSHIP
  ========================= */

  let newOwners = owners
    .map(o => {

      if (
        String(o.playerId) ===
        String(sellerId)
      ) {

        return {
          ...o,
          percent:
            Number(o.percent) -
            Number(percent)
        };
      }

      return o;
    })
    .filter(o => Number(o.percent) > 0);

  /* =========================
     ➕ ADD BUYER SHARE
  ========================= */

  if (buyerId !== "bank") {

    const existingBuyer = newOwners.find(
      o =>
        String(o.playerId) ===
        String(buyerId)
    );

    if (existingBuyer) {

      existingBuyer.percent =
        Number(existingBuyer.percent) +
        Number(percent);

    } else {

      newOwners.push({
        playerId: buyerId,
        percent: Number(percent),
        mortgaged: false
      });
    }
  }

  /* =========================
     💾 SAVE OWNERS
  ========================= */

  await update(cardRef, {
    owners: newOwners
  });

  /* =========================
     📝 TRANSACTION
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





export const mortgageShare = async ({
  gameId,
  cardId,
  playerId,
  cards
}) => {

  const cardRef = ref(
    db,
    `games/${gameId}/cardStates/${cardId}`
  );

  const cardSnap = await get(cardRef);

  const cardState = cardSnap.val();

  if (!cardState) return;

  const owners = cardState.owners || [];

  const owner = owners.find(
    o => String(o.playerId) === String(playerId)
  );

  if (!owner || owner.mortgaged) return;

  const card = cards[cardId];

  const mortgageAmount =
    (Number(card.mortgageValue || 0) *
      Number(owner.percent || 0)) / 100;

  // 💰 player balance
  const playerRef = ref(
    db,
    `games/${gameId}/players/${playerId}`
  );

  const playerSnap = await get(playerRef);

  const playerData = playerSnap.val();

  await update(playerRef, {
    balance:
      (playerData.balance || 0) +
      mortgageAmount
  });

  // 🧠 update mortgage state
  const updatedOwners = owners.map(o =>
    String(o.playerId) === String(playerId)
      ? {
          ...o,
          mortgaged: true
        }
      : o
  );

  await update(cardRef, {
    owners: updatedOwners
  });

  // 📝 activity
  await push(
    ref(db, `games/${gameId}/transactions`),
    {
      type: "mortgage",
      player:
        playerData?.name || playerId,
      cardName: card.name,
      amount: mortgageAmount,
      percent: owner.percent,
      time: Date.now()
    }
  );
};



export const unmortgageShare = async ({
  gameId,
  cardId,
  playerId,
  cards
}) => {

  const cardRef = ref(
    db,
    `games/${gameId}/cardStates/${cardId}`
  );

  const cardSnap = await get(cardRef);

  const cardState = cardSnap.val();

  if (!cardState) return;

  const owners = cardState.owners || [];

  const owner = owners.find(
    o => String(o.playerId) === String(playerId)
  );

  if (!owner || !owner.mortgaged) return;

  const card = cards[cardId];

  const unmortgageAmount =
    (Number(card.mortgageValue || 0) *
      Number(owner.percent || 0)) / 100;

  const playerRef = ref(
    db,
    `games/${gameId}/players/${playerId}`
  );

  const playerSnap = await get(playerRef);

  const playerData = playerSnap.val();

  // ❌ insufficient balance
  if (
    (playerData.balance || 0) <
    unmortgageAmount
  ) {
    throw new Error(
      "Not enough balance"
    );
  }

  // 💰 deduct money
  await update(playerRef, {
    balance:
      playerData.balance -
      unmortgageAmount
  });

  // 🧠 remove mortgage
  const updatedOwners = owners.map(o =>
    String(o.playerId) === String(playerId)
      ? {
          ...o,
          mortgaged: false
        }
      : o
  );

  await update(cardRef, {
    owners: updatedOwners
  });

  // 📝 activity
  await push(
    ref(db, `games/${gameId}/transactions`),
    {
      type: "unmortgage",
      player:
        playerData?.name || playerId,
      cardName: card.name,
      amount: unmortgageAmount,
      percent: owner.percent,
      time: Date.now()
    }
  );
};