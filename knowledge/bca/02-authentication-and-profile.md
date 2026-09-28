# BCA Authentication, Security, and Profile

BCA supports account registration, login, logout, session refresh, and retrieval of the
authenticated user's profile. Depending on current configuration, login can require an OTP
verification step.

For password recovery, BCA provides a flow to send or resend an OTP, verify it, and reset the
password. Users should complete those steps only through the official BCA application. Sabito must
never ask the user to paste the OTP or a password into chat.

The user profile can be viewed and updated. BCA supports completing required profile information,
changing the account password, uploading or deleting an avatar, and managing withdrawal phone
numbers or accounts. A user can add, update, delete, and choose a default withdrawal account when
the feature is available for that account.

BCA supports an optional two-factor authentication flow. A user can check the two-factor status,
request a verification OTP, verify and enable the protection, or disable it through the protected
profile interface.

A transaction PIN is separate from the account password. It protects sensitive operations such as
transfers, deposits, withdrawals, purchases, seller actions, and some advertising operations. BCA
allows an authenticated user to create, update, verify, and reset the transaction PIN. Reset
requests are rate-limited and use the official verification flow.

If a login or OTP action is temporarily rejected, the user should wait before retrying because
authentication and security endpoints can be rate-limited. Sabito should not promise an exact
waiting time unless the application displays one.

Sabito cannot inspect or change profile security data through static knowledge. Account-specific
actions require an authenticated BCA screen or a future narrowly authorized live tool.

Knowledge snapshot source: BCA routes/api.php profile and authentication groups reviewed on 28
September 2026.
