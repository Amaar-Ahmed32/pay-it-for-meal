# Sandbox account setup — JazzCash + Easypaisa (step by step)

Read this before you put any account into the site: a personal wallet is NOT
enough. A gateway needs a MERCHANT account, with API keys, a signed request,
and a callback URL. This guide gets you a free SANDBOX merchant account first
— real gateway flow, test money only, no real money moves.

## 1. JazzCash sandbox account (free, self-register)

1. Go to the JazzCash Sandbox Portal: https://sandbox.jazzcash.com.pk
   (documentation: https://sandbox.jazzcash.com.pk/SandboxDocumentation/v4.2/index.html)
2. Click "Get Started" and sign up as a merchant. You will get an email with
   a registration link. Fill in the contact details it asks for:
   merchant name, contact person name, email, phone, designation, category,
   password, merchant phone number.
   - This is the SANDBOX portal, not the live merchant onboarding with
     CNIC/NTN/documents. Those documents are for going LIVE later.
3. Log in to the Sandbox Portal.
4. Generate credentials. When it asks for a Return URL, enter exactly:
   http://localhost:5001/api/payments/jazzcash/return
   (for the contest demo on your own PC; for a deployed site, use its real
   https return URL instead)
5. Copy the three values it gives you. Do NOT send them in chat, email, or
   any screenshot:
   - Merchant ID
   - Password
   - Integrity Salt

## 2. Easypaisa sandbox account

Easypaisa's merchant product is called Easypay. Its API documentation is
only issued with a merchant account, so there is no public self-serve page
to copy field names from here.
1. Apply for Easypay merchant services through the Easypaisa business
   portal, or ask your Easypaisa merchant representative for a sandbox account.
2. When approved, you will receive: Store ID, Hash Key, Account Number,
   and Inquiry API username/password.
3. Keep those the same way as JazzCash: in backend/.env only, never in chat.

## 3. Put the keys on YOUR PC only

1. In the backend folder, copy backend/.env.example to backend/.env
   (Windows: copy .env.example .env)
2. Fill in ONLY the keys you actually received. Leave the others blank.
3. Restart the backend (Ctrl+C, then npm start). The backend reads .env
   at startup — editing .env without restarting does nothing.
4. Never commit backend/.env, never zip it, never paste it anywhere.
   backend/.env.example is safe to share — it has no real values in it.

## 4. What changes in the site, and what does NOT

- With NO keys: the Donate flow uses the Sandbox Simulator screen in our
  own app, clearly labelled "SIMULATOR, not the real gateway site".
  Pending -> confirm -> sandbox_paid -> Available increases.
  That flow is already built and tested.
- With JazzCash sandbox keys set: the backend can build a real hosted
  checkout form (payments.js: jazzcashCheckoutFields). Before demoing that
  path, verify the exact field list and hash order against the code the
  Sandbox Portal generates for YOUR merchant account — the portal is the
  authority, not this file. If the portal's code differs, use the portal's.
- With Easypaisa sandbox keys set: the same principle applies — use the
  field list from YOUR Easypay documentation, do not invent it.
- The JazzCash return URL in server.js REFUSES to mark a payment paid
  when no keys are configured, instead of faking a success.
- Meal price: MEAL_PRICE_PKR in .env, default Rs 250 per meal.
  Donate total = quantity x meal price. Restaurants have no per-restaurant
  price yet — that is a future step, not a hidden setting.

## 5. For the contest demo — say this honestly

"Sandbox working: the donor goes through a JazzCash/Easypaisa sandbox
checkout, the callback is verified, and only then do meals become
Available. No real money moves in the pilot. Live merchant approval is
the next step after the contest."

Do NOT say "live JazzCash/Easypaisa payments work" until a live merchant
account is approved and a small real transaction has been tested.
