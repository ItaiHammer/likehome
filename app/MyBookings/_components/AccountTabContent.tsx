"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export interface PaymentMethod {
    id: string;
    brand: "Visa" | "Mastercard" | "Amex" | "Discover" | "Card";
    last4: string;
    expMonth: string;
    expYear: string;
    isDefault?: boolean;
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
}

const VALID_STREET_ENDINGS = [
    "st", "street", "ave", "avenue", "blvd", "boulevard",
    "ct", "court", "rd", "road", "dr", "drive", "ln", "lane",
    "way", "pl", "place", "pkwy", "parkway", "cir", "circle", "ter", "terrace"
];

export function AccountTabContent({
                                      name,
                                      email,
                                      transactions = [],
                                  }: AccountTabContentProps) {
    const supabase = createClient();

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

    // Transaction history modal
    const [showAllTransactions, setShowAllTransactions] = useState(false);

    useEffect(() => {
        async function loadAccountData() {
            setLoading(true);
            let fetchedCards: PaymentMethod[] = [];

            // Load profile from localStorage first for immediate rendering
            try {
                const localProfile = JSON.parse(localStorage.getItem("likehome_user_profile") || "{}");
                if (localProfile.phone) setPhone(localProfile.phone);
                if (localProfile.street) setStreet(localProfile.street);
                if (localProfile.city) setCity(localProfile.city);
                if (localProfile.state) setState(localProfile.state);
                if (localProfile.zip) setZip(localProfile.zip);
            } catch (e) {
                console.error("Local profile read error", e);
            }

            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (user) {
                // Fetch profile details from Supabase
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("phone, street, city, state, zip")
                    .eq("id", user.id)
                    .single();

                if (profile) {
                    const fetchedPhone = profile.phone || "";
                    const fetchedStreet = profile.street || "";
                    const fetchedCity = profile.city || "";
                    const fetchedState = profile.state || "";
                    const fetchedZip = profile.zip || "";

                    setPhone(fetchedPhone);
                    setStreet(fetchedStreet);
                    setCity(fetchedCity);
                    setState(fetchedState);
                    setZip(fetchedZip);

                    setSavedPhone(fetchedPhone);
                    setSavedStreet(fetchedStreet);
                    setSavedCity(fetchedCity);
                    setSavedState(fetchedState);
                    setSavedZip(fetchedZip);
                }

                // Fetch saved payment methods from Supabase
                const { data: pms } = await supabase
                    .from("payment_methods")
                    .select("id, brand, last4, exp_month, exp_year, is_default")
                    .eq("user_id", user.id)
                    .order("created_at", { ascending: true });

                if (pms && pms.length > 0) {
                    fetchedCards = pms.map((pm) => ({
                        id: pm.id,
                        brand: pm.brand as PaymentMethod["brand"],
                        last4: pm.last4,
                        expMonth: pm.exp_month,
                        expYear: pm.exp_year,
                        isDefault: pm.is_default,
                    }));
                }
            }

            // Fallback / merge cards stored in localStorage
            try {
                const localCards: PaymentMethod[] = JSON.parse(
                    localStorage.getItem("likehome_saved_cards") || "[]"
                );
                const existingLast4 = new Set(fetchedCards.map((c) => c.last4));
                for (const lc of localCards) {
                    if (!existingLast4.has(lc.last4)) {
                        fetchedCards.push(lc);
                    }
                }
            } catch (e) {
                console.error("Local cards read error", e);
            }

            setPaymentMethods(fetchedCards);
            setLoading(false);
        }

        loadAccountData();
    }, [supabase]);

    const getCardBrand = (num: string): PaymentMethod["brand"] => {
        const clean = num.replace(/\D/g, "");
        if (/^4/.test(clean)) return "Visa";
        if (/^(5[1-5]|2[2-7])/.test(clean)) return "Mastercard";
        if (/^3[47]/.test(clean)) return "Amex";
        if (/^(6011|65|64[4-9])/.test(clean)) return "Discover";
        return "Card";
    };

    const detectedBrand = getCardBrand(cardNumber);

    const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const digits = e.target.value.replace(/\D/g, "");
        const brand = getCardBrand(digits);
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

    const validateLuhn = (num: string) => {
        const clean = num.replace(/\D/g, "");
        let sum = 0;
        let shouldDouble = false;
        for (let i = clean.length - 1; i >= 0; i--) {
            let digit = parseInt(clean.charAt(i), 10);
            if (shouldDouble) {
                digit *= 2;
                if (digit > 9) digit -= 9;
            }
            sum += digit;
            shouldDouble = !shouldDouble;
        }
        return sum % 10 === 0;
    };

    const handleAddCardSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const rawDigits = cardNumber.replace(/\D/g, "");
        const brand = getCardBrand(rawDigits);
        const requiredDigits = brand === "Amex" ? 15 : 16;

        if (rawDigits.length !== requiredDigits) {
            setCardError(`Please enter a valid ${brand === "Amex" ? "15" : "16"}-digit card number.`);
            return;
        }

        if (!validateLuhn(rawDigits)) {
            setCardError("Invalid card number. Please check for typos.");
            return;
        }

        const [monthStr = "", yearStr = ""] = expiry.split("/");
        const month = parseInt(monthStr, 10);
        if (!monthStr || month < 1 || month > 12 || expiry.length < 5) {
            setCardError("Please enter a valid expiration date (MM/YY).");
            return;
        }

        const requiredCvcLen = brand === "Amex" ? 4 : 3;
        if (cvc.length !== requiredCvcLen) {
            setCardError(`CVC must be ${requiredCvcLen} digits for ${brand}.`);
            return;
        }

        const last4 = rawDigits.slice(-4);
        const expMonth = monthStr.padStart(2, "0");
        const expYear = `20${yearStr}`;
        const isDefault = paymentMethods.length === 0;

        const newCardObj: PaymentMethod = {
            id: `card_${Date.now()}`,
            brand,
            last4,
            expMonth,
            expYear,
            isDefault,
        };

        try {
            const localCards = JSON.parse(localStorage.getItem("likehome_saved_cards") || "[]");
            localStorage.setItem("likehome_saved_cards", JSON.stringify([...localCards, newCardObj]));
        } catch (err) {
            console.error("Failed to write to localStorage", err);
        }

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (user) {
            await supabase.from("payment_methods").insert({
                user_id: user.id,
                brand,
                last4,
                exp_month: expMonth,
                exp_year: expYear,
                is_default: isDefault,
            });
        }

        setPaymentMethods([...paymentMethods, newCardObj]);
        setCardNumber("");
        setExpiry("");
        setCvc("");
        setCardError("");
        setIsAddingCard(false);
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

        try {
            const profileData = { phone, street, city, state, zip };
            localStorage.setItem("likehome_user_profile", JSON.stringify(profileData));
        } catch (e) {
            console.error("Local profile write error", e);
        }

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (user) {
            const { error } = await supabase.from("profiles").upsert({
                id: user.id,
                phone,
                street,
                city,
                state,
                zip,
                updated_at: new Date().toISOString(),
            });

            if (error) {
                console.error("Supabase Profile Upsert Error:", error);
                setAccountError(`Saved locally. Supabase Error: ${error.message}`);
                return;
            }
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
                            0 <span className="font-sans text-lg font-semibold">points</span>
                        </p>
                        <p className="text-xs text-slate mt-1">available</p>
                    </div>

                    <p className="text-xs text-slate pt-4 border-t border-edge leading-relaxed">
                        See your points balance, rewards and recent activity.
                    </p>
                </div>

                <div className="pt-6">
                    <button
                        type="button"
                        className="text-xs font-semibold text-blue hover:text-blue-dark transition-colors inline-flex items-center gap-1"
                    >
                        View rewards &rarr;
                    </button>
                </div>
            </div>

            {/* 3. Payment Methods Card */}
            <div className="flex flex-col justify-between rounded-2xl border border-edge bg-surface p-6 shadow-sm">
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
                                    className="rounded-md bg-blue px-3 py-1 text-xs font-semibold text-white hover:bg-blue-dark"
                                >
                                    Save Card
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
                                                </p>
                                            </div>
                                        </div>
                                        {pm.isDefault && (
                                            <span className="rounded-md border border-edge bg-paper px-2.5 py-1 text-[10px] font-medium text-slate">
                                              Default
                                            </span>
                                        )}
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