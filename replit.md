# MineGuard

A full-stack operational security management system for mining operations.

## Project Overview

MineGuard provides real-time monitoring, incident logging (G1 to G4 severity), and an active auditing system with hierarchical access control (RBAC) for mining security teams.

## Tech Stack

- **Frontend**: React 18 + TypeScript, Tailwind CSS v4, Recharts, Leaflet maps, Framer Motion, Sonner notifications
- **Backend**: Node.js + Express, Socket.io (real-time), JWT auth, node-cron for scheduled tasks
- **Database**: SQLite via better-sqlite3 (file: `mina_seguranca.db`)
- **Build Tool**: Vite (serves via Express middleware in dev mode)
- **Package Manager**: npm

## Architecture

This is a monolithic full-stack app where:
- `server.ts` — Express server that also serves the Vite dev middleware (development) or static dist (production)
- `src/App.tsx` — Main React frontend (single large component)
- `src/main.tsx` — React entry point
- `report_generator.ts` — Daily PDF/HTML report generation
- `schema.sql` — Reference database schema
- `mina_seguranca.db` — SQLite database (auto-created on first run)

## Running the App

The app runs on **port 2026** via a single workflow:
```
npm run dev
```
This starts `tsx server.ts` which handles both API and frontend.

## Environment Variables

Copy `.env.example` and configure:
- `JWT_SECRET` — JWT signing secret (has default fallback)
- `ENCRYPTION_KEY` — 32-char key for encrypting sensitive settings
- `GEMINI_API_KEY` — Google Gemini AI API key (optional, for AI features)
- `TELEGRAM_BOT_TOKEN` — Telegram bot token (optional, for alerts)
- `TELEGRAM_GROUP_OFICIAIS_SIERRAS_ID` — Telegram group ID
- `TELEGRAM_SIERRA_1_CHAT_ID` / `TELEGRAM_SIERRA_2_CHAT_ID` — Telegram chat IDs

## Key Features

- Hierarchical RBAC: Superadmin > Admin > Sierra 1 > Sierra 2 > Oficial > Supervisor > Agente
- Incident reporting with severity levels G1–G4
- Real-time notifications via Socket.io
- Location tracking with Leaflet maps
- Photo uploads for incidents
- Daily automated security reports (cron at 06:00)
- AES-256-CBC encryption for sensitive system settings
- Telegram alerts for high-severity incidents

## Deployment

Configured as a VM deployment (always-on) to support SQLite persistence and Socket.io WebSockets.
Run command: `npm run dev`
