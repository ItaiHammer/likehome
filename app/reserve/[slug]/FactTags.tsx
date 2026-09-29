"use client";

import { useRef, useState } from "react";
import { iconButton } from "../../_components/ui";
import type { FactGroup, FactId } from "../../_data/facts";

const ICONS: Record<FactId, React.ReactNode> = {
  amenities: <path d="M4 17h16M6 17a6 6 0 0 1 12 0M12 11V8M10 8h4" />,
  checkin: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  cancellation: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10h16M8 3v4M16 3v4M10 13l4 4M14 13l-4 4" />
    </>
  ),
  fees: <path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6" />,
  parking: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M10 16V8h3a2.5 2.5 0 0 1 0 5h-3" />
    </>
  ),
  pets: (
    <>
      <circle cx="7.5" cy="10" r="1.6" />
      <circle cx="12" cy="7" r="1.6" />
      <circle cx="16.5" cy="10" r="1.6" />
      <path d="M8.5 17c0-2 1.6-3.5 3.5-3.5s3.5 1.5 3.5 3.5-1.6 2-3.5 2-3.5 0-3.5-2z" />
    </>
  ),
  accessibility: (
    <>
      <circle cx="12" cy="5" r="1.8" />
      <path d="M6 9l6 1 6-1M12 10v4M12 14l-3 6M12 14l3 6" />
    </>
  ),
  location: (
    <>
      <path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z" />
      <circle cx="12" cy="10" r="2" />
    </>
  ),
};

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}

function CloseButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className={iconButton}>
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  );
}

// Tags under the photos. Each one expands a panel of facts in place;
// "All facts" opens every group at once in a dialog.
export function FactTags({ groups, stayName, location }: { groups: FactGroup[]; stayName: string; location: string }) {
  const [active, setActive] = useState<FactId | null>(null);
  // Keeps the last group on screen while the panel collapses.
  const [shown, setShown] = useState<FactId>(groups[0].id);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const group = groups.find((g) => g.id === shown) ?? groups[0];

  function toggle(id: FactId) {
    if (active === id) return setActive(null);
    setActive(id);
    setShown(id);
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-semibold leading-5 text-ink">Good to know</h2>
        <button
          type="button"
          onClick={() => dialogRef.current?.showModal()}
          aria-haspopup="dialog"
          className="inline-flex items-center gap-2 text-base font-semibold text-brand hover:text-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <Icon>
            <rect x="4" y="4" width="6" height="6" rx="1" />
            <rect x="14" y="4" width="6" height="6" rx="1" />
            <rect x="4" y="14" width="6" height="6" rx="1" />
            <rect x="14" y="14" width="6" height="6" rx="1" />
          </Icon>
          All facts
        </button>
      </div>
      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0">
        {groups.map((g) => {
          const on = active === g.id;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => toggle(g.id)}
              aria-expanded={on}
              aria-controls="stay-facts"
              // Same shape as the sheet's outline button; the open tag takes the focus look (blue border).
              className={`inline-flex h-[46px] shrink-0 items-center gap-2 rounded-control border bg-surface px-4 text-base font-semibold text-ink transition-colors focus-visible:border-brand focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand ${
                on ? "border-brand ring-1 ring-brand" : "border-line hover:border-brand"
              }`}
            >
              <Icon>{ICONS[g.id]}</Icon>
              {g.tag}
            </button>
          );
        })}
      </div>

      <div
        id="stay-facts"
        inert={!active}
        className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${active ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <section aria-labelledby="stay-facts-title" className="mt-4 rounded-2xl border border-line bg-surface p-6 sm:px-8">
            <div className="flex items-center justify-between gap-4">
              <h2 id="stay-facts-title" className="text-xl font-semibold leading-7 text-ink">
                {group.title}
              </h2>
              <CloseButton label="Close details" onClick={() => setActive(null)} />
            </div>
            <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((it) => (
                <div key={it.label} className="border-t border-line pt-3">
                  <dt className="text-base font-semibold leading-5 text-ink">{it.label}</dt>
                  <dd className="mt-1 text-sm text-muted">{it.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby="all-facts-title"
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
        className="m-auto max-h-[85vh] w-[calc(100%-2rem)] max-w-5xl overflow-y-auto rounded-2xl border border-line bg-surface p-0 text-ink backdrop:bg-[#070d2f]/60"
      >
        <div className="p-6 sm:p-10">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h2 id="all-facts-title" className="text-[32px] font-bold leading-10">
                Good to know before you book
              </h2>
              <p className="mt-1 text-base text-muted">
                {stayName} · {location}
              </p>
            </div>
            <CloseButton label="Close" onClick={() => dialogRef.current?.close()} />
          </div>
          <div className="mt-8 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {groups.map((g) => (
              <section key={g.id} aria-labelledby={`all-${g.id}`} className="border-t border-line pt-4">
                <h3 id={`all-${g.id}`} className="flex items-center gap-2 text-base font-semibold leading-5">
                  <Icon>{ICONS[g.id]}</Icon>
                  {g.title}
                </h3>
                <dl className="mt-3 space-y-2.5">
                  {g.items.map((it) => (
                    <div key={it.label}>
                      <dt className="text-base leading-5">{it.label}</dt>
                      <dd className="text-sm text-muted">{it.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        </div>
      </dialog>
    </div>
  );
}
