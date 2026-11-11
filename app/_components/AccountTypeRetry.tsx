"use client";

import { usePathname } from "next/navigation";
import { PAGE_ROUTES } from "@/constants/routes";
import { Button } from "./ui";

const MESSAGE = "We couldn't load your account type.";

// A full page load, so the layout reads the account type again
function TryAgain(props: Pick<React.ComponentProps<typeof Button>, "variant" | "size" | "className">) {
  return (
    <Button {...props} onClick={() => window.location.reload()}>
      Try again
    </Button>
  );
}

// Root layout, for a signed-in viewer whose account read failed (role "unknown").
// The choice screen shows the same message in its card instead.
export function AccountTypeRetryNotice() {
  const pathname = usePathname();
  if (pathname.toLowerCase() === PAGE_ROUTES.ACCOUNT_TYPE) return null;
  return (
    <div role="status" className="border-b border-edge bg-surface">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5 text-sm text-ink sm:px-6 lg:px-10">
        <p>{MESSAGE}</p>
        <TryAgain variant="secondary" size="sm" />
      </div>
    </div>
  );
}

export function AccountTypeRetry() {
  return (
    <div role="status">
      <p className="text-base text-ink">{MESSAGE}</p>
      <TryAgain className="mt-5 w-full h-[52px]!" />
    </div>
  );
}
