export default function DealPanel({
  players = {},
  player,
  selectedCard,
  setSelectedCard,
  availableCards = [],
  partners = [],
  setPartners,
  bidAmount,
  setBidAmount,
  createDeal
}) {
  const totalPercent = partners.reduce(
    (sum, p) => sum + Number(p.percent || 0),
    0
  );
  const myBalance = players[player.playerId]?.balance || 0;

const partnerPercent = partners.reduce(
  (sum, p) => sum + Number(p.percent || 0),
  0
);

const selectedCardData = availableCards.find(
  ([id]) => id === selectedCard
)?.[1];

const minPrice =
  selectedCardData?.minimumBid || selectedCardData?.price || 0;
  
const yourPercent = Math.max(0, 100 - partnerPercent);

const yourCost =
  (Number(bidAmount || 0) * yourPercent) / 100;

const notEnough = myBalance < yourCost;

  const isValid =
  selectedCard &&
  bidAmount > 0 &&
  totalPercent <= 100 &&
  Number(bidAmount) >= minPrice &&
  !notEnough;

  // 🔥 Update partner %
  const handlePercentChange = (id, val) => {
    const percent = Number(val);

    setPartners(prev => {
      const filtered = prev.filter(p => p.playerId !== id);

      if (percent <= 0) return filtered;

      return [...filtered, { playerId: id, percent }];
    });
  };

  return (
    <div className="bg-gray-800 p-4 rounded-xl shadow-md mt-6">

      {/* HEADER */}
      <h3 className="text-lg font-semibold mb-3 text-purple-400">
        {partners.length === 0 ? "Quick Buy" : "Team Deal"}
      </h3>

      {/* SELECT CARD */}
      <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
  {availableCards.map(([id, card]) => {
    const isSelected = selectedCard === id;

    return (
      <div
        key={id}
        onClick={() => setSelectedCard(id)}
        className={`p-2 rounded-lg border cursor-pointer transition
        ${
          isSelected
            ? "bg-blue-600 border-blue-400 scale-95"
            : "bg-gray-800 border-gray-700 hover:bg-gray-700"
        }`}
      >
        <p className="text-sm font-medium">{card.name}</p>
        <p className="text-[10px] text-gray-400">
          ₹{card.minimumBid || 0}
        </p>
      </div>
    );
  })}
</div>

      {/* PARTNER INFO */}
      <p className="text-sm text-gray-400 mb-2">
        {partners.length === 0
          ? "Buying solo (100% ownership)"
          : "Split ownership with partners"}
      </p>

      {/* PARTNERS LIST */}
      <div className="mb-3 space-y-2 max-h-40 overflow-y-auto pr-1">
        {Object.entries(players).map(([id, p]) => {
          if (id === player.playerId) return null;

          const existing = partners.find(x => x.playerId === id);

          return (
            <div
              key={id}
              className="flex justify-between items-center bg-gray-700 px-2 py-1 rounded"
            >
              <span className="text-sm truncate">{p.name}</span>

              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={existing?.percent ?? 0}
                  min="0"
                  max="100"
                  className="w-14 text-center bg-gray-800 rounded p-1 outline-none"
                  onChange={(e) =>
                    handlePercentChange(id, e.target.value)
                  }
                />
                <span className="text-xs text-gray-400">%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* PERCENT BAR */}
      <div className="mb-3">
        <p className="text-xs text-gray-400">
          Partners: {totalPercent}% | You: {Math.max(0, 100 - totalPercent)}%
        </p>

        <div className="w-full bg-gray-700 h-2 rounded mt-1 overflow-hidden">
          <div
            className={`h-2 ${
              totalPercent > 100 ? "bg-red-500" : "bg-green-500"
            } transition-all`}
            style={{ width: `${Math.min(totalPercent, 100)}%` }}
          />
        </div>
      </div>
            <p className="text-xs text-gray-400 mt-2">
  Your Share: {yourPercent}% • ₹{Math.floor(yourCost || 0)}
</p>
      {/* BID INPUT */}
      <input
        type="number"
        placeholder="Enter bid amount"
        className="w-full p-2 rounded bg-gray-700 mb-3 outline-none"
        value={bidAmount}
        onChange={(e) => setBidAmount(e.target.value)}
      />

      {/* BUTTON */}
      <button
        onClick={createDeal}
        disabled={!isValid}
        className={`w-full p-2 rounded font-semibold transition ${
          isValid
            ? partners.length === 0
              ? "bg-green-500 hover:bg-green-600"
              : "bg-purple-500 hover:bg-purple-600"
            : "bg-gray-600 cursor-not-allowed"
        }`}
      >
        {partners.length === 0
          ? "Buy Property"
          : "Propose Deal"}
      </button>
    </div>
  );
}