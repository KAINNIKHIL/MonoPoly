import { useEffect, useState, useRef } from "react";
import { db } from "./firebase";
import {
  ref,
  onValue,
  update,
  push,
  remove
} from "firebase/database";

export default function Player({ player }) {
  const [players, setPlayers] = useState({});
  const [requests, setRequests] = useState({});
  const [payAmount, setPayAmount] = useState("");
  const [incomeAmount, setIncomeAmount] = useState("");
  const [loanAmount, setLoanAmount] = useState("");
  const [receiver, setReceiver] = useState("");
  const [transactions, setTransactions] = useState({});
  const [repayAmount, setRepayAmount] = useState("");
const feedRef = useRef(null);

  const playerData = players[player.playerId] || {};

  // 👥 players
  useEffect(() => {
    const playersRef = ref(db, `games/${player.gameId}/players`);
    return onValue(playersRef, (snap) => {
      setPlayers(snap.val() || {});
    });
  }, [player.gameId]);

  // 📩 requests
  useEffect(() => {
    const reqRef = ref(db, `games/${player.gameId}/requests`);
    return onValue(reqRef, (snap) => {
      setRequests(snap.val() || {});
    });
  }, [player.gameId]);

  // 🔄 Requests Sync
 
  useEffect(() => {
  const txnRef = ref(db, `games/${player.gameId}/transactions`);

  return onValue(txnRef, (snapshot) => {
    setTransactions(snapshot.val() || {});
  });
}, [player.gameId]);



  // 💸 PAY
  const pay = async () => {
    const amt = Number(payAmount);
    if (!amt || !receiver) return;

    if (playerData.balance < amt) {
      alert("Not enough balance");
      return;
    }

    await update(ref(db, `games/${player.gameId}/players/${player.playerId}`), {
      balance: playerData.balance - amt
    });

    if (receiver !== "bank") {
      await update(ref(db, `games/${player.gameId}/players/${receiver}`), {
        balance: players[receiver].balance + amt
      });
    }

    await push(ref(db, `games/${player.gameId}/transactions`), {
      payer: playerData.name,
      receiver: receiver === "bank" ? "Bank" : players[receiver]?.name,
      amount: amt,
      reason: "Payment",
      time: Date.now()
    });

    setPayAmount("");
  };

  // 📩 REQUEST MONEY
 const requestMoney = async (type) => {
  const amt = Number(type === "income" ? incomeAmount : loanAmount);
  if (!amt) return;

  // 🔥 LOAN LIMIT CHECK
  if (type === "loan") {
    const used = playerData.loanTaken || 0;
    const limit = playerData.loanLimit || 5000;

    if (used + amt > limit) {
      alert("Loan limit exceeded!");
      return;
    }
  }

  await push(ref(db, `games/${player.gameId}/requests`), {
    type,
    requesterId: player.playerId,
    requesterName: playerData.name,
    amount: amt,
    approvals: {},
    status: "pending"
  });

  if (type === "income") setIncomeAmount("");
  else setLoanAmount("");
};

const repayLoan = async () => {
  const amt = Number(repayAmount);
  if (!amt) return;

  const used = playerData.loanTaken || 0;

  if (amt > playerData.balance) {
    alert("Not enough balance");
    return;
  }

  if (used <= 0) {
    alert("No loan to repay");
    return;
  }

  const newLoan = Math.max(used - amt, 0);

  await update(
    ref(db, `games/${player.gameId}/players/${player.playerId}`),
    {
      balance: playerData.balance - amt,
      loanTaken: newLoan
    }
  );

  await push(ref(db, `games/${player.gameId}/transactions`), {
    payer: playerData.name,
    receiver: "Bank",
    amount: amt,
    reason: "Loan Repayment",
    time: Date.now()
  });

  setRepayAmount("");
};

  // 🔥 FINISH REQUEST
  const finishRequest = async (reqId, status, req) => {
  if (!req) return;

  const requester = players[req.requesterId];
  if (!requester) return;

  if (status === "approved") {
    const updates = {
      balance: requester.balance + req.amount
    };

    if (req.type === "loan") {
      updates.loanTaken =
        (requester.loanTaken || 0) + req.amount;
    }

    await update(
      ref(db, `games/${player.gameId}/players/${req.requesterId}`),
      updates
    );

    await push(ref(db, `games/${player.gameId}/transactions`), {
      payer: "Bank",
      receiver: req.requesterName,
      amount: req.amount,
      reason: req.type === "loan" ? "Loan" : "Fixed Income",
      time: Date.now()
    });
  }

  await update(
    ref(db, `games/${player.gameId}/requests/${reqId}`),
    { status }
  );

  setTimeout(async () => {
    await remove(ref(db, `games/${player.gameId}/requests/${reqId}`));
  }, 3000);
};

  // 🗳️ VOTE
  const voteRequest = async (reqId, decision) => {
    const req = requests[reqId];
    if (!req) return;

    if (req.requesterId === player.playerId) {
      alert("You cannot vote on your own request");
      return;
    }

    if (req.approvals?.[player.playerId] !== undefined) {
      alert("You already voted");
      return;
    }

    const newApprovals = {
      ...req.approvals,
      [player.playerId]: decision
    };

    await update(ref(db, `games/${player.gameId}/requests/${reqId}`), {
      approvals: newApprovals
    });

    const totalPlayers = Object.keys(players).length - 1;

    const approveCount = Object.values(newApprovals).filter(v => v).length;
    const rejectCount = Object.values(newApprovals).filter(v => !v).length;

    if (rejectCount > 0) {
      await finishRequest(reqId, "rejected", req);
      return;
    }

    if (approveCount === totalPlayers) {
      await finishRequest(reqId, "approved", req);
    }
  };

  // 🚪 LEAVE GAME
  const leaveGame = async () => {
    const confirmLeave = confirm("Are you sure you want to leave the game?");
    if (!confirmLeave) return;

    try {
      await remove(
        ref(db, `games/${player.gameId}/players/${player.playerId}`)
      );

      localStorage.removeItem("player");

      //alert("You left the game");

      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Error leaving game");
    }
  };

 const formatMessage = (txn) => {
  if (!txn) return { text: "" };

  switch (txn.reason) {
    case "Payment":
      return {
        text: `${txn.payer} paid ₹${txn.amount} to ${txn.receiver}`
      };

    case "Loan":
      return {
        text: `🏦 ${txn.receiver} took ₹${txn.amount} loan`
      };

    case "Fixed Income":
      return {
        text: `💰 Bank paid ₹${txn.amount} to ${txn.receiver}`
      };

    case "Loan Repayment":
      return {
        text: `💸 ${txn.payer} repaid ₹${txn.amount} loan to Bank`
      };

    default:
      return {
        text: "Transaction happened"
      };
  }
};

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 flex justify-center">
      <div className="w-full max-w-md">

        {/* HEADER */}
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold">{playerData.name}</h2>

          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="text-sm text-gray-400">Game ID:</span>

            <span className="bg-gray-800 px-2 py-1 rounded text-sm">
              {player.gameId}
            </span>

            <button
              onClick={() => {
                navigator.clipboard.writeText(player.gameId);
              }}
              className="text-xs bg-blue-500 px-2 py-1 rounded"
            >
              Copy
            </button>
          </div>
        </div>

        {/* BALANCE */}
        <div className="bg-black rounded-xl p-6 text-center mb-6 shadow-lg">
          <p className="text-gray-400">Balance</p>
          <h1 className="text-3xl font-bold">₹{playerData.balance}</h1>
        </div>

        {/* PAY */}
        <div className="mb-6">
          <h4 className="mb-2 font-semibold">Pay</h4>

          <input
            className="w-full p-2 mb-2 rounded bg-gray-800 border border-gray-600"
            placeholder="Amount"
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
          />

          <select
            className="w-full p-2 mb-2 rounded bg-gray-800 border border-gray-600"
            onChange={(e) => setReceiver(e.target.value)}
          >
            <option>Select</option>
            <option value="bank">🏦 Bank</option>

            {Object.entries(players).map(([id, p]) =>
              id !== player.playerId ? (
                <option key={id} value={id}>{p.name}</option>
              ) : null
            )}
          </select>

          <button
            className="w-full bg-blue-500 p-2 rounded"
            onClick={pay}
          >
            Pay
          </button>
        </div>

        {/* INCOME */}
        <div className="mb-6">
          <h4 className="mb-2 font-semibold">Fixed Income</h4>

          <input
            className="w-full p-2 mb-2 rounded bg-gray-800 border border-gray-600"
            placeholder="Amount"
            value={incomeAmount}
            onChange={(e) => setIncomeAmount(e.target.value)}
          />

          <button
            className="w-full bg-green-500 p-2 rounded"
            onClick={() => requestMoney("income")}
          >
            Request Income
          </button>
        </div>

        {/* LOAN */}
        <div className="mb-6">
          <h4 className="mb-2 font-semibold">Loan</h4>

          <p className="text-sm mb-2 text-gray-400">
            Used: ₹{playerData.loanTaken || 0} / ₹{playerData.loanLimit || 5000}
          </p>

          <input
            className="w-full p-2 mb-2 rounded bg-gray-800 border border-gray-600"
            placeholder="Loan Amount"
            value={loanAmount}
            onChange={(e) => setLoanAmount(e.target.value)}
          />

          <button
            className="w-full bg-yellow-500 p-2 rounded"
            onClick={() => requestMoney("loan")}
          >
            Request Loan
          </button>
          <div className="mt-4">
  <h4 className="font-semibold mb-2">Repay Loan</h4>

  <input
    className="w-full p-2 mb-2 rounded bg-gray-800 border"
    placeholder="Repay Amount"
    value={repayAmount}
    onChange={(e) => setRepayAmount(e.target.value)}
  />

  <button
    onClick={repayLoan}
    className="w-full bg-red-500 p-2 rounded"
  >
    Repay Loan
  </button>
</div>
        </div>

        {/* REQUESTS */}
        <h4 className="mb-2 font-semibold">Requests</h4>

        {Object.entries(requests).map(([id, req]) => (
          <div key={id} className="bg-gray-800 p-3 rounded mb-3">

            <p className="mb-2">
              <b>{req.requesterName}</b> wants ₹{req.amount} ({req.type})
            </p>

            {req.status === "pending" && (
              <>
                <p className="text-sm mb-2">
                  Approvals: {Object.values(req.approvals || {}).filter(v => v).length} / {Object.keys(players).length - 1}
                </p>

                {req.requesterId !== player.playerId ? (
                  <div className="flex gap-2">
                    <button
                      className="flex-1 bg-green-500 p-1 rounded"
                      onClick={() => voteRequest(id, true)}
                    >
                      Approve
                    </button>
                    <button
                      className="flex-1 bg-red-500 p-1 rounded"
                      onClick={() => voteRequest(id, false)}
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  <p className="text-gray-400">Waiting...</p>
                )}
              </>
            )}

            {req.status === "approved" && (
              <p className="text-green-400">Approved ✅</p>
            )}

            {req.status === "rejected" && (
              <p className="text-red-400">Rejected ❌</p>
            )}
          </div>
        ))}
         {/* ⚡ LIVE FEED (FIXED) */}
        <h3 className="mt-6 mb-2 font-semibold">⚡ Activity</h3>

        <div className="bg-gray-800 p-3 rounded max-h-60 overflow-y-auto flex flex-col gap-2">
  {Object.entries(transactions)
    .sort((a, b) => (b[1]?.time || 0) - (a[1]?.time || 0))
    .slice(0, 10)   // 🔥 ONLY LAST 10
    .map(([id, txn]) => {
      const msg = formatMessage(txn);

      return (
        <div
          key={id}
          className="text-sm bg-gray-700 p-2 rounded"
        >
          {msg.text}
        </div>
      );
    })}
</div>
        {/* 🚪 LEAVE GAME BUTTON */}
        <button
          onClick={leaveGame}
          className="w-full bg-red-600 hover:bg-red-700 p-3 rounded-xl mt-6 font-semibold transition"
        >
          🚪 Leave Game
        </button>

      </div>
    </div>
  );
}