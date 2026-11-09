"use client";

import { useActionState, useState } from "react";
import { Button, FormError } from "@/app/_components/ui";
import type { AccountType } from "@/utils/accounts";
import { chooseAccountType, type ChooseState } from "./actions";
import styles from "./page.module.css";

const OPTIONS: { value: AccountType; title: string; line: string; area: string; icon: React.ReactNode }[] = [
  {
    value: "personal",
    title: "Personal",
    line: "Book your next stay",
    area: "My Bookings",
    icon: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    value: "business",
    title: "Business",
    line: "Welcome your next guests",
    area: "My Listings",
    icon: (
      <path
        d="M4 8h16v11H4zM9 8V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M4 13h16M10.5 13v2h3v-2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
            <svg viewBox="0 0 24 24" className={styles.icon} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              {o.icon}
            </svg>
            <span className={styles.text}>
              <span className={styles.optionTitle}>{o.title}</span>
              <span>{o.line}</span>
              <span>{o.area}</span>
            </span>
            <span className={styles.check} aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M6 12.5l4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </label>
        ))}
      </fieldset>

      <p className={styles.note}>Your choice is saved once and can&apos;t be changed.</p>

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
