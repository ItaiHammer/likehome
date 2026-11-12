import Image from "next/image";
import coastalRoom from "@/app/_assets/coastal-room.webp";

// Signed-in homepage card: picture, title and the account's two main links.
// The design's doorway picture isn't in the repo yet, so this uses the coastal room.
export function WelcomeBanner({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col overflow-hidden rounded-lg border border-edge bg-surface md:flex-row md:items-center">
      <div className="relative aspect-[5/2] w-full shrink-0 md:aspect-auto md:h-36 md:w-60">
        <Image src={coastalRoom} alt="" fill sizes="(min-width: 768px) 240px, 100vw" placeholder="blur" unoptimized className="object-cover" />
        <div className="absolute inset-0 bg-[#070D2F]/40 opacity-0 dark:opacity-100" />
      </div>
      <div className="flex flex-1 flex-col gap-5 p-6 md:flex-row md:items-center md:gap-8 md:py-4 md:pl-8 md:pr-6">
        <div className="flex-1 md:border-l md:border-edge md:pl-8">
          <h2 className="font-serif text-[32px] leading-10 text-ink">{title}</h2>
          <p className="mt-1 text-base leading-6 text-slate">{body}</p>
        </div>
        <div className="flex flex-wrap gap-3">{children}</div>
      </div>
    </section>
  );
}
