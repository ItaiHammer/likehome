"use client";

import { useState } from "react";

export interface SavedCard {
  id: string;
  type: "visa" | "mastercard" | "amex" | "discover";
  last4: string;
  expMonth: string;
  expYear: string;
  holderName: string;
  isDefault?: boolean;
}

interface PaymentSectionProps {
  values: {
    cardType: string;
    cardNumber: string;
    expirationDate: string;
    cvv: string;
    zipCode: string;
    sameAsGuestAddress: boolean;
    billingAddress: string;
    billingCity: string;
    billingState: string;
    billingZip: string;
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

const cardClass = "rounded-xl border border-edge bg-white p-6 shadow-xs";
const labelClass = "mb-2 block text-base font-semibold text-ink";
const inputClass =
  "h-[46px] w-full rounded-[6.4px] border border-edge bg-white px-4 text-base font-normal text-ink placeholder:text-slate focus:placeholder:text-transparent focus:border-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue transition-colors";

export default function PaymentSection({ values, onChange }: PaymentSectionProps) {
  // Pre-loaded saved cards for signed-in accounts
  const [savedCards, setSavedCards] = useState<SavedCard[]>([
    {
      id: "card_1",
      type: "visa",
      last4: "4242",
      expMonth: "12",
      expYear: "28",
      holderName: "Alex Morgan",
      isDefault: true,
    },
    {
      id: "card_2",
      type: "amex",
      last4: "1005",
      expMonth: "09",
      expYear: "27",
      holderName: "Alex Morgan",
      isDefault: false,
    },
  ]);

  const [selectedCardId, setSelectedCardId] = useState<string>("card_1");
  const [isAddingNewCard, setIsAddingNewCard] = useState<boolean>(false);

  const isAmex = values.cardType === "amex";
  const cvvLength = isAmex ? 4 : 3;
  const cvvPlaceholder = isAmex ? "1234" : "123";

  // Handle selecting a saved card
  const handleSelectCard = (card: SavedCard) => {
    setSelectedCardId(card.id);
    setIsAddingNewCard(false);

    // Trigger synthetic changes to sync parent form state
    const cardTypeEvent = {
      target: { name: "cardType", value: card.type },
    } as React.ChangeEvent<HTMLSelectElement>;

    const cardNumberEvent = {
      target: { name: "cardNumber", value: `•••• •••• •••• ${card.last4}` },
    } as React.ChangeEvent<HTMLInputElement>;

    const expEvent = {
      target: { name: "expirationDate", value: `${card.expMonth}/${card.expYear}` },
    } as React.ChangeEvent<HTMLInputElement>;

    onChange(cardTypeEvent);
    onChange(cardNumberEvent);
    onChange(expEvent);
  };

  // Remove card from saved list
  const handleRemoveCard = (e: React.MouseEvent, cardId: string) => {
    e.stopPropagation();
    const updated = savedCards.filter((c) => c.id !== cardId);
    setSavedCards(updated);

    if (selectedCardId === cardId) {
      if (updated.length > 0) {
        handleSelectCard(updated[0]);
      } else {
        setIsAddingNewCard(true);
      }
    }
  };

  // Toggle "Add New Card"
  const handleAddNewCardClick = () => {
    setIsAddingNewCard(true);
    setSelectedCardId("");

    const resetCardNumber = {
      target: { name: "cardNumber", value: "" },
    } as React.ChangeEvent<HTMLInputElement>;

    const resetExp = {
      target: { name: "expirationDate", value: "" },
    } as React.ChangeEvent<HTMLInputElement>;

    onChange(resetCardNumber);
    onChange(resetExp);
  };

  // Input Formatting logic
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, "");
    if (isAmex) {
      raw = raw.slice(0, 15);
      const formatted = raw.replace(/^(\d{4})(\d{0,6})(\d{0,5})$/, (_, p1, p2, p3) =>
        [p1, p2, p3].filter(Boolean).join(" ")
      );
      e.target.value = formatted;
    } else {
      raw = raw.slice(0, 16);
      const formatted = raw.match(/.{1,4}/g)?.join(" ") || raw;
      e.target.value = formatted;
    }
    onChange(e);
  };

  const handleExpirationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    if (raw.length >= 3) {
      e.target.value = `${raw.slice(0, 2)}/${raw.slice(2)}`;
    } else {
      e.target.value = raw;
    }
    onChange(e);
  };

  const handleZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.target.value = e.target.value.replace(/\D/g, "").slice(0, 5);
    onChange(e);
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.target.value = e.target.value.replace(/\D/g, "").slice(0, cvvLength);
    onChange(e);
  };

  return (
    <section className={cardClass} aria-labelledby="payment-details-heading">
      <div className="flex items-center justify-between">
        <h2
          id="payment-details-heading"
          className="text-[32px] leading-10 font-bold text-ink"
        >
          2. Payment details
        </h2>
        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
          🔒 256-Bit Encrypted
        </span>
      </div>

      {/* Saved Payment Methods Selection */}
      {savedCards.length > 0 && (
        <div className="mt-5 space-y-3">
          <p className="text-sm font-semibold text-ink">Saved Payment Methods</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {savedCards.map((card) => {
              const isSelected = selectedCardId === card.id && !isAddingNewCard;
              return (
                <div
                  key={card.id}
                  onClick={() => handleSelectCard(card)}
                  className={`relative flex cursor-pointer items-start justify-between rounded-xl border p-4 transition-all ${
                    isSelected
                      ? "border-blue bg-blue/5 ring-2 ring-blue/20"
                      : "border-edge bg-white hover:border-slate/40"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-7 w-10 items-center justify-center rounded bg-ink text-[10px] font-bold text-white uppercase tracking-wider">
                      {card.type}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        •••• •••• •••• {card.last4}
                      </p>
                      <p className="text-xs text-slate">
                        Expires {card.expMonth}/{card.expYear} · {card.holderName}
                      </p>
                      {card.isDefault && (
                        <span className="mt-1.5 inline-block rounded bg-paper px-2 py-0.5 text-[10px] font-semibold text-slate border border-edge">
                          Default
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleRemoveCard(e, card.id)}
                    className="text-xs font-medium text-slate hover:text-rose-600 transition-colors p-1"
                    title="Remove card"
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add New Card Toggle Button */}
      <div className="mt-4 flex items-center justify-between border-t border-edge pt-4">
        <p className="text-sm text-slate">
          {isAddingNewCard
            ? "Enter new card details below:"
            : "Or use a different payment method:"}
        </p>
        {!isAddingNewCard ? (
          <button
            type="button"
            onClick={handleAddNewCardClick}
            className="text-sm font-semibold text-blue hover:underline"
          >
            + Add New Card
          </button>
        ) : (
          savedCards.length > 0 && (
            <button
              type="button"
              onClick={() => handleSelectCard(savedCards[0])}
              className="text-sm font-semibold text-slate hover:text-ink"
            >
              Cancel
            </button>
          )
        )}
      </div>

      {/* Manual / New Card Entry Form */}
      {(isAddingNewCard || savedCards.length === 0) && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 rounded-xl border border-edge bg-paper/50 p-4">
          <div>
            <label htmlFor="cardType" className={labelClass}>
              Card type
            </label>
            <select
              id="cardType"
              name="cardType"
              value={values.cardType}
              onChange={onChange}
              className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666666%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-[right_1rem_center] bg-no-repeat pr-8`}
            >
              <option value="visa">Visa</option>
              <option value="mastercard">Mastercard</option>
              <option value="amex">American Express (4-digit CID)</option>
              <option value="discover">Discover</option>
            </select>
          </div>

          <div>
            <label htmlFor="cardNumber" className={labelClass}>
              Card number
            </label>
            <input
              id="cardNumber"
              name="cardNumber"
              type="text"
              required
              value={values.cardNumber}
              onChange={handleCardNumberChange}
              placeholder={isAmex ? "3782 822468 38210" : "1234 5678 9012 3456"}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="expirationDate" className={labelClass}>
              Expiration
            </label>
            <input
              id="expirationDate"
              name="expirationDate"
              type="text"
              required
              value={values.expirationDate}
              onChange={handleExpirationChange}
              placeholder="MM/YY"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="cvv" className={labelClass}>
                {isAmex ? "CID" : "CVV"}
              </label>
              <input
                id="cvv"
                name="cvv"
                type="password"
                required
                value={values.cvv}
                onChange={handleCvvChange}
                placeholder={cvvPlaceholder}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="zipCode" className={labelClass}>
                ZIP code
              </label>
              <input
                id="zipCode"
                name="zipCode"
                type="text"
                required
                value={values.zipCode}
                onChange={handleZipChange}
                placeholder="94538"
                className={inputClass}
              />
            </div>
          </div>
        </div>
      )}

      {/* Required Security CVV Verification when using a saved card */}
      {!isAddingNewCard && savedCards.length > 0 && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 rounded-xl border border-edge bg-paper/50 p-4">
          <div>
            <label htmlFor="cvv" className={labelClass}>
              Confirm {isAmex ? "CID (4 digits)" : "CVV Security Code (3 digits)"}
            </label>
            <input
              id="cvv"
              name="cvv"
              type="password"
              required
              value={values.cvv}
              onChange={handleCvvChange}
              placeholder={cvvPlaceholder}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="zipCode" className={labelClass}>
              Billing ZIP Code
            </label>
            <input
              id="zipCode"
              name="zipCode"
              type="text"
              required
              value={values.zipCode}
              onChange={handleZipChange}
              placeholder="94538"
              className={inputClass}
            />
          </div>
        </div>
      )}

      {/* Billing Address Match Section */}
      <div className="mt-6 border-t border-edge pt-6">
        <h3 className="text-lg font-semibold text-ink">Billing address</h3>
        <p className="mt-0.5 text-sm text-slate">
          Must match the address associated with your credit card.
        </p>

        <label className="mt-3 flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            name="sameAsGuestAddress"
            checked={values.sameAsGuestAddress}
            onChange={onChange}
            className="h-4 w-4 cursor-pointer accent-blue"
          />
          <span className="text-sm font-medium text-ink">
            Same as account primary address
          </span>
        </label>

        {!values.sameAsGuestAddress && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="billingAddress" className={labelClass}>
                Street address
              </label>
              <input
                id="billingAddress"
                name="billingAddress"
                required
                value={values.billingAddress}
                onChange={onChange}
                placeholder="456 Market Street, Apt 4B"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="billingCity" className={labelClass}>
                City
              </label>
              <input
                id="billingCity"
                name="billingCity"
                required
                value={values.billingCity}
                onChange={onChange}
                placeholder="San Francisco"
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="billingState" className={labelClass}>
                  State
                </label>
                <input
                  id="billingState"
                  name="billingState"
                  required
                  maxLength={2}
                  value={values.billingState}
                  onChange={(e) => {
                    e.target.value = e.target.value.toUpperCase();
                    onChange(e);
                  }}
                  placeholder="CA"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="billingZip" className={labelClass}>
                  ZIP
                </label>
                <input
                  id="billingZip"
                  name="billingZip"
                  required
                  value={values.billingZip}
                  onChange={handleZipChange}
                  placeholder="94105"
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}