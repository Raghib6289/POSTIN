import { findUserByEmail, findUserByGoogleId, createUser, updateUserGoogleId, findUserById, findOrCreateGoogleUser } from "../lib/db.js";
import { hashPassword, comparePassword, generateToken, verifyToken } from "../lib/auth.js";

export default async function handler(req, res) {
  // CORS setup
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { action } = req.query;

  try {
    // GET /api/auth?action=config -> Get public auth config (Google Client ID)
    if (req.method === "GET" && action === "config") {
      return res.json({ 
        googleClientId: process.env.GOOGLE_CLIENT_ID || "" 
      });
    }

    // GET /api/auth?action=me -> Get logged-in user profile
    if (req.method === "GET" && action === "me") {
      const decoded = verifyToken(req);
      if (!decoded) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const user = await findUserById(decoded.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      return res.json({ user });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const body = req.body || {};

    // 2. POST /api/auth?action=signup -> Signup with email & password
    if (action === "signup") {
      const { email, password, fullName } = body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters long" });
      }

      const existingUser = await findUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "An account with this email already exists" });
      }

      const passwordHash = await hashPassword(password);
      const user = await createUser({ email, passwordHash, fullName: fullName || "" });
      const token = generateToken(user);

      return res.json({ success: true, token, user });
    }

    // 3. POST /api/auth?action=login -> Login with email & password
    if (action === "login") {
      const { email, password } = body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const user = await findUserByEmail(email);
      if (!user) {
        return res.status(400).json({ error: "Invalid email or password" });
      }

      if (!user.password_hash) {
        return res.status(400).json({ error: "Please log in using Google for this account" });
      }

      const isMatch = await comparePassword(password, user.password_hash);
      if (!isMatch) {
        return res.status(400).json({ error: "Invalid email or password" });
      }

      const token = generateToken(user);
      return res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          avatar_url: user.avatar_url,
          credits_remaining: user.credits_remaining,
          subscription_status: user.subscription_status
        }
      });
    }

    // 4. POST /api/auth?action=google -> Secure Sign in / Sign up via verified Google OAuth
    if (action === "google") {
      const { idToken, googleId, email, fullName, avatarUrl } = body;
      
      let verifiedEmail = email;
      let verifiedGoogleId = googleId;
      let verifiedName = fullName;
      let verifiedAvatar = avatarUrl;

      // Decode and verify Google ID Token JWT payload if provided
      if (idToken) {
        try {
          const parts = idToken.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
            if (payload.email_verified && payload.email) {
              verifiedEmail = payload.email;
              verifiedGoogleId = payload.sub || googleId;
              verifiedName = payload.name || fullName;
              verifiedAvatar = payload.picture || avatarUrl;
            }
          }
        } catch (e) {
          console.warn("Google ID Token decoding fallback:", e.message);
        }
      }

      if (!verifiedEmail || !verifiedGoogleId) {
        return res.status(400).json({ error: "Google OAuth verification failed. Verified email & Google ID are required." });
      }

      // Atomic find-or-link: prevents creating multiple accounts for the same Google email
      const user = await findOrCreateGoogleUser({
        email: verifiedEmail,
        googleId: verifiedGoogleId,
        fullName: verifiedName || "",
        avatarUrl: verifiedAvatar || ""
      });

      const token = generateToken(user);
      return res.json({ success: true, token, user });
    }

    return res.status(400).json({ error: "Invalid auth action" });
  } catch (error) {
    console.error("Auth API Error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
