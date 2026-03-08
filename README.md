# LinkedIn Manager

A full-stack LinkedIn automation and management tool.

## Features

- Multi-Account Management
- Campaign Automation
- Lead Database
- AI Content Generation
- Analytics Dashboard

## Tech Stack

**Backend:** Node.js, Express, TypeScript, Prisma, PostgreSQL
**Frontend:** React, Vite, TypeScript, Tailwind CSS, Zustand

## Quick Start

### Docker (Recommended)

```bash
docker-compose up -d
Manual Setup
Backend:
cd backend
cp .env.example .env
npm install
npx prisma db push
npm run dev
Frontend:
cd frontend
npm install
npm run dev
Access
Frontend: http://localhost:5173
Backend: http://localhost:3001
Health: http://localhost:3001/health
Environment Variables
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/linkedin_manager
JWT_SECRET=your-secret-key
PORT=3001
FRONTEND_URL=http://localhost:5173
OPENAI_API_KEY=
GEMINI_API_KEY=
DEEPSEEK_API_KEY=
License
MIT
