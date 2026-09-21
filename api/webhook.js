const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
module.exports.config = { api: { bodyParser: false } };

function readRaw(req){return new Promise((res,rej)=>{let d="";req.on("data",c=>d+=c);req.on("end",()=>res(Buffer.from(d)));req.on("error",rej);});}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");
  let event;
  try {
    const raw = await readRaw(req);
    event = stripe.webhooks.constructEvent(raw, req.headers["stripe-signature"], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) { return res.status(400).send("Webhook Error: " + err.message); }
  if (event.type === "checkout.session.completed") {
    const s = event.data.object;
    console.log("PAID", s.id, s.amount_total, s.customer_details && s.customer_details.email);
    // TODO: sem přijde odeslání e-mailu / uložení objednávky
  }
  return res.status(200).json({ received: true });
};
