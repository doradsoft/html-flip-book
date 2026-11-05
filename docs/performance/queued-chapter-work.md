# Cancel queued chapter work when another turn begins

The retained-layout React adapter stages covered chapter mounting and retirement
after two paint barriers. Cancelling those frames on pointer input or native flip
activity did not invalidate a transition that the second frame had already queued.
That transition could commit optional chapter DOM while the next turn was active.

The adapter now clears that queued plan, releases its preparation hold, and
invalidates the pending render when an interaction starts. This update is needed
only when a mount or retirement is already queued. Required moving faces and
underlays still mount, and optional work resumes through the existing preparation
barriers after all interactions finish. Rendering, animation deadlines, and the
chapter workload are unchanged.

Four regression cases cover queued mounting and retirement interrupted by either
pointer input or native animation. They assert that optional DOM remains unchanged,
moving material remains mounted, work resumes after completion, and the cancelled
preparation hold is released exactly once. The two mounting cases fail on the
previous implementation because chapter 17 commits during the new interaction.

This repairs an observed scheduling race, not every outstanding reader stall.
Original hosted traces also contain expensive completion-frame Style and PrePaint
work. Consumer timing, appearance, and hosted repeatability remain separate gates;
passing component tests does not establish that the hosted stalls are repaired.
