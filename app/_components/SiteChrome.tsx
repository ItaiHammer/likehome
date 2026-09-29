import Link from "next/link";
import { LogoMark } from "./LogoMark";
import { MotionToggle } from "./MotionToggle";
import { ThemeToggle } from "./ThemeToggle";

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-3 text-ink">
      <LogoMark className="h-9 w-auto text-slate" />
      <span className="text-xl font-bold tracking-tight">LikeHome</span>
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="border-b border-edge bg-surface">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <div className="flex items-center gap-1 text-base font-medium text-slate sm:gap-2">
          <a href="#" className="hidden rounded-control px-3 py-2 hover:text-ink md:block">List your property</a>
          <a href="#" className="hidden rounded-control px-3 py-2 hover:text-ink md:block">Support</a>
          <a href="#" className="hidden rounded-control px-3 py-2 hover:text-ink sm:block">Trips</a>
          <MotionToggle />
          <ThemeToggle />
          <Link href="/login" className="rounded-control px-3 py-2 font-semibold text-blue hover:text-blue-dark">
            Sign in
          </Link>
        </div>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-edge">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-slate sm:flex-row sm:px-6">
        <span>© {new Date().getFullYear()} LikeHome</span>
        <div className="flex gap-6">
          <a href="#" className="hover:text-ink">About</a>
          <a href="#" className="hover:text-ink">Help</a>
          <a href="#" className="hover:text-ink">Privacy</a>
        </div>
      </div>
    </footer>
  );
}
