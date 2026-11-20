"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { NoHotels } from "@/app/messages/_components/SentMessages";
import { Button, Card, Field, FormError, Select, TextArea, labelClass } from "@/app/_components/ui";
import { API_ROUTES, PAGE_ROUTES } from "@/constants/routes";
import { plural } from "@/lib/listing-display";
import { BODY_MAX, SUBJECT_MAX, composeProblem, filterRecipients, toRecipients, type Recipient } from "@/lib/messages";

type Hotel = { id: string; name: string };
type FieldName = NonNullable<ReturnType<typeof composeProblem>>["field"];
type Errors = Partial<Record<FieldName, string>> & { form?: string; signIn?: boolean };
type Loaded = { key: string; recipients: Recipient[] } | { key: string; error: string; signIn: boolean };

const IDS = {
  hotel: "message-hotel",
  recipients: "message-recipients",
  search: "message-search",
  subject: "message-subject",
  body: "message-body",
  oneWay: "message-one-way",
} as const;

const checkboxClass =
  "peer h-5 w-5 cursor-pointer appearance-none rounded border border-slate bg-surface transition-colors checked:border-blue checked:bg-blue hover:border-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue disabled:cursor-not-allowed disabled:opacity-60";

function lastStay({ lastCheckIn, lastStatus }: Recipient) {
  const date = lastCheckIn ? new Date(lastCheckIn) : null;
  // Check-in is a calendar date stored as midnight UTC
  const day =
    date && !Number.isNaN(date.getTime())
      ? date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
      : null;
  const status = lastStatus?.replace(/[_-]+/g, " ").trim().toLowerCase();
  return [day && `Last stay ${day}`, status && status.charAt(0).toUpperCase() + status.slice(1)].filter(Boolean).join(" · ");
}

export function Composer({ hotels, initialHotelId }: { hotels: Hotel[]; initialHotelId: string | null }) {
  const router = useRouter();
  const [hotelId, setHotelId] = useState(() => hotels.find((h) => h.id === initialHotelId)?.id ?? hotels[0]?.id ?? "");
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!hotelId) return;
    const key = `${hotelId}#${attempt}`;
    const controller = new AbortController();
    fetch(`${API_ROUTES.MESSAGES_RECIPIENTS}?hotel_id=${encodeURIComponent(hotelId)}`, { signal: controller.signal, cache: "no-store" })
      .then(async (res) => {
        const result = (await res.json().catch(() => ({}))) as { data?: unknown };
        if (controller.signal.aborted) return;
        if (res.status === 401) setLoaded({ key, error: "Your sign-in has ended. Sign in again to see your guests.", signIn: true });
        else if (!res.ok) setLoaded({ key, error: "We couldn’t load the guests for this hotel.", signIn: false });
        else setLoaded({ key, recipients: toRecipients(result.data) });
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        console.error("Loading message recipients failed", err);
        setLoaded({ key, error: "We couldn’t reach LikeHome. Check your connection.", signIn: false });
      });
    return () => controller.abort();
  }, [hotelId, attempt]);

  if (hotels.length === 0) return <NoHotels />;

  const hotelName = hotels.find((h) => h.id === hotelId)?.name ?? "";
  // A result for another hotel (or an earlier try) means the current one is still loading
  const current = loaded?.key === `${hotelId}#${attempt}` ? loaded : null;
  const recipients = current && "recipients" in current ? current.recipients : [];
  const failed = current && "error" in current ? current : null;
  const shown = filterRecipients(recipients, query);
  const chosenIds = recipients.filter((r) => selected.has(r.accountId)).map((r) => r.accountId);
  const filtered = query.trim() !== "";
  const signInHref = `${PAGE_ROUTES.LOGIN}?next=${encodeURIComponent(`${PAGE_ROUTES.MESSAGES_NEW}?hotel=${encodeURIComponent(hotelId)}`)}`;

  function changeHotel(id: string) {
    setHotelId(id);
    setQuery("");
    setSelected(new Set());
    setErrors((prev) => ({ ...prev, hotel: undefined, recipients: undefined }));
  }

  function clearFieldError(field: FieldName) {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function toggle(id: string, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
    clearFieldError("recipients");
  }

  function selectShown() {
    setSelected((prev) => new Set([...prev, ...shown.map((r) => r.accountId)]));
    if (shown.length > 0) clearFieldError("recipients");
  }

  function clearShown() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const r of shown) next.delete(r.accountId);
      return next;
    });
  }

  function focusProblem(field: FieldName) {
    const target =
      field === "recipients"
        ? (document.querySelector<HTMLElement>(`#${IDS.recipients} input[type="checkbox"]`) ??
          document.getElementById(IDS.search) ??
          document.getElementById(IDS.recipients))
        : document.getElementById(IDS[field]);
    target?.focus();
  }

  function fail(message: string, signIn = false) {
    setSending(false);
    setErrors({ form: message, signIn });
  }

  async function send() {
    if (sending) return;
    const problem = composeProblem({ hotelId, recipientIds: chosenIds, subject, body });
    if (problem) {
      const next: Errors = {};
      next[problem.field] = problem.message;
      // Rendered before focus moves, so the field is announced with its error
      flushSync(() => setErrors(next));
      focusProblem(problem.field);
      return;
    }

    setErrors({});
    setSending(true);
    try {
      const res = await fetch(API_ROUTES.MESSAGES, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotel_id: hotelId, subject, body, recipient_ids: chosenIds }),
      });
      const result = (await res.json().catch(() => ({}))) as { data?: unknown; error?: unknown };
      if (res.ok) {
        const count = Array.isArray(result.data) && result.data.length > 0 ? result.data.length : chosenIds.length;
        // Stays busy until the sent list loads
        router.push(`${PAGE_ROUTES.MESSAGES}?hotel=${encodeURIComponent(hotelId)}&sent=${count}`);
        router.refresh();
        return;
      }
      if (res.status === 401) return fail("Your sign-in has ended. Sign in again to send this message.", true);
      const apiError = typeof result.error === "string" ? result.error.trim() : "";
      fail(apiError || "We couldn’t send your message. Try again.");
    } catch (err) {
      console.error("Sending the message failed", err);
      fail("We couldn’t reach LikeHome. Check your connection and try again.");
    }
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
      // Enter in a field doesn't send: one key press would message every selected guest
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.target instanceof HTMLInputElement) e.preventDefault();
      }}
      className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start"
    >
      <Card className="min-w-0">
        {hotels.length > 1 ? (
          <Select
            id={IDS.hotel}
            label="From"
            value={hotelId}
            onChange={(e) => changeHotel(e.target.value)}
            options={hotels.map((h) => ({ value: h.id, label: h.name }))}
            error={errors.hotel}
            disabled={sending}
          />
        ) : (
          <div>
            <p className={labelClass}>From</p>
            <p className="break-words text-ink">{hotelName}</p>
          </div>
        )}

        <div className="mt-6 border-t border-edge pt-6">
          <fieldset
            id={IDS.recipients}
            tabIndex={-1}
            aria-describedby={errors.recipients ? `${IDS.recipients}-error` : undefined}
            className="min-w-0 rounded-control focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue"
          >
            {/* Floated so its margin applies like any block's (legends ignore it otherwise) */}
            <legend className={`${labelClass} float-left w-full`}>To</legend>
            <div className="clear-left">
              <p className="text-sm text-slate">Guests who have booked {hotelName}.</p>
              <p className="sr-only" aria-live="polite">
                {!current ? "Loading guests…" : failed ? "" : `${plural(recipients.length, "guest")} can be messaged.`}
              </p>

              {!current ? (
                <div aria-hidden className="mt-4 space-y-2 animate-pulse motion-reduce:animate-none">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-14 rounded-control bg-disabled" />
                  ))}
                </div>
              ) : failed ? (
                <div className="mt-4 rounded-control border border-edge p-4">
                  <p role="alert" className="text-sm text-danger">
                    {failed.error}
                  </p>
                  {failed.signIn ? (
                    <Button href={signInHref} variant="secondary" size="sm" className="mt-3">
                      Sign in
                    </Button>
                  ) : (
                    <Button variant="secondary" size="sm" className="mt-3" onClick={() => setAttempt((a) => a + 1)} disabled={sending}>
                      Try again
                    </Button>
                  )}
                </div>
              ) : recipients.length === 0 ? (
                <p className="mt-4 rounded-control bg-blue/10 p-4 text-sm leading-6 text-ink">
                  No guests yet. Only guests who have booked {hotelName} can be messaged.
                </p>
              ) : (
                <>
                  <Field
                    id={IDS.search}
                    type="search"
                    label="Search guests"
                    placeholder="Name or email"
                    autoComplete="off"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    disabled={sending}
                    className="mt-4"
                  />
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                    <p aria-live="polite" className="text-sm text-slate">
                      {chosenIds.length} of {recipients.length} selected
                    </p>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={selectShown} disabled={sending}>
                        Select all<span className="sr-only">{filtered ? " matching guests" : " guests"}</span>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={clearShown} disabled={sending}>
                        Clear<span className="sr-only">{filtered ? " matching guests" : " selection"}</span>
                      </Button>
                    </div>
                  </div>
                  {shown.length > 0 ? (
                    <ul className="mt-2 max-h-[22rem] space-y-1 overflow-y-auto">
                      {shown.map((r) => {
                        const inputId = `recipient-${r.accountId}`;
                        const stay = lastStay(r);
                        return (
                          <li key={r.accountId}>
                            <label
                              htmlFor={inputId}
                              className="flex cursor-pointer items-start gap-3 rounded-control px-3 py-2.5 transition-colors hover:bg-blue/5 has-checked:bg-blue/10"
                            >
                              <span className="relative mt-0.5 flex h-5 w-5 shrink-0">
                                <input
                                  id={inputId}
                                  type="checkbox"
                                  checked={selected.has(r.accountId)}
                                  onChange={(e) => toggle(r.accountId, e.target.checked)}
                                  disabled={sending}
                                  aria-labelledby={`${inputId}-name`}
                                  aria-describedby={`${inputId}-details`}
                                  className={checkboxClass}
                                />
                                <svg
                                  viewBox="0 0 20 20"
                                  className="pointer-events-none absolute inset-0 hidden h-5 w-5 text-on-blue peer-checked:block"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  aria-hidden
                                >
                                  <path d="M5.5 10.5l3 3 6-7" />
                                </svg>
                              </span>
                              <span className="min-w-0">
                                <span id={`${inputId}-name`} className="block font-semibold text-ink [overflow-wrap:anywhere]">
                                  {r.name}
                                </span>
                                <span id={`${inputId}-details`} className="block text-sm text-slate">
                                  {r.email && r.email !== r.name && <span className="block [overflow-wrap:anywhere]">{r.email}</span>}
                                  {stay && <span className="block">{stay}</span>}
                                </span>
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="mt-2 px-3 py-2.5 text-sm text-slate">No guests match “{query.trim()}”.</p>
                  )}
                </>
              )}

              {errors.recipients && (
                // role="alert": focus lands on a checkbox, whose own description doesn't include this
                <p id={`${IDS.recipients}-error`} role="alert" className="mt-3 text-sm text-danger">
                  {errors.recipients}
                </p>
              )}
            </div>
          </fieldset>
        </div>
      </Card>

      <Card className="min-w-0">
        <div className="space-y-6">
          <Field
            id={IDS.subject}
            label="Subject"
            autoComplete="off"
            maxLength={SUBJECT_MAX}
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              clearFieldError("subject");
            }}
            readOnly={sending}
            error={errors.subject}
            hint={`${subject.length} of ${SUBJECT_MAX} characters`}
          />
          <TextArea
            id={IDS.body}
            label="Message"
            rows={10}
            maxLength={BODY_MAX}
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              clearFieldError("body");
            }}
            readOnly={sending}
            error={errors.body}
            hint={`${body.length} of ${BODY_MAX} characters`}
          />
        </div>

        <FormError message={errors.form} signInHref={errors.signIn ? signInHref : undefined} className="mt-6" />

        <div className="mt-6 border-t border-edge pt-6">
          <p id={IDS.oneWay} className="flex gap-2 text-sm leading-6 text-slate">
            <svg viewBox="0 0 24 24" className="mt-1 h-4 w-4 shrink-0 text-blue" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="12" cy="12" r="9" />
              <path d="M12 11v5M12 7.5v.5" strokeLinecap="round" />
            </svg>
            Guests can read this message but can’t reply to it. Include a phone number or email if they may need to reach you.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="submit" loading={sending} aria-describedby={IDS.oneWay}>
              {chosenIds.length > 0 ? `Send to ${plural(chosenIds.length, "guest")}` : "Send"}
            </Button>
            <Button variant="secondary" href={`${PAGE_ROUTES.MESSAGES}?hotel=${encodeURIComponent(hotelId)}`}>
              Cancel
            </Button>
          </div>
        </div>
      </Card>
    </form>
  );
}
