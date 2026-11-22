import { API_ROUTES } from "@/constants/routes";

const messageUrl = (id: string) => `${API_ROUTES.MESSAGES}/${encodeURIComponent(id)}`;

// The route answers 400 both when the message was already read and when the update failed
export async function sendRead(id: string): Promise<"marked" | "unconfirmed" | "failed"> {
  try {
    const res = await fetch(`${messageUrl(id)}/read`, { method: "PATCH" });
    if (res.ok) return "marked";
    return res.status === 400 ? "unconfirmed" : "failed";
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
