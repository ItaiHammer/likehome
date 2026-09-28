import Image from "next/image";
import Link from "next/link";

export default function SiteLogo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2 rounded-[6.4px] focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue focus-visible:outline-none"
    >
      {/* The SVG is slate; the filter renders it white on the blue header. */}
      <Image
        src="/restApiLogo.svg"
        alt=""
        width={30}
        height={32}
        className="brightness-0 invert"
      />
      <span className="text-xl font-bold text-white">RestAPI</span>
    </Link>
  );
}
