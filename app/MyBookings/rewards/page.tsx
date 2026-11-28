import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PointsAmount } from "@/app/_components/rewards/PointsAmount";
import { ArrowIcon, Button, Card, Tag } from "@/app/_components/ui";
import { PAGE_ROUTES } from "@/constants/routes";
import { money } from "@/lib/bookings";
import { STAY_DISCOUNTS, formatPoints, pointsToDollars } from "@/lib/rewards";
import { getPointsBalance } from "@/utils/points";
import { getRewardsHistory } from "@/utils/rewards";
import { TZ_COOKIE } from "@/utils/tz-cookie";
import { getUserId } from "@/utils/user";
import { SampleNotice } from "../_components/SampleNotice";
import { HistoryList } from "./_components/HistoryList";
import { getSampleActivity, SAMPLE_BALANCE } from "./sampleRewards";

export const metadata: Metadata = { title: "Rewards — LikeHome" };

const cardEyebrow = "text-sm font-semibold uppercase tracking-[0.08em] text-blue-dark";

async function loadRewards() {
  const { userId } = await getUserId();
  if (!userId) redirect(`${PAGE_ROUTES.LOGIN}?next=${encodeURIComponent(PAGE_ROUTES.REWARDS)}`);

  const [points, history] = await Promise.all([getPointsBalance(userId), getRewardsHistory(userId)]);
  if (points.error) throw new Error(points.error.message);
  if (history.error) throw new Error(history.error.message);
  return { balance: points.balance, activity: history.data };
}

export default async function RewardsPage(props: PageProps<"/MyBookings/rewards">) {
  const { sample } = await props.searchParams;
  const showSample = process.env.NODE_ENV === "development" && sample !== undefined;
  const timeZone = (await cookies()).get(TZ_COOKIE)?.value ?? null;

  const { balance, activity } = showSample ? { balance: SAMPLE_BALANCE, activity: getSampleActivity() } : await loadRewards();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
      {showSample && <SampleNotice>Sample rewards, shown only on your local dev server.</SampleNotice>}

      <p className="text-sm font-semibold uppercase tracking-[0.08em] text-blue">Your rewards</p>
      <h1 className="mt-2 text-balance font-serif text-[40px] leading-[48px] text-ink sm:text-[48px] sm:leading-[56px]">
        Make every stay more rewarding.
      </h1>
      <p className="mt-2 text-base text-slate">Earn points when you stay, then use them to make your next trip even better.</p>

      <div className="mt-10 grid gap-6 lg:grid-cols-[318px_minmax(0,1fr)]">
        <Card as="section" className="flex flex-col">
          <h2 className={cardEyebrow}>Your points</h2>
          <div className="flex flex-1 flex-col items-center justify-center py-6">
            <PointsAmount points={balance} size="lg" />
            <p className="mt-4 font-semibold text-slate">points available</p>
          </div>
        </Card>

        <Card as="section" className="flex flex-col">
          <h2 className={cardEyebrow}>Use your points</h2>
          <UsePoints balance={balance} />
        </Card>
      </div>

      <section aria-labelledby="history-heading" className="mt-14">
        <h2 id="history-heading" className="font-serif text-[32px] leading-10 text-ink">
          Reward history
        </h2>
        <p className="mt-1 text-slate">See how you’ve earned and used your points.</p>
        <Card padding="none" className="mt-6 px-4 sm:px-7">
          {activity.length > 0 ? (
            <>
              <HistoryList activity={activity.slice(0, 3)} timeZone={timeZone} />
              <div className="flex justify-end border-t border-edge py-4">
                <ArrowLink href={`${PAGE_ROUTES.REWARDS_HISTORY}${showSample ? "?sample" : ""}`}>View all activity</ArrowLink>
              </div>
            </>
          ) : (
            <p className="py-8 text-slate">No points activity yet. Points you earn and use will show up here.</p>
          )}
        </Card>
      </section>
    </main>
  );
}

// Points pay for new bookings at checkout; nothing can add a reward to a booked stay yet
function UsePoints({ balance }: { balance: number }) {
  return (
    <div className="mt-4 flex flex-1 flex-col gap-4">
      <p className="text-ink">
        {balance > 0 ? (
          <>
            Put your <span className="font-semibold">{formatPoints(balance)} (worth {money(pointsToDollars(balance))})</span> toward your next getaway.
          </>
        ) : (
          "Once you have points, use them at checkout for:"
        )}
      </p>
      <ul className="flex flex-wrap gap-2">
        {STAY_DISCOUNTS.map((discount) => (
          <li key={discount.id}>
            <Tag tone="blue" size="md">
              {discount.category}
            </Tag>
          </li>
        ))}
      </ul>
      <p className="text-sm text-slate">Redeem one reward per booking at checkout.</p>
      <div className="mt-auto flex justify-end">
        <Button href="/search">
          Find a stay
        </Button>
      </div>
    </div>
  );
}

function ArrowLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-1 text-sm font-semibold text-blue-dark hover:text-blue">
      {children}
      <ArrowIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
    </Link>
  );
}
