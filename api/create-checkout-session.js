const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const CURRENCY = "usd";
const PRODUCTS = {
  "jl2026":     { name: "Babolat Viper Juan Lebrón 3.0 FW",    amount: 16000, colors: ["Blue / Green", "Orange / Black"] },
  "at10-18k":   { name: "NOX AT10 Genius 18K Alu",             amount: 16000, colors: ["Black / Gold"] },
  "at10-12k":   { name: "NOX AT10 Genius 12K XTREM",           amount: 16000, colors: ["White / Gold"] },
  "jl2024":     { name: "Babolat Technical Viper Juan Lebrón", amount: 16000, colors: ["Turquoise", "Prism Red"] },
  "technical":  { name: "Babolat Technical Viper 3.0",         amount: 16000, colors: ["Black / Red"] },
  "air":        { name: "Babolat Air Viper",                   amount: 16000, colors: ["Blue / Silver"] },
  "counter":    { name: "Babolat Counter Viper 2.6",           amount: 16000, colors: ["Black / Teal"] },
  "silhouette": { name: "NOX Silhouette",                      amount: 7500,  colors: ["Pink / Black"] },
  "xone":       { name: "NOX X-One",                           amount: 7500,  colors: ["Black / Gray", "Orange / Blue"] }
};
const SHIP_TO = ["CZ","SK","DE","AT","PL","HU","FR","ES","IT","NL","BE","SE","DK","FI","IE","PT","GB","US"];

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.setHeader("Allow","POST"); return res.status(405).json({ error: "Method not allowed" }); }
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length) return res.status(400).json({ error: "Your cart is empty" });
    const line_items = items.map((it) => {
      const p = PRODUCTS[it.id];
      if (!p) throw new Error("Unknown product: " + it.id);
      const qty = Math.max(1, Math.min(10, parseInt(it.qty, 10) || 1));
      const color = (p.colors && p.colors[it.color] != null) ? p.colors[it.color] : null;
      return { quantity: qty, price_data: { currency: CURRENCY, unit_amount: p.amount, product_data: { name: p.name + (color ? " — " + color : "") } } };
    });
    const origin = (req.headers["x-forwarded-proto"] || "https") + "://" + req.headers.host;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      shipping_address_collection: { allowed_countries: SHIP_TO },
      shipping_options: [{ shipping_rate_data: { type: "fixed_amount", fixed_amount: { amount: 900, currency: CURRENCY }, display_name: "Standard shipping", delivery_estimate: { minimum: { unit: "business_day", value: 5 }, maximum: { unit: "business_day", value: 14 } } } }],
      phone_number_collection: { enabled: true },
      allow_promotion_codes: true,
      success_url: origin + "/?success=1",
      cancel_url: origin + "/?canceled=1"
    });
    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("checkout error:", err);
    return res.status(500).json({ error: err.message || "Checkout failed" });
  }
};
