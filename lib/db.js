import { neon } from "@neondatabase/serverless";
import "dotenv/config";

// Lazy connection initializer for Neon DB
export function getDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn("⚠️ DATABASE_URL not set in environment. Database calls will fail until set.");
    return null;
  }
  return neon(connectionString);
}

// User Queries
export async function findUserByEmail(email) {
  const sql = getDb();
  if (!sql) return null;
  const rows = await sql`SELECT * FROM users WHERE email = ${email.toLowerCase().trim()} LIMIT 1`;
  return rows[0] || null;
}

export async function findUserByGoogleId(googleId) {
  const sql = getDb();
  if (!sql) return null;
  const rows = await sql`SELECT * FROM users WHERE google_id = ${googleId} LIMIT 1`;
  return rows[0] || null;
}

export async function findUserById(id) {
  const sql = getDb();
  if (!sql) return null;
  const rows = await sql`SELECT id, email, full_name, avatar_url, subscription_status, credits_remaining, created_at FROM users WHERE id = ${id} LIMIT 1`;
  return rows[0] || null;
}

export async function createUser({ email, passwordHash = null, googleId = null, fullName = "", avatarUrl = "" }) {
  const sql = getDb();
  if (!sql) throw new Error("Database connection missing. Please set DATABASE_URL.");
  
  const rows = await sql`
    INSERT INTO users (email, password_hash, google_id, full_name, avatar_url, credits_remaining)
    VALUES (${email.toLowerCase().trim()}, ${passwordHash}, ${googleId}, ${fullName}, ${avatarUrl}, 10)
    ON CONFLICT (email) DO UPDATE
      SET 
        google_id = COALESCE(EXCLUDED.google_id, users.google_id),
        avatar_url = COALESCE(NULLIF(EXCLUDED.avatar_url, ''), users.avatar_url),
        updated_at = CURRENT_TIMESTAMP
    RETURNING id, email, full_name, avatar_url, subscription_status, credits_remaining, created_at
  `;
  return rows[0];
}

// Atomic find-or-upsert for Google OAuth to strictly prevent duplicate accounts
export async function findOrCreateGoogleUser({ email, googleId, fullName = "", avatarUrl = "" }) {
  const sql = getDb();
  if (!sql) throw new Error("Database connection missing.");

  const normalizedEmail = email.toLowerCase().trim();

  // Step 1: Try to find by google_id first
  const byGoogleId = await sql`SELECT id, email, full_name, avatar_url, subscription_status, credits_remaining FROM users WHERE google_id = ${googleId} LIMIT 1`;
  if (byGoogleId[0]) return byGoogleId[0];

  // Step 2: Try to find by email (same person, different auth method)
  const byEmail = await sql`SELECT id, email, full_name, avatar_url, subscription_status, credits_remaining FROM users WHERE email = ${normalizedEmail} LIMIT 1`;
  if (byEmail[0]) {
    // Link this Google ID to existing email account
    const updated = await sql`
      UPDATE users 
      SET google_id = ${googleId}, avatar_url = COALESCE(NULLIF(${avatarUrl}, ''), avatar_url), updated_at = CURRENT_TIMESTAMP
      WHERE id = ${byEmail[0].id}
      RETURNING id, email, full_name, avatar_url, subscription_status, credits_remaining
    `;
    return updated[0];
  }

  // Step 3: Truly new user — create with ON CONFLICT guard
  const rows = await sql`
    INSERT INTO users (email, google_id, full_name, avatar_url, credits_remaining)
    VALUES (${normalizedEmail}, ${googleId}, ${fullName}, ${avatarUrl}, 10)
    ON CONFLICT (email) DO UPDATE
      SET google_id = COALESCE(EXCLUDED.google_id, users.google_id),
          avatar_url = COALESCE(NULLIF(EXCLUDED.avatar_url, ''), users.avatar_url),
          updated_at = CURRENT_TIMESTAMP
    RETURNING id, email, full_name, avatar_url, subscription_status, credits_remaining, created_at
  `;
  return rows[0];
}

export async function updateUserGoogleId(userId, googleId, avatarUrl = "") {
  const sql = getDb();
  if (!sql) return null;
  const rows = await sql`
    UPDATE users 
    SET google_id = ${googleId}, avatar_url = COALESCE(NULLIF(${avatarUrl}, ''), avatar_url), updated_at = CURRENT_TIMESTAMP
    WHERE id = ${userId}
    RETURNING id, email, full_name, avatar_url, subscription_status, credits_remaining
  `;
  return rows[0];
}

export async function deductUserCredit(userId) {
  const sql = getDb();
  if (!sql) return true; // fallback if no DB configured
  
  const rows = await sql`
    UPDATE users 
    SET credits_remaining = credits_remaining - 1, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${userId} AND credits_remaining > 0
    RETURNING credits_remaining
  `;
  return rows.length > 0;
}

export async function addCreditsToUser(userId, amount, tierName = 'PRO TIER') {
  const sql = getDb();
  if (!sql) return null;

  const rows = await sql`
    UPDATE users 
    SET 
      credits_remaining = credits_remaining + ${amount}, 
      subscription_status = ${tierName},
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ${userId}
    RETURNING id, email, full_name, credits_remaining, subscription_status
  `;
  return rows[0] || null;
}

// Post Queries
export async function savePostToDb(userId, postData) {
  const sql = getDb();
  if (!sql) return null;
  
  const { topic, tone, captions, hashtags, visualPrompt, altText, audienceSchedule, qaFeedback, images } = postData;
  
  const rows = await sql`
    INSERT INTO posts (
      user_id, topic, tone, captions, hashtags, visual_prompt, alt_text, audience_schedule, qa_feedback, images
    ) VALUES (
      ${userId}, ${topic}, ${tone || 'casual'}, 
      ${JSON.stringify(captions || [])}, 
      ${JSON.stringify(hashtags || {})}, 
      ${visualPrompt || ''}, 
      ${altText || ''}, 
      ${JSON.stringify(audienceSchedule || {})}, 
      ${JSON.stringify(qaFeedback || {})},
      ${JSON.stringify(images || [])}
    )
    RETURNING id, topic, tone, captions, hashtags, visual_prompt AS "visualPrompt", alt_text AS "altText", audience_schedule AS "audienceSchedule", qa_feedback AS "qaFeedback", images, created_at AS "createdAt"
  `;
  return rows[0];
}

export async function getUserPostsFromDb(userId) {
  const sql = getDb();
  if (!sql) return [];
  
  const rows = await sql`
    SELECT id, topic, tone, captions, hashtags, visual_prompt AS "visualPrompt", alt_text AS "altText", audience_schedule AS "audienceSchedule", qa_feedback AS "qaFeedback", images, created_at AS "createdAt"
    FROM posts
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
  return rows;
}

export async function deleteUserPostFromDb(userId, postId) {
  const sql = getDb();
  if (!sql) return true;

  // Validate PostgreSQL UUID format to prevent invalid input syntax error
  const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(postId);
  if (!isUuid) {
    console.warn("⚠️ Non-UUID draft ID format, skipping DB deletion:", postId);
    return true;
  }

  if (userId) {
    await sql`DELETE FROM posts WHERE id = ${postId} AND user_id = ${userId}`;
  } else {
    await sql`DELETE FROM posts WHERE id = ${postId}`;
  }
  return true;
}
