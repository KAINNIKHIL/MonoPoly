import { useEffect, useState } from "react";
import { db } from "./firebase";
import { ref, onValue, update, push, remove } from "firebase/database";
import PlayerHeader from "./components/PlayerHeader.jsx";
import toast from "react-hot-toast";
// ✅ Components
import MoneySection from "./components/MoneySection.jsx";
import ActivityFeed from "./components/ActivityFeed.jsx";
import CardsSection from "./components/CardsSection.jsx";

export default function Player({ player }) {
  const [players, setPlayers] = useState({});
  const [requests, setRequests] = useState({});
  const [transactions, setTransactions] = useState({});
  const [tab, setTab] = useState("money");
  const [touchStart, setTouchStart] = useState(0);
const [touchEnd, setTouchEnd] = useState(0);

const MIN_SWIPE_DISTANCE = 80;
const MAX_VERTICAL_MOVEMENT = 60;

  const playerData = players[player.playerId] || {};

  // 👥 Players
  useEffect(() => {
    const playersRef = ref(db, `games/${player.gameId}/players`);
    return onValue(playersRef, (snap) => {
      setPlayers(snap.val() || {});
    });
  }, [player.gameId]);

  // 📩 Requests
  useEffect(() => {
    const reqRef = ref(db, `games/${player.gameId}/requests`);
    return onValue(reqRef, (snap) => {
      setRequests(snap.val() || {});
    });
  }, [player.gameId]);

  // ⚡ Transactions
  useEffect(() => {
    const txnRef = ref(db, `games/${player.gameId}/transactions`);
    return onValue(txnRef, (snap) => {
      setTransactions(snap.val() || {});
    });
  }, [player.gameId]);

  // 💸 PAY
  const pay = async (amount, receiver) => {
    const amt = Number(amount);
    if (!amt || !receiver) return;

    const currentBalance = playerData.balance || 0;

    if (currentBalance < amt) {
      toast.error("Not enough balance");
      return;
    }

    if (receiver !== "bank" && !players[receiver]) {
      toast.error("Invalid receiver");
      return;
    }

    try {
      // Deduct from sender
      await update(
        ref(db, `games/${player.gameId}/players/${player.playerId}`),
        {
          balance: currentBalance - amt
        }
      );

      // Add to receiver
      if (receiver !== "bank") {
        await update(
          ref(db, `games/${player.gameId}/players/${receiver}`),
          {
            balance: (players[receiver].balance || 0) + amt
          }
        );
      }

      // Transaction log
      await push(ref(db, `games/${player.gameId}/transactions`), {
        payer: playerData.name,
        receiver:
          receiver === "bank" ? "Bank" : players[receiver]?.name,
        amount: amt,
        reason: "Payment",
        time: Date.now()
      });
      toast.success("Payment sent");

    } catch (err) {
      console.error(err);
      toast.error("Payment failed");
    }
  };

  // 📩 REQUEST
  const requestMoney = async (type, amount) => {
  const amt = Number(amount);
  if (!amt) return;

  // 🟡 LOAN → instant (no approval)
  if (type === "loan") {
    const used = playerData.loanTaken || 0;
    const limit = playerData.loanLimit || 5000;

    if (used + amt > limit) {
      toast.error("Loan limit exceeded!");
      return;
    }

    try {
      await update(
        ref(db, `games/${player.gameId}/players/${player.playerId}`),
        {
          balance: (playerData.balance || 0) + amt,
          loanTaken: used + amt
        }
      );

      await push(ref(db, `games/${player.gameId}/transactions`), {
        payer: "Bank",
        receiver: playerData.name,
        amount: amt,
        reason: "Loan",
        time: Date.now()
      });

      toast.success("Loan received 💰");
    } catch (err) {
      console.error(err);
      toast.error("Loan failed");
    }

    return;
  }

  // 🟢 NORMAL REQUEST (income)
  try {
    await push(ref(db, `games/${player.gameId}/requests`), {
      type,
      requesterId: player.playerId,
      requesterName: playerData.name,
      amount: amt,
      approvals: {},
      status: "pending"
    });

    toast.success("Request sent");
  } catch (err) {
    console.error(err);
    toast.error("Request failed");
  }
};

  // 💳 REPAY LOAN
  const repayLoan = async (amount) => {
    const amt = Number(amount);
    if (!amt) return;

    const used = playerData.loanTaken || 0;
    const balance = playerData.balance || 0;

    if (balance < amt) {
      toast.error("Not enough balance");
      return;
    }

    if (used <= 0) {
      toast.error("No loan to repay");
      return;
    }

    const finalAmt = Math.min(amt, used);

    try {
      await update(
        ref(db, `games/${player.gameId}/players/${player.playerId}`),
        {
          balance: balance - finalAmt,
          loanTaken: used - finalAmt
        }
      );

      await push(ref(db, `games/${player.gameId}/transactions`), {
        payer: playerData.name,
        receiver: "Bank",
        amount: finalAmt,
        reason: "Loan Repayment",
        time: Date.now()
      });

      toast.success("Loan repaid");
    } catch (err) {
      console.error(err);
      toast.error("Repayment failed");
    }
  };

  // 🔥 FINISH REQUEST
  const finishRequest = async (reqId, status, req) => {
    const requester = players[req.requesterId];
    if (!requester) return;

    if (status === "approved") {
      const updates = {
        balance: (requester.balance || 0) + req.amount
      };

      
      await update(
        ref(db, `games/${player.gameId}/players/${req.requesterId}`),
        updates
      );

      await push(ref(db, `games/${player.gameId}/transactions`), {
        payer: "Bank",
        receiver: req.requesterName,
        amount: req.amount,
        reason: "Fixed Income",
        time: Date.now()
      });
    }

    await update(
      ref(db, `games/${player.gameId}/requests/${reqId}`),
      { status }
    );

    setTimeout(() => {
      remove(
        ref(db, `games/${player.gameId}/requests/${reqId}`)
      );
    }, 3000);
  };

  // 🗳️ VOTE
  const voteRequest = async (reqId, decision) => {
    const req = requests[reqId];
    if (!req) return;

    if (req.requesterId === player.playerId) {
      toast.error("You cannot vote on your own request");
      return;
    }

    if (req.approvals?.[player.playerId] !== undefined) {
      toast("Already voted");
      return;
    }

    const approvals = {
      ...req.approvals,
      [player.playerId]: decision
    };

    await update(
      ref(db, `games/${player.gameId}/requests/${reqId}`),
      { approvals }
    );

    const total = Object.keys(players).length - 1;

    const approveCount = Object.values(approvals).filter(
      (v) => v
    ).length;

    const rejectCount = Object.values(approvals).filter(
      (v) => !v
    ).length;

    if (rejectCount > 0) {
      return finishRequest(reqId, "rejected", req);
    }

    if (approveCount === total) {
      return finishRequest(reqId, "approved", req);
    }
  };

  // 🚪 LEAVE
  const leaveGame = () => {
  toast((t) => (
    <div className="flex flex-col gap-2 text-sm">
      <p>Leave game?</p>

      <div className="flex gap-2">
        <button
          onClick={async () => {
            toast.dismiss(t.id);

            try {
              await remove(
                ref(db, `games/${player.gameId}/players/${player.playerId}`)
              );

              localStorage.removeItem("player");
              window.location.reload();
            } catch (err) {
              console.error(err);
              toast.error("Error leaving game");
            }
          }}
          className="bg-red-500 px-3 py-1 rounded"
        >
          Yes
        </button>

        <button
          onClick={() => toast.dismiss(t.id)}
          className="bg-gray-700 px-3 py-1 rounded"
        >
          Cancel
        </button>
      </div>
    </div>
  ));
};
  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 flex justify-center pb-20">
      <div className="w-full max-w-md">

        {/* HEADER */}
        <PlayerHeader 
  playerData={playerData} 
  gameId={player.gameId}
  onLeave={leaveGame}
/>

        {/* 🔘 TABS */}
        <div className="fixed bottom-0 left-0 w-full bg-gray-900 border-t border-gray-700 flex justify-around py-2 z-50">
  {[
    { key: "money", label: "Money", icon: "₹" },
    { key: "activity", label: "Activity", icon: "💬" },
    { key: "cards", label: "Properties", icon: "🏠" }
  ].map((t) => {
    const isActive = tab === t.key;

    return (
      <button
        key={t.key}
        onClick={() => setTab(t.key)}
        className={`flex flex-col items-center justify-center relative  active:scale-90 active:animate-bounce transition-all duration-200
        ${isActive ? "text-white scale-110" : "text-gray-400"}`}
      >
        <span className="text-xl">{t.icon}</span>
        <span className="text-[10px]">{t.label}</span>

        {/* 🔵 Active indicator */}
        {isActive && (
          <div className="absolute -bottom-1 w-8 h-1 bg-blue-500 rounded-full" />
        )}
      </button>
    );
  })}
</div>

        <div
  className="flex flex-col h-[calc(100vh-160px)] overflow-hidden"
  onTouchStart={(e) => {
  const x = e.targetTouches[0].clientX;
  const screenWidth = window.innerWidth;

  if (x < 20 || x > screenWidth - 20) return;

  setTouchStart(x);
  setTouchEnd(x);
}}
  onTouchMove={(e) => setTouchEnd(e.targetTouches[0].clientX)}
  onTouchEnd={(e) => {
  const diffX = touchStart - touchEnd;
  const diffY = Math.abs(e.changedTouches[0].clientY - e.targetTouches?.[0]?.clientY || 0);

  // ❌ Ignore vertical scroll
  if (diffY > MAX_VERTICAL_MOVEMENT) return;

  // ❌ Ignore small swipes
  if (Math.abs(diffX) < MIN_SWIPE_DISTANCE) return;

  // 👉 Swipe Left
  if (diffX > 0) {
    if (tab === "money") setTab("activity");
    else if (tab === "activity") setTab("cards");
  }

  // 👉 Swipe Right
  if (diffX < 0) {
    if (tab === "cards") setTab("activity");
    else if (tab === "activity") setTab("money");
  }

  // ✅ Reset
  setTouchStart(0);
  setTouchEnd(0);
}}
>
  <div
    className="flex h-full transition-transform duration-300"
    style={{
      transform:
        tab === "money"
          ? "translateX(0%)"
          : tab === "activity"
          ? "translateX(-100%)"
          : "translateX(-200%)"
    }}
  >
    {/* MONEY */}
    <div className="w-full flex-shrink-0 h-full overflow-y-auto ">
      <MoneySection
        player={player}
        players={players}
        playerData={playerData}
        pay={pay}
        requestMoney={requestMoney}
        repayLoan={repayLoan}
        voteRequest={voteRequest}
        requests={requests}
      />
    </div>

    {/* ACTIVITY */}
    <div className="w-full flex-shrink-0 h-full overflow-y-auto ">
      <ActivityFeed
        transactions={transactions}
        players={players}
      />
    </div>

    {/* CARDS */}
    <div className="w-full flex-shrink-0 h-full overflow-y-auto ">
      <CardsSection player={player} players={players} />
    </div>
  </div>
</div>

        

      </div>
    </div>
  );
}