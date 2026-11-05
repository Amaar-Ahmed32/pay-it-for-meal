// payments.js — Sandbox payments (Step: Sandbox account).
// Two layers, kept honest and separate:
//  1. SANDBOX SIMULATOR (built + working now): Donate creates a PENDING donation
//     with a txn_ref. The donor "pays" on a clearly-labelled Sandbox Checkout
//     screen in our own app. Confirming there marks it sandbox_paid and only
//     THEN adds the meals to Available. No real money moves, and the screen
//     must never claim to be JazzCash's or Easypaisa's real site.
//  2. REAL GATEWAY (ready to plug in, NOT yet wired to live money): if the
//     merchant sandbox keys are present in backend/.env, jazzcashCheckoutFields()
//     builds the standard JazzCash hosted-checkout fields, signed with
//     HMAC-SHA256 over the integrity salt. BEFORE demoing that path, verify
//     the exact field list + hash order against the code the JazzCash Sandbox
//     Portal generates for your own merchant account — the portal is the
//     authority, not this file. Easypaisa Easypay docs are only issued with a
//     merchant account, so its real fields are NOT invented here.
// NEVER store a wallet PIN, OTP, or personal wallet password anywhere in this
// project. Merchant keys live only in backend/.env on the owner's PC.

const crypto = require('crypto');

const MEAL_PRICE_PKR = parseInt(process.env.MEAL_PRICE_PKR || '250', 10);

function createTxnRef() {
  return 'PIFM-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();
}

// JazzCash hosted-checkout hash helper (for the real-gateway path only).
// Standard shape: HMAC-SHA256, hex, uppercase, over the integrity salt +
// the field values in sorted field-name order, joined with '&'.
// Verify against your Sandbox Portal's generated code before relying on it.
function jazzcashSecureHash(fields, integritySalt) {
  const keys = Object.keys(fields).filter((k) => k !== 'pp_SecureHash').sort();
  const data = [integritySalt, ...keys.map((k) => fields[k])].join('&');
  return crypto.createHmac('sha256', integritySalt).update(data).digest('hex').toUpperCase();
}

function jazzcashCheckoutFields({ merchantId, password, returnUrl, txnRef, amountPkr, txnDateTime }) {
  const fields = {
    pp_Version: '1.1',
    pp_TxnType: 'MWALLET',
    pp_Language: 'EN',
    pp_MerchantID: merchantId,
    pp_Password: password,
    pp_TxnRefNo: txnRef,
    pp_Amount: String(amountPkr * 100), // JazzCash expects paisa
    pp_TxnCurrency: 'PKR',
    pp_TxnDateTime: txnDateTime,
    pp_TxnExpiryDateTime: txnDateTime, // portal generates an expiry; keep in sync there
    pp_ReturnURL: returnUrl,
    pp_BillReference: txnRef,
    pp_Description: 'Pay It Forward Meal donation',
  };
  const salt = process.env.JAZZCASH_INTEGRITY_SALT || '';
  if (salt) fields.pp_SecureHash = jazzcashSecureHash(fields, salt);
  return fields;
}

function hasJazzcashSandboxKeys() {
  return Boolean(process.env.JAZZCASH_MERCHANT_ID && process.env.JAZZCASH_PASSWORD && process.env.JAZZCASH_INTEGRITY_SALT);
}
function hasEasypaisaSandboxKeys() {
  return Boolean(process.env.EASYPAISA_STORE_ID && process.env.EASYPAISA_HASH_KEY);
}

module.exports = { MEAL_PRICE_PKR, createTxnRef, jazzcashSecureHash, jazzcashCheckoutFields, hasJazzcashSandboxKeys, hasEasypaisaSandboxKeys };
