# MailFlow AI — AI-Powered Email Management System (MCP)

MailFlow AI is a production-quality monorepo email management application that lets users compose, refine, schedule, summarize, and send professional emails through connected Gmail and Microsoft Outlook accounts using Claude AI and a standardized **Model Context Protocol (MCP)** tool-calling server.

---

## 🌟 Key Features

- **Standardized MCP Architecture**: Strict separation where the Express API uses an MCP Client to call Gmail & Microsoft Graph tools on a dedicated MCP Server (`apps/mcp-server`). OAuth tokens are encrypted at rest with AES-256-GCM.
- **Writemail.ai Inspired UX**: Two-column Compose experience (Left: input prompt + horizontal rounded pill selectors for **Tone**, **Length**, **Style**, and **Mood**; Right: live preview card with instant copy, edit mode, draft save, and sending).
- **Claude AI Generation Layer**: Generates structured email subject lines, body copy, inline rewrites, and executive summaries of inbox threads.
- **Email Scheduling**: Background cron runner automatically dispatches queued emails at designated future timestamps.
- **Zero-Dependency Database Setup**: Uses local SQLite by default (`dev.db`) — **no Docker installation required**! (Optionally connects to cloud PostgreSQL like Neon for production).

---

## 🏗 Monorepo Architecture

```
AI-Powered-Email-using-MCP/
├── apps/
│   ├── web/               # React 18 + Vite + Tailwind CSS + Lucide Icons SPA
│   ├── api/               # Express API (Auth, Prisma ORM, Claude AI, MCP Client)
│   └── mcp-server/        # Official @modelcontextprotocol/sdk Server (Gmail & Outlook Tools)
└── packages/
    └── shared-types/      # TypeScript DTOs & MCP parameter definitions
```

---

## 🚀 Quick Start & Local Setup (No Docker Needed)

### 1. Requirements
- Node.js `v20+` or `v22+`
- `pnpm` or `npx pnpm`

### 2. Environment Setup
Create a `.env` file in the root directory:
```env
DATABASE_URL="file:./dev.db"
PORT=5000
JWT_SECRET="super-secret-jwt-key-min-32-chars-long"
ENCRYPTION_SECRET="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
ANTHROPIC_API_KEY="sk-ant-api03-sample"
CLAUDE_MODEL="claude-3-5-sonnet-20241022"
MCP_SERVER_PORT=5001
MCP_SERVER_URL="http://localhost:5001"
VITE_API_BASE_URL="http://localhost:5000"
```

### 3. Initialize SQLite Database
```bash
npx prisma db push --schema=apps/api/prisma/schema.prisma
```

### 4. Run Monorepo Services
```bash
npx pnpm dev
```
- **React Frontend**: `http://localhost:5173`
- **Express API**: `http://localhost:5000`
- **MCP Server**: `http://localhost:5001`
