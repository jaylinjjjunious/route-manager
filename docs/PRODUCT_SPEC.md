# All in One 667 Product Spec

## Product Purpose

All in One 667 is a field-work mission control app for a gig worker riding an e-bike in Bakersfield. The app helps the user plan, execute, and prove completion for mixed daily work: retail audits, merchandising, mystery shops, delivery-style field tasks, revisions, and occasional process server jobs.

The app should answer the user's most urgent question within two seconds:

> What do I do next?

## Core User

- Works from a phone or small laptop/tablet while moving between jobs.
- Needs outdoor-readable, high-contrast screens.
- Needs big controls that are usable one-handed while stopped safely.
- Mixes multiple job sources and must protect proof if a job is questioned.
- May add process server work from platforms such as ABC Legal alongside regular route jobs.

## Operating Modes

### Planning Mode

Planning Mode is for organizing and preparing work.

- Add and import jobs.
- Add process server jobs.
- Optimize route order.
- Review battery, earnings, route score, outliers, proof vault, and logs.
- Plan tomorrow or move jobs out of today's active route.

### Ride Mode

Ride Mode is for execution only. It must be manually started by pressing "I'm Riding".

Ride Mode should hide distractions and show only:

- Next Stop.
- Navigate button.
- Complete Job button.
- Battery percent or compact ride-critical battery signal.
- Jobs Left.
- Ride Timer.
- Current Route as a compact list.
- Ride execution metrics such as battery used and money per hour.

Ride Mode should not show the full Battery Tracker panel or AI Dispatcher panel.

## Dashboard Mission Control

The dashboard is the first screen every time the app opens. It should feel like a dispatch center and contain only the user's active operating information:

- Next Stop as the largest card.
- Navigate button.
- Complete Job button.
- Today's Route as a compact route list.
- Battery Status.
- Jobs Left.
- Estimated Earnings Today.
- AI Dispatcher message.
- Revision Alerts.

The dashboard should not show completed jobs, settings, analytics, or long paragraphs.

## Route Rules

- Today's route is the main active list.
- The current stop stays pinned to the top.
- Completed jobs disappear automatically from the active route.
- Route order recalculates immediately after completion.
- Revision jobs are mandatory and stay in the active route, not a separate list.
- Smart Revision Merge inserts revision jobs into the best route position based on distance, battery, ride time, deadlines, and the existing route.
- When a revision moves, the app explains why.

## Job Completion Workflow

When Complete Job is pressed:

- Animate completion.
- Remove the job from the active route.
- Recalculate route.
- Update Jobs Left.
- Update Earnings.
- Update Battery estimate.
- Update AI Dispatcher state/message.
- Create or update the job's proof folder.
- Show a short next-step message such as:

> Great job.
>
> Next stop:
> Vons.
>
> 12 minute ride.

No refresh should be required.

## Process Server Jobs

Process server jobs must live in the same route as other jobs. They should carry extra fields that match real process-serving work:

- Platform or company.
- Case/order number.
- Party being served.
- Document type.
- Service address.
- Attempt window.
- Attempt status.
- Address status.
- Court diligence or special handling notes.
- Proof of residence/address notes.
- Recipient or served person details.
- Physical description/context.
- Photo/GPS/printed-document/proof-ready requirements.
- Attempt notes.

Process server proof should be especially complete because it may support proof of service or explain why service was not completed.

## Proof Vault

Every completed job automatically creates a proof folder with:

- Store/job name.
- Address.
- Completion time.
- Arrival time.
- GPS when available.
- Photos.
- Screenshots.
- Receipts.
- Notes.

The user must be able to open any completed job and view or add supporting evidence later.

## Battery Tracker

The battery tracker should track:

- Battery percent.
- Ride time.
- Store time.
- Estimated range.
- Assist level.
- Estimated miles remaining.
- Battery risk.
- Whether the route can be finished.
- Whether recharge is recommended.

Only ride time should count toward battery estimates. Store time pauses battery drain learning.

## AI Dispatcher

AI Dispatcher V1 is an operations manager, not a general chatbot. It should answer and execute:

- What's next?
- Can I finish today?
- Move this job.
- Complete this job.
- How many jobs left?
- Re-optimize.

When it changes route state, it must update the app state automatically.

## Design Principles

- Clean Bento dashboard.
- Large bold fonts.
- High contrast.
- Color coded.
- Minimal scrolling.
- Big buttons.
- Outdoor readability.
- No long paragraphs in field screens.
- Planning and Ride Mode should feel like separate experiences.
