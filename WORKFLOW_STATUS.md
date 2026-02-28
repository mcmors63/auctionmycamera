AuctionMyCamera — Workflow Status (Source of Truth)

Last updated: 2026-02-28
Owner: Shaun
Repo: auctionmycamera.co.uk
Stack: Next.js 16 + Appwrite + Stripe + Vercel

============================================================

SECTION A — Account & Dashboard

Dashboard loads profile correctly — DONE
Profile update works — DONE
Password change works — DONE
"Copy JWT (testing)" removed — DONE
Delete account workflow verified end-to-end — TODO (requires production deletion test + DB confirmation)

Auth & Security

Admin routes require Appwrite JWT + ADMIN_EMAIL check — DONE
Admin transaction archive route uses requireAdmin (session-based) — DONE
Stripe routes require Bearer JWT — DONE
Public cannot access admin mutation routes — DONE

============================================================

SECTION B — Listings (Seller)

Seller can submit listing from dashboard (/api/listings) — DONE
Listing appears in Awaiting / Approved+Queued / Live tabs — DONE

Queued Listing Controls

Seller can edit queued listing — DONE (needs final production validation)
Seller can withdraw queued listing — DONE (status = withdrawn; needs production validation)
Listing images verified in production — TODO

Image Handling

image_url supported — DONE
image_id supported via local proxy (/api/camera-image/:id) — DONE
Fallback hero image implemented — DONE

============================================================

SECTION C — Admin Approval & Sales Control

Admin dashboard exists and reachable — DONE
Admin can view pending listings — DONE
Admin approve sets status + schedules auction dates — DONE (final lifecycle validation pending)
Admin reject sets status + emails seller — DONE (production confirmation pending)

Admin Transaction Management

Dedicated admin transaction page — DONE
Admin can update fulfilment status (dispatch_pending / receipt_pending / complete / payment_failed) — DONE
Admin notes stored on transaction — DONE
Archive (soft delete) transaction (archived flag + reason + timestamp) — DONE

Pending Admin Work

Ensure transactions dashboard excludes archived=true — TODO
Admin delete listing route hardened (JWT confirm) — TODO
Admin notified when listing submitted — TODO
Admin transaction UI full production validation — TODO

============================================================

SECTION D — Auction Lifecycle (Weekly Scheduler)

Scheduler protected by CRON_SECRET — DONE
Queued → Live transition works — DONE (needs live cron validation run)
Queued date repair via getAuctionWindow() — DONE
Live → Completed transition works — DONE

Reserve Logic

If reserve not met → status = not_sold — DONE
If relist_until_sold enabled → re-queues listing — DONE

Payment Safety

Listing status set before charge attempt — DONE
DISABLE_WINNER_CHARGES safeguard implemented — DONE

============================================================

SECTION E — Payments (Stripe)
Saved Card System

/payment-method page exists (noindex) — DONE
SetupIntent creation route — DONE
list-payment-methods route — DONE
has-payment-method route — DONE
setup_intent.succeeded sets default card — DONE

Bidding Safety

place-bid requires JWT — DONE
place-bid checks has payment method — DONE
Redirects to /payment-method if none saved — DONE

Winner Charging

Off-session charge at auction end — DONE
Only attempts charge if reserve met — DONE
DISABLE_WINNER_CHARGES=true bypass supported — DONE

Failure Handling

payment_failed transaction created — DONE
Listing marked appropriately — DONE
Buyer + admin action-required emails — DONE
Real-world failure testing (declined / SCA / no card) — TODO

Stripe Webhook

payment_intent.succeeded → transaction marked paid — DONE
payment_intent.payment_failed → marked failed — DONE
Full production verification in Stripe dashboard — TODO

============================================================

SECTION F — Transactions (Seller & Buyer Workflow)
Transaction Creation

Created only after successful Stripe charge — DONE
Delivery snapshot (delivery_*) stored in transaction — DONE

Seller Flow

mark-dispatched route exists — DONE
Seller-only JWT authorization enforced — DONE
Requires payment_status = paid — DONE
Sets transaction_status = receipt_pending — DONE

Buyer Flow

confirm-received route exists — DONE
Buyer-only JWT authorization enforced — DONE
Requires payment_status = paid — DONE
Sets transaction_status = complete — DONE
Sets payout_status = ready — DONE

Pending Workflow Validation

Dashboard transactions UI full production test — TODO
Seller “sold” email includes delivery snapshot — TODO (verify via real email)
Dispatch confirmation email — TODO
Delivery received confirmation email — TODO

============================================================

SECTION G — Public Listing Page (SEO + Status Handling)

SSR + ISR (revalidate=300) — DONE
Canonical URL forced to production domain — DONE
Non-public statuses return 404 — DONE

Lifecycle Banners

completed → processing banner — DONE
payment_required → action required banner — DONE
payment_failed → failure banner — DONE
not_sold → ended (not sold) banner — DONE

Production UI validation of every status — TODO

============================================================

SECTION H — Email Notifications
Completed

Buyer “You won” email — DONE
Seller “Your item sold” email — DONE
Admin “Auction won” email — DONE
Payment-required email — DONE
Auto-relist email — DONE

Pending

Dispatch confirmation email — TODO
Buyer receipt confirmation email — TODO
Full production inbox validation (SPF/DKIM) — TODO

============================================================

SECTION I — Security & Safeguards

Admin delete transaction requires JWT + ADMIN_EMAIL — DONE
Stripe routes require JWT — DONE
Scheduler requires CRON_SECRET — DONE
DISABLE_WINNER_CHARGES toggle — DONE
Public cannot mutate admin resources — DONE

============================================================

⚠ SAFETY NOTES

Running /api/auction-scheduler in production will charge real cards if:

• STRIPE_SECRET_KEY is live
• DISABLE_WINNER_CHARGES is false

Always test in Stripe TEST mode first.
Keep DISABLE_WINNER_CHARGES=true during lifecycle testing.
Admin routes are JWT-protected — never expose secrets client-side.

============================================================

🧪 RECOMMENDED TEST ORDER (Production Hardening Pass)

Keep DISABLE_WINNER_CHARGES=true → validate lifecycle transitions safely.

Test full card flow:

Add card

Confirm default

Verify has-payment-method returns true

Switch to Stripe TEST mode:

Run scheduler manually

Confirm charge attempt

Confirm transaction creation

Simulate failure:

Remove card

Use declined test card

Validate payment_failed state + emails

Confirm webhook events logged in:

Stripe dashboard

Vercel logs

Remove DISABLE_WINNER_CHARGES and perform final controlled live test.

============================================================

If you want the next session ultra-focused, title it:

“AuctionMyCamera — Final Payment & Dispatch Hardening”

And we’ll move into strict production validation + email finalisation + payout logic verification.

You’re now at the “platform stabilisation” phase — not feature building.
That’s a very good place to be.