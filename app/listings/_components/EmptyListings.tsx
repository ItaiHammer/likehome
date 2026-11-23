import {WindowScene} from "@/app/_components/WindowScene";
import {Button} from "@/app/_components/ui";

const STEPS = [
    "Property details and address",
    "Photos guests will love",
    "Room types and nightly rates",
];

export function EmptyListings() {
    return (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
            <section className="rounded-lg border border-edge bg-surface p-6 sm:p-8 xl:p-10">
                <p className="text-xs font-medium uppercase tracking-normal text-blue">
                    Get started
                </p>

                <h2 className="mt-3 font-serif text-[34px] leading-[42px] text-ink sm:text-[40px] sm:leading-[48px]">
                    List your first property.
                </h2>

                <p className="mt-3 max-w-md leading-7 text-slate">
                    It takes a few minutes. You can save as you go
                    and finish the rest later.
                </p>

                <ul className="mt-6 space-y-3">
                    {STEPS.map((step) => (
                        <li
                            key={step}
                            className="flex items-center gap-3 text-ink"
                        >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue/10 text-blue">
                <svg
                    viewBox="0 0 24 24"
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                >
                  <path d="M5 12.5l4.5 4.5L19 7.5"/>
                </svg>
              </span>

                            {step}
                        </li>
                    ))}
                </ul>

                <Button
                    href="/listings/new"
                    className="mt-8 whitespace-nowrap"
                >
                    Add property
                </Button>
            </section>

            <div className="hidden overflow-hidden rounded-lg border border-edge xl:block">
                <WindowScene
                    variant="sea"
                    id="scene-empty-listings"
                />
            </div>
        </div>
    );
}
