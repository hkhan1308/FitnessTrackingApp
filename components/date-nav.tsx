import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { formatPretty } from "@/lib/dates";

export function DateNav({
  label,
  prevHref,
  nextHref,
}: {
  label: string;
  prevHref: string;
  nextHref: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Link href={prevHref} aria-label="Previous" className={buttonVariants({ variant: "outline", size: "icon" })}>
        <ChevronLeft />
      </Link>
      <p className="text-center text-sm font-medium">{label}</p>
      <Link href={nextHref} aria-label="Next" className={buttonVariants({ variant: "outline", size: "icon" })}>
        <ChevronRight />
      </Link>
    </div>
  );
}

export function dateLabel(date: string): string {
  return formatPretty(date);
}
