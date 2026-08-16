import {
  ALLOCATION_STATUS_LABEL,
  BATCH_STATUS_LABEL,
  CHANNEL_LABEL,
  GRADE_LABEL,
  ORDER_STATUS_LABEL,
  URGENCY_LABEL,
  type AllocationStatus,
  type BatchStatus,
  type Grade,
  type OrderChannel,
  type OrderStatus,
  type Urgency,
} from "@/types";
import {
  PACKOUT_VERDICT_LABEL,
  type PackoutVerdict,
} from "@/lib/domain/packout";
import { cn } from "@/lib/utils";

const base =
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset";

const GRADE_TONE: Record<Grade, string> = {
  A: "bg-leaf-50 text-leaf-700 ring-leaf-200",
  B: "bg-sky-100 text-sky-700 ring-sky-500/20",
  PROCESS: "bg-sun-100 text-sun-700 ring-sun-300",
  REJECT: "bg-muted text-muted-foreground ring-border",
};

export function GradeTag({
  grade,
  className,
}: {
  grade: Grade;
  className?: string;
}) {
  return (
    <span className={cn(base, GRADE_TONE[grade], className)}>
      {GRADE_LABEL[grade]}
    </span>
  );
}

const BATCH_TONE: Record<BatchStatus, string> = {
  planned: "bg-muted text-muted-foreground ring-border",
  harvesting: "bg-sun-100 text-sun-700 ring-sun-300",
  intake: "bg-sky-100 text-sky-700 ring-sky-500/20",
  qc_done: "bg-leaf-50 text-leaf-700 ring-leaf-200",
  decision: "bg-risk-100 text-risk-700 ring-risk-300",
  processing: "bg-leaf-100 text-leaf-800 ring-leaf-300",
  shipped: "bg-leaf-600 text-white ring-leaf-700/30",
  closed: "bg-leaf-900 text-white ring-leaf-900/30",
};

export function BatchStatusTag({
  status,
  className,
}: {
  status: BatchStatus;
  className?: string;
}) {
  return (
    <span className={cn(base, BATCH_TONE[status], className)}>
      {BATCH_STATUS_LABEL[status]}
    </span>
  );
}

const URGENCY_TONE: Record<Urgency, string> = {
  low: "bg-leaf-50 text-leaf-700 ring-leaf-200",
  medium: "bg-sun-100 text-sun-700 ring-sun-300",
  high: "bg-risk-100 text-risk-700 ring-risk-300",
};

export function UrgencyTag({
  urgency,
  className,
  label,
}: {
  urgency: Urgency;
  className?: string;
  label?: string;
}) {
  return (
    <span className={cn(base, URGENCY_TONE[urgency], className)}>
      {label ?? URGENCY_LABEL[urgency]}
    </span>
  );
}

const ORDER_TONE: Record<OrderStatus, string> = {
  draft: "bg-muted text-muted-foreground ring-border",
  confirmed: "bg-leaf-50 text-leaf-700 ring-leaf-200",
  fulfilled: "bg-leaf-600 text-white ring-leaf-700/30",
  cancelled: "bg-risk-100 text-risk-700 ring-risk-300",
};

export function OrderStatusTag({ status }: { status: OrderStatus }) {
  return <span className={cn(base, ORDER_TONE[status])}>{ORDER_STATUS_LABEL[status]}</span>;
}

export function AllocationStatusTag({ status }: { status: AllocationStatus }) {
  const tone: Record<AllocationStatus, string> = {
    planned: "bg-muted text-muted-foreground ring-border",
    confirmed: "bg-leaf-50 text-leaf-700 ring-leaf-200",
    shipped: "bg-leaf-600 text-white ring-leaf-700/30",
  };
  return <span className={cn(base, tone[status])}>{ALLOCATION_STATUS_LABEL[status]}</span>;
}

const PACKOUT_TONE: Record<PackoutVerdict, string> = {
  shortage: "bg-risk-100 text-risk-700 ring-risk-300",
  match: "bg-leaf-50 text-leaf-700 ring-leaf-200",
  surplus: "bg-sun-100 text-sun-700 ring-sun-300",
};

/** How the actual packout landed against the confirmed order. */
export function PackoutVerdictTag({
  verdict,
  className,
}: {
  verdict: PackoutVerdict;
  className?: string;
}) {
  return (
    <span className={cn(base, PACKOUT_TONE[verdict], className)}>
      {PACKOUT_VERDICT_LABEL[verdict]}
    </span>
  );
}

export function ChannelTag({ source }: { source: OrderChannel }) {
  return (
    <span className={cn(base, "bg-clay-100 text-foreground/70 ring-clay-200")}>
      {CHANNEL_LABEL[source]}
    </span>
  );
}
