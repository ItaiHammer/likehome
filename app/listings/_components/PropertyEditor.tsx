"use client";

// Client Component: it holds the draft in state, reacts to typing and clicks, and blocks leaving with unsaved changes.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useReducer, useState, useTransition } from "react";
import { flushSync } from "react-dom";
import { errorSummary, firstErrorField, validateHotelInfo, type HotelInfoErrors } from "@/lib/validation/listing";
import type { Listing } from "@/types/listing";
import { createProperty, saveListing } from "../actions";
import { AmenitiesForm } from "./AmenitiesForm";
import { DiscardDialog } from "./DiscardDialog";
import { EditorSidebar } from "./EditorSidebar";
import { EditorTopBar } from "./EditorTopBar";
import { editorReducer, initEditorState, sameDraft, type EditorTab } from "./editor-state";
import { fieldId, HotelInfoForm } from "./HotelInfoForm";
import { ListingPreview } from "./ListingPreview";
import { PanelHeading } from "./PanelHeading";
import { PhotosPanel } from "./PhotosPanel";
import { RoomsPanel } from "./RoomsPanel";

// `listing` is missing when creating a new property.
export function PropertyEditor({ listing, initialTab }: { listing?: Listing; initialTab: EditorTab }) {
  const isNew = !listing;
  const router = useRouter();
  const [state, dispatch] = useReducer(editorReducer, { listing, tab: initialTab }, initEditorState);
  const [isSaving, startSaving] = useTransition();
  const [leaveTo, setLeaveTo] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const dirty = !sameDraft(state.draft, state.saved);
  const cover = state.draft.photos[0]; // the draft's cover, so "Make cover" shows before saving

  // Closing the tab or reloading with unsaved changes: the browser shows its own "Leave site?" prompt.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function showTab(tab: EditorTab) {
    dispatch({ type: "switchTab", tab });
    window.history.replaceState(null, "", `?tab=${tab}`);
  }

  function showErrors(errors: HotelInfoErrors) {
    // flushSync renders the Hotel information tab right away, so its first invalid field exists to focus.
    flushSync(() => dispatch({ type: "saveInvalid", errors }));
    window.history.replaceState(null, "", "?tab=info");
    const first = firstErrorField(errors);
    if (first) document.getElementById(fieldId(first))?.focus();
  }

  function save() {
    const errors = validateHotelInfo(state.draft);
    if (firstErrorField(errors)) return showErrors(errors);

    const sent = state.draft;
    startSaving(async () => {
      const result = listing ? await saveListing(listing.id, sent) : await createProperty(sent);
      if (result.status === "invalid") showErrors(result.errors);
      else if (result.status === "failed") dispatch({ type: "saveFailed" });
      else if (isNew) router.replace(`/listings/${result.id}/edit`);
      else dispatch({ type: "saveSucceeded", sent, saved: result.saved });
    });
  }

  if (previewing) {
    return (
      <ListingPreview
        draft={state.draft}
        onBack={() => {
          setPreviewing(false);
          window.scrollTo(0, 0);
        }}
      />
    );
  }

  const status = isSaving
    ? "Saving..."
    : state.problem === "failed"
      ? "Changes weren't saved"
      : state.problem === "invalid"
        ? "Changes need attention"
        : dirty || isNew
          ? "Unsaved changes"
          : "All changes saved";

  const notice =
    state.problem === "invalid"
      ? errorSummary(state.errors)
      : state.problem === "failed"
        ? "Your edits are kept. Retry saving when you're ready."
        : null;

  const backLink = (
    <Link
      href="/listings"
      onNavigate={(e) => {
        if (!dirty) return;
        e.preventDefault();
        setLeaveTo("/listings");
      }}
      className="inline-flex items-center gap-2 text-sm text-blue hover:text-blue-dark"
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M16 10H4M9 5l-5 5 5 5" />
      </svg>
      Back to My listings
    </Link>
  );

  return (
    <div className="flex w-full flex-1 flex-col bg-surface md:flex-row">
      <EditorSidebar saved={state.saved} cover={cover} isNew={isNew} tab={state.tab} onSelectTab={showTab} backLink={backLink} />

      <main className="min-w-0 flex-1 px-4 py-8 sm:px-8">
        <div className="max-w-5xl">
          <EditorTopBar
            saved={state.saved}
            cover={cover}
            isNew={isNew}
            status={status}
            saveLabel={state.problem === "failed" ? "Retry" : isNew ? "Create listing" : "Save changes"}
            isSaving={isSaving}
            onSave={save}
            onPreview={() => {
              setPreviewing(true);
              window.scrollTo(0, 0);
            }}
          />

          {notice && (
            <p role="alert" className="mt-8 text-sm text-danger">
              {notice}
            </p>
          )}

          <div className="mt-10">
            {state.tab === "info" && (
              <>
                <PanelHeading title={isNew ? "Create your property" : "Hotel information"} />
                <div className="mt-8">
                  <HotelInfoForm
                    info={state.draft}
                    errors={state.errors}
                    onChange={(field, value) => dispatch({ type: "edit", field, value })}
                  />
                </div>
              </>
            )}
            {state.tab === "photos" && (
              <PhotosPanel
                photos={state.draft.photos}
                onAddPhoto={(photo) => dispatch({ type: "addPhoto", photo })}
                onMakeCover={(id) => dispatch({ type: "makeCover", id })}
                onMove={(id, by) => dispatch({ type: "movePhoto", id, by })}
                onRemove={(id) => dispatch({ type: "removePhoto", id })}
              />
            )}
            {state.tab === "amenities" && (
              <>
                <PanelHeading title="Amenities" subtitle="Choose what guests can expect during their stay." />
                <div className="mt-8">
                  <AmenitiesForm
                    selected={state.draft.amenities}
                    onToggle={(amenity, checked) => dispatch({ type: "toggleAmenity", amenity, checked })}
                  />
                </div>
              </>
            )}
            {state.tab === "rooms" && (
              <RoomsPanel
                rooms={state.draft.rooms}
                onSaveRoom={(room) => dispatch({ type: "saveRoom", room })}
                onRemoveRoom={(id) => dispatch({ type: "removeRoom", id })}
              />
            )}
          </div>
        </div>
      </main>

      <DiscardDialog
        open={leaveTo !== null}
        onKeepEditing={() => setLeaveTo(null)}
        onDiscard={() => {
          if (leaveTo) router.push(leaveTo);
          setLeaveTo(null);
        }}
      />
    </div>
  );
}
