"use client";

import {useEffect, useMemo, useState, type FormEvent} from "react";
import {
    previewProperties,
    previewRecipientsByHotel,
    previewSentMessages,
} from "./mockOwnerMessages";
import Link from "next/link";
import {PropertyPicker} from "../_components/PropertyPicker";

export interface Message {
    id: string;
    hotel_id: string;
    recipient_id: string;
    subject: string;
    body: string;
    read_at: string | null;
    created_at: string;
    hotels?: { name: string };
}

export interface HotelRecipient {
    account_id: string;
    email: string;
    full_name: string;
    last_check_in: string | null;
    last_status: string | null;
}

type Hotel = { id: string; name: string };
type View = "sent" | "compose";
type ReadFilter = "all" | "read" | "unread";

type RecipientRow = {
    key: string;
    hotelId: string;
    hotelName: string;
    person: HotelRecipient;
};

const PAGE_SIZE = 10;

const card = "rounded-lg border border-edge bg-surface";

const button =
    "rounded-control border border-edge bg-surface px-3 py-1.5 text-sm text-ink transition-colors hover:bg-blue/5 focus-visible:outline-2 focus-visible:outline-blue disabled:cursor-not-allowed disabled:opacity-40";

const tab =
    "rounded-control border border-edge bg-surface px-4 py-2 text-sm text-ink transition-colors hover:bg-blue/5 focus-visible:outline-2 focus-visible:outline-blue";

const primary =
    "rounded-control border border-blue bg-blue px-4 py-2 text-sm text-on-blue transition-colors hover:bg-blue-dark focus-visible:outline-2 focus-visible:outline-blue disabled:cursor-not-allowed disabled:opacity-40";

const input =
    "w-full rounded-control border border-edge bg-surface px-3 py-2.5 font-sans text-sm text-ink placeholder:text-slate focus-visible:outline-2 focus-visible:outline-blue";

function timestamp(value: string) {
    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? value
        : new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
        }).format(date);
}

function shortTime(value: string, now: number) {
    const created = new Date(value).getTime();

    if (Number.isNaN(created)) return "—";

    const minutes = Math.max(
        0,
        Math.floor((now - created) / 60000)
    );

    if (minutes < 1) return "now";
    if (minutes < 60) return `${minutes}m`;

    const hours = Math.floor(minutes / 60);

    if (hours < 24) return `${hours}h`;

    const days = Math.floor(hours / 24);

    if (days < 7) return `${days}d`;
    if (days < 30) return `${Math.floor(days / 7)}w`;
    if (days < 365) return `${Math.floor(days / 30)}mo`;

    return `${Math.floor(days / 365)}y`;
}

function pageItems(
    current: number,
    count: number
): Array<number | "dots"> {
    if (count <= 5) {
        return Array.from(
            {length: count},
            (_, i) => i + 1
        );
    }

    const numbers = [
        ...new Set(
            [1, current - 1, current, current + 1, count]
                .filter((n) => n >= 1 && n <= count)
        ),
    ].sort((a, b) => a - b);

    const result: Array<number | "dots"> = [];

    numbers.forEach((n, i) => {
        if (i > 0 && n - numbers[i - 1] > 1) {
            result.push("dots");
        }

        result.push(n);
    });

    return result;
}

function Pagination({
                        page,
                        pages,
                        onChange,
                    }: {
    page: number;
    pages: number;
    onChange: (page: number) => void;
}) {
    if (pages <= 1) return null;

    return (
        <nav
            aria-label="Sent message pages"
            className="flex flex-wrap items-center justify-center gap-1.5 border-t border-edge px-5 py-4 text-sm"
        >
            <button
                type="button"
                className={button}
                disabled={page === 1}
                onClick={() => onChange(page - 1)}
            >
                Previous
            </button>

            {pageItems(page, pages).map((item, index) =>
                    item === "dots" ? (
                        <span
                            key={`dots-${index}`}
                            aria-hidden="true"
                            className="px-1 text-slate"
                        >
            …
          </span>
                    ) : (
                        <button
                            key={item}
                            type="button"
                            aria-label={`Page ${item}`}
                            aria-current={item === page ? "page" : undefined}
                            onClick={() => onChange(item)}
                            className={`min-w-8 rounded-control px-2.5 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-blue ${
                                item === page
                                    ? "bg-blue text-on-blue"
                                    : "text-ink hover:bg-blue/10"
                            }`}
                        >
                            {item}
                        </button>
                    )
            )}

            <button
                type="button"
                className={button}
                disabled={page === pages}
                onClick={() => onChange(page + 1)}
            >
                Next
            </button>
        </nav>
    );
}

// Extra fictional messages for pagination testing only.
function initialPreviewMessages(): Message[] {
    const extra: Message[] = Array.from(
        {length: 75},
        (_, index) => {
            const number = index + 1;
            const harbor = index % 2 === 0;

            const hotelId = harbor
                ? "mock-harbor-house"
                : "mock-pacific-terrace";

            const hotelName = harbor
                ? "Harbor House"
                : "Pacific Terrace";

            const recipientId = harbor
                ? index % 4 === 0
                    ? "mock-sarah"
                    : "mock-daniel"
                : "mock-maya";

            const createdAt = new Date(
                Date.UTC(2026, 9, 30 - index, 10)
            ).toISOString();

            return {
                id: `mock-page-message-${number}`,
                hotel_id: hotelId,
                recipient_id: recipientId,
                subject: `Sample message ${number}: Your stay at ${hotelName}`,
                body:
                    `This is a fictional message from ${hotelName}, created to test the inbox and pagination.\n\n` +
                    "No message was sent to a real traveler.",
                created_at: createdAt,
                read_at:
                    index % 3 === 0
                        ? new Date(
                            Date.UTC(2026, 9, 30 - index, 12)
                        ).toISOString()
                        : null,
                hotels: {name: hotelName},
            };
        }
    );

    return [...previewSentMessages, ...extra];
}

async function getApi<T>(
    response: Response
): Promise<T> {
    let result: unknown;

    try {
        result = await response.json();
    } catch {
        throw new Error("Unexpected server response.");
    }

    const payload = result as {
        data?: T;
        error?: unknown;
    } | null;

    if (
        !response.ok ||
        !payload ||
        payload.error ||
        payload.data === undefined ||
        payload.data === null
    ) {
        throw new Error(
            typeof payload?.error === "string"
                ? payload.error
                : "The request failed."
        );
    }

    return payload.data;
}

export function OwnerMessagesDashboard({
                                           hotels,
                                           initialView = "sent",
                                       }: {
    hotels: Hotel[];
    initialView?: View;
}) {
    const [preview, setPreview] = useState(false);

    const [now] = useState(() => Date.now());

    const [previewSent, setPreviewSent] =
        useState<Message[]>(initialPreviewMessages);

    const [sent, setSent] = useState<Message[]>([]);

    const [recipients, setRecipients] = useState<
        Record<string, HotelRecipient[]>
    >({});

    const [selectedHotelId, setSelectedHotelId] =
        useState("");

    const [composeHotelId, setComposeHotelId] =
        useState("");

    const [view, setView] = useState<View>(initialView);

    useEffect(() => {
        setView(initialView);
    }, [initialView]);

    const [readFilter, setReadFilter] =
        useState<ReadFilter>("all");

    const [selectedMessageId, setSelectedMessageId] =
        useState<string | null>(null);

    const [page, setPage] = useState(1);
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [search, setSearch] = useState("");

    const [
        selectedRecipientKeys,
        setSelectedRecipientKeys,
    ] = useState<string[]>([]);

    const [loading, setLoading] = useState(hotels.length > 0);

    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");

    const [toast, setToast] =
        useState<string | null>(null);

    const [reload, setReload] = useState(0);

    // The toast disappears automatically after 15 seconds.
    useEffect(() => {
        if (!toast) return;

        const timer = window.setTimeout(
            () => setToast(null),
            15000
        );

        return () => window.clearTimeout(timer);
    }, [toast]);

    const properties = preview
        ? previewProperties
        : hotels;

    const allMessages = preview
        ? previewSent
        : sent;

    const recipientsByHotel = preview
        ? previewRecipientsByHotel
        : recipients;

    const messages = useMemo(
        () =>
            allMessages
                .filter(
                    (message) =>
                        (!selectedHotelId ||
                            message.hotel_id === selectedHotelId) &&
                        (readFilter === "all" ||
                            (readFilter === "read"
                                ? Boolean(message.read_at)
                                : !message.read_at))
                )
                .sort((a, b) =>
                    b.created_at.localeCompare(a.created_at)
                ),
        [allMessages, selectedHotelId, readFilter]
    );

    const pages = Math.max(
        1,
        Math.ceil(messages.length / PAGE_SIZE)
    );

    const safePage = Math.min(page, pages);

    const pageMessages = messages.slice(
        (safePage - 1) * PAGE_SIZE,
        safePage * PAGE_SIZE
    );

    const selectedMessage =
        allMessages.find(
            (message) => message.id === selectedMessageId
        ) ?? null;

    const names = useMemo(
        () =>
            new Map(
                Object.values(recipientsByHotel)
                    .flat()
                    .map((person) => [
                        person.account_id,
                        person.full_name || person.email,
                    ])
            ),
        [recipientsByHotel]
    );

    const recipientRows = useMemo<RecipientRow[]>(
        () =>
            properties.flatMap((hotel) => {
                if (
                    composeHotelId &&
                    hotel.id !== composeHotelId
                ) {
                    return [];
                }

                return (
                    recipientsByHotel[hotel.id] ?? []
                ).map((person) => ({
                    key: `${hotel.id}::${person.account_id}`,
                    hotelId: hotel.id,
                    hotelName: hotel.name,
                    person,
                }));
            }),
        [properties, recipientsByHotel, composeHotelId]
    );

    const matchingRecipients = recipientRows.filter(
        (row) =>
            `${row.person.full_name} ${row.person.email} ${row.hotelName}`
                .toLowerCase()
                .includes(search.trim().toLowerCase())
    );

    const allMatchingSelected =
        matchingRecipients.length > 0 &&
        matchingRecipients.every((row) =>
            selectedRecipientKeys.includes(row.key)
        );

    const selectedRows = recipientRows.filter(
        (row) =>
            selectedRecipientKeys.includes(row.key)
    );

    useEffect(() => {
        if (preview || hotels.length === 0) return;

        const controller = new AbortController();

        (async () => {
            try {
                const results = await Promise.all(
                    hotels.map(async (hotel) => {
                        const id = encodeURIComponent(hotel.id);

                        const [
                            messagesResponse,
                            recipientResponse,
                        ] = await Promise.all([
                            fetch(
                                `/api/messages?hotel_id=${id}`,
                                {
                                    cache: "no-store",
                                    signal: controller.signal,
                                }
                            ),
                            fetch(
                                `/api/messages/recipients?hotel_id=${id}`,
                                {
                                    cache: "no-store",
                                    signal: controller.signal,
                                }
                            ),
                        ]);

                        return {
                            id: hotel.id,
                            messages:
                                await getApi<Message[]>(
                                    messagesResponse
                                ),
                            people:
                                await getApi<HotelRecipient[]>(
                                    recipientResponse
                                ),
                        };
                    })
                );

                if (!controller.signal.aborted) {
                    setSent(
                        results.flatMap(
                            (result) => result.messages
                        )
                    );

                    setRecipients(
                        Object.fromEntries(
                            results.map((result) => [
                                result.id,
                                result.people,
                            ])
                        )
                    );
                }
            } catch (err) {
                if (!controller.signal.aborted) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Unable to load messages."
                    );
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        })();

        return () => controller.abort();
    }, [hotels, preview, reload]);

    function switchView(next: View) {
        setView(next);
        setSelectedMessageId(null);
        setError("");

        if (
            next === "compose" &&
            composeHotelId !== selectedHotelId
        ) {
            setComposeHotelId(selectedHotelId);
            setSelectedRecipientKeys([]);
            setSearch("");
        }
    }

    function changeProperty(id: string) {
        if (view === "sent") {
            setSelectedHotelId(id);
            setSelectedMessageId(null);
            setPage(1);
        } else {
            setComposeHotelId(id);
            setSelectedRecipientKeys([]);
            setSearch("");
        }
    }

    function changeReadFilter(next: ReadFilter) {
        setReadFilter(next);
        setSelectedMessageId(null);
        setPage(1);
    }

    function toggleRecipient(
        key: string,
        checked: boolean
    ) {
        setSelectedRecipientKeys((current) =>
            checked
                ? [...new Set([...current, key])]
                : current.filter(
                    (value) => value !== key
                )
        );
    }

    function toggleSelectAll() {
        const keys = new Set(
            matchingRecipients.map((row) => row.key)
        );

        setSelectedRecipientKeys((current) =>
            allMatchingSelected
                ? current.filter((key) => !keys.has(key))
                : [...new Set([...current, ...keys])]
        );
    }

    async function send(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (
            sending ||
            !selectedRows.length ||
            !subject.trim() ||
            !body.trim()
        ) {
            return;
        }

        setSending(true);
        setError("");
        setToast(null);

        // A guest with stays at several properties gets one message,
        // sent from the property of their latest check-in.
        const latest = new Map<string, RecipientRow>();

        for (const row of selectedRows) {
            const current = latest.get(row.person.account_id);

            if (
                !current ||
                (Date.parse(row.person.last_check_in ?? "") || 0) >
                (Date.parse(current.person.last_check_in ?? "") || 0)
            ) {
                latest.set(row.person.account_id, row);
            }
        }

        const sendRows = [...latest.values()];

        // The API supports one property per request.
        const groups = new Map<
            string,
            RecipientRow[]
        >();

        for (const row of sendRows) {
            groups.set(row.hotelId, [
                ...(groups.get(row.hotelId) ?? []),
                row,
            ]);
        }

        let successful = 0;
        const successfulKeys: string[] = [];
        const failedHotels: string[] = [];

        try {
            if (preview) {
                const createdAt = new Date().toISOString();

                const created: Message[] =
                    sendRows.map((row, index) => ({
                        id: `mock-new-${Date.now()}-${index}`,
                        hotel_id: row.hotelId,
                        recipient_id: row.person.account_id,
                        subject: subject.trim(),
                        body: body.trim(),
                        created_at: createdAt,
                        read_at: null,
                        hotels: {
                            name: row.hotelName,
                        },
                    }));

                setPreviewSent((old) => [
                    ...created,
                    ...old,
                ]);

                successful = sendRows.length;

                successfulKeys.push(
                    ...selectedRows.map((row) => row.key)
                );
            } else {
                for (const [hotelId, rows] of groups) {
                    try {
                        await getApi<Message[]>(
                            await fetch("/api/messages", {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                    hotel_id: hotelId,
                                    recipient_ids: rows.map(
                                        (row) =>
                                            row.person.account_id
                                    ),
                                    subject: subject.trim(),
                                    body: body.trim(),
                                }),
                            })
                        );

                        successful += rows.length;

                        successfulKeys.push(
                            ...selectedRows
                                .filter((row) =>
                                    rows.some(
                                        (sentRow) =>
                                            sentRow.person.account_id ===
                                            row.person.account_id
                                    )
                                )
                                .map((row) => row.key)
                        );
                    } catch {
                        failedHotels.push(
                            properties.find(
                                (hotel) => hotel.id === hotelId
                            )?.name ?? "a property"
                        );
                    }
                }
            }

            if (successfulKeys.length) {
                setSelectedRecipientKeys((current) =>
                    current.filter(
                        (key) =>
                            !successfulKeys.includes(key)
                    )
                );

                if (!preview) {
                    setReload((n) => n + 1);
                }
            }

            if (successful) {
                setToast(
                    preview
                        ? `${successful} sample ${
                            successful === 1
                                ? "message"
                                : "messages"
                        } created locally. Nothing was sent.`
                        : `${successful} ${
                            successful === 1
                                ? "message"
                                : "messages"
                        } sent successfully.`
                );
            }

            if (failedHotels.length) {
                setError(
                    `Could not send messages for ${
                        failedHotels.join(", ")
                    }. Other messages may have been sent. ` +
                    "Only the failed recipients remain selected."
                );
            } else {
                setSubject("");
                setBody("");
                setSearch("");
                setView("sent");
                setSelectedHotelId(composeHotelId);
                setSelectedMessageId(null);
                setReadFilter("all");
                setPage(1);
            }
        } finally {
            setSending(false);
        }
    }

    return (
        <div className="relative w-full min-w-0 space-y-5 font-sans">
            {process.env.NODE_ENV === "development" && (
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        className={button}
                        onClick={() => {
                            const next = !preview;

                            setPreview(next);
                            setLoading(
                                !next && hotels.length > 0
                            );
                            setError("");
                            setToast(null);
                            setSelectedHotelId("");
                            setComposeHotelId("");
                            setSelectedMessageId(null);
                            setView("sent");
                            setPage(1);
                            setReadFilter("all");
                            setSelectedRecipientKeys([]);
                        }}
                    >
                        {preview
                            ? "Return to live data"
                            : "Preview sample data"}
                    </button>

                    {preview && (
                        <span className="text-xs text-slate">
              SAMPLE DATA — local preview only (not saved)
            </span>
                    )}
                </div>
            )}

            {properties.length === 0 ? (
                <section className="rounded-lg border border-edge bg-surface p-5 sm:p-6">
                    <h2 className="text-base font-semibold text-ink">
                        No properties yet
                    </h2>

                    <p className="mt-2 text-sm text-slate">
                        Add a property before sending messages.
                    </p>
                    <Link
                        href="/listings/new"
                        className="mt-5 inline-flex h-[46px] items-center justify-center rounded-control bg-blue px-5 font-sans text-sm font-semibold text-on-blue transition-colors hover:bg-blue-dark focus-visible:outline-2 focus-visible:outline-blue"
                    >
                        Add property
                    </Link>
                </section>
            ) : (
                <>
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        {view === "sent" ? (
                            <div className="w-full min-w-[220px] max-w-sm flex-1">
                                <PropertyPicker
                                    id="message-property"
                                    label="Property"
                                    value={selectedHotelId}
                                    onChange={changeProperty}
                                    options={[
                                        {
                                            value: "",
                                            label: "All properties",
                                        },
                                        ...properties.map((hotel) => ({
                                            value: hotel.id,
                                            label: hotel.name,
                                        })),
                                    ]}
                                />
                            </div>
                        ) : (
                            <div/>
                        )}

                        <div
                            className="flex flex-wrap gap-2"
                            role="group"
                            aria-label="Message views"
                        >
                            <button
                                type="button"
                                onClick={() => switchView("sent")}
                                aria-pressed={view === "sent"}
                                className={
                                    view === "sent" ? primary : tab
                                }
                            >
                                Sent messages
                            </button>

                            <button
                                type="button"
                                onClick={() => switchView("compose")}
                                aria-pressed={view === "compose"}
                                className={
                                    view === "compose" ? primary : tab
                                }
                            >
                                Compose message
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div
                            role="alert"
                            className="border-l-2 border-danger px-4 py-2 font-sans text-sm text-danger"
                        >
                            {error}{" "}

                            {view === "sent" && (
                                <button
                                    type="button"
                                    className="text-blue-dark underline"
                                    onClick={() => {
                                        setLoading(true);
                                        setError("");
                                        setReload((n) => n + 1);
                                    }}
                                >
                                    Retry
                                </button>
                            )}
                        </div>
                    )}

                    {view === "compose" ? (
                        <section className={`${card} w-full p-5 sm:p-7`}>
                            <h2 className="font-serif text-[30px] text-ink">
                                Compose message
                            </h2>

                            <p className="mt-2 text-sm text-slate">
                                Send a one-way update to eligible guests
                                {composeHotelId
                                    ? " at the selected property"
                                    : " across all your properties"}.
                            </p>

                            <form
                                className="mt-6 space-y-5"
                                onSubmit={send}
                            >
                                <div className="max-w-sm">
                                    <PropertyPicker
                                        id="compose-message-property"
                                        label="Send from property"
                                        value={composeHotelId}
                                        onChange={changeProperty}
                                        options={[
                                            {
                                                value: "",
                                                label: "All properties",
                                            },
                                            ...properties.map((hotel) => ({
                                                value: hotel.id,
                                                label: hotel.name,
                                            })),
                                        ]}
                                    />
                                </div>

                                <fieldset>
                                    <legend className="text-sm text-ink">
                                        Recipients ({selectedRows.length} selected)
                                    </legend>

                                    <div className="mt-2 flex justify-end">
                                        <button
                                            type="button"
                                            className={button}
                                            disabled={
                                                matchingRecipients.length === 0 ||
                                                sending
                                            }
                                            onClick={toggleSelectAll}
                                        >
                                            {allMatchingSelected
                                                ? "Clear selection"
                                                : "Select all"}
                                        </button>
                                    </div>

                                    <input
                                        type="search"
                                        aria-label="Search recipients"
                                        className={`${input} mt-3`}
                                        value={search}
                                        onChange={(event) =>
                                            setSearch(event.target.value)
                                        }
                                        placeholder="Search guests or properties"
                                    />

                                    <div className="mt-2 max-h-60 overflow-y-auto rounded-control border border-edge">
                                        {matchingRecipients.length ? (
                                            matchingRecipients.map((row) => (
                                                <label
                                                    key={row.key}
                                                    className="flex cursor-pointer items-center gap-3 border-b border-edge p-3 last:border-0 hover:bg-blue/5"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="h-4 w-4 accent-blue"
                                                        checked={selectedRecipientKeys.includes(
                                                            row.key
                                                        )}
                                                        onChange={(event) =>
                                                            toggleRecipient(
                                                                row.key,
                                                                event.target.checked
                                                            )
                                                        }
                                                    />

                                                    <span className="min-w-0 flex-1 text-sm text-ink">
                            {row.person.full_name ||
                                "Traveler"}

                                                        <span className="block truncate text-xs text-slate">
                              {row.person.email}
                            </span>
                          </span>

                                                    {!composeHotelId && (
                                                        <span className="shrink-0 text-xs text-slate">
                              {row.hotelName}
                            </span>
                                                    )}
                                                </label>
                                            ))
                                        ) : (
                                            <p className="p-4 text-sm text-slate">
                                                No matching eligible recipients.
                                            </p>
                                        )}
                                    </div>
                                </fieldset>

                                <div>
                                    <label
                                        htmlFor="owner-subject"
                                        className="mb-1.5 block text-sm text-ink"
                                    >
                                        Subject
                                    </label>

                                    <input
                                        id="owner-subject"
                                        className={input}
                                        maxLength={140}
                                        required
                                        value={subject}
                                        onChange={(event) =>
                                            setSubject(event.target.value)
                                        }
                                        placeholder="An update about your stay"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="owner-body"
                                        className="mb-1.5 block text-sm text-ink"
                                    >
                                        Message
                                    </label>

                                    <textarea
                                        id="owner-body"
                                        className={`${input} min-h-40 resize-y`}
                                        maxLength={5000}
                                        required
                                        value={body}
                                        onChange={(event) =>
                                            setBody(event.target.value)
                                        }
                                        placeholder="Write a message…"
                                    />
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-4">
                                    <p className="max-w-xl text-xs leading-5 text-slate">
                                        LikeHome messages are one-way. If you
                                        need a reply, include an email address,
                                        phone number, or another contact method
                                        in your message.
                                    </p>

                                    <button
                                        type="submit"
                                        className={primary}
                                        disabled={
                                            sending ||
                                            selectedRows.length === 0 ||
                                            !subject.trim() ||
                                            !body.trim()
                                        }
                                    >
                                        {sending
                                            ? "Sending…"
                                            : "Send message"}
                                    </button>
                                </div>
                            </form>
                        </section>
                    ) : selectedMessage ? (
                        <section className="w-full space-y-5">
                            <button
                                type="button"
                                className="text-sm text-blue-dark hover:underline focus-visible:outline-2 focus-visible:outline-blue"
                                onClick={() =>
                                    setSelectedMessageId(null)
                                }
                            >
                                ← Back to sent messages
                            </button>

                            <div>
                                <h2 className="font-serif text-[32px] text-ink">
                                    {selectedMessage.subject}
                                </h2>

                                <p className="mt-2 text-sm text-slate">
                                    To{" "}
                                    {names.get(
                                        selectedMessage.recipient_id
                                    ) ?? "Traveler"}{" "}
                                    ·{" "}
                                    {properties.find(
                                        (hotel) =>
                                            hotel.id === selectedMessage.hotel_id
                                    )?.name ?? "Property"}{" "}
                                    ·{" "}
                                    {timestamp(selectedMessage.created_at)}
                                </p>
                            </div>

                            <article className={`${card} w-full p-6 sm:p-8`}>
                                <p className="whitespace-pre-wrap break-words text-sm leading-7 text-ink">
                                    {selectedMessage.body}
                                </p>

                                <p className="mt-6 border-t border-edge pt-4 text-xs text-slate">
                                    {selectedMessage.read_at
                                        ? `Read by recipient on ${timestamp(
                                            selectedMessage.read_at
                                        )}`
                                        : "Not read by recipient yet"}
                                </p>
                            </article>
                        </section>
                    ) : !preview && loading ? (
                        <section
                            role="status"
                            className={`${card} p-6 text-sm text-slate`}
                        >
                            Loading messages…
                        </section>
                    ) : (
                        <section
                            className={`${card} w-full overflow-hidden`}
                            aria-label="Sent messages"
                        >
                            <div
                                className="flex flex-wrap items-center justify-between gap-3 border-b border-edge px-5 py-4 sm:px-7">
                                <div
                                    className="flex flex-wrap gap-2"
                                    role="group"
                                    aria-label="Read status"
                                >
                                    {([
                                        {key: "all", label: "All"},
                                        {key: "unread", label: "Not read"},
                                        {key: "read", label: "Read"},
                                    ] as const).map((item) => (
                                        <button
                                            type="button"
                                            key={item.key}
                                            aria-pressed={
                                                readFilter === item.key
                                            }
                                            onClick={() =>
                                                changeReadFilter(item.key)
                                            }
                                            className={`rounded-control border px-3 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-blue ${
                                                readFilter === item.key
                                                    ? "border-blue bg-blue text-on-blue"
                                                    : "border-edge bg-surface text-ink hover:bg-blue/10"
                                            }`}
                                        >
                                            {item.label}
                                        </button>
                                    ))}
                                </div>

                                <span className="text-xs text-slate">
                  {messages.length}{" "}
                                    {messages.length === 1
                                        ? "message"
                                        : "messages"}
                </span>
                            </div>

                            {messages.length === 0 ? (
                                <p className="p-8 text-center text-sm text-slate">
                                    No messages match this filter.
                                </p>
                            ) : (
                                <div className="divide-y divide-edge">
                                    {pageMessages.map((message) => (
                                        <button
                                            type="button"
                                            key={message.id}
                                            onClick={() =>
                                                setSelectedMessageId(message.id)
                                            }
                                            className="block w-full px-5 py-4 text-left font-sans transition-colors hover:bg-blue/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue sm:px-7"
                                        >
                      <span className="flex items-start justify-between gap-4">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-ink">
                            {names.get(message.recipient_id) ??
                                "Traveler"}

                              <span className="mx-1 text-slate">
                              |
                            </span>

                            <span className="text-blue-dark">
                              {properties.find(
                                  (hotel) =>
                                      hotel.id === message.hotel_id
                              )?.name ?? "Property"}
                            </span>
                          </span>

                          <span className="mt-0.5 block truncate text-sm text-ink">
                            {message.subject}
                          </span>

                          <span className="mt-0.5 block truncate text-sm text-slate">
                            {message.body.replace(/\s+/g, " ")}
                          </span>

                          <span className="mt-1 block text-sm text-slate">
                            {message.read_at
                                ? "Read"
                                : "Not read"}
                          </span>
                        </span>

                        <time
                            dateTime={message.created_at}
                            className="shrink-0 whitespace-nowrap text-right text-xs text-slate"
                            title={timestamp(
                                message.created_at
                            )}
                        >
                          {shortTime(message.created_at, now)}
                        </time>
                      </span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            <Pagination
                                page={safePage}
                                pages={pages}
                                onChange={(next) => {
                                    setPage(next);
                                    setSelectedMessageId(null);
                                }}
                            />
                        </section>
                    )}
                </>
            )}

            {toast && (
                <div
                    role="status"
                    aria-live="polite"
                    className="fixed bottom-6 right-6 z-[80] flex w-[min(24rem,calc(100vw-2rem))] items-center gap-3 rounded-xl border border-edge bg-surface px-5 py-5 font-sans text-ink shadow-lg"
                >
          <span
              aria-hidden="true"
              className="text-2xl font-semibold text-blue-dark"
          >
            ✓
          </span>

                    <div className="min-w-0 flex-1">
                        <p className="text-lg font-semibold text-ink">
                            {preview
                                ? "Sample message created"
                                : "Message sent"}
                        </p>

                        {preview && (
                            <p className="mt-1 text-sm text-slate">
                                {toast}
                            </p>
                        )}
                    </div>

                    <button
                        type="button"
                        aria-label="Dismiss notification"
                        onClick={() => setToast(null)}
                        className="rounded-control px-1 text-lg text-slate hover:text-ink focus-visible:outline-2 focus-visible:outline-blue"
                    >
                        ×
                    </button>
                </div>
            )}
        </div>
    );
}
