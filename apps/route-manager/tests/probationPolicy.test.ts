import { describe, expect, it } from "vitest";
import { getProbationCheckInPhase, isProbationJobLockRequired, isProbationWindowDate } from "../src/features/probation/probationPolicy";

describe("probation check-in policy", () => {
  it.each([
    [1, "early", false],
    [3, "early", false],
    [4, "coach", false],
    [7, "coach", false],
    [8, "urgent", true],
    [10, "urgent", true],
    [11, "overdue", true],
  ])("uses the correct phase and lock on day %i", (day, phase, locked) => {
    const value = getProbationCheckInPhase(new Date(2026, 8, day as number, 12), false);
    expect(value).toBe(phase);
    expect(isProbationJobLockRequired(value)).toBe(locked);
  });

  it("unlocks immediately after completion", () => {
    const phase = getProbationCheckInPhase(new Date(2026, 8, 16, 12), true);
    expect(phase).toBe("complete");
    expect(isProbationJobLockRequired(phase)).toBe(false);
  });

  it("marks only the first ten calendar dates as the check-in window", () => {
    expect(isProbationWindowDate("2026-09-01")).toBe(true);
    expect(isProbationWindowDate("2026-09-10")).toBe(true);
    expect(isProbationWindowDate("2026-09-11")).toBe(false);
  });
});
