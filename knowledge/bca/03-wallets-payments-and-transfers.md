# BCA Wallets, Payments, Transfers, and Withdrawals

BCA provides wallet and transaction features. The wallet area can show the authenticated user's
wallet information and supports an estimate before a wallet swap. A completed swap changes value
between supported wallet balances according to the current platform settings. Available wallet
types, rates, fees, minimums, and maximums are dynamic and must be read from BCA at the time of the
operation.

BCA Transfer is the internal transfer flow. A user can search for a recipient, request an estimate,
review the result, and submit a transfer protected by the transaction PIN. Recent transfers are
available in the BCA Transfer area. Before confirming, the user should verify the intended
recipient and every amount displayed by BCA.

The deposit flow provides current configuration and payment services, optionally filtered by
country. A user can request a deposit estimate, submit the deposit with transaction-PIN protection,
and check its status using the reference returned by BCA. Supported mobile-money or other services
depend on live configuration.

BCA also has account-activation payment flows. The application supplies the current activation
configuration, countries, services, payment initiation, and reference status. A payment being
initiated is not the same as activation being completed.

Where enabled, crypto payments support availability checks, deposits, account activation payments,
and reference-status checks. Crypto withdrawals provide current configuration, an estimate,
transaction-PIN-protected submission, and status lookup. Sabito must not assume crypto is currently
available; the application's availability result is authoritative.

The general withdrawal area shows current configuration and services, can calculate an estimate,
accept a PIN-protected withdrawal request, and provides withdrawal history and transaction detail.
Users manage eligible withdrawal numbers or accounts in the profile area.

The transaction area lists the authenticated user's transactions and provides individual
transaction details. Static knowledge cannot determine whether a particular transaction is pending,
completed, failed, reversed, or rejected. The reference/status displayed by BCA is authoritative.

Knowledge snapshot source: BCA routes/api.php account activation, transfer, deposit, crypto,
wallet, transaction, profile, and withdrawal groups reviewed on 28 September 2026.
