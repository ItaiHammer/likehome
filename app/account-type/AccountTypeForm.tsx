"use client";

import { useActionState, useState } from "react";
import { Button, FormError } from "@/app/_components/ui";
import type { AccountType } from "@/utils/accounts";
import { chooseAccountType, type ChooseState } from "./actions";
import styles from "./page.module.css";

const OPTIONS: { value: AccountType; title: string; line: string; icon: React.ReactNode }[] = [
  {
    value: "personal",
    title: "Personal",
    line: "Book stays and manage reservations.",
    icon: (
      <>
        <circle cx="12" cy="7" r="4" />
        <path d="M4 21v-1a8 8 0 0 1 16 0v1z" />
      </>
    ),
  },
  {
    value: "business",
    title: "Business",
    line: "Manage listings and welcome guests.",
    icon: (
      <>
        <rect x="3" y="7" width="18" height="14" rx="3" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12a20 20 0 0 0 18 0" />
        <rect x="10" y="11" width="4" height="4" rx="1" />
      </>
    ),
  },
];

export function AccountTypeForm({ next }: { next: string | null }) {
  const [type, setType] = useState<AccountType>("personal");
  const [state, action, pending] = useActionState<ChooseState, FormData>(chooseAccountType, null);
  const chosen = OPTIONS.find((o) => o.value === type)!;

  return (
    <form action={action}>
      <input type="hidden" name="next" value={next ?? ""} />
      <fieldset className={styles.options}>
        <legend className="sr-only">Account type</legend>
        {OPTIONS.map((o) => (
          <label key={o.value} className={styles.option}>
            <input
              type="radio"
              name="type"
              value={o.value}
              checked={type === o.value}
              onChange={() => setType(o.value)}
              className={styles.radio}
            />
            <svg
              viewBox="0 0 24 24"
              className={styles.icon}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              {o.icon}
            </svg>
            <span className={styles.text}>
              <span className={styles.optionTitle}>{o.title}</span>
              <span>{o.line}</span>
            </span>
            <span className={styles.check} aria-hidden>
              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M2 6l2.5 2.5L10 3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </label>
        ))}
      </fieldset>

      <p className={styles.note}>Your account type can&apos;t be changed after setup.</p>

      <Button type="submit" loading={pending} className="w-full">
        Continue as {chosen.title}
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
          <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Button>

      <FormError message={state?.message} className="mt-3" />
      {state?.continueHref && (
        // A full page load, so the layout re-reads the account type
        <a href={state.continueHref} className="mt-2 inline-block text-base font-semibold text-blue hover:text-blue-dark">
          Continue
        </a>
      )}
    </form>
  );
}
