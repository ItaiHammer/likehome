"use client";

// Client Component: it holds the draft in state, reacts to typing and clicks, and asks before unsaved work is lost.
import Link from "next/link";
import { useReducer, useState, useTransition } from "react";
import { flushSync } from "react-dom";
import { Card } from "@/app/_components/ui";
import { errorSummary, firstErrorField, validateHotelInfo, type HotelInfoErrors } from "@/lib/validation/listing";
import type { Listing } from "@/types/listing";
import { createProperty, saveListing, type SaveResult } from "../actions";
import { AmenitiesForm } from "./AmenitiesForm";
import { ConfirmDialog, type ConfirmRequest } from "./ConfirmDialog";
import { changedTabs, editorReducer, hasRoomEdits, initEditorState, sameDraft, type EditorTab } from "./editor-state";
import { EditorSidebar } from "./EditorSidebar";
import { EditorHeader, SaveBar, type SaveStatus } from "./EditorTopBar";
import { fieldId, HotelInfoForm } from "./HotelInfoForm";
import { ListingPreview } from "./ListingPreview";
import { OfflineNotice } from "./OfflineNotice";
import { PanelHeading } from "./PanelHeading";
import { PhotosPanel } from "./PhotosPanel";
import { RoomsPanel } from "./RoomsPanel";
import { useLeaveGuard } from "./useLeaveGuard";
import { usePhotoUploads } from "./usePhotoUploads";

const arrowLink = "inline-flex items-center gap-2 text-sm font-semibold text-blue hover:text-blue-dark";
const backArrow = (
  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M16 10H4M9 5l-5 5 5 5" />
  </svg>
);

// `listing` is missing when creating a new property.
export function PropertyEditor({ listing, initialTab, initialPreview = false }: { listing?: Listing; initialTab: EditorTab; initialPreview?: boolean }) {
  const isNew = !listing;
  const [state, dispatch] = useReducer(editorReducer, { listing, tab: initialTab }, initEditorState);
  const [isSaving, startSaving] = useTransition();
  const [previewing, setPreviewing] = useState(initialPreview);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const uploads = usePhotoUploads((photo) => dispatch({ type: "addPhoto", photo }));

  const dirty = !sameDraft(state.draft, state.saved);
  const unsaved = dirty || uploads.uploads.length > 0 || hasRoomEdits(state);
  const cover = state.draft.photos[0]; // the draft's cover, so "Make cover" shows before saving

  const guard = useLeaveGuard(unsaved, (attempt) =>
    setConfirm({
      title: "Discard unsaved changes?",
      description: "Your changes will be lost if you leave this property.",
      cancelLabel: "Keep editing",
      confirmLabel: "Discard changes",
      onConfirm: attempt.leave,
      onCancel: () => {
        attempt.stay();
        window.history.replaceState(null, "", `?tab=${state.tab}`); // Back may have restored an older ?tab=
      },
    }),
  );

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
      let result: SaveResult;
      try {
        if (isNew) await guard.release();
        result = listing ? await saveListing(listing.id, sent) : await createProperty(sent);
      } catch {
        // Offline, timed out, or the server crashed: keep the edits and offer Retry instead of an error page
        dispatch({ type: "saveFailed", reason: "unreachable" });
        guard.restore();
        return;
      }
      if (result.status !== "saved") guard.restore();
      if (result.status === "invalid") showErrors(result.errors);
      else if (result.status === "failed") dispatch({ type: "saveFailed", reason: "failed" });
      else if (isNew) guard.replace(`/listings/${result.id}/edit`);
      else dispatch({ type: "saveSucceeded", sent, saved: result.saved });
    });
  }

  function discardChanges() {
    setConfirm({
      title: "Discard your changes?",
      description: isNew ? "The form will be cleared." : "Everything goes back to how it was when you last saved.",
      cancelLabel: "Keep editing",
      confirmLabel: "Discard changes",
      onConfirm: () => {
        uploads.clear();
        dispatch({ type: "revert" });
      },
    });
  }

  function togglePreview(on: boolean) {
    setPreviewing(on);
    window.history.replaceState(null, "", on ? `?tab=${state.tab}&preview=1` : `?tab=${state.tab}`);
    window.scrollTo(0, 0);
  }

  const dialog = <ConfirmDialog request={confirm} onDone={() => setConfirm(null)} />;

  if (previewing) {
    return (
      <>
        <ListingPreview
          draft={state.draft}
          backLink={
            <button type="button" onClick={() => togglePreview(false)} className={arrowLink}>
              {backArrow}
              Back to editing
            </button>
          }
        />
        {dialog}
      </>
    );
  }

  const infoErrors = Object.keys(state.errors).length;
  const status: SaveStatus = isSaving
    ? { kind: "saving", text: "Saving your changes" }
    : state.problem === "unreachable"
      ? { kind: "problem", text: "Couldn't reach LikeHome" }
      : state.problem === "failed"
        ? { kind: "problem", text: "Changes weren't saved" }
        : state.problem === "invalid"
          ? { kind: "problem", text: "Changes need attention" }
          : unsaved || isNew
            ? { kind: "unsaved", text: "Unsaved changes" }
            : { kind: "saved", text: "All changes saved" };

  const notice =
    state.problem === "invalid"
      ? errorSummary(state.errors)
      : state.problem === "unreachable"
        ? "We couldn't reach LikeHome. Your edits are still here; check your connection and retry."
        : state.problem === "failed"
          ? "Your edits are kept. Retry saving when you're ready."
          : null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 md:flex-row md:gap-8 md:py-12">
      <EditorSidebar
        tab={state.tab}
        changed={changedTabs(state)}
        infoErrors={infoErrors}
        onSelectTab={showTab}
        backLink={
          <Link href="/listings" className={arrowLink}>
            {backArrow}
            Back to My listings
          </Link>
        }
      />

      <main className="min-w-0 flex-1">
        <EditorHeader saved={state.saved} cover={cover} isNew={isNew} />
        <SaveBar
          status={status}
          saveLabel={state.problem === "failed" || state.problem === "unreachable" ? "Retry" : isNew ? "Create listing" : "Save changes"}
          isSaving={isSaving}
          canDiscard={unsaved && !isSaving}
          onSave={save}
          onPreview={() => togglePreview(true)}
          onDiscard={discardChanges}
        />
        <OfflineNotice />

        {notice && (
          <p role="alert" className="mt-6 text-sm text-danger">
            {notice}
          </p>
        )}

        <Card className="mt-6 sm:p-8">
          {state.tab === "info" && (
            <>
              <PanelHeading title={isNew ? "Create your property" : "Hotel information"} />
              <div className="mt-8">
                <HotelInfoForm info={state.draft} errors={state.errors} onChange={(field, value) => dispatch({ type: "edit", field, value })} />
              </div>
            </>
          )}
          {state.tab === "photos" && (
            <PhotosPanel
              photos={state.draft.photos}
              uploads={uploads.uploads}
              onStartUploads={uploads.start}
              onRetryUpload={uploads.retry}
              onRemoveUpload={uploads.remove}
              onMakeCover={(id) => dispatch({ type: "makeCover", id })}
              onMove={(id, by) => dispatch({ type: "movePhoto", id, by })}
              onRemove={(id) => dispatch({ type: "removePhoto", id })}
            />
          )}
          {state.tab === "amenities" && (
            <>
              <PanelHeading title="Amenities" subtitle="Choose what guests can expect during their stay." />
              <div className="mt-8">
                <AmenitiesForm selected={state.draft.amenities} onToggle={(amenity, checked) => dispatch({ type: "toggleAmenity", amenity, checked })} />
              </div>
            </>
          )}
          {state.tab === "rooms" && (
            <RoomsPanel
              rooms={state.draft.rooms}
              editor={state.roomEditor}
              onOpen={(room) => dispatch({ type: "openRoom", room })}
              onChange={(field, value) => dispatch({ type: "editRoom", field, value })}
              onInvalid={(errors) => dispatch({ type: "roomInvalid", errors })}
              onApply={(room) => dispatch({ type: "saveRoom", room })}
              onCancel={() => dispatch({ type: "closeRoom" })}
              onRemove={(room) =>
                setConfirm({
                  title: `Remove ${room.roomType}?`,
                  description: "Guests won't be able to book this room type once you save.",
                  cancelLabel: "Keep room",
                  confirmLabel: "Remove room",
                  onConfirm: () => dispatch({ type: "removeRoom", id: room.id }),
                })
              }
            />
          )}
        </Card>
      </main>

      {dialog}
    </div>
  );
}
