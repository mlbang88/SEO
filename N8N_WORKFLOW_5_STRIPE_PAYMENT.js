/**
 * ============================================================
 * WORKFLOW 5 — CREATE STRIPE PAYMENT INTENT
 * ============================================================
 * Webhook: /webhook/create-payment-intent
 * Appelé par le front pour créer un PaymentIntent Stripe
 */

const inputJson = $input.first().json;
const body = (inputJson.body !== undefined && typeof inputJson.body === 'object') ? inputJson.body : inputJson;

const amount   = body.amount;   // en centimes (ex: 1500 = $15)
const currency = body.currency || 'usd';
const email    = body.email;

const STRIPE_SECRET_KEY = $env.STRIPE_SECRET_KEY;

if (!amount) throw new Error('amount is required');

const response = await this.helpers.httpRequest({
  method: 'POST',
  url: 'https://api.stripe.com/v1/payment_intents',
  headers: {
    'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: `amount=${amount}&currency=${currency}&receipt_email=${encodeURIComponent(email || '')}&automatic_payment_methods[enabled]=true`,
});

return [{ json: { clientSecret: response.client_secret } }];
