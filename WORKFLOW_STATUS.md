A) Account & Dashboard

 Dashboard loads profile correctly (Personal Details tab)

 Profile update works

 Password change works

 Remove "Copy JWT (testing)" button from dashboard UI

 Delete account workflow verified end-to-end (needs test)

B) Listings (Seller)

 Seller can submit listing from dashboard (/api/listings)

 Listing shows in Awaiting / Approved+Queued / Live tabs

 Seller can edit queued listing (price/description/relist flag)

 Seller can withdraw queued listing

 Route stub added (untracked): app/api/listings/withdraw-queued/ (needs wire-up + test)

 Public listing images now support:

 image_url (direct) OR

 image_id via local proxy (/api/camera-image/:id) OR

 fallback hero image

 Listing images verified end-to-end in production (needs confirm/test)

C) Admin Approval

 Admin dashboard exists & reachable

 Admin can view pending listings (via AdminClient)

 Admin approve sets status correctly + schedules auction dates (assumed from current admin flow)

 Admin reject sets status + reason emailed to seller

 app/api/admin/reject-listing/route.ts updated (needs final prod test)

 Admin delete listing route exists

 app/api/admin/delete-listing/route.ts now compiles as a proper module

 Admin gets notified when listing submitted (needs confirm/test)

D) Auction Lifecycle (Weekly)

 Scheduler security: CRON_SECRET required (Authorization: Bearer preferred; query/header supported)

 Auction start job moves queued → live

 Repairs missing auction_start / auction_end using getAuctionWindow()

 Auction end job closes listing, determines outcome (bids/reserve)

 Reserve handling confirmed: if reserve not met → listing becomes not_sold

 Relist-until-sold logic confirmed (if enabled → re-queues with next window dates)

 Completed listings are created for charging pipeline (status: completed)

E) Payments (Stripe)

 Winner payment is charged automatically at auction end (off-session) (in /api/auction-scheduler)

 Safety switch added: DISABLE_WINNER_CHARGES=true/1 skips winner charging (safe testing)

 Charge-failure handling implemented:

 Listing updated to payment_failed / payment_required (best-effort)

 Payment-failed transaction created (best-effort, schema tolerant)

 Buyer/admin “action required” emails sent (seller email optional/off by default)

 Needs real test cases (no card + declined + SCA required)

 Buyer saved payment method flow exists:

 /payment-method page exists and is SEO-safe (noindex,nofollow)

 /api/stripe/create-setup-intent returns SetupIntent client secret (auth required)

 /api/stripe/list-payment-methods returns saved cards + default flag (auth required)

 /api/stripe/has-payment-method checks usable saved card (auth required)

 Stripe webhook route exists (/api/stripe/webhook):

 setup_intent.succeeded sets Stripe default payment method

 payment_intent.succeeded marks transaction paid (if a transaction is found)

 payment_intent.payment_failed marks transaction failed (best-effort)

 Stripe webhook fully verified in production (needs Stripe test + log confirmation)

F) Transactions (Seller/Buyer Workflow)

 Transaction record created at auction end (only after Stripe charge succeeds)

 Seller dashboard: confirm dispatch route exists (/api/transactions/mark-dispatched)

 Seller-only (seller_email must match authed user)

 Requires payment_status=paid

 Moves transaction_status → receipt_pending and stores carrier/tracking/note (schema-tolerant)

 Buyer dashboard: confirm received route exists (/api/transactions/confirm-received)

 Buyer-only (buyer_email must match authed user)

 Requires payment_status=paid

 Allowed from receipt_pending/dispatch_sent; idempotent if already complete

 Marks transaction_status=complete and payout_status=ready (schema-tolerant)

 Delivery address snapshot fields are written into the transaction at creation (delivery_*)

 Seller “sold” email now includes buyer delivery details (when available)

 Needs live verification (confirm template renders snapshot in real email)

 Admin dashboard: can view/manage transactions (not built yet)

G) Public Listing Page (SEO + Status Handling)

 Listing page is SSR + ISR (revalidate=300) for crawler-friendly HTML

 Canonical URL is forced to real domain in production

 Public access is blocked for non-public statuses (pending/rejected/etc → 404)

 Public page now supports correct “post-auction” outcomes (avoid generic “Auction ended”):

 Completed / winner charged / payment required / payment failed messaging shown correctly (needs final UI mapping check + prod test)

 Public indexable statuses reviewed and aligned with real lifecycle

Note: current isPublicStatus() in app/listing/[id]/page.tsx only allows live|queued|sold — confirm if you also want completed or not_sold publicly visible.

H) Email Notifications

 Buyer "Congratulations, you won" email (sent from scheduler after successful charge)

 Seller "Your item sold" email (sent from scheduler after successful charge)

 Admin "Auction won / payment status" email (sent from scheduler after successful charge) (if ADMIN_EMAIL set)

 Auto-relist email to seller (when relist_until_sold triggers)

 Payment-required emails implemented (when no card / payment fails)

 Dispatch confirmation email (not yet verified)

 Delivery received confirmation email (not yet verified)

Notes / Decisions / Safety

Reserve rule: confirmed — if reserve not met → not_sold; if relist_until_sold enabled → queued with next window dates

Payment model: off-session charge at auction end (current)

Delivery address source: buyer profile snapshot → transaction delivery_* fields (needs verification end-to-end)

Safety: running /api/auction-scheduler in production can charge real cards if Stripe is live and winner has a saved payment method

Mitigation: set DISABLE_WINNER_CHARGES=true/1 while testing

Cron security: CRON_SECRET required (Authorization: Bearer <secret> preferred)

Next Tests (Recommended Order)

Keep DISABLE_WINNER_CHARGES=true and run scheduler to validate lifecycle transitions safely.

Test /payment-method end-to-end: save card, confirm it shows as DEFAULT, confirm list-payment-methods works.

In Stripe TEST mode, run a controlled auction end: winner charged → tx created → emails sent.

Test failure paths: no saved card + declined card + SCA-required simulation; confirm tx/payment_failed + emails.

Verify webhook logs in Vercel + confirm it updates tx payment_status when applicable.