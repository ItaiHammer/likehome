"use client";

export default function CompareError({
                                         reset,
                                     }: {
    error: Error & {
        digest?: string;
    };
    reset: () => void;
}) {
    return (
        <div className="flex flex-1 flex-col">
            <main className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-4 py-16 sm:px-6">
                <div className="max-w-md text-center">
                    <h1 className="font-serif text-3xl text-ink">
                        We couldn&apos;t load your comparison
                    </h1>

                    <p className="mt-3 text-sm text-slate">
                        Something went wrong while loading these stays.
                        Please try again.
                    </p>

                    <button
                        type="button"
                        onClick={reset}
                        className="mt-6 min-h-11 rounded-lg bg-blue px-6 py-3 text-sm font-semibold text-on-blue transition-colors hover:bg-blue-dark"
                    >
                        Try again
                    </button>
                </div>
            </main>
        </div>
    );
}