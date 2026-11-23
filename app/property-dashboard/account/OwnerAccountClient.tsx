"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { EMPTY_OWNER_ACCOUNT, type OwnerAccountData } from "./mock-data";

interface OwnerAccountClientProps {
    name: string;
    email: string;
    listingCount: number;
    isSample?: boolean;
    initialData?: OwnerAccountData;
}

const MAX_BUSINESS_NAME = 80;
const MAX_EMAIL = 100;
const PHONE_DIGIT_LIMIT = 10;

function formatUSPhone(raw: string): string {
    const digits = raw.replace(/\D/g, "").slice(0, PHONE_DIGIT_LIMIT);
    if (digits.length > 6) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    if (digits.length > 3) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    }
    return digits;
}

function isValidEmail(val: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
}

function isValidRoutingNumber(routing: string): boolean {
    if (!/^\d{9}$/.test(routing)) return false;
    const d = routing.split("").map(Number);
    const checksum =
        3 * (d[0] + d[3] + d[6]) +
        7 * (d[1] + d[4] + d[7]) +
        1 * (d[2] + d[5] + d[8]);
    return checksum > 0 && checksum % 10 === 0;
}

export function OwnerAccountClient({
                                       name,
                                       email,
                                       listingCount,
                                       isSample = false,
                                       initialData = EMPTY_OWNER_ACCOUNT,
                                   }: OwnerAccountClientProps) {
    const supabase = createClient();
    const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);
    const [savingSection, setSavingSection] = useState<string | null>(null);

    const [isEditingPersonal, setIsEditingPersonal] = useState(false);
    const [phone, setPhone] = useState(initialData.phone);
    const [draftPhone, setDraftPhone] = useState(initialData.phone);
    const [passwordSent, setPasswordSent] = useState(false);

    const [businessName, setBusinessName] = useState(initialData.businessName);
    const [contactEmail, setContactEmail] = useState(initialData.contactEmail);
    const [contactPhone, setContactPhone] = useState(initialData.contactPhone);
    const [savedBusinessSnapshot, setSavedBusinessSnapshot] = useState({
        businessName: initialData.businessName,
        contactEmail: initialData.contactEmail,
        contactPhone: initialData.contactPhone,
    });

    const [isEditingPayout, setIsEditingPayout] = useState(false);
    const [bankLast4, setBankLast4] = useState(initialData.bankLast4);
    const [routingNumber, setRoutingNumber] = useState("");
    const [accountNumber, setAccountNumber] = useState("");

    const [resEmail, setResEmail] = useState(initialData.resEmail);
    const [resSms, setResSms] = useState(initialData.resSms);
    const [payEmail, setPayEmail] = useState(initialData.payEmail);
    const [paySms, setPaySms] = useState(initialData.paySms);
    const [savedPrefsSnapshot, setSavedPrefsSnapshot] = useState({
        resEmail: initialData.resEmail,
        resSms: initialData.resSms,
        payEmail: initialData.payEmail,
        paySms: initialData.paySms,
    });

    const initials = name
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

    function notify(text: string, type: "ok" | "err" = "ok") {
        setToast({ type, text });
        setTimeout(() => setToast(null), 4500);
    }

    useEffect(() => {
        if (isSample) {
            setPhone(initialData.phone);
            setDraftPhone(initialData.phone);
            setBusinessName(initialData.businessName);
            setContactEmail(initialData.contactEmail);
            setContactPhone(initialData.contactPhone);
            setSavedBusinessSnapshot({
                businessName: initialData.businessName,
                contactEmail: initialData.contactEmail,
                contactPhone: initialData.contactPhone,
            });
            setBankLast4(initialData.bankLast4);
            setResEmail(initialData.resEmail);
            setResSms(initialData.resSms);
            setPayEmail(initialData.payEmail);
            setPaySms(initialData.paySms);
            setSavedPrefsSnapshot({
                resEmail: initialData.resEmail,
                resSms: initialData.resSms,
                payEmail: initialData.payEmail,
                paySms: initialData.paySms,
            });
            return;
        }

        async function loadOwnerSettings() {
            try {
                const saved = JSON.parse(
                    localStorage.getItem("likehome_owner_account") || "{}"
                );
                const loadedPhone = saved.phone ?? "";
                const loadedBiz = {
                    businessName: saved.businessName ?? "",
                    contactEmail: saved.contactEmail ?? "",
                    contactPhone: saved.contactPhone ?? "",
                };
                const loadedPrefs = {
                    resEmail: typeof saved.resEmail === "boolean" ? saved.resEmail : true,
                    resSms: typeof saved.resSms === "boolean" ? saved.resSms : false,
                    payEmail: typeof saved.payEmail === "boolean" ? saved.payEmail : true,
                    paySms: typeof saved.paySms === "boolean" ? saved.paySms : false,
                };

                setPhone(loadedPhone);
                setDraftPhone(loadedPhone);
                setBusinessName(loadedBiz.businessName);
                setContactEmail(loadedBiz.contactEmail);
                setContactPhone(loadedBiz.contactPhone);
                setSavedBusinessSnapshot(loadedBiz);
                setBankLast4(saved.bankLast4 ?? "4218");
                setResEmail(loadedPrefs.resEmail);
                setResSms(loadedPrefs.resSms);
                setPayEmail(loadedPrefs.payEmail);
                setPaySms(loadedPrefs.paySms);
                setSavedPrefsSnapshot(loadedPrefs);
            } catch (e) {
                console.error("Failed to read local owner account settings", e);
            }

            try {
                const {
                    data: { user },
                } = await supabase.auth.getUser();

                if (user) {
                    const { data, error } = await supabase
                        .from("profiles")
                        .select("phone, business_name, contact_email, contact_phone")
                        .eq("id", user.id)
                        .single();

                    if (!error && data) {
                        if (data.phone) {
                            setPhone(data.phone);
                            setDraftPhone(data.phone);
                        }
                        const supaBiz = {
                            businessName: data.business_name ?? "",
                            contactEmail: data.contact_email ?? "",
                            contactPhone: data.contact_phone ?? "",
                        };
                        setBusinessName(supaBiz.businessName);
                        setContactEmail(supaBiz.contactEmail);
                        setContactPhone(supaBiz.contactPhone);
                        setSavedBusinessSnapshot(supaBiz);
                    }
                }
            } catch {
                // Stay on graceful fallback
            }
        }

        loadOwnerSettings();
    }, [initialData, isSample, supabase]);

    function persistLocal(patch: Record<string, unknown>) {
        if (isSample) return;
        try {
            const current = JSON.parse(
                localStorage.getItem("likehome_owner_account") || "{}"
            );
            localStorage.setItem(
                "likehome_owner_account",
                JSON.stringify({ ...current, ...patch })
            );
        } catch (e) {
            console.error("Local write error", e);
        }
    }

    async function handleSavePersonal(e: React.FormEvent) {
        e.preventDefault();
        if (savingSection) return;

        const digits = draftPhone.replace(/\D/g, "");
        if (digits.length > 0 && digits.length !== PHONE_DIGIT_LIMIT) {
            notify("Please enter a complete 10-digit phone number.", "err");
            return;
        }

        const formatted = digits.length === PHONE_DIGIT_LIMIT ? formatUSPhone(digits) : "";
        if (formatted === phone) {
            setIsEditingPersonal(false);
            notify("No changes to personal phone number.");
            return;
        }

        setSavingSection("personal");
        setPhone(formatted);
        setDraftPhone(formatted);
        setIsEditingPersonal(false);

        if (isSample) {
            setSavingSection(null);
            notify("Sample mode — preview updated (not saved).");
            return;
        }

        persistLocal({ phone: formatted });

        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (user) {
                await supabase.from("profiles").upsert({
                    id: user.id,
                    phone: formatted,
                    updated_at: new Date().toISOString(),
                });
            }
        } catch {
            // Graceful fallback
        }

        setSavingSection(null);
        notify("Personal phone number updated.");
    }

    async function handleSaveBusinessContacts(e: React.FormEvent) {
        e.preventDefault();
        if (savingSection) return;

        const cleanName = businessName.trim();
        const cleanEmail = contactEmail.trim();
        const phoneDigits = contactPhone.replace(/\D/g, "");
        const cleanPhone =
            phoneDigits.length === PHONE_DIGIT_LIMIT ? formatUSPhone(phoneDigits) : "";

        if (cleanName.length > MAX_BUSINESS_NAME) {
            notify(`Business name must be ${MAX_BUSINESS_NAME} characters or fewer.`, "err");
            return;
        }
        if (cleanEmail && !isValidEmail(cleanEmail)) {
            notify("Please enter a valid business contact email address.", "err");
            return;
        }
        if (phoneDigits.length > 0 && phoneDigits.length !== PHONE_DIGIT_LIMIT) {
            notify("Business contact phone must be a complete 10-digit number.", "err");
            return;
        }

        // Prevent duplicate no-op submission
        if (
            cleanName === savedBusinessSnapshot.businessName &&
            cleanEmail === savedBusinessSnapshot.contactEmail &&
            cleanPhone === savedBusinessSnapshot.contactPhone
        ) {
            notify("Business contact details are already up to date.");
            return;
        }

        setSavingSection("business");
        setBusinessName(cleanName);
        setContactEmail(cleanEmail);
        setContactPhone(cleanPhone);
        setSavedBusinessSnapshot({
            businessName: cleanName,
            contactEmail: cleanEmail,
            contactPhone: cleanPhone,
        });

        if (isSample) {
            setSavingSection(null);
            notify("Sample mode — preview updated (not saved).");
            return;
        }

        persistLocal({
            businessName: cleanName,
            contactEmail: cleanEmail,
            contactPhone: cleanPhone,
        });

        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (user) {
                await supabase.from("profiles").upsert({
                    id: user.id,
                    business_name: cleanName,
                    contact_email: cleanEmail,
                    contact_phone: cleanPhone,
                    updated_at: new Date().toISOString(),
                });
            }
        } catch {
            // Graceful fallback
        }

        setSavingSection(null);
        notify("Business contact details saved.");
    }

    function handleSavePayout(e: React.FormEvent) {
        e.preventDefault();
        if (savingSection) return;

        const cleanRouting = routingNumber.replace(/\D/g, "");
        const cleanAccount = accountNumber.replace(/\D/g, "");

        if (!isValidRoutingNumber(cleanRouting)) {
            notify("Please enter a valid 9-digit US bank routing number.", "err");
            return;
        }
        if (cleanAccount.length < 4 || cleanAccount.length > 17) {
            notify("Account number must be between 4 and 17 digits.", "err");
            return;
        }

        const last4 = cleanAccount.slice(-4);
        if (last4 === bankLast4) {
            notify(`Bank account ending in ${last4} is already set as default.`, "err");
            return;
        }

        setBankLast4(last4);
        persistLocal({ bankLast4: last4 });
        setRoutingNumber("");
        setAccountNumber("");
        setIsEditingPayout(false);
        notify(isSample ? "Sample mode — preview updated (not saved)." : "Payout bank account updated.");
    }

    async function handleSavePreferences() {
        if (savingSection) return;

        // Warn if SMS is enabled without a valid 10-digit personal phone number
        const phoneDigits = phone.replace(/\D/g, "");
        if ((resSms || paySms) && phoneDigits.length !== PHONE_DIGIT_LIMIT) {
            notify("Add a 10-digit phone number under Personal details to enable SMS alerts.", "err");
            return;
        }

        if (
            resEmail === savedPrefsSnapshot.resEmail &&
            resSms === savedPrefsSnapshot.resSms &&
            payEmail === savedPrefsSnapshot.payEmail &&
            paySms === savedPrefsSnapshot.paySms
        ) {
            notify("Notification preferences are already up to date.");
            return;
        }

        setSavedPrefsSnapshot({ resEmail, resSms, payEmail, paySms });

        if (isSample) {
            notify("Sample mode — preview updated (not saved).");
            return;
        }

        persistLocal({ resEmail, resSms, payEmail, paySms });
        notify("Notification preferences saved.");
    }

    const digitsOnly = phone.replace(/\D/g, "");
    const maskedPhone =
        digitsOnly.length === PHONE_DIGIT_LIMIT ? `••• ••• ${digitsOnly.slice(-4)}` : "Not added";

    const hasBusinessContacts = Boolean(
        businessName.trim() || contactEmail.trim() || contactPhone.trim()
    );

    return (
        <div className="space-y-4">
            {toast && (
                <div className="flex justify-end">
                    <p
                        role="status"
                        className={`rounded-control border px-3 py-1 text-xs font-semibold ${
                            toast.type === "err"
                                ? "border-red-300 bg-red-50 text-red-800"
                                : "border-blue/30 bg-blue/10 text-blue-dark"
                        }`}
                    >
                        {toast.text}
                    </p>
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
                <section className="flex flex-col justify-between rounded-2xl border border-edge bg-surface p-5">
                    <div className="space-y-3.5">
                        <div>
                            <h2 className="font-serif text-[22px] leading-7 text-ink">Personal details</h2>
                            <p className="text-xs text-slate">
                                Your private account and sign-in information.
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
              <span
                  aria-hidden
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-edge bg-paper text-xs font-semibold text-blue-dark"
              >
                {initials || "ON"}
              </span>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-ink">{name}</p>
                                <p className="text-xs text-slate">
                                    Property owner · {listingCount} {listingCount === 1 ? "listing" : "listings"}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2.5">
                            <div>
                                <p className="text-[11px] font-semibold text-slate">Email address</p>
                                <p className="text-xs font-semibold text-ink">{email}</p>
                            </div>

                            {isEditingPersonal ? (
                                <form onSubmit={handleSavePersonal} className="space-y-2">
                                    <div>
                                        <div className="mb-1 flex items-center justify-between">
                                            <label className="text-[11px] font-semibold text-slate">
                                                Phone number (10 digits)
                                            </label>
                                            <span className="text-[10px] text-slate">
                        {draftPhone.replace(/\D/g, "").length}/{PHONE_DIGIT_LIMIT}
                      </span>
                                        </div>
                                        <input
                                            type="tel"
                                            inputMode="numeric"
                                            maxLength={14}
                                            placeholder="(555) 000-0000"
                                            value={draftPhone}
                                            onChange={(e) => setDraftPhone(formatUSPhone(e.target.value))}
                                            className="w-full rounded-control border border-edge bg-surface px-3 py-1.5 text-xs text-ink focus:border-blue focus:outline-none"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="submit"
                                            disabled={savingSection === "personal"}
                                            className="rounded-control bg-blue px-3 py-1 text-xs font-semibold text-on-blue hover:bg-blue-dark disabled:opacity-50"
                                        >
                                            Save
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setDraftPhone(phone);
                                                setIsEditingPersonal(false);
                                            }}
                                            className="rounded-control border border-edge px-2.5 py-1 text-xs font-semibold text-slate hover:bg-paper"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div>
                                    <p className="text-[11px] font-semibold text-slate">Phone number</p>
                                    <p className="text-xs font-semibold text-ink">{maskedPhone}</p>
                                </div>
                            )}

                            <p className="text-[11px] leading-snug text-slate">
                                Your personal contact details are not displayed on your property listings.
                            </p>

                            {!isEditingPersonal && (
                                <div>
                                    <button
                                        type="button"
                                        onClick={() => setIsEditingPersonal(true)}
                                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue hover:text-blue-dark"
                                    >
                                        &rarr; Edit details
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-edge pt-3">
                        <div>
                            <p className="text-xs font-semibold text-ink">Password</p>
                            <p className="text-xs tracking-widest text-slate">••••••••••••</p>
                        </div>
                        <button
                            type="button"
                            disabled={passwordSent}
                            onClick={async () => {
                                setPasswordSent(true);
                                if (!isSample) {
                                    try {
                                        await supabase.auth.resetPasswordForEmail(email);
                                    } catch {
                                        // Ignore in demo
                                    }
                                }
                                notify(`Password reset link sent to ${email}.`);
                            }}
                            className="text-xs font-semibold text-blue hover:text-blue-dark disabled:opacity-60"
                        >
                            {passwordSent ? "Reset link sent" : "Change password"}
                        </button>
                    </div>
                </section>

                <section className="flex flex-col justify-between rounded-2xl border border-edge bg-surface p-5">
                    <form onSubmit={handleSaveBusinessContacts} className="flex h-full flex-col justify-between space-y-3.5">
                        <div className="space-y-3">
                            <div>
                                <h2 className="font-serif text-[22px] leading-7 text-ink">Business contacts</h2>
                                <p className="text-xs text-slate">
                                    Choose the details guests can use for property enquiries.
                                </p>
                            </div>

                            <div>
                                <div className="mb-1 flex items-center justify-between">
                                    <label className="text-xs font-semibold text-ink">
                                        Business or trading name
                                    </label>
                                    <span className="text-[10px] text-slate">
                    {businessName.length}/{MAX_BUSINESS_NAME}
                  </span>
                                </div>
                                <input
                                    type="text"
                                    maxLength={MAX_BUSINESS_NAME}
                                    placeholder="Add a business name (optional)"
                                    value={businessName}
                                    onChange={(e) => setBusinessName(e.target.value)}
                                    className="w-full rounded-control border border-edge bg-surface px-3 py-1.5 text-xs text-ink focus:border-blue focus:outline-none"
                                />
                            </div>

                            <div className="grid gap-2.5 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-ink">
                                        Contact email
                                    </label>
                                    <input
                                        type="email"
                                        maxLength={MAX_EMAIL}
                                        placeholder="Add email address"
                                        value={contactEmail}
                                        onChange={(e) => setContactEmail(e.target.value)}
                                        className="w-full rounded-control border border-edge bg-surface px-3 py-1.5 text-xs text-ink focus:border-blue focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <div className="mb-1 flex items-center justify-between">
                                        <label className="text-xs font-semibold text-ink">
                                            Contact phone
                                        </label>
                                        <span className="text-[10px] text-slate">
                      {contactPhone.replace(/\D/g, "").length}/{PHONE_DIGIT_LIMIT}
                    </span>
                                    </div>
                                    <input
                                        type="tel"
                                        inputMode="numeric"
                                        maxLength={14}
                                        placeholder="(555) 000-0000"
                                        value={contactPhone}
                                        onChange={(e) => setContactPhone(formatUSPhone(e.target.value))}
                                        className="w-full rounded-control border border-edge bg-surface px-3 py-1.5 text-xs text-ink focus:border-blue focus:outline-none"
                                    />
                                </div>
                            </div>

                            <p className="text-[11px] leading-snug text-slate">
                                {hasBusinessContacts
                                    ? "These business contacts are shown to guests on your active property listings."
                                    : "No business contact details added yet. These contacts are separate from your private sign-in details."}
                            </p>
                        </div>

                        <div className="flex items-center justify-between border-t border-edge pt-3">
              <span className="text-xs text-slate">
                Applies to {listingCount === 1 ? "1 property" : `all ${listingCount} properties`}
              </span>
                            <button
                                type="submit"
                                disabled={savingSection === "business"}
                                className="rounded-control bg-blue px-3.5 py-1.5 text-xs font-semibold text-on-blue hover:bg-blue-dark disabled:opacity-50"
                            >
                                Save contacts
                            </button>
                        </div>
                    </form>
                </section>
            </div>

            <section className="space-y-3 rounded-2xl border border-edge bg-surface p-5">
                <div>
                    <h2 className="font-serif text-[22px] leading-7 text-ink">Payout method</h2>
                    <p className="text-xs text-slate">
                        Where your property earnings are sent.
                    </p>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-edge bg-surface px-3.5 py-2.5">
                    <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-edge bg-paper text-blue-dark">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M3 10l9-6 9 6M4 10h16v9H4v-9zM8 14v5M12 14v5M16 14v5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
                        <div>
                            <p className="text-xs font-semibold text-ink">
                                Bank account •••• {bankLast4}
                            </p>
                            <p className="text-[11px] text-slate">{name} · USD</p>
                        </div>
                    </div>

                    <span className="rounded-control border border-edge bg-paper px-2 py-0.5 text-[11px] font-medium text-slate">
            Default
          </span>
                </div>

                {isEditingPayout && (
                    <form onSubmit={handleSavePayout} className="grid gap-2.5 rounded-xl border border-edge bg-paper/60 p-3.5 sm:grid-cols-3">
                        <div>
                            <div className="mb-1 flex items-center justify-between">
                                <label className="text-[11px] font-semibold text-ink">
                                    Routing number
                                </label>
                                <span className="text-[10px] text-slate">{routingNumber.length}/9</span>
                            </div>
                            <input
                                type="text"
                                inputMode="numeric"
                                required
                                placeholder="121000358"
                                maxLength={9}
                                value={routingNumber}
                                onChange={(e) => setRoutingNumber(e.target.value.replace(/\D/g, "").slice(0, 9))}
                                className="w-full rounded-control border border-edge bg-surface px-3 py-1.5 text-xs text-ink focus:border-blue focus:outline-none"
                            />
                        </div>
                        <div>
                            <div className="mb-1 flex items-center justify-between">
                                <label className="text-[11px] font-semibold text-ink">
                                    Account number
                                </label>
                                <span className="text-[10px] text-slate">{accountNumber.length}/17</span>
                            </div>
                            <input
                                type="text"
                                inputMode="numeric"
                                required
                                placeholder="000123456789"
                                maxLength={17}
                                value={accountNumber}
                                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 17))}
                                className="w-full rounded-control border border-edge bg-surface px-3 py-1.5 text-xs text-ink focus:border-blue focus:outline-none"
                            />
                        </div>
                        <div className="flex items-end gap-2">
                            <button
                                type="submit"
                                className="rounded-control bg-blue px-3 py-1.5 text-xs font-semibold text-on-blue hover:bg-blue-dark"
                            >
                                Update bank
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setRoutingNumber("");
                                    setAccountNumber("");
                                    setIsEditingPayout(false);
                                }}
                                className="rounded-control border border-edge bg-surface px-2.5 py-1.5 text-xs font-semibold text-slate hover:bg-paper"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-xs">
                    <div className="flex flex-wrap items-center gap-4">
                        <button
                            type="button"
                            onClick={() => setIsEditingPayout((prev) => !prev)}
                            className="inline-flex items-center gap-1 font-semibold text-blue hover:text-blue-dark"
                        >
                            &rarr; Manage payout settings
                        </button>
                        <Link
                            href="/property-dashboard/customers"
                            className="font-semibold text-blue hover:text-blue-dark"
                        >
                            View customer payments &amp; reservations
                        </Link>
                    </div>
                    <span className="text-[11px] text-slate">
            Sensitive bank details are kept private.
          </span>
                </div>
            </section>

            <section className="space-y-3.5 rounded-2xl border border-edge bg-surface p-5">
                <div>
                    <h2 className="font-serif text-[22px] leading-7 text-ink">
                        Notification preferences
                    </h2>
                    <p className="text-xs text-slate">
                        Choose how you hear about activity across your properties.
                    </p>
                </div>

                <div className="overflow-x-auto">
                    <div className="min-w-[440px] divide-y divide-edge">
                        <div className="grid grid-cols-[minmax(0,1fr)_80px_80px] pb-1.5 text-[11px] font-semibold text-slate">
                            <span>Owner updates</span>
                            <span className="text-center">Email</span>
                            <span className="text-center">SMS</span>
                        </div>

                        <div className="grid grid-cols-[minmax(0,1fr)_80px_80px] items-center py-3">
                            <div>
                                <p className="text-xs font-semibold text-ink">Reservations</p>
                                <p className="text-[11px] text-slate">
                                    New bookings, guest changes and arrival reminders.
                                </p>
                            </div>
                            <div className="flex justify-center">
                                <ToggleSwitch
                                    checked={resEmail}
                                    onChange={setResEmail}
                                    label="Reservation email notifications"
                                />
                            </div>
                            <div className="flex justify-center">
                                <ToggleSwitch
                                    checked={resSms}
                                    onChange={setResSms}
                                    label="Reservation SMS notifications"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-[minmax(0,1fr)_80px_80px] items-center py-3">
                            <div>
                                <p className="text-xs font-semibold text-ink">Payouts</p>
                                <p className="text-[11px] text-slate">
                                    Scheduled payouts, completed transfers and payment issues.
                                </p>
                            </div>
                            <div className="flex justify-center">
                                <ToggleSwitch
                                    checked={payEmail}
                                    onChange={setPayEmail}
                                    label="Payout email notifications"
                                />
                            </div>
                            <div className="flex justify-center">
                                <ToggleSwitch
                                    checked={paySms}
                                    onChange={setPaySms}
                                    label="Payout SMS notifications"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-edge pt-3">
                    <p className="text-[11px] text-slate">
                        Essential security and account messages are always sent by email. SMS uses your account phone number.
                    </p>
                    <button
                        type="button"
                        onClick={handleSavePreferences}
                        className="rounded-control bg-blue px-3.5 py-1.5 text-xs font-semibold text-on-blue hover:bg-blue-dark"
                    >
                        Save preferences
                    </button>
                </div>
            </section>
        </div>
    );
}

function ToggleSwitch({
                          checked,
                          onChange,
                          label,
                      }: {
    checked: boolean;
    onChange: (val: boolean) => void;
    label: string;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            onClick={() => onChange(!checked)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate"
        >
      <span
          className={`relative inline-flex h-4 w-8 shrink-0 items-center rounded-full transition-colors ${
              checked ? "bg-blue" : "bg-edge"
          }`}
      >
        <span
            className={`inline-block h-3 w-3 rounded-full bg-surface transition-transform ${
                checked ? "translate-x-4" : "translate-x-0.5"
            }`}
        />
      </span>
            <span className="w-5 text-left text-[11px]">{checked ? "On" : "Off"}</span>
        </button>
    );
}