import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import "dotenv/config";

const JWT_SECRET = process.env.JWT_SECRET || "antigravity-saas-secret-key-change-in-prod";

// Hash password using bcrypt
export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// Compare password with hash
export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// Create JWT access token (valid for 30 days)
export function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email,
      fullName: user.full_name || ""
    }, 
    JWT_SECRET, 
    { expiresIn: "30d" }
  );
}

// Verify JWT token from request Authorization header
export function verifyToken(req) {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    return null;
  }
}
