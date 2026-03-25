export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
  if (!STRIPE_SECRET) return res.status(500).json({ error: 'Stripe not configured' });

  try {
    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body);
    const { priceId, email } = body;
    if (!priceId) return res.status(400).json({ error: 'Missing priceId' });

    const origin = req.headers.origin || 'https://cvio-ten.vercel.app';
    const params = new URLSearchParams();
    params.append('mode', 'subscription');
    params.append('line_items[0][price]', priceId);
    params.append('line_items[0][quantity]', '1');
    params.append('success_url', origin + '/?payment=success&session_id={CHECKOUT_SESSION_ID}');
    params.append('cancel_url', origin + '/?payment=cancelled');
    params.append('allow_promotion_codes', 'true');
    if (email) params.append('customer_email', email);

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + STRIPE_SECRET,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });

    const session = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: session.error?.message || 'Stripe error' });
    return res.status(200).json({ url: session.url });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
