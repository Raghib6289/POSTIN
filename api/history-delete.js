import { verifyToken } from "../lib/auth.js";
import { deleteUserPostFromDb } from "../lib/db.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "DELETE, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  let id = req.query.id || (req.params && req.params.id) || (req.body && req.body.id);
  if (!id && req.url) {
    const parts = req.url.split('?')[0].split('/');
    id = parts[parts.length - 1];
  }

  if (!id || id === "undefined" || id === "null") {
    return res.json({ success: true, message: "No ID provided" });
  }

  try {
    const userAuth = verifyToken(req);
    const userId = userAuth ? userAuth.id : null;
    await deleteUserPostFromDb(userId, id);
    return res.json({ success: true, deletedId: id });
  } catch (error) {
    console.error("Delete draft error:", error);
    return res.status(500).json({ error: error.message || "Failed to delete draft" });
  }
}
