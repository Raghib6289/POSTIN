import { getDb } from "./lib/db.js";

async function initDb() {
  const sql = getDb();
  if (!sql) {
    console.error("❌ DATABASE_URL missing in .env");
    process.exit(1);
  }

  console.log("🐘 Connecting to Neon PostgreSQL...");

  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255),
      google_id VARCHAR(255) UNIQUE,
      full_name VARCHAR(255),
      avatar_url TEXT,
      stripe_customer_id VARCHAR(255),
      subscription_status VARCHAR(50) DEFAULT 'free',
      credits_remaining INT DEFAULT 10,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS posts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      topic TEXT NOT NULL,
      tone VARCHAR(50) DEFAULT 'casual',
      captions JSONB DEFAULT '[]'::jsonb,
      hashtags JSONB DEFAULT '{}'::jsonb,
      visual_prompt TEXT DEFAULT '',
      alt_text TEXT DEFAULT '',
      audience_schedule JSONB DEFAULT '{}'::jsonb,
      qa_feedback JSONB DEFAULT '{}'::jsonb,
      images JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb`;

  await sql`CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;

  console.log("🎉 Neon PostgreSQL tables & indexes created successfully!");
}

initDb().catch((err) => {
  console.error("❌ DB Initialization Error:", err);
  process.exit(1);
});
