# 📸 AuctionMyCamera — Workflow Status (Source of Truth)

Last updated: 2026-02-26  
Owner: Shaun  
Repo: auctionmycamera.co.uk (Next.js + Appwrite + Stripe)

---

## A) Account & Dashboard
- [x] Dashboard loads profile correctly (Personal Details tab)
- [x] Profile update works
- [x] Password change works
- [x] Remove "Copy JWT (testing)" button from dashboard UI
- [ ] Delete account workflow verified end-to-end (needs test)

## B) Listings (Seller)
- [x] Seller can submit listing from dashboard (/api/listings)
- [x] Listing shows in Awaiting / Queued / Live tabs
- [ ] Seller can edit queued listing (price/description/relist flag)
- [ ] Seller can withdraw queued listing
- [ ] Listing images verified in public listing page (needs confirm/test)

## C) Admin Approval
- [ ] Admin dashboard exists & reachable
- [ ] Admin can view pending listings
- [ ] Admin approve sets status correctly + schedules auction dates
- [ ] Admin reject sets status + reason emailed to seller
- [ ] Admin gets notified when listing submitted

## D) Auction Lifecycle (Weekly)
- [x] Scheduler security: CRON_SECRET required (Authorization: Bearer preferred; query/header supported)
- [ ] Auction start job moves queued → live (dates repaired/updated) (needs confirm/test)
- [x] Auction end job closes listing, determines outcome (based on bids/reserve)
- [x] Reserve handling confirmed: if reserve not met → listing becomes not_sold
- [x] Relist-until-sold logic confirmed (if enabled → re-queues with next window dates)
- [x] Queued date repair exists: missing auction_start/auction_end are assigned from getAuctionWindow()

## E) Payments (Stripe)
- [x] Winner payment is charged automatically at auction end (off-session) (in /api/auction-scheduler)
- [x] Safety switch added: DISABLE_WINNER_CHARGES=true/1 skips winner charging (safe testing)
- [x] Charge-failure handling implemented:
  - [x] Listing updated to payment_failed/payment_required (best-effort)
  - [x] Payment-failed transaction created (best-effort, schema tolerant)
  - [x] Buyer/admin “action required” emails sent (seller email optional/off by default)
  - [ ] Needs real test cases (no card + declined + SCA required)
- [x] Buyer saved payment method flow exists:
  - [x] /payment-method page exists and is SEO-safe (noindex/nofollow)
  - [x] /api/stripe/create-setup-intent returns SetupIntent client secret (auth required)
  - [x] /api/stripe/list-payment-methods returns saved cards + default flag (auth required)
  - [x] /api/stripe/has-payment-method checks usable saved card (auth required)
- [x] Stripe webhook route exists (/api/stripe/webhook):
  - [x] setup_intent.succeeded sets Stripe default payment method
  - [x] payment_intent.succeeded marks transaction paid (if a transaction is found)
  - [x] payment_intent.payment_failed marks transaction failed (best-effort)
- [ ] Stripe webhook fully verified in production (needs Stripe test + log confirmation)

## F) Transactions (Seller/Buyer Workflow)
- [x] Transaction record created at auction end (only after Stripe charge succeeds)
- [x] Seller dashboard: confirm dispatch route exists (/api/transactions/mark-dispatched)
  - [x] Seller-only (seller_email must match authed user)
  - [x] Requires payment_status=paid
  - [x] Moves transaction_status → receipt_pending and stores carrier/tracking/note (schema-tolerant)
- [x] Buyer dashboard: confirm received route exists (/api/transactions/confirm-received)
  - [x] Buyer-only (buyer_email must match authed user)
  - [x] Requires payment_status=paid
  - [x] Allowed from receipt_pending/dispatch_sent; idempotent if already complete
  - [x] Marks transaction_status=complete and payout_status=ready (schema-tolerant)
- [x] Delivery address snapshot fields are written into the transaction at creation (delivery_* fields)
- [ ] Seller email includes buyer delivery address automatically (snapshot exists; needs verify email template includes it)
- [ ] Admin dashboard: can view/manage transactions

## G) Email Notifications
- [x] Buyer "Congratulations, you won" email (sent from scheduler after successful charge)
- [x] Seller "Your item sold" email (sent from scheduler after successful charge)
- [x] Admin "Auction won / payment status" email (sent from scheduler after successful charge) (if ADMIN_EMAIL set)
- [x] Auto-relist email to seller (when relist_until_sold triggers)
- [x] Payment-required emails implemented (when no card / payment fails)
- [ ] Dispatch confirmation email (not yet verified)
- [ ] Delivery received confirmation email (not yet verified)

---

## Notes / Decisions / Safety
- Reserve rule: confirmed — if reserve not met → not_sold; if relist_until_sold enabled → queued with next window dates
- Payment model: off-session charge at auction end (current)
- Delivery address source: buyer profile snapshot → transaction delivery_* fields (needs verification end-to-end)
- Safety: running /api/auction-scheduler in production can charge real cards if Stripe is live and winner has a saved payment method
  - Mitigation: set DISABLE_WINNER_CHARGES=true/1 while testing
- Cron security: CRON_SECRET required (Authorization: Bearer <secret> preferred)

---

## Next Tests (Recommended Order)
1) Keep DISABLE_WINNER_CHARGES=true and run scheduler to validate lifecycle transitions safely.
2) Test /payment-method end-to-end: save card, confirm it shows as DEFAULT, confirm list-payment-methods works.
3) In Stripe TEST mode, run a controlled auction end: winner charged → tx created → emails sent.
4) Test failure paths: no saved card + declined card + SCA-required simulation; confirm tx/payment_failed + emails.
5) Verify webhook logs in Vercel + confirm it updates tx payment_status when applicable.