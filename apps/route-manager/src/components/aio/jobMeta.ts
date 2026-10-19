import {
  Store,
  Tag,
  Eye,
  MapPin,
  FileText,
  RefreshCw,
  ShieldAlert,
  CheckCircle2,
  Hourglass,
  CalendarClock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Job } from "../../types";
import { isRevisionJob } from "../../features/jobs/jobState";

export function getStreetName(address: string): string {
  const trimmed = address.trim();
  const streetMatch = trimmed.match(/\d+\s+(.+)/);
  return (streetMatch?.[1] || trimmed).replace(/,\s*Bakersfield.*$/i, "");
}

export function getJobTypeLabel(job: Job): string {
  if (job.jobType === "process_serve") return "Process Serve";
  return job.jobType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export interface JobIconMeta {
  icon: LucideIcon;
  gradient: string;
}

const JOB_TYPE_ICON: Record<Job["jobType"], JobIconMeta> = {
  retail_audit: { icon: Store, gradient: "bg-gradient-to-br from-[#0A84FF] to-[#5AC8FA]" },
  merchandising: { icon: Tag, gradient: "bg-gradient-to-br from-[#BF5AF2] to-[#5AC8FA]" },
  mystery_shop: { icon: Eye, gradient: "bg-gradient-to-br from-[#30B0C7] to-[#64D2FF]" },
  field_task: { icon: MapPin, gradient: "bg-gradient-to-br from-[#30D158] to-[#5AC8FA]" },
  process_serve: { icon: FileText, gradient: "bg-gradient-to-br from-[#FF453A] to-[#FF9F0A]" },
};

export function getJobIconMeta(job: Job): JobIconMeta {
  if (isRevisionJob(job) || job.status === "revisit") {
    return { icon: RefreshCw, gradient: "bg-gradient-to-br from-[#FF9F0A] to-[#FFD60A]" };
  }
  return JOB_TYPE_ICON[job.jobType] || { icon: Store, gradient: "bg-gradient-to-br from-[#0A84FF] to-[#5AC8FA]" };
}

export function getRouteBadgeClasses(job: Job): string {
  if (isRevisionJob(job) || job.status === "revisit") {
    return "bg-[#FF9F0A]/15 text-[#FF9500]";
  }
  if (job.jobType === "process_serve") {
    return "bg-[#FF453A]/12 text-[#FF3B30]";
  }
  if (job.status === "under_review") {
    return "bg-[#0A84FF]/12 text-[#0A84FF]";
  }
  return "bg-[#30D158]/12 text-[#248A3D]";
}

export function getRouteBadgeLabel(job: Job): string {
  if (isRevisionJob(job) || job.status === "revisit") return "Revision";
  if (job.jobType === "process_serve") return "Serve";
  if (job.status === "under_review") return "Review";
  return "Ready";
}

export function getStatusIcon(status: Job["status"]): LucideIcon {
  switch (status) {
    case "under_review":
      return Hourglass;
    case "completed":
    case "finished":
      return CheckCircle2;
    case "revisit":
      return RefreshCw;
    case "outlier":
      return ShieldAlert;
    default:
      return CalendarClock;
  }
}
