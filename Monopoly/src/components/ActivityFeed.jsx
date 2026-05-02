import {
  useEffect,
  useRef,
  useState
} from "react";

export default function ActivityFeed({
  transactions,
  players = {}
}) {

  const feedRef = useRef(null);

  /* =========================
     🎛️ FILTER + LOAD
  ========================= */

  const [filter, setFilter] =
    useState("all");

  const [visibleCount, setVisibleCount] =
    useState(12);

  /* =========================
     🧠 FORMAT MESSAGE
  ========================= */

  const formatMessage = (txn) => {

    if (!txn) {
      return {
        text: "",
        type: "default"
      };
    }

    /* 🤝 DEAL PURCHASE */
    if (txn.type === "dealPurchase") {

      const buyerNames = txn.buyers
        ?.map(
          (b) =>
            players[b.playerId]?.name ||
            "Unknown"
        )
        .join(" & ");

      return {
        text: `🏢 ${buyerNames} acquired ${txn.cardName}`,
        sub: `Investment: ₹${txn.amount}`,
        type: "deal"
      };
    }

    /* 💰 SELL DEAL */
    if (txn.type === "sellDeal") {

      const buyerName =
        txn.buyer === "Bank"
          ? "Bank"
          : players?.[txn.buyer]?.name ||
            "Unknown";

      return {
        text: `💸 ${txn.seller} sold ${txn.percent}% of ${txn.cardName} to ${buyerName}`,
        sub: `Deal Value: ₹${txn.amount}`,
        type: "sell"
      };
    }

    /* 🏦 MORTGAGE */
    if (txn.type === "mortgage") {
      return {
        text: `🏦 ${txn.player} mortgaged ${txn.percent}% of ${txn.cardName}`,
        sub: `Received: ₹${txn.amount}`,
        type: "mortgage"
      };
    }

    /* 🔓 UNMORTGAGE */
    if (txn.type === "unmortgage") {
      return {
        text: `🔓 ${txn.player} unmortgaged ${txn.percent}% of ${txn.cardName}`,
        sub: `Paid Back: ₹${txn.amount}`,
        type: "unmortgage"
      };
    }

    /* 🏦 OTHER */
    switch (txn.reason) {

      case "Payment":
        return {
          text: `💳 ${txn.payer} paid ${txn.receiver}`,
          sub: `₹${txn.amount}`,
          type: "payment"
        };

      case "Loan":
        return {
          text: `🏦 ${txn.receiver} took a business loan`,
          sub: `₹${txn.amount}`,
          type: "loan"
        };

      case "Fixed Income":
        return {
          text: `📈 ${txn.receiver} earned fixed income`,
          sub: `₹${txn.amount}`,
          type: "income"
        };

      case "Loan Repayment":
        return {
          text: `💰 ${txn.payer} repaid their loan`,
          sub: `₹${txn.amount}`,
          type: "repay"
        };

      default:
        return {
          text: "📜 Transaction happened",
          type: "default"
        };
    }
  };

  /* =========================
     🕒 TIME
  ========================= */

  const formatTime = (time) => {

    if (!time) return "";

    const d = new Date(time);

    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  /* =========================
     🎨 COLORS
  ========================= */

  const typeStyles = {
    deal: "bg-purple-500",
    sell: "bg-orange-500",
    payment: "bg-blue-500",
    mortgage: "bg-yellow-500",
    unmortgage: "bg-green-500",
    loan: "bg-yellow-500",
    income: "bg-emerald-500",
    repay: "bg-red-500",
    default: "bg-gray-500"
  };

  /* =========================
     🧠 FILTERS
  ========================= */

  const filters = [
    {
      key: "all",
      label: "All"
    },
    {
      key: "deal",
      label: "Deals"
    },
    {
      key: "sell",
      label: "Sales"
    },
    {
      key: "mortgage",
      label: "Mortgage"
    },
    {
      key: "unmortgage",
      label: "Unmortgage"
    }
  ];

  const filteredTransactions =
    Object.entries(transactions || {})
      .sort(
        (a, b) =>
          (b[1]?.time || 0) -
          (a[1]?.time || 0)
      )
      .filter(([_, txn]) => {

        if (filter === "all")
          return true;

        const msg =
          formatMessage(txn);

        return msg.type === filter;
      });

  const visibleTransactions =
    filteredTransactions.slice(
      0,
      visibleCount
    );

  /* =========================
     🔥 AUTO SCROLL
  ========================= */

  useEffect(() => {

    if (feedRef.current) {
      feedRef.current.scrollTop = 0;
    }

  }, [filter]);

  return (
    <div className="flex flex-col h-full mt-4">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-3">

        <h3 className="font-semibold text-sm text-gray-200">
          📜 Activity Feed
        </h3>

        <div className="text-[10px] text-gray-500">
          {filteredTransactions.length} events
        </div>
      </div>

      {/* FILTERS */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4">

        {filters.map((f) => {

          const active =
            filter === f.key;

          return (
            <button
              key={f.key}
              onClick={() => {
                setFilter(f.key);
                setVisibleCount(12);
              }}
              className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all border
              
              ${
                active
                  ? "bg-white text-black border-white scale-105"
                  : "bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* FEED */}
      <div
        ref={feedRef}
        className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1"
      >

        {visibleTransactions.length === 0 && (
          <div className="text-center text-sm text-gray-500 py-8">
            No activity found
          </div>
        )}

        {visibleTransactions.map(
          ([id, txn]) => {

            const msg =
              formatMessage(txn);

            return (
              <div
                key={id}
                className="group flex items-start gap-3 bg-gray-900/70 border border-white/10 hover:border-white/20 p-3 rounded-2xl shadow-sm transition-all"
              >

                {/* DOT */}
                <div
                  className={`w-2.5 h-2.5 mt-2 rounded-full shrink-0 ${typeStyles[msg.type]}`}
                />

                {/* CONTENT */}
                <div className="flex-1 min-w-0">

                  <p className="text-sm text-white leading-relaxed">
                    {msg.text}
                  </p>

                  {msg.sub && (
                    <p className="text-xs text-gray-400 mt-1">
                      {msg.sub}
                    </p>
                  )}
                </div>

                {/* TIME */}
                <div className="text-[10px] text-gray-500 whitespace-nowrap pl-2">
                  {formatTime(txn.time)}
                </div>
              </div>
            );
          }
        )}

        {/* LOAD MORE */}
        {visibleCount <
          filteredTransactions.length && (
          <button
            onClick={() =>
              setVisibleCount(
                prev => prev + 12
              )
            }
            className="mt-3 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-sm text-gray-300 transition"
          >
            Load More
          </button>
        )}
      </div>
    </div>
  );
}