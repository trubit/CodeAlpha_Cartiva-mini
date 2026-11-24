# Cartiva Mini — Local Development Setup Guide

**Document Version:** 1.0.0  
**Phase:** Phase 2: Project Initialization & Dependency Installation  
**Date:** November 2026  
**Author:** DevOps Engineer & Infrastructure Specialist

---

## 1. Introduction

This guide walks you through setting up Cartiva Mini on your local computer from scratch. Cartiva Mini is built as a unified full-stack monorepo, meaning you only need to run commands from the main project root folder.

---

## 2. System Prerequisites

Before starting, make sure your computer has the following tools installed:

1. **Node.js (version 18 or higher):**
   - Check your version in your terminal:
     ```bash
     node -v
     ```
   - If not installed, download the LTS version from [https://nodejs.org/](https://nodejs.org/).
2. **npm (version 9 or higher):**
   - Check your npm version:
     ```bash
     npm -v
     ```
3. **Git:**
   - Check your Git version:
     ```bash
     git --version
     ```

---

## 3. Step-by-Step Installation

### Step 1: Clone or Navigate to the Workspace

Open your terminal and navigate to the project directory:

```bash
cd cartiva-min
```

### Step 2: Configure Environment Variables

Copy the template configuration file `.env.example` into a new `.env` file:

```bash
# On Windows PowerShell:
Copy-Item .env.example .env

# On Linux or macOS:
cp .env.example .env
```

Review the values in `.env`. For local development in Phase 2, the default fallback values work out of the box.

### Step 3: Install All Project Dependencies

Run `npm install` from the root folder. This single command downloads all required libraries for the frontend, backend, and development tooling:

```bash
npm install
```

---

## 4. Running the Application Locally

### Starting Both Frontend and Backend Simultaneously

To run the full stack together with live reloading:

```bash
npm run dev
```

This starts:

- **Backend Server:** `http://localhost:5000`
- **Frontend Application:** `http://localhost:5180`

Open your web browser and visit `http://localhost:5180`. You will see the Cartiva Mini Engineering Foundation dashboard reporting live backend telemetry.

### Running Services Separately

If you prefer running the backend and frontend in separate terminal windows:

```bash
# Terminal 1 (Backend Only):
npm run dev:backend

# Terminal 2 (Frontend Only):
npm run dev:frontend
```

---

## 5. Verification Commands

Run these automated verification commands from the project root to ensure code health:

### 1. Type Checking

Verifies that all TypeScript code passes strict compiler rules:

```bash
npm run typecheck
```

### 2. Linting

Checks code style and prevents common bugs:

```bash
npm run lint
```

### 3. Production Build

Compiles both the backend and frontend into distribution folders (`dist/backend` and `dist/frontend`):

```bash
npm run build
```

### 4. Automated Tests

Runs the Vitest integration test suite:

```bash
npm test
```

---

## 6. Verifying the Health Endpoint Manually

You can test the backend health check endpoint directly from your terminal:

```bash
# Using curl:
curl http://localhost:5000/api/v1/health

# Using Windows PowerShell:
Invoke-RestMethod -Uri http://localhost:5000/api/v1/health
```

Expected response format:

```json
{
  "success": true,
  "message": "Service is operational.",
  "data": {
    "status": "healthy",
    "service": "cartiva-mini-api",
    "version": "1.0.0",
    "uptimeSeconds": 14,
    "environment": "development",
    "memoryUsage": {
      "heapUsedMB": 35,
      "heapTotalMB": 52,
      "rssMB": 78
    },
    "database": {
      "status": "disconnected",
      "message": "Database connection deferred to Phase 4 (MongoDB Database Architecture)."
    }
  }
}
```

---

## 7. Troubleshooting Common Questions

- **Port 5000 or 5180 is already in use:**
  If another program is using port 5000 or 5180, check with `Get-NetTCPConnection -LocalPort 5000, 5180` on Windows or `lsof -i :5000` on macOS/Linux and stop the competing service.
- **Frontend cannot reach backend:**
  Verify that the backend is running and that `VITE_API_BASE_URL` in `.env` matches the backend listener URL (`http://localhost:5000/api/v1`).
