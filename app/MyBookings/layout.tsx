import { PageBackdrop } from "@/app/_components/PageBackdrop";

// The sky strip lives here so it stays put while the page loads (loading.tsx) or fails (error.tsx)
export default function MyBookingsLayout({ children }: LayoutProps<"/MyBookings">) {
  return (
    <div className="relative isolate flex flex-1 flex-col">
      <PageBackdrop />
      {children}
    </div>
  );
}
