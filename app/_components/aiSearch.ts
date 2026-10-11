// Turns an answer from Cara's AI search endpoint (app/api/search/ai) into the
// same /search link a normal search makes, so both run the standard search.
// The endpoint answers with one JSON object shaped like her SearchRequest plus
// `text`, the assistant's summary (or, for off-topic prompts, only `text`).

const FIELDS = [
  "where",
  "checkIn",
  "checkOut",
  "adults",
  "children",
  "numBeds",
  "bedSize",
  "minPrice",
  "maxPrice",
  "minRating",
  "sort",
] as const;

export type AiSearchAnswer = {
  /** The assistant's summary, shown above the results (or on its own when no filters came back). */
  reply: string;
  /** The search to run, or null when the prompt didn't describe a stay. */
  query: URLSearchParams | null;
};

export function readAiAnswer(text: string, prompt: string): AiSearchAnswer | null {
  let answer: unknown;
  try {
    // Structured output is plain JSON, but tolerate a ```json fence around it.
    answer = JSON.parse(text.trim().replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    return null;
  }
  if (typeof answer !== "object" || answer === null || Array.isArray(answer)) return null;
  const fields = answer as Record<string, unknown>;

  const query = new URLSearchParams();
  for (const key of FIELDS) {
    const value = fields[key];
    if (typeof value === "string" && value.trim()) query.set(key, value.trim());
    else if (typeof value === "number" && Number.isFinite(value)) query.set(key, String(value));
  }
  if (Array.isArray(fields.tags)) {
    for (const tag of fields.tags) if (typeof tag === "string" && tag) query.append("tags", tag);
  }

  const reply = typeof fields.text === "string" ? fields.text.trim() : "";
  if (query.size === 0) return { reply, query: null };

  query.set("aiPrompt", prompt);
  if (reply) query.set("aiReply", reply);
  return { reply, query };
}
