type PaginationProps = {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
};

export default function Pagination({
    currentPage,
    totalPages,
    onPageChange,
}: PaginationProps) {
    return (
        <nav
            aria-label="Listing pages"
            className="mt-10 flex flex-wrap items-center justify-center gap-2"
        >
            <button
                type="button"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="rounded-[6px] border border-[#BACBDF] bg-[#FAFBFC] px-4 py-2 text-sm font-semibold text-[#536383] disabled:cursor-not-allowed disabled:opacity-40"
            >
                Previous
            </button>

            {Array.from({ length: totalPages }, (_, index) => {
                const page = index + 1;

                return (
                    <button
                        key={page}
                        type="button"
                        onClick={() => onPageChange(page)}
                        aria-current={currentPage === page ? "page" : undefined}
                        className={`min-w-10 rounded-[6px] border border-[#BACBDF] px-3 py-2 text-sm font-semibold ${
                            currentPage === page
                                ? "bg-[#4C79BD] text-white"
                                : "bg-[#FAFBFC] text-[#536383]"
                        }`}
                    >
                        {page}
                    </button>
                );
            })}

            <button
                type="button"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="rounded-[6px] border border-[#BACBDF] bg-[#FAFBFC] px-4 py-2 text-sm font-semibold text-[#536383] disabled:cursor-not-allowed disabled:opacity-40"
            >
                Next
            </button>
        </nav>
    );
}
