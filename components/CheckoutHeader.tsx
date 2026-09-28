import SiteLogo from "@/components/SiteLogo";

export default function CheckoutHeader() {
  return (
    <header className="bg-blue">
      <div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-8">
        <SiteLogo />
      </div>
    </header>
  );
}
