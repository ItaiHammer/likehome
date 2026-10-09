import { Button, Field, inputClass, labelClass, Stepper, TextArea } from "@/app/_components/ui";
import { checkRoomForm, type RoomForm as RoomFormValues, type RoomFormErrors } from "@/lib/validation/listing";
import type { ListingRoom } from "@/types/listing";
import type { RoomEditor } from "./editor-state";
import { FormSection } from "./FormSection";
import { PanelHeading } from "./PanelHeading";

const FIELD_ORDER: (keyof RoomFormValues)[] = ["roomType", "bedConfiguration", "maxGuests", "roomCount", "nightlyRate", "description"];
const inputId = (field: keyof RoomFormValues) => `room-${field}`;

type Props = {
  editor: RoomEditor;
  onChange: (field: keyof RoomFormValues, value: string) => void;
  onInvalid: (errors: RoomFormErrors) => void;
  onApply: (room: ListingRoom) => void;
  onCancel: () => void;
  onRemove?: () => void;
};

// "Apply changes" only updates the draft; the property's "Save changes" is what saves it.
export function RoomForm({ editor, onChange, onInvalid, onApply, onCancel, onRemove }: Props) {
  const { form, errors, roomId } = editor;

  const control = (field: keyof RoomFormValues) => ({
    id: inputId(field),
    value: form[field],
    error: errors[field],
    onChange: (e: { target: { value: string } }) => onChange(field, e.target.value),
  });

  function apply() {
    const result = checkRoomForm(form);
    if (!result.room) {
      onInvalid(result.errors);
      const first = FIELD_ORDER.find((field) => result.errors[field]);
      if (first) document.getElementById(inputId(first))?.focus();
      return;
    }
    onApply({ id: roomId ?? crypto.randomUUID(), ...result.room });
  }

  return (
    <>
      <PanelHeading title={roomId ? "Edit room" : "Add room"} subtitle="Changes are applied to your property before you save." />
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
            <Field label="Room type" maxLength={60} placeholder="Coastal king" {...control("roomType")} />
            <div className="grid gap-6 sm:grid-cols-2">
              <Field label="Bed configuration" maxLength={60} placeholder="1 king bed" {...control("bedConfiguration")} />
              <Field label="Rooms of this type" hint="How many you can rent out at once. Guests don't see this." inputMode="numeric" {...control("roomCount")} />
              {/* Field's markup with a $ inside the box; it accepts "189", "$189" or "1,189.50" */}
              <div>
                <label htmlFor={inputId("nightlyRate")} className={labelClass}>
                  Nightly rate (USD)
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-slate" aria-hidden>
                    $
                  </span>
                  <input
                    id={inputId("nightlyRate")}
                    value={form.nightlyRate}
                    onChange={(e) => onChange("nightlyRate", e.target.value)}
                    inputMode="decimal"
                    placeholder="189"
                    aria-invalid={!!errors.nightlyRate}
                    aria-describedby={errors.nightlyRate ? `${inputId("nightlyRate")}-error` : undefined}
                    className={`${inputClass(!!errors.nightlyRate)} pl-8!`}
                  />
                </div>
                {errors.nightlyRate && (
                  <p id={`${inputId("nightlyRate")}-error`} className="mt-1.5 text-sm text-danger">
                    {errors.nightlyRate}
                  </p>
                )}
              </div>
              <Stepper
                label="Maximum guests"
                hint="Up to 20"
                value={Number(form.maxGuests) || 1}
                min={1}
                max={20}
                onChange={(value) => onChange("maxGuests", String(value))}
              />
            </div>
            <TextArea
              label="Room description"
              hint={`${form.description.length} / 1000`}
              rows={3}
              maxLength={1000}
              {...control("description")}
            />
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit">{roomId ? "Apply changes" : "Add room"}</Button>
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
