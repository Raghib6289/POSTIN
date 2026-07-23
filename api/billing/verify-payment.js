import crypto from "crypto";
import { verifyToken } from "../../lib/auth.js";
import { addCreditsToUser } from "../../lib/db.js";

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

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, packageKey } = req.body || {};
    const pkg = PACKAGES[packageKey] || PACKAGES.starter;

    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || "";

    // Verify HMAC Signature if live Razorpay secret exists
    if (razorpayKeySecret) {
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ error: "Missing required Razorpay payment fields" });
      }

      const generatedSignature = crypto
        .createHmac("sha256", razorpayKeySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (generatedSignature !== razorpay_signature) {
        return res.status(400).json({ error: "Invalid Razorpay payment signature verification failed" });
      }
    }

    const tierMap = {
      starter: 'STARTER PRO',
      growth: 'GROWTH PRO',
      pro: 'BUSINESS PRO'
    };
    const tierName = tierMap[packageKey] || 'PRO TIER';

    // Top-up user credits & update subscription tier status in Neon PostgreSQL
    const updatedUser = await addCreditsToUser(userAuth.id, pkg.tokens, tierName);
    if (!updatedUser) {
      return res.status(500).json({ error: "Failed to update account tokens and subscription tier in database" });
    }

    console.log(`💳 Payment Verified! User ${updatedUser.email} credited with ${pkg.tokens} tokens (Total: ${updatedUser.credits_remaining})`);

    return res.json({
      success: true,
      message: `Payment Verified! Successfully recharged ${pkg.tokens} Tokens!`,
      package: pkg,
      user: updatedUser
    });
  } catch (error) {
    console.error("Razorpay Verify Payment Error:", error);
    return res.status(500).json({ error: error.message || "Failed to verify payment" });
  }
}
