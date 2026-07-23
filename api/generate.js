import { appGraph } from "../lib/agentGraph.js";
import { verifyToken } from "../lib/auth.js";
import { deductUserCredit, savePostToDb, findUserById } from "../lib/db.js";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
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
    // 1. Verify user authentication
    const userAuth = verifyToken(req);
    let userId = null;

    if (userAuth) {
      userId = userAuth.id;
      // Check credits if user logged in & DB connected
      const user = await findUserById(userId);
      if (user && user.credits_remaining <= 0) {
        return res.status(402).json({ error: "Generation limit reached. Please upgrade your subscription for more credits." });
      }
    }

    const { topic, tone, imageParts } = req.body || {};

    console.log(`🚀 Running multimodal generator graph for tone: ${tone}`);

    // Parse inline image base64 parts
    const parsedImageParts = Array.isArray(imageParts) ? imageParts.map(img => ({
      data: img.data,
      mimeType: img.mimeType || "image/jpeg"
    })) : [];

    // Run graph workflow
    const result = await appGraph.invoke({
      imageParts: parsedImageParts,
      fallbackTopic: topic || "",
      tone: tone || "casual"
    });

    const responsePayload = {
      topic: result.topic,
      captions: result.captions,
      hashtags: result.hashtags,
      visualPrompt: result.visualPrompt,
      altText: result.altText,
      audienceSchedule: result.audienceSchedule,
      qaFeedback: result.qaFeedback,
      images: parsedImageParts.map(img => `data:${img.mimeType};base64,${img.data}`)
    };

    // Deduct credit & auto-save to Neon DB if user is authenticated
    responsePayload.id = "draft_" + Date.now();
    responsePayload.isSaved = false;
    if (userId) {
      await deductUserCredit(userId);
      const savedPost = await savePostToDb(userId, responsePayload);
      if (savedPost && savedPost.id) {
        responsePayload.id = savedPost.id;
        responsePayload.isSaved = true;
      }
    }

    return res.json(responsePayload);
  } catch (error) {
    console.error("Agent workflow error:", error);
    return res.status(500).json({ error: error.message || "Failed to generate post assets" });
  }
}
