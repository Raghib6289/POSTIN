import { verifyToken } from "../../lib/auth.js";

const PACKAGES = {
  starter: { tokens: 50, priceInr: 99, name: "Starter Pack" },
  growth: { tokens: 150, priceInr: 249, name: "Growth Pack" },
  pro: { tokens: 500, priceInr: 599, name: "Pro Business Pack" }
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const userAuth = verifyToken(req);
    if (!userAuth) {
      return res.status(401).json({ error: "Unauthorized. Please log in." });
    }

    const { packageKey } = req.body || {};
    const pkg = PACKAGES[packageKey];
    if (!pkg) {
      return res.status(400).json({ error: "Invalid token recharge package selected" });
    }

    const amountInPaise = pkg.priceInr * 100;
    if (amountInPaise < 100) {
      return res.status(400).json({ error: "Amount must be at least 100 paise (1 INR)" });
    }

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID || "";
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || "";

    let orderId = "order_sim_" + Date.now();
    let isTestMode = true;

    // If Razorpay live/test credentials exist in .env, call Razorpay Orders API
    if (razorpayKeyId && razorpayKeySecret) {
      try {
        const authHeader = "Basic " + Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString("base64");
        const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
          method: "POST",
          headers: {
            "Authorization": authHeader,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            amount: amountInPaise,
            currency: "INR",
            receipt: `rcpt_${userAuth.id.slice(0, 8)}_${Date.now()}`,
            notes: {
              userId: userAuth.id,
              packageKey,
              tokens: pkg.tokens
            }
          })
        });

        const rzpData = await rzpRes.json();
        if (rzpRes.ok && rzpData.id) {
          orderId = rzpData.id;
          isTestMode = false;
        } else {
          const errorMsg = rzpData.error ? rzpData.error.description : "Unknown Razorpay error";
          return res.status(500).json({ error: `Razorpay API error: ${errorMsg}` });
        }
      } catch (e) {
        return res.status(500).json({ error: `Razorpay connection failed: ${e.message}` });
      }
    }

    return res.json({
      success: true,
      orderId,
      amount: amountInPaise,
      currency: "INR",
      keyId: razorpayKeyId || "rzp_test_simulation",
      package: pkg,
      isTestMode
    });
  } catch (error) {
    console.error("Create Razorpay Order Error:", error);
    return res.status(500).json({ error: error.message || "Failed to create order" });
  }
}
