import CheckoutHeader from "@/components/CheckoutHeader";

export default function ReserveLayout({ children }: LayoutProps<"/reserve">) {
  return (
    <>
      <CheckoutHeader />
      {children}
    </>
  );
}
