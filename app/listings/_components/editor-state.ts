import { draftFromListing, HOTEL_INFO_FIELDS, roomToForm, type HotelInfoErrors, type RoomForm, type RoomFormErrors, type RoomTextField } from "../../../lib/validation/listing.ts";
import { travelerTypes } from "../../search/types.ts";
import { AMENITIES, ROOM_AMENITIES, type RoomAmenity, type Amenity, type HotelInfo, type Listing, type ListingDraft, type ListingPhoto, type ListingRoom } from "../../../types/listing.ts";

export const EDITOR_TABS = ["info", "photos", "amenities", "rooms"] as const;
export type EditorTab = (typeof EDITOR_TABS)[number];

export function toEditorTab(value: unknown): EditorTab {
  return EDITOR_TABS.find((tab) => tab === value) ?? "info";
}

export const EMPTY_DRAFT: ListingDraft = {
  name: "",
  propertyType: "" as ListingDraft["propertyType"],
  streetAddress: "",
  city: "",
  region: "",
  postalCode: "",
  country: "",
  description: "",
  amenities: [],
  idealFor: [],
  photos: [],
  rooms: [],
};

// The Add/Edit room form while it's open. Kept here, not in the form, so switching tabs doesn't lose it.
export type RoomEditor = {
  roomId: string | null; // null when adding a new room
  form: RoomForm;
  errors: RoomFormErrors;
};

export type EditorState = {
  saved: ListingDraft; // last values the server accepted
  draft: ListingDraft; // what's in the editor now, kept across tab switches
  errors: HotelInfoErrors;
  // How the last save attempt went wrong, if it did. "unreachable": the request itself failed (offline, server crash).
  problem: "none" | "invalid" | "failed" | "unreachable";
  tab: EditorTab;
  roomEditor: RoomEditor | null;
};

export type EditorAction =
  | { type: "edit"; field: keyof HotelInfo; value: string }
  | { type: "toggleAmenity"; amenity: Amenity; checked: boolean }
  | { type: "toggleIdealFor"; category: string; checked: boolean }
  | { type: "openRoom"; room?: ListingRoom }
  | { type: "editRoom"; field: RoomTextField; value: string }
  | { type: "toggleRoomAmenity"; amenity: RoomAmenity; checked: boolean }
  | { type: "roomInvalid"; errors: RoomFormErrors }
  | { type: "roomSaveInvalid"; errors: RoomFormErrors }
  | { type: "closeRoom" }
  | { type: "saveRoom"; room: ListingRoom } // adds it, or replaces the room with the same id
  | { type: "removeRoom"; id: string }
  | { type: "addPhoto"; photo: ListingPhoto }
  | { type: "makeCover"; id: string }
  | { type: "movePhoto"; id: string; by: -1 | 1 }
  | { type: "removePhoto"; id: string }
  | { type: "switchTab"; tab: EditorTab }
  | { type: "revert" }
  | { type: "saveInvalid"; errors: HotelInfoErrors }
  | { type: "saveFailed"; reason: "failed" | "unreachable" }
  | { type: "saveSucceeded"; sent: ListingDraft; saved: ListingDraft };

export function initEditorState({ listing, tab }: { listing?: Listing; tab: EditorTab }): EditorState {
  const draft = listing ? draftFromListing(listing) : EMPTY_DRAFT;
  return { saved: draft, draft, errors: {}, problem: "none", tab, roomEditor: null };
}

const sameList = <T,>(a: T[], b: T[], same: (x: T, y: T) => boolean) => a.length === b.length && a.every((x, i) => same(x, b[i]));

// One comparison per tab, so the sidebar can mark which tabs have unsaved changes.
const SAME_BY_TAB: Record<EditorTab, (a: ListingDraft, b: ListingDraft) => boolean> = {
  info: (a, b) => HOTEL_INFO_FIELDS.every((field) => a[field] === b[field]) && sameList(a.idealFor, b.idealFor, (x, y) => x === y),
  photos: (a, b) => sameList(a.photos, b.photos, (x, y) => x.id === y.id && x.url === y.url && x.caption === y.caption),
  amenities: (a, b) => sameList(a.amenities, b.amenities, (x, y) => x === y), // always kept in AMENITIES order
  rooms: (a, b) => sameList(a.rooms, b.rooms, (x, y) => (Object.keys(x) as (keyof ListingRoom)[]).every((key) => key === 'amenities'
    ? JSON.stringify(x.amenities ?? []) === JSON.stringify(y.amenities ?? []) : x[key] === y[key])),
};

export function sameDraft(a: ListingDraft, b: ListingDraft) {
  return EDITOR_TABS.every((tab) => SAME_BY_TAB[tab](a, b));
}

// True when the open room form differs from the room it started from.
export function hasRoomEdits({ roomEditor, draft }: EditorState) {
  if (!roomEditor) return false;
  const start = roomToForm(draft.rooms.find((room) => room.id === roomEditor.roomId));
  return (Object.keys(start) as (keyof RoomForm)[]).some((field) => field === 'amenities'
    ? JSON.stringify(start.amenities) !== JSON.stringify(roomEditor.form.amenities)
    : start[field] !== roomEditor.form[field]);
}

export function changedTabs(state: EditorState): EditorTab[] {
  return EDITOR_TABS.filter((tab) => !SAME_BY_TAB[tab](state.draft, state.saved) || (tab === "rooms" && hasRoomEdits(state)));
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
  const problem = state.problem === "invalid" ? "invalid" : "none";
  return { ...state, draft: { ...state.draft, ...changes }, problem };
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
    case "toggleIdealFor": {
      const { category, checked } = action;
      if (!travelerTypes.some((t) => t === category)) return state;
      return changeDraft(state, {
        idealFor: travelerTypes.filter((t) => t === category ? checked : state.draft.idealFor.includes(t)),
      });
    }
    case "openRoom":
      return { ...state, roomEditor: { roomId: action.room?.id ?? null, form: roomToForm(action.room), errors: {} } };
    case "editRoom": {
      if (!state.roomEditor) return state;
      const errors = { ...state.roomEditor.errors };
      delete errors[action.field];
      const hasErrors = Object.values(errors).some(Boolean) || Object.values(state.errors).some(Boolean);
      return {
        ...state,
        roomEditor: { ...state.roomEditor, form: { ...state.roomEditor.form, [action.field]: action.value }, errors },
        problem: state.problem === "invalid" && !hasErrors ? "none" : state.problem,
      };
    }
    case "toggleRoomAmenity": {
      if (!state.roomEditor) return state;
      const { amenity, checked } = action;
      return {
        ...state,
        roomEditor: {
          ...state.roomEditor,
          form: { ...state.roomEditor.form, amenities: ROOM_AMENITIES.filter((a) => a === amenity ? checked : state.roomEditor!.form.amenities.includes(a)) },
        },
        problem: "none",
      };
    }
    case "roomInvalid":
      return state.roomEditor ? { ...state, roomEditor: { ...state.roomEditor, errors: action.errors } } : state;
    case "roomSaveInvalid":
      return state.roomEditor
        ? { ...state, tab: "rooms", problem: "invalid", roomEditor: { ...state.roomEditor, errors: action.errors } }
        : state;
    case "closeRoom":
      return { ...state, roomEditor: null, problem: state.problem === "invalid" && Object.keys(state.errors).length === 0 ? "none" : state.problem };
    case "saveRoom": {
      const exists = rooms.some((room) => room.id === action.room.id);
      return {
        ...changeDraft(state, {
          rooms: exists ? rooms.map((room) => (room.id === action.room.id ? action.room : room)) : [...rooms, action.room],
        }),
        roomEditor: null,
        problem: "none",
      };
    }
    case "removeRoom":
      return { ...changeDraft(state, { rooms: rooms.filter((room) => room.id !== action.id) }), roomEditor: null };
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
    case "revert":
      return { ...state, draft: state.saved, errors: {}, problem: "none", roomEditor: null };
    case "saveInvalid":
      return { ...state, errors: action.errors, problem: "invalid", tab: "info" };
    case "saveFailed":
      return { ...state, problem: action.reason };
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
