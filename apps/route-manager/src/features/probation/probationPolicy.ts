export type ProbationCheckInPhase = "complete" | "early" | "coach" | "urgent" | "overdue";

export function getProbationMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function getProbationCheckInPhase(date: Date, completed: boolean): ProbationCheckInPhase {
  if (completed) return "complete";
  const day = date.getDate();
  if (day <= 3) return "early";
  if (day <= 7) return "coach";
  if (day <= 10) return "urgent";
  return "overdue";
}

export function isProbationJobLockRequired(phase: ProbationCheckInPhase): boolean {
  return phase === "urgent" || phase === "overdue";
}

export function isProbationWindowDate(dateKey: string): boolean {
  const day = Number(dateKey.slice(8, 10));
  return day >= 1 && day <= 10;
}
