// Stand-in Paystack for local store QA (never deployed). Implements the three
// calls the store makes — initialize, a checkout page, verify — and can send
// the signed charge.success webhook.
//   node scripts/qa/mock-paystack.mjs   (port 8099; PAYSTACK_SECRET_KEY must
//   match the dev server's, default sk_test_outpost_qa_local)
import { createServer } from "node:http";
import { createHmac } from "node:crypto";
const SECRET = process.env.PAYSTACK_SECRET_KEY || "sk_test_outpost_qa_local";
const SITE = process.env.SITE || "http://127.0.0.1:8080";
const tx = new Map();
const plans = new Map();
const json = (res, status, body) => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
};
const charge = (t, overrides = {}) => ({
  status: t.paid ? "success" : "abandoned",
  reference: t.reference,
  amount: t.amount,
  currency: t.currency,
  paid_at: t.paid ? new Date().toISOString() : null,
  metadata: t.metadata,
  customer: { email: t.email, customer_code: "CUS_qa" },
  ...overrides,
});
async function webhook(t, overrides) {
  const payload = JSON.stringify({ event: "charge.success", data: charge(t, overrides) });
  const signature = createHmac("sha512", SECRET).update(payload).digest("hex");
  const r = await fetch(`${SITE}/api/paystack/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-paystack-signature": signature },
    body: payload,
  });
  return r.status;
}
createServer(async (req, res) => {
  const url = new URL(req.url, "http://127.0.0.1:8099");
  let body = "";
  for await (const chunk of req) body += chunk;
  if (req.method === "POST" && url.pathname === "/transaction/initialize") {
    if (req.headers.authorization !== `Bearer ${SECRET}`) return json(res, 401, { status: false, message: "Bad key" });
    const b = JSON.parse(body);
    tx.set(b.reference, { ...b, paid: false });
    return json(res, 200, { status: true, data: { authorization_url: `http://127.0.0.1:8099/pay/${b.reference}` } });
  }
  // Midnry Pass checkout (src/lib/paystack.server.ts) creates or reads its plan.
  if (url.pathname === "/plan" || url.pathname.startsWith("/plan/")) {
    if (req.headers.authorization !== `Bearer ${SECRET}`) return json(res, 401, { status: false, message: "Bad key" });
    if (req.method === "POST") {
      const b = JSON.parse(body);
      plans.set("PLN_qa", { ...b, plan_code: "PLN_qa" });
      return json(res, 200, { status: true, data: plans.get("PLN_qa") });
    }
    const plan = plans.get(decodeURIComponent(url.pathname.split("/").pop()));
    return plan ? json(res, 200, { status: true, data: plan }) : json(res, 404, { status: false, message: "Plan not found" });
  }
  if (req.method === "GET" && url.pathname.startsWith("/transaction/verify/")) {
    const t = tx.get(decodeURIComponent(url.pathname.split("/").pop()));
    if (!t) return json(res, 404, { status: false, message: "Transaction reference not found" });
    return json(res, 200, { status: true, data: charge(t) });
  }
  if (req.method === "GET" && url.pathname.startsWith("/pay/")) {
    const t = tx.get(url.pathname.split("/").pop());
    if (!t) return json(res, 404, {});
    res.writeHead(200, { "content-type": "text/html" });
    return res.end(`<!doctype html><title>Mock Paystack</title><h1>Pay ₦${t.amount / 100}</h1><form method="post" action="/pay/${t.reference}"><button>Pay</button></form>`);
  }
  if (req.method === "POST" && url.pathname.startsWith("/pay/")) {
    const t = tx.get(url.pathname.split("/").pop());
    t.paid = true;
    res.writeHead(302, { location: `${t.callback_url}${t.callback_url.includes("?") ? "&" : "?"}trxref=${t.reference}&reference=${t.reference}` });
    return res.end();
  }
  // Test controls: pay without the redirect, and send (optionally tampered) webhooks.
  if (req.method === "POST" && url.pathname === "/qa/pay") {
    const { reference, webhook: send, overrides } = JSON.parse(body);
    const t = tx.get(reference);
    if (!t) return json(res, 404, {});
    t.paid = true;
    return json(res, 200, { webhook: send ? await webhook(t, overrides) : null });
  }
  if (req.method === "GET" && url.pathname === "/qa/last") return json(res, 200, [...tx.values()].pop() || null);
  json(res, 404, { status: false, message: "Not mocked" });
}).listen(8099, "127.0.0.1", () => console.log("mock paystack on 8099"));
