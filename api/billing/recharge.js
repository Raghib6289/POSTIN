import { verifyToken } from "../../lib/auth.js";
import { addCreditsToUser, findUserById } from "../../lib/db.js";

// Token recharge packages in INR (₹)
const PACKAGES = {
  starter: { tokens: 50, priceInr: 99, name: "Starter Pack" },
  growth: { tokens: 150, priceInr: 249, name: "Growth Pack" },
  pro: { tokens: 500, priceInr: 599, name: "Pro Business Pack" }
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // 1. GET /api/billing/recharge -> Get packages list
  if (req.method === "GET") {
    return res.json({ packages: PACKAGES });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // 2. POST /api/billing/recharge -> Purchase token package
  try {
    const userAuth = verifyToken(req);
    if (!userAuth) {
      return res.status(401).json({ error: "Unauthorized. Please log in to recharge tokens." });
    }

    const { packageKey } = req.body || {};
    const pkg = PACKAGES[packageKey];
    if (!pkg) {
      return res.status(400).json({ error: "Invalid token recharge package selected" });
    }

    const tierMap = {
      starter: 'STARTER PRO',
      growth: 'GROWTH PRO',
      pro: 'BUSINESS PRO'
    };
    const tierName = tierMap[packageKey] || 'PRO TIER';

    // Top-up credits & update tier status in Neon DB
    const updatedUser = await addCreditsToUser(userAuth.id, pkg.tokens, tierName);
    if (!updatedUser) {
      return res.status(500).json({ error: "Failed to apply token recharge and tier upgrade to account" });
    }

    console.log(`💳 User ${updatedUser.email} recharged ${pkg.tokens} tokens for ₹${pkg.priceInr}`);

    return res.json({
      success: true,
      message: `Successfully recharged ${pkg.tokens} Tokens for ₹${pkg.priceInr}!`,
      package: pkg,
      user: updatedUser
    });
  } catch (error) {
    console.error("Recharge API Error:", error);
    return res.status(500).json({ error: error.message || "Failed to process token recharge" });
  }
}
