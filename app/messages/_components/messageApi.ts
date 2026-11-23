import { API_ROUTES } from "@/constants/routes";

const messageUrl = (id: string) => `${API_ROUTES.MESSAGES}/${encodeURIComponent(id)}`;

// Already-read messages also return success; every failed response needs visible feedback.
export async function sendRead(id: string, signal?: AbortSignal): Promise<"marked" | "failed"> {
  try {
    const res = await fetch(`${messageUrl(id)}/read`, { method: "PATCH", signal });
    return res.ok ? "marked" : "failed";
  } catch {
    return "failed";
  }
}

/** Hides the message from the signed-in traveler; null on success (or when it was already hidden), else what went wrong */
export async function sendHide(id: string): Promise<string | null> {
  try {
    const res = await fetch(messageUrl(id), { method: "DELETE" });
    if (res.ok || res.status === 404) return null;
    if (res.status === 401) return "Your sign-in has ended. Sign in again to delete messages.";
    if (res.status === 501) return "Deleting messages isn’t available yet.";
    return "Something went wrong. Try again in a moment.";
  } catch {
    return "Check your connection and try again.";
  }
}
