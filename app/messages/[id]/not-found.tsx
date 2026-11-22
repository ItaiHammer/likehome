import Link from "next/link";
import { ArrowIcon, arrowSlideClass, sectionLinkClass } from "@/app/_components/ui";
import { PAGE_ROUTES } from "@/constants/routes";
import { MessagesFrame } from "../_components/MessagesFrame";

export default function MessageNotFound() {
  return (
    <MessagesFrame eyebrow="Messages" title="Message not found" subtitle="It may have been deleted, or the link is out of date.">
      <section className="mx-auto max-w-[900px] rounded-[10px] border-2 border-edge bg-surface px-5 py-10 sm:px-[47px]">
        <Link href={PAGE_ROUTES.MESSAGES} className={sectionLinkClass}>
          Back to your messages
          <ArrowIcon className={arrowSlideClass} />
        </Link>
      </section>
    </MessagesFrame>
  );
}
