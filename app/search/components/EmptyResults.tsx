import { dmSerif } from "../lib/fonts";

type EmptyResultsProps = {
    canClearFilters: boolean;
    onClearFilters: () => void;
    onChangeDestination: () => void;
};

export default function EmptyResults({
    canClearFilters,
    onClearFilters,
    onChangeDestination,
}: EmptyResultsProps) {
    return (
        <div className="flex min-h-[320px] w-full min-w-0 items-center justify-center rounded-[16px] border border-[#D7E3F1] bg-white px-4 py-8 sm:px-6 sm:py-10">
            <div className="flex w-full min-w-0 max-w-xl flex-col items-center px-1 text-center sm:px-3">
                <img
                    src="/no-stays-window.png"
                    alt=""
                    className="h-auto w-[200px] max-w-[72vw] sm:w-[230px] md:w-[250px]"
                />

                <h3
                    className={`${dmSerif.className} mt-5 text-2xl leading-tight text-[#070D2F] sm:text-3xl`}
                >
                    Sorry, no stays found.
                </h3>

                <p className="mt-2 max-w-md break-words text-sm leading-6 text-[#536383] sm:text-base sm:leading-7">
                    Try changing your destination or clearing the filters that
                    are narrowing your results.
                </p>

                <div className="mt-5 flex flex-wrap justify-center gap-3">
                    <button
                        type="button"
                        onClick={onChangeDestination}
                        className="rounded-[6px] bg-[#4C79BD] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3F69A7]"
                    >
                        Change destination
                    </button>

                    {canClearFilters && (
                        <button
                            type="button"
                            onClick={onClearFilters}
                            className="rounded-[6px] border border-[#BACBDF] bg-white px-4 py-2.5 text-sm font-semibold text-[#070D2F] transition hover:border-[#4C79BD] hover:bg-[#E7EEF8]"
                        >
                            Clear filters
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
