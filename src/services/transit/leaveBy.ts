import type { TransitTrip, Job } from '../../types';

export function calculateLeaveByTime(trip: TransitTrip): Date {
  const now = new Date();
  const totalMinutes = trip.totalDurationMinutes + 5;
  return new Date(now.getTime() - totalMinutes * 60000);
}

export function formatLeaveByTime(trip: TransitTrip): string {
  const leaveBy = calculateLeaveByTime(trip);
  return leaveBy.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function minutesUntilDeadline(job: Job): number | null {
  if (!job.deadline) return null;
  const deadline = new Date(job.deadline);
  const now = new Date();
  return Math.round((deadline.getTime() - now.getTime()) / 60000);
}

export function deadlineComparison(trip: TransitTrip, job: Job): {
  arrivalMinutesBeforeDeadline: number | null;
  onTime: boolean | null;
  label: string;
} {
  if (!job.deadline) {
    return { arrivalMinutesBeforeDeadline: null, onTime: null, label: 'No deadline' };
  }

  const deadline = new Date(job.deadline);
  const now = new Date();
  const tripDurationMs = trip.totalDurationMinutes * 60000;
  const estimatedArrival = new Date(now.getTime() + tripDurationMs);
  const diffMinutes = Math.round((deadline.getTime() - estimatedArrival.getTime()) / 60000);

  const onTime = diffMinutes >= 0;

  let label: string;
  if (onTime) {
    label = diffMinutes < 15 ? `Tight — ${diffMinutes}m buffer` : `${diffMinutes}m before deadline`;
  } else {
    label = `Late by ${Math.abs(diffMinutes)}m`;
  }

  return { arrivalMinutesBeforeDeadline: diffMinutes, onTime, label };
}
