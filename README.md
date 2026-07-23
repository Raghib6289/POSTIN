# ⚡ Instagram Caption Agent SaaS

A multi-agent AI social media creative suite powered by **LangGraph**, **Gemini Vision**, **Neon PostgreSQL**, and **Vercel Serverless Functions**.

---

## 🛠️ SaaS Setup Instructions

### 1. Database Setup (Neon PostgreSQL)
1. Go to [Neon.tech](https://neon.tech) and create a free PostgreSQL project.
2. Open the **SQL Editor** in your Neon dashboard.
3. Run the SQL script from [`schema.sql`](file:///e:/instagram-caption-agent/schema.sql) to create the `users` and `posts` tables.
4. Copy your database connection string (e.g., `postgres://alex:secret@ep-cool-db.neon.tech/neondb?sslmode=require`).

### 2. Local Environment Configuration
Create or edit your `.env` file:
```env
GEMINI_API_KEY=your_gemini_api_key_here
DATABASE_URL=postgres://user:password@ep-xxxx.neon.tech/neondb?sslmode=require
JWT_SECRET=your_super_secret_jwt_key
```

### 3. Run Locally
```bash
npm install
npm start
```
Open `http://localhost:3000` in your browser.

---

## 🚀 Deploying to Vercel via GitHub

1. **Push your code to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: SaaS Instagram Agent with Auth & Neon DB"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/instagram-caption-agent.git
   git push -u origin main
   ```

2. **Connect to Vercel**:
   - Go to your [Vercel Dashboard](https://vercel.com/new).
   - Click **Import Project** and select your GitHub repository `instagram-caption-agent`.
   - In the **Environment Variables** section, add:
     - `GEMINI_API_KEY`: Your Gemini API Key
     - `DATABASE_URL`: Your Neon PostgreSQL Connection String
     - `JWT_SECRET`: Secret key for session authentication
   - Click **Deploy**.

---

## 🔒 Built-in SaaS Features
- **User Authentication**: Email/Password Sign in + Google Account integration.
- **Credit Balance Guard**: Enforces 10 free post generations per user account.
- **Neon PostgreSQL**: Multi-tenant draft history library and user storage.
- **Vercel Serverless Compatible**: Memory base64 image parsing (zero local disk writing).
