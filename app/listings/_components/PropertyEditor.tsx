"use client";

import Link from "next/link";
import { useEffect, useReducer, useRef, useState, useTransition } from "react";
import { flushSync } from "react-dom";
import { Card } from "@/app/_components/ui";
import {
  errorSummary,
  firstErrorField,
  publicationProblem,
  checkRoomForm,
  validateHotelInfo,
  type HotelInfoErrors,
} from "@/lib/validation/listing";
import type { Listing } from "@/types/listing";
import { uploadPhoto } from "@/utils/photo-upload";
import { createProperty, saveListing, type SaveResult } from "../actions";
import { AmenitiesForm } from "./AmenitiesForm";
import { ConfirmDialog, type ConfirmRequest } from "./ConfirmDialog";
import {
  changedTabs,
  editorReducer,
  hasRoomEdits,
  initEditorState,
  sameDraft,
  type EditorTab,
} from "./editor-state";
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
  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M16 10H4M9 5l-5 5 5 5" />
  </svg>
);

export function PropertyEditor({
  listing,
  initialTab,
  initialPreview = false,
  sampleMode = false,
}: {
  listing?: Listing;
  initialTab: EditorTab;
  initialPreview?: boolean;
  sampleMode?: boolean;
  showCreatedToast?: boolean; // Legacy edit-page prop; creation now redirects to My Listings.
}) {
  const isNew = !listing;
  const isSample = isNew && sampleMode && process.env.NODE_ENV === "development";

  const [state, dispatch] = useReducer(editorReducer, { listing, tab: initialTab }, initEditorState);
  const [isSaving, startSaving] = useTransition();
  const [previewing, setPreviewing] = useState(initialPreview);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [failMessage, setFailMessage] = useState<string | null>(null);

  const uploads = usePhotoUploads((photo) => dispatch({ type: "addPhoto", photo }));

  // For NEW properties, hold computer photos in browser memory until the owner
  // confirms creation. Selecting a photo does not upload it to Supabase Storage.
  const pendingPhotos = useRef(new Map<string, { file: File; url: string; uploadedUrl?: string }>());
  useEffect(() => {
    const pending = pendingPhotos.current;
    return () => {
      for (const entry of pending.values()) URL.revokeObjectURL(entry.url);
      pending.clear();
    };
  }, []);

  const dirty = !sameDraft(state.draft, state.saved);
  const unsaved = dirty || uploads.uploads.length > 0 || hasRoomEdits(state);
  const cover = state.draft.photos[0];

  const editorUrl = (tab: EditorTab, preview = false) =>
    `?tab=${tab}${isSample ? "&sample=1" : ""}${preview ? "&preview=1" : ""}`;

  const guard = useLeaveGuard(unsaved, (attempt) =>
    setConfirm({
      title: "Discard unsaved changes?",
      description: "Your changes will be lost if you leave this property.",
      cancelLabel: "Keep editing",
      confirmLabel: "Discard changes",
      destructive: true,
      onConfirm: attempt.leave,
      onCancel: () => {
        attempt.stay();
        window.history.replaceState(null, "", editorUrl(state.tab));
      },
    })
  );

  function showTab(tab: EditorTab) {
    dispatch({ type: "switchTab", tab });
    window.history.replaceState(null, "", editorUrl(tab));
  }

  function showErrors(errors: HotelInfoErrors) {
    flushSync(() => dispatch({ type: "saveInvalid", errors }));
    window.history.replaceState(null, "", editorUrl("info"));
    const first = firstErrorField(errors);
    if (first) document.getElementById(fieldId(first))?.focus();
  }

  function startSafePhotoUploads(items: { source: File | string; caption: string }[]) {
    // Existing properties retain their original upload behavior.
    if (!isNew) {
      uploads.start(items);
      return;
    }

    for (const item of items) {
      if (typeof item.source === "string") {
        // Bundled sample-photo URLs require no backend write.
        dispatch({
          type: "addPhoto",
          photo: { id: crypto.randomUUID(), url: item.source, caption: item.caption },
        });
      } else {
        // New listings (including sample mode) preview computer photos locally.
        // Files are sent to Storage only after confirmation in real mode.
        const id = crypto.randomUUID();
        const url = URL.createObjectURL(item.source);
        pendingPhotos.current.set(id, { file: item.source, url });
        dispatch({ type: "addPhoto", photo: { id, url, caption: item.caption } });
      }
    }
  }

  function removePhoto(id: string) {
    const pending = pendingPhotos.current.get(id);
    if (pending) {
      URL.revokeObjectURL(pending.url);
      pendingPhotos.current.delete(id);
    }
    dispatch({ type: "removePhoto", id });
  }

  function checkBeforeSave() {
    // Validate an OPEN room form first, even when Save is labeled "Retry".
    // Previously we stopped before calling checkRoomForm, leaving all fields
    // unvalidated and showing only a generic save failure.
    if (state.roomEditor) {
      const checked = checkRoomForm(state.roomEditor.form);
      if (!checked.room) {
        flushSync(() => dispatch({ type: "roomSaveInvalid", errors: checked.errors }));
        window.history.replaceState(null, "", editorUrl("rooms"));
        setFailMessage(null);
        const fieldOrder = ["roomType", "bedConfiguration", "roomCount", "nightlyRate", "maxGuests", "description"] as const;
        const first = fieldOrder.find((field) => checked.errors[field]);
        if (first) document.getElementById(`room-${first}`)?.focus();
      } else {
        // Don't silently apply room changes when saving a whole property.
        setFailMessage("Click Apply changes or Cancel in the room form before saving your property.");
        dispatch({ type: "saveFailed", reason: "failed" });
        showTab("rooms");
      }
      return false;
    }

    const errors = validateHotelInfo(state.draft);
    if (firstErrorField(errors)) {
      showErrors(errors);
      return false;
    }
    if (uploads.uploads.length > 0) {
      setFailMessage("Wait for your photos to finish uploading, or remove failed uploads before saving.");
      dispatch({ type: "saveFailed", reason: "failed" });
      showTab("photos");
      return false;
    }
    if (isNew) {
      const issue = publicationProblem(state.draft);
      if (issue) {
        setFailMessage(issue.message);
        dispatch({ type: "saveFailed", reason: "failed" });
        showTab(issue.tab);
        return false;
      }
    }
    return true;
  }

  function performSave() {
    // Recheck after confirmation. Nothing has been written before this point.
    if (!checkBeforeSave()) return;

    const sent = state.draft;
    startSaving(async () => {
      if (isSample) {
        // Same confirmation / redirect / toast as a real creation, but NO API write.
        await guard.release();
        guard.replace("/listings?sample=1&created=sample");
        return;
      }

      let result: SaveResult;
      try {
        let readyToSave = sent;
        if (isNew && pendingPhotos.current.size > 0) {
          // Only now (after modal confirmation) may computer photos be uploaded.
          const photos = [] as typeof sent.photos;
          for (const photo of sent.photos) {
            const pending = pendingPhotos.current.get(photo.id);
            if (!pending) {
              photos.push(photo);
              continue;
            }
            if (!pending.uploadedUrl) {
              const uploaded = await uploadPhoto(pending.file, 1);
              if (!("url" in uploaded)) {
                setFailMessage(`Couldn't upload ${photo.caption || "photo"}. Retry creating the listing.`);
                dispatch({ type: "saveFailed", reason: "failed" });
                return;
              }
              pending.uploadedUrl = uploaded.url;
            }
            photos.push({ ...photo, url: pending.uploadedUrl });
          }
          readyToSave = { ...sent, photos };
        }
        if (isNew) await guard.release();
        result = listing ? await saveListing(listing.id, sent) : await createProperty(readyToSave);
      } catch {
        dispatch({ type: "saveFailed", reason: "unreachable" });
        guard.restore();
        return;
      }

      if (result.status !== "saved") guard.restore();
      if (result.status === "invalid") {
        showErrors(result.errors);
      } else if (result.status === "failed") {
        setFailMessage(result.message ?? null);
        dispatch({ type: "saveFailed", reason: "failed" });
      } else if (isNew) {
        // Toast is displayed on the actual My Listings page after successful creation.
        guard.replace("/listings?created=1");
      } else {
        dispatch({ type: "saveSucceeded", sent, saved: result.saved });
      }
    });
  }

  function save() {
    if (isSaving || !checkBeforeSave()) return;

    if (isNew) {
      setConfirm({
        eyebrow: isSample ? "SAMPLE CREATION" : "PUBLISH PROPERTY",
        title: "Publish this property?",
        description: isSample
          ? "This will simulate creating a public listing. No property will be saved or made available for booking."
          : "Creating this property will make it visible on LikeHome and available for reservations.",
        cancelLabel: "Keep editing",
        confirmLabel: isSample ? "Test creation" : "Create property",
        onConfirm: performSave,
      });
      return;
    }

    // Existing listing edits still save normally; no publication modal.
    performSave();
  }

  function discardChanges() {
    setConfirm({
      title: "Discard your changes?",
      description: isNew ? "The form will be cleared." : "Everything goes back to how it was when you last saved.",
      cancelLabel: "Keep editing",
      confirmLabel: "Discard changes",
      destructive: true,
      onConfirm: () => {
        uploads.clear();
        for (const entry of pendingPhotos.current.values()) URL.revokeObjectURL(entry.url);
        pendingPhotos.current.clear();
        dispatch({ type: "revert" });
      },
    });
  }

  function togglePreview(on: boolean) {
    setPreviewing(on);
    window.history.replaceState(null, "", editorUrl(state.tab, on));
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
          : unsaved
            ? { kind: "unsaved", text: "Unsaved changes" }
            : isNew
              ? { kind: "unsaved", text: "Not created yet" }
              : { kind: "saved", text: "All changes saved" };

  const notice =
    state.problem === "invalid"
      ? state.roomEditor && Object.values(state.roomEditor.errors).some(Boolean)
        ? "Fix the highlighted room fields, then click Add room before creating the property."
        : errorSummary(state.errors)
      : state.problem === "unreachable"
        ? "We couldn't reach LikeHome. Your edits are still here; check your connection and retry."
        : state.problem === "failed"
          ? failMessage
            ? `${failMessage} Your edits are kept.`
            : "Your edits are kept. Retry saving when you're ready."
          : null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:flex-row lg:gap-8 lg:py-12">
      <EditorSidebar
        mode="desktop"
        tab={state.tab}
        changed={changedTabs(state)}
        infoErrors={infoErrors}
        onSelectTab={showTab}
        backLink={
          <Link href={isSample ? "/listings?sample=1" : "/listings"} className={arrowLink}>
            {backArrow}
            Back to My listings
          </Link>
        }
      />

      <main className="min-w-0 flex-1">
        <div className="mb-5 lg:hidden">
          <Link href={isSample ? "/listings?sample=1" : "/listings"} className={arrowLink}>
            {backArrow}
            Back to My listings
          </Link>
        </div>
        {isSample && (
          <p className="mb-5 text-sm text-slate">
            <span className="font-semibold text-blue-dark">Sample mode:</span>{" "}
            Creation is simulated; computer photos stay on this device. Nothing is uploaded or published.
          </p>
        )}

        <EditorHeader saved={state.saved} cover={cover} isNew={isNew} />
        <EditorSidebar
          mode="mobile"
          tab={state.tab}
          changed={changedTabs(state)}
          infoErrors={Object.keys(state.errors).length}
          onSelectTab={showTab}
        />
        <SaveBar
          status={status}
          saveLabel={
            state.problem === "failed" || state.problem === "unreachable"
              ? "Retry"
              : isSample
                ? "Test create listing"
                : isNew
                  ? "Create listing"
                  : "Save changes"
          }
          isSaving={isSaving}
          canDiscard={unsaved && !isSaving}
          onSave={save}
          onPreview={() => togglePreview(true)}
          onDiscard={discardChanges}
        />
        <OfflineNotice />

        {notice && <p role="alert" className="mt-6 text-sm text-danger">{notice}</p>}

        <Card className="mt-6 sm:p-8">
          {state.tab === "info" && (
            <>
              <PanelHeading title="Hotel information" />
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
            <>
              <PhotosPanel
                photos={state.draft.photos}
                instantPhotos={isNew}
                uploads={uploads.uploads}
                onStartUploads={startSafePhotoUploads}
                onRetryUpload={uploads.retry}
                onRemoveUpload={uploads.remove}
                onMakeCover={(id) => dispatch({ type: "makeCover", id })}
                onMove={(id, by) => dispatch({ type: "movePhoto", id, by })}
                onRemove={removePhoto}
              />
            </>
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
              editor={state.roomEditor}
              onOpen={(room) => dispatch({ type: "openRoom", room })}
              onChange={(field, value) => dispatch({ type: "editRoom", field, value })}
              onInvalid={(errors) => dispatch({ type: "roomInvalid", errors })}
              onApply={(room) => dispatch({ type: "saveRoom", room })}
              onCancel={() => dispatch({ type: "closeRoom" })}
              onRemove={(room) => setConfirm({
                title: `Remove ${room.roomType}?`,
                description: "Guests won't be able to book this room type once you save.",
                cancelLabel: "Keep room",
                confirmLabel: "Remove room",
                destructive: true,
                onConfirm: () => dispatch({ type: "removeRoom", id: room.id }),
              })}
            />
          )}
        </Card>
      </main>
      {dialog}
    </div>
  );
}
