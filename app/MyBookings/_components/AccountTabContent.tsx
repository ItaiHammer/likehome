"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Button, Tag } from "@/app/_components/ui";
import { todayISO } from "@/app/_components/dates";
import { PAGE_ROUTES } from "@/constants/routes";
import { cardBrandLabel, cardErrors, typedCardBrand, type CardBrandLabel } from "@/lib/card";
import { pointsNumber } from "@/lib/rewards";
import { cardExpired } from "@/utils/payment-logic";

export interface PaymentMethod {
    id: string;
    brand: CardBrandLabel;
    last4: string;
    expMonth: string;
    expYear: string;
}

export interface Transaction {
    id: string;
    title: string;
    subtitle: string;
    status: string;
    image: string | null;
}

interface AccountTabContentProps {
    name: string | null;
    email: string | null;
    transactions?: Transaction[];
    pointsBalance: number;
}

export function AccountTabContent({
                                      name,
                                      email,
                                      transactions = [],
                                      pointsBalance,
                                  }: AccountTabContentProps) {
    const [loading, setLoading] = useState(true);
    const [isEditingAccount, setIsEditingAccount] = useState(false);
    const [accountError, setAccountError] = useState("");

    // Saved details snapshot
    const [savedPhone, setSavedPhone] = useState("");
    const [savedStreet, setSavedStreet] = useState("");
    const [savedCity, setSavedCity] = useState("");
    const [savedState, setSavedState] = useState("");
    const [savedZip, setSavedZip] = useState("");

    // Form states
    const [phone, setPhone] = useState("");
    const [street, setStreet] = useState("");
    const [city, setCity] = useState("");
    const [state, setState] = useState("");
    const [zip, setZip] = useState("");

    // Payment methods
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [isAddingCard, setIsAddingCard] = useState(false);
    const [cardNumber, setCardNumber] = useState("");
    const [expiry, setExpiry] = useState("");
    const [cvc, setCvc] = useState("");
    const [cardError, setCardError] = useState("");
    const [savingCard, setSavingCard] = useState(false);
    const [listError, setListError] = useState("");
    const [removing, setRemoving] = useState<PaymentMethod | null>(null);
    const [removePending, setRemovePending] = useState(false);
    const [removeError, setRemoveError] = useState("");
    const removeDialogRef = useRef<HTMLDialogElement>(null);
    const removeTitleId = useId();

    // Transaction history modal
    const [showAllTransactions, setShowAllTransactions] = useState(false);

    useEffect(() => {
        async function loadAccountData() {
            setLoading(true);

            try {
                const response = await fetch("/api/saved-payment");
                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error ?? "Could not load payment methods.");
                }

                const cards: PaymentMethod[] = (result.paymentMethods ?? []).map(
                    (pm: {
                        id: string;
                        brand: string;
                        last4: string;
                        exp_month: number;
                        exp_year: number;
                    }) => ({
                        id: pm.id,
                        brand: cardBrandLabel(pm.brand),
                        last4: pm.last4,
                        expMonth: String(pm.exp_month).padStart(2, "0"),
                        expYear: String(pm.exp_year),
                    })
                );

                setPaymentMethods(cards);
                setListError("");
            } catch {
                setListError("We couldn’t load your saved cards. Refresh the page to try again.");
            } finally {
                setLoading(false);
            }
        }

        loadAccountData();
    }, []);

    const detectedBrand = typedCardBrand(cardNumber);

    const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const digits = e.target.value.replace(/\D/g, "");
        const brand = typedCardBrand(digits);
        const maxDigits = brand === "Amex" ? 15 : 16;
        const truncated = digits.slice(0, maxDigits);

        let formatted = truncated;
        if (brand === "Amex") {
            formatted = truncated.replace(/^(\d{4})(\d{0,6})(\d{0,5})$/, (_, p1, p2, p3) =>
                [p1, p2, p3].filter(Boolean).join(" ")
            );
        } else {
            formatted = truncated.replace(/(\d{4})(?=\d)/g, "$1 ");
        }

        setCardNumber(formatted);
        setCardError("");
    };

    const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, "").slice(0, 4);
        if (value.length >= 3) {
            value = `${value.slice(0, 2)}/${value.slice(2)}`;
        }
        setExpiry(value);
        setCardError("");
    };

    const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const maxLen = detectedBrand === "Amex" ? 4 : 3;
        const value = e.target.value.replace(/\D/g, "").slice(0, maxLen);
        setCvc(value);
        setCardError("");
    };

    const handleAddCardSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (savingCard) return;

        const validation = cardErrors(cardNumber, expiry, cvc);
        const validationMessage =
            validation.cardNumber ?? validation.expiry ?? validation.cvc;

        if (validationMessage) {
            setCardError(validationMessage);
            return;
        }

        const rawDigits = cardNumber.replace(/\D/g, "");
        const [monthStr = "", yearStr = ""] = expiry.split("/");

        setSavingCard(true);
        try {
            const response = await fetch("/api/saved-payment", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    card_number: rawDigits,
                    exp_month: Number(monthStr),
                    exp_year: 2000 + Number(yearStr),
                    cvc,
                    name_on_card: name ?? "Cardholder",
                    time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                }),
            });
            const result = await response.json().catch(() => ({}));

            if (!response.ok || !result.paymentMethod) {
                setCardError(result.error ?? "Could not save payment method.");
                return;
            }

            const saved = result.paymentMethod;
            setPaymentMethods((cards) => [
                ...cards,
                {
                    id: saved.id,
                    brand: cardBrandLabel(saved.brand),
                    last4: saved.last4,
                    expMonth: String(saved.exp_month).padStart(2, "0"),
                    expYear: String(saved.exp_year),
                },
            ]);
            setCardNumber("");
            setExpiry("");
            setCvc("");
            setCardError("");
            setIsAddingCard(false);
        } catch {
            setCardError("We couldn’t reach LikeHome. Check your connection and try again.");
        } finally {
            setSavingCard(false);
        }
    };

    const openRemoveDialog = (pm: PaymentMethod) => {
        setRemoving(pm);
        setRemoveError("");
        removeDialogRef.current?.showModal();
    };

    const handleRemoveCard = async () => {
        if (!removing || removePending) return;
        setRemovePending(true);
        setRemoveError("");
        try {
            const response = await fetch(`/api/saved-payment/${encodeURIComponent(removing.id)}`, { method: "DELETE" });
            // 404: already gone, so it leaves the list either way
            if (!response.ok && response.status !== 404) {
                const result = await response.json().catch(() => ({}));
                setRemoveError(result.error ?? "Could not remove this card.");
                return;
            }
            setPaymentMethods((cards) => cards.filter((card) => card.id !== removing.id));
            removeDialogRef.current?.close();
        } catch {
            setRemoveError("We couldn’t reach LikeHome. Check your connection and try again.");
        } finally {
            setRemovePending(false);
        }
    };

    const handleSaveAccountDetails = async (e: React.FormEvent) => {
        e.preventDefault();

        if (phone && phone.replace(/\D/g, "").length < 10) {
            setAccountError("Please enter a valid 10-digit phone number.");
            return;
        }

        if (street) {
            const trimmed = street.trim();
            if (trimmed.length < 5 || trimmed.length > 60) {
                setAccountError("Street address must be between 5 and 60 characters.");
                return;
            }
        }

        if (state && !/^[A-Z]{2}$/.test(state.trim())) {
            setAccountError("State must be a valid 2-letter abbreviation (e.g., CA, NY).");
            return;
        }

        if (zip && !/^\d{5}$/.test(zip.trim())) {
            setAccountError("ZIP code must be exactly 5 numeric digits.");
            return;
        }

        setSavedPhone(phone);
        setSavedStreet(street);
        setSavedCity(city);
        setSavedState(state);
        setSavedZip(zip);

        setAccountError("");
        setIsEditingAccount(false);
    };

    const handleCancelAccountDetails = () => {
        setPhone(savedPhone);
        setStreet(savedStreet);
        setCity(savedCity);
        setState(savedState);
        setZip(savedZip);
        setAccountError("");
        setIsEditingAccount(false);
    };

    const fullAddressFormatted = [
        street.trim(),
        [city.trim(), state.trim()].filter(Boolean).join(", "),
        zip.trim(),
    ].filter(Boolean).join(" ");

    const initials = name
        ? name.split(" ").map((n) => n[0]).join("").toUpperCase()
        : email ? email.slice(0, 2).toUpperCase() : "ON";

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            {/* 1. Account Details Card */}
            <div className="flex flex-col justify-between rounded-2xl border border-edge bg-surface p-6 shadow-sm">
                <div className="space-y-5">
                    <h2 className="font-serif text-[32px] leading-9 font-bold text-ink">Account details</h2>

                    <div className="flex items-center gap-4 pt-1">
                        <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-edge bg-paper text-sm font-semibold text-blue-dark">
                          {initials}
                        </span>
                        <div className="min-w-0">
                            <p className="font-semibold text-ink text-sm">{name ?? "User"}</p>
                            <p className="text-xs text-slate truncate">{email ?? ""}</p>
                        </div>
                    </div>
                    {isEditingAccount ? (
                        <form onSubmit={handleSaveAccountDetails} className="space-y-3 pt-3 border-t border-edge">
                            <div>
                                <label className="text-[11px] text-slate uppercase tracking-wider font-semibold block mb-1">Phone Number</label>
                                <input
                                    type="text"
                                    placeholder="(555) 000-0000"
                                    value={phone}
                                    onChange={(e) => {
                                        const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                                        let formatted = digits;
                                        if (digits.length > 6) formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
                                        else if (digits.length > 3) formatted = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
                                        setPhone(formatted);
                                        setAccountError("");
                                    }}
                                    className="w-full rounded-md border border-edge bg-surface px-3 py-1.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-blue"
                                />
                            </div>

                            <div>
                                <label className="text-[11px] text-slate uppercase tracking-wider font-semibold block mb-1">Street Address</label>
                                <input
                                    type="text"
                                    placeholder="123 Main St"
                                    value={street}
                                    maxLength={60}
                                    onChange={(e) => {
                                        setStreet(e.target.value);
                                        setAccountError("");
                                    }}
                                    className="w-full rounded-md border border-edge bg-surface px-3 py-1.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-blue"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <div className="col-span-1">
                                    <label className="text-[11px] text-slate uppercase tracking-wider font-semibold block mb-1">City</label>
                                    <input
                                        type="text"
                                        placeholder="San Jose"
                                        value={city}
                                        maxLength={40}
                                        onChange={(e) => {
                                            setCity(e.target.value);
                                            setAccountError("");
                                        }}
                                        className="w-full rounded-md border border-edge bg-surface px-3 py-1.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-blue"
                                    />
                                </div>

                                <div className="col-span-1">
                                    <label className="text-[11px] text-slate uppercase tracking-wider font-semibold block mb-1">State</label>
                                    <input
                                        type="text"
                                        placeholder="CA"
                                        value={state}
                                        maxLength={2}
                                        onChange={(e) => {
                                            setState(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""));
                                            setAccountError("");
                                        }}
                                        className="w-full rounded-md border border-edge bg-surface px-3 py-1.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-blue uppercase"
                                    />
                                </div>

                                <div className="col-span-1">
                                    <label className="text-[11px] text-slate uppercase tracking-wider font-semibold block mb-1">ZIP</label>
                                    <input
                                        type="text"
                                        placeholder="95112"
                                        value={zip}
                                        maxLength={5}
                                        onChange={(e) => {
                                            setZip(e.target.value.replace(/\D/g, "").slice(0, 5));
                                            setAccountError("");
                                        }}
                                        className="w-full rounded-md border border-edge bg-surface px-3 py-1.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-blue"
                                    />
                                </div>
                            </div>

                            {accountError && <p className="text-[11px] text-red-500 font-medium leading-normal">{accountError}</p>}

                            <div className="flex items-center gap-2 pt-1">
                                <button type="submit" className="rounded-md bg-blue px-3 py-1 text-xs font-semibold text-white hover:bg-blue-dark">Save</button>
                                <button type="button" onClick={handleCancelAccountDetails} className="rounded-md border border-edge px-3 py-1 text-xs font-semibold text-slate hover:bg-surface">Cancel</button>
                            </div>
                        </form>
                    ) : (
                        <div className="pt-4 border-t border-edge space-y-3">
                            <div>
                                <p className="text-[11px] text-slate uppercase tracking-wider font-semibold">Phone</p>
                                <p className="text-xs font-medium text-ink">{phone || "Phone number not added"}</p>
                            </div>

                            <div>
                                <p className="text-[11px] text-slate uppercase tracking-wider font-semibold">Billing Address</p>
                                <p className="text-xs font-medium text-ink leading-relaxed">{fullAddressFormatted || "Billing address not added"}</p>
                            </div>
                        </div>
                    )}
                </div>

                {!isEditingAccount && (
                    <div className="pt-6">
                        <button type="button" onClick={() => setIsEditingAccount(true)} className="text-xs font-semibold text-blue hover:text-blue-dark transition-colors inline-flex items-center gap-1">
                            Edit details &rarr;
                        </button>
                    </div>
                )}
            </div>

            {/* 2. Rewards Card */}
            <div className="flex flex-col justify-between rounded-2xl border border-edge bg-surface p-6 shadow-sm">
                <div className="space-y-4">
                    <h2 className="font-serif text-[32px] leading-9 font-bold text-ink">Rewards</h2>

                    <div className="pt-1">
                        <p className="font-serif text-[32px] leading-9 font-bold tracking-tight text-ink">
                            {pointsNumber(pointsBalance)} <span className="font-sans text-lg font-semibold">points</span>
                        </p>
                        <p className="text-xs text-slate mt-1">available</p>
                    </div>

                    <p className="text-xs text-slate pt-4 border-t border-edge leading-relaxed">
                        See your points balance, rewards and recent activity.
                    </p>
                </div>

                <div className="pt-6">
                    <Link
                        href={PAGE_ROUTES.REWARDS}
                        className="text-xs font-semibold text-blue hover:text-blue-dark transition-colors inline-flex items-center gap-1"
                    >
                        View rewards &rarr;
                    </Link>
                </div>
            </div>

            {/* 3. Payment Methods Card */}
            <div id="payment-methods" className="flex scroll-mt-6 flex-col justify-between rounded-2xl border border-edge bg-surface p-6 shadow-sm">
                <div className="space-y-5">
                    <h2 className="font-serif text-[32px] leading-9 font-bold text-ink">Payment methods</h2>

                    {isAddingCard ? (
                        <form onSubmit={handleAddCardSubmit} className="space-y-3 rounded-xl border border-edge bg-paper/50 p-3.5">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold text-ink">Add New Card</p>
                                <span className="text-[11px] font-bold text-blue-dark">{detectedBrand}</span>
                            </div>

                            <div>
                                <input
                                    type="text"
                                    placeholder="Card Number"
                                    value={cardNumber}
                                    onChange={handleCardNumberChange}
                                    className="w-full rounded-md border border-edge bg-surface px-3 py-1.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-blue"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="text"
                                    placeholder="MM/YY"
                                    value={expiry}
                                    onChange={handleExpiryChange}
                                    className="w-full rounded-md border border-edge bg-surface px-3 py-1.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-blue"
                                    required
                                />
                                <input
                                    type="text"
                                    placeholder={detectedBrand === "Amex" ? "CVC (4 digits)" : "CVC (3 digits)"}
                                    value={cvc}
                                    onChange={handleCvcChange}
                                    className="w-full rounded-md border border-edge bg-surface px-3 py-1.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-blue"
                                    required
                                />
                            </div>

                            {cardError && <p className="text-[11px] text-red-500 font-medium">{cardError}</p>}

                            <div className="flex items-center gap-2 pt-1">
                                <button
                                    type="submit"
                                    disabled={savingCard}
                                    className="rounded-md bg-blue px-3 py-1 text-xs font-semibold text-white hover:bg-blue-dark disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {savingCard ? "Saving…" : "Save Card"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsAddingCard(false);
                                        setCardError("");
                                    }}
                                    className="rounded-md border border-edge px-3 py-1 text-xs font-semibold text-slate hover:bg-surface"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-3">
                            {loading ? (
                                <p className="text-xs text-slate py-2">Loading payment methods...</p>
                            ) : listError ? (
                                <p role="alert" className="text-[11px] text-danger font-medium py-2">{listError}</p>
                            ) : paymentMethods.length > 0 ? (
                                paymentMethods.map((pm) => (
                                    <div
                                        key={pm.id}
                                        className="flex items-center justify-between rounded-xl border border-edge bg-surface py-3.5 px-4"
                                    >
                                        <div className="flex items-center gap-6">
                                            <span className="text-xs font-bold text-blue-dark shrink-0">{pm.brand}</span>
                                            <div>
                                                <p className="font-semibold text-ink text-xs">
                                                    {pm.brand} •••• {pm.last4}
                                                </p>
                                                <p className="text-[11px] text-slate mt-0.5">
                                                    Expires {pm.expMonth}/{pm.expYear}
                                                    {cardExpired(Number(pm.expMonth), Number(pm.expYear), todayISO()) && <span className="ml-2"><Tag>Expired</Tag></span>}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => openRemoveDialog(pm)}
                                            aria-label={`Remove ${pm.brand} ending in ${pm.last4}`}
                                            className="text-xs font-semibold text-blue hover:text-blue-dark transition-colors"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-slate italic py-2">No payment methods saved yet.</p>
                            )}
                        </div>
                    )}
                </div>

                {!isAddingCard && (
                    <div className="pt-6">
                        <button
                            type="button"
                            onClick={() => {
                                setIsAddingCard(true);
                                setCardError("");
                            }}
                            className="text-xs font-semibold text-blue hover:text-blue-dark transition-colors inline-flex items-center gap-1"
                        >
                            Manage payment methods &rarr;
                        </button>
                    </div>
                )}
            </div>

            {/* A native <dialog> opened with showModal(), like the cancel booking dialog */}
            <dialog
                ref={removeDialogRef}
                aria-labelledby={removeTitleId}
                onClose={() => setRemoving(null)}
                className="m-auto w-[min(30rem,calc(100%-2rem))] rounded-lg border border-edge bg-surface p-6 text-ink shadow-[0_18px_50px_-30px_rgba(7,13,47,0.4)] backdrop:bg-disabled/90 dark:backdrop:bg-black/60"
            >
                <h2 id={removeTitleId} className="text-xl font-semibold">Remove this card?</h2>
                <p className="mt-2 text-slate">
                    {removing ? `${removing.brand} ending in ${removing.last4} won’t be offered at checkout anymore.` : ""}
                </p>
                {removeError && <p role="alert" className="mt-3 text-sm font-medium text-danger">{removeError}</p>}
                <div className="mt-6 flex flex-wrap gap-3">
                    <Button onClick={() => removeDialogRef.current?.close()} aria-disabled={removePending || undefined}>
                        Keep card
                    </Button>
                    <Button variant="secondary" onClick={handleRemoveCard} loading={removePending}>
                        Remove card
                    </Button>
                </div>
            </dialog>

            {/* 4. Transaction History Card */}
            <div className="flex flex-col justify-between rounded-2xl border border-edge bg-surface p-6 shadow-sm">
                <div className="space-y-5">
                    <h2 className="font-serif text-[32px] leading-9 font-bold text-ink">Transaction history</h2>

                    {transactions.length > 0 ? (
                        <div className="space-y-3.5">
                            {transactions.map((tx) => (
                                <div
                                    key={tx.id}
                                    className="flex items-center justify-between border-b border-edge/60 pb-3 last:border-b-0 last:pb-0"
                                >
                                    <div className="flex items-center gap-3.5 min-w-0">
                                        {tx.image && (
                                            <img
                                                src={tx.image}
                                                alt={tx.title}
                                                className="h-10 w-14 shrink-0 rounded-lg object-cover bg-paper border border-edge"
                                            />
                                        )}
                                        <div className="min-w-0">
                                            <p className="font-semibold text-ink text-xs truncate">{tx.title}</p>
                                            <p className="text-slate text-[11px] mt-0.5 truncate">{tx.subtitle}</p>
                                        </div>
                                    </div>

                                    <div className="text-right shrink-0 pl-2">
                                        <p className="font-semibold text-ink text-xs">Amount</p>
                                        <p className="text-[11px] text-slate font-medium mt-0.5">{tx.status}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-slate py-4 italic">No transaction history found.</p>
                    )}
                </div>

                <div className="pt-6">
                    <button
                        type="button"
                        onClick={() => setShowAllTransactions(true)}
                        className="text-xs font-semibold text-blue hover:text-blue-dark transition-colors inline-flex items-center gap-1"
                    >
                        View all transactions &rarr;
                    </button>
                </div>
            </div>

            {/* Transactions Modal */}
            {showAllTransactions && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="w-full max-w-lg rounded-2xl border border-edge bg-surface p-6 shadow-xl space-y-5">
                        <div className="flex items-center justify-between border-b border-edge pb-3">
                            <h3 className="font-serif text-2xl font-bold text-ink">Transaction history</h3>
                            <button
                                type="button"
                                onClick={() => setShowAllTransactions(false)}
                                className="text-slate hover:text-ink text-sm font-semibold"
                            >
                                ✕
                            </button>
                        </div>

                        {transactions.length > 0 ? (
                            <div className="max-h-80 overflow-y-auto space-y-3.5 pr-1">
                                {transactions.map((tx) => (
                                    <div
                                        key={tx.id}
                                        className="flex items-center justify-between border-b border-edge/60 pb-3 last:border-b-0 last:pb-0"
                                    >
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            {tx.image && (
                                                <img
                                                    src={tx.image}
                                                    alt={tx.title}
                                                    className="h-10 w-14 shrink-0 rounded-lg object-cover bg-paper border border-edge"
                                                />
                                            )}
                                            <div className="min-w-0">
                                                <p className="font-semibold text-ink text-xs truncate">{tx.title}</p>
                                                <p className="text-slate text-[11px] mt-0.5 truncate">{tx.subtitle}</p>
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0 pl-2">
                                            <p className="font-semibold text-ink text-xs">Amount</p>
                                            <p className="text-[11px] text-slate font-medium mt-0.5">{tx.status}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-slate py-4 italic">No transactions found.</p>
                        )}

                        <div className="pt-2 text-right border-t border-edge">
                            <button
                                type="button"
                                onClick={() => setShowAllTransactions(false)}
                                className="rounded-md border border-edge px-4 py-1.5 text-xs font-semibold text-slate hover:bg-paper"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}