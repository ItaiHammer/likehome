import Link from "next/link";
import { LogoMark } from "./LogoMark";
import { DesktopNav, MobileNav } from "./SiteNav";
import { ThemeToggle } from "./ThemeToggle";
import { PAGE_ROUTES } from "@/constants/routes";
import { AuthButton } from "@/components/auth-button";

function Logo() {
  return (
    <Link href="/" className="-m-1 flex items-center gap-3 rounded-control p-1 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue">
      <LogoMark className="h-9 w-auto text-slate" />
      <span className="text-xl font-bold tracking-tight">LikeHome</span>
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="relative border-b border-edge bg-surface">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <Logo />
        <nav aria-label="Main" className="hidden md:block">
          <DesktopNav />
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <AuthButton />
          <MobileNav />
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
