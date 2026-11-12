import { realTypeLabel, type DevRole } from "@/lib/account/dev-role";
import type { AccountType } from "@/utils/accounts";
import { setDevRole } from "./dev-role-actions";

const CHOICES = [
  { value: "real", label: "Real" },
  { value: "unchosen", label: "Not chosen" },
  { value: "personal", label: "Personal" },
  { value: "business", label: "Business" },
];

// Development only (the root layout renders it only then): views the app as each account role
// through a cookie, without saving anything
export function DevRoleSwitch({
  devRole,
  realType,
  readFailed,
  signedIn,
}: {
  devRole: DevRole | null;
  realType: AccountType | null;
  readFailed: boolean;
  signedIn: boolean;
}) {
  const current = devRole ?? "real";
  return (
    <form
      action={setDevRole}
      aria-label="Dev role switch"
      className="fixed bottom-4 right-4 z-50 rounded-lg border border-edge bg-surface/95 p-3 text-xs text-slate shadow-[0_12px_32px_-16px_rgba(7,13,47,0.45)] backdrop-blur"
    >
      <p className="mb-2 font-semibold uppercase tracking-[0.08em] text-blue-dark">Dev role</p>
      <div className="flex flex-wrap gap-1">
        {CHOICES.map((c) => (
          <button
            key={c.value}
            type="submit"
            name="role"
            value={c.value}
            disabled={!signedIn}
            aria-pressed={current === c.value}
            className="rounded-control border border-edge px-2 py-1 font-medium text-ink hover:border-blue disabled:cursor-not-allowed disabled:opacity-50 aria-pressed:border-blue aria-pressed:bg-blue aria-pressed:text-on-blue"
          >
            {c.label}
          </button>
        ))}
      </div>
      <p className="mt-2">{realTypeLabel({ signedIn, realType, readFailed })}</p>
    </form>
  );
}
