# 📸 AuctionMyCamera — Workflow Status (Source of Truth)

Last updated: 2026-02-26  
Owner: Shaun  
Repo: auctionmycamera.co.uk (Next.js + Appwrite + Stripe)

============================================================

## SECTION A — Account & Dashboard

- Dashboard loads profile correctly — DONE  
- Profile update works — DONE  
- Password change works — DONE  
- "Copy JWT (testing)" removed — DONE  
- Delete account workflow verified end-to-end — TODO  

============================================================

## SECTION B — Listings (Seller)

- Seller can submit listing from dashboard (/api/listings) — DONE  
- Listing appears in Awaiting / Approved+Queued / Live tabs — DONE  

### Queued listing controls
- Seller can edit queued listing — PARTIAL (route folder exists but not committed/wired/tested)  
- Seller can withdraw queued listing — PARTIAL (withdraw route exists; dashboard wiring + test pending)  

- Listing images verified in production — TODO  

### Image handling logic
- image_url supported — DONE  
- image_id supported via local proxy (/api/camera-image/:id) — DONE  
- Fallback hero image implemented — DONE  

============================================================

## SECTION C — Admin Approval

- Admin dashboard exists and reachable — DONE  
- Admin can view pending listings — DONE  
- Admin approve sets status + schedules auction dates — DONE (needs final production test)  
- Admin reject sets status + emails seller — DONE (needs confirm in live)  

### Admin tools
- Admin delete listing route exists — PARTIAL (folder exists untracked; commit + UI wiring + test pending)  
- Admin notified when listing submitted — TODO  

============================================================

## SECTION D — Auction Lifecycle (Weekly Scheduler)

- Scheduler protected by CRON_SECRET — DONE  
- Auction start moves queued to live — DONE (needs live validation run)  
- Queued date repair via getAuctionWindow() — DONE  
- Auction end closes listing and determines outcome — DONE  

### Reserve logic
- If reserve not met → status = not_sold — DONE  
- If relist_until_sold enabled → re-queues listing — DONE  

### Scheduler lifecycle safety
- Status set to completed before payment attempt — DONE  

============================================================

## SECTION E — Payments (Stripe)

### Winner charging
- Off-session charge at auction end — DONE  
- Safety switch DISABLE_WINNER_CHARGES=true implemented — DONE  

### Charge failure handling
- Listing updated to payment_required or payment_failed — DONE  
- Failed transaction created (schema tolerant) — DONE  
- Buyer + admin action-required emails sent — DONE  
- Real-world failure testing (no card / declined / SCA required) — TODO  

### Saved card system
- /payment-method page exists (noindex) — DONE  
- SetupIntent route works — DONE  
- List-payment-methods route works — DONE  
- has-payment-method route works — DONE  

### Stripe webhook
- setup_intent.succeeded sets default payment method — DONE  
- payment_intent.succeeded marks transaction paid — DONE  
- payment_intent.payment_failed marks transaction failed — DONE  
- Full production verification in Stripe dashboard — TODO  

============================================================

## SECTION F — Transactions (Seller and Buyer Workflow)

### Transaction creation
- Transaction created only after successful Stripe charge — DONE  
- Delivery address snapshot stored in transaction (delivery_*) — DONE  

### Seller flow
- mark-dispatched route exists — DONE  
- Seller-only authorization enforced — DONE  
- Requires payment_status = paid — DONE  
- Sets transaction_status = receipt_pending — DONE  

### Buyer flow
- confirm-received route exists — DONE  
- Buyer-only authorization enforced — DONE  
- Requires payment_status = paid — DONE  
- Sets transaction_status = complete and payout_status = ready — DONE  

### Pending work
- Dashboard transactions UI build/JSX integrity — BLOCKER (fix build first)  
- Seller email includes delivery address snapshot — TODO (needs confirm via real email)  
- Admin can view/manage transactions — TODO  

============================================================

## SECTION G — Public Listing Page (SEO + Status Handling)

- SSR + ISR (revalidate=300) — DONE  
- Canonical URL forced to production domain — DONE  
- Non-public statuses return 404 — DONE  

### Lifecycle status handling on public page
- completed → shows processing banner — DONE  
- payment_required → shows action required banner — DONE  
- payment_failed → shows failure banner — DONE  
- not_sold → shows ended (not sold) banner — DONE  

- Production UI verification of all above states — TODO  

============================================================

## SECTION H — Email Notifications

- Buyer "You won" email — DONE  
- Seller "Your item sold" email — DONE  
- Admin "Auction won / payment status" email — DONE  
- Auto-relist email to seller — DONE  
- Payment-required email — DONE  
- Dispatch confirmation email — TODO  
- Delivery received confirmation email — TODO  

============================================================

## SAFETY NOTES

- Running /api/auction-scheduler in production can charge real cards.  
- Use DISABLE_WINNER_CHARGES=true while testing.  
- CRON_SECRET required for scheduler access.  
- Only switch Stripe to live mode after full test validation.  

============================================================

## RECOMMENDED TEST ORDER

1. Keep DISABLE_WINNER_CHARGES=true and validate lifecycle transitions safely.  
2. Test /payment-method end-to-end (add card, confirm default).  
3. Use Stripe TEST mode to simulate auction end → verify charge, transaction creation, emails.  
4. Test failure paths: no card, declined card, SCA required.  
5. Verify Stripe webhook logs + Vercel logs confirm payment status updates.  