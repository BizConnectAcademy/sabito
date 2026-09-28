# BCA Advertising Network

The BCA advertising network supports advertiser and publisher workflows.

An advertiser can view campaigns, open a campaign, simulate a campaign before committing, create a
campaign through a protected flow, update it, pause it, and resume it. Campaign creation is a
sensitive action and can require the transaction PIN. Budget, reach estimates, formats, pricing,
approval state, and campaign availability come from current BCA configuration and data.

A user can create or view a publisher profile when eligible. Publishers can browse available or
test campaigns, accept a campaign, and view their assignments. The publication workflow allows the
publisher to mark a scheduled day as published and upload proof.

Some publication proof flows use WhatsApp verification. The publisher can start verification,
check its status, request verification, or cancel it. The process is rate-limited. Verification
status from BCA is authoritative, and Sabito must not claim that proof has passed without live
authenticated data.

Campaigns and publication proofs can require administrative review. A campaign or proof may be
pending, approved, rejected, paused, completed, or otherwise unavailable depending on its current
state. Publishers can also be blocked or unblocked by authorized administrators.

Sabito can explain these workflows but cannot create a campaign, accept an assignment, upload
proof, or verify WhatsApp through static knowledge. Those actions belong in authenticated BCA
interfaces or future narrowly authorized tools.

Knowledge snapshot source: BCA routes/api.php advertising-network routes and BCA advertising
implementation documents reviewed on 28 September 2026.
