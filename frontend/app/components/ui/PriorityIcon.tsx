import Image from "next/image";
import type { Priority } from "@/lib/types";

const PRIORITY_ICONS: Record<Priority, string> = {
  Low: "/icons/priority/lowest.svg",
  Medium: "/icons/priority/medium.svg",
  High: "/icons/priority/highest.svg",
  Critical: "/icons/priority/critical.svg",
};

export function PriorityIcon({ priority, className = "" }: { priority: Priority; className?: string }) {
  return (
    <Image
      src={PRIORITY_ICONS[priority]}
      alt={`${priority} priority`}
      width={16}
      height={16}
      className={`shrink-0 ${className}`}
    />
  );
}
