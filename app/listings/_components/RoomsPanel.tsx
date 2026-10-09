import { Button } from "@/app/_components/ui";
import { formatPrice, plural } from "@/lib/listing-display";
import { MAX_ROOMS, type RoomForm as RoomFormValues, type RoomFormErrors } from "@/lib/validation/listing";
import type { ListingRoom } from "@/types/listing";
import type { RoomEditor } from "./editor-state";
import { PanelHeading } from "./PanelHeading";
import { RoomForm } from "./RoomForm";

type Props = {
  rooms: ListingRoom[];
  editor: RoomEditor | null;
  onOpen: (room?: ListingRoom) => void;
  onChange: (field: keyof RoomFormValues, value: string) => void;
  onInvalid: (errors: RoomFormErrors) => void;
  onApply: (room: ListingRoom) => void;
  onCancel: () => void;
  onRemove: (room: ListingRoom) => void;
};

// Room type · beds · guests · rooms · rate · Edit, shared by the label row and every card so they line up.
const COLUMNS = "sm:grid-cols-[2fr_1.5fr_0.8fr_0.8fr_1fr_3.5rem] sm:gap-4"; // fixed last column, so the cards and labels share widths

// The Rooms tab: room types as clickable cards laid out like a table, or the form for adding or editing one.
export function RoomsPanel({ rooms, editor, onOpen, onChange, onInvalid, onApply, onCancel, onRemove }: Props) {
  if (editor) {
    const room = rooms.find((r) => r.id === editor.roomId);
    return (
      <RoomForm
        editor={editor}
        onChange={onChange}
        onInvalid={onInvalid}
        onApply={onApply}
        onCancel={onCancel}
        onRemove={room ? () => onRemove(room) : undefined}
      />
    );
  }

  const atLimit = rooms.length >= MAX_ROOMS;

  return (
    <>
      <PanelHeading
        title="Rooms"
        subtitle="Manage room types, capacity and nightly rates."
        action={
          <Button variant="secondary" onClick={() => onOpen()} disabled={atLimit}>
            Add room
          </Button>
        }
      />
      {atLimit && <p className="mt-4 text-sm text-slate">Listings can have up to {MAX_ROOMS} room types.</p>}
      {rooms.length === 0 ? (
        <p className="mt-8 text-slate">No rooms yet. Add the room types guests can book.</p>
      ) : (
        <div className="mt-8">
          {/* Column labels for sighted users; each card's button already announces every value */}
          <div aria-hidden className={`hidden border border-transparent px-4 pb-2 text-sm font-semibold text-slate sm:grid ${COLUMNS}`}>
            <span>Room type</span>
            <span>Beds</span>
            <span>Guests</span>
            <span>Rooms</span>
            <span>Nightly rate</span>
            <span />
          </div>
          <ul className="space-y-2">
            {rooms.map((room) => (
              <li key={room.id}>
                <button
                  type="button"
                  onClick={() => onOpen(room)}
                  aria-label={`Edit ${room.roomType}, ${room.bedConfiguration}, ${plural(room.maxGuests, "guest")}, ${plural(room.roomCount, "room")}, ${formatPrice(room.nightlyRateCents)} per night`}
                  className={`group flex w-full items-center gap-4 rounded-lg border border-edge bg-surface p-4 text-left transition-colors hover:border-blue hover:bg-blue/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue sm:grid ${COLUMNS}`}
                >
                  {/* Stacked on phones; from sm up, `contents` lets each value sit in its table column */}
                  <span className="block min-w-0 flex-1 sm:contents">
                    <span className="block truncate font-semibold text-ink">{room.roomType}</span>
                    <span className="mt-1 block text-sm text-slate sm:hidden">
                      {room.bedConfiguration} · {plural(room.maxGuests, "guest")} · {plural(room.roomCount, "room")}
                    </span>
                    <span className="hidden truncate text-ink sm:block">{room.bedConfiguration}</span>
                    <span className="hidden text-ink sm:block">{room.maxGuests}</span>
                    <span className="hidden text-ink sm:block">{room.roomCount}</span>
                    <span className="mt-1 block text-sm text-ink sm:mt-0 sm:text-base">
                      <span className="font-semibold">{formatPrice(room.nightlyRateCents)}</span>
                      <span className="text-slate sm:hidden"> / night</span>
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-blue group-hover:text-blue-dark">
                    Edit
                    <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
