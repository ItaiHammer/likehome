import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Pagination } from "@/app/_components/Pagination";
import { ArrowIcon, Card, filterChipClass } from "@/app/_components/ui";
import { PAGE_ROUTES } from "@/constants/routes";
import { HISTORY_PAGE_SIZE, historyFilter, historyPage, matchesFilter, pageCount, type HistoryFilter } from "@/lib/rewards";
import { getRewardsHistory } from "@/utils/rewards";
import { TZ_COOKIE } from "@/utils/tz-cookie";
import { getUserId } from "@/utils/user";
import { SampleNotice } from "../../_components/SampleNotice";
import { HistoryList } from "../_components/HistoryList";
import { getSampleActivity } from "../sampleRewards";

export const metadata: Metadata = { title: "Rewards history — LikeHome" };

const FILTERS: { value: HistoryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "redeemed", label: "Redeemed" },
  { value: "earned", label: "Earned" },
];

const EMPTY: Record<HistoryFilter, string> = {
  all: "No points activity yet. Points you earn and use will show up here.",
  redeemed: "You haven’t used any points yet.",
  earned: "You haven’t earned any points yet.",
};

function historyHref(filter: HistoryFilter, page: number, sample: boolean) {
  const params = new URLSearchParams();
  if (sample) params.set("sample", "");
  if (filter !== "all") params.set("type", filter);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return `${PAGE_ROUTES.REWARDS_HISTORY}${query ? `?${query}` : ""}`;
}

async function loadHistory(filter: HistoryFilter, page: number) {
  const { userId } = await getUserId();
  // Back to the same filter and page after signing in
  if (!userId) redirect(`${PAGE_ROUTES.LOGIN}?next=${encodeURIComponent(historyHref(filter, page, false))}`);
  const history = await getRewardsHistory(userId, { filter, page });
  if (history.error) throw new Error(history.error.message);
  return history;
}

function sampleHistory(filter: HistoryFilter, page: number) {
  const matching = getSampleActivity().filter((item) => matchesFilter(item, filter));
  const from = (page - 1) * HISTORY_PAGE_SIZE;
  return { data: matching.slice(from, from + HISTORY_PAGE_SIZE), total: matching.length };
}

export default async function RewardsHistoryPage(props: PageProps<"/MyBookings/rewards/history">) {
  const { sample, type, page: pageParam } = await props.searchParams;
  const showSample = process.env.NODE_ENV === "development" && sample !== undefined;
  const filter = historyFilter(type);
  const page = historyPage(pageParam);
  const timeZone = (await cookies()).get(TZ_COOKIE)?.value ?? null;

  const { data: activity, total } = showSample ? sampleHistory(filter, page) : await loadHistory(filter, page);
  const href = (p: number) => historyHref(filter, p, showSample);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
      {showSample && <SampleNotice>Sample rewards, shown only on your local dev server.</SampleNotice>}

      <Link
        href={`${PAGE_ROUTES.REWARDS}${showSample ? "?sample" : ""}`}
        className="group inline-flex items-center gap-1 text-base font-semibold text-ink"
      >
        <ArrowIcon className="h-4 w-4 -scale-x-100 transition-transform duration-200 group-hover:-translate-x-1" />
        Back to rewards
      </Link>
      <p className="mt-4 text-sm font-semibold uppercase tracking-[0.08em] text-ink">Your rewards</p>
      <h1 className="mt-2 font-serif text-[40px] leading-[48px] text-ink sm:text-[48px] sm:leading-[56px]">Rewards history</h1>
      <p className="mt-2 text-base text-slate">See how you’ve earned and used your points.</p>

      <Card padding="none" className="mt-10">
        <nav aria-label="Filter activity" className="flex flex-wrap justify-end gap-3 border-b border-edge px-4 py-3 sm:px-7">
          {FILTERS.map(({ value, label }) => (
            <Link
              key={value}
              href={historyHref(value, 1, showSample)}
              aria-current={filter === value ? "page" : undefined}
              className={filterChipClass(filter === value)}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="px-4 sm:px-7">
          {activity.length > 0 ? (
            <HistoryList activity={activity} timeZone={timeZone} />
          ) : page > 1 ? (
            <p className="py-8 text-slate">
              There’s nothing on this page.{" "}
              <Link href={href(1)} className="font-semibold text-blue-dark underline">
                Go to the first page
              </Link>
            </p>
          ) : (
            <p className="py-8 text-slate">{EMPTY[filter]}</p>
          )}
        </div>
      </Card>

      <Pagination current={page} pages={pageCount(total)} href={href} label="Activity pages" />
    </main>
  );
}
