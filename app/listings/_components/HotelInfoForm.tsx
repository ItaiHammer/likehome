import { Field, Select, TextArea } from "@/app/_components/ui";
import { COUNTRIES, PROPERTY_TYPE_LABELS } from "@/lib/listing-display";
import { MAX_LENGTH, type HotelInfoErrors } from "@/lib/validation/listing";
import { PROPERTY_TYPES, type HotelInfo } from "@/types/listing";
import { FormSection } from "./FormSection";

const PROPERTY_TYPE_OPTIONS = PROPERTY_TYPES.map((type) => ({ value: type, label: PROPERTY_TYPE_LABELS[type] }));
const COUNTRY_OPTIONS = [{ value: "", label: "Choose a country" }, ...COUNTRIES];

export const fieldId = (field: keyof HotelInfo) => `listing-${field}`;

type Props = {
  info: HotelInfo;
  errors: HotelInfoErrors;
  onChange: (field: keyof HotelInfo, value: string) => void;
};

export function HotelInfoForm({ info, errors, onChange }: Props) {
  // The props every control shares: id, current value, error, and reporting changes up to the editor
  const control = (field: keyof HotelInfo) => ({
    id: fieldId(field),
    value: info[field],
    error: errors[field],
    onChange: (e: { target: { value: string } }) => onChange(field, e.target.value),
  });

  return (
    <div className="space-y-12">
      <FormSection title="Property details" description="Introduce your property to guests.">
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Property name" maxLength={MAX_LENGTH.name} {...control("name")} />
          <Select label="Property type" options={PROPERTY_TYPE_OPTIONS} {...control("propertyType")} />
        </div>
      </FormSection>

      <FormSection title="Location" description="Use the address guests will arrive at.">
        <div className="grid gap-6">
          <Field label="Street address" maxLength={MAX_LENGTH.streetAddress} {...control("streetAddress")} />
          <div className="grid gap-6 sm:grid-cols-3">
            <Field label="City" maxLength={MAX_LENGTH.city} {...control("city")} />
            <Field label="State or region" maxLength={MAX_LENGTH.region} {...control("region")} />
            <Field label="Postal code" maxLength={MAX_LENGTH.postalCode} {...control("postalCode")} />
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <Select label="Country" options={COUNTRY_OPTIONS} {...control("country")} />
          </div>
        </div>
      </FormSection>

      <FormSection title="Description" description="Tell guests what makes your stay special.">
        <TextArea
          label="Property description"
          hint="Guests will see these details on your listing."
          rows={3}
          maxLength={MAX_LENGTH.description}
          {...control("description")}
        />
      </FormSection>
    </div>
  );
}
