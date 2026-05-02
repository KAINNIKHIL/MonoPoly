import { useState } from "react";
import toast from "react-hot-toast";

export default function SellPanel({
  player,
  players,
  myCards = [],
  cardStates,
  selectedCard,
  setSelectedCard,
  createSellDeal
}) {
  const [buyer, setBuyer] = useState("");
  const [percent, setPercent] = useState("");
  const [price, setPrice] = useState("");

  // 🎯 Selected card data
  const selectedCardData = myCards.find(
    ([id]) => id === selectedCard
  )?.[1];

  // 🧠 My ownership
  const myOwnership = cardStates?.[selectedCard]?.owners?.find(
    (o) => String(o.playerId) === String(player.playerId)
  );

  // 🏦 Mortgage state
  const isMortgaged = myOwnership?.mortgaged;

  // 📊 Max %
  const maxPercent = Number(myOwnership?.percent || 0);

  // ❌ validations
  const invalidPercent =
    !percent ||
    Number(percent) <= 0 ||
    Number(percent) > maxPercent;

  const invalidPrice =
    !price || Number(price) <= 0;

  const isValid =
    selectedCard &&
    buyer &&
    !invalidPercent &&
    !invalidPrice &&
    !isMortgaged;

  // 🔄 Reset form
  const resetForm = () => {
    setBuyer("");
    setPercent("");
    setPrice("");
    setSelectedCard("");
  };

  return (
    <div className="bg-gray-800 p-4 rounded-2xl mt-6 shadow-lg space-y-4">

      {/* HEADER */}
      <h3 className="text-lg font-semibold text-yellow-400">
        💰 Sell Property
      </h3>

      {/* PROPERTY SELECT */}
      <div>
        <p className="text-xs text-gray-400 mb-1">
          Select Property
        </p>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">

          {myCards.length === 0 && (
            <p className="text-gray-400 text-sm">
              No properties
            </p>
          )}

          {myCards.map(([id, card]) => {

            const active = selectedCard === id;

            const ownership =
              cardStates?.[id]?.owners?.find(
                (o) =>
                  String(o.playerId) ===
                  String(player.playerId)
              );

            const propertyMortgaged =
              ownership?.mortgaged;

            return (
              <div
                key={id}
                onClick={() => {

                  // ❌ Block mortgaged property
                  if (propertyMortgaged) {

                    setSelectedCard("");

                    toast.error(
                      "Unmortgage property first"
                    );

                    return;
                  }

                  setSelectedCard(id);

                  // reset fields
                  setBuyer("");
                  setPrice("");

                  setPercent(
                    String(ownership?.percent || "")
                  );
                }}

                className={`
                  min-w-[120px]
                  p-2
                  rounded-xl
                  border
                  transition-all

                  ${
                    propertyMortgaged
                      ? "opacity-50 cursor-not-allowed border-red-500/30 bg-red-500/5"
                      : "cursor-pointer"
                  }

                  ${
                    active
                      ? "bg-yellow-500/20 border-yellow-400 scale-105"
                      : "bg-gray-700 border-gray-600 hover:bg-gray-600"
                  }
                `}
              >
                <p className="text-sm font-medium">
                  {card.name}
                </p>

                <div className="text-[10px] text-gray-400 mt-1">

                  <p>
                    Own: {ownership?.percent || 0}%
                  </p>

                  {propertyMortgaged && (
                    <p className="text-red-400 mt-1">
                      🏦 Mortgaged
                    </p>
                  )}

                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* BUYER */}
      <div>
        <p className="text-xs text-gray-400 mb-1">
          Select Buyer
        </p>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">

          {Object.entries(players).map(([id, p]) => {

            if (String(id) === String(player.playerId))
              return null;

            const active = buyer === id;

            return (
              <div
                key={id}
                onClick={() => setBuyer(id)}
                className={`
                  px-3
                  py-1.5
                  rounded-full
                  cursor-pointer
                  text-sm
                  transition-all
                  whitespace-nowrap

                  ${
                    active
                      ? "bg-blue-500 text-white scale-105"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }
                `}
              >
                {p.name}
              </div>
            );
          })}
        </div>
      </div>

      {/* INPUTS */}
      <div className="space-y-3">

        {/* Percent */}
        <div>

          <p className="text-xs text-gray-400 mb-1">
            Sell Share (Max: {maxPercent}%)
          </p>

          <input
            type="number"
            value={percent}
            min={1}
            max={maxPercent}

            onChange={(e) => {

              let value = e.target.value;

              // allow empty
              if (value === "") {
                setPercent("");
                return;
              }

              value = Number(value);

              // clamp max
              if (value > maxPercent) {
                value = maxPercent;
              }

              // clamp min
              if (value < 1) {
                value = 1;
              }

              setPercent(String(value));
            }}

            className="
              w-full
              p-2.5
              rounded-xl
              bg-gray-700
              outline-none
              border
              border-gray-600
              focus:border-yellow-400
            "

            placeholder={`Max ${maxPercent}%`}
          />

          {invalidPercent && percent && (
            <p className="text-xs text-red-400 mt-1">
              Invalid percentage
            </p>
          )}
        </div>

        {/* Price */}
        <div>

          <p className="text-xs text-gray-400 mb-1">
            Total Price
          </p>

          <input
            type="number"
            value={price}

            onChange={(e) =>
              setPrice(e.target.value)
            }

            className="
              w-full
              p-2.5
              rounded-xl
              bg-gray-700
              outline-none
              border
              border-gray-600
              focus:border-yellow-400
            "

            placeholder="Enter amount"
          />

          {invalidPrice && price && (
            <p className="text-xs text-red-400 mt-1">
              Enter valid price
            </p>
          )}
        </div>
      </div>

      {/* PREVIEW */}
      {selectedCardData && (
        <div className="bg-gray-900 border border-gray-700 p-3 rounded-xl text-xs text-gray-300">

          Selling{" "}

          <span className="text-white font-semibold">
            {percent || 0}%
          </span>{" "}

          of{" "}

          <span className="text-white font-semibold">
            {selectedCardData.name}
          </span>{" "}

          to{" "}

          <span className="text-white font-semibold">
            {players?.[buyer]?.name || "?"}
          </span>{" "}

          for{" "}

          <span className="text-green-400 font-semibold">
            ₹{price || 0}
          </span>
        </div>
      )}

      {/* BUTTON */}
      <button

        disabled={!isValid}

        onClick={async () => {

          // ❌ mortgaged protection
          if (isMortgaged) {

            toast.error(
              "Unmortgage property first"
            );

            return;
          }

          if (!selectedCard)
            return toast.error("Select property");

          if (!buyer)
            return toast.error("Select buyer");

          if (invalidPercent) {
            return toast.error(
              `Max you can sell is ${maxPercent}%`
            );
          }

          if (invalidPrice) {
            return toast.error(
              "Enter valid price"
            );
          }

          try {

            await createSellDeal({
              player,
              gameId: player.gameId,

              card: {
                id: selectedCard,
                name: selectedCardData.name,
                price: selectedCardData.price
              },

              percent: Number(percent),
              price: Number(price),
              buyerId: buyer
            });

            toast.success(
              "Sell offer created"
            );

            resetForm();

          } catch (err) {

            toast.error(
              err.message || "Failed"
            );
          }
        }}

        className={`
          w-full
          p-3
          rounded-xl
          font-semibold
          transition-all

          ${
            isValid
              ? "bg-yellow-500 hover:bg-yellow-600 text-black"
              : "bg-gray-600 text-gray-400 cursor-not-allowed"
          }
        `}
      >
        Create Sell Offer
      </button>
    </div>
  );
}