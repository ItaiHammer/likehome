import { Field, TextArea } from "@/app/_components/ui";
import { PropertyPicker } from "@/app/property-dashboard/_components/PropertyPicker";
import { PROPERTY_TYPE_LABELS } from "@/lib/listing-display";
import { MAX_LENGTH, type HotelInfoErrors } from "@/lib/validation/listing";
import { PROPERTY_TYPES, type HotelInfo } from "@/types/listing";
import { FormSection } from "./FormSection";
import { Checkbox } from "./Checkbox";
import { travelerTypes } from "@/app/search/types";

const PROPERTY_TYPE_OPTIONS = [
  { value: "", label: "Choose a property type" },
  ...PROPERTY_TYPES.map((type) => ({ value: type, label: PROPERTY_TYPE_LABELS[type] })),
];

export const fieldId = (field: keyof HotelInfo) => `listing-${field}`;

type Props = {
  info: HotelInfo;
  errors: HotelInfoErrors;
  onChange: (field: keyof HotelInfo, value: string) => void;
  idealFor: readonly string[];
  onToggleIdealFor: (category: string, checked: boolean) => void;
};

export function HotelInfoForm({ info, errors, onChange, idealFor, onToggleIdealFor }: Props) {
  const control = (field: keyof HotelInfo) => ({
    id: fieldId(field),
    value: info[field],
    error: errors[field],
    onChange: (event: { target: { value: string } }) => onChange(field, event.target.value),
  });

  return (
    <div className="space-y-12">
      <p className="text-sm text-slate"><span className="font-semibold text-ink">Required:</span> Property details and location. Description is optional.</p>
      <FormSection title="Property details" description="Introduce your property to guests.">
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Property name" maxLength={MAX_LENGTH.name} {...control("name")} />
          <PropertyPicker id={fieldId("propertyType")} label="Property type" options={PROPERTY_TYPE_OPTIONS} value={info.propertyType} onChange={(value) => onChange("propertyType", value)} error={errors.propertyType} />
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
            <Field
              label="Country"
              placeholder="Enter a country"
              autoComplete="off"
              maxLength={MAX_LENGTH.country}
              {...control("country")}
              value={info.country}
            />
          </div>
        </div>
      </FormSection>

      <FormSection title="Ideal for (optional)" description="Which travelers is this property a good fit for? Select all that apply. This appears on the public listing and in preview.">
        <div role="group" aria-label="Ideal for" className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          {travelerTypes.map((category) => (
            <Checkbox
              key={category}
              id={`ideal-for-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
              label={category}
              checked={idealFor.includes(category)}
              onChange={(checked) => onToggleIdealFor(category, checked)}
            />
          ))}
        </div>
      </FormSection>

      <FormSection title="Description (optional)" description="Tell guests what makes your stay special.">
        <TextArea
          label="Property description"
          hint={`Guests will see this on your listing - ${info.description.length} / ${MAX_LENGTH.description}`}
          rows={3}
          maxLength={MAX_LENGTH.description}
          {...control("description")}
        />
      </FormSection>
    </div>
  );
}
