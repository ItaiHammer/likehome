import { AMENITY_GROUPS, AMENITY_LABELS } from "@/lib/listing-display";
import type { Amenity } from "@/types/listing";
import { Checkbox } from "./Checkbox";
import { FormSection } from "./FormSection";

type Props = {
  selected: Amenity[];
  onToggle: (amenity: Amenity, checked: boolean) => void;
};

export function AmenitiesForm({ selected, onToggle }: Props) {
  return (
    <div className="space-y-12">
      {AMENITY_GROUPS.map((group) => (
        <FormSection key={group.title} title={group.title} description={group.description} group>
          <ul className="grid gap-x-10 gap-y-5 sm:grid-cols-2">
            {group.amenities.map((amenity) => (
              <li key={amenity}>
                <Checkbox
                  id={`amenity-${amenity}`}
                  label={AMENITY_LABELS[amenity]}
                  checked={selected.includes(amenity)}
                  onChange={(checked) => onToggle(amenity, checked)}
                />
              </li>
            ))}
          </ul>
        </FormSection>
      ))}
    </div>
  );
}
