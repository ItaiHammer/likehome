import { DM_Serif_Display, Inter } from "next/font/google";
import PaintedBackground from "./PaintedBackground";

const dmSerif = DM_Serif_Display({
    weight: "400",
    subsets: ["latin"],
});

const inter = Inter({
    subsets: ["latin"],
});

const recommendedStays = [
    {
        name: "Harbor House",
        location: "Monterey, California",
        price: "$180 / night",
        rating: "4.8",
    },
    {
        name: "Casa Maré",
        location: "Mallorca, Spain",
        price: "$219 / night",
        rating: "4.9",
    },
    {
        name: "Cliffside Cabin",
        location: "Big Sur, California",
        price: "$302 / night",
        rating: "4.8",
    },
];

const destinations = [
    ["Monterey Bay", "34 stays"],
    ["Lake Tahoe", "51 stays"],
    ["San Diego", "72 stays"],
];

export default function SearchPage() {
    return (
        <main
            className={`${inter.className} min-h-screen bg-white text-[#070D2F]`}
        >
            {/* Gradient header */}
            <header className="relative overflow-hidden px-3 pb-16 sm:px-5">
                {/* Animated gradient */}
                <div className="absolute inset-0">
                    <PaintedBackground />
                </div>

                {/* Fade gradient into white page */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-40 bg-gradient-to-b from-transparent via-white/75 to-white" />

                {/* Thin navigation directly on gradient */}
                <div className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-2 lg:px-10">
                    <div className="flex items-center gap-12">
            <span
                className={`${dmSerif.className} text-2xl text-[#070D2F]`}
            >
              LikeHome
            </span>

                        <nav className="hidden items-center gap-8 text-sm md:flex">
                            <button className="font-semibold text-[#070D2F]">
                                Stays
                            </button>

                            <button className="text-[#536383] transition hover:text-[#070D2F]">
                                Saved
                            </button>

                            <button className="text-[#536383] transition hover:text-[#070D2F]">
                                My bookings
                            </button>
                        </nav>
                    </div>

                    <button className="flex items-center gap-2 rounded-[6px] border border-[#BACBDF] bg-white/75 px-3 py-1.5 text-sm font-semibold text-[#070D2F] backdrop-blur-sm transition hover:bg-white">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#4C79BD] text-xs font-semibold text-white">
              M
            </span>

                        <span className="hidden sm:inline">
              Account
            </span>
                    </button>
                </div>

                {/* Rounded white area begins immediately below nav */}
                <div className="relative z-10 mx-auto -mt-0.5 max-w-7xl rounded-[30px] bg-white px-6 pb-8 pt-7 lg:px-10 lg:pb-10">
                    {/* Heading */}
                    <section className="mb-8">
                        <h1
                            className={`${dmSerif.className} max-w-4xl text-4xl leading-tight text-[#070D2F] sm:text-5xl`}
                        >
                            Where would you like to feel at home?
                        </h1>

                        <p className="mt-3 max-w-2xl text-base leading-7 text-[#536383]">
                            Search stays by destination, dates, guests, and the amenities
                            that matter to you.
                        </p>
                    </section>

                    {/* Search panel */}
                    <section className="rounded-[6px] border border-[#BACBDF] bg-[#FAF7F2] p-5 sm:p-6">
                        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr_1fr_auto]">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-[#070D2F]">
                                    Destination
                                </label>

                                <input
                                    type="text"
                                    placeholder="Where are you going?"
                                    className="w-full rounded-[6px] border border-[#BACBDF] bg-white px-4 py-3 text-sm text-[#536383] outline-none transition placeholder:text-[#8B97AC] focus:border-[#4C79BD] focus:ring-1 focus:ring-[#4C79BD]"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-[#070D2F]">
                                    Dates
                                </label>

                                <button className="w-full rounded-[6px] border border-[#BACBDF] bg-white px-4 py-3 text-left text-sm text-[#536383] transition hover:border-[#4C79BD]">
                                    Add dates
                                </button>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-[#070D2F]">
                                    Guests
                                </label>

                                <button className="w-full rounded-[6px] border border-[#BACBDF] bg-white px-4 py-3 text-left text-sm text-[#536383] transition hover:border-[#4C79BD]">
                                    2 guests
                                </button>
                            </div>

                            <div className="flex items-end">
                                <button className="w-full rounded-[6px] bg-[#4C79BD] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#3F69A7] lg:w-auto">
                                    Search
                                </button>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[#BACBDF] pt-5">
              <span className="mr-1 text-sm font-semibold text-[#070D2F]">
                Filters
              </span>

                            {["Price", "Rating", "Amenities", "Property type"].map(
                                (filter) => (
                                    <button
                                        key={filter}
                                        className="rounded-[6px] border border-[#BACBDF] bg-white px-4 py-2 text-sm text-[#536383] transition hover:border-[#4C79BD] hover:text-[#070D2F]"
                                    >
                                        {filter}
                                    </button>
                                ),
                            )}

                            <button className="ml-auto text-sm font-semibold text-[#4C79BD]">
                                More filters
                            </button>
                        </div>
                    </section>
                </div>
            </header>

            {/* Main content */}
            <div className="mx-auto max-w-7xl px-6 pb-12 lg:px-10">
                {/* Recommended */}
                <section className="mb-12">
                    <div className="mb-5 flex items-end justify-between gap-4">
                        <div>
                            <h2
                                className={`${dmSerif.className} text-3xl text-[#070D2F]`}
                            >
                                Recommended for you
                            </h2>

                            <p className="mt-1 text-sm text-[#536383]">
                                A few stays you might like.
                            </p>
                        </div>

                        <button className="hidden text-sm font-semibold text-[#4C79BD] sm:block">
                            View all
                        </button>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                        {recommendedStays.map((stay) => (
                            <article
                                key={stay.name}
                                className="overflow-hidden rounded-[6px] border border-[#BACBDF] bg-[#FAF7F2]"
                            >
                                {/* Temporary listing image */}
                                <div className="h-48 bg-[#D7E3F1]" />

                                <div className="p-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <h3
                                                className={`${dmSerif.className} text-xl text-[#070D2F]`}
                                            >
                                                {stay.name}
                                            </h3>

                                            <p className="mt-1 text-sm text-[#536383]">
                                                {stay.location}
                                            </p>
                                        </div>

                                        <span className="text-sm font-semibold text-[#070D2F]">
                      ★ {stay.rating}
                    </span>
                                    </div>

                                    <div className="mt-4 flex items-center justify-between border-t border-[#BACBDF] pt-3">
                    <span className="text-sm text-[#536383]">
                      Guest favorite
                    </span>

                                        <span className="text-sm font-semibold text-[#070D2F]">
                      {stay.price}
                    </span>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>

                {/* Popular destinations */}
                <section className="border-t border-[#BACBDF] pt-10">
                    <h2
                        className={`${dmSerif.className} text-3xl text-[#070D2F]`}
                    >
                        Popular destinations
                    </h2>

                    <p className="mt-1 text-sm text-[#536383]">
                        Browse nearby, national, or international stays.
                    </p>

                    <div className="mb-6 mt-5 flex flex-wrap gap-3">
                        <button className="rounded-[6px] bg-[#4C79BD] px-4 py-2 text-sm font-semibold text-white">
                            Near you
                        </button>

                        <button className="rounded-[6px] border border-[#BACBDF] bg-[#FAF7F2] px-4 py-2 text-sm text-[#536383] transition hover:border-[#4C79BD]">
                            National
                        </button>

                        <button className="rounded-[6px] border border-[#BACBDF] bg-[#FAF7F2] px-4 py-2 text-sm text-[#536383] transition hover:border-[#4C79BD]">
                            International
                        </button>
                    </div>

                    <div className="divide-y divide-[#BACBDF] border-y border-[#BACBDF]">
                        {destinations.map(([place, count]) => (
                            <button
                                key={place}
                                className="flex w-full items-center justify-between py-4 text-left"
                            >
                <span className="font-semibold text-[#070D2F]">
                  {place}
                </span>

                                <span className="text-sm text-[#536383]">
                  {count}
                                    <span className="ml-2 text-[#4C79BD]">
                    →
                  </span>
                </span>
                            </button>
                        ))}
                    </div>
                </section>
            </div>
        </main>
    );
}