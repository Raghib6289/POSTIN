import { GoogleGenerativeAI } from "@google/generative-ai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StateGraph } from "@langchain/langgraph";
import "dotenv/config";

const MODEL_NAME = "gemini-3.1-flash-lite";

// Lazy initialize LLMs inside execution functions
function getModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in environment variables.");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const nativeModel = genAI.getGenerativeModel({ model: MODEL_NAME });
  const langchainModel = new ChatGoogleGenerativeAI({
    model: MODEL_NAME,
    apiKey,
    maxRetries: 1,
  });
  return { nativeModel, langchainModel, apiKey };
}

// Clean JSON response from code fences
function cleanJsonString(raw) {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  return cleaned.trim();
}

// State channels
const channels = {
  imageParts: { value: (x, y) => y ?? x, default: () => [] },
  fallbackTopic: { value: (x, y) => y ?? x, default: () => "" },
  topic: { value: (x, y) => y ?? x, default: () => "" },
  tone: { value: (x, y) => y ?? x, default: () => "casual" },
  captions: { value: (x, y) => y ?? x, default: () => [] },
  hashtags: { value: (x, y) => y ?? x, default: () => ({}) },
  visualPrompt: { value: (x, y) => y ?? x, default: () => "" },
  altText: { value: (x, y) => y ?? x, default: () => "" },
  audienceSchedule: { value: (x, y) => y ?? x, default: () => ({ targetAudience: "", bestTime: "", postType: "" }) },
  qaFeedback: { value: (x, y) => y ?? x, default: () => ({ score: 0, tips: "" }) },
};

// Node 0: Alt Text Agent
async function altTextNode(state) {
  if (!state.imageParts || state.imageParts.length === 0) {
    return { altText: "No image uploaded." };
  }
  const prompt = "Write a clear, detailed, and SEO-friendly alt-text description for these images. Focus strictly on visual elements, colors, and layout. Avoid subjective interpretations, keep it under 3 concise sentences.";
  try {
    const { nativeModel } = getModels();
    const parts = [
      prompt,
      ...state.imageParts.map(img => ({ inlineData: { data: img.data, mimeType: img.mimeType } }))
    ];
    const response = await nativeModel.generateContent(parts);
    return { altText: response.response.text().trim() };
  } catch (err) {
    console.warn("⚠️ Alt Text node fallback active:", err.message || err);
    return { altText: state.fallbackTopic ? `Creative visual image for ${state.fallbackTopic}` : "High quality uploaded photo" };
  }
}

// Node 1: Image Analyst Agent
async function imageAnalystNode(state) {
  if (!state.imageParts || state.imageParts.length === 0) {
    return { topic: state.fallbackTopic || "Creative inspiration post" };
  }
  const prompt = "Describe the subject, visual details, color palette, mood, and key elements in these images in 2 concise sentences. This will serve as the topic for social media copy generation.";
  try {
    const { nativeModel } = getModels();
    const parts = [
      prompt,
      ...state.imageParts.map(img => ({ inlineData: { data: img.data, mimeType: img.mimeType } }))
    ];
    const response = await nativeModel.generateContent(parts);
    const desc = response.response.text().trim();
    return { topic: desc || state.fallbackTopic || "Uploaded image visual post" };
  } catch (err) {
    console.warn("⚠️ Image analyst fallback active:", err.message || err);
    return { topic: state.fallbackTopic || "Uploaded photo post" };
  }
}

// Node 2: Caption Writer Agent
async function captionWriterNode(state) {
  try {
    const { apiKey } = getModels();
    const prompt = `
      You are an expert Instagram Copywriter Agent.
      Generate exactly 3 different caption options for a post about: "${state.topic}".
      The tone must be: "${state.tone}".
      
      Format the 3 captions in a JSON list containing objects with "style" and "text" fields:
      - "Hook-Based": Start with an engaging question or hook.
      - "Narrative/Emotive": Write a brief story or emotional connection.
      - "Short & Punchy": Keep it under 2 lines, using emojis.
      
      Return ONLY a JSON array of this structure:
      [
        { "style": "Hook-Based", "text": "..." },
        { "style": "Narrative/Emotive", "text": "..." },
        { "style": "Short & Punchy", "text": "..." }
      ]
    `;
    const jsonModel = new ChatGoogleGenerativeAI({ model: MODEL_NAME, apiKey, responseMimeType: "application/json", maxRetries: 1 });
    const response = await jsonModel.invoke(prompt);
    const captions = JSON.parse(cleanJsonString(response.content));
    return { captions };
  } catch (err) {
    console.warn("⚠️ Caption Writer fallback active:", err.message || err);
    return {
      captions: [
        { style: "Hook-Based", text: `Ever wondered about ${state.topic}? Here is what you need to know! ✨` },
        { style: "Narrative/Emotive", text: `Behind every moment lies a story: ${state.topic}. Grateful to share this journey with you all.` },
        { style: "Short & Punchy", text: `Vibes check: ${state.topic}! 🚀🔥` }
      ]
    };
  }
}

// Node 3: Hashtag Strategist Agent
async function hashtagStrategistNode(state) {
  try {
    const { apiKey } = getModels();
    const prompt = `
      You are an expert Social Media SEO and Hashtag Strategist Agent.
      Based on the topic "${state.topic}", recommend 15 hashtags.
      Return ONLY a JSON object:
      { "broad": ["#tag1", ...], "niche": ["#tag6", ...], "custom": ["#tag11", ...] }
    `;
    const jsonModel = new ChatGoogleGenerativeAI({ model: MODEL_NAME, apiKey, responseMimeType: "application/json", maxRetries: 1 });
    const response = await jsonModel.invoke(prompt);
    const hashtags = JSON.parse(cleanJsonString(response.content));
    return { hashtags };
  } catch (err) {
    console.warn("⚠️ Hashtag Strategist fallback active:", err.message || err);
    const topicTag = '#' + (state.topic || 'post').toLowerCase().replace(/[^a-z0-0]/g, '');
    return {
      hashtags: {
        broad: ["#instagram", "#trending", "#viral", "#content", "#lifestyle"],
        niche: ["#socialmediatip", "#contentcreator", "#growthmindset", "#dailyinspiration", "#poststrategy"],
        custom: [topicTag, topicTag + "Vibes", topicTag + "Daily", topicTag + "Life", topicTag + "Official"]
      }
    };
  }
}

// Node 4: Visual Planner Agent
async function visualPlannerNode(state) {
  try {
    const { langchainModel } = getModels();
    const prompt = `
      You are an expert Creative Director and Visual Planner Agent.
      For a post about "${state.topic}", suggest a visual prompt scene description (3-4 sentences) outlining the aesthetic concept.
    `;
    const response = await langchainModel.invoke(prompt);
    return { visualPrompt: response.content };
  } catch (err) {
    console.warn("⚠️ Visual Planner fallback active:", err.message || err);
    return { visualPrompt: `A minimalist and editorial aesthetic scene centered around ${state.topic}, utilizing natural warm ambient lighting and a balanced grid composition.` };
  }
}

// Node 4b: Schedule Planner Agent
async function schedulePlannerNode(state) {
  try {
    const { apiKey } = getModels();
    const prompt = `
      You are an expert Social Media Strategy and Posting Scheduler Agent.
      Based on topic: "${state.topic}" and tone: "${state.tone}", recommend targetAudience, bestTime, and postType.
      Return ONLY a JSON object: { "targetAudience": "...", "bestTime": "...", "postType": "..." }
    `;
    const jsonModel = new ChatGoogleGenerativeAI({ model: MODEL_NAME, apiKey, responseMimeType: "application/json", maxRetries: 1 });
    const response = await jsonModel.invoke(prompt);
    const audienceSchedule = JSON.parse(cleanJsonString(response.content));
    return { audienceSchedule };
  } catch (err) {
    console.warn("⚠️ Schedule Planner fallback active:", err.message || err);
    return { audienceSchedule: { targetAudience: "General social media audience", bestTime: "Weekdays, 12:00 PM - 3:00 PM", postType: "Single Feed Photo / Carousel" } };
  }
}

// Node 5: QA Verifier Agent
async function qaVerifierNode(state) {
  try {
    const { apiKey } = getModels();
    const prompt = `
      You are a Social Media QA Verifier Agent. Review: Topic: "${state.topic}".
      Return a JSON object: { "score": number 1-10, "tips": "Bulleted checklist recommending 2 key tips" }
    `;
    const jsonModel = new ChatGoogleGenerativeAI({ model: MODEL_NAME, apiKey, responseMimeType: "application/json", maxRetries: 1 });
    const response = await jsonModel.invoke(prompt);
    const qaFeedback = JSON.parse(cleanJsonString(response.content));
    return { qaFeedback };
  } catch (err) {
    console.warn("⚠️ QA Verifier fallback active:", err.message || err);
    return {
      qaFeedback: {
        score: 9,
        tips: "• Ensure high-contrast visual imagery to maximize scroll-stopping engagement.\n• Include a clear call-to-action in your first 2 lines."
      }
    };
  }
}

// Build Graph with Parallel Agent Execution Architecture
const workflow = new StateGraph({ channels })
  .addNode("analyst", imageAnalystNode)
  .addNode("altTextAgent", altTextNode)
  .addNode("writer", captionWriterNode)
  .addNode("strategist", hashtagStrategistNode)
  .addNode("planner", visualPlannerNode)
  .addNode("schedulePlanner", schedulePlannerNode)
  .addNode("verifier", qaVerifierNode)
  .addEdge("__start__", "analyst")
  // Parallel Fan-out after Analyst finishes
  .addEdge("analyst", "altTextAgent")
  .addEdge("analyst", "writer")
  .addEdge("analyst", "planner")
  .addEdge("analyst", "schedulePlanner")
  // Fan-out after Writer finishes
  .addEdge("writer", "strategist")
  .addEdge("writer", "verifier")
  // Fan-in to end
  .addEdge("altTextAgent", "__end__")
  .addEdge("strategist", "__end__")
  .addEdge("planner", "__end__")
  .addEdge("schedulePlanner", "__end__")
  .addEdge("verifier", "__end__");

export const appGraph = workflow.compile();
