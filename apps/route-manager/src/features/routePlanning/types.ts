/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface RouteOptimizationLog {
  why: string;
  minutesSaved: number;
  batteryDifference: number;
  earningsDifference: number;
  timestamp: string;
}
