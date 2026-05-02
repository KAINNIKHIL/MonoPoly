import {
  mortgageShare,
  unmortgageShare
} from "../services/dealService";


export default function PropertyCard({
  card,
  state,
  players,
  showBuy,
  cardId,
  player
}) {

  // 🎨 THEMES
  const industryTheme = {
    realestate: {
      bg: "from-blue-900/80 via-blue-800/70 to-blue-900/90",
      tag: "bg-blue-500/80",
      border: "border-blue-400/40"
    },
    manufacturing: {
      bg: "from-yellow-800/80 via-yellow-700/70 to-yellow-900/90",
      tag: "bg-yellow-500/80",
      border: "border-yellow-400/40"
    },
    retail: {
      bg: "from-green-900/80 via-green-800/70 to-green-900/90",
      tag: "bg-green-500/80",
      border: "border-green-400/40"
    },
    tech: {
      bg: "from-red-900/80 via-red-800/70 to-red-900/90",
      tag: "bg-red-500/80",
      border: "border-red-400/40"
    },
    media: {
      bg: "from-purple-900/80 via-purple-800/70 to-purple-900/90",
      tag: "bg-purple-500/80",
      border: "border-purple-400/40"
    },
    general: {
      bg: "from-gray-800/80 via-gray-700/70 to-gray-900/90",
      tag: "bg-gray-500/80",
      border: "border-gray-400/30"
    }
  };

  // 🔄 NORMALIZE
  const normalizeIndustry = (industry) => {
    if (!industry) return "general";

    return industry
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace("_", "");
  };

  const key = normalizeIndustry(card.industry);
  const theme = industryTheme[key] || industryTheme.general;

  // 👥 OWNERS
  const owners = state?.owners || [];
  const myOwnership = owners.find(
  o => o.playerId === player?.playerId
);

  const isMine = owners.some(
    (o) => o.playerId === player?.playerId
  );

  const ownerNames = owners
  .map((o) => {
    const name =
      players[o.playerId]?.name || "Unknown";

    return `${name} (${o.percent}%)`;
  })
  .join(", ");

  const level = state?.level ?? card.level ?? 1;


  const RentDisplay = ({ rent = {}, level }) => {
  return (
    <div className="col-span-2">
      <div className="text-[11px] text-white/70 mb-1">
        Rent
      </div>

      <div className="flex flex-wrap gap-1">
        {Object.entries(rent).map(([lvl, val]) => {
          const isActive = Number(lvl) === Number(level);

          return (
            <span
              key={lvl}
              className={`px-2 py-0.5 rounded text-[10px] border
              ${isActive
                ? "bg-white/30 border-white text-white"
                : "bg-white/10 border-white/20 text-white/70"
              }`}
            >
              L{lvl}: ₹{val}
            </span>
          );
        })}
      </div>
    </div>
  );
};

const MultiplierDisplay = ({ multiplier = {}, level }) => {
  if (!multiplier || Object.keys(multiplier).length === 0) return null;

  return (
    <div className="col-span-2">
      <div className="text-[11px] text-white/70 mb-1">
        Multiplier
      </div>

      <div className="flex flex-wrap gap-1">
        {Object.entries(multiplier).map(([lvl, val]) => {
          const isActive = Number(lvl) === Number(level);

          return (
            <span
              key={lvl}
              className={`px-2 py-0.5 rounded text-[10px] border transition
              ${isActive
                ? "bg-white/30 border-white text-white scale-105 shadow"
                : "bg-white/10 border-white/20 text-white/70"
              }`}
            >
              L{lvl}: x{val}
            </span>
          );
        })}
      </div>
    </div>
  );
};


  // 📊 INDUSTRY BASED STATS
  const renderStats = () => {
    switch (key) {

      // 🏭 MANUFACTURING
      case "manufacturing":
        return (
          <>
            <div>Base Price: ₹{card.minimumBid}</div>
            <div>Level: {level}</div>
            <div>Fixed Income: ₹{card.fixedIncome}</div>
            <RentDisplay rent={card.rent} level={level} />
            <div>Mortgage Value: ₹{card.mortgageValue}</div>
          </>
        );

      // 🏬 RETAIL
      case "retail":
        return (
          <>
            <div>Base Price: ₹{card.minimumBid}</div>
            <div>Franchise Price: ₹{card.franchisePrice}</div>
            <div>No. of Franchises: {state?.franchises ?? 0}</div>
            <RentDisplay rent={card.rent} level={level} />
              Franchise Rent: ₹
              {card.franchiseRent ?? "-"}
            
            <div>Mortgage Value: ₹{card.mortgageValue}</div>
          </>
        );

      // 🎬 MEDIA
      case "media":
        return (
          <>
            <div>Base Price: ₹{card.minimumBid}</div>
            <div>Level: {level}</div>
            <MultiplierDisplay multiplier={card.multiplier} />
            <div>Mortgage Value: ₹{card.mortgageValue}</div>
          </>
        );

      // 🏠 REAL ESTATE / TECH / DEFAULT
      default:
        return (
          <>
            <div>Base Price: ₹{card.minimumBid}</div>
            <div>Level: {level}</div>
            <RentDisplay rent={card.rent} level={level} />
            {card.fixedIncome !== undefined && (
              <div>Fixed Income: ₹{card.fixedIncome}</div>
            )}
            <div>Mortgage Value: ₹{card.mortgageValue}</div>
          </>
        );
    }
  };

  return (
    <div
      className={`relative bg-gradient-to-br ${theme.bg}
      rounded-2xl p-4 m-2
      shadow-lg border ${theme.border}
      hover:scale-[1.03] hover:-translate-y-1 hover:shadow-2xl
      transition duration-200
      ${isMine ? "ring-2 ring-white/70" : ""}`}
    >

      {/* HEADER */}
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-base text-white">
          {card.name}
        </h3>

        <span className={`text-[10px] px-2 py-0.5 rounded ${theme.tag}`}>
          {card.industry || "General"}
        </span>
      </div>

      {/* STATS */}
      <div className="mt-3 grid grid-cols-2 gap-2 text-[12px] text-white/90">
        {renderStats()}
      </div>

      {/* OWNERS */}
     {/* OWNERS */}
<div className="mt-3">
  <div className="text-[11px] text-white/60 mb-1">
    Owners
  </div>

  <div className="flex flex-col gap-1">
    {owners.length > 0 ? (
      owners.map((o) => (
        <div
          key={o.playerId}
          className="flex items-center justify-between
          text-[11px] bg-white/5 rounded px-2 py-1"
        >
          <div className="flex items-center gap-2">
            <span className="text-white/90">
              {players[o.playerId]?.name || "Unknown"}
            </span>

            <span className="text-white/50">
              ({o.percent}%)
            </span>
          </div>

          {o.mortgaged && (
            <span className="text-red-300 text-[10px]">
              Mortgaged
            </span>
          )}
        </div>
      ))
    ) : (
      <div className="text-[11px] text-white/50">
        Unowned
      </div>
    )}
  </div>
</div>

      {/* MORTGAGE */}
      {state?.mortgaged && (
        <div className="mt-2 text-[11px] text-red-300">
          Mortgaged
        </div>
      )}

      {/* BUY */}
      {/* 🏦 MORTGAGE ACTIONS */}
{myOwnership && (
  <div className="mt-3 flex gap-2">

    {!myOwnership.mortgaged ? (
      <button
        onClick={() =>
          mortgageShare({
            gameId: player.gameId,
            cardId,
            playerId: player.playerId,
            cards: {
              [cardId]: card
            }
          })
        }
        className="flex-1 bg-yellow-500/20
        hover:bg-yellow-500/30
        border border-yellow-400/30
        text-yellow-200 text-[11px]
        py-2 rounded-lg transition"
      >
        Mortgage Share
      </button>
    ) : (
      <button
        onClick={() =>
          unmortgageShare({
            gameId: player.gameId,
            cardId,
            playerId: player.playerId,
            cards: {
              [cardId]: card
            }
          })
        }
        className="flex-1 bg-green-500/20
        hover:bg-green-500/30
        border border-green-400/30
        text-green-200 text-[11px]
        py-2 rounded-lg transition"
      >
        Unmortgage Share
      </button>
    )}

  </div>
)}
    </div>
  );
}