import Link from "next/link";
import { LogoMark } from "./LogoMark";
import { DesktopNav, MobileNav } from "./SiteNav";
import { ThemeToggle } from "./ThemeToggle";
import { AuthButton } from "@/components/auth-button";
import { SignOutButton } from "@/components/sign-out-button";
import { accountMenuLinkFor, navItemsFor } from "@/lib/account/nav";
import { accountLabel } from "@/lib/account/role";
import { bellSummary, type BellSummary } from "@/lib/messages";
import { getInbox } from "@/utils/inbox";
import { getViewer } from "@/utils/viewer";
import { AccountMenu } from "./AccountMenu";
import { MessagesBell } from "./MessagesBell";

function Logo() {
  return (
    <Link href="/" className="-m-1 flex items-center gap-3 rounded-control p-1 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue">
      <LogoMark className="h-9 w-auto text-slate" />
      <span className="text-xl font-bold tracking-tight">LikeHome</span>
    </Link>
  );
}

// A failed read leaves the bell empty instead of breaking the header
async function loadBell(): Promise<BellSummary> {
  try {
    const { messages, error } = await getInbox();
    if (!error) return bellSummary(messages);
    console.error("Inbox read failed:", error);
  } catch (error) {
    console.error("Inbox read failed:", error);
  }
  return bellSummary([]);
}

export async function SiteHeader() {
  const viewer = await getViewer();
  const items = navItemsFor(viewer.role);
  const label = accountLabel(viewer.role);
  const menuLink = accountMenuLinkFor(viewer.role);
  const bellRole = viewer.role === "personal" || viewer.role === "business" ? viewer.role : null;
  const bell = viewer.role === "personal" ? await loadBell() : bellSummary([]);
  return (
    <header className="relative border-b border-edge bg-surface">
      {/* With the bell, the controls only fit beside the logo at 360px with tighter gaps on phones */}
      <div className={`mx-auto flex h-16 max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-10 ${bellRole ? "gap-2 sm:gap-4" : "gap-4"}`}>
        <Logo />
        <nav aria-label="Main" className="hidden md:block">
          <DesktopNav items={items} />
        </nav>
        <div className={`flex items-center ${bellRole ? "gap-1 sm:gap-2" : "gap-2"}`}>
          {bellRole && <MessagesBell role={bellRole} unread={bell.unread} messages={bell.latest} />}
          <ThemeToggle />
          <AuthButton signedIn={viewer.role !== "signed-out"}>
            {menuLink ? (
              <AccountMenu name={viewer.name} email={viewer.email} accountLabel={label} link={menuLink} />
            ) : (
              <SignOutButton inHeader />
            )}
          </AuthButton>
          <MobileNav items={items} accountLabel={label} />
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-edge">
      <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-slate sm:flex-row sm:px-6 lg:px-10">
        <span>© {new Date().getFullYear()} LikeHome</span>
        {/* No About / Help / Privacy pages yet, so no links that go nowhere */}
        <span>About, Help and Privacy pages coming soon</span>
      </div>
    </footer>
  );
}
