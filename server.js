import express from "express";
import multer from "multer";
import path from "path";
import "dotenv/config";

// Import API routes & Vercel serverless handlers
import authHandler from "./api/auth.js";
import generateHandler from "./api/generate.js";
import historyHandler from "./api/history.js";
import historyDeleteHandler from "./api/history-delete.js";
import rechargeHandler from "./api/billing/recharge.js";
import createOrderHandler from "./api/billing/create-order.js";
import verifyPaymentHandler from "./api/billing/verify-payment.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.static("public"));

// Configure multer memory storage (no disk writing, Vercel compatible)
const upload = multer({ storage: multer.memoryStorage() });

// --- Express local route wrappers ---

// 1. Auth API
app.all("/api/auth", (req, res) => authHandler(req, res));

// 2. Multimodal Post Generation API
app.post("/api/generate", upload.array("images", 3), async (req, res) => {
  // Convert uploaded buffer files to base64 inline parts format expected by agent graph
  if (req.files && req.files.length > 0) {
    req.body.imageParts = req.files.map(file => ({
      data: file.buffer.toString("base64"),
      mimeType: file.mimetype
    }));
  }
  return generateHandler(req, res);
});

// 3. Draft History Library API
app.all("/api/history", (req, res) => historyHandler(req, res));
app.all("/api/history/:id", (req, res) => {
  if (req.params && req.params.id) {
    req.query.id = req.params.id;
  }
  return historyHandler(req, res);
});

// 4. Token Recharge Billing API
app.all("/api/billing/recharge", (req, res) => rechargeHandler(req, res));
app.all("/api/billing/create-order", (req, res) => createOrderHandler(req, res));
app.all("/api/billing/verify-payment", (req, res) => verifyPaymentHandler(req, res));

// Start Express local development server
app.listen(PORT, () => {
  console.log(`🚀 Instagram Caption SaaS Agent running at http://localhost:${PORT}`);
  console.log(`🐘 Database: ${process.env.DATABASE_URL ? "Neon PostgreSQL Connected" : "DATABASE_URL missing in .env"}`);
});

export default app;
