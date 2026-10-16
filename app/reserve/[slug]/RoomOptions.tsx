"use client";

import { Fragment } from "react";
import { money } from "@/lib/bookings";
import type { Room } from "../../_data/stays";

// The room list as radio cards, shared by the stay page and the change-booking page.
// Keep it inside a <fieldset> with the legend; `locked` greys out every room but the selected one.
export function RoomOptions({
  rooms,
  selectedId,
  onSelect,
  locked = false,
  note,
}: {
  rooms: Room[];
  selectedId: string;
  onSelect: (id: string) => void;
  locked?: boolean;
  /** The small line under each room's details */
  note: (room: Room) => string;
}) {
  return (
    <div className="mt-5 space-y-4">
      {/* Live prices can sell out any room, so the ones left to book always come first */}
      {[...rooms].sort((a, b) => Number(!!a.soldOut) - Number(!!b.soldOut)).map((r) => {
        const on = r.id === selectedId;
        const off = !!r.soldOut;
        const line = off ? "Sold out right now" : note(r);
        return (
          <label
            key={r.id}
            // Room options follow the sheet's field states: default, selected (focus look), disabled.
            // Keyboard focus always lands on the selected room, so it needs the outline on top.
            className={`flex items-center gap-4 rounded-control border p-4 transition sm:gap-6 sm:px-5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue ${
              off
                ? "cursor-not-allowed border-disabled bg-disabled"
                : on
                  ? `border-blue bg-surface ring-1 ring-blue ${locked ? "cursor-default" : "cursor-pointer"}`
                  : locked
                    ? "cursor-not-allowed border-edge bg-surface opacity-60"
                    : "cursor-pointer border-edge bg-surface hover:border-blue"
            }`}
          >
            <input type="radio" name="room" value={r.id} checked={on} disabled={off} onChange={() => onSelect(r.id)} className="sr-only" />
            <div className="min-w-0 flex-1">
              <p className={`text-base font-semibold leading-5 ${off ? "text-slate" : "text-ink"}`}>{r.name}</p>
              <p className="mt-1 text-sm text-slate">
                {/* Each dot is glued to the label after it, so a wrapped line never ends on a dot */}
                {[...r.description.split(" · ").filter(Boolean), `Sleeps ${r.sleeps}`].map((part, i) => (
                  <Fragment key={part}>
                    {i > 0 && " "}
                    <span className="whitespace-nowrap">
                      {i > 0 && "· "}
                      {part}
                    </span>
                  </Fragment>
                ))}
              </p>
              {line && <p className="text-sm text-slate">{line}</p>}
              {/* LiteAPI quotes these for the whole stay, apart from the nightly price */}
              {!off && !!r.dueAtProperty && <p className="text-sm text-slate">Plus {money(r.dueAtProperty)} in hotel fees at the property</p>}
            </div>
            {/* A sold-out LiteAPI room has no live quote, and its stored price is only a sample */}
            {!(off && r.liteapiRoomId) && (
              <div className="shrink-0 text-right">
                <p className={`text-base font-semibold ${off ? "text-slate line-through" : "text-ink"}`}>{money(r.nightly)}</p>
                <p className="text-sm text-slate">per night</p>
              </div>
            )}
            <span
              aria-hidden
              className={`hidden h-[46px] w-28 shrink-0 items-center justify-center rounded-control text-base font-semibold sm:inline-flex ${
                off ? "border border-edge text-slate" : on ? "bg-blue text-on-blue" : "border border-edge bg-surface text-ink"
              }`}
            >
              {off ? "Sold out" : on ? "Selected" : "Select"}
            </span>
          </label>
        );
      })}
    </div>
  );
}
