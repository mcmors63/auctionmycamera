# 📸 AuctionMyCamera — Workflow Status (Source of Truth)

Last updated: 2026-02-25
Owner: Shaun
Repo: auctionmycamera.co.uk (Next.js + Appwrite + Stripe)

---

## A) Account & Dashboard
- [x] Dashboard loads profile correctly (Personal Details tab)
- [x] Profile update works
- [x] Password change works
- [x] Remove "Copy JWT (testing)" button from dashboard UI
- [ ] Delete account workflow verified end-to-end

## B) Listings (Seller)
- [x] Seller can submit listing from dashboard (/api/listings)
- [x] Listing shows in Awaiting / Queued / Live tabs
- [ ] Seller can edit queued listing (price/description/relist flag)
- [ ] Seller can withdraw queued listing
- [ ] Listing images verified in public listing page

## C) Admin Approval
- [ ] Admin dashboard exists & reachable
- [ ] Admin can view pending listings
- [ ] Admin approve sets status correctly + schedules auction dates
- [ ] Admin reject sets status + reason emailed to seller
- [ ] Admin gets notified when listing submitted

## D) Auction Lifecycle (Weekly)
- [ ] Auction start job moves queued → live (dates updated)
- [x] Auction end job closes listing, determines outcome (based on bids/reserve)
- [x] Reserve handling confirmed: if reserve not met → listing becomes not_sold
- [x] Relist-until-sold logic confirmed (if enabled → re-queues with next window dates)

## E) Payments (Stripe)
- [x] Winner payment is charged automatically at auction end (off-session) (code present in /api/auction-scheduler)
- [ ] If charge fails: transaction goes to payment_failed + emails sent (needs hardening + test)
- [ ] Buyer saved payment method flow exists (/payment-method) (needs confirm/test)
- [ ] Stripe webhook is wired and tested in prod

## F) Transactions (Seller/Buyer Workflow)
- [x] Transaction record created at auction end (after successful Stripe charge)
- [ ] Seller email includes buyer delivery address automatically (in progress / needs verify)
- [x] Seller dashboard: confirm dispatch route exists (/api/transactions/mark-dispatched)
- [x] Buyer dashboard: confirm received route exists (/api/transactions/confirm-received)
- [ ] Admin dashboard: can view/manage transactions

## G) Email Notifications
- [x] Buyer "Congratulations, you won" email (sent from scheduler after successful charge)
- [x] Seller "Your item sold" email (sent from scheduler after successful charge)
- [x] Admin "Auction won / payment status" email (sent from scheduler after successful charge)
- [ ] Dispatch confirmation email (not yet verified)
- [ ] Delivery received confirmation email (not yet verified)

---

## Notes / Decisions Needed
- Reserve rule: confirmed — if reserve not met → not_sold; if relist_until_sold enabled → queued with next window dates
- Payment model: off-session charge at auction end (current)
- Delivery address source: buyer profile snapshot (being wired into transaction + seller email)
- Safety: running /api/auction-scheduler in production can charge real cards if Stripe is live and the winner has a saved payment method