import { useEffect, useState } from "react";
import { db } from "../firebase";
import PropertyCard from "./PropertyCard";
import DealPanel from "./DealPanel";
import { voteDeal } from "../services/dealService";
import toast from "react-hot-toast";
import SellPanel from "./SellPanel";

import {
  ref,
  onValue
} from "firebase/database";

import {
  createDeal, createSellDeal
} from "../services/dealService";

export default function CardsSection({ player, players }) {
  const [cards, setCards] = useState({});
  const [cardStates, setCardStates] = useState({});
  const [deals, setDeals] = useState({});
  const [selectedIndustry, setSelectedIndustry] = useState("All");
  const [selectedCard, setSelectedCard] = useState("");
  const [partners, setPartners] = useState([]);
  const [bidAmount, setBidAmount] = useState("");
  const [mode, setMode] = useState("buy"); // "buy" | "sell"
  const industries = [
  "All",
  ...new Set(Object.values(cards).map(c => c.industry || "General"))
];

  // 🔄 GLOBAL CARDS
  useEffect(() => {
    return onValue(ref(db, "cards"), snap => {
      setCards(snap.val() || {});
    });
  }, []);

  // 🔄 GAME CARD STATES
  useEffect(() => {
    return onValue(
      ref(db, `games/${player.gameId}/cardStates`),
      snap => setCardStates(snap.val() || {})
    );
  }, [player.gameId]);

  // 🔄 DEALS
  useEffect(() => {
    return onValue(
      ref(db, `games/${player.gameId}/cardDeals`),
      snap => setDeals(snap.val() || {})
    );
  }, [player.gameId]);

  // 🧠 FILTERS
  const myCards = Object.entries(cards).filter(([id]) => {
  const owners = cardStates?.[id]?.owners || [];

  return owners.some(o => String(o.playerId) === String(player.playerId));
});

  const availableCards = Object.entries(cards).filter(
    ([id]) => !cardStates[id]?.owners?.length
  );

  const pendingDeals = Object.entries(deals).filter(
  ([_, d]) => d.status === "pending"
);



  // 🤝 CREATE DEAL HANDLER
  const handleCreateDeal = async () => {
  if (!selectedCard) {
    toast.error("Select a property");
    return;
  }

 // if (partners.length === 0) {
   // toast.error("Add at least one partner");
    //return;
  //}

  if (totalPercent > 100) {
  toast.error("Total exceeds 100%");
  return;
}

  if (!bidAmount || Number(bidAmount) <= 0) {
    toast.error("Enter valid amount");
    return;
  }

  try {
    await createDeal({
      player,
      players,
      cards,
      cardStates,
      selectedCard,
      partners,
      bidAmount,
      reset: () => {
        setSelectedCard("");
        setPartners([]);
        setBidAmount("");
      }
    });

    toast.success("Deal created ");
  } catch (err) {
    console.error(err);
    toast.error("Failed to create deal");
  }
};


  // 🎯 %
  const finalPartners = [
  ...partners,
  {
    playerId: player.playerId,
    percent: 100 - partners.reduce(
      (sum, p) => sum + Number(p.percent || 0),
      0
    )
  }
];

const totalPercent = finalPartners.reduce((sum, p) => {
  const value = parseFloat(p.percent);
  return sum + (isNaN(value) ? 0 : value);
}, 0);
//console.log("partners:", finalPartners);
//console.log("total:", totalPercent);



  const filteredMyCards = Object.entries(cards).filter(
  ([id, card]) =>
    cardStates[id]?.owners?.some(
      o => o.playerId === player.playerId
    ) &&
    (selectedIndustry === "All" ||
      card.industry === selectedIndustry)
);
const filteredAvailableCards = Object.entries(cards).filter(
  ([id, card]) =>
    !cardStates[id]?.owners?.length &&
    (selectedIndustry === "All" ||
      card.industry === selectedIndustry)
);
  return (
    <>
    {/* 🎯 FILTER */}
<div className="flex gap-2 overflow-x-auto pb-2 mb-3 no-scrollbar mt-5">
  {industries.map((ind) => {
    const count =
      ind === "All"
        ? Object.keys(cards).length
        : Object.values(cards).filter(
            c => (c.industry || "General") === ind
          ).length;

    const isActive = selectedIndustry === ind;

    return (
      <button
        key={ind}
        onClick={() => setSelectedIndustry(ind)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-all whitespace-nowrap
        ${
          isActive
            ? "bg-white text-black shadow-md scale-105"
            : "bg-gray-800 text-gray-300 hover:bg-gray-700"
        }`}
      >
        <span>{ind}</span>

        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-full
          ${
            isActive
              ? "bg-black/20 text-black"
              : "bg-white/10 text-gray-300"
          }`}
        >
          {count}
        </span>
      </button>
    );
  })}
</div>
      {/* 🃏 MY CARDS */}
      <h3 className="mt-6 mb-2 font-semibold">🃏 My Properties</h3>
      

      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
        {filteredMyCards.length === 0 && (
  <p className="text-gray-400 text-sm">No cards owned</p>
)}

        {filteredMyCards.map(([id, card]) => (
          <PropertyCard
  key={id}
  card={card}
  state={cardStates[id]}
  players={players}
  player={player}
  cardId={id}
  onSell={() => {
    setMode("sell");
    setSelectedCard(id);
  }}
/>
        ))}
      </div>



          {/* 🎛️ MODE SWITCH */}
<div className="relative flex p-1 mb-5 mt-4 bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">

  {/* ACTIVE BG */}
  <div
    className={`absolute top-1 bottom-1 w-1/2 rounded-xl transition-all duration-300
    ${
      mode === "buy"
        ? "left-1 bg-blue-600"
        : "left-[calc(50%-4px)] bg-yellow-500"
    }`}
  />

  {/* BUY */}
  <button
    onClick={() => setMode("buy")}
    className={`relative z-10 flex-1 py-2.5 text-sm font-medium transition
    ${
      mode === "buy"
        ? "text-white"
        : "text-gray-400 hover:text-gray-200"
    }`}
  >
    🤝 Buy / Deal
  </button>

  {/* SELL */}
  <button
    onClick={() => setMode("sell")}
    className={`relative z-10 flex-1 py-2.5 text-sm font-medium transition
    ${
      mode === "sell"
        ? "text-black"
        : "text-gray-400 hover:text-gray-200"
    }`}
  >
    💰 Sell
  </button>
</div>

{/* 📦 PANEL */}
<div
  className={`mb-6 transition-all duration-300 ${
    mode === "buy"
      ? "animate-in fade-in slide-in-from-left-2"
      : "animate-in fade-in slide-in-from-right-2"
  }`}
>
  {mode === "buy" ? (
    <DealPanel
      players={players}
      player={player}
      selectedCard={selectedCard}
      setSelectedCard={setSelectedCard}
      availableCards={availableCards}
      partners={partners}
      setPartners={setPartners}
      bidAmount={bidAmount}
      setBidAmount={setBidAmount}
      createDeal={handleCreateDeal}
    />
  ) : (
    <SellPanel
      player={player}
      players={players}
      myCards={myCards}
      cardStates={cardStates}
      selectedCard={selectedCard}
      setSelectedCard={setSelectedCard}
      createSellDeal={createSellDeal}
    />
  )}
</div>



{/* 📩 PENDING DEALS */}
<h3 className="mt-6 mb-2 font-semibold">📩 Pending Deals</h3>

{pendingDeals.length === 0 && (
  <p className="text-gray-400 text-sm">No pending deals</p>
)}

{pendingDeals.map(([id, d]) => {
  const isPartner = d.members?.some(
  m => m.playerId === player.playerId
);


  const hasVoted =
  d.approvals?.[
    String(player.playerId)
  ] !== undefined;


  return (
    <div
      key={id}
      className="bg-gray-800/70 backdrop-blur p-4 mb-3 rounded-2xl border border-gray-700 shadow-md"
    >
      {/* HEADER */}
      <div className="flex justify-between items-center mb-2">
        <p className="text-sm font-semibold text-white">
          {players[d.createdBy]?.name}
        </p>

        <span className={`text-[10px] px-2 py-1 rounded-full
          ${
            d.status === "pending"
              ? "bg-yellow-500/20 text-yellow-400"
              : d.status === "processing"
              ? "bg-blue-500/20 text-blue-400"
              : d.status === "completed"
              ? "bg-green-500/20 text-green-400"
              : "bg-red-500/20 text-red-400"
          }`}
        >
          {d.status}
        </span>
      </div>

      {/* PROPERTY */}
      <p className="text-sm text-gray-300">
        {d.cardName}
      </p>

      {/* PRICE */}
      <p className="text-xs text-gray-400 mb-2">
        Price: ₹{d.price}
      </p>

      {/* MEMBERS */}
      <div className="flex flex-wrap gap-1 mb-3">
        {(d.members|| []).map((m) => (
          <span
            key={m.playerId}
            className="text-[10px] px-2 py-1 rounded-full bg-white/10"
          >
            {players[m.playerId]?.name}

{/* 🤝 BUY DEAL */}
{d.type !== "sell" && (
  <> • {m.percent}%</>
)}

{/* 💰 SELL DEAL */}
{d.type === "sell" &&
  String(m.playerId) === String(d.sellerId) && (
    <> • Selling {d.percent}%</>
)}

{d.type === "sell" &&
  String(m.playerId) === String(d.buyerId) && (
    <> • Buying {d.percent}%</>
)}
          </span>
        ))}
      </div>




{/* ❌ REJECT REASON */}
{d.rejectReason && (
  <div className="mb-3 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20">

    <p className="text-xs text-red-300">
      ❌ {d.rejectReason}
    </p>

  </div>
)}



      {/* ACTIONS */}
    
{d.status === "pending" &&
(
  d.type !== "sell" ||
  d.members?.some(
    m => String(m.playerId) === String(player.playerId)
  )
) && (
  <>
    {hasVoted ? (
      <div className="text-xs text-center py-2 rounded-lg bg-white/5 text-gray-400">
        You already voted
      </div>
    ) : (
      <div className="flex gap-2">
        <button
          onClick={async () => {
  try {
    await voteDeal({
      dealId: id,
      decision: true,
      playerId: player.playerId,
      gameId: player.gameId,
      players,
      deals
    });

    toast.success("Approved ");
  } catch (err) {
    toast.error("Vote failed");
  }
}}
          className="flex-1 bg-green-500/80 hover:bg-green-500 text-xs py-1.5 rounded-lg transition active:scale-95"
        >
          Approve
        </button>

        <button
          onClick={async () => {
  try {
    await voteDeal({
      dealId: id,
      decision: false,
      playerId: player.playerId,
      gameId: player.gameId,
      players,
      deals
    });

    toast.error("Rejected ");
  } catch (err) {
    toast.error("Vote failed");
  }
}}
          className="flex-1 bg-red-500/80 hover:bg-red-500 text-xs py-1.5 rounded-lg transition active:scale-95"
        >
          Reject
        </button>
      </div>
    )}
  </>
)}
    </div>
  );
})}






      {/* 🌍 AVAILABLE */}
      <h3 className="mt-6 mb-2">🌍 Available</h3>
      

      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
  {filteredAvailableCards.length === 0 && (
    <p className="text-gray-400 text-sm">No available cards</p>
  )}

  {filteredAvailableCards.map(([id, card]) => (
    <PropertyCard
      key={id}
      card={card}
      state={cardStates[id]}
      players={players}
      showBuy
      cardId={id}
      player={player}
    />
  ))}
</div>
    </>
  );
}
