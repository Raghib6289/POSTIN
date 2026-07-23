import { verifyToken } from "../lib/auth.js";
import { getUserPostsFromDb, savePostToDb } from "../lib/db.js";
import historyDeleteHandler from "./history-delete.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const userAuth = verifyToken(req);

  // 1. GET /api/history -> Fetch drafts
  if (req.method === "GET") {
    if (!userAuth) {
      return res.status(401).json({ error: "Unauthorized. Please log in." });
    }
    try {
      const posts = await getUserPostsFromDb(userAuth.id);
      return res.json(posts);
    } catch (error) {
      console.error("Fetch history error:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  // 2. POST /api/history -> Manually save a draft
  if (req.method === "POST") {
    if (!userAuth) {
      return res.status(401).json({ error: "Unauthorized. Please log in." });
    }
    try {
      const draftData = req.body;
      const savedPost = await savePostToDb(userAuth.id, draftData);
      return res.json({ success: true, draft: savedPost });
    } catch (error) {
      console.error("Save draft error:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  // 3. DELETE /api/history -> Delete a draft
  if (req.method === "DELETE") {
    return historyDeleteHandler(req, res);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
