# End-to-End User Workflows

## Flow 1: Daily Start

1. Open the app — authenticate via Supabase (magic link or email/password).
2. Dashboard loads — Shower Gate panel shows as locked.
3. Tap "Scan Product Barcode" — camera permission prompt appears.
4. Scan the required barcode (075371003233) — gate unlocks.
5. Protected tabs (Jobs, Battery, Tracker) become available.
6. Plan and manage today's route on Dashboard — optimizer runs nearest-neighbor algorithm.
7. Start Ride Mode from the Dashboard — distraction-free execution begins.

## Flow 2: Complete Jobs

1. In Ride Mode, navigate to the current stop.
2. Complete the job — Proof Vault opens automatically.
3. Attach photos, screenshots, or receipts via camera or file picker.
4. Add optional notes describing the job.
5. Confirm completion — proof is saved to backend.
6. Auto-navigate to the next stop in the optimized route.

## Flow 3: End of Day

1. End Ride Mode from the Dashboard.
2. Switch to the Tracker tab — EndOfDaySummary displays.
3. Review completed jobs, metrics, and proof vault contents.
4. Check the Habits tab for the daily shower streak.

## Flow 4: AI Dispatcher

1. Open the AI Operations Assistant from any tab.
2. Ask a question about route, jobs, or schedule.
3. Receive Gemini-powered advice or suggestions.
4. Add or remove jobs based on dispatcher recommendations.

## Flow 5: Battery Check

1. Open the Battery tab.
2. View current e-bike battery level and estimated range.
3. Route optimization factors in remaining range automatically.
4. Jobs outside range are flagged or excluded from the route.

## Flow 6: Habit Tracking

1. Open the Habits tab.
2. View mandatory shower status and custom daily tasks.
3. Complete tasks to maintain the daily streak.
4. Streak data persists via localStorage.

---

**Last Updated:** 2026-07-22 (routes-page-removed)
