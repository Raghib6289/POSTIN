Markdown
# ⚡ Instagram Caption Agent

An open-source multi-agent social media creative engine that analyzes visual content and generates targeted Instagram captions, hashtag strategies, and post hooks. Built with LangGraph, Gemini Vision, Neon PostgreSQL, and Next.js/Node.js serverless functions.

---

## 📖 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Getting Started](#-getting-started)
  - [1. Clone Repository](#1-clone-repository)
  - [2. Database Setup](#2-database-setup)
  - [3. Environment Variables](#3-environment-variables)
  - [4. Install & Run](#4-install--run)
- [Deployment](#-deployment)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

- **Visual Understanding:** Evaluates images using Google Gemini Vision to understand tone, subjects, context, and aesthetic composition.
- **Multi-Agent Orchestration:** Uses LangGraph workflows to divide work across specialized agents (Context Analyzer, Caption Writer, Hashtag Strategist, and Hook Specialist).
- **In-Memory Image Parsing:** Base64 zero-disk image processing designed for serverless scalability.
- **History & Drafts:** PostgreSQL integration for persisting user drafts, generated hooks, and performance metadata.
- **Built-in Auth & Limits:** Ready-to-use user authentication and credit quota management.

---

## 🛠️ Tech Stack

- **Workflow Orchestration:** [LangGraph](https://langchain-ai.github.io/langgraph/)
- **Vision & LLM:** Google Gemini Flash / Pro Vision via `@google/generative-ai`
- **Database:** [Neon PostgreSQL](https://neon.tech/) (Serverless Postgres)
- **Runtime:** Node.js / Vercel Serverless Functions
- **Authentication:** JWT & OAuth providers

---

## 📋 Prerequisites

Ensure you have the following installed and set up:

- [Node.js](https://nodejs.org/) (v18.x or higher)
- [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)
- A free [Neon](https://neon.tech/) account
- A [Google AI Studio](https://aistudio.google.com/) API Key

---

## 🚀 Getting Started

### 1. Clone Repository

```bash
git clone [https://github.com/YOUR_USERNAME/instagram-caption-agent.git](https://github.com/YOUR_USERNAME/instagram-caption-agent.git)
cd instagram-caption-agent
2. Database Setup
Log into your Neon Dashboard and create a new project.

Navigate to the SQL Editor tab.

Paste and execute the contents of schema.sql to initialize the required tables (users, posts, etc.).

Copy your database connection string with SSL enabled:

Plaintext
postgres://[user]:[password]@[endpoint].neon.tech/[dbname]?sslmode=require
3. Environment Variables
Duplicate .env.example into .env:

Bash
cp .env.example .env
Populate the required secrets:

Code snippet
# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# Database
DATABASE_URL=postgres://user:password@ep-xxxx.neon.tech/neondb?sslmode=require

# Authentication
JWT_SECRET=your_random_generated_jwt_secret
4. Install & Run
Bash
# Install dependencies
npm install

# Start development server
npm run dev # or npm start
Visit http://localhost:3000 to interact with the local development instance.

🌐 Deployment
Deploy to Vercel
Push your repository to GitHub.

Import the project into the Vercel Dashboard.

Under Project Settings → Environment Variables, add:

GEMINI_API_KEY

DATABASE_URL

JWT_SECRET

Trigger the deployment.

🗺️ Roadmap
[ ] Support carousel post multi-image uploads.

[ ] Add tone and brand-voice personalization presets.

[ ] Direct publishing via Instagram Graph API.

[ ] Local model fallbacks (Ollama / Llama 3.2 Vision).

🤝 Contributing
Contributions of any kind are welcome! Whether fixing a typo, refactoring an agent node, or adding whole new features:

Read our Contributing Guide.

Check the open issues or submit a new proposal.

Review our Code of Conduct.

📄 License
Distributed under the GPLv3 License.
