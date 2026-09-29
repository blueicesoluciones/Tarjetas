import { Badge } from "@/components/ui/badge";
import type { BusinessStatus } from "@/types/db";
import { STATUS_LABELS } from "./fields";

const STYLES: Record<BusinessStatus, string> = {
  trial: "bg-sky-100 text-sky-900",
  active: "bg-emerald-100 text-emerald-900",
  suspended: "bg-red-100 text-red-900",
};

export function StatusBadge({ status }: { status: BusinessStatus }) {
  return <Badge className={STYLES[status]}>{STATUS_LABELS[status]}</Badge>;
}
