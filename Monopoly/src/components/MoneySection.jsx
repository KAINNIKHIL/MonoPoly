import { useState } from "react";
import BalanceCard from "./BalanceCard";

export default function MoneySection({
  player,
  players,
  playerData,
  pay,
  requestMoney,
  repayLoan,
  voteRequest,
  requests
}) {
  const [payAmount, setPayAmount] = useState("");
  const [receiver, setReceiver] = useState("");
  const [incomeAmount, setIncomeAmount] = useState("");
  const [loanAmount, setLoanAmount] = useState("");
  const [repayAmount, setRepayAmount] = useState("");

  const inputStyle =
    "w-full p-2 rounded bg-gray-800 border border-white/10 focus:outline-none focus:ring-1 focus:ring-blue-500";

  const cardStyle =
    "bg-gray-900/70 border border-white/10 rounded-2xl p-4 shadow-md";

  return (
    <div className="space-y-5">
      {/* BALANCE */}
      <BalanceCard balance={playerData.balance || 0} />

      {/* PAY */}
      <div className={cardStyle}>
        <h4 className="font-semibold mb-3">Pay</h4>

        <div className="space-y-2">
          <input
            className={inputStyle}
            placeholder="Enter amount"
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
          />

          <select
            className={inputStyle}
            value={receiver}
            onChange={(e) => setReceiver(e.target.value)}
          >
            <option value="">Select receiver</option>
            <option value="bank">Bank</option>

            {Object.entries(players).map(([id, p]) =>
              id !== player.playerId ? (
                <option key={id} value={id}>
                  {p.name}
                </option>
              ) : null
            )}
          </select>

          <button
            className="w-full bg-blue-600 hover:bg-blue-500 transition p-2 rounded-lg font-medium"
            onClick={() => {
              pay(payAmount, receiver);
              setPayAmount("");
              setReceiver("");
            }}
          >
            Send Payment
          </button>
        </div>
      </div>

      {/* INCOME */}
      <div className={cardStyle}>
        <h4 className="font-semibold mb-3">Fixed Income</h4>

        <div className="flex gap-2">
          <input
            className={inputStyle}
            placeholder="Amount"
            value={incomeAmount}
            onChange={(e) => setIncomeAmount(e.target.value)}
          />

          <button
            className="bg-green-600 hover:bg-green-500 px-3 rounded-lg"
            onClick={() => {
              requestMoney("income", incomeAmount);
              setIncomeAmount("");
            }}
          >
            Request
          </button>
        </div>
      </div>

      {/* LOAN */}
      <div className={cardStyle}>
        <h4 className="font-semibold mb-2">Loan</h4>

        <p className="text-xs text-gray-400 mb-3">
          Used: ₹{playerData.loanTaken || 0} / ₹
          {playerData.loanLimit || 5000}
        </p>

        <div className="flex gap-2 mb-3">
          <input
            className={inputStyle}
            placeholder="Loan amount"
            value={loanAmount}
            onChange={(e) => setLoanAmount(e.target.value)}
          />

          <button
            className="bg-yellow-600 hover:bg-yellow-500 px-3 rounded-lg"
            onClick={() => {
              requestMoney("loan", loanAmount);
              setLoanAmount("");
            }}
          >
            Take
          </button>
        </div>

        {/* REPAY */}
        <div className="border-t border-white/10 pt-3">
          <h5 className="text-sm mb-2 text-gray-300">Repay Loan</h5>

          <div className="flex gap-2">
            <input
              className={inputStyle}
              placeholder="Repay amount"
              value={repayAmount}
              onChange={(e) => setRepayAmount(e.target.value)}
            />

            <button
              className="bg-red-600 hover:bg-red-500 px-3 rounded-lg"
              onClick={() => {
                repayLoan(repayAmount);
                setRepayAmount("");
              }}
            >
              Repay
            </button>
          </div>
        </div>
      </div>

      {/* REQUESTS */}
      <div className={cardStyle}>
        <h4 className="font-semibold mb-3">Requests</h4>

        {Object.keys(requests).length === 0 && (
          <p className="text-sm text-gray-400">No active requests</p>
        )}

        <div className="space-y-3">
          {Object.entries(requests)
  .filter(([_, req]) => req.type !== "loan")
  .map(([id, req]) => {
            const approvals =
              Object.values(req.approvals || {}).filter((v) => v)
                .length;

            return (
              <div
                key={id}
                className="bg-gray-800/80 border border-white/10 p-3 rounded-xl"
              >
                <p className="text-sm mb-1">
                  <span className="font-medium">
                    {req.requesterName}
                  </span>{" "}
                  requested ₹{req.amount}
                </p>

                <p className="text-xs text-gray-400 mb-2">
                  Type: {req.type}
                </p>

                {req.status === "pending" && (
                  <>
                    <p className="text-xs text-gray-400 mb-2">
                      Approvals: {approvals} /{" "}
                      {Object.keys(players).length - 1}
                    </p>

                    {req.requesterId !== player.playerId ? (
                      <div className="flex gap-2">
                        <button
                          className="flex-1 bg-green-600 hover:bg-green-500 p-1 rounded"
                          onClick={() => voteRequest(id, true)}
                        >
                          Approve
                        </button>

                        <button
                          className="flex-1 bg-red-600 hover:bg-red-500 p-1 rounded"
                          onClick={() => voteRequest(id, false)}
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-xs">
                        Waiting for votes
                      </p>
                    )}
                  </>
                )}

                {req.status === "approved" && (
                  <p className="text-green-400 text-sm">
                    Approved
                  </p>
                )}

                {req.status === "rejected" && (
                  <p className="text-red-400 text-sm">
                    Rejected
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}