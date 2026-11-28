import type {Metadata} from "next";
import {redirect} from "next/navigation";
import {PAGE_ROUTES} from "@/constants/routes";
import {getCurrentUser} from "@/utils/current-user";
import { getViewer } from "@/utils/viewer";
import {toEditorTab} from "../_components/editor-state";
import {PropertyEditor} from "../_components/PropertyEditor";

export const metadata: Metadata = {
    title: "New property — LikeHome",
};

export default async function NewListingPage(
    props: PageProps<"/listings/new">
) {
    const {tab, sample, preview} = await props.searchParams;

    const user = await getCurrentUser();

    if (!user) {
        redirect(PAGE_ROUTES.LOGIN);
    }
    const viewer = await getViewer();
    if (viewer.role === "unchosen") redirect(PAGE_ROUTES.ACCOUNT_TYPE);
    if (viewer.role !== "business") redirect(PAGE_ROUTES.AUTHORIZATION_ERROR);

    const sampleMode =
        process.env.NODE_ENV === "development" &&
        sample === "1";

    return (
        <PropertyEditor
            initialTab={toEditorTab(tab)}
            initialPreview={preview === "1"}
            sampleMode={sampleMode}
        />
    );
}
