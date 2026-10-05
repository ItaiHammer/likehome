import { useState } from "react";
import { Button, Field, TextArea } from "@/app/_components/ui";
import { checkRoomForm, roomToForm, type RoomForm as RoomFormValues, type RoomFormErrors } from "@/lib/validation/listing";
import type { ListingRoom } from "@/types/listing";
import { FormSection } from "./FormSection";
import { PanelHeading } from "./PanelHeading";

const FIELD_ORDER: (keyof RoomFormValues)[] = ["roomType", "bedConfiguration", "maxGuests", "roomCount", "nightlyRate", "description"];
const inputId = (field: keyof RoomFormValues) => `room-${field}`;

type Props = {
  room?: ListingRoom; // missing when adding a new room
  onApply: (room: ListingRoom) => void;
  onCancel: () => void;
  onRemove?: () => void;
};

// "Apply changes" only updates the draft; the property's "Save changes" is what saves it.
export function RoomForm({ room, onApply, onCancel, onRemove }: Props) {
  const [form, setForm] = useState(() => roomToForm(room));
  const [errors, setErrors] = useState<RoomFormErrors>({});

  const control = (field: keyof RoomFormValues) => ({
    id: inputId(field),
    value: form[field],
    error: errors[field],
    onChange: (e: { target: { value: string } }) => {
      setForm((current) => ({ ...current, [field]: e.target.value }));
      setErrors((current) => {
        const next = { ...current };
        delete next[field];
        return next;
      });
    },
  });

  function apply() {
    const result = checkRoomForm(form);
    if (!result.room) {
      setErrors(result.errors);
      const first = FIELD_ORDER.find((field) => result.errors[field]);
      if (first) document.getElementById(inputId(first))?.focus();
      return;
    }
    onApply({ id: room?.id ?? crypto.randomUUID(), ...result.room });
  }

  return (
    <>
      <PanelHeading title={room ? "Edit room" : "Add room"} subtitle="Changes are applied to your property before you save." />
      <form
        noValidate
        className="mt-8"
        onSubmit={(e) => {
          e.preventDefault();
          apply();
        }}
      >
        <FormSection title="Room details" description="Describe this room type and its availability.">
          <div className="grid gap-6">
            <Field label="Room type" maxLength={60} {...control("roomType")} />
            <div className="grid gap-6 sm:grid-cols-2">
              <Field label="Bed configuration" maxLength={60} {...control("bedConfiguration")} />
              <Field label="Maximum guests" inputMode="numeric" {...control("maxGuests")} />
              <Field label="Number of rooms" inputMode="numeric" {...control("roomCount")} />
              <Field label="Nightly rate (USD)" inputMode="decimal" {...control("nightlyRate")} />
            </div>
            <TextArea label="Room description" rows={3} maxLength={1000} {...control("description")} />
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit">{room ? "Apply changes" : "Add room"}</Button>
              {onRemove && (
                <Button variant="ghost" onClick={onRemove} className="sm:ml-auto">
                  Remove room
                </Button>
              )}
            </div>
          </div>
        </FormSection>
      </form>
    </>
  );
}
