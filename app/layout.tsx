import type { Metadata } from "next";
import { DM_Serif_Display, Inter } from "next/font/google";
import { SiteFooter, SiteHeader } from "./_components/SiteChrome";
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

// Runs before first paint: saved choice wins, otherwise follow the OS setting
// (for both the theme and reduced motion).
const themeScript = `(function(){var d=document.documentElement;try{var t=localStorage.getItem("theme");if(!t)t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";d.setAttribute("data-theme",t)}catch(e){}try{var m=localStorage.getItem("motion");if(!m)m=matchMedia("(prefers-reduced-motion: reduce)").matches?"reduce":"full";d.setAttribute("data-motion",m)}catch(e){}})()`;

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
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
