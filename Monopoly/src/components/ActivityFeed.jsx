import { useEffect, useRef } from "react";

export default function ActivityFeed({
  transactions,
  players = {}
}) {
  const feedRef = useRef(null);

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
        text: `${buyerNames} bought ${txn.cardName}`,
        sub: `₹${txn.amount}`,
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
        text: `${txn.seller} sold ${txn.percent}% of ${txn.cardName} to ${buyerName}`,
        sub: `₹${txn.amount}`,
        type: "sell"
      };
    }

    /* 🏦 OTHER TRANSACTIONS */
    switch (txn.reason) {
      case "Payment":
        return {
          text: `${txn.payer} paid ${txn.receiver}`,
          sub: `₹${txn.amount}`,
          type: "payment"
        };

      case "Loan":
        return {
          text: `${txn.receiver} took loan`,
          sub: `₹${txn.amount}`,
          type: "loan"
        };

      case "Fixed Income":
        return {
          text: `Bank paid ${txn.receiver}`,
          sub: `₹${txn.amount}`,
          type: "income"
        };

      case "Loan Repayment":
        return {
          text: `${txn.payer} repaid loan`,
          sub: `₹${txn.amount}`,
          type: "repay"
        };

      default:
        return {
          text: "Transaction happened",
          type: "default"
        };
    }
  };

  /* =========================
     🕒 TIME FORMAT
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
     🎨 TYPE COLORS
  ========================= */
  const typeStyles = {
    deal: "bg-purple-500/20",
    sell: "bg-orange-500/20",
    payment: "bg-blue-500/20",
    loan: "bg-yellow-500/20",
    income: "bg-green-500/20",
    repay: "bg-red-500/20",
    default: "bg-gray-600/20"
  };

  /* =========================
     🔥 AUTO SCROLL
  ========================= */
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  }, [transactions]);

  return (
    <div className="flex flex-col h-full mt-4">

      {/* HEADER */}
      <h3 className="mb-3 font-semibold text-sm text-gray-300">
        Activity
      </h3>

      {/* FEED */}
      <div
        ref={feedRef}
        className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1"
      >
        {Object.entries(transactions || {})
          .sort(
            (a, b) =>
              (b[1]?.time || 0) -
              (a[1]?.time || 0)
          )
          .slice(0, 12)
          .map(([id, txn]) => {
            const msg = formatMessage(txn);

            return (
              <div
                key={id}
                className="flex items-start gap-3 bg-gray-900/70 border border-white/10 p-3 rounded-xl shadow-sm animate-fadeIn"
              >

                {/* DOT */}
                <div
                  className={`w-2 h-2 mt-2 rounded-full ${typeStyles[msg.type]}`}
                />

                {/* TEXT */}
                <div className="flex-1">
                  <p className="text-sm text-white">
                    {msg.text}
                  </p>

                  {msg.sub && (
                    <p className="text-xs text-gray-400">
                      {msg.sub}
                    </p>
                  )}
                </div>

                {/* TIME */}
                <div className="text-[10px] text-gray-500 whitespace-nowrap">
                  {formatTime(txn.time)}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}