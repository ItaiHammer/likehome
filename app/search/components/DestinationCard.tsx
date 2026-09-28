import { dmSerif } from "../lib/fonts";
import { DESTINATION_BACKGROUNDS } from "../lib/searchConfig";
import type { PopularDestination } from "../types";

type DestinationCardProps = {
    place: PopularDestination;
    imageIndex: number;
    onClick: () => void;
};

export default function DestinationCard({
    place,
    imageIndex,
    onClick,
}: DestinationCardProps) {
    const fallback =
        DESTINATION_BACKGROUNDS[imageIndex % DESTINATION_BACKGROUNDS.length];

    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={`View stays in ${place.name}`}
            className="group relative h-52 w-full overflow-hidden rounded-[12px] bg-cover bg-center text-left shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md sm:h-56"
            style={{
                // TODO(BACKEND): Use the destination image URL returned by the API.
                backgroundImage: place.imageUrl
                    ? `url("${place.imageUrl}")`
                    : fallback,
            }}
        >
            <div className="absolute inset-0 bg-gradient-to-t from-[#070D2F]/78 via-[#070D2F]/8 to-transparent transition group-hover:from-[#070D2F]/86" />

            <div className="absolute inset-x-0 bottom-0 z-10 p-5">
                <span
                    className={`${dmSerif.className} block text-2xl text-white sm:text-[1.7rem]`}
                >
                    {place.name}
                </span>
            </div>
        </button>
    );
}
