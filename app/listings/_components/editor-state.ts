import { draftFromListing, HOTEL_INFO_FIELDS, type HotelInfoErrors } from "@/lib/validation/listing";
import { AMENITIES, type Amenity, type HotelInfo, type Listing, type ListingDraft, type ListingPhoto, type ListingRoom } from "@/types/listing";

export const EDITOR_TABS = ["info", "photos", "amenities", "rooms"] as const;
export type EditorTab = (typeof EDITOR_TABS)[number];

export function toEditorTab(value: unknown): EditorTab {
  return EDITOR_TABS.find((tab) => tab === value) ?? "info";
}

export const EMPTY_DRAFT: ListingDraft = {
  name: "",
  propertyType: "hotel",
  streetAddress: "",
  city: "",
  region: "",
  postalCode: "",
  country: "",
  description: "",
  amenities: [],
  photos: [],
  rooms: [],
};

export type EditorState = {
  saved: ListingDraft; // last values the server accepted
  draft: ListingDraft; // what's in the editor now, kept across tab switches
  errors: HotelInfoErrors;
  problem: "none" | "invalid" | "failed"; // how the last save attempt went wrong, if it did
  tab: EditorTab;
};

export type EditorAction =
  | { type: "edit"; field: keyof HotelInfo; value: string }
  | { type: "toggleAmenity"; amenity: Amenity; checked: boolean }
  | { type: "saveRoom"; room: ListingRoom } // adds it, or replaces the room with the same id
  | { type: "removeRoom"; id: string }
  | { type: "addPhoto"; photo: ListingPhoto }
  | { type: "makeCover"; id: string }
  | { type: "movePhoto"; id: string; by: -1 | 1 }
  | { type: "removePhoto"; id: string }
  | { type: "switchTab"; tab: EditorTab }
  | { type: "saveInvalid"; errors: HotelInfoErrors }
  | { type: "saveFailed" }
  | { type: "saveSucceeded"; sent: ListingDraft; saved: ListingDraft };

export function initEditorState({ listing, tab }: { listing?: Listing; tab: EditorTab }): EditorState {
  const draft = listing ? draftFromListing(listing) : EMPTY_DRAFT;
  return { saved: draft, draft, errors: {}, problem: "none", tab };
}

const sameList = <T,>(a: T[], b: T[], same: (x: T, y: T) => boolean) => a.length === b.length && a.every((x, i) => same(x, b[i]));

export function sameDraft(a: ListingDraft, b: ListingDraft) {
  return (
    HOTEL_INFO_FIELDS.every((field) => a[field] === b[field]) &&
    sameList(a.amenities, b.amenities, (x, y) => x === y) && // always kept in AMENITIES order
    sameList(a.photos, b.photos, (x, y) => x.id === y.id && x.url === y.url && x.caption === y.caption) &&
    sameList(a.rooms, b.rooms, (x, y) =>
      (Object.keys(x) as (keyof ListingRoom)[]).every((key) => x[key] === y[key]),
    )
  );
}

// Moves the item at `from` to `to`, returning a new array.
function move<T>(items: T[], from: number, to: number) {
  const copy = [...items];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

// Any change to rooms, photos or amenities: a failed save becomes plain "unsaved changes" again.
function changeDraft(state: EditorState, changes: Partial<ListingDraft>): EditorState {
  return { ...state, draft: { ...state.draft, ...changes }, problem: state.problem === "failed" ? "none" : state.problem };
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  const { photos, rooms } = state.draft;
  switch (action.type) {
    case "edit": {
      // Editing a field clears its error; the save problem clears once no errors are left.
      const errors = { ...state.errors };
      delete errors[action.field];
      const stillInvalid = state.problem === "invalid" && Object.keys(errors).length > 0;
      return {
        ...state,
        draft: { ...state.draft, [action.field]: action.value } as ListingDraft,
        errors,
        problem: stillInvalid ? "invalid" : "none",
      };
    }
    case "toggleAmenity": {
      const { amenity, checked } = action;
      return changeDraft(state, {
        amenities: AMENITIES.filter((a) => (a === amenity ? checked : state.draft.amenities.includes(a))),
      });
    }
    case "saveRoom": {
      const exists = rooms.some((room) => room.id === action.room.id);
      return changeDraft(state, {
        rooms: exists ? rooms.map((room) => (room.id === action.room.id ? action.room : room)) : [...rooms, action.room],
      });
    }
    case "removeRoom":
      return changeDraft(state, { rooms: rooms.filter((room) => room.id !== action.id) });
    case "addPhoto":
      return changeDraft(state, { photos: [...photos, action.photo] });
    case "makeCover": {
      const index = photos.findIndex((photo) => photo.id === action.id);
      return index <= 0 ? state : changeDraft(state, { photos: move(photos, index, 0) });
    }
    case "movePhoto": {
      const index = photos.findIndex((photo) => photo.id === action.id);
      const to = index + action.by;
      return index === -1 || to < 0 || to >= photos.length ? state : changeDraft(state, { photos: move(photos, index, to) });
    }
    case "removePhoto":
      return changeDraft(state, { photos: photos.filter((photo) => photo.id !== action.id) });
    case "switchTab":
      return { ...state, tab: action.tab };
    case "saveInvalid":
      return { ...state, errors: action.errors, problem: "invalid", tab: "info" };
    case "saveFailed":
      return { ...state, problem: "failed" };
    case "saveSucceeded":
      return {
        ...state,
        saved: action.saved,
        // The server trims values. Take its version unless the owner kept editing while it saved.
        draft: sameDraft(state.draft, action.sent) ? action.saved : state.draft,
        errors: {},
        problem: "none",
      };
  }
}
