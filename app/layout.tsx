import type { Metadata, Viewport } from "next";
import { DM_Serif_Display, Inter } from "next/font/google";
import { SiteFooter, SiteHeader } from "./_components/SiteChrome";
import { TimeZoneCookie } from "./_components/TimeZoneCookie";
import { buttonClass } from "./_components/ui";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const dmSerif = DM_Serif_Display({
  variable: "--font-dm-serif",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LikeHome — Feel at home, anywhere",
  description: "Handpicked stays with the comfort of home.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7f2" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1022" },
  ],
};

// Runs before first paint: saved choice wins, otherwise follow the OS setting
// (for both the theme and reduced motion).
const themeScript = `(function(){var d=document.documentElement;try{var t=localStorage.getItem("theme");if(!t)t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";d.setAttribute("data-theme",t)}catch(e){}try{localStorage.removeItem("motion");var q=matchMedia("(prefers-reduced-motion: reduce)"),f=function(){d.setAttribute("data-motion",q.matches?"reduce":"full")};f();q.addEventListener("change",f)}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="light"
      data-motion="full"
      suppressHydrationWarning
      className={`${inter.variable} ${dmSerif.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col font-sans text-base">
        <a href="#content" className={`${buttonClass("primary", "sm")} fixed left-4 top-20 z-50 -translate-y-40 focus:translate-y-0 sm:left-6`}>
          Skip to content
        </a>
        <TimeZoneCookie />
        <SiteHeader />
        {/* Wraps every page, so the skip link works without each page's <main> needing an id */}
        <div id="content" className="flex flex-1 flex-col">
          {children}
        </div>
        <SiteFooter />
      </body>
    </html>
  );
}
