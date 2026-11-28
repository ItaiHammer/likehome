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
