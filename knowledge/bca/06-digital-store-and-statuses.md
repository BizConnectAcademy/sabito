# BCA Digital Store and Statuses

The BCA digital store allows users to browse active products and categories, open product details,
and view items in their library. Eligible products can be purchased through the protected BCA
purchase flow, which requires the transaction PIN. A buyer can submit a product review through the
official product interface.

BCA also supports sellers. The seller area includes a seller dashboard, product management, sales,
and seller subscription management. Eligible users can create or update a product, enable or
disable their product, remove it, review sales, and purchase or renew the applicable seller
subscription. Product creation, updates, and subscription purchases can require transaction-PIN
confirmation.

Product approval, pricing, availability, seller eligibility, subscription terms, refunds, and
review status are governed by current BCA data and policies. Sabito should direct users to the
current digital-store conditions for authoritative terms.

The statuses feature provides a feed and a user's own statuses. An authenticated user can publish,
view, and delete a status. BCA records status views, can show viewers to the authorized owner, and
supports adding or removing reactions. These actions are rate-limited to protect the service.

Static knowledge cannot see a user's library, sales, subscriptions, statuses, viewers, or
reactions. Those require authenticated live data.

Knowledge snapshot source: BCA routes/api.php digital store and statuses groups reviewed on 28
September 2026.
