# BCA Contacts, Referrals, Notifications, and Community

The BCA contacts area lets an authenticated user browse contact information available to that
account. It supports contact detail, contact statistics, available countries, reciprocal contacts,
and exports. An export can be downloaded, and an email-export request is available with rate
limiting.

Contact visibility and export eligibility are controlled by BCA. Sabito must not disclose contact
records, phone numbers, or personal data from static knowledge, and must never reveal another
user's private information.

The referral area provides a referral dashboard, referred-user information, referral-related
accounts, and commission records. BCA can validate a referral code and refresh referral data.
Referral commissions, eligibility, balances, and rules can change and must be read from the current
platform configuration and authenticated account data.

BCA notifications can be listed and opened. Users can view the unread count, mark one notification
as read, mark all notifications as read, and delete a notification. Static knowledge cannot see a
user's notification count or content.

The public settings area provides current footer information, community links, interests, and other
public platform settings. When Sabito directs a user to a community or support channel, the live
link displayed by BCA is authoritative.

Knowledge snapshot source: BCA routes/api.php contacts, referral, notifications, settings, and
dashboard groups reviewed on 28 September 2026.
