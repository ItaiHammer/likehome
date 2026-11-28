import { Button, Field, inputClass, labelClass, Stepper } from "@/app/_components/ui";
import { checkRoomForm, type RoomForm as RoomFormValues, type RoomFormErrors, type RoomTextField } from "@/lib/validation/listing";
import { ROOM_AMENITIES, type ListingRoom, type RoomAmenity } from "@/types/listing";
import { displayAmenityLabel } from "@/app/search/types";
import { Checkbox } from "./Checkbox";
import type { RoomEditor } from "./editor-state";
import { FormSection } from "./FormSection";
import { PanelHeading } from "./PanelHeading";

const FIELD_ORDER: RoomTextField[] = ["roomType", "bedConfiguration", "maxGuests", "roomCount", "nightlyRate", "description"];
const inputId = (field: RoomTextField) => `room-${field}`;

// Only these patterns survive the current room storage format unchanged.
// This is an editor-only check; no server action or database validation changes.
const supportedBeds = /^\s*[1-9]\d*\s+(?:Twin XL|Twin|Double|Queen|King)\s+bed(?:s)?\s*$/i;
// A legacy saved room with no bed size reopens as "1 bed bed". Let owners edit it without
// forcing an unrelated bed change; new rooms still require a recognized bed size.
const legacyUnknownBed = /^\s*1\s+bed\s+bed\s*$/i;
const bedFormatError = (value: string, editing: boolean) => value.trim() &&
  !supportedBeds.test(value) && !(editing && legacyUnknownBed.test(value))
  ? "Use a count and supported bed size (for example, 2 Queen beds)."
  : undefined;

type Props = {
  editor: RoomEditor;
  onChange: (field: RoomTextField, value: string) => void;
  onToggleAmenity: (amenity: RoomAmenity, checked: boolean) => void;
  onInvalid: (errors: RoomFormErrors) => void;
  onApply: (room: ListingRoom) => void;
  onCancel: () => void;
  onRemove?: () => void;
};

// "Apply changes" only updates the draft; the property's "Save changes" is what saves it.
export function RoomForm({ editor, onChange, onToggleAmenity, onInvalid, onApply, onCancel, onRemove }: Props) {
  const { form, errors, roomId } = editor;

  const control = (field: RoomTextField) => ({
    id: inputId(field),
    value: form[field],
    error: errors[field],
    onBlur: () => {
      const checked = checkRoomForm(form).errors[field];
      onInvalid({ ...errors, [field]: field === "bedConfiguration" ? checked ?? bedFormatError(form.bedConfiguration, roomId !== null) : checked });
    },
    onChange: (e: { target: { value: string } }) => onChange(field, e.target.value),
  });

  function apply() {
    const result = checkRoomForm(form);
    const checkedErrors = { ...result.errors };
    const unsupportedBeds = bedFormatError(form.bedConfiguration, roomId !== null);
    if (unsupportedBeds) checkedErrors.bedConfiguration = unsupportedBeds;
    if (!result.room || Object.keys(checkedErrors).length > 0) {
      onInvalid(checkedErrors);
      const first = FIELD_ORDER.find((field) => checkedErrors[field]);
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
        className="mt-8 space-y-10"
        onSubmit={(e) => {
          e.preventDefault();
          apply();
        }}
      >
        <FormSection title="Room details" description="Add at least one room type. All fields shown here are required.">
          <div className="grid gap-6">
            <Field label="Room type" maxLength={60} hint="For example, Garden double." {...control("roomType")} />
            <div className="grid gap-6 sm:grid-cols-2">
              <Field label="Bed configuration" maxLength={60} hint="For example, 2 queen beds." {...control("bedConfiguration")} />
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
                    onBlur={() => onInvalid({ ...errors, nightlyRate: checkRoomForm(form).errors.nightlyRate })}
                    inputMode="decimal"
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
              {/* Full row: in a half column the label wraps and drops below "Nightly rate" */}
              <div className="sm:col-span-2">
                <Stepper
                  label="Maximum guests"
                  hint="Up to 20"
                  value={Number(form.maxGuests) || 1}
                  min={1}
                  max={20}
                  onChange={(value) => onChange("maxGuests", String(value))}
                />
              </div>
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Room-specific amenities (optional)"
          description="Only select amenities available in this room type. Property-wide amenities belong in the Amenities tab."
          group
        >
          <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {ROOM_AMENITIES.map((amenity) => (
              <Checkbox
                key={amenity}
                id={`room-amenity-${amenity.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                label={displayAmenityLabel(amenity)}
                checked={form.amenities.includes(amenity)}
                onChange={(checked) => onToggleAmenity(amenity, checked)}
              />
            ))}
          </div>
        </FormSection>

        <div className="grid gap-4 lg:grid-cols-[13rem_1fr] lg:gap-10">
          <div className="flex flex-wrap gap-3 lg:col-start-2">
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
      </form>
    </>
  );
}
