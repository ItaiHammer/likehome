import { Suspense } from "react";
import { Card } from "@/app/_components/ui";
import type { HomeShortcut } from "@/lib/account/home";
import { ownerGuests, type GuestList } from "@/lib/home-owner";
import { loadOwnerHistory } from "./owner-history";
import { ShortcutTile } from "./ShortcutTile";
import { blockFrame, blockTitle, cardLabel, pulse } from "./styles";

const TITLE_ID = "owner-today-title";

// Business: the title card with its shortcuts, beside who is staying now and who arrives next.
// Phones drop the title card's frame and stack everything.
export function OwnerToday({ title, body, shortcuts }: { title: string; body: string; shortcuts: HomeShortcut[] }) {
  return (
    <section aria-labelledby={TITLE_ID} className="grid gap-3 sm:gap-4 lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)]">
      <div className={`flex flex-col ${blockFrame} sm:py-8`}>
        <h2 id={TITLE_ID} className={blockTitle}>
          {title}
        </h2>
        <p className="mt-1.5 text-base leading-6 text-slate sm:mt-2">{body}</p>
        <ul className="mt-6 flex flex-col gap-3 sm:mt-auto sm:pt-6">
          {shortcuts.map((s) => (
            <li key={s.href}>
              <ShortcutTile label={s.label} hint={s.hint} href={s.href} icon={s.icon} />
            </li>
          ))}
        </ul>
      </div>
      <Suspense fallback={<div aria-hidden className={`h-72 ${pulse}`} />}>
        <Guests />
      </Suspense>
    </section>
  );
}

// A failed read says so, rather than claiming nobody is booked
async function Guests() {
  const history = await loadOwnerHistory();
  if (!history) {
    return (
      <Card padding="none" className="p-5 sm:px-[26px] sm:py-[22px]">
        <p className="text-[15px] leading-6 text-slate">We couldn’t load your guests just now.</p>
      </Card>
    );
  }
  const { staying, arriving } = ownerGuests(history.bookings);
  return (
    <Card padding="none" className="px-5 pb-2 pt-5 sm:px-[26px] sm:py-[22px]">
      <GuestGroup title="Staying now" list={staying} empty="Nobody is staying right now." />
      <div className="mt-2 border-t border-edge pt-5 sm:mt-2.5 sm:pt-[18px]">
        <GuestGroup title="Arriving soon" list={arriving} empty="No arrivals coming up." />
      </div>
    </Card>
  );
}

function GuestGroup({ title, list, empty }: { title: string; list: GuestList; empty: string }) {
  return (
    <>
      <h3 className={cardLabel}>{title}</h3>
      {list.rows.length === 0 ? (
        <p className="py-3 text-[15px] leading-6 text-slate sm:py-5">{empty}</p>
      ) : (
        <ul className="divide-y divide-edge/60">
          {/* Phones: name and dates, then the room and hotel under them. From sm up: one line */}
          {list.rows.map((r) => (
            <li
              key={r.id}
              className="grid min-h-16 grid-cols-[minmax(0,1fr)_auto] content-center gap-x-3 py-3 text-[15px] leading-6 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-x-1.5 sm:py-5"
            >
              <span className="truncate font-semibold text-ink">{r.guest}</span>
              <span className="col-span-2 row-start-2 text-slate sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:truncate sm:before:content-['·_']">
                {r.stay}
              </span>
              <span className="col-start-2 row-start-1 whitespace-nowrap text-slate sm:col-start-3 sm:pl-3">{r.dates}</span>
            </li>
          ))}
        </ul>
      )}
      {list.more > 0 && <p className="pb-3 text-sm leading-5 text-slate">and {list.more} more</p>}
    </>
  );
}
