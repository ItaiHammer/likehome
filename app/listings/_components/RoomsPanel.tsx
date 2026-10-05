import { useState } from "react";
import { Button } from "@/app/_components/ui";
import { formatPrice } from "@/lib/listing-display";
import type { ListingRoom } from "@/types/listing";
import { PanelHeading } from "./PanelHeading";
import { RoomForm } from "./RoomForm";

type Props = {
  rooms: ListingRoom[];
  onSaveRoom: (room: ListingRoom) => void;
  onRemoveRoom: (id: string) => void;
};

// The Rooms tab: a table of room types, or the form for adding or editing one.
export function RoomsPanel({ rooms, onSaveRoom, onRemoveRoom }: Props) {
  // null = showing the table; "new" = adding a room; otherwise the room being edited
  const [editing, setEditing] = useState<ListingRoom | "new" | null>(null);

  if (editing) {
    const room = editing === "new" ? undefined : editing;
    return (
      <RoomForm
        key={room?.id ?? "new"}
        room={room}
        onCancel={() => setEditing(null)}
        onApply={(saved) => {
          onSaveRoom(saved);
          setEditing(null);
        }}
        onRemove={
          room
            ? () => {
                onRemoveRoom(room.id);
                setEditing(null);
              }
            : undefined
        }
      />
    );
  }

  const th = "py-3 pr-4 font-semibold text-slate";
  const td = "py-5 pr-4 text-ink";

  return (
    <>
      <PanelHeading
        title="Rooms"
        subtitle="Manage room types, capacity and nightly rates."
        action={
          <Button variant="secondary" onClick={() => setEditing("new")}>
            Add room
          </Button>
        }
      />
      {rooms.length === 0 ? (
        <p className="mt-8 text-slate">No rooms yet. Add the room types guests can book.</p>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left">
            <thead>
              <tr className="border-b border-edge">
                <th scope="col" className={th}>Room type</th>
                <th scope="col" className={th}>Beds</th>
                <th scope="col" className={th}>Guests</th>
                <th scope="col" className={th}>Rooms</th>
                <th scope="col" className={th}>Nightly rate</th>
                <th scope="col" className={th}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr key={room.id} className="border-b border-edge">
                  <td className={td}>{room.roomType}</td>
                  <td className={td}>{room.bedConfiguration}</td>
                  <td className={td}>{room.maxGuests}</td>
                  <td className={td}>{room.roomCount}</td>
                  <td className={td}>{formatPrice(room.nightlyRateCents)}</td>
                  <td className="py-3 text-right">
                    <Button variant="secondary" onClick={() => setEditing(room)}>
                      Edit<span className="sr-only">: {room.roomType}</span>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
