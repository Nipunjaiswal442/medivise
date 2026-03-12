# Medivise — Medical Decision Support Platform

A full-stack web application with a crimson-white medical theme.

## Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express + JWT

## Quick Start

### 1. Backend
```bash
cd backend
npm install
# Copy and edit .env if needed
cp .env.example .env
npm run dev   # runs on http://localhost:5000
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev   # runs on http://localhost:5173
```

## Demo Credentials
| Email | Password | Role |
|-------|----------|------|
| dr.smith@medivise.com | Medivise@2024 | Physician |
| admin@medivise.com | Medivise@2024 | Admin |

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/login | Login with email + password |
| GET  | /api/auth/me | Get current user (requires Bearer token) |
| POST | /api/auth/logout | Logout (requires Bearer token) |
| GET  | /api/health | Health check |
