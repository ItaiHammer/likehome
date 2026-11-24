import { API_ROUTES } from "@/constants/routes";

// The route answers 400 both when the message was already read and when the update failed
export async function sendRead(id: string): Promise<"marked" | "unconfirmed" | "failed"> {
  try {
    const res = await fetch(`${API_ROUTES.MESSAGES}/${encodeURIComponent(id)}/read`, { method: "PATCH" });
    if (res.ok) return "marked";
    return res.status === 400 ? "unconfirmed" : "failed";
  } catch {
    return "failed";
  }
}
