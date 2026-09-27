import PaintedBackground from "./PaintedBackground";

export default function SearchPage() {
    return (
        <main className="min-h-screen bg-[#AEC3DF]">
            <section className="relative h-[600px] overflow-hidden">
                <div className="absolute inset-0">
                    <PaintedBackground />
                </div>

                <div className="relative z-10 flex h-full items-center justify-center px-6">
                    <h1 className="text-4xl font-semibold text-white">
                        LikeHome Search Page
                    </h1>
                </div>
            </section>
        </main>
    );
}